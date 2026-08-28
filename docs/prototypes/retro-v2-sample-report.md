<!--
PROTOTYPE — throwaway artifact for wayfinder ticket #65 (map #57).
Not a real skill output. Hand-drafted to react to the report's shape and cost,
applying ADR 0006 (split), ADR 0007 (question set), ADR 0008 (audit surface),
ADR 0009 (routing/caps). Source data: this session's own transcript
(1af9495a-84d9-4479-bc36-3a5c42ca34ba.jsonl), issues #58–#64 of map #57.
-->

# retro — self-audit di fine task

## Passo 0 — evidenze raccolte

```
transcript: ~/.claude/projects/C--Users-Tonyd-Desktop-Progetti-claude-flutter/1af9495a-....jsonl
session: 1af9495a-84d9-4479-bc36-3a5c42ca34ba  window: 2026-08-28T18:57Z .. 2026-08-28T20:51Z  events: 1108

tool errors: 1
  Bash x1 — Exit code 2

repeated bash commands: 3
  x5 cd ".../claude-flutter" && git finish -y --json
  x3 cd ".../claude-flutter" && gh issue view 57 --json body -q .bo…
  x2 cd ".../claude-flutter" && git status --porcelain && git branc…

files edited >2x: 1
  x3 skills/retro/scripts/session-evidence.js
```

## 1. Least confident

Two things, ranked:

1. **The `tune-setup` cap default (5)** — ADR 0009 picked 5 as "one per audited surface,
   tunable by #66," but no real `tune-setup` audit has ever run. Verified now, cheaply: the
   config-surface measurement from ADR 0006 (~4,160 tokens across CLAUDE.md/settings/agents)
   plus this session's own hook-repetition finding (below) already produces at least 2
   proposal-shaped findings from *this single project* — the number holds up as a plausible
   default, not a wild guess, but it's still unverified against a real multi-finding run.
2. **Whether "What worked well" (Q6) will reliably find something** in a session with less
   structure than this one (a wayfinder map is unusually rich in skill invocations to point
   at). Not verified — would need a messier, more ad-hoc session to test against.

## 2. What the user is missing

The biggest structural gap: **`tune-setup` doesn't exist yet.** Every decision in ADR
0006–0009 describes a skill that is currently zero files. If this session ended here without
#66, the only artifact anyone could actually run is `retro`'s existing five questions — Q6 and
the entire config-audit capability are decisions on paper, not behavior. That's expected at
this point in the map (T8 comes before T9/build), but it's worth being explicit that "retro v2
is decided" and "retro v2 exists" are two different sentences today.

## 3. Most likely 3-month failure

**Primary**: the opt-in `--config-audit` flag on `session-evidence.js` (ADR 0008) never gets
wired correctly to `tune-setup`, and someone later "fixes" `retro`'s slow/noisy Passo 0 output
by accidentally passing the flag on `retro`'s own call site — silently blowing through
`OUTPUT_LINE_CAP`'s entire reason for existing. Cheapest mitigation: a single assertion or
comment at `retro`'s call site making the omission impossible to miss in review.
**Runner-up**: `tune-setup`'s skill-trigger-miss check (ADR 0008 decision 6) becomes a source
of false positives — the model asserting a skill "should have fired" based on a superficial
description match, without the discipline the ADR asked for (citing the exact turn + exact
description text). Mitigation: #66 should bake a worked example of a *correct* trigger-miss
citation into the skill file itself, not just describe the rule abstractly.

## 4. Unstated assumptions

- Assumed the target audience for `tune-setup`'s cross-repo issue destination has `gh`
  authenticated against `iamantoniodinuzzo/claude-flutter` specifically (not just their own
  target-project remote) — never verified, never asked.
- Assumed "5" is a reasonable `tune-setup` cap without running a real audit to check it against
  — flagged above in Q1, repeated here because it's also a silent design choice.
- Assumed every ADR in this map should live in `docs/adr/` with sequential numbering — followed
  the existing convention (0001–0005 from map #47) without confirming it's meant to be shared
  across unrelated maps rather than per-effort.

## 5. Smoother session

Two genuinely repeated commands from Passo 0, and one edited-file repeat — checked against
what they actually mean before calling them friction:

- `git finish -y --json` ×5 — **not friction**. Five separate tickets (#58, #61, #62, #63,
  #64), each legitimately merged once. Passo 0's raw count can't tell the difference between
  "retried because it failed" and "ran five times because there were five things to finish" —
  a human (or a smarter Q5) has to make that call, which this answer is doing explicitly rather
  than reporting a number that looks worse than it is.
- `gh issue view 57 --json body -q .body` ×3 — **mild, real friction**. Fetched the map's full
  body fresh before every edit to avoid clobbering a concurrent change, three separate times.
  Legitimate defensively, but a small helper (`gh issue edit 57 --body-file <(cat header) `-
  style diffing, or just tracking the last-written body locally) would have saved three round
  trips for no loss of safety.
- `skills/retro/scripts/session-evidence.js` edited ×3 — **not friction**. Three sequential
  edits to the same file for one coherent fix (#61: `slugForCwd`, `findLatestTranscript`,
  `main()`, plus a header comment) — normal incremental editing of one function-at-a-time
  change, not rework.

## 6. What worked well

**Loading `git-workflow` once, then reusing it from memory across four subsequent tickets
without re-invoking it.** The `Skill` tool was called for `git-workflow` exactly once this
session (issue #58's branch); for #61, #62, #63, #64 the same `git start` / `git c` / `git
finish` sequence ran directly via Bash, correctly, without paying to reload the skill's
instructions each time. Contrast with `grilling`, invoked fresh all four times it was used
(#58, #62, #63, #64) — correctly, since each was a genuinely new interactive decision, not a
reference lookup. The pattern worth standardizing: a *reference* skill (conventions, aliases,
mechanical steps) is worth loading once per session and reusing from context; an *interactive*
skill (grilling, a live decision) earns its cost every time because its output is never the
same twice.

## Ship handoff

Working tree clean, `develop` up to date, all five tickets merged (`git log --oneline -5` shows
`cc77359`, `52c1f81`, `5508298`, `9c20e98`, `d98c663`). Nothing to hand off here.

## Persistenza

**Applied**
1. [knowledge] Reference-skill-once-vs-interactive-skill-every-time pattern → candidate for a
   `feedback` memory entry in this project (not yet written — this is a prototype, not a real
   run).

**Proposed — aspetto il tuo ok**
2. [friction] Three `gh issue view 57` re-fetches before each map edit → automation spec: a
   tiny local-cache helper, or accept the cost as the safety trade-off it is.

**No action**
3. `git finish` ×5 and the 3× file edit — already explained above as not friction; no proposal.

---

**Line count of this report: ~95 lines / ~950 words.** For comparison, `retro`'s current
five-question report on a similarly-sized session runs to roughly 60–70 lines — Q6 adds
one section (~15 lines here), well inside a session's context budget and nowhere near
`OUTPUT_LINE_CAP`'s 40-line *evidence* budget (Passo 0's own output, not the report itself,
which was never capped at 40 — only its raw evidence dump is). The six-section shape reads
cleanly; Q6 sits naturally after Q5 without needing a transition.
