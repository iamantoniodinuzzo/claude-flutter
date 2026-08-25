# Dart layer — entry points and flavor detection

## Single vs. multiple entry points

A single `main.dart` with runtime `appFlavor` detection is enough for most apps — flavors only
change native identity (app name, icon, bundle id) and the Dart code reacts to `appFlavor` at
runtime via `getFlavor()` below.

**Multiple entry points are required, not optional, when Firebase is in scope.** Each flavor
needs a distinct `firebase_options_<flavor>.dart` (see `references/firebase-flavors.md`), and the
only way to guarantee only the *correct* one gets imported and compiled into a given build is to
give each flavor its own `main_<flavor>.dart` that imports just its own options file. A
runtime `switch` over `getFlavor()` importing all three `firebase_options_*.dart` files still
compiles and bundles every one of them — tree-shaking doesn't eliminate an unreached `import`,
only unreached code — which means dev/staging Firebase project details ship inside the production
binary too. Multiple entry points are the only setup that avoids this.

## Converting `main.dart` to `runMainApp()`

Rename the existing `main()` to `runMainApp()`, changing its signature to `Future<void>`, and
preserve every line of existing logic inside it — this is purely a rename plus a signature change,
not a rewrite:

```dart
// before
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // ...existing init...
  runApp(const MyApp());
}

// after
Future<void> runMainApp() async {
  WidgetsFlutterBinding.ensureInitialized();
  // ...existing init, unchanged...
  runApp(const MyApp());
}
```

Verify nothing was dropped by diffing line-by-line against the original — this is the single
highest-risk edit in the whole skill (`FLAVOR-DART-03`, `autofix_safe: false` in the catalog for
exactly this reason).

## Entry point files

Create `lib/main_<flavor>.dart` per flavor:

```dart
import 'main.dart';

// * Entry point for the dev flavor
void main() async {
  await runMainApp();
}
```

(Repeat for every flavor, substituting the comment and nothing else — the body is identical unless
Firebase is in scope, see `references/firebase-flavors.md` for the variant that passes
`firebaseOptions`.)

## Running with multiple entry points

Once `lib/main.dart` no longer defines `main()`, the `-t` flag is **mandatory**:

```bash
flutter run --flavor dev -t lib/main_dev.dart
flutter run --flavor stg -t lib/main_stg.dart
flutter run --flavor prod -t lib/main_prod.dart
```

Omitting `-t` makes Flutter default to `lib/main.dart`, which has no `main()` anymore. The app
hangs on the splash screen and the console shows:

```
[ERROR:flutter/runtime/dart_isolate.cc(146)] Could not prepare isolate.
[ERROR:flutter/runtime/runtime_controller.cc(557)] Could not create root isolate.
[ERROR:flutter/shell/common/shell.cc(668)] Could not launch engine with configuration.
```

If a user reports this failure mode later, this is almost certainly the cause — check IDE launch
configs (`references/ide-config.md`) first, since a missing `program`/`-t` there reproduces it
exactly.

## `getFlavor()` — the runtime flavor detector

Create `lib/env/flavor.dart` (or wherever the project keeps environment/config code):

```dart
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

enum Flavor { dev, stg, prod }

/// Global function to return the current flavor
Flavor getFlavor() {
  // * On iOS/Android, appFlavor is supported and set with the --flavor option
  // * On web, appFlavor is not supported so we read a separate WEB_FLAVOR
  // * variable and set it with --dart-define WEB_FLAVOR=dev|stg|prod
  const webFlavor = String.fromEnvironment('WEB_FLAVOR');
  const flavor = kIsWeb ? webFlavor : appFlavor;
  return switch (flavor) {
    'prod' => Flavor.prod,
    'stg' => Flavor.stg,
    'dev' => Flavor.dev,
    null || '' => Flavor.dev, // * if not specified or empty, default to dev
    _ => throw UnsupportedError('Invalid flavor: $flavor'),
  };
}
```

`appFlavor` comes from `package:flutter/services.dart` and is only ever populated by the
`--flavor` CLI flag on iOS/Android/macOS — it is always `null`/unset on web, which is exactly why
the `kIsWeb` branch exists (see `references/web-flavors.md` for the full web story). Both branches
must exist — a `getFlavor()` missing the `kIsWeb` check silently resolves to `Flavor.dev` on every
web build regardless of what `WEB_FLAVOR` was passed (`FLAVOR-DART-02`).

Keep the `enum Flavor` values in exact sync with the native flavor names (Android
`productFlavors`, iOS xcconfig prefixes) — a mismatch (`FLAVOR-DART-04`) means the app compiles
fine but every `switch (getFlavor())` in the app silently mishandles the case whose name diverged.

## Reading flavor-derived values elsewhere

Once `getFlavor()` exists, any code needing flavor-specific behavior calls it directly:

```dart
switch (getFlavor()) {
  case Flavor.prod:
    // production-only behavior
  case Flavor.stg:
  case Flavor.dev:
    // ...
}
```

For the flavor-driven **app name** specifically (as opposed to arbitrary custom logic), prefer
reading it from the platform via [`package_info_plus`](https://pub.dev/packages/package_info_plus)
rather than hardcoding it a second time in Dart — it's already the single source of truth set by
the native `resValue`/`xcconfig` flavor config:

```dart
final packageInfo = await PackageInfo.fromPlatform();
print(packageInfo.appName);
```
