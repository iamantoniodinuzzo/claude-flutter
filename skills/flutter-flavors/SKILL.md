---
name: flutter-flavors
description: Initialize flavors (dev/stg/prod) in a Flutter project, or audit and fix an existing partial/broken flavor setup — Android (build.gradle.kts, AndroidManifest), iOS (xcconfig, xcscheme, Info.plist), Web (--dart-define WEB_FLAVOR workaround), multiple entry points (main_*.dart), IDE config (VSCode launch.json, Android Studio .idea/runConfigurations), and optional multi-project Firebase (flutterfire configure per flavor). Detects project state first and branches into an INIT flow (flutter_flavorizr with targeted processors, or manual fallback) or an AUDIT+FIX flow against a bundled rule catalog. Use proactively when the user says "aggiungi flavor a questa app", "inizializza flavors", "setup dev/stg/prod", "flutter_flavorizr", "audit flavors", "i miei flavor sono rotti", "add flavors to this Flutter app", "set up flavors", "fix my flavor setup", "flavor configuration is broken", or asks to distinguish flavors from dart-defines.
user-invocable: true
---

# Flutter Flavors

Adds `dev`/`stg`/`prod` (or custom) flavors to a Flutter project, or audits and repairs an existing
flavor setup that is partial or broken. Never runs `dart run flutter_flavorizr` bare — the bare
command overwrites `lib/main.dart` and silently destroys all app-initialization logic. Every native
change goes through targeted processors or hand-written patches, never a full regenerate.

## Rule and reference sources

Rules for the AUDIT branch are bundled in `skills/flutter-flavors/rules/CATALOG.md`.
Deep how-to context for the INIT branch is bundled in `skills/flutter-flavors/references/`.
This skill does not delegate to `ai_toolkit/` — it is self-contained.

Version baselines cited below (`flutter_flavorizr: 2.6.0`, `flutterfire_cli: 1.4.1`) are the
latest verified on pub.dev at the time this skill was written — verify current versions via
context7 or `pub.dev` before pinning a version in the target project's `pubspec.yaml`.

---

## Phase 0 — Detect & classify

**Goal**: know the project's actual flavor state before asking a single question or touching a file.

Read `pubspec.yaml` and grep the project for, recording found/missing for each:

| Signal | Where |
|---|---|
| `flavorizr:` block | `pubspec.yaml` |
| `productFlavors` / `flavorDimensions` | `android/app/build.gradle.kts` |
| Per-flavor source sets | `android/app/src/<flavor>/` |
| Per-flavor xcconfig | `ios/Flutter/*.xcconfig` |
| Per-flavor scheme | `ios/**/xcshareddata/xcschemes/*.xcscheme` |
| Multiple entry points | `lib/main_*.dart` |
| Flavor enum / getter | `getFlavor()` or `enum Flavor` anywhere in `lib/` |
| VSCode launch config | `.vscode/launch.json` |
| Android Studio run config | `.idea/runConfigurations/` |
| Firebase | `firebase_core` in `pubspec.yaml` |

**Monorepo hard gate**: if `melos.yaml` exists at the root, or the root `pubspec.yaml` has a
`workspace:` key, stop immediately:

```
✗ This project is a Melos/pub workspace monorepo.
  flutter-flavors targets a single Flutter app root and does not yet resolve which
  package to flavor. Point it directly at the app package root instead
  (e.g. apps/<name>/), or treat this as a separate effort.
```

