// Regression tests for skills/retro/scripts/session-evidence.js (ref #74).
// Run: node --test tests/
//
// Each case builds a fake ~/.claude/projects tree under a temp HOME and runs the script as a
// child process from a temp cwd whose slug matches a fixture project dir.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.resolve(__dirname, '..', '..', 'skills', 'retro', 'scripts', 'session-evidence.js');
const HOUR = 3600000;

const slugOf = (p) => p.replace(/[^a-zA-Z0-9]/g, '-');

function makeEnv() {
  const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-evidence-')));
  const home = path.join(root, 'home');
  const cwd = path.join(root, 'repo');
  fs.mkdirSync(path.join(home, '.claude', 'projects'), { recursive: true });
  fs.mkdirSync(cwd, { recursive: true });
  return { root, home, cwd, slug: slugOf(cwd) };
}

// events: [{ ageMs, blocks? }] — last event is `ageMs` before now; mtime follows it.
function writeTranscript(env, dirName, id, events) {
  const dir = path.join(env.home, '.claude', 'projects', dirName);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${id}.jsonl`);
  const lines = events.map((e, i) =>
    JSON.stringify({
      type: 'assistant',
      sessionId: id,
      timestamp: new Date(Date.now() - e.ageMs).toISOString(),
      uuid: `${id}-${i}`,
      message: { role: 'assistant', content: e.blocks || [{ type: 'text', text: 'hi' }] },
    })
  );
  fs.writeFileSync(file, lines.join('\n') + '\n');
  const last = new Date(Date.now() - Math.min(...events.map((e) => e.ageMs)));
  fs.utimesSync(file, last, last);
  return file;
}

function run(env, args = [], extraEnv = {}) {
  const childEnv = { ...process.env, HOME: env.home, USERPROFILE: env.home, ...extraEnv };
  childEnv.CODEX_HOME = path.join(env.home, '.codex');
  delete childEnv.CODEX_THREAD_ID;
  if (!('CLAUDE_CODE_SESSION_ID' in extraEnv)) delete childEnv.CLAUDE_CODE_SESSION_ID;
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: env.cwd, env: childEnv, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout;
}

test('stale cwd-slug transcript + one fresh <slug>-apps-x sibling: fresh one is selected', () => {
  const env = makeEnv();
  writeTranscript(env, env.slug, 'stale-session', [{ ageMs: 8 * 24 * HOUR }, { ageMs: 8 * 24 * HOUR }]);
  writeTranscript(env, `${env.slug}-apps-x`, 'fresh-session', [{ ageMs: 60000 }, { ageMs: 30000 }]);

  const out = run(env);
  assert.match(out, /selected by: candidate scan/);
  assert.match(out, /session: fresh-session/);
  assert.doesNotMatch(out, /WARNING/);
});

test('stale pick with no single fresh candidate: WARNING and candidate list', () => {
  const env = makeEnv();
  writeTranscript(env, env.slug, 'stale-a', [{ ageMs: 9 * HOUR }]);
  writeTranscript(env, `${env.slug}-apps-x`, 'stale-b', [{ ageMs: 20 * HOUR }, { ageMs: 19 * HOUR }]);

  const out = run(env);
  assert.match(out, /WARNING: newest transcript is 9\.0h old/);
  assert.match(out, /UNVERIFIED/);
  assert.match(out, /candidates \(2/);
  assert.match(out, /stale-b .*events: 2/);
  assert.match(out, /session: stale-a/);
});

test('fresh cwd-slug pick is kept as is: no scan, no WARNING, even with a fresh sibling', () => {
  const env = makeEnv();
  writeTranscript(env, env.slug, 'fresh-a', [{ ageMs: 120000 }]);
  writeTranscript(env, `${env.slug}-apps-x`, 'fresh-b', [{ ageMs: 60000 }]);

  const out = run(env);
  assert.match(out, /selected by: newest by mtime/);
  assert.match(out, /session: fresh-a/);
  assert.doesNotMatch(out, /WARNING|candidates/);
});

test('stale pick with two fresh siblings: ambiguous, so WARNING instead of guessing', () => {
  const env = makeEnv();
  writeTranscript(env, env.slug, 'stale-a', [{ ageMs: 8 * 24 * HOUR }]);
  writeTranscript(env, `${env.slug}-apps-x`, 'fresh-x', [{ ageMs: 60000 }]);
  writeTranscript(env, `${env.slug}-apps-y`, 'fresh-y', [{ ageMs: 90000 }]);

  const out = run(env);
  assert.match(out, /WARNING/);
  assert.match(out, /session: stale-a/);
  assert.match(out, /fresh-x/);
  assert.match(out, /fresh-y/);
});

test('CLAUDE_CODE_SESSION_ID selects the exact transcript from an unrelated project dir', () => {
  const env = makeEnv();
  writeTranscript(env, env.slug, 'decoy', [{ ageMs: 1000 }]);
  writeTranscript(env, 'some-other-project', 'env-session', [{ ageMs: 2 * HOUR }]);

  const out = run(env, [], { CLAUDE_CODE_SESSION_ID: 'env-session' });
  assert.match(out, /selected by: session id \(CLAUDE_CODE_SESSION_ID=env-session\)/);
  assert.match(out, /session: env-session/);
  assert.doesNotMatch(out, /WARNING/);
});

test('--session <id> selects the exact transcript; unknown id reports not found', () => {
  const env = makeEnv();
  writeTranscript(env, env.slug, 'decoy', [{ ageMs: 1000 }]);
  writeTranscript(env, 'some-other-project', 'wanted', [{ ageMs: 3 * HOUR }]);

  assert.match(run(env, ['--session', 'wanted']), /session: wanted/);
  assert.match(run(env, ['--session', 'nope']), /no transcript found for session id nope/);
  // path-traversal-shaped ids must not be resolved
  assert.match(run(env, ['--session', '../x']), /no transcript found/);
});

test('--list prints candidates even when the pick is fresh', () => {
  const env = makeEnv();
  writeTranscript(env, env.slug, 'fresh-a', [{ ageMs: 1000 }]);
  writeTranscript(env, `${env.slug}-apps-x`, 'fresh-b', [{ ageMs: 500000 }]);

  const out = run(env, ['--list']);
  assert.match(out, /candidates \(2/);
  assert.match(out, /fresh-a/);
  assert.match(out, /fresh-b/);
});

test('failed tool groups cite the command and error line; re-edited files show last two segments', () => {
  const env = makeEnv();
  const blocks = [];
  for (let i = 0; i < 3; i++) {
    blocks.push({ type: 'tool_use', id: `t${i}`, name: 'PowerShell', input: { command: 'flutter test test/foo_test.dart' } });
    blocks.push({
      type: 'tool_result',
      tool_use_id: `t${i}`,
      is_error: true,
      content: 'Running tests...\nTest failed: expected 1, got 2\nExit code 1',
    });
    blocks.push({
      type: 'tool_use',
      id: `e${i}`,
      name: 'Edit',
      input: { file_path: 'C:\\proj\\lib\\src\\feature\\foo_page.dart' },
    });
  }
  writeTranscript(env, env.slug, 'cite-session', [{ ageMs: 1000, blocks }]);

  const out = run(env, ['--session', 'cite-session']);
  assert.match(out, /PowerShell x3 `flutter test test\/foo_test\.dart` → Test failed: expected 1, got 2/);
  assert.match(out, /repeated shell commands: 1/);
  assert.match(out, / x3 feature\/foo_page\.dart/);
});
