'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseArgs, invocation, finalText, run, executable } = require('../../skills/second-opinion/scripts/review.js');

test('review defaults to Gemini and rejects invalid providers and timeouts', () => {
  assert.equal(parseArgs(['--prompt-file', 'context.md']).provider, 'gemini');
  assert.equal(parseArgs(['--provider', 'codex', '--prompt-file', 'context.md']).timeoutSeconds, 180);
  assert.throws(() => parseArgs(['--provider', 'unknown']), /provider/);
  assert.throws(() => parseArgs(['--prompt-file', 'x', '--timeout-seconds', '0']), /positive/);
  assert.equal(executable('gemini', { PATH: '' }), null);
});

test('provider adapters enforce tool restrictions and preserve actual response formats', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'opinion-test-')));
  t.after(() => { assert.equal(path.dirname(root), fs.realpathSync(os.tmpdir())); fs.rmSync(root, { recursive: true, force: true }); });
  const gemini = invocation('gemini', root);
  const settings = JSON.parse(fs.readFileSync(gemini.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH));
  assert.deepEqual(settings.tools.core, []); assert.equal(settings.hooksConfig.enabled, false);
  assert.match(fs.readFileSync(settings.policyPaths[0], 'utf8'), /decision = "deny"/);
  assert(!gemini.args.includes('plan')); assert(!gemini.args.includes('yolo'));
  assert(invocation('codex', root).args.includes('read-only'));
  const claude = invocation('claude', root).args;
  assert.equal(claude[claude.indexOf('--tools') + 1], ''); assert(claude.includes('--strict-mcp-config'));
  assert.equal(finalText('gemini', '{"response":"review"}'), 'review');
  assert.equal(finalText('claude', '{"result":"review"}'), 'review');
  assert.equal(finalText('codex', '{"type":"item.completed","item":{"type":"agent_message","text":"review"}}\n'), 'review');
  assert.throws(() => finalText('claude', '{"is_error":true}'), /error/);
  assert.throws(() => finalText('codex', '{"type":"turn.failed"}'), /error/);
});

test('process runner passes literal stdin without shell execution and reports failures', async () => {
  const prompt = 'Literal `command` $(command) "quotes"\nsecond line';
  const options = { cwd: os.tmpdir(), env: process.env, prompt, timeoutSeconds: 5 };
  assert.equal(await run(process.execPath, ['-e', 'process.stdin.pipe(process.stdout)'], options), prompt);
  await assert.rejects(run(process.execPath, ['-e', 'process.stderr.write("auth required");process.exit(2)'], options), /code 2.*auth required/);
  await assert.rejects(run(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { ...options, timeoutSeconds: 0.2 }), /timed out/);
});

test('all provider CLIs receive isolated context through stdin and return the selected opinion', t => {
  const tempRoot = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(tempRoot, 'opinion-cli-'));
  t.after(() => { assert.equal(path.dirname(root), tempRoot); fs.rmSync(root, { recursive: true, force: true }); });
  const entries = { gemini: '@google/gemini-cli/dist/index.js', codex: '@openai/codex/bin/codex.js',
    claude: '@anthropic-ai/claude-code/cli.js' };
  const prompt = path.join(root, 'prompt.md');
  fs.writeFileSync(prompt, 'Review `literal` $(literal) "quotes"\nwith relevant code.');
  const script = path.resolve(__dirname, '../../skills/second-opinion/scripts/review.js');
  for (const [provider, entry] of Object.entries(entries)) {
    const file = path.join(root, 'node_modules', entry); fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `const fs=require('node:fs');let input='';process.stdin.on('data',d=>input+=d);process.stdin.on('end',()=>{` +
      `if(!input.includes('$(literal)')||process.env.CODEX_THREAD_ID||process.env.CLAUDECODE)process.exit(3);` +
      `fs.writeFileSync(process.env.MOCK_CAPTURE,JSON.stringify({args:process.argv.slice(2),cwd:process.cwd(),input}));` +
      (provider === 'codex' ? `console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'codex review'}}));` :
        `console.log(JSON.stringify({${provider === 'gemini' ? 'response' : 'result'}:'${provider} review'}));`) + `});`);
    const capture = path.join(root, `${provider}.json`);
    const env = { ...process.env, PATH: root, MOCK_CAPTURE: capture, CODEX_THREAD_ID: 'host', CLAUDECODE: 'host' };
    delete env.Path;
    const result = spawnSync(process.execPath, [script, '--provider', provider, '--prompt-file', prompt, '--cwd', root], { env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, new RegExp(`Provider: ${provider}`));
    const recorded = JSON.parse(fs.readFileSync(capture));
    assert.notEqual(recorded.cwd, root); assert(!fs.existsSync(recorded.cwd), 'review directory must be removed');
    assert(recorded.input.includes('with relevant code.'));
  }
  const env = { ...process.env, PATH: path.join(root, 'absent') }; delete env.Path;
  const missing = spawnSync(process.execPath, [script, '--prompt-file', prompt], { env, encoding: 'utf8' });
  assert.equal(missing.status, 1); assert.match(missing.stderr, /gemini CLI not installed.*no automatic fallback/);
});
