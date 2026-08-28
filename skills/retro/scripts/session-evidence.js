#!/usr/bin/env node
// session-evidence.js — reads the current Claude Code session transcript (.jsonl) and
// extracts verifiable friction signals: tool calls that errored, Bash commands run more
// than once, and files edited more than twice. This is the evidence `skills/retro`'s Q5
// (session friction) must cite instead of guessing from the model's own memory of the
// conversation — which is unreliable, and actively fabricated once the session has been
// compacted.
//
// Usage:
//   node session-evidence.js [--transcript <path-to-jsonl>]
//
// Default transcript selection: newest *.jsonl by mtime in
// ~/.claude/projects/<cwd-slug>/, where <cwd-slug> is the current working directory with
// every non-alphanumeric character replaced by -, one dash per character (matches Claude
// Code's own slugging, see slugForCwd()). Pass --transcript to override — useful when retro runs
// against a session other than the current one, or the auto-detected file is wrong
// because multiple sessions are open against the same project.
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
const TOP_N = 10;

function parseArgs(argv) {
  let transcript = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--transcript') {
      transcript = argv[i + 1];
      i++;
    } else if (argv[i].startsWith('--transcript=')) {
      transcript = argv[i].slice('--transcript='.length);
    }
  }
  return { transcript };
}

function slugForCwd(cwd) {
  // Matches Claude Code's own project-dir slugging exactly (extracted from the installed
  // CLI, issue #59): every character that is not an ASCII letter or digit is replaced,
  // one dash per character — no collapsing. "C:\Users\..." has two non-alnum characters
  // after the drive letter (":" then "\"), producing "C--Users-...", not "C-Users-...".
  // A collapsing regex (`+`) silently points at a directory that doesn't exist.
  return cwd.replace(/[^a-zA-Z0-9]/g, '-');
}

function findLatestTranscript() {
  const slug = slugForCwd(process.cwd());
  const dir = path.join(os.homedir(), '.claude', 'projects', slug);
  if (!fs.existsSync(dir)) return { path: null, slug, dir };
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch {
    return { path: null, slug, dir };
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
  return { path: withStats.length ? withStats[0].full : null, slug, dir };
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

function main() {
  const { transcript: explicit } = parseArgs(process.argv.slice(2));
  const auto = explicit ? null : findLatestTranscript();
  const transcriptPath = explicit || auto.path;

  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    if (explicit) {
      console.log(`no transcript found at ${explicit}`);
    } else {
      console.log(`no transcript found (slug: ${auto.slug}, checked: ${auto.dir})`);
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
      }

      if (block.type === 'tool_result' && block.is_error) {
        const name = toolNameById.get(block.tool_use_id) || 'unknown';
        const rec = bump(errorsByTool, name, sidechain);
        if (!rec.sample) rec.sample = firstLine(sampleFromContent(block.content), 100);
      }
    }
  }

  const out = [];
  out.push(`transcript: ${transcriptPath}`);
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

  console.log(out.slice(0, OUTPUT_LINE_CAP).join('\n'));
}

main();
