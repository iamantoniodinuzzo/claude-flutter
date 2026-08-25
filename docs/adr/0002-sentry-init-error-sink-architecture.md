# 0002 — sentry-init routes every error-capture channel through one injectable sink

## Status

Accepted (wayfinder ticket #52, map #47)

## Context

`skills/sentry-init/SKILL.md` Phase 4 branches on whether the target project already has a
`LoggerService` abstraction: Branch A wraps it in a `SentryLoggerService` decorator so all ~30-50+
existing call sites gain Sentry coverage for free; Branch B, when no `LoggerService` exists, installs a
standalone `SentryProviderObserver` that calls `Sentry.captureException` directly on `AsyncError` state.

Andrea Bizzotto's *Flutter in Production* course (source for this skill's refresh) teaches a third shape:
an injectable `ErrorLogger` class behind `@Riverpod(keepAlive: true)`, called explicitly from `catch`
blocks — never auto-capturing via an observer — specifically so it is overridable in tests
(`errorLoggerProvider.overrideWithValue(...)`) and so expected errors (the course's case study:
`DioException` with a null `response` and a non-empty local DB) can be filtered at the call site instead
of reaching Sentry as noise.

On the surface this reads as three competing architectures. It is not: `LoggerService` decorator and
`ErrorLogger` are both **sinks** — something a caller hands an error to. `ProviderObserver` is a
**channel** — a place errors arrive from, specifically provider failures Riverpod has already caught into
`AsyncValue.error`. `FlutterError.onError`, `PlatformDispatcher.instance.onError`, and swallowed `catch`
blocks are the other three channels. All four channels exist regardless of which sink a project has.
Branch B's actual defect is collapsing channel and sink into one Sentry-only object, which is exactly
what destroys the testability and call-site filtering the course's `ErrorLogger` exists to provide.

This is not an isolated decision. A repo-wide cross-reference scan (done alongside this ticket) found
`AsyncErrorLogger` — the `ProviderObserver` class Branch A already emits — referenced as an
assumed-existing project class in five files outside `skills/sentry-init/`: `ai_docs/FLUTTER_RULES.md:48`,
`skills/scaffold-feature/SKILL.md:128`, `skills/scaffold-feature/references/logging.md:39-58`,
`skills/audit-application-layer/SKILL.md:95`, and `skills/audit-application-layer/rules/CATALOG.md:34`
(rule APP-NOTIF-02, severity `error`: "never log inside async providers — `AsyncErrorLogger` handles
it"). `sentry-init` is the *only* place in the toolkit that defines this class. Branch B replacing it
with a Sentry-only `SentryProviderObserver` would silently invalidate the premise of a standing,
error-severity audit rule for every project that reaches Branch B.

Separately, all three observer code samples in the skill (`SKILL.md:371-383`, `SKILL.md:407-417`,
`references/logger-decorator-pattern.md:76-91`) are Riverpod v2 shape and do not compile against the
v3 this toolkit targets: v3 replaced the `ProviderBase`/`ProviderContainer` parameter pair with a single
`ProviderObserverContext`, and replaced the `didUpdateProvider` + `AsyncError` pattern-match with a
purpose-built `providerDidFail(context, error, stackTrace)` hook. Verified against current Riverpod docs
via context7 (`/rrousselgit/riverpod`).

## Decision

**One injectable error sink per project, resolved from the provider container. Every capture channel
routes through it. Nothing calls `Sentry.captureException` directly except where DI genuinely cannot
reach (the two global hooks, only when no `ProviderContainer` exists before `runApp`).**

The sink's *identity* stays branch-dependent; every channel wired downstream of it is not:

- `HAS_LOGGER_SERVICE=true` → sink is `loggerServiceProvider`, wrapped by `SentryLoggerService`
  (Branch A survives unchanged in substance — its 30-50+ call-site argument still holds, and its
  `t/d/i/w/e/f` vocabulary already matches `FLUTTER_RULES.md:46`).
- `HAS_LOGGER_SERVICE=false` → Branch B scaffolds an `ErrorLogger` (the course's shape) instead of a
  Sentry-only observer. The standalone `SentryProviderObserver` is removed from the skill.

Both branches emit the same `AsyncErrorLogger` `ProviderObserver` — rewritten to Riverpod v3's
`providerDidFail`, guarding on `error is ProviderException` (avoids double-reporting a root failure once
per dependent provider — a rule the toolkit already documents in
`skills/scaffold-feature/references/breaking/riverpod-core.md:43-47` but `sentry-init` was not following)
and on `context.provider == SINK_PROVIDER` (avoids recursing through the sink's own failure) — and
resolving the sink via `context.container.read(SINK_PROVIDER)` rather than a hand-constructed instance,
so `overrideWithValue(FakeLoggerService())` in tests actually takes effect.

Explicit `SINK_PROVIDER` capture at a `catch` block is reserved for the swallow case only: a `catch` that
returns/falls back without rethrowing and without setting `AsyncError` state never reaches the observer,
so it is the only place a manual call belongs. A `catch` that rethrows or lets state become `AsyncError`
must not also log — the observer already will, and doing both is exactly the double-report
APP-NOTIF-02 exists to prevent.

## Consequences

- `AsyncErrorLogger` keeps its name and its branch-independence; the toolkit-wide assumption in
  `FLUTTER_RULES.md`, `scaffold-feature`, and `audit-application-layer`'s APP-NOTIF-02 remains valid for
  every project `sentry-init` touches, on either branch.
- Course-driven contributors expecting a Sentry-only observer or a bare `ErrorLogger`-without-observer
  will be surprised; the skill's Phase 4 must say why in-line (this ADR's channel/sink distinction), not
  just assert the merged shape.
- The build ticket that rewrites `SKILL.md` Phase 4 must also fix the three stale v2 observer samples to
  v3's `ProviderObserverContext`/`providerDidFail`, and must smoke-test (not just compile-check) that
  `overrideWithValue` in tests actually reaches the observer's `context.container.read(...)` call.
- `references/logger-decorator-pattern.md`'s "When to Use Branch B Instead" section and its
  test-isolation claim (:98-111, currently false against the hard-constructed `AsyncErrorLogger(LoggerServiceImpl())`
  sample at `SKILL.md:389`) both need rewriting alongside the rename to `error-capture-architecture.md`.
- A toolkit-wide follow-up (tracked separately, outside map #47) is needed for problems this ticket
  surfaced but does not own: `AsyncErrorLogger` having no definition outside `sentry-init`, and logger
  method arity being unreconciled between `sentry-init` (positional), `unit-test`'s mock stubs
  (positional, consistent), and `scaffold-feature/references/logging.md:93` (named `error:`/`stackTrace:`,
  inconsistent).
- `#54` (sampling/cost ticket) should account for the `ProviderException` guard reducing duplicate error
  events per dependent-provider chain — a volume change, not just a correctness fix.
- `#53` (`beforeSend` policy) still owns whether the expected-`DioException`-with-null-response filter
  lives at the call site, inside `beforeSend`, or both — this ADR only fixes *where the swallow-case call
  site is allowed to exist*, not what it filters.
- `#55` owns correcting `SKILL.md:3`'s frontmatter description ("LoggerService decorator if present, else
  standalone ProviderObserver"), now inaccurate under this decision.
