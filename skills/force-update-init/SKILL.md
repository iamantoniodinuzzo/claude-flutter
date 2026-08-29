---
name: force-update-init
description: Bootstrap force update in a Flutter app using force_update_helper — installs deps, patches AndroidManifest.xml for url_launcher, wires ForceUpdateWidget into MaterialApp.builder (or GoRouter), sets up a remote required_version source (GitHub Gist, Firebase Remote Config, or a scaffolded Dart Shelf backend), handles non-store distribution (Firebase App Distribution, TestFlight, enterprise, POC), and audits an existing setup for the two silent failure modes — missing APP_STORE_ID and a missing Android <queries> intent. Use when the user says "aggiungi force update", "add force update", "blocca le vecchie versioni", "force gli utenti ad aggiornare", "require a minimum app version", "block outdated app versions", or asks to set up a mandatory update prompt.
user-invocable: true
---

# force-update-init

Bootstraps force update in an existing Flutter project using the [force_update_helper](https://pub.dev/packages/force_update_helper) package (course shape: Andrea Bizzotto, *Flutter in Production*). Run phases in order; the skill first classifies the project as INIT (nothing wired yet) or AUDIT (partial/complete setup already present) and follows the matching branch below.

Force update must ship in the **very first version** of an app or it can never reach users already on an older one — there is no way to retroactively add the check to installs that predate it.

Before coding anything, load the bundled references in parallel:

- `skills/force-update-init/references/remote-sources.md`
- `skills/force-update-init/references/store-urls-and-env.md`
- `skills/force-update-init/references/release-playbook.md`

Version baseline cited below (`force_update_helper: 0.3.0`) is the latest published on pub.dev at the time
this skill was written (2025-11-04) — verify current latest before pinning. The package itself has been
dormant since that release; state this plainly to the user rather than implying active maintenance. It
supports **Android and iOS only** — `isAppUpdateRequired()` and `storeUrl()` hard-return `false`/`null` on
every other platform, so force update simply does not apply to a web or desktop target.

If the target already has [upgrader](https://pub.dev/packages/upgrader) installed instead, do not run this
skill alongside it — `upgrader` shows an alert on *every* new store version with no remote control; state
the tradeoff (see `references/remote-sources.md` "upgrader vs force_update_helper") and let the user choose
whether to migrate. The AUDIT branch below detects this case.

---

## Phase 0 — Intake & detection

**Goal**: know the project's actual state before asking a single question or touching a file.

### 0.1 Melos workspace detection

Grep root `pubspec.yaml` for `workspace:` (pub workspaces) or check for `melos.yaml`.

- **Monorepo detected**: parse `melos.yaml` `packages:` globs to find candidate app packages. If more than
  one plausible target exists, ask which package. Resolve every subsequent path (`pubspec.yaml`,
  `lib/main.dart`, `android/app/src/main/AndroidManifest.xml`, `dart_defines.json`) relative to that
  package, not the repo root. This mirrors `sentry-init` 0.1 — detect and adapt, never block.
- **Single-app**: target root is the project root.

### 0.2 INIT vs AUDIT classification

Grep the target for, recording found/missing:

| Signal | Where |
|---|---|
| `force_update_helper` | `pubspec.yaml` |
| `upgrader` | `pubspec.yaml` |
| `ForceUpdateWidget(` | `lib/` |
| `ForceUpdateClient(` | `lib/` |
| `<queries>` intent block | `android/app/src/main/AndroidManifest.xml` |

- **No `force_update_helper` and no `upgrader` signal** → **INIT branch** (Phase 1 onward).
- **Any signal found** → **AUDIT branch** — jump to [AUDIT branch](#audit-branch-partial--complete-projects)
  below.

Print the detection matrix either way before proceeding.

### 0.3 Distribution channel (INIT branch)

Ask, with `AskUserQuestion` if available:

> How is this app distributed?
> 1. **App Store + Play Store** (default) — both platforms go through their public stores.
> 2. **One store only** — e.g. Android via Play Store, iOS side-loaded/enterprise, or vice versa.
> 3. **Non-store** — Firebase App Distribution, TestFlight-only, enterprise/internal distribution, or a POC
>    with no public store listing yet.

Record as `DISTRIBUTION` (`both` | `android-only` | `ios-only` | `non-store`). This gates Phase 6 — the
non-store branch only runs when `DISTRIBUTION=non-store`. `android-only`/`ios-only` still run the normal
store path for the covered platform; `force_update_helper` already no-ops the uncovered one.

### 0.4 Remote source — detect and propose

Grep `pubspec.yaml` and `lib/` for signals, then propose (don't just ask blind):

| Signal | Proposed source | Rationale |
|---|---|---|
| `firebase_core` in pubspec | Firebase Remote Config | App already pays the Firebase SDK cost; centralized console control |
| `dio` in pubspec + an existing API client pattern in `lib/` | Custom backend (Dart Shelf) | App already has backend infrastructure to extend |
| Neither | GitHub Gist | No backend, no Firebase SDK — fastest path to something working |

Print the proposal and rationale, ask for confirmation or an override. Record as `REMOTE_SOURCE`
(`gist` | `remote_config` | `backend`). See `references/remote-sources.md` for the full tradeoffs (rate
limits, throttling, deployment) to cite if the user asks why.

### 0.5 Flavor detection

Grep for `lib/env/flavor.dart` (or equivalent) and parse the actual `enum Flavor { ... }` arms found — do
not assume `dev`/`stg`/`prod` exist; read what's really there. A project may have no flavors, one, or a
custom set.

- **No `Flavor` enum found** → single unflavored app. Skip the rest of this section; `REMOTE_SOURCE`
  resolves to one value, no `switch`.
- **`Flavor` enum found** → list the actual arms, then ask which of them should get a **live**
  `required_version` (i.e. actually enforce updates) versus a harmless **floor value** (e.g. `0.0.1`, which
  can never trigger an update — needed so the generated `switch` compiles for every arm without forcing
  updates on flavors that don't want them).

  Default proposal, stated explicitly rather than silently applied: only the arm that looks like
  production gets a live value; every other arm gets the floor. This matches the course's own position —
  "force update only really applies to the production environment" — for `REMOTE_SOURCE=remote_config`
  specifically, and generalizes cleanly to the other two sources.

Record `FLAVOR_ARMS` (full list) and `LIVE_FLAVORS` (subset getting a real value).

### 0.6 `APP_STORE_ID` delivery — ADR 0001 convention

Only relevant when `DISTRIBUTION` includes iOS (`both` or `ios-only`) — for `android-only` or `non-store`,
skip to 0.7.

Per `docs/adr/0001-sentry-init-dsn-source-convention.md`, this toolkit's convention for a compile-time
constant is `dart_defines.json` + `--dart-define-from-file`, read as `const String.fromEnvironment(...)`.
`force-update-init` is a **consumer** of that convention, not an owner — `sentry-init` remains the skill
that scaffolds `dart_defines.json` when nothing exists yet.

Detect, in the same priority order `sentry-init` uses for `SENTRY_DSN` (SKILL.md 0.5):

1. `dart_defines.json` / `dart_defines.json.example` already present → propose key `APP_STORE_ID` in the
   same file.
2. `--dart-define=APP_STORE_ID=...` (or a project-specific key) already embedded in `.vscode/launch.json`
   or a `Makefile` → detect and adapt: propose adding `APP_STORE_ID` alongside the existing defines in that
   same file, not a competing mechanism.
3. `.env` / `.env.<flavor>` + an `Env` class already present (the course's own shape) → detect and adapt:
   propose `Env.appStoreId` reading `String.fromEnvironment('APP_STORE_ID')`, added to the existing class
   and files.
4. None of the above present → default to `dart_defines.json` (same default `sentry-init` uses),
   scaffolding it only if this skill is the first to need it in this project. If `sentry-init` has already
   scaffolded it (grep for the file), add the key to it rather than creating a second file.

Confirm the mechanism and record as `APP_STORE_ID_DART_EXPR` (mirrors `sentry-init`'s `DSN_DART_EXPR`).
State plainly: **`APP_STORE_ID` is not sensitive** (the course notes this — it's fine to see in a diff), but
it is per-project and must never be copy-pasted from another app's config.

### 0.7 `allowCancel`

Ask: should the update prompt be dismissible ("Later" button) or fully blocking? Default `false` (hard
block) — state the tradeoff: `true` is friendlier but the course's production use case (security fixes,
retired endpoints) usually wants `false`. Record as `ALLOW_CANCEL`.

### 0.8 Router shape

Grep for `MaterialApp.router(` vs `MaterialApp(` with `onGenerateRoute`/`routes`, and for `GoRouter(`.
Record `ROUTER_SHAPE` (`material_app` | `gorouter`) — determines which `navigatorKey` wiring Phase 4 uses.

### 0.9 Existing plumbing

Grep for:
- `class ErrorLogger` / `errorLoggerProvider` / `class LoggerService` (from a prior `sentry-init` run) →
  record `HAS_ERROR_LOGGER` and the matching provider name.
- A dialog helper matching the shape `showAlertDialog({required BuildContext context, required String
  title, ...})` → record `DIALOG_HELPER` (found path, or `none`).

### Phase 0 summary

Print before proceeding:

```
✓ Target: <package>
✓ Branch: INIT
✓ Distribution: <both|android-only|ios-only|non-store>
✓ Remote source: <gist|remote_config|backend> (<detected reason>)
✓ Flavors: <list, or "none"> — live: <subset>
✓ APP_STORE_ID via: <dart_defines.json|.env+Env>
✓ allowCancel: <true|false>
✓ Router: <MaterialApp.builder|GoRouter>
✓ Existing error sink: <found <name>|not found — will scaffold minimal>
✓ Dialog helper: <found <path>|not found — will scaffold>
```

Ask the user to confirm before proceeding.

---

## Phase 1 — Safety gate

Run `git status --porcelain` in the target project. If not empty, stop:

```
✗ Working tree is not clean.
  force-update-init patches AndroidManifest.xml, main.dart (or the router file), and pubspec.yaml.
  Without a clean commit, a bad run cannot be safely rolled back with:
    git reset --hard HEAD && git clean -fd
  Commit or stash your changes, then re-run this skill.
```

If clean, print the rollback command anyway, then proceed.

---

## Phase 2 — Dependencies

### 2.1 package_info_plus conflict pre-check (blocking)

Published `force_update_helper: 0.3.0` constrains `package_info_plus: ^9.0.0`. Grep the target's
`pubspec.yaml`/`pubspec.lock` for an existing `package_info_plus` constraint.

- **None, or compatible with `^9.0.0`** → proceed normally.
- **Already on `package_info_plus: ^10.x` or higher** → **stop** and present the conflict, do not silently
  pick a resolution:

  ```
  ✗ package_info_plus conflict: this project already depends on ^10.x, but force_update_helper 0.3.0
    constrains package_info_plus: ^9.0.0. Options:
    1. Pin this project's package_info_plus back to ^9.0.0 (may affect other code using 10.x-only APIs)
    2. Add a dependency_override for package_info_plus
    3. Depend on force_update_helper via git (main branch has moved to ^10.1.0, unreleased)
  ```

  Ask which option, apply only that one.

### 2.2 Install

```bash
flutter pub add force_update_helper
flutter pub add url_launcher
flutter pub add package_info_plus   # only if not already present
```

For monorepo: prefix with `melos exec --scope=<pkg> -- `.

Conditional, per `REMOTE_SOURCE`:

| `REMOTE_SOURCE` | Additional command |
|---|---|
| `gist` | `flutter pub add dio` (if not already present) |
| `remote_config` | `flutter pub add firebase_remote_config` |
| `backend` | `flutter pub add dio` (if not already present) |

---

## Phase 3 — Platform config

### 3.1 Android `<queries>` intent

Required for `url_launcher` to open the store URL. Check `android/app/src/main/AndroidManifest.xml` for an
existing `<queries>` block; if present with a matching `VIEW`/`BROWSABLE`/`https` intent, skip. Otherwise
add, inside `<manifest>`, as a sibling of `<application>`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  ...
  <queries>
    <intent>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="https"/>
    </intent>
  </queries>
</manifest>
```

If a `<queries>` block already exists for other reasons (e.g. package visibility queries), append the
`<intent>` inside it rather than adding a second `<queries>` block — Android XML does not merge multiple
top-level `<queries>` elements.

### 3.2 `APP_STORE_ID`

Per the mechanism resolved in Phase 0.6:
- `dart_defines.json` → add/update the `APP_STORE_ID` key. If flavored, one shared key is fine — the App
  Store ID does not vary by flavor (a per-flavor bundle ID gets a per-flavor App Store *listing*, but that
  is a Phase 0.6-adjacent concern the developer resolves once the flavor apps actually exist in App Store
  Connect — see `references/store-urls-and-env.md`).
- `launch.json`/`Makefile` → add `--dart-define=APP_STORE_ID=...` alongside the project's other defines in
  that same file.
- `.env`/`Env` → add `static String get appStoreId => const String.fromEnvironment('APP_STORE_ID');` to the
  existing `Env` class; add the key to each `.env.<flavor>` file present.

See `references/store-urls-and-env.md` for where to find the real numeric ID in App Store Connect, and the
exact URL format it feeds.

Only run this section when `DISTRIBUTION` includes iOS.

---

## Phase 4 — Wire `ForceUpdateWidget`

### 4.1 `MaterialApp.builder` variant

```dart
final _rootNavigatorKey = GlobalKey<NavigatorState>();

class MainApp extends ConsumerWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      ...
      navigatorKey: _rootNavigatorKey,
      builder: (context, child) {
        return ForceUpdateWidget(
          navigatorKey: _rootNavigatorKey,
          forceUpdateClient: FORCE_UPDATE_CLIENT_EXPR, // see Phase 5/6
          allowCancel: ALLOW_CANCEL,
          showForceUpdateAlert: (context, allowCancel) => showAlertDialog(
            context: context,
            title: 'App Update Required',
            content: 'Please update to continue using the app.',
            cancelActionText: allowCancel ? 'Later' : null,
            defaultActionText: 'Update Now',
          ),
          showStoreListing: (storeUrl) async {
            if (await canLaunchUrl(storeUrl)) {
              await launchUrl(storeUrl, mode: LaunchMode.externalApplication);
            } else {
              ERROR_SINK_CALL; // see below
            }
          },
          onException: (e, st) => ERROR_SINK_CALL,
          child: child!,
        );
      },
      ...
    );
  }
}
```

`FORCE_UPDATE_CLIENT_EXPR` is resolved in Phase 5 (store branch) or Phase 6 (non-store branch) — exactly
one of those phases runs, and it fills this placeholder.

### 4.2 GoRouter variant

Same widget, different `navigatorKey` source:

```dart
final _goRouter = GoRouter(navigatorKey: _rootNavigatorKey, routes: [ ... ]);

@override
Widget build(BuildContext context) {
  return MaterialApp.router(
    routerConfig: _goRouter,
    builder: (context, child) {
      return ForceUpdateWidget(
        navigatorKey: _goRouter.routerDelegate.navigatorKey,
        forceUpdateClient: FORCE_UPDATE_CLIENT_EXPR,
        allowCancel: ALLOW_CANCEL,
        showForceUpdateAlert: (context, allowCancel) => showAlertDialog(...),
        showStoreListing: (storeUrl) async { ... },
        onException: (e, st) => ERROR_SINK_CALL,
        child: child!,
      );
    },
  );
}
```

If `sentry-init` has already wired a `_rootNavigatorKey` for `SentryNavigatorObserver`/`UpgradeAlert`,
reuse the existing key — never declare a second one.

### 4.3 Error sink wiring

- `HAS_ERROR_LOGGER=true` → `ERROR_SINK_CALL` becomes `ref.read(<detected provider>).logException(e, st)`
  (or `.e('Force update error', e, st)` for the `LoggerService` decorator shape — match whichever
  `sentry-init` left behind, same two-branch distinction that skill uses).
- `HAS_ERROR_LOGGER=false` → scaffold a minimal one at
  `lib/src/core/monitoring/error_logger.dart` (only if no equivalent exists at all):

  ```dart
  import 'dart:developer';

  void logForceUpdateError(Object error, StackTrace? stackTrace) {
    log(error.toString(), name: 'Force Update', error: error, stackTrace: stackTrace);
  }
  ```

  Never let `onException` silently swallow into nothing — a force-update bug that goes unlogged is the one
  place this feature is guaranteed to fail without anyone noticing.

### 4.4 Dialog helper

- `DIALOG_HELPER` found → use it as-is, matching the existing signature.
- Not found → scaffold `showAlertDialog` at `lib/src/common_widgets/show_alert_dialog.dart`, adapted from
  the [flutter_ship_app reference implementation](https://github.com/bizz84/flutter_ship_app/blob/main/lib/src/common_widgets/show_alert_dialog.dart) —
  a plain `AlertDialog`/`CupertinoAlertDialog` wrapper taking `context`, `title`, `content`,
  `cancelActionText` (nullable), `defaultActionText`.

---

## Phase 5 — Remote source (store branch)

Runs when `DISTRIBUTION` is `both`, `android-only`, or `ios-only`. Exactly one of the three sub-sections
runs, per `REMOTE_SOURCE`. Full detail for each in `references/remote-sources.md` — read it before writing
code for the chosen branch.

### Gist (`REMOTE_SOURCE=gist`)

Scaffold a `RemoteConfigGistClient` (Dio-based, `@Riverpod(keepAlive: true)`) that fetches
`https://gist.githubusercontent.com/<owner>/<gist-id>/raw/<filename>` and parses
`{"config": {"required_version": "X.Y.Z"}}`. If `LIVE_FLAVORS` has more than one entry, one gist ID per live
flavor via a `switch`; non-live flavor arms map to a floor-value literal, never a `switch` gap.
`FORCE_UPDATE_CLIENT_EXPR` becomes:

```dart
ForceUpdateClient(
  fetchRequiredVersion: () async {
    final client = ref.read(remoteConfigGistClientProvider);
    final remoteConfig = await client.fetchRemoteConfig();
    return remoteConfig.requiredVersion;
  },
  iosAppStoreId: APP_STORE_ID_DART_EXPR,
)
```

Print the manual checklist item: create one secret gist per live flavor at `gist.new`, note the gist ID(s)
back into the scaffolded `switch`.

### Firebase Remote Config (`REMOTE_SOURCE=remote_config`)

Scaffold the **production-grade** provider (not the naive `fetchAndActivate()`-only docs snippet) —
default values via `setDefaults`, prod throttle interval (12 fetches/day cap → use a 12-minute
`minimumFetchInterval` for prod, 1-minute for other live flavors), immediate `activate()` then unawaited
`fetch()` for next-startup values, a real-time `onConfigUpdated` listener, `ref.onDispose(sub.cancel)`.
`FORCE_UPDATE_CLIENT_EXPR` becomes:

```dart
ForceUpdateClient(
  fetchRequiredVersion: () async {
    final remoteConfig = await ref.read(firebaseRemoteConfigProvider.future);
    return remoteConfig.getString('required_version');
  },
  iosAppStoreId: APP_STORE_ID_DART_EXPR,
)
```

Print the manual checklist item: in the Firebase console for the production project, Remote Config → create
parameter `required_version`, default value = current `pubspec.yaml` version, Publish.

### Custom backend / Dart Shelf (`REMOTE_SOURCE=backend`)

Scaffold `server/lib/server.dart` — a minimal Shelf app with a `required_version` endpoint (plain-text
body, not JSON) reading `Platform.environment['REQUIRED_VERSION']` with a fallback literal, plus
`server/pubspec.yaml` (`shelf`). Full source inline in `references/remote-sources.md` — do **not** tell the
user to run `dart pub unpack force_update_helper` to get this; the published package archive ships only
`lib/`, the example server folder is repo-only and that command will not produce it.

`FORCE_UPDATE_CLIENT_EXPR` becomes:

```dart
ForceUpdateClient(
  fetchRequiredVersion: () async {
    final response = await ref.read(dioProvider).get('$BASE_URL_EXPR/required_version');
    return response.data as String;
  },
  iosAppStoreId: APP_STORE_ID_DART_EXPR,
)
```

`BASE_URL_EXPR` is per live flavor if `LIVE_FLAVORS` has more than one entry (one deployed environment per
flavor); otherwise a single constant. Print the manual checklist item: deploy the server (Docker/VM/edge —
see `references/release-playbook.md`) and fill in the real base URL(s), replacing any `localhost` default.

---

## Phase 6 — Non-store branch

Runs only when `DISTRIBUTION=non-store`. Verified against the live package source: `ForceUpdateClient` has
**no** custom-URL parameter — `iosAppStoreId` is the only URL input, interpolated into a hardcoded Apple
template, and `storeUrl()` returns `null` for anything it doesn't recognize. But the class is a bare
`class` — not `final`, `sealed`, `base`, or `interface` — so it can be subclassed:

```dart
class NonStoreForceUpdateClient extends ForceUpdateClient {
  const NonStoreForceUpdateClient({
    required super.fetchRequiredVersion,
    required this.distributionUrl,
  }) : super(iosAppStoreId: '');
  final String distributionUrl;

  @override
  Future<String?> storeUrl() async => distributionUrl;
}
```

`FORCE_UPDATE_CLIENT_EXPR` becomes `NonStoreForceUpdateClient(fetchRequiredVersion: ..., distributionUrl:
DISTRIBUTION_URL_EXPR)` where `DISTRIBUTION_URL_EXPR` is whatever the user provides (Firebase App
Distribution invite link, TestFlight public link, internal MDM/enterprise install page). Ask for it
explicitly in Phase 0 follow-up if not already known.

State two caveats to the user:
- This path is **unadvertised** by the package (no test coverage upstream for it) — it works because the
  class isn't sealed, not because it's a documented extension point.
- If `DISTRIBUTION` was set to `non-store` but `APP_STORE_ID_DART_EXPR` still resolves to a non-empty value
  somewhere (e.g. left over from a prior INIT run), the override above makes it irrelevant for `storeUrl()`
  — but flag it anyway, since a stray non-empty `APP_STORE_ID` combined with the *default* (non-overridden)
  client would otherwise deep-link a TestFlight/enterprise build to a public App Store listing that may not
  exist. This is exactly why Phase 6 is a full subclass, not a conditional inside the default one.

---

## Phase 7 — Verification

```bash
flutter analyze
```

Smoke test: temporarily set the remote `required_version` (whichever source was chosen) above the current
`pubspec.yaml` version, run the app, confirm the alert appears. Then restore the real value — do not leave
a live remote source pointed at an inflated version.

Print the manual real-device checklist:

```
- [ ] iOS Simulator / Android Emulator: alert should appear if required_version > pubspec.yaml version.
      Tapping "Update Now" WILL fail to open a real store page — this is expected on a simulator and
      on an unpublished app; it is not a bug in this setup.
- [ ] Real device, once the app is published: confirm "Update Now" opens the correct store listing.
- [ ] Returning to the app without updating should re-show the alert (allowCancel=false), or allow
      dismissal and re-show on next launch (allowCancel=true).
```

---

## Phase 8 — Summary

Print, grouped:

### Files created
- List each new file with path.

### Files modified
- List each modified file with a one-line description.

### Packages added
- List each package and the command used.

### CI

`APP_STORE_ID` must reach release builds the same way it reaches local runs (`dart_defines.json` /
`.env`+`Env`) — a build missing it will never show the iOS alert, silently. If `REMOTE_SOURCE=backend`,
each deployed environment needs its own `REQUIRED_VERSION` set (see `references/release-playbook.md`).
This skill does not scaffold CI workflow files — state what CI must supply, nothing more.

### Checklist for the developer

- [ ] Create the gist(s) / Remote Config parameter / deploy the backend, per Phase 5's manual item
- [ ] Set the real `APP_STORE_ID` once the app exists in App Store Connect (find it under General → App
      Information)
- [ ] Smoke-test per Phase 7, then restore the real `required_version`
- [ ] Real-device test once published — see Phase 7 checklist
- [ ] Read `references/release-playbook.md` before the first release that relies on this

### References

- `skills/force-update-init/references/remote-sources.md` — Gist/Remote Config/Shelf tradeoffs and full
  source for each
- `skills/force-update-init/references/store-urls-and-env.md` — App Store ID lookup, URL formats, env
  wiring detail
- `skills/force-update-init/references/release-playbook.md` — how to actually trigger a force update in
  production, and the rolling-release-window limitation

---

## AUDIT branch (partial / complete projects)

Entered from Phase 0.2 when any force-update signal already exists.

1. Scan the project against this table:

   | Check | How | Why it matters |
   |---|---|---|
   | `iosAppStoreId` non-empty (or reads a non-empty env key) | Grep `ForceUpdateClient(` call site | `storeUrl()` is awaited **before** `isAppUpdateRequired()`; a blank ID returns `null` and the widget returns early — the version check never runs, no alert, no `onException`. Completely silent. Leads the table for this reason. |
   | Android `<queries>` intent present | `AndroidManifest.xml` | Missing it makes `url_launcher` fail silently when opening the store URL |
   | `navigatorKey` passed to `ForceUpdateWidget` and matches the `MaterialApp`/`GoRouter` key | main.dart / router file | Without it, the alert has no navigator to present into |
   | Widget is inside `MaterialApp.builder`, not `home` | main.dart | `home`-only placement means the widget isn't an ancestor of every route |
   | `fetchRequiredVersion` is not still a hardcoded literal (e.g. `() => Future.value('2.0.0')`) | Call site | Leftover TODO from initial scaffold — never actually wired to a remote source |
   | Every `Flavor` arm has a defined value (live or floor) | Remote source `switch` | An unhandled arm won't compile if new flavors were added later without updating the switch |
   | `allowCancel` matches stated intent | Call site vs. any prior decision on record | Silent UX drift if changed without discussion |
   | `package_info_plus` constraint conflict | `pubspec.yaml`/`pubspec.lock` | Same conflict as Phase 2.1, but on a project that already installed force_update_helper — check it didn't get resolved by pinning the *wrong* direction |
   | `upgrader` also present | `pubspec.yaml` | Two competing mechanisms — flag for migration, don't auto-remove either |

2. Emit a findings table:

   ```
   ## Audit Results — Force Update

   | Check | Pass/Fail | Note |
   |---|---|---|
   | APP_STORE_ID set | Fail | iosAppStoreId: '' at lib/main.dart:114 — alert silently never fires on iOS |
   | Android <queries> intent | Pass | |
   | navigatorKey wired | Pass | |
   | Widget in MaterialApp.builder | Pass | |
   | fetchRequiredVersion not a literal | Fail | Still returns Future.value('2.0.0') at lib/main.dart:109 |
   | Flavor arms all handled | Pass | |
   | allowCancel matches intent | Pass | |
   | package_info_plus conflict | Pass | |
   | upgrader also present | Pass | |

   **Summary**: 2 failing checks
   ```

   If nothing fails, say so explicitly: `No issues found. Force update setup matches the checklist.`

3. Ask which findings to fix (`all`, comma-separated, or `none`). For each selected:
   - Route through the matching phase above (e.g. a blank `APP_STORE_ID` is a Phase 0.6/3.2 fix, a missing
     `<queries>` intent is a Phase 3.1 fix) rather than re-deriving the logic here.
   - Apply only the confirmed fixes, show the diff for each.
4. If `upgrader` is also present, describe the migration (remove `UpgradeAlert`, keep
   `ForceUpdateWidget`) rather than doing it automatically — it's a product decision, not a mechanical fix.
5. Re-scan touched files only, confirm which findings resolved.

Never rewrite a working, unflagged part of the project just because the AUDIT branch touched a neighboring
file.

---

## Notes

- Paths inside this skill are relative to the **target Flutter project root**, not this toolkit repo.
- `upgrader` is documented, not implemented, by this skill — see `references/remote-sources.md` for the
  one-paragraph comparison to cite if asked why `force_update_helper` is the default.
- Rolling-release windows (a range of allowed versions, not a single floor) are **not** supported by
  `force_update_helper` — see `references/release-playbook.md`. Forking the package is the only path; this
  skill does not attempt it.
- Does not overlap with `sentry-init` (DSN/error-sink scaffolding) or `flutter-flavors` (flavor
  scaffolding) — this skill detects and adapts to both if present, and scaffolds a minimal fallback for
  either only when genuinely absent.
