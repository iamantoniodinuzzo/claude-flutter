# Store URLs, App Store ID, and Env Wiring

> Course shape (Andrea Bizzotto, *Flutter in Production*, "Force Update Strategies" module). Adapted to
> this toolkit's conventions — inline provenance, no upstream file to attribute.

---

## Where the App Store ID lives

The iOS app ID is only known **after** the app is created in App Store Connect — it cannot be invented or
guessed ahead of time. Find it under **App Store Connect → your app → General → App Information → General
Information**. It's a purely numeric string (e.g. `6482293361`), not the bundle ID.

For a brand-new app that doesn't exist in App Store Connect yet, there is no real ID to set — leave the
`APP_STORE_ID` key present but empty, and flag it as an outstanding checklist item rather than inventing a
placeholder that looks real.

## How the URL is built

```dart
Future<String?> storeUrl() async {
  if (kIsWeb) return null;
  if (defaultTargetPlatform == TargetPlatform.iOS) {
    return iosAppStoreId.isNotEmpty
        ? 'https://apps.apple.com/app/id$iosAppStoreId'
        : null;
  } else if (defaultTargetPlatform == TargetPlatform.android) {
    final packageInfo = await PackageInfo.fromPlatform();
    return 'https://play.google.com/store/apps/details?id=${packageInfo.packageName}';
  } else {
    return null;
  }
}
```

- **iOS**: built from the numeric `iosAppStoreId` — the only URL input `ForceUpdateClient` exposes.
- **Android**: built automatically from `PackageInfo.fromPlatform().packageName` — nothing to configure.

The Apple URL format `https://apps.apple.com/app/id<ID>` gets a 301 redirect to a localized form like
`https://apps.apple.com/us/app/<slug>/id<ID>` when opened — this is expected, app store listings are
localized per country code.

### Why compile-time beats a runtime lookup

The `upgrader` package offers an `ITunesSearchAPI` class that looks up the correct store URL at runtime
from the bundle ID. `force_update_helper` deliberately doesn't do this — a runtime lookup is one more
network call that can fail (what happens if it does, mid-force-update?). Setting `APP_STORE_ID` at compile
time removes that failure mode entirely, at the cost of one manual step after the app first exists in App
Store Connect.

### The silent-failure trap (why the AUDIT branch leads with this check)

`ForceUpdateWidget` awaits `storeUrl()` **before** `isAppUpdateRequired()`:

```dart
final storeUrl = await widget.forceUpdateClient.storeUrl();
if (storeUrl == null) {
  return; // <-- version check never runs. No alert. No onException. No log.
}
final updateRequired = await widget.forceUpdateClient.isAppUpdateRequired();
```

A blank `iosAppStoreId` on iOS makes `storeUrl()` return `null`, which short-circuits everything — the app
behaves exactly as if force update were never wired at all, and nothing in the console or crash reporting
says so. This is the single highest-value thing the AUDIT branch checks.

---

## Android — the `<queries>` intent

Required for `url_launcher` to successfully open `https://` URLs on Android 11+ (API 30+), which restricts
package visibility by default. Without it, `canLaunchUrl` can return `false` or `launchUrl` can silently
fail depending on device/OS version — another silent failure, same shape as the App Store ID one, just on
the other platform.

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

Placed as a sibling of `<application>`, inside `<manifest>`.

---

## `APP_STORE_ID` env wiring — ADR 0001 convention

This toolkit's default compile-time-constant convention (`docs/adr/0001-sentry-init-dsn-source-convention.md`)
is `dart_defines.json` + `--dart-define-from-file`, read via `const String.fromEnvironment(...)`.
`force-update-init` follows the same convention rather than introducing a second one — it is a
**consumer**, not an owner, of `dart_defines.json`; `sentry-init` remains the skill that scaffolds the file
from nothing.

### Default path — `dart_defines.json`

```json
{
  "APP_STORE_ID": "6482293361"
}
```

```dart
class Env {
  static String get appStoreId => const String.fromEnvironment('APP_STORE_ID');
}
```

Run with `flutter run --dart-define-from-file=dart_defines.json`.

### Detected alternative — `--dart-define` in `.vscode/launch.json` or a `Makefile`

If the target project already embeds other `--dart-define` values directly in `.vscode/launch.json`'s
`args` or a `Makefile` (rather than `dart_defines.json`), add `APP_STORE_ID` alongside them there instead
of introducing a second mechanism:

```json
"args": ["--dart-define=APP_STORE_ID=6482293361", "--dart-define=SENTRY_DSN=..."]
```

### Detected alternative — `.env`-per-flavor + `Env` class (the course's own shape)

If the target project already uses this shape (detected in Phase 0.6), adapt to it rather than migrating:

```
APP_STORE_ID=<your-app-store-id>
```

in each `.env.dev` / `.env.stg` / `.env.prod`, with:

```dart
class Env {
  static String get appStoreId => const String.fromEnvironment('APP_STORE_ID');
}
```

read via `flutter run --dart-define-from-file .env.<flavor>`.

### Never do this

Do not hardcode `APP_STORE_ID` as a bare Dart `const` in shared code. It isn't secret — the course notes
it's fine to see in a diff — but it's per-project, and a hardcoded literal is exactly the kind of value that
survives an unnoticed copy-paste between two projects (the course's own warning: "be careful when copy
pasting between projects!").

---

## Non-store distribution (Firebase App Distribution, TestFlight, enterprise)

`force_update_helper` has **no documented support** for this — its README never contemplates a distribution
channel other than the public stores, and on iOS it will happily build an App Store URL from a populated
`APP_STORE_ID` regardless of how the build was actually distributed. A TestFlight or enterprise build with
a non-empty `APP_STORE_ID` deep-links users to a public App Store listing that may not exist yet.

Because `ForceUpdateClient` is declared as a bare `class` (not `final`/`sealed`/`base`/`interface`), it can
be subclassed to override `storeUrl()` with an arbitrary destination — see Phase 6 of `SKILL.md` for the
scaffolded subclass. This path is unadvertised by the package (no upstream test coverage for it), which is
worth stating to the user, not hiding.
