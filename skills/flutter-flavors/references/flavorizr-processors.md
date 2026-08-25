# flutter_flavorizr — targeted processors

Baseline: `flutter_flavorizr: 2.6.0` (verify current via context7/`pub.dev` before pinning).
`.kts` Gradle files are supported since `2.3.0`; both `.gradle` and `.gradle.kts` projects work.

## The trap: never run it bare

```bash
dart run flutter_flavorizr        # ✗ do not run this
```

With no `-p` flag, flavorizr runs its **entire default processor set** — every platform, every
asset step, and critically `flutter:main`, which regenerates `lib/main.dart` from a template and
**deletes all existing app-initialization logic**:

```dart
// what main.dart becomes after a bare run — everything else is gone
import 'dart:async';
import 'package:flutter/material.dart';
import 'app.dart';

FutureOr<void> main() async {
  runApp(const App());
}
```

On a brand-new project this is harmless. On any existing project it silently destroys real code.
The fix if it happens: `git reset --hard HEAD && git clean -fd` (only works if Phase 2's safety
gate — a clean working tree — was honored first).

Always pass `-p <processor_1>,<processor_2>,...` and only include the processors actually needed.
Order matters — some processors depend on files created by earlier ones in the same list.

## Always pass `-f` too — the confirm prompt crashes outright without a terminal

Every flavorizr invocation asks `Do you want to proceed? (Y/n)` before running, reading from
stdin via a package (`mason_logger`) that first checks whether **stdout** is attached to a real
terminal. In any non-interactive shell — an agent's Bash tool, CI, a piped/redirected
invocation — that check fails immediately and the process crashes with an unhandled exception
(`Bad state: No terminal attached to stdout`) **before reading any input**, so piping `y` into
stdin does not help:

```
Do you want to proceed? (Y/n) Unhandled exception:
Bad state: No terminal attached to stdout.
Ensure a terminal is attached via "stdout.hasTerminal" before requesting input.
```

The fix is the undocumented `-f` / `--force` flag (confirmed against `flutter_flavorizr` source,
`lib/src/processors/processor.dart`), which skips the confirm entirely:

```bash
dart run flutter_flavorizr -f -p <processor_1>,<processor_2>,...
```

**Always include `-f` on every flavorizr invocation in this skill** — every command shown below
already does. Omitting it is the single most common way this skill would appear to "hang" or
fail with a cryptic Dart stack trace when driven by an agent rather than typed by hand in a real
terminal.

## Installing

```bash
dart pub add dev:flutter_flavorizr
flutter pub get
```

## The `flavorizr:` pubspec block

Appended at the end of `pubspec.yaml`. This is config, not a processor — flavorizr reads it every
time any processor runs:

```yaml
flavorizr:
  ide: "vscode"                    # or "idea" for Android Studio — see references/ide-config.md
  app:
    android:
      flavorDimensions: "flavor-type"

  flavors:
    dev:
      app:
        name: "App Dev"
      android:
        applicationId: "com.example.app.dev"
        icon: "assets/dev/app-icon.png"                      # optional
        adaptiveIcon:                                          # optional
          foreground: "assets/dev/app-icon-foreground.png"
          background: "assets/android/app-icon-background.png"
      ios:
        bundleId: "com.example.app.dev"
        icon: "assets/dev/app-icon.png"                       # optional

    stg:
      app:
        name: "App Stg"
      android:
        applicationId: "com.example.app.stg"
      ios:
        bundleId: "com.example.app.stg"

    prod:
      app:
        name: "App"
      android:
        applicationId: "com.example.app"     # unsuffixed — see FLAVOR-CFG-02
      ios:
        bundleId: "com.example.app"          # unsuffixed
```

`applicationId` is `snake_case` (Android convention), `bundleId` is `camelCase` (iOS convention) —
same underlying name, different casing, same flavor suffix. Find the existing production values
before writing this block:
- `applicationId`: `android/app/build.gradle.kts` → `defaultConfig.applicationId`
- `bundleId`: Xcode → Runner → General → Identity → Bundle Identifier (or infer camelCase from
  `applicationId` if no Mac is available)

**Never suffix the production flavor's identifiers if the app is already published** — app stores
use these as the app's permanent identity.

## Android processors

```bash
dart run flutter_flavorizr -f -p android:buildGradle,android:flavorizrGradle,android:androidManifest,android:icons
```

| Processor | What it touches |
|---|---|
| `android:buildGradle` | `android/app/build.gradle.kts` — adds `apply { from("flavorizr.gradle.kts") }` (or equivalent include) |
| `android:flavorizrGradle` | Creates `android/app/flavorizr.gradle.kts` with `flavorDimensions` + `productFlavors` (each flavor gets `applicationId` and a `resValue(type = "string", name = "app_name", value = "...")`) |
| `android:androidManifest` | `android/app/src/main/AndroidManifest.xml` — sets `android:label="@string/app_name"` so the manifest resolves the per-flavor `app_name` resource. **Output is minified** (all attributes inlined on one line) — reformat with the XML Tools VSCode extension (`"xmlTools.splitAttributesOnFormat": true` in settings, then `SHIFT+OPTION+F`) so the diff is reviewable |
| `android:icons` | Resizes and copies flavor icons into `android/app/src/<flavor>/res/mipmap-*/` — only runs anything if `icon`/`adaptiveIcon` paths are set in the `flavorizr:` block |

