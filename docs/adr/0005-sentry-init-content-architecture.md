# 0005 — sentry-init content architecture: lesson-to-file mapping and the frontmatter description fix

## Status

Accepted (wayfinder ticket #55, map #47)

## Context

`skills/sentry-init/` is mid-refresh against Andrea Bizzotto's *Flutter in Production* error-monitoring
module (15 lessons). Four prior tickets in this map resolved individual technical questions and recorded
them as ADRs 0001–0004: DSN/environment source, error-capture architecture, `beforeSend` policy, and
sampling defaults. What remained unanswered was structural: given those four resolutions, which lesson
clusters become new or rewritten `references/*.md` files, which stay `SKILL.md` phases, and which are
closing-checklist items only with no dedicated home. Separately, `sentry-init`'s frontmatter `description`
is the only one in the repo with no "Use when…" trigger-phrase clause — every other skill's description
ends with one, confirmed by grepping every `skills/*/SKILL.md` description in this repo.

This is the fifth and last decision ticket in map #47. Its deliverable is the content map and a drafted
description, not the rewrite itself — consistent with #51–#54, which recorded decisions as ADRs without
touching `skills/sentry-init/`.

### All 15 lessons, read and mapped

Lesson numbers below match the course's own URL slugs (confirmed from each lesson's
Previous-Lesson/Complete-and-Continue links), not an assumed reading order.

| # | Lesson | Destination |
|---|--------|-------------|
| 1 | Intro to Error Monitoring | Nothing — motivational framing, no agent-actionable content. |
| 2 | Sentry vs Crashlytics: A Comparison | Nothing — already out of scope per #47 ("a decision aid for choosing a vendor, not bootstrap behaviour"). |
| 3 | Sentry Setup: Basics | Account/project creation → one Phase 0 prerequisite line (this skill does not create Sentry-side resources). Install command → already in Phase 1. Deliberate-exception smoke test → Phase 7, rewritten per ADR 0003. |
| 4 | Sentry Setup: Environments and Flavors | DSN source → Phase 0.5, resolved by ADR 0001, which itself flagged an open consequence never applied: "the skill's Phase 0.5 must say why in-line." `options.environment` → Phase 2's dead placeholder (`SKILL.md:159`, literally `'<flavor-name>'`) still needs the real per-flavor expression ADR 0001 called for. |
| 5 | Alternative Sentry Initialization Flows | `references/initialization-flow.md` — already covers this accurately in the skill's own words; no rewrite needed. |
| 6 | Case Study: Capturing Exceptions Explicitly | `references/logger-decorator-pattern.md` → **rename to `error-capture-architecture.md`**, exactly as ADR 0002 already specified ("both need rewriting alongside the rename to `error-capture-architecture.md`"). Full rewrite: Branch A/B unification, `AsyncErrorLogger` rewritten to Riverpod v3's `providerDidFail`/`ProviderObserverContext`, the swallow-vs-propagate rule, and ADR 0003's `DioException`-with-null-response call-site filter. The single largest content rewrite in the build ticket — already fully spec'd by two prior ADRs, this ticket just confirms the file boundary. |
| 7 | Sentry: Dashboard Overview and Issue Resolution Workflow | Phase 7 checklist bullet only — pure product UI tour (filters, sorting, search, archive/resolve workflow). Nothing here is agent-automatable; a dedicated reference file would just restate Sentry's own docs. |
| 8 | How to Collect User Feedback with Sentry | `references/web-feedback-canvaskit.md` — accurate as-is. One addition: a cross-reference to ADR 0003's `beforeSendFeedback` passthrough, so the reader understands why feedback submissions aren't silenced by the debug-mode gate. |
| 9 | Sentry: Additional Options and APIs | **Splits.** Nav observer + Dio breadcrumbs stay in `gorouter-and-dio-wiring.md` — still accurate; the filename never promised "event filtering," only its current H1 does. `beforeSend`/`beforeSendFeedback` policy (ADR 0003), `considerInAppFramesByDefault`, and the screenshot/view-hierarchy GDPR-PII guidance move to a new file (below). This lesson is the biggest single content well in the course and currently the thinnest home in the skill — `considerInAppFramesByDefault` and the screenshot/PII reasoning exist today only as terse inline code comments in `SKILL.md`, with no prose explanation anywhere. |
| 10 | Error Monitoring Basics, Source Maps, and dSYMs | Conceptual grounding (why release stack traces are unreadable, what source maps/dSYMs are) — largely superseded by #50's terminology fix and `references/release-uploads.md`'s existing content. No new file; at most a short "why" preamble if the build ticket's review of `release-uploads.md` finds it missing. |
| 11 | How to Upload Source Maps and Debug Symbols | `references/release-uploads.md` — already comprehensive (build commands, CI snippets, secrets, known limitation); no change needed. |
| 12 | Sentry Setup Checklist | No new file — Phase 0 through Phase 7 already *is* this skill's agent-driven version of this checklist. **Caveat to record**: this lesson's DSN step uses one root `.env` file (not per-flavor), a third variant inconsistent with lesson 4's `.env.dev`/`.env.stg`/`.env.prod`. Do not import it — ADR 0001 already settled the DSN question in `dart_defines.json`'s favor, and the course is internally inconsistent between lessons 4 and 12 on this point. |
| 13 | How to Minimize Your Sentry Bill | New file (below) — ADR 0004's escalation ladder and the opt-in trace/profile table. |
| 14 | Crashlytics Integration | Out of scope per #47 ("mutually exclusive with Sentry in a single app... Candidate future `crashlytics-init` skill, not this effort"). |
| 15 | Error Monitoring: Wrap Up | Nothing — pure recap and module transition, no content of its own. |

