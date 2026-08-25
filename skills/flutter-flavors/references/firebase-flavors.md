# Firebase with multiple flavors

Firebase has no Dart SDK — unlike a custom backend where switching environments is just a
different URL/API key, each flavor needs its own **native** Firebase app registration and config
file per platform. This is why Firebase is the most involved optional phase in this skill.

Baseline: `flutterfire_cli: 1.4.1` (verify current via context7/`pub.dev`). Multi-flavor support
requires `flutterfire_cli >= 1.1.0` — check `flutterfire --version` if a project reports errors
resembling missing flags.

## One Firebase project per flavor

Each flavor gets its **own** Firebase project (e.g. `myapp-dev`, `myapp-stg`, `myapp-prod`) —
not one project with multiple "apps" registered inside it. This is what actually isolates
dev/staging data from production data, analytics, and crash reports.

**This skill never creates Firebase projects itself** — that requires an interactive login to the
Firebase Console and is inherently a human decision (project naming, billing account, Analytics
opt-in). Hand the user this checklist instead:

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → Create a new
   project, once per flavor.
2. Enable Google Analytics if the project will use Firebase Analytics, Remote Config, or
   Crashlytics (recommended default: yes).
3. **If the app is already live**, do not touch the existing production Firebase project — only
   create the missing `dev`/`stg` projects alongside it. If Auth/Firestore/Storage rules need to
   match, `firebase init` on the production project locally saves the rules/indexes/hosting
   config so they can be redeployed (`firebase deploy`) to the new projects — this is a one-time
   manual step, not something this skill scripts.

## Installing the CLIs

```bash
npm install -g firebase-tools     # more reliable than the standalone installer per the KB source
firebase login
dart pub global activate flutterfire_cli
```

Troubleshooting `FirebaseCommandException` (`Failed to list Firebase projects`) during
`flutterfire configure`: `firebase logout` then `firebase login` again, usually a stale/wrong
account.

## The `flutterfire configure` invocation, per flavor

```bash
flutterfire config \
  --project=myapp-dev \
  --out=lib/firebase_options_dev.dart \
  --ios-bundle-id=com.example.app.dev \
  --ios-out=ios/flavors/dev/GoogleService-Info.plist \
  --android-package-name=com.example.app.dev \
  --android-out=android/app/src/dev/google-services.json
```

| Flag | Meaning |
|---|---|
| `--project` | Firebase **project ID** (not the display name/alias) — find it in Firebase project settings |
| `--out` | Where the generated `firebase_options_<flavor>.dart` lands |
| `--ios-bundle-id` | Must match the flavor's actual iOS bundle id exactly |
| `--ios-out` | Per-flavor plist path — **never** the default `ios/Runner/GoogleService-Info.plist`, that path is shared across all flavors and defeats the whole point |
| `--android-package-name` | Must match the flavor's `applicationId` exactly |
| `--android-out` | Per-flavor json path — must be under `android/app/src/<flavor>/`, the Gradle source-set path, not `android/app/` |

On Windows, drop the trailing backslashes and run the command inline if the shell doesn't support
them.

**This skill generates the script below but does not run `flutterfire configure` itself** — it's
interactive (prompts for a build configuration choice, then platform selection) and requires the
user's own Firebase login. Hand them the ready script and the exact invocations.

## `flutterfire-config.sh` — generate once, run per flavor

```bash
#!/bin/bash
# Script to generate Firebase configuration files for different environments/flavors

if [[ $# -eq 0 ]]; then
  echo "Error: No environment specified. Use 'dev', 'stg', or 'prod'."
  exit 1
fi

case $1 in
  dev)
    flutterfire config \
      --project=myapp-dev \
      --out=lib/firebase_options_dev.dart \
      --ios-bundle-id=com.example.app.dev \
      --ios-out=ios/flavors/dev/GoogleService-Info.plist \
      --android-package-name=com.example.app.dev \
      --android-out=android/app/src/dev/google-services.json
    ;;
  stg)
    flutterfire config \
      --project=myapp-stg \
      --out=lib/firebase_options_stg.dart \
      --ios-bundle-id=com.example.app.stg \
      --ios-out=ios/flavors/stg/GoogleService-Info.plist \
      --android-package-name=com.example.app.stg \
      --android-out=android/app/src/stg/google-services.json
    ;;
  prod)
    flutterfire config \
      --project=myapp-prod \
      --out=lib/firebase_options_prod.dart \
      --ios-bundle-id=com.example.app \
      --ios-out=ios/flavors/prod/GoogleService-Info.plist \
      --android-package-name=com.example.app \
      --android-out=android/app/src/prod/google-services.json
    ;;
  *)
    echo "Error: Invalid environment specified. Use 'dev', 'stg', or 'prod'."
    exit 1
    ;;
esac
```

Fill in the real project ids and identifiers from Phase 1's decisions before handing this to the
user. Run once per flavor: `./flutterfire-config.sh dev`, `./flutterfire-config.sh stg`,
`./flutterfire-config.sh prod`.

