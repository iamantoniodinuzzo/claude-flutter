---
name: sentry-init
description: Bootstrap sentry_flutter in a Flutter+Riverpod+GoRouter project — installs deps, wires SentryFlutter.init (Approach 3), GoRouter observer, Riverpod error capture (LoggerService decorator if present, else standalone ProviderObserver), web BetterFeedback gated by CanvasKit renderer, and emits release upload checklist (source maps + dSYM).
user-invocable: true
---

# sentry-init

Bootstraps the Sentry Flutter SDK in an existing Flutter project that uses Riverpod and GoRouter. Run all phases in order; each phase is idempotent — if the target already has partial Sentry setup, report deltas only, do not duplicate.

Before coding anything, load the bundled references in parallel:

- `skills/sentry-init/references/initialization-flow.md`
- `skills/sentry-init/references/logger-decorator-pattern.md`
- `skills/sentry-init/references/gorouter-and-dio-wiring.md`
- `skills/sentry-init/references/web-feedback-canvaskit.md`
- `skills/sentry-init/references/release-uploads.md`

Also fetch the latest `sentry_flutter` SDK docs via context7 (`getsentry/sentry-dart`) before pinning any version numbers — the reference files cite minimum-tested baselines, not pinned versions.

---

## Phase 0 — Intake & prerequisite gate

**Goal**: gather all project shape facts before touching any file. Never assume — detect.

### 0.1 Melos workspace detection

Grep root `pubspec.yaml` for `workspace:` (pub workspaces) or `melos:` block.

- **Monorepo detected**: ask the user which package(s) to target. All subsequent phases apply to the selected package root. Use `melos exec --scope=<pkg> -- <cmd>` for pub operations.
- **Single-app**: target root is the project root.

### 0.2 GoRouter prerequisite (hard gate)

In the target `pubspec.yaml`, grep for `go_router`.

- **Not found**: abort immediately with this message:

  ```
  ✗ sentry-init requires go_router for NavigatorObserver wiring.
    Run the `flutter-go-router` skill first, then re-run sentry-init.
  ```

- **Found**: proceed.

### 0.3 LoggerService detection (soft)

Grep project `lib/` for:
- `class LoggerService` or `abstract.*LoggerService`
- `loggerServiceProvider`

Record result as `HAS_LOGGER_SERVICE=true/false`. This drives the Phase 4 branch.

### 0.4 Optional dependency detection

| Probe | Grep target | Variable |
|-------|-------------|----------|
| Dio | `import 'package:dio/dio.dart'` or `dio:` in pubspec | `HAS_DIO` |
| logging package | `logging:` in pubspec | `HAS_LOGGING` |
| Existing Sentry | `sentry_flutter` in pubspec | `ALREADY_HAS_SENTRY` |

If `ALREADY_HAS_SENTRY=true`, proceed but operate in **delta mode**: report what already exists vs what needs changing.

### 0.5 DSN source

Ask the user how the DSN is provided. Present this priority order as default:

1. `dart_defines.json` / `dart_defines.json.example` (key `SENTRY_DSN`) — recommended, compile-time, never committed
2. `--dart-define=SENTRY_DSN=...` in `.vscode/launch.json` or `Makefile`
3. `.env` file read at runtime

Confirm the exact key name (default `SENTRY_DSN`). In Phase 2, the skill always emits an **empty-string gate** so local dev without the define simply skips Sentry init.

Determine how the value is accessed in Dart (e.g. `const String.fromEnvironment('SENTRY_DSN')` or via an `AppEnv`/`Env` class). Record as `DSN_DART_EXPR`.

### 0.6 Flavor detection

Grep for `lib/main_*.dart` or a `Flavor` / `AppFlavor` enum. List discovered flavors. Map to sample rates:

| Flavor | tracesSampleRate | profilesSampleRate |
|--------|-------------------|--------------------|
| prod / release | 0.2 | 0.2 |
| dev / debug / staging | 1.0 | 1.0 |

Ask the user to confirm or adjust.

### 0.7 Package name

Grep `pubspec.yaml` for `name:`. Record as `APP_PACKAGE_NAME` — used for `addInAppInclude`.

### Phase 0 summary

Before proceeding, print a one-line summary of what was detected:

```
✓ Target: <package>
✓ go_router: found
✓ LoggerService: <found|not found> → Phase 4 will use <Branch A|Branch B>
✓ Dio: <found|not found>
✓ DSN key: <SENTRY_DSN> via <dart_defines.json|launch.json|.env>
✓ Flavors: <list>
✓ Package name: <name>
```

