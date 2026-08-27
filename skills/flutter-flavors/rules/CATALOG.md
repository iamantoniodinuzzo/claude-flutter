# Flutter Flavors — Rule Catalog

Each rule has: ID, severity, source doc, detection heuristic, fix hint, and whether auto-fix is
safe (`autofix_safe`). The AUDIT branch of `SKILL.md` scans using this catalog.

`autofix_safe: true` is reserved for changes that cannot corrupt a native project identity or
break a working release: generated Dart files, IDE JSON/XML config, and empty source-set
directories. Anything that touches `applicationId`/`bundleId` of an already-shipped flavor, or the
iOS `pbxproj`, is `autofix_safe: false` regardless of how mechanical the fix looks — a wrong
guess there is expensive to undo.

---

## Config rules

### FLAVOR-CFG-01
- **Severity**: error
- **Source**: `references/flavorizr-processors.md`
- **What**: `pubspec.yaml` has no `flavorizr:` block, or the block is missing one of the flavors
  that has native evidence elsewhere (e.g. `android/app/src/stg/` exists but `stg` is absent from
  `flavorizr:`).
- **Heuristic**: parse `pubspec.yaml` for a top-level `flavorizr:` key; diff its `flavors:` list
  against the flavor names found by Phase 0 detection (Android source sets, iOS xcconfig prefixes,
  `main_*.dart` suffixes). Flag any name present in native evidence but absent from the block.
- **Fix**: add the missing flavor entry to `flavorizr:` with `app.name`, `android.applicationId`,
  `ios.bundleId` inferred from the sibling flavors' naming pattern; ask the user to confirm values
  before writing.
- **autofix_safe**: false (requires user-confirmed identifiers)

### FLAVOR-CFG-02
- **Severity**: error
- **Source**: `references/flavorizr-processors.md`
- **What**: the production flavor's `applicationId` or `bundleId` carries a `.prod`/`-prod` suffix
  (or any suffix at all) on a project with evidence of a prior release (a `CHANGELOG.md` with a
  released version, or a version code in `pubspec.yaml` > `1.0.0+1`). App stores use this
  identifier as the app's permanent identity — changing it on an already-published app effectively
  publishes a new, unrelated app and abandons all existing installs and reviews.
- **Heuristic**: in the `prod` (or last-listed) flavor entry, flag `applicationId`/`bundleId`
  values that differ from the unsuffixed identifier found in
  `android/app/build.gradle.kts` → `defaultConfig.applicationId` (pre-flavor) or that end in a
  flavor-like token.
- **Fix**: never auto-apply. Surface the discrepancy and ask the user to confirm which identifier
  is the real, already-published one.
- **autofix_safe**: false

### FLAVOR-CFG-03
- **Severity**: warning
- **Source**: `references/flavorizr-processors.md`
- **What**: `applicationId` (Android) and `bundleId` (iOS) for the same flavor don't follow the
  expected naming correspondence — `applicationId` should be `snake_case`
  (`com.example.my_app.dev`), `bundleId` should be `camelCase`
  (`com.example.myApp.dev`) of the same underlying name, and both should carry the *same* flavor
  suffix.
- **Heuristic**: for each flavor entry, normalize both ids (strip dots, lowercase) and compare;
  flag when the flavor suffix present on one side is absent or different on the other
  (e.g. `applicationId` has `.stg` but `bundleId` has no suffix).
- **Fix**: point out the mismatch with both values shown; ask the user which is correct.
- **autofix_safe**: false

---

## Android rules

### FLAVOR-AND-01
- **Severity**: error
- **Source**: `references/manual-android.md`
- **What**: `android/app/build.gradle.kts` declares flavors in `pubspec.yaml`'s `flavorizr:` block
  (or `lib/main_*.dart` exist) but has no `productFlavors { ... }` block.
- **Heuristic**: grep `android/app/build.gradle.kts` for `productFlavors`. Absent while other
  flavor signals exist → flag at the `android { ... }` block's opening line.
