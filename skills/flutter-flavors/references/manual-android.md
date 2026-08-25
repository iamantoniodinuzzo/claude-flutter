# Manual Android flavor setup

Use when flavorizr's iOS prerequisites are unavailable, when the project is too far from
flavorizr's expected structure to run safely (flavorizr's own docs warn it "works better on a new
and clean Flutter project"), or when the user explicitly chose the manual strategy in Phase 1.
Android manual setup is small — it's the iOS side (`references/manual-ios.md`) that's genuinely
harder to do by hand.

This produces the same end state as the flavorizr Android processors
(`references/flavorizr-processors.md`), just without the tool.

## 1. `flavorDimensions` + `productFlavors`

Create `android/app/flavors.gradle.kts` (or reuse the project's existing convention if it already
has a similarly-named include file):

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
        create("stg") {
            dimension = "flavor-type"
            applicationId = "com.example.app.stg"
            resValue(type = "string", name = "app_name", value = "App Stg")
        }
        create("prod") {
            dimension = "flavor-type"
            applicationId = "com.example.app"          // unsuffixed — see FLAVOR-CFG-02
            resValue(type = "string", name = "app_name", value = "App")
        }
    }
}
```

Then, at the very bottom of `android/app/build.gradle.kts`, add:

```kotlin
apply { from("flavors.gradle.kts") }
```

This is functionally identical to the flavorizr `android:buildGradle` + `android:flavorizrGradle`
processors combined.

`flavorDimensions` and every flavor's `dimension = "..."` value must match exactly — Gradle
refuses to build otherwise (`FLAVOR-AND-02`).

## 2. `AndroidManifest.xml`

Open `android/app/src/main/AndroidManifest.xml` and change the `android:label` attribute from a
literal string to the resource reference that resolves to the per-flavor `resValue` set above:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application
    android:label="@string/app_name"
    android:name="${applicationName}"
    android:icon="@mipmap/ic_launcher">
    ...
  </application>
</manifest>
```

This is the entire manifest change — one attribute. No inlining/formatting side effects like the
flavorizr processor has, since this is a direct, targeted edit.

## 3. Per-flavor source sets

For each flavor, create `android/app/src/<flavor>/` even if empty at first — it's where
flavor-specific resources go later (custom icons if not using flavorizr's icon processor,
`google-services.json` if Firebase is in scope — see `references/firebase-flavors.md`).

## Flavored icons

Manually generating resized icon sets for every Android density bucket
(`mipmap-mdpi` through `mipmap-xxxhdpi`) is not worth doing by hand. If icons are in scope, either:
- run just the flavorizr `android:icons` processor (`dart run flutter_flavorizr -p
  android:icons`) against the manually-written `flavorizr:` pubspec block, or
- use [`flutter_launcher_icons`](https://pub.dev/packages/flutter_launcher_icons), which has its
  own [flavor support](https://pub.dev/packages/flutter_launcher_icons#flavor-support).

## Verifying

```bash
flutter run --flavor dev
```

Open the app's settings/about screen (or any screen reading the app name) and confirm it shows
the dev-flavor name. Repeat for `stg` and `prod`. Also check the Android launcher's app info page
— the flavored name and icon (if configured) should show there too.