Classify the project:
- **NONE** — no signal found at all → **INIT branch** (Phase 1 onward).
- **PARTIAL or COMPLETE** — at least one signal found → **AUDIT branch** (jump to
  [AUDIT branch](#audit-branch-partial--complete-projects) below).

Print the detection matrix before proceeding either way — the user should see what was found,
not just the resulting branch choice.

---

## Phase 1 — Intake (INIT branch only)

**Goal**: settle every decision that isn't safely inferable, before writing anything. This is the
core of the skill — a wrong answer here (especially on `applicationId`/`bundleId`) is expensive to
undo once builds have shipped.

Ask, with explicit defaults, using `AskUserQuestion` where the options are enumerable:

1. **Flavor names** — default `dev`, `stg`, `prod`. Confirm the list and order.
2. **App name per flavor** — e.g. `Flutter Ship Dev`, `Flutter Ship Stg`, `Flutter Ship`.
3. **`applicationId`** (Android, snake_case, from `android/app/build.gradle.kts` →
   `defaultConfig.applicationId`) and **`bundleId`** (iOS, camelCase, from Xcode →
   Runner → General → Identity, or infer camelCase from the existing `applicationId` if the user
   has no Mac) per flavor.
   **Hard rule, state it explicitly and get an explicit yes**: if this app is already published,
   its production `applicationId`/`bundleId` must stay **byte-for-byte unchanged** — app stores
   use it as the app's permanent identity. Only `dev`/`stg` get a suffix (`.dev`, `.stg`).
4. **Per-flavor icons** — yes/no. If yes, ask where the flavor-specific icon assets already live
   (or note they must be added before Phase 3 runs the icon processor).
5. **Entry points** — single `main.dart` with runtime flavor detection, or multiple
   `main_<flavor>.dart` files. State the rule: multiple entry points are **required** if Firebase
   is in scope (different `firebase_options_<flavor>.dart` per flavor cannot be selected at
   runtime from a single entry point). See `references/dart-layer.md`.
6. **Web** — yes/no. If yes, note that `--flavor` is Android/iOS/macOS-only; web will use the
   `--dart-define WEB_FLAVOR=<flavor>` workaround. See `references/web-flavors.md`.
7. **IDE target** — VSCode, Android Studio, or both.
8. **Firebase** — yes/no (auto-suggested `yes` if Phase 0 found `firebase_core`). If yes, this
   pulls in Phase 7.
9. **Strategy** — `flutter_flavorizr` with targeted processors (default, faster, handles iOS
   `pbxproj` mechanically) vs fully manual (no external tool, smaller diffs, required if Ruby/Gem/
   Xcodeproj aren't available for iOS — see Phase 3 prerequisite check).

Print the full decision table and ask for one final confirmation before Phase 2. Do not proceed on
an assumed "yes."

---

## Phase 2 — Safety gate

**Goal**: guarantee a clean rollback point exists before any operation that can touch 100+ files.

Run `git status --porcelain` in the target project. If it is **not** empty, stop:

```
✗ Working tree is not clean.
  flutter_flavorizr (and the manual native patches) touch many files at once.
  Without a clean commit, a bad run cannot be safely rolled back with:
    git reset --hard HEAD && git clean -fd
  Commit or stash your changes, then re-run this skill.
```

If clean, print the rollback command anyway so the user has it on hand, then proceed.

---

## Phase 3 — Native setup (Android + iOS)

Two branches per the Phase 1 strategy answer. Read the relevant reference file(s) in full before
writing anything: `references/flavorizr-processors.md` for branch A, `references/manual-android.md`
and `references/manual-ios.md` for branch B.

### Branch A — flutter_flavorizr (default)

1. Add `dev:flutter_flavorizr: ^2.6.0` (verify current via context7/pub.dev) to
   `pubspec.yaml` dev_dependencies if missing; `flutter pub get`.
2. Write the `flavorizr:` block at the end of `pubspec.yaml` from the Phase 1 answers (flavor
   names, app names, `applicationId`/`bundleId`, icon paths if provided).
3. **iOS prerequisite check**: verify Ruby, Gem, and the `xcodeproj` gem are available. If any is
   missing, skip iOS processors below, emit the manual iOS checklist from
   `references/manual-ios.md`, and continue with Android only.
4. Run processors **targeted**, never bare — see `references/flavorizr-processors.md` for the
   full rationale and the trap (bare run overwrites `lib/main.dart`):
   ```bash
   dart run flutter_flavorizr -p android:buildGradle,android:flavorizrGradle,android:androidManifest,android:icons
   dart run flutter_flavorizr -p assets:download,assets:extract,ios:podfile,ios:xcconfig,ios:buildTargets,ios:schema,ios:plist,ios:dummyAssets,ios:icons,assets:clean
   ```
   (Skip the second command entirely if the iOS prerequisite check failed.)
5. `AndroidManifest.xml` comes out with attributes inlined on one line — reformat it (XML Tools
   extension + `SHIFT+OPTION+F` in VSCode, or an equivalent formatter) so the diff is reviewable.
6. Confirm `lib/main.dart` still contains the original `main()` body untouched — the targeted
   processor list above does **not** include `flutter:main`, so it should be. State this check
   explicitly in the phase output; if `main.dart` was touched, stop and surface it before Phase 4.

### Branch B — Manual

Follow `references/manual-android.md` and `references/manual-ios.md` step by step:
- Android: `flavorDimensions`, `productFlavors` block with `manifestPlaceholders` in
  `android/app/build.gradle.kts`; `android:label="${appName}"` in `AndroidManifest.xml`; per-flavor
  source sets under `android/app/src/<flavor>/`.
- iOS: per-flavor `.xcconfig` (Debug/Profile/Release × per flavor), `.xcscheme` (shared), and
  `Info.plist` using `$(APP_NAME)` — all via direct file edits, no `pbxproj` tooling.

---

## Phase 4 — Dart layer

Read `references/dart-layer.md` first.

1. In `lib/main.dart`, rename `main()` → `Future<void> runMainApp()`, preserving every line of
   existing initialization logic (this is the step most likely to be done carelessly — verify
   nothing was dropped, not just renamed).
2. If multiple entry points were chosen in Phase 1, create `lib/main_<flavor>.dart` for each
   flavor:
   ```dart
   import 'main.dart';

   // * Entry point for the <flavor> flavor
   void main() async {
     await runMainApp();
   }
   ```
3. Create `lib/env/flavor.dart` (or the project's existing env/config directory) with:
   ```dart
   import 'package:flutter/foundation.dart';
   import 'package:flutter/services.dart';

   enum Flavor { dev, stg, prod }

   /// Global function to return the current flavor
   Flavor getFlavor() {
     const webFlavor = String.fromEnvironment('WEB_FLAVOR');
     const flavor = kIsWeb ? webFlavor : appFlavor;
     return switch (flavor) {
       'prod' => Flavor.prod,
       'stg' => Flavor.stg,
       'dev' => Flavor.dev,
       null || '' => Flavor.dev,
       _ => throw UnsupportedError('Invalid flavor: $flavor'),
     };
   }
   ```
   Adjust the enum values and switch arms to the flavor names chosen in Phase 1.

**Mandatory warning to print once entry points exist**: from this point on, `-t
lib/main_<flavor>.dart` is required on every `flutter run`/`flutter build`. Omitting it defaults to
`lib/main.dart`, which no longer has a `main()` function, and the app hangs on the splash screen
with `Could not prepare isolate` in the console. Print this warning verbatim so the user
recognizes the failure mode if it happens later.

---

## Phase 5 — Web

Only if Phase 1 chose web. Read `references/web-flavors.md`.

Document, do not silently assume:
- `flutter run --flavor <f>` on web only warns (`--flavor is only supported for Android, macOS,
  and iOS devices`) and still runs.
- `flutter build web --flavor <f>` **fails outright** (`Could not find an option named "flavor"`).
- The workaround is always `--dart-define WEB_FLAVOR=<f>`, which `getFlavor()` (Phase 4) already
  reads via the `kIsWeb` branch.

Print the full per-platform run matrix so the user has every command in one place:

```
flutter run --flavor dev -t lib/main_dev.dart                                   # Android/iOS
flutter run -d chrome --dart-define WEB_FLAVOR=dev -t lib/main_dev.dart         # Web
flutter run --flavor dev --dart-define WEB_FLAVOR=dev -t lib/main_dev.dart      # combined
```

---

## Phase 6 — IDE config

Read `references/ide-config.md`.

### VSCode

1. `dart run flutter_flavorizr -p ide:config` to regenerate `.vscode/launch.json`.
2. The output is minified JSON — reformat it:
   ```bash
   jq '.' .vscode/launch.json > .vscode/formatted_launch.json && mv .vscode/formatted_launch.json .vscode/launch.json
   ```
   If `jq` is unavailable, reformat by editing the file directly and note the manual step.
3. Patch every configuration to add `--dart-define`, `WEB_FLAVOR=<flavor>` to `args` (only if web
   was chosen) and set `program` to the correct `lib/main_<flavor>.dart`. All `<flavor count> × 3`
   build-mode configurations need this — do not stop after the first one.

### Android Studio

1. Set `ide: "idea"` in the `flavorizr:` pubspec block, then `dart run flutter_flavorizr -p
   ide:config` — this only produces **Debug** configurations.
2. Profile and Release configurations, and the web-aware `additionalArgs`, must be written by hand
   per `references/ide-config.md` — there is no processor for these. Generate all of them, do not
   leave Profile/Release as a manual TODO for the user.

---

## Phase 7 — Firebase (optional)

Only if Phase 1 chose Firebase. Read `references/firebase-flavors.md` in full before touching
anything — this phase has the most moving parts and the most native-build gotchas.

1. Generate `flutterfire-config.sh` filled in with the real Firebase project id, `applicationId`,
   and `bundleId` per flavor (from Phase 1). **Do not execute** `flutterfire configure` — it is
   interactive and requires the user's own Firebase login; hand them the ready-to-run script and
   the exact commands instead:
   ```bash
   dart pub global activate flutterfire_cli   # ^1.4.1 — verify current via pub.dev
   ./flutterfire-config.sh dev
   ./flutterfire-config.sh stg
   ./flutterfire-config.sh prod
   ```
2. `flutter pub add firebase_core` (+ any other Firebase packages already in use elsewhere in the
   project).
3. Verify (and patch if missing) Android build settings: `com.google.gms.google-services` plugin
   in both `android/settings.gradle.kts` and `android/app/build.gradle.kts`; `ndkVersion` and
   Java/Kotlin target `17`.
4. Verify (and patch if needed) `ios/Podfile`: `platform :ios, '16.0'` or higher; same for
   `macos/Podfile` if the project supports macOS.
5. Patch each `lib/main_<flavor>.dart` to import the matching `firebase_options_<flavor>.dart` and
   pass `DefaultFirebaseOptions.currentPlatform` into `runMainApp`; patch `runMainApp` in
   `lib/main.dart` to accept `{required FirebaseOptions firebaseOptions}` and call
   `Firebase.initializeApp(options: firebaseOptions)` before the rest of existing init logic.

Note the re-run trigger from the KB: `flutterfire configure` must be re-run whenever a new
platform is added or a new Firebase product (Crashlytics, Performance Monitoring, Google Sign-In,
Realtime Database) is first used — this is not a one-time step.

---

## Phase 8 — Verification

Run, and report pass/fail for each (skip any platform not in scope from Phase 1):

```bash
flutter analyze
flutter build apk --debug --flavor <first-flavor> -t lib/main_<first-flavor>.dart
flutter build web --dart-define WEB_FLAVOR=<first-flavor> -t lib/main_<first-flavor>.dart   # if web
```

If iOS processors ran (Branch A with prerequisites met), note that a real build check requires
Xcode and is out of scope for a non-Mac session — instruct the user to run
`flutter build ios --flavor <f> -t lib/main_<f>.dart --no-codesign` themselves and report back.

Print the final per-flavor, per-platform run command table (same shape as Phase 5's matrix, now
covering every configured flavor).

---

## Phase 9 — Summary

Print, grouped:

- **Files created** — path + one-line purpose.
- **Files modified** — path + one-line description of the change.
- **Packages added** — package + version + command used.
- **Manual checklist** — items that cannot be automated: create the Firebase projects themselves
  (if Firebase in scope), open Xcode to visually confirm schemes and icons, upload store listing
  assets per flavor, verify `.xcscheme` files are marked "Shared" so CI can see them.

---

## AUDIT branch (partial / complete projects)

Entered from Phase 0 when any flavor signal already exists.

1. Load `rules/CATALOG.md` in full before scanning — it contains every heuristic needed; do not
   open individual reference docs unless a violation needs a deeper fix explanation.
2. Scan the project against every rule in the catalog. For folder-scale scans (native config +
   `lib/`), spawn an Explore subagent to enumerate candidate files first, the same pattern as
   `skills/audit-domain-layer/SKILL.md` Phase 2 folder mode — list `.dart` files under `lib/`,
   `android/app/build.gradle.kts`, `ios/Flutter/*.xcconfig`, `ios/**/xcschemes/*.xcscheme`,
   `.vscode/launch.json`, `.idea/runConfigurations/*.xml`.
3. Emit a violations table exactly like `audit-domain-layer`'s Phase 4 format:

   ```
   ## Audit Results — Flutter Flavors

   ### android/app/build.gradle.kts
   | Line | Rule ID | Severity | Message |
   |------|---------|----------|---------|
   | 42 | FLAVOR-AND-04 | error | android/app/src/stg/ source set missing |

   ### lib/env/flavor.dart
   | Line | Rule ID | Severity | Message |
   |------|---------|----------|---------|
   | 9 | FLAVOR-DART-02 | error | getFlavor() has no kIsWeb/WEB_FLAVOR branch — web always resolves to default |

   ---
   **Summary**: 2 violations across 2 files (2 errors, 0 warnings, 0 info)
   ```

   If nothing is found, say so explicitly: `No violations found. Flavor setup matches the catalog.`

4. Ask which rule IDs to fix (`all`, comma-separated list, or `none`) — same pattern as
   `audit-domain-layer` Phase 5. For each selected violation:
   - `autofix_safe: true` → apply directly, show the diff.
   - `autofix_safe: false` → show the exact change, get explicit confirmation before editing.
   - `FLAVOR-GIT-01` is a hard gate, not a fix target — if it fires, stop and point back to
     Phase 2 instead of offering to "fix" it.
   Route each fix through the matching INIT phase above (e.g. a missing Android source set is a
   Phase 3 fix, a broken `getFlavor()` is a Phase 4 fix) rather than re-deriving the logic here —
   apply only the touched piece, never re-run a full phase against an already-partial project.
5. Re-scan touched files only, confirm which violations were resolved.

Never rewrite a working, unflagged part of the project just because the AUDIT branch touched a
neighboring file.

---

## Notes

- Paths inside this skill are relative to the **target Flutter project root**, not this toolkit
  repo — consistent with every other skill here.
- Out of scope: Melos/pub-workspace monorepos (detected and blocked in Phase 0, not resolved),
  macOS as a flavored target, `--dart-define-from-file` per-flavor `.env` files, and whitelabel
  app patterns (different codebase-sharing model — a separate skill's concern).
- This skill does not overlap with `sentry-init`, which reads flavor entry points
  (`lib/main_*.dart`) once they already exist but does not create them.
