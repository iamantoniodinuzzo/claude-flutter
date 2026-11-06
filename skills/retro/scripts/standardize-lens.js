'use strict';
// standardize-lens.js — evidence for retro Q6 ("What worked well") proposals and for the
// "repeated instruction -> slash command" route of the `automation` category (ADR 0012).
//
// Two pieces, both derived from transcripts only (never from a configuration file, ADR 0011):
//   skill invocations:           model-issued `Skill` tool_use blocks of THIS session, with outcome
//                                and the number of identical `args`. A skill the user typed as a
//                                slash command is a `<command-name>` message, not a tool_use, so
//                                it is not counted here.
//   repeated user instructions:  the same short instruction written in >= USER_REPEAT_MIN_SESSIONS
//                                distinct sessions of the SAME project directory (current session
//                                plus the newest USER_REPEAT_SESSIONS previous ones). A repeat
//                                inside a single session is not proof for a slash command: it
//                                usually means the agent ignored the first request, so it is
//                                reported on its own line as friction evidence for Q5.
//
// Thresholds are named constants; SKILL.md cites the names, never the values.

const fs = require('fs');
const path = require('path');
const { textOf } = require('./retro-lens.js');

const USER_REPEAT_SESSIONS = 10; // previous sessions compared (same project dir only)
const USER_REPEAT_JACCARD = 0.6; // token-set similarity that makes two messages "the same instruction"
const USER_REPEAT_MIN_WORDS = 5; // shorter messages ("ok", "vai avanti") carry no instruction
const USER_REPEAT_MAX_WORDS = 60; // longer messages are pasted material, not a reusable instruction
const USER_REPEAT_MIN_SESSIONS = 2; // distinct sessions, current one included
const USER_REPEAT_GROUPS = 3; // groups printed
const USER_REPEAT_MAX_BYTES = 30 * 1024 * 1024; // larger previous transcripts are skipped, declared partial
const SKILL_ARGS_REPEAT_MIN = 2; // identical non-empty args that make a slash-command candidate
const STANDARDIZE_LINE_CAP = 12; // own cap, outside OUTPUT_LINE_CAP
const EXCERPT_CHARS = 80;

const STRIP_RES = [
  /<system-reminder>[\s\S]*?<\/system-reminder>/g,
  /<pasted_content[^>]*>[\s\S]*?<\/pasted_content>/g,
];

// The text a human actually typed in one transcript event, or null. Excludes tool results,
// meta/sidechain records, non-human origins (peer sessions, task notifications) and the
// harness wrappers around slash commands (only `<command-args>` is the user's own text).
function humanText(evt) {
  if (!evt || evt.type !== 'user' || evt.isMeta || evt.isSidechain) return null;
  const origin = evt.origin && typeof evt.origin === 'object' ? evt.origin.kind : evt.origin;
  if (origin && origin !== 'human') return null;
  const content = evt.message && evt.message.content;
  if (Array.isArray(content) && content.some((b) => b && b.type === 'tool_result')) return null;
  let text = textOf(content);
  if (!text) return null;
  if (/^\s*<(?:local-command|task-notification)/.test(text)) return null;
  if (text.includes('<command-name>')) {
    const m = /<command-args>([\s\S]*?)<\/command-args>/.exec(text);
    text = m ? m[1] : '';
  }
  for (const re of STRIP_RES) text = text.replace(re, ' ');
  text = text.trim();
  return text || null;
}

function tokens(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1);
}