### The new reference file

Lessons 9 and 13 together carry three ADRs' worth of policy — `beforeSend`/`beforeSendFeedback` (ADR
0003), `sampleRate` and `tracesSampleRate`/`profilesSampleRate` (ADR 0004) — that has no coherent home
today. Cramming it into `gorouter-and-dio-wiring.md` would misname a file that is otherwise accurately
scoped to navigation and HTTP breadcrumbs alone. A new **`references/event-filtering-and-sampling.md`**
becomes the single home for:

- The `beforeSend`/`beforeSendFeedback` template and the `SENTRY_DEBUG_REPORTING` smoke-test dart-define
  (ADR 0003).
- The quota escalation ladder and `sampleRate`-as-last-resort guidance (ADR 0004).
- The opt-in `tracesSampleRate`/`profilesSampleRate` table with the corrected relative-rate arithmetic
  (ADR 0004).
- `considerInAppFramesByDefault` and the screenshot/view-hierarchy GDPR-PII reasoning (lesson 9), which
  currently has no prose home anywhere in the skill.

### Frontmatter description

`sentry-init`'s current description:

> "Bootstrap sentry_flutter in a Flutter+Riverpod+GoRouter project — installs deps, wires
> `SentryFlutter.init` (Approach 3), GoRouter observer, Riverpod error capture (**LoggerService decorator
> if present, else standalone ProviderObserver**), web BetterFeedback gated by CanvasKit renderer, and
> emits release upload checklist (source maps + dSYM)."

Two problems, not just the one the issue named. First, no "Use when…" clause — confirmed the only skill in
the repo missing one. Second, and not mentioned in the issue text: the Branch B description is now
factually stale against ADR 0002. Branch B no longer installs a standalone Sentry-only `ProviderObserver`
— ADR 0002 replaced it with a scaffolded `ErrorLogger` (the course's shape) behind the same
`AsyncErrorLogger` observer both branches share. Fixing only the trigger clause and leaving this sentence
intact would ship a description that's newly wrong in a different way.

Drafted replacement, matching repo convention (English trigger phrases, consistent with #47 Notes'
"English body prose" choice for this skill) and other skills' phrasing style:

```yaml
description: Bootstrap sentry_flutter in a Flutter+Riverpod+GoRouter project — installs deps, wires
  SentryFlutter.init (Approach 3), GoRouter observer, Riverpod error capture (LoggerService decorator if
  present, else a scaffolded ErrorLogger sink), web BetterFeedback gated by CanvasKit renderer,
  beforeSend/sampling policy, and a release upload checklist (source maps + dSYM). Use when the user says
  "add Sentry to this app", "set up error monitoring", "bootstrap sentry-init", "integrate crash
  reporting", or asks to wire up Sentry for a Flutter/Riverpod/GoRouter project.
```

## Decision

**1. Lesson→destination map** exactly as tabulated above. In file terms: rename
`logger-decorator-pattern.md` → `error-capture-architecture.md` with a full rewrite (lesson 6, ADRs
0002+0003); create `references/event-filtering-and-sampling.md` (lessons 9+13, ADRs 0003+0004); leave
`initialization-flow.md`, `web-feedback-canvaskit.md` (plus one small cross-reference), and
`release-uploads.md` unchanged; absorb everything else into existing `SKILL.md` phases or Phase 7 checklist
bullets. No new phases, no reference files beyond the one new one.

**2. Frontmatter description** — the drafted text above, fixing the missing trigger clause and the stale
Branch B wording in a single edit.

Both are drafts for the build ticket to apply. This ticket does not touch `skills/sentry-init/`.

## Consequences

- This closes map #47's last decision ticket. `#47`'s *Not yet specified* section can now name a concrete
  slicing for the build ticket instead of an open question: (a) Phase 0/2 fixes — DSN rationale line,
  `options.environment` placeholder, opt-in sampling restructure; (b) the `error-capture-architecture.md`
  rename+rewrite (Phase 4); (c) the new `event-filtering-and-sampling.md` plus the Phase 7 smoke-test
  rewrite; (d) the frontmatter description; (e) Phase 7 checklist additions (dashboard pointer,
  account-prerequisite line). These likely land as one build PR rather than five, since they touch
  overlapping files — that grouping call belongs to the build ticket, not this ADR.
- Surfaces two consequences from ADR 0001 and ADR 0002 that were recorded but never applied (the dead
  `options.environment` placeholder; the `error-capture-architecture.md` rename) so the build ticket
  doesn't have to re-derive them by re-reading four separate ADRs.
- `#47`'s existing *Ship ticket* bullet already anticipates the README/`ARCHITECTURE.md` key-skills row
  fix for the Branch A/B wording; this ADR's drafted description is the same fix applied to the frontmatter
  itself, so both should land together in the build ticket for consistency.
- The lesson-12 caveat (single root `.env`, inconsistent with lesson 4) is recorded here so a future
  contributor rereading the course doesn't reopen ADR 0001's already-settled question.