- **Fix**: run the targeted Android flavorizr processors (Phase 3, Branch A) or write the manual
  `productFlavors` block (Phase 3, Branch B) from the flavor list already established elsewhere in
  the project.
- **autofix_safe**: false (writes build-critical native config)

### FLAVOR-AND-02
- **Severity**: error
- **Source**: `references/manual-android.md`
- **What**: `productFlavors` exists but `flavorDimensions` is missing, or a flavor inside
  `productFlavors` isn't assigned a `dimension`. Gradle refuses to build without this.
- **Heuristic**: if `productFlavors { ... }` is present, require a sibling `flavorDimensions(...)`
  call and a `dimension = "..."` (or equivalent) line inside every flavor block. Flag whichever is
  missing.
- **Fix**: add `flavorDimensions("flavor-type")` (or the project's existing dimension name) and/or
  `dimension = "flavor-type"` to each flavor block.
- **autofix_safe**: true (mechanical, no identifier ambiguity)

### FLAVOR-AND-03
- **Severity**: warning
- **Source**: `references/manual-android.md`
- **What**: `AndroidManifest.xml`'s `<application android:label="...">` is a hardcoded string
  instead of `@string/app_name`, so all flavors show the same app name regardless of the
  per-flavor `resValue` declared in `productFlavors`.
- **Heuristic**: in `android/app/src/main/AndroidManifest.xml`, flag `android:label="<literal
  text>"` (not `@string/app_name`).
- **Fix**: replace with `android:label="@string/app_name"` and ensure each flavor block in
  `productFlavors` sets `resValue(type = "string", name = "app_name", value = "...")`.
- **autofix_safe**: true (single attribute swap, reversible)

### FLAVOR-AND-04
- **Severity**: error
- **Source**: `references/manual-android.md`
- **What**: a flavor declared in `productFlavors` (or `flavorizr:`) has no matching
  `android/app/src/<flavor>/` source set directory, so flavor-specific resources
  (icons, `google-services.json`, strings) have nowhere to live.
- **Heuristic**: for each flavor name in `productFlavors`/`flavorizr:`, check
  `android/app/src/<flavor>/` exists. Flag missing ones.
- **Fix**: create the empty directory (and `AndroidManifest.xml` stub if the project pattern
  requires per-flavor manifests).
- **autofix_safe**: true (empty directory creation)

---

## iOS rules

### FLAVOR-IOS-01
- **Severity**: error
- **Source**: `references/manual-ios.md`
- **What**: a flavor is missing one or more of its three `.xcconfig` files
  (`<flavor>Debug.xcconfig`, `<flavor>Profile.xcconfig`, `<flavor>Release.xcconfig`) under
  `ios/Flutter/`.
- **Heuristic**: for each known flavor, check all three files exist. Flag whichever subset is
  missing, per flavor.
- **Fix**: generate the missing file(s) from the pattern of an existing complete flavor's
  xcconfig triplet, substituting the flavor name and identifiers.
- **autofix_safe**: false (build-critical, easy to get subtly wrong)

### FLAVOR-IOS-02
- **Severity**: error
- **Source**: `references/manual-ios.md`
- **What**: a flavor has no `.xcscheme` under
  `ios/Runner.xcodeproj/xcshareddata/xcschemes/`, or the scheme exists only in the user-local
  (non-shared) location, so CI and other teammates can't see it.
- **Heuristic**: check `ios/Runner.xcodeproj/xcshareddata/xcschemes/<flavor>.xcscheme` exists for
  every flavor. A scheme found only under `xcuserdata/` counts as missing for this rule.
- **Fix**: generate the shared scheme, or instruct the user to open Xcode, mark the scheme
  "Shared", and commit it — scheme generation from raw XML is fragile enough to prefer the manual
  Xcode step here.
- **autofix_safe**: false

### FLAVOR-IOS-03
- **Severity**: warning
- **Source**: `references/manual-ios.md`, `references/flavorizr-processors.md`
- **What**: `ios/Runner/Info.plist`'s `CFBundleName`/`CFBundleDisplayName` is a hardcoded string
  instead of a build variable, so all flavors show the same app name on the iOS home screen. The
  expected variable name depends on which path built this project: `$(APP_DISPLAY_NAME)` for the
  manual path, `$(BUNDLE_NAME)`/`$(BUNDLE_DISPLAY_NAME)` for the flavorizr path — check which
  convention the project's `.xcconfig`/build settings already establish before flagging.
- **Heuristic**: flag `<key>CFBundleName</key>` (or `CFBundleDisplayName`) followed by a literal
  `<string>` value that isn't one of the two recognized variable forms above.
- **Fix**: replace the literal with the project's existing convention (`$(APP_DISPLAY_NAME)` or
  `$(BUNDLE_NAME)`/`$(BUNDLE_DISPLAY_NAME)`) and ensure the matching build setting/xcconfig entry
  is defined per flavor. Never introduce the second convention into a project already using the
  other one.