function jaccard(a, b) {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// A message becomes a candidate instruction only inside the word bounds.
function candidate(text) {
  const toks = tokens(text);
  if (toks.length < USER_REPEAT_MIN_WORDS || toks.length > USER_REPEAT_MAX_WORDS) return null;
  return { text, set: new Set(toks) };
}

const excerpt = (text) => {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > EXCERPT_CHARS ? line.slice(0, EXCERPT_CHARS) + '…' : line;
};

// Human messages of one previous transcript; `ok:false` when unreadable or over the byte cap.
function readHumanMessages(file) {
  let raw;
  try {
    if (fs.statSync(file).size > USER_REPEAT_MAX_BYTES) return { ok: false, messages: [] };
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return { ok: false, messages: [] };
  }
  const messages = [];
  for (const line of raw.split('\n')) {
    if (!line.includes('"type":"user"')) continue; // cheap prefilter: only user events parse
    let evt;
    try { evt = JSON.parse(line); } catch { continue; }
    const t = humanText(evt);
    if (t) messages.push(t);
  }
  return { ok: true, messages };
}

// Newest previous transcripts in the SAME directory as the current one (never siblings or other
// projects: this reads user text, so the scope is exact).
function previousSessions(transcriptPath, limit) {
  const dir = path.dirname(transcriptPath);
  const self = path.basename(transcriptPath);
  let names;
  try { names = fs.readdirSync(dir); } catch { return []; }
  return names
    .filter((n) => n.endsWith('.jsonl') && n !== self)
    .map((n) => {
      const full = path.join(dir, n);
      let mtime = 0;
      try { mtime = fs.statSync(full).mtimeMs; } catch { /* sorted last */ }
      return { full, id: path.basename(n, '.jsonl'), mtime };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit);
}

function skillSummary(st) {
  const map = new Map();
  for (const u of st.uses.values()) {
    if (u.name !== 'Skill' || !u.input || typeof u.input.skill !== 'string') continue;
    const r = st.results.get(u.id);
    const rec = map.get(u.input.skill) || { count: 0, ok: 0, err: 0, args: new Map() };
    rec.count++;
    if (r && r.isError) rec.err++;
    else if (r) rec.ok++;
    const args = typeof u.input.args === 'string' ? u.input.args.trim() : '';
    if (args) rec.args.set(args, (rec.args.get(args) || 0) + 1);
    map.set(u.input.skill, rec);
  }
  return map;
}

// Groups of near-identical messages inside the current session (friction) and, per group, how
// many previous sessions wrote the same instruction (proof for a slash command).
function groupInstructions(current, previous) {
  const groups = [];
  for (const msg of current) {
    const c = candidate(msg);
    if (!c) continue;
    const g = groups.find((x) => jaccard(x.set, c.set) >= USER_REPEAT_JACCARD);
    if (g) g.inSession++;
    else groups.push({ text: c.text, set: c.set, inSession: 1, sessions: [] });
  }
  for (const prev of previous) {
    const cands = prev.messages.map(candidate).filter(Boolean);
    for (const g of groups) {
      if (cands.some((c) => jaccard(g.set, c.set) >= USER_REPEAT_JACCARD)) g.sessions.push(prev.id);
    }
  }
  return groups;
}

// Lines of the `standardizzazione:` block. `ctx`: { st, userMsgs, transcriptPath, codex }.
// Absence of evidence is always stated ("non valutato", "parziale"), never printed as zero.
function evaluate(ctx) {
  const out = ['standardizzazione:'];
  if (ctx.codex) {
    out.push('  non valutato su Codex (best-effort: nessuna evidenza di skill o istruzioni ripetute, non è una sessione pulita)');
    return out;
  }

  const skills = skillSummary(ctx.st);
  out.push(`  skill invocations: ${skills.size ? skills.size : 'none'}`);
  [...skills.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([name, r]) => {
      const sameArgs = Math.max(0, ...r.args.values());
      const note = sameArgs >= SKILL_ARGS_REPEAT_MIN ? ` args identici x${sameArgs}` : '';
      out.push(`    ${name} x${r.count} (ok ${r.ok}, err ${r.err})${note}`);
    });

  const prevFiles = previousSessions(ctx.transcriptPath, USER_REPEAT_SESSIONS);
  const previous = [];
  let unreadable = 0;
  for (const p of prevFiles) {
    const r = readHumanMessages(p.full);
    if (r.ok) previous.push({ id: p.id, messages: r.messages });
    else unreadable++;
  }
  const groups = groupInstructions(ctx.userMsgs, previous);
  const cross = groups.filter((g) => g.sessions.length + 1 >= USER_REPEAT_MIN_SESSIONS);
  const intra = groups.filter((g) => g.inSession > 1);

  if (!prevFiles.length) {
    out.push('  repeated user instructions: non valutato (nessun transcript precedente nella project dir)');
  } else {
    out.push(`  repeated user instructions: ${cross.length} (sessione corrente + ${previous.length} precedenti confrontate)`);
    cross.slice(0, USER_REPEAT_GROUPS).forEach((g) => {
      const ids = g.sessions.slice(0, 3).map((id) => id.slice(0, 8)).join(', ');
      out.push(`    "${excerpt(g.text)}" — in ${g.sessions.length + 1} sessioni (precedenti: ${ids})`);
    });
    if (unreadable) out.push(`  [parziale: ${unreadable} transcript precedenti illeggibili o oltre il limite]`);
  }

  out.push(`  ripetute in sessione (attrito per Q5, non prova per slash command): ${intra.length}`);
  intra.slice(0, USER_REPEAT_GROUPS).forEach((g) => {
    out.push(`    x${g.inSession} "${excerpt(g.text)}"`);
  });

  if (out.length > STANDARDIZE_LINE_CAP) {
    const omitted = out.length - (STANDARDIZE_LINE_CAP - 1);
    return out.slice(0, STANDARDIZE_LINE_CAP - 1).concat(`  ... ${omitted} righe omesse (tetto ${STANDARDIZE_LINE_CAP})`);
  }
  return out;
}

module.exports = {
  humanText,
  evaluate,
  USER_REPEAT_SESSIONS,
  USER_REPEAT_JACCARD,
  USER_REPEAT_MIN_WORDS,
  USER_REPEAT_MIN_SESSIONS,
  SKILL_ARGS_REPEAT_MIN,
  STANDARDIZE_LINE_CAP,
};