Sample `flavorizr.gradle.kts` output:

```kotlin
import com.android.build.gradle.AppExtension

val android = project.extensions.getByType(AppExtension::class.java)

android.apply {
    flavorDimensions("flavor-type")

    productFlavors {
        create("dev") {
            dimension = "flavor-type"
            applicationId = "com.example.app.dev"
            resValue(type = "string", name = "app_name", value = "App Dev")
        }
        // ...stg, prod
    }
}
```

Run after: `flutter run --flavor dev`. Verify the app name shown on the device matches the flavor.

## iOS processors

**Prerequisite gate** — check before running any `ios:*` processor: Ruby, Gem, and the
`xcodeproj` gem must be installed (per [flutter_flavorizr prerequisites](https://pub.dev/packages/flutter_flavorizr#prerequisites)).
If any is missing, skip this section entirely and fall back to `references/manual-ios.md`.

```bash
dart run flutter_flavorizr -f -p assets:download,assets:extract,ios:podfile,ios:xcconfig,ios:buildTargets,ios:schema,ios:plist,ios:dummyAssets,ios:icons,assets:clean
```

| Processor | What it touches |
|---|---|
| `assets:download` / `assets:extract` | Downloads a template asset bundle (dummy icons/launch images) needed by `ios:dummyAssets` and `ios:icons` — required, not optional, on first run |
| `ios:podfile` | `ios/Podfile` — adds all 9 build-mode × flavor combinations (`Debug-dev`, `Profile-dev`, `Release-dev`, ... `Release-prod`) mapped to `:debug`/`:release` |
| `ios:xcconfig` | Creates 9 files under `ios/Flutter/`: `<flavor>Debug.xcconfig`, `<flavor>Profile.xcconfig`, `<flavor>Release.xcconfig` — each sets `ASSET_PREFIX`, `BUNDLE_NAME`, `BUNDLE_DISPLAY_NAME` |
| `ios:buildTargets` | `ios/Runner.xcodeproj/project.pbxproj` — adds the 9 build configurations. Never hand-patch this file directly; it's largely generated |
| `ios:schema` | Creates 3 shared `.xcscheme` files under `ios/Runner.xcodeproj/xcshareddata/xcschemes/` (`dev.xcscheme`, `stg.xcscheme`, `prod.xcscheme`), one per flavor |
| `ios:plist` | `ios/Runner/Info.plist` — sets `CFBundleDisplayName`/`CFBundleName` to `$(BUNDLE_DISPLAY_NAME)`/`$(BUNDLE_NAME)` (the flavorizr xcconfig variable names — the manual path in `references/manual-ios.md` uses a differently-named variable, `APP_DISPLAY_NAME`; don't mix the two) |
| `ios:dummyAssets` | Populates placeholder per-flavor icon sets in `Assets.xcassets` — **required before `ios:icons`**, that processor depends on it |
| `ios:icons` | Replaces the dummy assets with the real flavor icons from the `flavorizr:` block's `icon`/`adaptiveIcon` paths — no-op if those paths aren't set |
| `assets:clean` | Removes the temporary downloaded template bundle |

`ios:icons` **depends on** `ios:dummyAssets` having already run in the same or an earlier
invocation — always list `ios:dummyAssets` before `ios:icons`.

Sample xcconfig (`ios/Flutter/devDebug.xcconfig`):

```
#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.debug.xcconfig"
#include "Generated.xcconfig"

ASSET_PREFIX=dev
BUNDLE_NAME=App Dev
BUNDLE_DISPLAY_NAME=App Dev
```

Run after: `flutter run --flavor dev`, verify app name/icon on the simulator/device, then check
Xcode → scheme dropdown shows `dev`/`stg`/`prod` alongside the default `Runner` scheme.

## macOS (out of scope for this skill)

`flutter_flavorizr` does support macOS (`macos:podfile,macos:xcconfig,macos:configs,
macos:buildTargets,macos:schema,macos:plist,macos:dummyAssets,macos:icons`, requires
`flutter create . --platform macos --org <org>` first and `flavorizr: 2.4.0`+ for a fixed macOS
processor bug). Not covered by this skill — see `SKILL.md` Notes for the scope boundary.

## Regenerating after a partial run

If a processor list was interrupted or a flavor was added later, re-running the same targeted
list is safe — flavorizr processors are largely idempotent (they overwrite their own output, not
unrelated files). The one exception: `ios:buildTargets` against a `pbxproj` that already has
manually-added configurations can produce duplicates — inspect the diff before committing.
