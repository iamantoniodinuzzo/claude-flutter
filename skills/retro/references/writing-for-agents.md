# Writing for agents (condensed)

> Adapted from `mattpocock/skills` v1.3.1 — `skills/productivity/writing-for-agents/SKILL.md`
> (MIT, © 2026 Matt Pocock; full license text at the end of this file). Condensed for `retro`:
> the skill-only mechanics (frontmatter, invocation choice, router skills) are left out.

Read before proposing a change to a steering file (`AGENTS.md`, `CLAUDE.md`) or a skill. The agent reading the result has already read everything: explanation is waste, precision is the job.

## Context pointers

A **context pointer** is a reference held in context that names out-of-context material and encodes when to reach it: a skill description, or a line in `AGENTS.md` naming a doc. The pointer's *wording*, not its target, decides how reliably the material is reached. A must-have target behind a weak pointer is a variance bug: sharpen the wording first, inline the material only if that fails.

- State what the material is, then list the distinct branches that should trigger reaching it.
- Front-load the leading word. One trigger per branch: synonyms for one branch are one branch written twice.
- Cut identity the body already carries. Every word of an always-loaded pointer costs on every turn.

## The two loads

- **Context load**: always-loaded material (an `AGENTS.md` line, a skill description) costs tokens and attention whether or not it fires. Anything that applies in one session out of ten costs the other nine.
- **Cognitive load**: the human is the index of which documents exist; material with no pointer rides on it.

## Information hierarchy

Steps (ordered actions) sit in the file. Reference consulted on demand sits in the file only if every branch needs it; reference that only some branches reach goes behind a pointer (**progressive disclosure**). Keep a concept's definition, rules and caveats under one heading (**co-location**). A document simply too long thins attention across every line (**sprawl**): disclose, or split by branch.

## Completion criteria

Every step ends on a condition that tells done from not-done. A vague bound ("understanding reached") invites premature completion; a checkable, exhaustive one ("every modified model accounted for") forces the legwork. Sharpen the bound before hiding later steps.

## Leading words and negation

A **leading word** is a compact concept already in the model's pretraining (*tight*, *red*, *fog of war*), repeated as a token, never a sentence. A made-up word recruits no priors. Collapse a spelled-out triad into one. Steering by prohibition makes the forbidden behaviour more available: state the positive target; keep a prohibition only as a hard guardrail, paired with the positive.

## Pruning

- **Single source of truth**: one authoritative place per meaning. Duplication costs tokens and inflates prominence.
- The **environment** is a source of truth (`package.json` scripts, config files, `--help`). A document restating it is a cache; cache only what the agent cannot find by looking: the unwritten convention, the reason behind a choice, the gotcha no config confesses.
- **Relevance**: delete lines that never bear on the task or have gone stale. Default fate without pruning is sediment.
- **No-ops**: an instruction the model already obeys by default pays load to say nothing. Test: does it change behaviour versus the default? When a sentence fails, delete the whole sentence rather than trimming words.

## Done when

There is no automated eval: run the document by hand. Name the failure mode first (duplication, sediment, sprawl, no-op), then fix that. A trimmed document that lost behaviour was trimmed for length, not tested against the no-op question.

## License (MIT)

MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
