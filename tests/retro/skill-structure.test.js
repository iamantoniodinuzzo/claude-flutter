// Structural checks for skills/retro/SKILL.md and its references (ticket "Come verificare che la
// skill retro si comporti come descritta", #93). No LLM judge: only properties that can drift
// silently — section order, reference wiring, and constants/labels cited by name that must exist
// in the scripts. Behaviour of the written report is covered by BEHAVIOR_CHECKLIST.md.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.resolve(__dirname, '..', '..', 'skills', 'retro');
const read = (...p) => fs.readFileSync(path.join(SKILL_DIR, ...p), 'utf8');
const skill = read('SKILL.md');
const scriptsSrc = fs
  .readdirSync(path.join(SKILL_DIR, 'scripts'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => read('scripts', f))
  .join('\n');

const idx = (text, needle) => {
  const i = text.indexOf(needle);
  assert(i >= 0, `missing in SKILL.md: ${needle}`);
  return i;
};

test('SKILL.md sections appear in the decided order', () => {
  const order = [
    '## Runtime and resources',
    '## Quando lanciarla',
    '## Compatibilita della sessione',
    '## Passo 0',
    '## Le sei domande',
    '## Ambiente',
    '## Ship handoff',
    '## Persistenza',
    '## Report finale',
    '## Anti-patterns',
  ];
  const positions = order.map((h) => idx(skill, h));
  assert.deepStrictEqual([...positions].sort((a, b) => a - b), positions, 'sections out of order');
});

test('Passo 0 documents diff:, ambiente: and the attribution line; questions stay six', () => {
  const passo0 = skill.slice(idx(skill, '## Passo 0'), idx(skill, '## Le sei domande'));
  for (const label of ['`diff:`', '`ambiente:`', '`attribuiti ad ambiente: N`', '`rifiuti:`']) {
    assert(passo0.includes(label), `Passo 0 does not mention ${label}`);
  }
  const questions = skill.slice(idx(skill, '## Le sei domande'), idx(skill, '## Ambiente'));
  assert.strictEqual((questions.match(/^\d\. \*\*/gm) || []).length, 6);
});

test('Ambiente block points to the lens reference, states the invariant and the four levels', () => {
  const block = skill.slice(idx(skill, '## Ambiente'), idx(skill, '## Ship handoff'));
  assert(block.includes('references/environment-lens.md'));
  assert(/non legge mai un file di configurazione/.test(block));
  for (const level of ['bloccante', 'costoso', 'attrito', 'strutturale']) {
    assert(new RegExp(`\\| ${level} \\|`).test(block), `severity level missing: ${level}`);
  }
});

test('writing reference is pointed to between Persistenza and Report finale', () => {
  const pointer = idx(skill, 'references/writing-for-agents.md');
  assert(pointer > idx(skill, '## Persistenza') && pointer < idx(skill, '## Report finale'));
});

test('every file in references/ exists and is called from SKILL.md', () => {
  const files = fs.readdirSync(path.join(SKILL_DIR, 'references'));
  assert(files.length >= 2);
  for (const f of files) assert(skill.includes(`references/${f}`), `references/${f} is not called from SKILL.md`);
});

test('every constant cited by name in environment-lens.md exists in the scripts, and no value is repeated', () => {
  const lens = read('references', 'environment-lens.md');
  const names = [...lens.matchAll(/`([A-Z][A-Z0-9_]{3,})`/g)].map((m) => m[1]);
  assert(names.length >= 5, 'expected the lens to cite its constants by name');
  for (const n of new Set(names)) {
    assert(new RegExp(`\\bconst ${n}\\b`).test(scriptsSrc), `constant ${n} not defined in scripts/`);
  }
  assert(!/\b(?:20000|25000)\b/.test(lens), 'threshold values must not be duplicated in the lens');
});

test('labels and states cited in SKILL.md are emitted by the scripts', () => {
  for (const state of ['ATTRIBUITO', 'PARZIALE', 'NON ATTRIBUIBILE', 'NESSUNA MODIFICA', 'NON RICAVABILE']) {
    assert(skill.includes(state), `SKILL.md does not describe ${state}`);
    assert(scriptsSrc.includes(state), `scripts do not emit ${state}`);
  }
  for (const label of ['attribuiti ad ambiente', 'ambiente: nessun segnale', 'non valutato su Codex', 'rifiuti:']) {
    assert(scriptsSrc.includes(label), `scripts do not emit "${label}"`);
  }
});

test('the writing reference carries attribution, a 40-60 line body and the MIT text', () => {
  const ref = read('references', 'writing-for-agents.md');
  assert(/^> Adapted from /m.test(ref.split('\n').slice(0, 4).join('\n')));
  assert(ref.includes('Copyright (c) 2026 Matt Pocock'));
  assert(ref.includes('THE SOFTWARE IS PROVIDED "AS IS"'));
  const body = ref.slice(0, ref.indexOf('## License (MIT)')).trimEnd().split('\n');
  assert(body.length >= 40 && body.length <= 60, `condensed body is ${body.length} lines`);
});

test('tune-setup carries the boundary and the transient-denial rule', () => {
  const tune = fs.readFileSync(path.resolve(SKILL_DIR, '..', 'tune-setup', 'SKILL.md'), 'utf8');
  assert(tune.includes('evento contro file'));
  assert(tune.includes('automode-unavailable'));
});

test('retro description and Codex short_description mention the environment lens', () => {
  assert(/environment signals/.test(skill.split('\n')[2]));
  const meta = read('agents', 'openai.yaml');
  assert(/short_description: ".*environment.*"/.test(meta));
  assert(meta.includes('default_prompt: "Use $retro to handle the requested retro task."'));
});
