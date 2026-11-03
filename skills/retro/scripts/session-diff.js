'use strict';
// session-diff.js — the `diff:` block of retro's Passo 0 (retro v3).
//
// One diff per branch, not one anchored to "HEAD now": a session can span several branches
// and run beside other sessions (decisions of tickets #80 and #89). For each candidate
// branch the anchor is the last commit on that branch before the session started, the tip
// is the working tree (live session, checked-out branch) or the last commit before the
// session's last event. A branch is ATTRIBUITO / PARZIALE / NON ATTRIBUIBILE according to
// the intersection of its git diff paths with the paths the transcript edited successfully,
// or to commits made inside the session window. `NON RICAVABILE` is reserved for "git
// cannot answer" and is distinct from "git answered but the diff is not this session's".

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DIFF_LINE_CAP = 12;
const FILES_PER_BRANCH = 3;
const WINDOW_SLACK_MS = 60000;
const ATTRIBUTED_SHARE = 0.5;

const isWin = process.platform === 'win32';
const norm = (p) => {
  const s = String(p).replace(/\\/g, '/');
  return isWin ? s.toLowerCase() : s;
};

function git(cwd, args) {
  const r = spawnSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8',
    timeout: 20000,
    maxBuffer: 64 * 1024 * 1024,
  });
  return r.status === 0 && !r.error ? r.stdout : null;
}

// `git diff --numstat -z` records: "<add>\t<del>\t<path>\0", or for renames
// "<add>\t<del>\t\0<old>\0<new>\0".
function parseNumstat(out) {
  const files = [];
  if (!out) return files;
  const parts = out.split('\0');
  for (let i = 0; i < parts.length; i++) {
    const m = /^(\d+|-)\t(\d+|-)\t(.*)$/.exec(parts[i]);
    if (!m) continue;
    let file = m[3];
    if (!file) {
      file = parts[i + 2] || parts[i + 1] || '';
      i += 2;
    }
    if (file) files.push({ file, add: m[1] === '-' ? 0 : Number(m[1]), del: m[2] === '-' ? 0 : Number(m[2]) });
  }
  return files;
}

function unrecoverable(reason, partialPaths) {
  const lines = [`diff: NON RICAVABILE (${reason})`];
  if (partialPaths && partialPaths.length) {
    const tails = partialPaths.slice(0, 5).map((p) => p.split(/[\\/]+/).filter(Boolean).slice(-2).join('/'));
    lines.push(`  path dal transcript (parziali, non un diff): ${tails.join(', ')}${partialPaths.length > 5 ? ', ...' : ''}`);
  }
  return lines;
}

function analyzeBranch(top, branch, o) {
  const ref = `refs/heads/${branch}`;
  if (git(top, ['rev-parse', '--verify', '--quiet', ref]) === null) {
    return { branch, state: 'NON ATTRIBUIBILE', note: 'branch non più presente' };
  }
  let anchor;
  if (o.anchorCommit) {
    anchor = git(top, ['rev-parse', '--verify', '--quiet', `${o.anchorCommit}^{commit}`]) ? o.anchorCommit : null;
  } else {
    anchor = (git(top, ['rev-list', '-n1', `--before=${o.firstIso}`, ref]) || '').trim() || null;
  }
  if (!anchor) return { branch, state: 'NON RICAVABILE', note: 'nessun commit prima dell’inizio della sessione' };

  const useTree = o.live && o.current === branch;
  let tipRef = ref;
  if (!o.live) {
    tipRef = (git(top, ['rev-list', '-n1', `--before=${o.lastIso}`, ref]) || '').trim() || ref;
  }
  const numstat = useTree
    ? git(top, ['diff', '--numstat', '-z', anchor])
    : git(top, ['diff', '--numstat', '-z', `${anchor}..${tipRef}`]);
  if (numstat === null) return { branch, state: 'NON RICAVABILE', note: 'git diff non riuscito' };
  const files = parseNumstat(numstat);
  let untracked = [];
  if (useTree) {
    const u = git(top, ['ls-files', '--others', '--exclude-standard', '-z']);
    untracked = u ? u.split('\0').filter(Boolean) : [];
  }
  const startSec = Math.floor((Date.parse(o.firstIso) - WINDOW_SLACK_MS) / 1000);
  const stamps = (git(top, ['log', '--format=%ct', `${anchor}..${tipRef}`]) || '').split('\n').filter(Boolean).map(Number);
  const sessionCommits = stamps.filter((t) => t >= startSec).length;

  const gitPaths = new Set(files.map((f) => norm(f.file)).concat(untracked.map(norm)));
  let overlap = 0;
  for (const p of gitPaths) if (o.editRel.has(p)) overlap++;

  let state;
  if (gitPaths.size === 0) state = o.editRel.size === 0 ? 'NESSUNA MODIFICA' : 'NON ATTRIBUIBILE';
  else if (overlap === 0 && sessionCommits === 0) state = 'NON ATTRIBUIBILE';
  else if (overlap >= gitPaths.size * ATTRIBUTED_SHARE) state = 'ATTRIBUITO';
  else state = 'PARZIALE';

  const add = files.reduce((s, f) => s + f.add, 0);
  const del = files.reduce((s, f) => s + f.del, 0);
  const top3 = files
    .slice()
    .sort((a, b) => b.add + b.del - (a.add + a.del))
    .slice(0, FILES_PER_BRANCH);
  return {
    branch, state, anchor, tree: useTree, files: files.length, untracked: untracked.length,
    add, del, top: top3, sessionCommits, overlap, total: gitPaths.size,
  };
}