- **autofix_safe**: true (single plist value swap)

### FLAVOR-IOS-04
- **Severity**: error
- **Source**: `references/manual-ios.md`
- **What**: the Xcode project's build configurations (in `project.pbxproj`) don't have one
  Debug/Profile/Release triplet per flavor, so `flutter build ios --flavor <f>` has no matching
  configuration to select.
- **Heuristic**: grep `project.pbxproj` for `buildConfigurationList` entries and confirm a
  `<Flavor>-Debug`/`<Flavor>-Profile`/`<Flavor>-Release` triplet exists per known flavor.
- **Fix**: never hand-patch `pbxproj` directly — it's a fragile, largely-generated file. Point the
  user to re-run the flavorizr iOS processors (`ios:buildTargets`), or to Xcode's own "Duplicate
  Configuration" UI for a from-scratch manual setup.
- **autofix_safe**: false

---

## Dart-layer rules

### FLAVOR-DART-01
- **Severity**: error
- **Source**: `references/dart-layer.md`
- **What**: no `getFlavor()` function (or equivalent `enum Flavor` + resolver) exists anywhere in
  `lib/`, even though native flavor config exists — the app has no runtime way to know which
  flavor it's running as.
- **Heuristic**: grep `lib/` for `Flavor` enum declaration and a function named `getFlavor` (or a
  provider/getter with an equivalent contract). Flag absence when Phase 0 found native flavor
  evidence.
- **Fix**: generate `lib/env/flavor.dart` per the template in `SKILL.md` Phase 4.
- **autofix_safe**: true (new, additive file; doesn't touch existing logic)

### FLAVOR-DART-02
- **Severity**: error
- **Source**: `references/web-flavors.md`
- **What**: `getFlavor()` exists but reads only `appFlavor`, with no `kIsWeb`/`WEB_FLAVOR` branch —
  on web the app silently always resolves to the default flavor regardless of what
  `--dart-define WEB_FLAVOR=...` was passed.
- **Heuristic**: in the file declaring `getFlavor()`, require both a reference to `kIsWeb` and a
  `String.fromEnvironment('WEB_FLAVOR')` (or equivalently named) read. Flag if either is missing
  while the project has web enabled (`web/` directory present).
- **Fix**: rewrite `getFlavor()` to the reference implementation in `SKILL.md` Phase 4 / `flutter/
  foundation.dart` `kIsWeb` branch.
- **autofix_safe**: true (isolated function body, verifiable by re-reading the switch arms)

### FLAVOR-DART-03
- **Severity**: error
- **Source**: `references/dart-layer.md`
- **What**: `lib/main_<flavor>.dart` files are missing for one or more known flavors, or
  `lib/main.dart` still defines `main()` directly (never renamed to `runMainApp()`) while
  `main_*.dart` files exist elsewhere and call a `runMainApp()` that doesn't exist — a broken
  half-migration.
- **Heuristic**: if any `lib/main_*.dart` exists, require: (a) one per known flavor, (b)
  `lib/main.dart` defines `Future<void> runMainApp()` and does **not** define a bare `void
  main()`. Flag whichever half is inconsistent.
- **Fix**: complete the migration per `SKILL.md` Phase 4 — generate missing entry-point files,
  or rename `main()` → `runMainApp()` preserving all existing logic.
- **autofix_safe**: false (touches `main.dart`'s init logic; a careless rename can silently drop
  code — always show the full diff for confirmation)

### FLAVOR-DART-04
- **Severity**: warning
- **Source**: `references/dart-layer.md`
- **What**: the flavor names inside the Dart `enum Flavor { ... }` diverge from the flavor names
  declared in `pubspec.yaml`'s `flavorizr:` block or the native `productFlavors`/xcconfig set —
  e.g. native has `dev/stg/prod` but the Dart enum has `dev/staging/production`.
- **Heuristic**: diff the enum's value names (normalized) against the canonical flavor list from
  Phase 0 detection.
- **Fix**: align the enum names to match native exactly, updating the `switch` arms in
  `getFlavor()` accordingly.
- **autofix_safe**: true (rename within a single file, mechanical)

---

## IDE rules

### FLAVOR-IDE-01
- **Severity**: warning
- **Source**: `references/ide-config.md`
- **What**: `.vscode/launch.json` is missing configurations for one or more flavors/build-modes, or
  an existing configuration's `args` lacks `--dart-define WEB_FLAVOR=<flavor>` (when web is in
  scope) or its `program` doesn't point at the matching `lib/main_<flavor>.dart`.
  Running with a wrong `program` from the IDE reproduces the `Could not prepare isolate` hang.
