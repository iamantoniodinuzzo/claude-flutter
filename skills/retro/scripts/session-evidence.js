#!/usr/bin/env node
// session-evidence.js — reads the current Claude Code session transcript (.jsonl) and
// extracts verifiable friction signals: tool calls that errored, Bash commands run more
// than once, and files edited more than twice. This is the evidence `skills/retro`'s Q5
// (session friction) must cite instead of guessing from the model's own memory of the
// conversation — which is unreliable, and actively fabricated once the session has been
// compacted.
//
// Usage:
//   node session-evidence.js [--transcript <path-to-jsonl>] [--config-audit]
//
// --config-audit (opt-in, ADR 0008): appends a fourth block — skill invocations,
// hook-repetition, hook_cancelled, toolDenialKind breakdown, skill-listing-vs-invoked
// trigger-miss anchor — under its own CONFIG_AUDIT_LINE_CAP, separate from
// OUTPUT_LINE_CAP. `tune-setup` always passes this flag; `retro`'s Passo 0 call site
// must NEVER pass it — that cap protects retro's tight end-of-session context budget
// (see OUTPUT_LINE_CAP's comment below). Without the flag, output is byte-for-byte
// identical to the pre-ADR-0008 script.
//
// Default transcript selection: newest *.jsonl by mtime in
// ~/.claude/projects/<cwd-slug>/, where <cwd-slug> is the current working directory with
// every non-alphanumeric character replaced by -, one dash per character (matches Claude
// Code's own slugging, see slugForCwd()). If that exact directory does not exist, fall back
// to scanning ~/.claude/projects/ for an entry whose name canonicalizes (collapse runs of
// non-alphanumerics to one dash, lowercase) to the same value as the derived slug — covers
// slug-algorithm drift between toolkit and CLI versions without ever preferring a fuzzy
// match over the exact one (see canonicalSlug()). Pass --transcript to override — useful
// when retro runs against a session other than the current one, or the auto-detected file
// is wrong because multiple sessions are open against the same project.
//
// Degrades silently: if no transcript is found or it can't be parsed, prints one line
// and exits 0. A missing transcript is NOT evidence of a clean session — retro must say
// explicitly that it couldn't check, not treat silence as "nothing happened".
//
// Output is aggregated and capped at OUTPUT_LINE_CAP lines — never a raw transcript dump.
// That cap matters here specifically: this runs at the end of a session, when context is
// already tightest.
//
// This logic lives in one file (not duplicated in bash regex + PowerShell
// ConvertFrom-Json) because it needs a real JSON parser to correctly pair a tool_result's
// tool_use_id back to the tool_use block that produced it — a hand-rolled per-line regex
// parser would drift between the two shell dialects and silently miscount. Node is a safe
// dependency here: it's what Claude Code itself runs on, unlike `jq`, which this
// environment does not have installed. session-evidence.sh and session-evidence.ps1 are
// thin dispatchers to this file — there is no separate logic to keep in sync.
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const OUTPUT_LINE_CAP = 40;
// CONFIG_AUDIT_LINE_CAP (ADR 0008 decision 2) is deliberately a SEPARATE constant from
// OUTPUT_LINE_CAP, not folded into it. 120 = 3x retro's cap: tune-setup runs on-demand
// with a different cost budget than retro's every-task-end cadence (ADR 0006), and this
// block is aggregated counters, not the ~4,160-token raw file read ADR 0006 measured.
const CONFIG_AUDIT_LINE_CAP = 120;
const TOP_N = 10;
// Repeated-hook-injection threshold (ADR 0008 decision 3): matches the existing
// "files edited >2x" threshold below, not the bash ">1" one — a hook firing on every
// matching tool call is normal by design; it takes an actual repeat to be signal.
const HOOK_REPEAT_THRESHOLD = 2;

function parseArgs(argv) {
  let transcript = null;
  let configAudit = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--transcript') {
      transcript = argv[i + 1];
      i++;
    } else if (argv[i].startsWith('--transcript=')) {
      transcript = argv[i].slice('--transcript='.length);
    } else if (argv[i] === '--config-audit') {
      configAudit = true;
    }
  }
  return { transcript, configAudit };
}