// o: { cwd, firstTs, lastTs, live, branches, current?, anchorCommit?, editPaths (abs),
//      deniedLine, otherHead? }
function buildDiff(o) {
  const deniedLine = `  rifiuti: ${o.deniedLine}`;
  const done = (lines) => {
    const room = DIFF_LINE_CAP - 1; // the denial line is always present, last
    if (lines.length <= room) return lines.concat(deniedLine);
    return lines
      .slice(0, room - 1)
      .concat(`  ... ${lines.length - (room - 1)} righe omesse (tetto ${DIFF_LINE_CAP})`, deniedLine);
  };
  const partial = [...o.editPaths];
  if (!o.cwd || !fs.existsSync(o.cwd)) return done(unrecoverable('cwd della sessione assente', partial));
  const firstMs = Date.parse(o.firstTs);
  if (!Number.isFinite(firstMs)) return done(unrecoverable('nessun timestamp di inizio sessione', partial));
  const topOut = git(o.cwd, ['rev-parse', '--show-toplevel']);
  if (topOut === null) return done(unrecoverable('non è un repo git, o git non disponibile', partial));
  const top = topOut.trim();

  const current = (git(top, ['branch', '--show-current']) || '').trim() || null;
  const candidates = [...new Set(o.branches)];
  if (!candidates.length && current) candidates.push(current);
  if (!candidates.length) return done(unrecoverable('nessun branch noto per la sessione', partial));

  const editRel = new Set();
  let outside = 0;
  // Edits made inside a subagent worktree are relative to that worktree, which is how the
  // worktree branch's diff names them; register both the repo-relative and the worktree-relative form.
  const roots = [top, ...(o.worktreeRoots || [])];
  const within = (rel) => rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  for (const p of o.editPaths) {
    let inside = false;
    for (const root of roots) {
      const rel = path.relative(root, p);
      if (within(rel)) {
        editRel.add(norm(rel));
        inside = true;
      }
    }
    if (!inside) outside++;
  }
  const lastMs = Date.parse(o.lastTs);
  const base = {
    firstIso: new Date(firstMs).toISOString(),
    lastIso: new Date((Number.isFinite(lastMs) ? lastMs : firstMs) + WINDOW_SLACK_MS).toISOString(),
    live: o.live, current, editRel, anchorCommit: o.anchorCommit || null,
  };
  const results = candidates.map((b) => analyzeBranch(top, b, base));
  const usable = results.filter((r) => r.state !== 'NON RICAVABILE');
  // An empty diff is "no change" only when the session's edits landed on another branch
  // (or there were none); edits that appear in no branch's diff stay unattributed.
  const landed = results.some((r) => r.state === 'ATTRIBUITO' || r.state === 'PARZIALE');
  for (const r of results) {
    if (r.state === 'NON ATTRIBUIBILE' && r.total === 0 && !r.note && landed) r.state = 'NESSUNA MODIFICA';
  }
  if (!usable.length) return done(unrecoverable(results.map((r) => `${r.branch}: ${r.note}`).join('; '), partial));

  const order = { ATTRIBUITO: 0, PARZIALE: 1, 'NON ATTRIBUIBILE': 2, 'NESSUNA MODIFICA': 3 };
  usable.sort((a, b) => order[a.state] - order[b.state] || (b.files || 0) - (a.files || 0));
  const lines = [`diff: ${usable.length} branch (repo ${path.basename(top)})`];
  for (const r of usable) {
    if (r.note) {
      lines.push(`  ${r.branch} [${r.state}] ${r.note}`);
      continue;
    }
    lines.push(
      `  ${r.branch} [${r.state}] ${r.anchor.slice(0, 7)} → ${r.tree ? 'working tree' : 'tip'}: ` +
        `${r.files} file +${r.add} -${r.del}` +
        `${r.untracked ? `, ${r.untracked} non tracciati` : ''}, ${r.sessionCommits} commit della sessione, ` +
        `${r.overlap}/${r.total} path anche negli edit`
    );
  }
  if (!usable.some((r) => r.state === 'ATTRIBUITO' || r.state === 'PARZIALE') && usable.some((r) => r.state === 'NON ATTRIBUIBILE')) {
    lines.push('  verdetto: NON ATTRIBUIBILE (nessun branch regge l’intersezione con gli edit del transcript)');
  }
  if (o.live && current && !candidates.includes(current)) {
    lines.push(`  HEAD attuale: ${current}, non un branch di questa sessione`);
  }
  if (outside) lines.push(`  ${outside} edit fuori dal repo (non nel diff)`);
  const best = usable.find((r) => r.top && r.top.length);
  if (best) for (const f of best.top) lines.push(`    ${f.file} +${f.add} -${f.del}`);
  return done(lines);
}

module.exports = { buildDiff, parseNumstat, DIFF_LINE_CAP };
