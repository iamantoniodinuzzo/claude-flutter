# 0012 — retro: close the positive loop (Q6 proposals and cross-session repeated instructions)

## Status

Accepted (issue #101, follow-up to map #57). Amends ADR 0007 (decision 4 and the consequence
"Q6 produces a reflection answer, not a proposal"). Leaves the caps of ADR 0006 and the routing
table of ADR 0009 unchanged.

## Context

The source blog ("Retrospect and Evolve") ends on a cycle: reflection → building block (prompt →
slash command, workflow → skill, domain expertise → subagent, project pattern → `CLAUDE.md`).
ADR 0006, 0007 and 0009 absorbed its four questions, but two gaps remain on the way from
reflection to building block:

1. **Q6 cannot propose.** ADR 0007 made Q6 a pure reflection with no `session-evidence.js`
   extractor, so a pattern that worked is named and then dropped. The positive half of the cycle
   never closes.
2. **"Repeated instruction → slash command" has no evidence.** The `automation` category
   (ADR 0006) lists it, but Passo 0 never counted user messages, which breaks the map's rule:
   no proposal without a verifiable event.

Two facts found while implementing shaped the design:

- A skill invoked twice is already standardized, by definition. Proposing to standardize it is
  empty; what can be standardized is *how it is invoked* (same `args` every time → a slash command).
- An instruction repeated **within one session** usually means the agent ignored the first request.
  That is friction (Q5), not a habit worth automating. The blog's signal is the same instruction
  written in **different sessions**.

## Decision

**1. Q6 may produce at most one proposal, only with evidence.** Tag `[automation]` or
`[knowledge]`, marker `(da Q6)`. Without evidence Q6 stays a reflection.

**2. Evidence for a Q6 proposal** is either a `Skill` call with identical non-empty `args` at least
`SKILL_ARGS_REPEAT_MIN` times without errors in the new `standardizzazione:` block, or the same
pattern already present in `MEMORY.md`. The proposal concerns how the skill is invoked
(→ slash command), never the skill itself.

**3. Severity and cap.** Level *strutturale* (an `automation` without a measured cost already is,
ADR 0009), competing inside the single cap of 3. A displaced proposal goes to `No action` with the
reason, so it stays visible. No new category, no extra slot.

**4. Routing map in the `automation` category**: repeated instruction or identical-args skill →
slash command · repeated workflow → skill · recurring domain expertise → subagent · project
convention → `[knowledge]` toward the project config. Only the first has a counter; the others need
a `MEMORY.md` entry plus a session event. The destination table of ADR 0009 is unchanged.

**5. `repeated user instructions:` is cross-session.** The new `standardizzazione:` block compares
the human-typed messages of the current session with those of the newest `USER_REPEAT_SESSIONS`
previous sessions of the **same project directory** (exact directory: it reads user text, so
sibling and other projects are never read, unlike the candidate listing of ADR 0011). Two messages
are the same instruction when their token-set Jaccard similarity reaches `USER_REPEAT_JACCARD`
within `USER_REPEAT_MIN_WORDS`..`USER_REPEAT_MAX_WORDS` words. Proof for a slash command needs at
least `USER_REPEAT_MIN_SESSIONS` distinct sessions, the current one included. A repeat inside the
current session is printed on its own line (`ripetute in sessione:`) as Q5 evidence and never as a
slash-command proof.

**6. What counts as the user's text.** `origin` absent or `human`, not `isMeta`, not a sidechain,
no `tool_result` block, no `<local-command` / `<task-notification` wrapper; `<system-reminder>` and
`<pasted_content>` blocks are stripped; for a slash command only `<command-args>` is the user's own
text. Peer-session and task-notification records are excluded.

**7. Honesty rules carry over from ADR 0011.** Codex, or a project directory with no previous
transcript, prints `non valutato`, never `0`. A previous transcript that is unreadable or over
`USER_REPEAT_MAX_BYTES` is declared partial in the block. The block has its own cap
(`STANDARDIZE_LINE_CAP`), sits outside `OUTPUT_LINE_CAP`, and is absent under `--config-audit`, whose
output stays byte-for-byte as ADR 0008 requires.

**8. "Which prompts were effective?" stays dropped** (ADR 0007 decision 1): it draws on the same
evidence as Q6 and would pay context twice for one answer.

## Consequences

- `skills/retro/scripts/standardize-lens.js` is new; `session-evidence.js` only wires it in (collects
  the human messages of the current session and prints the block). Thresholds are named constants
  there and cited by name in `SKILL.md`; `skill-structure.test.js` checks they exist.
- Passo 0 reads more than the current transcript for the first time: up to `USER_REPEAT_SESSIONS`
  previous transcripts of the same directory, prefiltered line by line. Cost grows with transcript
  size, bounded by `USER_REPEAT_MAX_BYTES`.
- Slash commands the user typed are `<command-name>` messages, not `Skill` tool_use blocks, so they
  are not in `skill invocations:`. Their typed arguments still enter the instruction comparison.
- Text similarity can mis-group two different instructions with similar wording. The block prints
  an 80-character excerpt and the ids of the previous sessions so the claim is checkable, and the
  skill treats a doubtful line as doubtful (environment-lens rule), not as proof.
- `tune-setup` is unaffected. Its own skill-invocation counter stays under `--config-audit`.
- Version bump follows the release flow after merge (`scripts/bump-version.sh`).