function slugForCwd(cwd) {
  // Matches Claude Code's own project-dir slugging exactly (extracted from the installed
  // CLI, issue #59): every character that is not an ASCII letter or digit is replaced,
  // one dash per character — no collapsing. "C:\Users\..." has two non-alnum characters
  // after the drive letter (":" then "\"), producing "C--Users-...", not "C-Users-...".
  // A collapsing regex (`+`) silently points at a directory that doesn't exist.
  return cwd.replace(/[^a-zA-Z0-9]/g, '-');
}

// Lossier than slugForCwd() on purpose — this is ONLY for recovery matching, never for
// deriving the path we look up first. Collapses runs of non-alphanumerics to a single dash
// and lowercases, so a directory written by a different slug algorithm still matches:
// "C-Users-x-my_app" and "C--Users-x-my-app" both canonicalize to "c-users-x-my-app".
// slugForCwd() stays exact (one dash per character) because that is what Claude Code
// actually writes today (ref #61).
function canonicalSlug(s) {
  return s.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
}

function newestJsonlIn(dir) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch {
    return null;
  }
  const withStats = files
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => {
      const full = path.join(dir, f);
      let mtime = 0;
      try {
        mtime = fs.statSync(full).mtimeMs;
      } catch {
        /* ignore, sorts last */
      }
      return { full, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return withStats.length ? withStats[0].full : null;
}

function findLatestTranscript() {
  const slug = slugForCwd(process.cwd());
  const dir = path.join(os.homedir(), '.claude', 'projects', slug);
  if (fs.existsSync(dir)) {
    return { path: newestJsonlIn(dir), slug, dir, matchedDir: null };
  }

  // Exact dir missing — scan for a canonical-slug match before giving up (ref #69).
  const projectsRoot = path.join(os.homedir(), '.claude', 'projects');
  let entries;
  try {
    entries = fs.readdirSync(projectsRoot);
  } catch {
    return { path: null, slug, dir, matchedDir: null };
  }
  const target = canonicalSlug(slug);
  const candidates = entries
    .filter((name) => canonicalSlug(name) === target)
    .map((name) => path.join(projectsRoot, name))
    .filter((full) => {
      try {
        return fs.statSync(full).isDirectory();
      } catch {
        return false;
      }
    });

  let bestPath = null;
  let bestDir = null;
  let bestMtime = -1;
  for (const candidateDir of candidates) {
    let files;
    try {
      files = fs.readdirSync(candidateDir);
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith('.jsonl')) continue;
      const full = path.join(candidateDir, f);
      let mtime = 0;
      try {
        mtime = fs.statSync(full).mtimeMs;
      } catch {
        continue;
      }
      if (mtime > bestMtime) {
        bestMtime = mtime;
        bestPath = full;
        bestDir = candidateDir;
      }
    }
  }

  return { path: bestPath, slug, dir, matchedDir: bestDir };
}

function firstLine(text, maxLen) {
  const line = String(text).split('\n')[0];
  return line.length > maxLen ? line.slice(0, maxLen) + '…' : line;
}

function sampleFromContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const textBlock = content.find((c) => c && c.type === 'text');
    if (textBlock) return textBlock.text;
    return JSON.stringify(content);
  }
  return '';
}

function bump(map, key, sidechain) {
  const rec = map.get(key) || { count: 0, sidechain: false, sample: '' };
  rec.count++;
  rec.sidechain = rec.sidechain || sidechain;
  map.set(key, rec);
  return rec;
}

// attachment.content on hook_additional_context / hook_system_message events is
// sometimes a plain string, sometimes an array of strings — normalize to one string.
function attachmentText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(String).join(' ');
  return '';
}

// skill_listing's attachment.content is a "- <name>: <description>" line per offered
// skill. Names can themselves contain a bare colon (namespaced, e.g.
// "mattpocock-skills:grilling"), so split on the first ": " (colon+space) — the real
// name/description separator — not the first bare colon.
function parseSkillListing(content) {
  const names = [];
  for (const rawLine of attachmentText(content).split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('- ')) continue;
    const rest = line.slice(2);
    const sep = rest.indexOf(': ');
    if (sep === -1) continue;
    names.push(rest.slice(0, sep));
  }
  return names;
}