When prompted interactively:
- **Configuration type**: choose "Build configuration" (not "Target").
- **Build configuration**: choose the `Debug-<flavor>` variant (e.g. `Debug-dev`) — this only
  affects which Xcode configuration the CLI reads the bundle id from during setup; running it
  once is enough to also correctly wire Profile/Release, since flutterfire adds an Xcode build
  phase that bundles the right plist regardless of build mode once run at least once.
- **Platforms**: select whichever of android/ios/web/macos/windows are actually in scope for
  this project — don't blindly accept the default selection.

## Whether to gitignore the config files

The generated files (`firebase_options_*.dart`, `GoogleService-Info.plist`,
`google-services.json`) don't contain secrets, so committing them is safe. If the project prefers
to gitignore them anyway (common for open-source repos), note the tradeoff and add:

```gitignore
lib/firebase_options*.dart
ios/Runner/GoogleService-Info.plist
ios/flavors/*/GoogleService-Info.plist
android/app/google-services.json
android/app/src/*/google-services.json
```

Ignoring them means a fresh checkout needs `flutterfire-config.sh` re-run for every flavor, and CI
needs to restore them from stored secrets before building.

## Android build settings the Gradle plugin needs

`com.google.gms.google-services` must be present in **both** files, or Android builds fail with
`Plugin [id: 'com.google.gms.google-services'] was not found`:

`android/settings.gradle.kts`:
```kotlin
plugins {
    id("dev.flutter.flutter-plugin-loader") version "1.0.0"
    id("com.android.application") version "8.7.0" apply false
    // START: FlutterFire Configuration
    id("com.google.gms.google-services") version("4.3.15") apply false
    // END: FlutterFire Configuration
    id("org.jetbrains.kotlin.android") version "1.8.22" apply false
}
```

`android/app/build.gradle.kts`:
```kotlin
plugins {
    id("com.android.application")
    // START: FlutterFire Configuration
    id("com.google.gms.google-services")
    // END: FlutterFire Configuration
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}
```

Also verify `ndkVersion = "27.0.12077973"` (or current) and Java/Kotlin target `17` in
`android/app/build.gradle.kts` — older baselines are a common source of unrelated build failures
once Firebase pulls in newer transitive dependencies.

## iOS Podfile minimum platform

```ruby
# ios/Podfile
platform :ios, '16.0'
```

Then `cd ios && pod install`. If the project supports macOS, `macos/Podfile` needs `platform :osx,
'10.14'` or above too.

## Wiring entry points to Firebase options

Requires multiple entry points (`references/dart-layer.md`) — this is the concrete reason
Firebase forces that choice. Each `lib/main_<flavor>.dart`:

```dart
import 'firebase_options_dev.dart';
import 'main.dart';

// * Entry point for the dev flavor
void main() async {
  await runMainApp(firebaseOptions: DefaultFirebaseOptions.currentPlatform);
}
```

(Repeat per flavor, importing that flavor's own `firebase_options_<flavor>.dart` — never the same
file across two entry points.)

`lib/main.dart`'s `runMainApp` takes the options and initializes Firebase **before** anything else
that might depend on it:

```dart
Future<void> runMainApp({required FirebaseOptions firebaseOptions}) async {
  WidgetsFlutterBinding.ensureInitialized();
  // * Initialize Firebase
  await Firebase.initializeApp(options: firebaseOptions);
  // ...rest of existing init logic, unchanged...
}
```

### Why not a runtime switch instead?

A tempting shortcut is a single `firebase.dart` with a `switch (getFlavor())` importing all three
options files:

```dart
// don't do this
import 'firebase_options_prod.dart' as prod;
import 'firebase_options_stg.dart' as stg;
import 'firebase_options_dev.dart' as dev;

Future<void> initializeFirebaseApp() async {
  final options = switch (getFlavor()) {
    Flavor.prod => prod.DefaultFirebaseOptions.currentPlatform,
    Flavor.stg => stg.DefaultFirebaseOptions.currentPlatform,
    Flavor.dev => dev.DefaultFirebaseOptions.currentPlatform,
  };
  await Firebase.initializeApp(options: options);
}
```

This compiles, but because the `switch` is evaluated at **runtime**, all three imports are
reachable and get bundled into every build — dev and staging Firebase project details ship inside
the production binary, even though only one is ever used. The multiple-entry-point approach above
avoids this because each entry point only imports its own flavor's options file, so the other two
are never reachable from that build's import graph and get tree-shaken out entirely.

## Re-running `flutterfire configure`

Not a one-time step. Official guidance: re-run it whenever a new platform is added to the Flutter
project, or a new Firebase product is used for the first time (Google Sign-In, Crashlytics,
Performance Monitoring, Realtime Database). If the AUDIT branch finds Firebase config that
predates a platform the project has since added, flag it and suggest a re-run.
