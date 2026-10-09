#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const PROVIDERS = new Set(['gemini', 'codex', 'claude']);
const NPM_ENTRY = { gemini: '@google/gemini-cli/dist/index.js',
  codex: '@openai/codex/bin/codex.js', claude: '@anthropic-ai/claude-code/cli.js' };

function executable(provider, env = process.env) {
  for (const dir of (env.PATH || env.Path || '').split(path.delimiter).filter(Boolean)) {
    const native = path.join(dir, provider + (process.platform === 'win32' ? '.exe' : ''));
    try { fs.accessSync(native, fs.constants.X_OK); if (fs.statSync(native).isFile()) return [native, []]; } catch { /* Next launcher. */ }
    // npm Windows launchers need a shell; invoke their JS entrypoints directly instead.
    const js = path.join(dir, 'node_modules', NPM_ENTRY[provider]);
    if (fs.existsSync(js)) return [process.execPath, [js]];
  }
  return null;
}

function parseArgs(argv) {
  const options = { provider: 'gemini', cwd: process.cwd(), timeoutSeconds: 180 };
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    if (name === '--list') { options.list = true; continue; }
    const key = { '--provider': 'provider', '--prompt-file': 'promptFile', '--cwd': 'cwd',
      '--timeout-seconds': 'timeoutSeconds' }[name];
    if (!key || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Unknown option or missing value: ${name}`);
    options[key] = argv[++i];
  }
  if (!PROVIDERS.has(options.provider)) throw new Error('--provider must be gemini, codex, or claude');
  options.timeoutSeconds = Number(options.timeoutSeconds);
  if (!Number.isFinite(options.timeoutSeconds) || options.timeoutSeconds <= 0) throw new Error('--timeout-seconds must be positive');
  if (!options.list && !options.promptFile) throw new Error('--prompt-file is required');
  return options;
}

function invocation(provider, temp) {
  if (provider === 'codex') return {
    args: ['exec', '--sandbox', 'read-only', '--ignore-user-config', '--skip-git-repo-check', '--ephemeral', '--json', '-'], env: {} };
  if (provider === 'claude') return {
    args: ['--print', '--output-format', 'json', '--tools', '', '--permission-mode', 'plan',
      '--disable-slash-commands', '--no-session-persistence', '--setting-sources', '',
      '--settings', '{"disableAllHooks":true}', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}'], env: {} };
  const policy = path.join(temp, 'deny-tools.toml');
  fs.writeFileSync(policy, '[[rule]]\ntoolName = "*"\ndecision = "deny"\npriority = 999\n\n[[rule]]\ntoolName = "*"\nmcpName = "*"\ndecision = "deny"\npriority = 999\n');
  const settings = path.join(temp, 'gemini-system.json');
  fs.writeFileSync(settings, JSON.stringify({ tools: { core: [] }, mcp: { allowed: [] },
    hooksConfig: { enabled: false }, skills: { enabled: false }, policyPaths: [policy] }));
  return { args: ['--prompt', 'Review the supplied stdin context only. Return advice; do not execute a plan.',
    '--approval-mode', 'default', '--output-format', 'json'], env: { GEMINI_CLI_SYSTEM_SETTINGS_PATH: settings } };
}

function finalText(provider, stdout) {
  if (provider === 'codex') {
    const events = stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    if (events.some(e => e.type === 'error' || e.type === 'turn.failed')) throw new Error('Codex returned an error event');
    return events.filter(e => e.type === 'item.completed' && e.item?.type === 'agent_message')
      .map(e => e.item.text).join('\n');
  }
  const result = JSON.parse(stdout);
  if (result.is_error || result.error) throw new Error(`${provider} returned an error response`);
  return provider === 'gemini' ? result.response : result.result;
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: options.env,
      windowsHide: true, shell: false, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', failure;
    const stop = error => {
      if (failure) return;
      failure = error;
      if (!child.pid) return;
      if (process.platform === 'win32') spawnSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe'),
        ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
      else { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
    };
    const timer = setTimeout(() => stop(new Error('Provider timed out; no fallback provider was used')), options.timeoutSeconds * 1000);
    child.stdout.on('data', data => { stdout += data; if (stdout.length > 2_000_000) stop(new Error('Provider output exceeded 2 MB')); });
    child.stderr.on('data', data => { stderr = (stderr + data).slice(-4000); });
    child.stdin.on('error', error => { if (error.code !== 'EPIPE') stop(error); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(`Provider exited with code ${code}: ${stderr.trim()}`));
      else resolve(stdout);
    });
    child.stdin.end(options.prompt);
  });
}

async function main(argv) {
  const options = parseArgs(argv);
  if (options.list) {
    for (const provider of PROVIDERS) console.log(`${provider}: ${executable(provider) ? 'available' : 'not installed'}`);
    return;
  }
  const launcher = executable(options.provider);
  if (!launcher) throw new Error(`${options.provider} CLI not installed. Ask which available provider to use; no automatic fallback.`);
  const cwd = fs.realpathSync(options.cwd);
  const context = fs.readFileSync(path.resolve(options.promptFile), 'utf8');
  if (!context.trim()) throw new Error('Prompt file is empty');
  const tempRoot = fs.realpathSync(os.tmpdir());
  const temp = fs.mkdtempSync(path.join(tempRoot, 'flutter-second-opinion-'));
  try {
    const config = invocation(options.provider, temp);
    const env = { ...process.env, ...config.env };
    for (const key of ['CLAUDECODE', 'CLAUDE_CODE_SESSION_ID', 'CODEX_THREAD_ID']) delete env[key];
    const prompt = `You are providing an independent second opinion. Review only the supplied context from ${cwd}.\n` +
      'Do not invoke skills, delegate, execute commands, edit files, or implement proposals. Cite uncertainty and missing context.\n\n' + context;
    const stdout = await run(launcher[0], [...launcher[1], ...config.args], { ...options, cwd: temp, env, prompt });
    const review = finalText(options.provider, stdout);
    if (typeof review !== 'string' || !review.trim()) throw new Error('Provider returned no review');
    console.log(`Provider: ${options.provider}\nContext: supplied prompt only; isolated review session\n\n${review.trim()}`);
  } finally {
    if (path.dirname(path.resolve(temp)) !== tempRoot) throw new Error('Temporary directory escaped its root');
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

module.exports = { parseArgs, executable, invocation, finalText, run, main };
if (require.main === module) main(process.argv.slice(2)).catch(error => {
  console.error(`second-opinion: ${error.message}`);
  process.exitCode = 1;
});
