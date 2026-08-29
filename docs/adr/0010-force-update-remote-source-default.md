# 0010 — force-update-init: force_update_helper default, remote-source selection, non-store handling

## Status

Accepted

## Context

While building `skills/force-update-init/` from Andrea Bizzotto's *Flutter in Production* "Force Update
Strategies" course module, three decisions needed a considered default rather than an arbitrary pick:

1. The course presents two viable packages — [upgrader](https://pub.dev/packages/upgrader) (alert on every
   new store version, no remote control) and
   [force_update_helper](https://pub.dev/packages/force_update_helper) (remote `required_version`, full
   control over when to trigger). The course itself concludes the second is more flexible; the skill needed
   to decide whether to implement one, both, or neither with the other as a documented alternative.
2. `force_update_helper` supports three remote sources for `required_version` (GitHub Gist, Firebase Remote
   Config, custom backend) with genuinely different tradeoffs (rate limits, throttling, deployment cost),
   and no single one is right for every target project.
3. The published package (`0.3.0`, 2025-11-04) has no supported way to point the update prompt at anything
   other than the Apple/Play stores — `iosAppStoreId` is its only URL input, hardcoded into
   `https://apps.apple.com/app/id<ID>`. A project distributed via Firebase App Distribution, TestFlight
   only, enterprise/internal channels, or an unpublished POC has no store listing for that URL to resolve
   to.

## Decision

**`force_update_helper` is the default and only implemented package.** `upgrader` is documented as a
rejected alternative in `references/remote-sources.md` (one section, not a parallel implementation) — the
skill does not offer to install it. Rationale: the course's own conclusion holds up against this toolkit's
stated use cases (retiring endpoints, security patches, backend migrations) — all three need updates
triggered on the developer's schedule, which `upgrader`'s always-alert model cannot express.

**Remote source is detected and proposed, not blindly asked.** Phase 0.4 greps the target for
`firebase_core` (→ propose Remote Config) and an existing Dio-based API client pattern (→ propose custom
backend), defaulting to GitHub Gist when neither signal is present (no backend, no Firebase SDK cost). The
user confirms or overrides — this is a proposal with a shown rationale, not an assumption applied silently.

**Non-store distribution is handled by subclassing, not forking.** `ForceUpdateClient` in the published
package is declared as a bare `class` — not `final`, `sealed`, `base`, or `interface` — so `storeUrl()` can
be overridden in a subclass to return an arbitrary destination URL instead of the hardcoded Apple/Play
templates. Phase 6 of the skill scaffolds this subclass when `DISTRIBUTION=non-store`. This path is
unadvertised by the package itself (no upstream test coverage for it), which the skill states to the user
rather than presenting as a documented feature.

**`APP_STORE_ID` follows ADR 0001's `dart_defines.json` convention, as a second consumer, not a second
owner.** See the amendment to ADR 0001 below.

## Consequences

- A project already using `upgrader` is not migrated automatically — the AUDIT branch flags coexistence and
  describes the tradeoff, leaving the decision to remove it to the user.
- Rolling-release windows (a version *range*, not a single floor) remain unsupported — stated plainly in
  `references/release-playbook.md` rather than approximated with the floor-only mechanism this skill wires.
- The non-store subclass path has no upstream test coverage. If a future `force_update_helper` release
  seals the class (`final`/`sealed`) or adds a first-class custom-URL parameter, this ADR's Phase 6 approach
  needs revisiting — check the package's CHANGELOG before assuming the subclass still works on an upgrade.
- `force-update-init` becomes a second consumer of `dart_defines.json`. ADR 0001 is amended to reflect this
  — see below.
