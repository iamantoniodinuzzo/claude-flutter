# 0003 — sentry-init keeps a build-mode `beforeSend` gate but fixes its three defects, and moves the
Dio filter to the call site

## Status

Accepted (wayfinder ticket #53, map #47)

## Context

`skills/sentry-init/SKILL.md` ships a default `beforeSend` (`SKILL.md:166-171`, mirrored in
`references/gorouter-and-dio-wiring.md:87-106`) taken from Andrea Bizzotto's *Flutter in Production*
error-monitoring module:

```dart
options.beforeSend = (event, hint) async {
  if (!kReleaseMode) return null;                                 // suppress debug noise
  final ex = event.throwable;
  if (ex is DioException && ex.response == null) return null;     // no connection, skip
  return event;
};
```

The skill's own Phase 7 closing checklist (`SKILL.md:655`) tells the developer to do a "deliberate-exception
smoke test" — throw an exception and verify it lands in the Sentry dashboard. Run in a normal `flutter run`
debug session, that smoke test produces nothing: `!kReleaseMode` drops the event before it ever reaches
Sentry.

### The course does not resolve this — it contains the contradiction unexamined

1. **Feedback breakage is acknowledged, not fixed.** `Sentry Additional Options and APIs` (lesson 9) states
   plainly: "The `!kReleaseMode` check will filter out all events when running in debug mode, including any
   user feedback that is sent with the `feedback_sentry` plugin… you'll only be able to submit user
   feedback in release builds. On debug builds, pressing the 'Submit' button won't do anything." No
   mitigation is offered, and `beforeSendFeedback` is never mentioned in the module.
2. **The course's own smoke test predates the filter that would break it.** `Sentry Setup Basics` (lesson
   3) has `MainApp.build` `throw Exception('Something went wrong')` and verifies it lands in the dashboard
   — six lessons before `beforeSend` is introduced in lesson 9, and never revisited afterward. (`Sentry
   Setup Checklist`, lesson 12, has no smoke-test step of its own; its five steps are: create project → add
   `sentry_flutter` → add breadcrumbs → configure the Dart plugin → (bonus) collect user feedback.) This is
   the same unnoticed-collision pattern as the `DioException` filter in §3 below: a mechanism introduced
   early in the course silently stops working once a later lesson's filter is layered on top, and the
   course never goes back to check. The conflict this ticket resolves is inherited from that pattern, not
   invented by this skill's Phase 7 checklist.
3. **The `DioException` filter is written in two places that collide.** `Case Study: Capturing Exceptions
   Explicitly with Sentry` (lesson 6) filters at the call site on a two-part predicate — `DioException` with
   a null `response` **and** the local `Epic` table is non-empty → return silently (expected offline,
   nothing actionable); when the table **is** empty, the same branch deliberately calls
   `errorLogger.logException(e, st)` and rethrows, because an empty DB means the initial load genuinely
   failed and the app needs to show a retry screen. `Sentry Additional Options and APIs` (lesson 9) then
   installs a `beforeSend` filter that drops **every** null-response `DioException`, unconditionally — which
   silently kills the exact "DB empty, please report this" case the call site was written to preserve. The
   course never revisits lesson 6 in light of lesson 9; the `isDbEmpty` branch is dead code with respect to
   Sentry as shipped.
