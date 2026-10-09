'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');

test('release script synchronizes Codex with the four existing version locations', t => {
  const bash = process.platform === 'win32' ? path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe') : '/bin/bash';
  assert(fs.existsSync(bash), 'Git Bash is required on Windows for release-script verification');
  const tempRoot = fs.realpathSync(os.tmpdir());
  const temp = fs.mkdtempSync(path.join(tempRoot, 'toolkit-version-'));
  t.after(() => { assert.equal(path.dirname(temp), tempRoot); fs.rmSync(temp, { recursive: true, force: true }); });
  for (const name of ['package.json', 'README.md', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json',
    '.codex-plugin/plugin.json', 'scripts/bump-version.sh']) {
    const target = path.join(temp, name); fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, name), target);
  }
  const script = path.join(temp, 'scripts/bump-version.sh').replaceAll('\\', '/');
  const result = spawnSync(bash, [script, '9.8.7'], { cwd: temp, encoding: 'utf8', windowsHide: true, timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  for (const file of ['package.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json']) {
    assert.equal(JSON.parse(fs.readFileSync(path.join(temp, file))).version, '9.8.7');
  }
  assert.equal(JSON.parse(fs.readFileSync(path.join(temp, '.claude-plugin/marketplace.json'))).plugins[0].source.ref, 'v9.8.7');
  assert.match(fs.readFileSync(path.join(temp, 'README.md'), 'utf8'), /version-9\.8\.7-blue/);
  assert(!fs.existsSync(path.join(temp, '.git')), 'release verification must not initialize or modify Git');
});
