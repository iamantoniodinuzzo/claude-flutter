'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function records(file) {
  const events = [];
  let malformed = 0;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (!event || typeof event !== 'object' || Array.isArray(event)) malformed++;
      else events.push(event);
    } catch { malformed++; }
  }
  return { events, malformed };
}

function sessionFiles(dir) {
  const files = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...sessionFiles(full));
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(full);
    }
  } catch { /* Missing or inaccessible session directory. */ }
  return files;
}

function summary(file) {
  let fd;
  try {
    // Candidate discovery reads only the metadata and tail, not every full session.
    fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    const chunks = [];
    let offset = 0;
    while (offset < Math.min(size, 2_000_000)) {
      const chunk = Buffer.alloc(Math.min(size - offset, 65536));
      const read = fs.readSync(fd, chunk, 0, chunk.length, offset);
      if (!read) break;
      chunks.push(chunk.subarray(0, read)); offset += read;
      if (chunk.subarray(0, read).includes(10)) break;
    }
    const first = JSON.parse(Buffer.concat(chunks).toString('utf8').split('\n')[0]);
    const meta = first.type === 'session_meta' ? first.payload : null;
    if (!meta?.id || !meta.cwd) return null;
    const tail = Buffer.alloc(Math.min(size, 65536));
    fs.readSync(fd, tail, 0, tail.length, Math.max(0, size - tail.length));
    const times = [...tail.toString('utf8').matchAll(/"timestamp"\s*:\s*"([^"]+)"/g)]
      .map(m => Date.parse(m[1])).filter(Number.isFinite);
    return { full: file, id: meta.id, cwd: meta.cwd, dirName: meta.cwd,
      events: 'not counted', lastMs: times.length ? Math.max(...times) : 0 };
  } catch { return null; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}

function sameDirectory(a, b) {
  const normalize = value => {
    const absolute = path.resolve(value);
    return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
  };
  return normalize(a) === normalize(b);
}

function candidates() {
  const home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  return sessionFiles(path.join(home, 'sessions')).map(summary).filter(Boolean)
    .sort((a, b) => b.lastMs - a.lastMs);
}

function select(args) {
  if (args.agent === 'claude') return null;
  if (args.transcript) {
    try {
      const { events } = records(args.transcript);
      if (args.agent === 'codex' || events.some(e => e.type === 'session_meta')) {
        return { path: args.transcript, selectedBy: '--transcript', candidates: args.list ? candidates().slice(0, 5) : null, notes: [] };
      }
    } catch {
      if (args.agent === 'codex') return { path: null, message: `no transcript found at ${args.transcript}` };
    }
    return null;
  }
  const id = args.session || process.env.CODEX_THREAD_ID;
  if (args.agent === 'auto' && !id && process.env.CLAUDE_CODE_SESSION_ID) return null;
  const all = candidates();
  if (id) {
    const matches = all.filter(c => c.id === id);
    if (matches.length === 1) return { path: matches[0].full,
      selectedBy: args.session ? `--session ${id}` : `session id (CODEX_THREAD_ID=${id})`,
      candidates: args.list ? all.filter(c => sameDirectory(c.cwd, process.cwd())).slice(0, 5) : null, notes: [] };
    if (args.agent === 'codex' || (!args.session && process.env.CODEX_THREAD_ID)) {
      return { path: null, message: matches.length > 1
        ? 'WARNING: ambiguous Codex session id; use --transcript <path> (evidence UNVERIFIED)'
        : `no transcript found for Codex session id ${id}` };
    }
    return null;
  }
  const matching = all.filter(c => sameDirectory(c.cwd, process.cwd()));
  if (!matching.length) return args.agent === 'codex'
    ? { path: null, message: 'no Codex transcript found for this working directory' } : null;
  if (args.agent === 'auto') {
    const slug = process.cwd().replace(/[^a-zA-Z0-9]/g, '-');
    const claudeDir = path.join(os.homedir(), '.claude', 'projects', slug);
    try {
      if (fs.readdirSync(claudeDir).some(name => name.endsWith('.jsonl'))) return {
        path: null, message: 'WARNING: Claude and Codex transcripts exist for this cwd; pass --agent or an explicit transcript (evidence UNVERIFIED)' };
    } catch { /* No Claude candidate for this cwd. */ }
  }
  const threshold = Number(process.env.RETRO_STALE_HOURS);
  const ageLimit = (Number.isFinite(threshold) && threshold > 0 ? threshold : 6) * 3600000;
  const fresh = matching.filter(c => Date.now() - c.lastMs <= ageLimit);
  if (fresh.length > 1) return { path: null,
    message: 'WARNING: multiple fresh Codex sessions for this cwd; use --session <id> or --transcript <path> (evidence UNVERIFIED)' };
  const chosen = fresh[0] || matching[0];
  return { path: chosen.full, selectedBy: 'Codex cwd metadata (only fresh candidate, otherwise newest)',
    candidates: args.list || !fresh.length ? matching.slice(0, 5) : null,
    stale: fresh.length ? null : { ageMs: Date.now() - chosen.lastMs }, notes: [] };
}

function normalize(raw) {
  const events = [];
  let malformed = 0;
  let unsupported = 0;
  let sessionId;
  const pending = new Map();
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch { malformed++; continue; }
    if (!event || typeof event !== 'object' || Array.isArray(event)) { malformed++; continue; }
    if (event.type === 'session_meta') sessionId = event.payload?.id;
    const payload = event.payload || {};
    const content = [];
    if (event.type === 'response_item') {
      if (payload.type === 'function_call' || payload.type === 'custom_tool_call') {
        let input = {};
        if (payload.type === 'function_call') {
          try { input = JSON.parse(payload.arguments || '{}'); } catch { malformed++; }
        } else input = { patch: payload.input || '' };
        if (typeof input.cmd === 'string') input.command = input.cmd;
        if (/^(?:functions\.)?exec$/.test(payload.name)) unsupported++;
        if (payload.call_id) pending.set(payload.call_id, { name: payload.name, input });
        content.push({ type: 'tool_use', id: payload.call_id, name: payload.name, input });
      } else if (payload.type === 'function_call_output' || payload.type === 'custom_tool_call_output') {
        const output = payload.output;
        const text = typeof output === 'string' ? output : JSON.stringify(output);
        let data = output;
        if (typeof output === 'string') { try { data = JSON.parse(output); } catch { /* Plain-text tool output. */ } }
        const exitMatch = (text || '').match(/(?:Process exited with code|Process exit code):?\s*(-?\d+)\b/i);
        const exit = data?.exit_code ?? data?.metadata?.exit_code ?? (exitMatch ? Number(exitMatch[1]) : undefined);
        const failed = data?.isError === true || data?.is_error === true
          || (typeof exit === 'number' ? exit !== 0 : /^(?:Error:|error:|Failed to|failed to)/m.test(text || ''));
        content.push({ type: 'tool_result', tool_use_id: payload.call_id, is_error: failed, content: text || '' });
        const call = pending.get(payload.call_id);
        if (!call) unsupported++;
        if (call && !failed && /(?:^|__)apply_patch$/.test(call.name)) {
          for (const match of (call.input.patch || call.input.input || '').matchAll(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/gm)) {
            content.push({ type: 'tool_use', name: 'Edit', input: { file_path: match[1].trim() } });
          }
        }
      } else if (payload.type === 'local_shell_call' || /tool|function_call/.test(payload.type || '')) {
        unsupported++;
      }
    }
    events.push({ timestamp: event.timestamp, sessionId, message: { content } });
  }
  return { raw: events.map(e => JSON.stringify(e)).join('\n'), malformed, unsupported,
    recognized: !!sessionId };
}

module.exports = { select, normalize, candidates, sameDirectory };