4. **`!kReleaseMode` is course convention, repeated without scrutiny** in lessons 9, 12 and 13 (the
   Firebase-Remote-Config sample rate lesson, itself already flagged "for illustration purposes only" and
   out of scope per #47).
5. **The course deliberately uses one Sentry project across environments.** `Sentry Setup Environments and
   Flavors` (lesson 4) keeps a single DSN across `.env.dev`/`.env.stg`/`.env.prod` and separates issues via
   `options.environment = getFlavor().name`, explicitly preferring this to Firebase's project-per-environment
   requirement. #51 (DSN convention, resolved) inherits this shape via `dart_defines.json`. An empty
   dev-flavor DSN — which would disable the SDK outright and sidestep `beforeSend` entirely — is therefore
   off-convention for this toolkit and was considered and rejected as the default mechanism.

### SDK facts verified via context7 (`getsentry/sentry-dart`, sourced from `main`)

- `SentryClient._runBeforeSend` dispatches with an `else if` chain: `SentryTransaction` events go to
  `beforeSendTransaction`; events with `event.type == 'feedback'` go to `beforeSendFeedback` **only if it is
  set**; everything else falls through to `beforeSend`. `SentryOptions` declares both
  `BeforeSendCallback? beforeSend` and `BeforeSendCallback? beforeSendFeedback` as independent, equally-typed
  fields. The skill's template sets only `beforeSend`, which is why feedback events fall through to it and
  inherit the `!kReleaseMode` drop — this is an omission, not an SDK limitation, and is fixable without
  touching the debug gate itself.
- A dropped event is recorded as a lost event and logged only at `SentryLevel.debug` ("`<Type> was dropped
  by beforeSend callback`") — there is no louder signal. A blanket build-mode filter inside `beforeSend` is
  therefore a poor place to encode policy that a developer needs to see fail during onboarding.
- `!kReleaseMode` is `true` in **both** debug and profile mode (`kReleaseMode`/`kProfileMode`/`kDebugMode`
  are the three mutually exclusive Flutter build-mode constants). The course default silences profile
  builds too — the build type used for on-device perf/QA testing and often for internal distribution —
  which has no relationship to the course's stated intent ("filter out debug exceptions... during a
  debugging session").

## Decision

**1. Keep a build-mode gate in `beforeSend`, but fix three defects in it; do not move the gate to the DSN
layer.**

- Use `kDebugMode`, not `!kReleaseMode` — profile builds report again.
- Set `options.beforeSendFeedback = (event, hint) => event;` alongside `beforeSend` — a passthrough with no
  gate. Feedback is a deliberate, user-initiated action; it should never be silently discarded by a filter
  aimed at unhandled-exception noise from debugging sessions.
- Add a `SENTRY_DEBUG_REPORTING` boolean dart-define, read into a `kDebugReporting` constant and OR'd into
  the gate. It lives in the same `dart_defines.json` mechanism #51 already established for the DSN — no new
  configuration surface. This is what makes Phase 7's smoke test executable without editing source:

```dart
const kDebugReporting = bool.fromEnvironment('SENTRY_DEBUG_REPORTING');

options.environment = flavor.name;                 // dev events land in the 'dev' environment

options.beforeSend = (event, hint) async {
  if (kDebugMode && !kDebugReporting) return null;
  return event;
};

// Deliberate, user-initiated — never subject to the debug-noise gate.
options.beforeSendFeedback = (event, hint) => event;
```

Phase 7's smoke test becomes: `flutter run --flavor dev --dart-define=SENTRY_DEBUG_REPORTING=true`, throw
the deliberate exception, verify it appears in the Sentry dashboard under the **`dev`** environment.

The DSN-level alternative (empty DSN per #51's `dart_defines.json` for dev flavors, no code-level gate at
all) was considered. It was rejected because it is off-convention against lesson 4's one-project /
many-environments shape (see Context §5), and because it forces editing `dart_defines.json` — not passing a
`--dart-define` flag — to run the smoke test, which is a heavier ritual for a one-off verification step.

**2. The expected-`DioException`-with-null-response filter lives at the call site only. `beforeSend` ships
with no Dio filter by default.**

Three grounds:
- The real predicate needs application state (`isDbEmpty`, or whatever a given feature's equivalent is) that
  `beforeSend` structurally cannot see — it only receives the `SentryEvent` and a `Hint`.
- Duplicating a simplified version of the filter into `beforeSend` is exactly what destroyed the call site's
  distinction in the course (Context §3). Keeping it in exactly one place removes the collision by
  construction.
- `response == null` is a broader net than "connection error" — it also matches `DioExceptionType.unknown`,
  which wraps TLS failures, DNS failures, bad `baseUrl` configuration, and raw socket errors. These are
  exactly the production bugs most worth seeing in Sentry; a blanket `beforeSend` filter would drop them
  unconditionally with no per-feature judgment available.

Under ADR 0002's swallow-vs-propagate rule, the call site is already the only place a manual sink call is
legal (a `catch` that returns/falls back without rethrowing never reaches the `AsyncErrorLogger` observer).
"Expected error, don't report" therefore reduces to "the swallow branch simply doesn't call
`SINK_PROVIDER`" — no new mechanism, just applying ADR 0002's existing shape to this predicate:

```dart
catch (e, st) {
  final isDbEmpty = await db.isEpicsTableEmpty();
  if (e is DioException && e.response == null && !isDbEmpty) {
    return;                              // expected offline, DB has data to fall back on: do not report
  }
  ref.read(SINK_PROVIDER).logException(e, st);   // unexpected, or DB empty: report it
  if (isDbEmpty) rethrow;                        // propagate — the observer must not also log this
}
```

A narrowed, `beforeSend`-level variant — filtering only
`{DioExceptionType.connectionError, connectionTimeout, sendTimeout, receiveTimeout}`, never `unknown` or
`badResponse` — is documented as an **opt-in** pattern in the reference doc for high-volume projects that
want a global backstop across every Dio call site, not shipped as the default.

## Consequences

- `SKILL.md:166-171`, `SKILL.md:190`, `SKILL.md:655`, and `references/gorouter-and-dio-wiring.md:87-106` all
  need rewriting to this shape. That rewrite is a build ticket under map #47, not this ADR — this ADR fixes
  the policy, not the prose.
- **Build-ticket verification item**: confirm which capture API `feedback_sentry` actually calls at the
  pinned version (`flutter pub add feedback feedback_sentry` per `SKILL.md:131`). `beforeSendFeedback` only
  fires for events where `event.type == 'feedback'`; if `showAndUploadToSentry()` still routes through a
  differently-typed event or the deprecated `captureUserFeedback` API at the pinned version, the passthrough
  will not intercept it and `SENTRY_DEBUG_REPORTING` becomes the operative mechanism for local feedback
  testing instead. The decision holds either way; this is a verification note, not a blocker.
- **Build-ticket verification item**: confirm `beforeSendFeedback` exists on `SentryOptions` at the
  `sentry_flutter ^9.27.0` floor set by #48 (context7 sourced the field from `main`, not a tagged release).
- **#54** (sampling/cost ticket) inherits a volume note: removing the blanket `beforeSend` Dio filter raises
  event volume for offline-heavy apps compared to the course default. This is now `sampleRate`'s problem to
  manage, not a silent global drop's — consistent with #54 already owning sampling defaults.
- **#55** (content architecture) must carry the new Phase 7 smoke-test command
  (`--dart-define=SENTRY_DEBUG_REPORTING=true`) and the `dev`-environment verification step into its
  rewrite.
- Closes the open handoff from ADR 0002 ("`#53` still owns whether the expected-`DioException`-with-null-
  response filter lives at the call site, inside `beforeSend`, or both") — resolved: call site only.
- No conflict with ADR 0002's swallow-vs-propagate rule: the call-site filter above sits entirely inside the
  swallow branch ADR 0002 already authorised a manual sink call from; it does not introduce a new capture
  path.