- **Heuristic**: parse `.vscode/launch.json`'s `configurations` array. For each known flavor ×
  {Debug, Profile, Release}, require one entry with `--flavor <f>` in `args`, `program` set to
  `lib/main_<f>.dart` (if multiple entry points are in use), and (if web is in scope) a `--dart-
  define WEB_FLAVOR=<f>` pair. Flag missing entries and malformed existing ones by index.
- **Fix**: regenerate the missing/malformed entries following the template in `SKILL.md` Phase 6.
- **autofix_safe**: true (JSON config, no native build impact, easy to re-diff)

### FLAVOR-IDE-02
- **Severity**: warning
- **Source**: `references/ide-config.md`
- **What**: `.idea/runConfigurations/` only has Debug configurations per flavor (the
  `ide:config` processor's known limitation) — Profile and Release configurations, and web
  `additionalArgs`, were never added by hand.
- **Heuristic**: for each known flavor, check for `<flavor>_debug.xml`, `<flavor>_profile.xml`,
  and `<flavor>_release.xml` under `.idea/runConfigurations/`. Flag whichever are missing.
- **Fix**: generate the missing XML files from the existing Debug configuration's structure,
  swapping `buildFlavor`, `additionalArgs`, and adjusting the run mode.
- **autofix_safe**: true (IDE-local config, not part of the shipped app)

---

## Firebase rules

### FLAVOR-FB-01
- **Severity**: error
- **Source**: `references/firebase-flavors.md`
- **What**: `firebase_core` is in `pubspec.yaml` but one or more flavors has no
  `lib/firebase_options_<flavor>.dart`.
- **Heuristic**: if `firebase_core:` is in `pubspec.yaml` dependencies, require
  `lib/firebase_options_<flavor>.dart` for every known flavor. Flag missing ones.
- **Fix**: cannot be auto-generated (requires `flutterfire configure` against a real, logged-in
  Firebase project). Emit the `flutterfire-config.sh` invocation for the missing flavor and stop.
- **autofix_safe**: false (requires live Firebase credentials)

### FLAVOR-FB-02
- **Severity**: error
- **Source**: `references/firebase-flavors.md`
- **What**: `google-services.json` exists at `android/app/google-services.json` (the pre-flavor,
  single-app location) instead of per-flavor under `android/app/src/<flavor>/google-services.json`
  — the Android build will use the same Firebase project for every flavor.
- **Heuristic**: flag existence of `android/app/google-services.json` when
  `android/app/src/<flavor>/` source sets exist. Flag absence of
  `android/app/src/<flavor>/google-services.json` for any known flavor.
- **Fix**: move/regenerate per flavor via the `flutterfire-config.sh` script (Phase 7); do not
  simply copy the single file into every flavor directory — that connects every flavor to the same
  Firebase project, defeating the purpose.
- **autofix_safe**: false

### FLAVOR-FB-03
- **Severity**: error
- **Source**: `references/firebase-flavors.md`
- **What**: `GoogleService-Info.plist` is not split per flavor under
  `ios/flavors/<flavor>/GoogleService-Info.plist` (or the project's equivalent per-flavor iOS
  Firebase config path).
- **Heuristic**: mirror of `FLAVOR-FB-02` for iOS — flag a single non-flavored
  `ios/Runner/GoogleService-Info.plist` when iOS flavors exist, and flag missing per-flavor copies.
- **Fix**: same as `FLAVOR-FB-02` — regenerate via `flutterfire-config.sh`, don't copy.
- **autofix_safe**: false

### FLAVOR-FB-04
- **Severity**: error
- **Source**: `references/firebase-flavors.md`
- **What**: the `com.google.gms.google-services` Gradle plugin is missing from
  `android/settings.gradle.kts` and/or `android/app/build.gradle.kts` — Android Firebase init
  fails at build time even if `google-services.json` is present.
- **Heuristic**: grep both files for `com.google.gms.google-services`. Flag whichever file is
  missing it.
- **Fix**: add the plugin block in both files per `references/firebase-flavors.md`.
- **autofix_safe**: true (additive plugin declaration, standard pattern)

### FLAVOR-FB-05
- **Severity**: warning
- **Source**: `references/firebase-flavors.md`
- **What**: `ios/Podfile` (or `macos/Podfile` if macOS is supported) declares a platform version
  below the Firebase-required minimum (`16.0` for iOS, `10.14` for macOS) — `pod install` or the
  build will fail once Firebase pods are added.
- **Heuristic**: parse `platform :ios, '<version>'` / `platform :osx, '<version>'`; flag if below
  threshold or commented out (no explicit platform line at all counts as "below threshold").
- **Fix**: set/uncomment the platform line to the minimum version, then note that `cd ios && pod
  install` must be re-run.
- **autofix_safe**: true (single line edit; the follow-up `pod install` is left for the user to run)

### FLAVOR-FB-06
- **Severity**: error
- **Source**: `references/firebase-flavors.md`
- **What**: an entry point (`lib/main_<flavor>.dart`) doesn't import the matching
  `firebase_options_<flavor>.dart` or doesn't pass `DefaultFirebaseOptions.currentPlatform` into
  `runMainApp` — that flavor initializes Firebase with the wrong project's options (or none at
  all), typically silently pointing dev traffic at whatever `firebase_options.dart` happens to be
  the default.
- **Heuristic**: for each `lib/main_<flavor>.dart`, when `firebase_options_<flavor>.dart` exists,
  require an import of it and a call passing `DefaultFirebaseOptions.currentPlatform` (or an
  equivalent named argument) into `runMainApp`.
- **Fix**: patch the entry point per the template in `SKILL.md` Phase 7 step 5.
- **autofix_safe**: false (silent misconfiguration risk if the wrong flavor's options get wired
  to the wrong entry point — always show the diff for confirmation)

---

## Git safety rule

### FLAVOR-GIT-01
- **Severity**: error
- **Source**: `SKILL.md` Phase 2
- **What**: the working tree is not clean (`git status --porcelain` is non-empty) immediately
  before any operation in Phase 3 onward that can touch many files at once (flavorizr processors,
  bulk manual native patches).
- **Heuristic**: `git status --porcelain` returns any output.
- **Fix**: none offered by this skill — this is a hard stop, not a fix target. Ask the user to
  commit or stash, then re-run.
- **autofix_safe**: false (never auto-commit or auto-stash the user's uncommitted work)
