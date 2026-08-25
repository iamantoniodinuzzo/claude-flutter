# Flavors on Flutter web

Flutter's own `--flavor` flag is Android/iOS/macOS-only. Web needs a separate workaround.

## Why `--flavor` doesn't work on web

`flutter run --flavor dev` on web only prints a warning and keeps working:

```
--flavor is only supported for Android, macOS, and iOS devices.
Flavor-related features may not function properly and could behave differently in a future release.
```

But `flutter build web --flavor dev` **fails outright**:

```
Could not find an option named "flavor".
```

So a build pipeline that "worked" during `flutter run` can still break the moment it moves to
`flutter build web`. Never assume web parity with mobile just because `run` didn't complain.

## The workaround: `--dart-define WEB_FLAVOR=<flavor>`

There are two ways to simulate flavors on web:

1. **Multiple entry points with a mutable global** — how `flutter_flavorizr` itself works
   internally. Relies on global state and only works if the project already has separate
   `main_*.dart` files.
2. **`--dart-define` + `String.fromEnvironment`** — more flexible, no mutable global, works
   whether or not multiple entry points exist. **This is the approach this skill uses.**

```bash
flutter run -d chrome --dart-define WEB_FLAVOR=dev -t lib/main_dev.dart
flutter build web --dart-define WEB_FLAVOR=dev -t lib/main_dev.dart
```

`getFlavor()` (see `references/dart-layer.md`) already reads `WEB_FLAVOR` via its `kIsWeb` branch
— no extra Dart code is needed once that function exists correctly. If it's missing the branch,
that's `FLAVOR-DART-02` in the AUDIT catalog: web silently resolves to the default flavor
regardless of what `WEB_FLAVOR` was passed.

## Combined run command (all platforms)

Since `--flavor` is simply ignored (with a warning) on web, and `WEB_FLAVOR` is simply ignored on
mobile, the same command line works everywhere:

```bash
flutter run --flavor dev --dart-define WEB_FLAVOR=dev -t lib/main_dev.dart
flutter run --flavor stg --dart-define WEB_FLAVOR=stg -t lib/main_stg.dart
flutter run --flavor prod --dart-define WEB_FLAVOR=prod -t lib/main_prod.dart
```

This is the form to put in IDE launch configs (`references/ide-config.md`) so a single
configuration per flavor/build-mode works regardless of which device the user picks.

## What's actually flavor-specific on web

Since native identity (app icon, bundle id) doesn't apply to a URL-deployed web app, web flavors
are purely about **Dart-side behavior**: which backend/API base URL to hit, which
analytics/error-monitoring project to report to, which feature flags are on. Everything reachable
through `getFlavor()` works identically to mobile once `WEB_FLAVOR` is wired up — there's no
separate web-specific API to learn beyond the define itself.
