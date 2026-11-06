// Tests for the `standardizzazione:` block of skills/retro/scripts/session-evidence.js
// (ADR 0012, ref #101): model-issued Skill calls and user instructions repeated across sessions.
//
// Record shapes mirror real Claude Code records: human messages carry `origin: 'human'` and a
// string content; slash commands are wrapped in <command-name>/<command-args>; peer sessions,
// task notifications, meta records and tool_result carriers are NOT human text.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.resolve(__dirname, '..', '..', 'skills', 'retro', 'scripts', 'session-evidence.js');
const ago = (ms) => new Date(Date.now() - ms).toISOString();
const MIN = 60000;

function makeEnv() {
  const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-std-')));
  const home = path.join(root, 'home');
  const cwd = path.join(root, 'repo');
  const proj = path.join(home, '.claude', 'projects', 'proj-a');
  const other = path.join(home, '.claude', 'projects', 'proj-b');
  fs.mkdirSync(proj, { recursive: true });
  fs.mkdirSync(other, { recursive: true });
  fs.mkdirSync(cwd, { recursive: true });
  return { root, home, cwd, proj, other };
}

let uid = 0;
const base = (env, id, type, ts, extra) => ({
  type, sessionId: id, timestamp: ts, uuid: `${id}-${uid++}`, cwd: env.cwd, ...extra,
});
const human = (env, id, ts, text, extra) =>
  base(env, id, 'user', ts, { origin: 'human', message: { role: 'user', content: text }, ...extra });
const skillUse = (env, id, ts, tuid, skill, args) =>
  base(env, id, 'assistant', ts, {
    message: { role: 'assistant', content: [{ type: 'tool_use', id: tuid, name: 'Skill', input: args ? { skill, args } : { skill } }] },
  });
const toolResult = (env, id, ts, tuid, isError) =>
  base(env, id, 'user', ts, {
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: tuid, content: isError ? 'Error: no such skill' : 'Launching skill', is_error: !!isError }] },
  });

function write(dir, id, events, ageMs) {
  const file = path.join(dir, `${id}.jsonl`);
  fs.writeFileSync(file, events.map((e) => JSON.stringify(e)).join('\n') + '\n');
  const t = new Date(Date.now() - ageMs);
  fs.utimesSync(file, t, t);
  return file;
}

function run(env, args) {
  const childEnv = { ...process.env, HOME: env.home, USERPROFILE: env.home, CODEX_HOME: path.join(env.home, '.codex') };
  delete childEnv.CODEX_THREAD_ID;
  delete childEnv.CLAUDE_CODE_SESSION_ID;
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: env.cwd, env: childEnv, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout;
}

const std = (out) => {
  const lines = out.split('\n');
  const i = lines.findIndex((l) => l === 'standardizzazione:');
  assert.ok(i >= 0, `no standardizzazione block in:\n${out}`);
  const body = [];
  for (let j = i + 1; j < lines.length && lines[j].startsWith('  '); j++) body.push(lines[j]);
  return body.join('\n');
};

const INSTR = 'ricordati di aggiornare il changelog con la voce della feature appena chiusa';
const INSTR_VARIANT = 'ricordati di aggiornare anche il changelog con la voce della feature appena chiusa';

test('skill invocations: outcome per skill and identical-args marker', () => {
  const env = makeEnv();
  const ev = [
    human(env, 'cur', ago(20 * MIN), 'fai partire il flusso di rilascio completo'),
    skillUse(env, 'cur', ago(19 * MIN), 'u1', 'gh-flow', 'feature: retro loop'),
    toolResult(env, 'cur', ago(19 * MIN), 'u1', false),
    skillUse(env, 'cur', ago(18 * MIN), 'u2', 'gh-flow', 'feature: retro loop'),
    toolResult(env, 'cur', ago(18 * MIN), 'u2', false),
    skillUse(env, 'cur', ago(17 * MIN), 'u3', 'beta-release', '1.0.0'),
    toolResult(env, 'cur', ago(17 * MIN), 'u3', true),
  ];
  const file = write(env.proj, 'cur', ev, MIN);
  const out = std(run(env, ['--transcript', file, '--agent', 'claude']));
  assert.match(out, /skill invocations: 2/);
  assert.match(out, /gh-flow x2 \(ok 2, err 0\) args identici x2/);
  assert.match(out, /beta-release x1 \(ok 0, err 1\)$/m);
});

test('an instruction written in two distinct sessions of the same project is reported', () => {
  const env = makeEnv();
  write(env.proj, 'old1', [human(env, 'old1', ago(3 * 24 * 60 * MIN), INSTR_VARIANT)], 3 * 24 * 60 * MIN);
  write(env.proj, 'old2', [human(env, 'old2', ago(2 * 24 * 60 * MIN), 'altro messaggio senza relazione con il resto')], 2 * 24 * 60 * MIN);
  const file = write(env.proj, 'cur', [human(env, 'cur', ago(5 * MIN), INSTR)], MIN);
  const out = std(run(env, ['--transcript', file, '--agent', 'claude']));
  assert.match(out, /repeated user instructions: 1 \(sessione corrente \+ 2 precedenti confrontate\)/);
  assert.match(out, /"ricordati di aggiornare il changelog.*" — in 2 sessioni \(precedenti: old1\)/);
  assert.match(out, /ripetute in sessione .*: 0/);
});

