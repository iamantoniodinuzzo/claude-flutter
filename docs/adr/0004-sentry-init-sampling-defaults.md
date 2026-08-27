# 0004 — sentry-init leaves `sampleRate` unset and makes performance-monitoring rates opt-in

## Status

Accepted (wayfinder ticket #54, map #47)

## Context

`skills/sentry-init/SKILL.md` Phase 0.6 (`SKILL.md:77-86`) detects app flavors and maps each one to a
`tracesSampleRate`/`profilesSampleRate` pair, always emitted in Phase 2's `SentryFlutter.init` template
(`SKILL.md:160-161`):

| Flavor | `tracesSampleRate` | `profilesSampleRate` |
|--------|--------------------|-----------------------|
| prod / release | 0.2 | 0.2 |
| dev / debug / staging | 1.0 | 1.0 |

Andrea Bizzotto's *Flutter in Production* course (source material for this refresh) instead drives a
different knob, `sampleRate`, in its cost-control lesson — the fraction of *error events* sent, directly
relevant to Sentry's free-tier limit of 5,000 events/month. The two knobs are easy to conflate because both
are named "sample rate" and both take a `0.0`–`1.0` double, but they meter unrelated things: `sampleRate`
throttles error events, `tracesSampleRate` throttles performance transactions (spans), and
`profilesSampleRate` throttles profiling — three separate Sentry billing buckets.

### What the investigation established

1. **The course deliberately omits both trace rates.** `Sentry Setup Basics.md:116-144` shows the
   `tracesSampleRate`/`profilesSampleRate` snippet as an optional aside — "You can *optionally* set the
   sample rate for performance monitoring and profiling" — and closes with: "These settings are not needed
   for the Flutter Ship app, so I have omitted them." The Phase 0.6 table is this skill's own addition,
   never validated against the course it was refreshed from.
2. **The course's only `sampleRate` usage is already out of scope for this map.**
   `How to Minimize Your Sentry Bill.md:20-66` sets `options.sampleRate` from a value fetched via Firebase
   Remote Config. #47's *Out of scope* section already rejects this mechanism: "the course itself labels
   this 'for illustration purposes only'; not a recommended default." The knob (`sampleRate` itself) is in
   scope for #54; the course's Remote-Config delivery mechanism for it is not, and this ADR does not revive
   it.
3. **The existing trace/profile table has a live arithmetic bug.** The course states the relationship
   explicitly at `Sentry Setup Basics.md:133`: "The sampling rate for profiling is relative to
   `tracesSampleRate`." Sentry's own semantics agree — `profilesSampleRate` multiplies against
   `tracesSampleRate`, it does not stand alone. The skill's prod row of `0.2`/`0.2` therefore yields an
   *effective* profiling rate of 0.2 × 0.2 = 4%, not the 20% the inline comment at `SKILL.md:161`
   (`// same value`) shows was intended.
4. **Both rates default to unset (`null`) in the SDK.** Verified via context7
   (`getsentry/sentry-dart`, `packages/flutter/lib/src/sentry_flutter_options.dart`): neither
   `tracesSampleRate` nor `profilesSampleRate` has a non-null default on `SentryFlutterOptions`.
   `enableAutoPerformanceTracing` defaults to `true`, but produces no transactions while
   `tracesSampleRate` is null — so a project that never sets the rate consumes zero span or profile quota.
   Emitting the table by default is therefore an opt-in the skill was making on the developer's behalf, not
   a correction of a bad SDK default.
5. **Errors, spans and profiles are separate quota buckets** — `sampleRate` and `tracesSampleRate` do not
   trade off against each other; setting one says nothing about the other, and neither is a substitute for
   the other when a project is over its error-event quota specifically.
6. **Two prior decisions in this map already move error-event volume in opposite directions.** ADR 0002's
   `ProviderException` guard removes duplicate reports fired once per dependent provider in a failure chain
   (volume down). ADR 0003 removes the blanket `beforeSend` Dio filter, restoring reports for offline
   failures the course's filter was silently swallowing (volume up). This ticket is where that net effect
   on the free tier gets addressed.

## Decision

**1. `sentry-init` does not set `options.sampleRate`. It stays at the SDK default of `1.0`.**

Random error-event sampling is a poor tool for free-tier pressure specifically because Sentry already
groups individual events into issues: quota pressure in practice comes from a small number of
high-frequency issues, not from broad, low-frequency noise. Sampling below 1.0 degrades exactly the data a
developer needs to triage that pressure — it destroys issue frequency counts (a sampled issue is
indistinguishable from one that genuinely affects fewer users), and it can drop the only occurrence of a
rare, high-severity crash. The skill instead documents an escalation ladder in the reference material,
ordered from least to most destructive:

1. A targeted `beforeSend` filter for the specific noisy exception class — the shape ADR 0003 already
   establishes for the swallow case, applied here to a class that's noisy in aggregate rather than expected
   at one call site.
2. Fix the top-volume issue directly — the highest-leverage move, since a handful of issues usually account
   for most of the volume.
3. Server-side controls: Sentry's spike protection and per-key rate limits shed load at the ingestion
   boundary without blinding the developer to what's happening client-side.
4. **Last resort**: `options.sampleRate` below `1.0`, with its fidelity cost stated inline wherever it's
   documented.

**2. Performance monitoring (`tracesSampleRate`/`profilesSampleRate`) becomes opt-in, default off.**

`sentry-init` bootstraps *error* monitoring; performance monitoring is a related but separate feature with
its own quota impact the course chose not to enable. Phase 0.6 keeps asking about flavors and keeps the
question of trace/profile sampling in front of the developer, but the default answer flips from "always
emit a table" to "off unless requested." When a developer does opt in, the emitted table is corrected for
the relative-rate relationship established in Context §3:

| Flavor | `tracesSampleRate` | `profilesSampleRate` (relative) | effective profiling |
|--------|--------------------|----------------------------------|----------------------|
| prod / release | 0.2 | 1.0 | 0.2 |
| dev / staging | 1.0 | 1.0 | 1.0 |

## Consequences

- `SKILL.md:77-86` (Phase 0.6), `SKILL.md:102` (Phase 0 summary line), and `SKILL.md:160-161` (emitted
  init options) all need rewriting to this shape. That rewrite is a build ticket under map #47, exactly as
  #52 and #53 deferred theirs — this ADR fixes policy and the arithmetic, not the prose.
- **Build-ticket verification item**: confirm sentry-dart's current profiling platform support before the
  opt-in table ships in the skill. Context7 confirmed `profilesSampleRate` on `SentryFlutterOptions` and
  its relative-rate semantics, but could not confirm per-platform profiling availability from
  `CONTRIBUTING.md`'s general cross-platform statement alone — if profiling support is narrower than error
  reporting's, the opt-in path needs a platform caveat alongside the table.
- Answers ADR 0003's open volume handoff: the net increase from removing the blanket Dio filter is absorbed
  by the escalation ladder above (targeted filter → fix the issue → server-side controls), not by a
  standing `sampleRate` reduction applied pre-emptively to every project.
- Records ADR 0002's `ProviderException` guard as a volume reduction already banked independently of this
  decision — one more reason a standing `sampleRate` guard is unnecessary on top of it.
- The escalation ladder's step 1 (targeted `beforeSend` filter) must stay consistent with ADR 0003's
  decision: a filter for a specific noisy exception class, not a reintroduction of the blanket
  `DioException`-with-null-response filter ADR 0003 removed from the default template.
- `#55` (content architecture) must carry: Phase 0.6 restructured as an opt-in performance-monitoring
  question defaulting to off, the corrected relative-rate table, a Phase 0 summary line reflecting
  performance-monitoring on/off, and a home for the quota escalation ladder — likely a new reference doc
  rather than inline `SKILL.md` prose, given its length.
- This is the last of map #47's five decision tickets (#48–#52 resolved as facts/ADRs, #53 and #54 as
  ADRs). Only #55 now blocks the build tickets.