Ask the user to confirm before proceeding.

---

## Phase 1 — Install dependencies

### 1.1 Core

```bash
flutter pub add sentry_flutter
flutter pub add --dev sentry_dart_plugin
```

For monorepo: prefix with `melos exec --scope=<pkg> -- `.

Minimum-tested baseline versions (verify current latest via context7 before pinning):
- `sentry_flutter: ^9.20.0`
- `sentry_dart_plugin: 3.2.0`

### 1.2 Conditional additions

| Condition | Command |
|-----------|---------|
| `HAS_DIO=true` | `flutter pub add sentry_dio` |
| `HAS_LOGGING=true` | `flutter pub add sentry_logging` |
| Always (for web BetterFeedback) | `flutter pub add feedback feedback_sentry` |

Minimum-tested baselines: `feedback: ^3.2.0`, `feedback_sentry: ^3.2.0`.

---

## Phase 2 — Patch `main.dart` (Approach 3 — no appRunner)

See `references/initialization-flow.md` for full rationale and comparison of all three approaches.

### 2.1 Locate entrypoints

Find all flavor entrypoints: `lib/main.dart`, `lib/main_dev.dart`, `lib/main_prod.dart`, etc. (from Phase 0.6). Apply this phase to each.

### 2.2 Required initialization order

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // --- existing pre-Sentry init (preserve as-is) ---
  // e.g. Firebase.initializeApp(...), usePathUrlStrategy(), setupEmulators()

  // --- Sentry init ---
  final dsn = DSN_DART_EXPR;  // e.g. const String.fromEnvironment('SENTRY_DSN')
  if (dsn.isNotEmpty) {
    await SentryFlutter.init((options) {
      options.dsn = dsn;
      options.environment = '<flavor-name>';      // e.g. 'prod' or getFlavor().name
      options.tracesSampleRate = <0.2 or 1.0>;   // from Phase 0.6 map
      options.profilesSampleRate = <0.2 or 1.0>; // same value
      options.attachScreenshot = false;           // PII — leave off by default
      options.sendDefaultPii = false;
      options.considerInAppFramesByDefault = false;
      options.addInAppInclude(APP_PACKAGE_NAME);
      options.beforeSend = (event, hint) async {
        if (!kReleaseMode) return null;           // suppress debug noise
        final ex = event.throwable;
        if (ex is DioException && ex.response == null) return null; // no connection, skip
        return event;
      };
    });
  }

  // --- existing post-init (preserve as-is) ---
  // e.g. createProviderContainer(), Firebase providers

  runApp(
    SentryWidget(                                // wrap tree for screenshot path
      child: ProviderScope(                      // or UncontrolledProviderScope(container: ...)
        child: MyApp(),
      ),
    ),
  );
}
```

**Critical ordering rule**: Sentry must init _before_ first provider read. Do not reorder `SentryFlutter.init` below `ProviderContainer` creation. See `references/initialization-flow.md`.

Remove the `beforeSend` Dio filter if `HAS_DIO=false`.

### 2.3 Idempotency

If `SentryFlutter.init(` already exists in the file:
- Check the existing options block against the template above.
- Report any missing options as a diff.
- Do not add a second `SentryFlutter.init` call.

### 2.4 Global error hooks

Also wire in `main()` (idempotent — check if already present):

```dart
FlutterError.onError = (details) {
  Sentry.captureException(details.exception, stackTrace: details.stack);
  FlutterError.presentError(details);
};
PlatformDispatcher.instance.onError = (error, stack) {
  Sentry.captureException(error, stackTrace: stack);
  return true;
};
```

If the project already has these hooks routing to a `LoggerService`, do not duplicate — the decorator in Phase 4 will handle Sentry capture automatically.

---

## Phase 3 — Wire GoRouter observer

See `references/gorouter-and-dio-wiring.md` for full context.

### 3.1 Locate GoRouter constructors

Typical paths: `lib/router/app_router.dart`, `lib/src/router/`, `lib/router.dart`. Grep for `GoRouter(`.

### 3.2 Inject observer

For each `GoRouter(` call found, add `observers: [SentryNavigatorObserver()]`. If `observers:` already present, append to the list:

```dart
final goRouter = GoRouter(
  initialLocation: '/',
  observers: [SentryNavigatorObserver()],   // ← add this
  routes: [...],
);
```

For Riverpod-wrapped variant:

```dart
@riverpod
GoRouter router(Ref ref) {
  return GoRouter(
    observers: [SentryNavigatorObserver()],  // ← add this
    refreshListenable: RouterNotifier(ref),
    routes: [...],
  );
}
```

**Do NOT** add to `MaterialApp.router` — it has no `navigatorObservers` argument.

### 3.3 Named routes warning

Inspect routes for `name:` fields. If no named routes found, emit this advisory:

```
⚠ SentryNavigatorObserver is most useful with named routes.
  Without route names, breadcrumb trail will show '/unknown' for most transitions.
  Consider adding name: '...' to your GoRoute definitions.
```

### 3.4 Dio HTTP breadcrumbs (if HAS_DIO=true)

In the Dio provider file (grep for `Dio()` construction), add:

```dart
dio.addSentry();
```

On Flutter web, also add to the `SentryFlutter.init` options block (Phase 2):

```dart
options.tracePropagationTargets.clear(); // prevent CORS failures from sentry-trace header
```

---

## Phase 4 — Riverpod error capture

Run **Branch A** if `HAS_LOGGER_SERVICE=true`, else **Branch B**.

---

### Branch A — LoggerService decorator (preferred)

See `references/logger-decorator-pattern.md` for full rationale and architecture diagram.

#### A.1 Generate decorator

Create `lib/src/core/monitoring/sentry_logger_service.dart` (adapt path to project conventions):

```dart
import 'package:sentry_flutter/sentry_flutter.dart';
import 'logger_service.dart'; // adjust import

class SentryLoggerService implements LoggerService {
  const SentryLoggerService(this._delegate);
  final LoggerService _delegate;

  @override
  void t(String msg, [Object? error, StackTrace? st]) {
    _delegate.t(msg, error, st);
    // trace: no Sentry action
  }

  @override
  void d(String msg, [Object? error, StackTrace? st]) {
    _delegate.d(msg, error, st);
    Sentry.addBreadcrumb(Breadcrumb(message: msg, level: SentryLevel.debug)).ignore();
  }

  @override
  void i(String msg, [Object? error, StackTrace? st]) {
    _delegate.i(msg, error, st);
    Sentry.addBreadcrumb(Breadcrumb(message: msg, level: SentryLevel.info)).ignore();
  }

  @override
  void w(String msg, [Object? error, StackTrace? st]) {
    _delegate.w(msg, error, st);
    _capture(msg, error, st, SentryLevel.warning);
  }

  @override
  void e(String msg, [Object? error, StackTrace? st]) {
    _delegate.e(msg, error, st);
    _capture(msg, error, st, SentryLevel.error);
  }

  @override
  void f(String msg, [Object? error, StackTrace? st]) {
    _delegate.f(msg, error, st);
    _capture(msg, error, st, SentryLevel.fatal);
  }

  void _capture(String msg, Object? error, StackTrace? st, SentryLevel level) {
    if (error != null) {
      Sentry.captureException(error, stackTrace: st).ignore();
    } else {
      Sentry.captureMessage(msg, level: level).ignore();
    }
  }
}
```

Adjust method signatures to match the actual `LoggerService` interface in the project.

#### A.2 Patch loggerServiceProvider

In the file that declares `loggerServiceProvider`, wrap with the decorator when DSN is present:

```dart
@Riverpod(keepAlive: true)
LoggerService loggerService(Ref ref) {
  final base = /* existing construction logic */;
  final dsn = DSN_DART_EXPR;
  if (dsn.isEmpty) return base;
  return SentryLoggerService(base);
}
```

#### A.3 ProviderObserver check

Grep for `ProviderObserver` in the project.

- **AsyncErrorLogger (or equivalent) already exists** → no action needed. Sentry capture flows automatically via the decorator when the existing observer calls `loggerService.e(...)`.
- **No ProviderObserver found** → also emit a minimal observer and register it:

```dart
class AsyncErrorLogger extends ProviderObserver {
  const AsyncErrorLogger(this._logger);
  final LoggerService _logger;

  @override
  void didUpdateProvider(ProviderBase provider, Object? previousValue,
      Object? newValue, ProviderContainer container) {
    if (newValue case AsyncError(:final error, :final stackTrace)) {
      _logger.e('Provider ${provider.name ?? provider.runtimeType} error', error, stackTrace);
    }
  }
}
```

Register in `ProviderContainer` / `ProviderScope`:

```dart
ProviderScope(
  observers: [AsyncErrorLogger(LoggerServiceImpl())],
  child: ...,
)
```

---

### Branch B — No LoggerService (standalone observer)

#### B.1 Generate ProviderObserver

Create `lib/src/core/monitoring/sentry_provider_observer.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

// When LoggerService is added later, replace this with the SentryLoggerService decorator pattern.
class SentryProviderObserver extends ProviderObserver {
  const SentryProviderObserver();

  @override
  void didUpdateProvider(ProviderBase provider, Object? previousValue,
      Object? newValue, ProviderContainer container) {
    if (newValue case AsyncError(:final error, :final stackTrace)) {
      Sentry.captureException(error, stackTrace: stackTrace).ignore();
    }
  }
}
```

#### B.2 Register observer

```dart
ProviderScope(
  observers: [const SentryProviderObserver()],
  child: MyApp(),
)
```

Or in `ProviderContainer`:

```dart
final container = ProviderContainer(
  observers: [const SentryProviderObserver()],
);
```

---

### Global hooks (emit for both branches — idempotent)

Only add if not already present (checked in Phase 2.4). If Branch A is used and the project already has global hooks routed to `loggerService`, skip this — the decorator handles it.

---

## Phase 5 — Platform branches

### Web — BetterFeedback + CanvasKit gate

See `references/web-feedback-canvaskit.md` for full architecture.

#### 5.1 CanvasKit renderer utility

Generate the conditional-export utility at `lib/src/common/utils/renderer/` (adapt path to project conventions):

**`is_canvas_kit.dart`** (umbrella / public API):
```dart
export 'native.dart'
    if (dart.library.js) 'web.dart'
    if (dart.library.html) 'web.dart';
```

**`native.dart`**:
```dart
bool isCanvasKitRenderer() => false;
```

**`web.dart`**:
```dart
// ignore: deprecated_member_use
import 'dart:js' as js;

bool isCanvasKitRenderer() {
  try {
    return js.context.hasProperty('flutterCanvasKit');
  } catch (_) {
    return false;
  }
}
```

**`unsupported.dart`** (never selected by conditional exports; stub for analysis):
```dart
bool isCanvasKitRenderer() => throw UnsupportedError('isCanvasKitRenderer');
```

Note: `dart:js` carries a deprecation lint; suppress with `// ignore: deprecated_member_use`. Migration to `dart:js_interop` + `package:web` can be deferred until WASM adoption.

#### 5.2 BetterFeedback wrapper in main.dart

In Phase 2's `runApp(...)` call, add the conditional wrapper:

```dart
import 'package:feedback/feedback.dart';
import 'package:your_app/src/common/utils/renderer/is_canvas_kit.dart';

// inside main():
final canCaptureFeedback = !kIsWeb || isCanvasKitRenderer();
final tree = SentryWidget(child: ProviderScope(child: MyApp()));

runApp(canCaptureFeedback ? BetterFeedback(child: tree) : tree);
```

#### 5.3 SentryFeedbackService

Generate `lib/src/features/feedback/application/sentry_feedback_service.dart`:

```dart
import 'package:feedback/feedback.dart';
import 'package:feedback_sentry/feedback_sentry.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'sentry_feedback_service.g.dart';

class SentryFeedbackService {
  const SentryFeedbackService(this._ref);
  final Ref _ref;

  void show(BuildContext context) {
    // Gracefully degrade: if authenticatedUserProvider exists, use it; else submit anonymous.
    // Adapt the provider read below to the project's auth model.
    String? name;
    String? email;
    // Example (remove if no auth):
    // final user = _ref.read(authenticatedUserProvider).value;
    // name = (user?.name.isNotEmpty ?? false) ? user!.name : null;
    // email = (user?.email.isNotEmpty ?? false) ? user!.email : null;

    BetterFeedback.of(context).showAndUploadToSentry(name: name, email: email);
  }
}

@Riverpod(keepAlive: true)
SentryFeedbackService sentryFeedbackService(Ref ref) =>
    SentryFeedbackService(ref);
```

Run codegen: `dart run build_runner build --delete-conflicting-outputs`.

Known limitations to document in the service file:
- CanvasKit only on web — HTML renderer produces blank screenshots.
- Platform views (native maps, WebView) invisible in screenshots — pure Flutter widgets work.
- `showDialog(useRootNavigator: true)` appears above the feedback overlay.

#### 5.4 Gating the trigger button

Any widget that calls `sentryFeedbackService.show(context)` should be guarded:

```dart
// Show only when BetterFeedback is in the tree
final showFeedback = !kIsWeb || isCanvasKitRenderer();
if (showFeedback) IconButton(
  icon: const Icon(Icons.feedback_outlined),
  onPressed: () => ref.read(sentryFeedbackServiceProvider).show(context),
)
```

### Mobile (Android / iOS)

- No additional native init code needed for Sentry 9.x — Dart-side `SentryFlutter.init` covers native crash capture.
- iOS screenshot caveat: auto-screenshot (`attachScreenshot: true`) may fail on iOS because the UI thread may not be available during a crash. Leave `attachScreenshot: false` by default.
- Android release builds require `--obfuscate --split-debug-info=build/debug-info` for readable stack traces. See Phase 6.

---

## Phase 6 — Release & CI checklist

See `references/release-uploads.md` for full build commands and CI snippets.

### 6.1 pubspec.yaml sentry block

Append to the target `pubspec.yaml`. Ask the user for their Sentry `org` and `project` slugs:

```yaml
# https://docs.sentry.io/platforms/flutter/upload-debug/#available-configuration-fields
sentry:
  project: <your-sentry-project-slug>
  org: <your-sentry-org-slug>
  upload_debug_symbols: true
  upload_source_maps: true
  upload_sources: true
  wait_for_processing: false
  commits: auto
  ignore_missing: true
```

### 6.2 CI snippets

Emit two distinct invocation patterns — they are **mutually exclusive per build type**:

**Web release** (source maps; no dSYM):
```bash
flutter build web --release --source-maps \
  --dart-define-from-file=dart_defines.json

dart run sentry_dart_plugin \
  --sentry-define=upload_source_maps=true \
  --sentry-define=upload_sources=true \
  --sentry-define=upload_debug_symbols=false
```

**Android release** (dSYM; no source maps):
```bash
flutter build apk --release --obfuscate \
  --split-debug-info=build/debug-info \
  --dart-define-from-file=dart_defines.json

dart run sentry_dart_plugin \
  --sentry-define=upload_debug_symbols=true \
  --sentry-define=upload_source_maps=false \
  --sentry-define=symbols_path=build/debug-info
```

### 6.3 Required secrets / env vars

| Variable | Purpose | GitHub Secret name pattern |
|----------|---------|---------------------------|
| `SENTRY_AUTH_TOKEN` | Org auth token for sentry_dart_plugin uploads | `<APP>_SENTRY_AUTH_TOKEN` |
| `SENTRY_DSN` | Project DSN passed as `--dart-define` | `<APP>_SENTRY_DSN_PROD` |

Generate the token in Sentry dashboard: **Settings → Auth Tokens → Create New Token**.

Set locally:
- macOS/Linux: `export SENTRY_AUTH_TOKEN=sntrys_...` in `~/.zshrc`
- Windows: `$env:SENTRY_AUTH_TOKEN = "sntrys_..."` in `$PROFILE`

### 6.4 Known limitation

Even after uploading debug symbols, Sentry issue **titles** remain obfuscated. This is a known Sentry limitation ([getsentry/sentry#48334](https://github.com/getsentry/sentry/issues/48334)). Stack frames within the issue detail are correctly symbolicated. No action needed — document this for the team.

---

## Phase 7 — Closing summary

Print a summary grouped by action type:

### Files created
- List each new file with path.

### Files modified
- List each modified file with a one-line description of the change.

### Packages added
- List each package and the command used.

### Checklist for the developer

Items that cannot be automated:

- [ ] Provide Sentry `org` and `project` slugs → update `pubspec.yaml` `sentry:` block
- [ ] Generate `SENTRY_AUTH_TOKEN` in Sentry dashboard and add to CI secrets
- [ ] Add `SENTRY_DSN` prod value to CI secrets / `dart_defines.json.example`
- [ ] Run `dart run build_runner build` to generate `sentry_feedback_service.g.dart`
- [ ] Smoke-test: throw a deliberate exception and verify it appears in the Sentry dashboard
- [ ] Optional: wire `Sentry.configureScope` with authenticated user ID once auth integration is in place
- [ ] Optional: set `options.release` and `options.dist` from `package_info_plus` before first public release
- [ ] Optional: enable `attachScreenshot: true` for mobile if UI-thread screenshots are acceptable (iOS caveat applies)

### References

For deeper context on each decision, see:
- `skills/sentry-init/references/initialization-flow.md` — why Approach 3 (no appRunner)
- `skills/sentry-init/references/logger-decorator-pattern.md` — decorator architecture and severity mapping
- `skills/sentry-init/references/gorouter-and-dio-wiring.md` — observer placement, Dio breadcrumbs, CORS
- `skills/sentry-init/references/web-feedback-canvaskit.md` — BetterFeedback integration and CanvasKit gate
- `skills/sentry-init/references/release-uploads.md` — source maps vs dSYM upload commands