test('a repeat inside a single session is friction, never slash-command proof', () => {
  const env = makeEnv();
  write(env.proj, 'old1', [human(env, 'old1', ago(60 * MIN), 'tutt altro argomento completamente diverso da prima')], 60 * MIN);
  const file = write(env.proj, 'cur', [
    human(env, 'cur', ago(9 * MIN), INSTR),
    human(env, 'cur', ago(5 * MIN), INSTR),
  ], MIN);
  const out = std(run(env, ['--transcript', file, '--agent', 'claude']));
  assert.match(out, /repeated user instructions: 0 /);
  assert.match(out, /ripetute in sessione .*: 1/);
  assert.match(out, /x2 "ricordati di aggiornare il changelog/);
});

test('only genuine human text counts: wrappers, meta, peers, tool results and short messages are ignored', () => {
  const env = makeEnv();
  const noise = [
    human(env, 'old1', ago(60 * MIN), `<system-reminder>${INSTR}</system-reminder>`),
    human(env, 'old1', ago(59 * MIN), `<command-message>x</command-message><command-name>/x</command-name>`),
    human(env, 'old1', ago(58 * MIN), INSTR, { isMeta: true }),
    human(env, 'old1', ago(57 * MIN), INSTR, { origin: 'peer' }),
    human(env, 'old1', ago(56 * MIN), INSTR, { origin: 'task-notification' }),
    toolResult(env, 'old1', ago(55 * MIN), 't1', false),
    human(env, 'old1', ago(54 * MIN), 'vai avanti ok'),
  ];
  write(env.proj, 'old1', noise, 60 * MIN);
  const file = write(env.proj, 'cur', [human(env, 'cur', ago(5 * MIN), INSTR), human(env, 'cur', ago(4 * MIN), 'vai avanti ok')], MIN);
  const out = std(run(env, ['--transcript', file, '--agent', 'claude']));
  assert.match(out, /repeated user instructions: 0 /);
  assert.doesNotMatch(out, /vai avanti/);
});

test('the typed arguments of a slash command are the instruction, the wrapper is not', () => {
  const env = makeEnv();
  const wrap = (args) => `<command-message>grilling</command-message>\n<command-name>/grilling</command-name>\n<command-args>${args}</command-args>`;
  write(env.proj, 'old1', [human(env, 'old1', ago(60 * MIN), wrap(INSTR_VARIANT))], 60 * MIN);
  const file = write(env.proj, 'cur', [human(env, 'cur', ago(5 * MIN), wrap(INSTR))], MIN);
  const out = std(run(env, ['--transcript', file, '--agent', 'claude']));
  assert.match(out, /repeated user instructions: 1 /);
});

test('sessions of another project directory are never read', () => {
  const env = makeEnv();
  write(env.other, 'foreign', [human(env, 'foreign', ago(60 * MIN), INSTR)], 60 * MIN);
  const file = write(env.proj, 'cur', [human(env, 'cur', ago(5 * MIN), INSTR)], MIN);
  const out = std(run(env, ['--transcript', file, '--agent', 'claude']));
  assert.match(out, /repeated user instructions: non valutato \(nessun transcript precedente/);
});

test('output is capped at three groups and an unreadable previous transcript is declared partial', () => {
  const env = makeEnv();
  const topics = [
    'controlla sempre che il branch sia aggiornato prima di aprire la pull request',
    'rigenera i file freezed con build runner dopo ogni modifica ai modelli',
    'scrivi i messaggi di commit in inglese con lo scope della feature corrente',
    'non toccare mai il file di configurazione delle flavor senza chiedere prima',
  ];
  write(env.proj, 'old1', topics.map((t, i) => human(env, 'old1', ago((90 - i) * MIN), t)), 90 * MIN);
  fs.mkdirSync(path.join(env.proj, 'broken.jsonl')); // readFileSync on a directory throws
  const file = write(env.proj, 'cur', topics.map((t, i) => human(env, 'cur', ago((10 - i) * MIN), t)), MIN);
  const out = std(run(env, ['--transcript', file, '--agent', 'claude']));
  assert.match(out, /repeated user instructions: 4 /);
  assert.strictEqual((out.match(/ — in 2 sessioni/g) || []).length, 3);
  assert.match(out, /\[parziale: 1 transcript precedenti illeggibili o oltre il limite\]/);
});

test('--config-audit output is unchanged: no standardizzazione block', () => {
  const env = makeEnv();
  const file = write(env.proj, 'cur', [human(env, 'cur', ago(5 * MIN), INSTR)], MIN);
  const out = run(env, ['--transcript', file, '--agent', 'claude', '--config-audit']);
  assert.doesNotMatch(out, /standardizzazione:/);
  assert.match(out, /skill invocations: none/);
});
