# Release Playbook — Triggering a Force Update in Production

> Course shape (Andrea Bizzotto, *Flutter in Production*, "Force Update Strategies" module). Adapted to
> this toolkit's conventions — inline provenance, no upstream file to attribute.

---

## The sequence

Force update is triggered by **raising the remote `required_version` after the new app version is already
live on the stores** — never the other way around. Order matters:

1. Submit the new app version to the stores.
2. Once approved, publish it.
3. **Wait roughly an hour** — store propagation across regions/countries is not instant; different
   countries' store listings can lag behind each other.
4. Only then, update `required_version` (Gist / Remote Config / backend endpoint, whichever source is
   wired) to match the new version.

Raising `required_version` before the new version is actually available on the store locks users out with
nothing to update *to* — the alert shows, "Update Now" opens the store, and the store still only offers the
old version. This is worse than no force update at all.

## If the update depends on new backend functionality

Deploy the backend change **before** publishing the app version that depends on it, not after. The app can
be live for a while with old and new clients both hitting the new backend (assuming it's backward
compatible) — but a backend that isn't ready yet, with an app version already forcing users onto it, has no
recovery path except reverting the force-update trigger.

## Watching adoption before retiring anything

After triggering a force update, watch the rollout before you act on its assumption (e.g. retiring an old
backend endpoint):

- App analytics — active-version breakdown, if already instrumented.
- [Sentry Releases](https://docs.sentry.io/product/releases/) — if `sentry-init` is already wired in this
  project, the release/environment tags there double as a live view of which app version is actually
  running, independent of app-store download stats (which lag real usage).

Once the old-version percentage is close enough to zero for the risk tolerance of the change being made,
proceed with retiring the endpoint / cutting over the backend / whatever the force update was for.

## What this does *not* solve — rolling release windows

A [rolling release window](https://medium.com/@jonasuekoetter/rolling-release-window-802d3d8472c4) — a
*range* of allowed versions (e.g. "anything from 3.2.0 to the latest is fine, below 3.2.0 is not") rather
than a single floor version — is **not supported** by `force_update_helper`. The package's own README
states it directly: small, opinionated, two classes; if it doesn't fit, fork it.

This skill does not attempt that fork. If a rolling window is a real requirement, say so plainly rather
than approximating it with the floor-only mechanism this skill wires — a floor-only check cannot express
"below 3.2.0 blocked, at or above always fine" if a *ceiling* is also needed (e.g. staged rollouts where the
newest version isn't force-required yet either).

## Per-environment `required_version` (backend source only)

If `REMOTE_SOURCE=backend`, each deployed environment (dev/stg/prod, if flavored) needs its own
`REQUIRED_VERSION` env var set on the hosting platform — most cloud platforms support this natively.
`server/lib/server.dart` (see `references/remote-sources.md`) already reads
`Platform.environment['REQUIRED_VERSION']` with a safe fallback; the fallback should never be the value
actually used in a live production environment.
