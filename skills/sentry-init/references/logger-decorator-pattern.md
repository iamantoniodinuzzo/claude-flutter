# Sentry Logger Decorator Pattern

> Adapted from `Engage-srl/pollicino_viewer` — `apps/tomcat_portal/ai_docs/sentry/feedback_sentry_integration.md`
> and `sentry_error_capture_architecture.md`. Project-specific paths replaced with generic equivalents.

---

## Why a Decorator, Not a Standalone ErrorLogger

The Sentry docs often recommend a dedicated `ErrorLogger` class. That works for greenfield projects. When a project already has a widely-used `LoggerService` abstraction, the decorator pattern achieves the same Sentry coverage at a fraction of the migration cost:

- `loggerServiceProvider` typically has many consumers — 30–50+ files in a mature app.
- Three global error hooks (`FlutterError.onError`, `PlatformDispatcher.instance.onError`, `AsyncErrorLogger` ProviderObserver) already call `loggerService.e(...)`.
- ~50–80+ `catch (e, st)` blocks across feature code already call `loggerService`.

Adding a parallel `ErrorLogger` would require touching every call site. The decorator intercepts all existing calls transparently: **zero changes to feature code**.

---

## Architecture

```
                         ┌──────────────────────────┐
loggerServiceProvider ─► │  SentryLoggerService     │ ──► Sentry SDK
(when DSN is present)    │  (decorator)             │
                         └──────────────┬───────────┘
                                        │ delegates every call
                                        ▼
                         ┌──────────────────────────┐
                         │  LoggerServiceImpl       │ ──► package:logger / console
                         └──────────────────────────┘
```

When `SENTRY_DSN` is empty (local dev, unit tests): `loggerServiceProvider` returns `LoggerServiceImpl` directly — the decorator is never constructed, and the Sentry SDK is never called.

---

## Severity Mapping

| Method | Forwards to delegate | Sentry action |
|--------|---------------------|---------------|
| `t` (trace) | yes | none |
| `d` (debug) | yes | `addBreadcrumb(level: debug)` |
| `i` (info) | yes | `addBreadcrumb(level: info)` |
| `w` (warn) | yes | `captureException` or `captureMessage` at warning |
| `e` (error) | yes | `captureException` or `captureMessage` at error |
| `f` (fatal) | yes | `captureException` at fatal |

**Capture rule**: if `error` argument is non-null → `captureException(error, stackTrace: st)` (Sentry shows full stack trace). If `error` is null (message-only log) → `captureMessage(message, level: level)`.

Both calls use `.ignore()` on the returned `Future<SentryId>` to preserve the synchronous `void` signature of `LoggerService`.

---

## Provider Wiring with DSN Gate

```dart
@Riverpod(keepAlive: true)
LoggerService loggerService(Ref ref) {
  final base = /* LoggerServiceImpl construction */;
  final dsn = const String.fromEnvironment('SENTRY_DSN');
  if (dsn.isEmpty) return base;
  return SentryLoggerService(base);
}
```

The DSN is injected at compile time via `--dart-define=SENTRY_DSN=...` or `--dart-define-from-file=dart_defines.json`.

---

## ProviderObserver Integration

The decorator captures errors from all `catch` blocks and direct `loggerService.e(...)` calls. For provider-level async errors, a `ProviderObserver` bridges the gap:

```dart
class AsyncErrorLogger extends ProviderObserver {
  const AsyncErrorLogger(this._logger);
  final LoggerService _logger;

  @override
  void didUpdateProvider(ProviderBase provider, Object? previousValue,
      Object? newValue, ProviderContainer container) {
    if (newValue case AsyncError(:final error, :final stackTrace)) {
      _logger.e(
        'Provider ${provider.name ?? provider.runtimeType} error',
        error,
        stackTrace,
      );
    }
  }
}
```

When `loggerService` is the `SentryLoggerService` decorator, any `_logger.e(...)` call inside `AsyncErrorLogger` automatically calls `Sentry.captureException`. No direct Sentry import needed in the observer.

---

## Testing

Tests never touch the Sentry SDK because they override the provider with a fake:

```dart
ProviderScope(
  overrides: [
    loggerServiceProvider.overrideWithValue(FakeLoggerService()),
  ],
  child: widgetUnderTest,
)
```

`SentryLoggerService` is never instantiated in test context. No `SentryFlutter.init` call required in tests.

---

## When to Use Branch B Instead

If the project has **no `LoggerService` abstraction**, use `SentryProviderObserver` (see SKILL.md Branch B). This is a standalone `ProviderObserver` that calls `Sentry.captureException` directly on `AsyncError` updates. It is simpler but only covers provider errors — `catch` blocks in feature code will not automatically report to Sentry unless they explicitly call `Sentry.captureException`.

Document Branch B as temporary: "When LoggerService is added later, replace this observer with the SentryLoggerService decorator pattern."

---

## Future Work

- Wire `Sentry.configureScope` with authenticated user ID in the auth integration PR.
- Set `options.release` and `options.dist` from `package_info_plus` before first public release.
- Prune noisy expected exceptions per catch site reactively as Sentry noise appears.
