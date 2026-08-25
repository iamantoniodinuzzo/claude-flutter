# Manual iOS flavor setup

This is the harder half of manual flavoring — most of the work happens inside Xcode itself, not
in files that can be safely hand-edited as text. The official Flutter docs cover the same ground:
[Set up Flutter flavors for iOS and macOS](https://docs.flutter.dev/deployment/flavors-ios).

**This skill cannot execute Xcode UI steps.** Where a step requires the Xcode GUI (build
configuration duplication, scheme creation), present it to the user as a numbered checklist
rather than attempting to script it — hand-editing `project.pbxproj` outside Xcode is fragile and
easy to corrupt (`FLAVOR-IOS-04`).

Open the workspace first: `open ios/Runner.xcworkspace/` (never `Runner.xcodeproj` — the
workspace includes CocoaPods).

## 1. Duplicate build configurations

In Xcode: **Project → Runner → Info tab**.

- Rename the existing three configurations (`Debug`, `Release`, `Profile`) to `Debug-prod`,
  `Release-prod`, `Profile-prod` — treat the existing configuration as the production baseline,
  don't create a fresh set from scratch.
- Click **+** → **Duplicate** for each of the three, once per remaining flavor, producing
  `Debug-stg`/`Release-stg`/`Profile-stg` and `Debug-dev`/`Release-dev`/`Profile-dev`.
- End state: 9 configurations total (3 build modes × 3 flavors).

## 2. Create schemes

**Runner dropdown (top bar) → Manage Schemes…**

- Select the `Runner` scheme (the one belonging to the main project, not one of the `Pods-*`
  schemes) → click once to rename it → `prod`.
- Duplicate it (⋯ menu → Duplicate) → rename to `stg` → in the scheme editor, set **Build
  Configuration** to `Release-stg` for **each** of Run, Test, Profile, Analyze, and Archive (not
  just one of them — this is the step most often half-done) → check **Shared** → Close.
- Duplicate again → rename to `dev` → same per-section `Release-dev` configuration → check
  **Shared** → Close.
- Back in Manage Schemes, confirm **Shared** is checked for all three (`prod`, `stg`, `dev`) —
  unshared schemes live in `xcuserdata/` and are invisible to CI and other teammates
  (`FLAVOR-IOS-02`).

## 3. Bundle identifiers

**Target → Runner → Build Settings → "Combined" filter → search "Product Bundle Identifier"** →
expand the per-configuration dropdown.

For each `Debug-dev`/`Release-dev`/`Profile-dev` row, append `.dev` to the existing bundle id.
Same for `.stg`. **Leave every `-prod` row untouched** if the app is already published — do not
append `.prod` (`FLAVOR-CFG-02`). If this is a pre-release app, `.prod`-suffixed or unsuffixed is
the user's call; ask, don't assume.

## 4. App display name

**Target → Runner → Build Settings → + → Add User-Defined Setting.**

Name it `APP_DISPLAY_NAME`, then expand its per-configuration dropdown and set a value for every
one of the 9 configurations — e.g. `dev` configs → `App Dev`, `stg` → `App Stg`, `prod` → `App`.

Then open `Info.plist` (as source code, or via the property list editor) and point both keys at
the variable:

```xml
<key>CFBundleDisplayName</key>
<string>$(APP_DISPLAY_NAME)</string>
...
<key>CFBundleName</key>
<string>$(APP_DISPLAY_NAME)</string>
```

**Note the variable name difference from the flavorizr path**: flavorizr's `ios:xcconfig` /
`ios:plist` processors use two separate xcconfig-defined variables, `BUNDLE_NAME` and
`BUNDLE_DISPLAY_NAME` (see `references/flavorizr-processors.md`). The manual path taught here uses
a single Xcode-build-setting variable, `APP_DISPLAY_NAME`, for both plist keys. Don't mix the two
conventions in one project — pick whichever this project already has, or whichever this skill run
introduces, and check the AUDIT branch (`FLAVOR-IOS-03`) against that same convention.

## Flavored icons

Same guidance as Android: don't hand-generate per-flavor icon sets. Either run just the flavorizr
`ios:dummyAssets` + `ios:icons` processors against a manually-written `flavorizr:` pubspec block
(requires the Ruby/Gem/xcodeproj prerequisites), or use `flutter_launcher_icons`'
[flavor support](https://pub.dev/packages/flutter_launcher_icons#flavor-support).

## Verifying

```bash
flutter run --flavor dev
```

Confirm the app name shown matches the flavor. Repeat for `stg` and `prod`, then check the iOS
home screen — three distinct app entries should be installable side by side.

## Rollback

```bash
git reset --hard HEAD && git clean -fd
```

Only safe if Phase 2's clean-tree gate was honored before starting — this discards everything
since the last commit, native and Dart alike.