function main() {
  const { transcript: explicit, configAudit } = parseArgs(process.argv.slice(2));
  const auto = explicit ? null : findLatestTranscript();
  const transcriptPath = explicit || auto.path;

  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    if (explicit) {
      console.log(`no transcript found at ${explicit}`);
    } else {
      console.log(
        `no transcript found (slug: ${auto.slug}, checked: ${auto.dir}, ` +
          'no canonical-slug match under ~/.claude/projects)'
      );
    }
    process.exit(0);
  }

  let raw;
  try {
    raw = fs.readFileSync(transcriptPath, 'utf8');
  } catch (e) {
    console.log(`no transcript found (could not read ${transcriptPath}: ${e.message})`);
    process.exit(0);
  }

  const toolNameById = new Map();
  const errorsByTool = new Map();
  const bashCommandCounts = new Map();
  const editedFileCounts = new Map();
  let sessionId = null;
  let firstTs = null;
  let lastTs = null;
  let eventCount = 0;

  // --config-audit only (ADR 0008). Left unpopulated and unread when the flag is
  // absent, so the default path's output cannot be affected by any of this.
  const skillInvocations = new Map(); // skill name -> count
  const skillsOffered = new Map(); // skill name -> event # first offered
  const hookInjections = new Map(); // "hookName sample" -> {count, hookName, sample}
  const hookCancelled = [];
  const denialCounts = { 'user-rejected': 0, 'permission-rule': 0, 'automode-blocked': 0 };
  const userRejectedFeedback = [];

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let evt;
    try {
      evt = JSON.parse(line);
    } catch {
      continue;
    }
    eventCount++;
    if (!sessionId && evt.sessionId) sessionId = evt.sessionId;
    if (evt.timestamp) {
      if (!firstTs || evt.timestamp < firstTs) firstTs = evt.timestamp;
      if (!lastTs || evt.timestamp > lastTs) lastTs = evt.timestamp;
    }

    const content = evt.message && Array.isArray(evt.message.content) ? evt.message.content : [];
    const sidechain = !!evt.isSidechain;

    for (const block of content) {
      if (!block || typeof block !== 'object') continue;

      if (block.type === 'tool_use') {
        if (block.id && block.name) toolNameById.set(block.id, block.name);
        if (block.name === 'Bash' && block.input && typeof block.input.command === 'string') {
          bump(bashCommandCounts, block.input.command.trim(), sidechain);
        }
        if (
          (block.name === 'Edit' || block.name === 'Write') &&
          block.input &&
          typeof block.input.file_path === 'string'
        ) {
          bump(editedFileCounts, block.input.file_path, sidechain);
        }
        if (configAudit && block.name === 'Skill' && block.input && typeof block.input.skill === 'string') {
          skillInvocations.set(block.input.skill, (skillInvocations.get(block.input.skill) || 0) + 1);
        }
      }

      if (block.type === 'tool_result' && block.is_error) {
        const name = toolNameById.get(block.tool_use_id) || 'unknown';
        const rec = bump(errorsByTool, name, sidechain);
        if (!rec.sample) rec.sample = firstLine(sampleFromContent(block.content), 100);
      }
    }

    if (!configAudit) continue;

    // hook_* and skill_listing events are top-level `type: "attachment"` events, not
    // nested in message.content — a different shape from the tool_use/tool_result
    // blocks above.
    if (evt.type === 'attachment' && evt.attachment && typeof evt.attachment === 'object') {
      const att = evt.attachment;
      if (att.type === 'skill_listing') {
        for (const name of parseSkillListing(att.content)) {
          if (!skillsOffered.has(name)) skillsOffered.set(name, eventCount);
        }
      } else if (att.type === 'hook_additional_context' || att.type === 'hook_system_message') {
        const hookName = att.hookName || 'unknown';
        const sample = firstLine(attachmentText(att.content), 80);
        const key = `${hookName} ${sample}`;
        const rec = hookInjections.get(key) || { count: 0, hookName, sample };
        rec.count++;
        hookInjections.set(key, rec);
      } else if (att.type === 'hook_cancelled') {
        hookCancelled.push({
          hookName: att.hookName || 'unknown',
          timedOut: !!att.timedOut,
          durationMs: att.durationMs,
        });
      }
    }

    // toolDenialKind lives on the top-level `type: "user"` tool_result event itself,
    // not inside message.content — a separate field to check per-event.
    if (typeof evt.toolDenialKind === 'string') {
      const kind = evt.toolDenialKind;
      if (Object.prototype.hasOwnProperty.call(denialCounts, kind)) denialCounts[kind]++;
      if (kind === 'user-rejected' && typeof evt.userFeedback === 'string') {
        userRejectedFeedback.push(firstLine(evt.userFeedback, 100));
      }
    }
  }

  const out = [];
  out.push(`transcript: ${transcriptPath}`);
  if (!explicit && auto.matchedDir) {
    out.push(`  [slug fallback: derived ${auto.dir} missing, matched ${auto.matchedDir}]`);
  }
  out.push(`session: ${sessionId || 'unknown'}  window: ${firstTs || '?'} .. ${lastTs || '?'}  events: ${eventCount}`);
  out.push('');

  const totalErrors = [...errorsByTool.values()].reduce((s, r) => s + r.count, 0);
  out.push(`tool errors: ${totalErrors}`);
  [...errorsByTool.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, TOP_N)
    .forEach(([name, rec]) => {
      out.push(`  ${name} x${rec.count}${rec.sidechain ? ' [subagent]' : ''} — ${rec.sample}`);
    });
  out.push('');

  const repeatedCmds = [...bashCommandCounts.entries()].filter(([, r]) => r.count > 1);
  out.push(`repeated bash commands: ${repeatedCmds.length}`);
  repeatedCmds
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, TOP_N)
    .forEach(([cmd, rec]) => {
      out.push(`  x${rec.count}${rec.sidechain ? ' [subagent]' : ''} ${firstLine(cmd, 90)}`);
    });
  out.push('');

  const reedited = [...editedFileCounts.entries()].filter(([, r]) => r.count > 2);
  out.push(`files edited >2x: ${reedited.length}`);
  reedited
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, TOP_N)
    .forEach(([fp, rec]) => {
      out.push(`  x${rec.count}${rec.sidechain ? ' [subagent]' : ''} ${firstLine(fp, 90)}`);
    });

  if (!configAudit) {
    console.log(out.slice(0, OUTPUT_LINE_CAP).join('\n'));
    return;
  }

  // --config-audit block (ADR 0008). Appended after the three default blocks above,
  // under its own CONFIG_AUDIT_LINE_CAP — see that constant's comment for why it is
  // never folded into OUTPUT_LINE_CAP.
  out.push('');
  out.push('--- config audit (tune-setup, --config-audit) ---');
  out.push('');

  out.push(
    `skill invocations: ${
      skillInvocations.size
        ? [...skillInvocations.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => `${name} x${count}`)
            .join(', ')
        : 'none'
    }`
  );
  out.push('');

  const repeatedHooks = [...hookInjections.values()].filter((r) => r.count > HOOK_REPEAT_THRESHOLD);
  out.push(`hook injections (hookName + content, >${HOOK_REPEAT_THRESHOLD}x): ${repeatedHooks.length}`);
  repeatedHooks
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N)
    .forEach((r) => {
      out.push(`  ${r.hookName} x${r.count} — ${r.sample}`);
    });
  out.push('');

  out.push(`hook_cancelled: ${hookCancelled.length}`);
  hookCancelled.slice(0, TOP_N).forEach((h) => {
    out.push(`  ${h.hookName}${h.timedOut ? ' [timed out]' : ''} — ${h.durationMs}ms`);
  });
  out.push('');

  out.push(
    `toolDenialKind: user-rejected=${denialCounts['user-rejected']} ` +
      `permission-rule=${denialCounts['permission-rule']} automode-blocked=${denialCounts['automode-blocked']}`
  );
  userRejectedFeedback.slice(0, TOP_N).forEach((fb) => {
    out.push(`  user-rejected: ${fb}`);
  });
  out.push('');

  const missed = [...skillsOffered.keys()].filter((name) => !skillInvocations.has(name));
  out.push(`skills offered, never invoked (structural anchor for trigger-miss): ${missed.length}`);
  missed.slice(0, TOP_N).forEach((name) => {
    out.push(`  ${name} — first offered at event #${skillsOffered.get(name)}`);
  });

  // Truncation must be visible, not silent — an empty-looking tail (e.g. "0 findings")
  // should never be confused with "cap cut the real findings off". Scoped to the
  // --config-audit block only: the default (non-config-audit) path's OUTPUT_LINE_CAP
  // behavior is unchanged, per ADR 0008's byte-for-byte invariant on retro's own call.
  const totalCap = OUTPUT_LINE_CAP + CONFIG_AUDIT_LINE_CAP;
  if (out.length > totalCap) {
    const omitted = out.length - (totalCap - 1);
    console.log(
      out.slice(0, totalCap - 1).join('\n') +
        `\n... output truncated at ${totalCap} lines (${omitted} more line(s) omitted)`
    );
  } else {
    console.log(out.join('\n'));
  }
}

main();
