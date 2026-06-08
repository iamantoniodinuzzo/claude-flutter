# GoRouter Observer, Dio Breadcrumbs, and Event Filtering

> Adapted from `Engage-srl/pollicino_viewer` — `apps/tomcat_portal/ai_docs/sentry/sentry_additional_options.md`.
> Project-specific paths replaced with generic equivalents.

---

## SentryNavigatorObserver with GoRouter

`MaterialApp.router` does **not** have a `navigatorObservers` argument. When using GoRouter, add the observer to the `GoRouter` constructor instead:

```dart
final goRouter = GoRouter(
  initialLocation: '/',
  observers: [SentryNavigatorObserver()],  // ← correct placement
  routes: [...],
);

// In widget:
MaterialApp.router(routerConfig: goRouter);
```

For a Riverpod-generated router:

```dart
@riverpod
GoRouter router(Ref ref) {
  return GoRouter(
    observers: [SentryNavigatorObserver()],
    refreshListenable: RouterNotifier(ref),
    routes: [...],
  );
}
```

### Named Routes Requirement

`SentryNavigatorObserver` is only useful with **named routes**. Without route names, the observer cannot infer the route name and all breadcrumbs show `/unknown`.

Add `name:` to each `GoRoute` if not already present:

```dart
GoRoute(
  path: '/home',
  name: 'home',       // ← required for meaningful breadcrumbs
  builder: (ctx, s) => const HomeScreen(),
),
```

If the project has no named routes, emit an advisory rather than silently wiring a no-op observer.

---

## HTTP Breadcrumbs with sentry_dio

Install `sentry_dio`, then call `dio.addSentry()` when constructing the `Dio` client:

```dart
@Riverpod(keepAlive: true)
Dio dio(Ref ref) {
  final dio = Dio();
  if (kDebugMode) {
    dio.interceptors.add(LoggingInterceptor());
  }
  dio.addSentry();   // ← adds HTTP breadcrumbs for all requests
  return dio;
}
```

This adds `sentry-trace`, `baggage`, and `content-type` headers to all outgoing requests and logs HTTP breadcrumbs for each request/response.

### Web CORS Workaround

On Flutter web, the injected `sentry-trace` and `baggage` headers trigger CORS preflight failures when the target server does not allowlist them. Fix by clearing `tracePropagationTargets` in the `SentryFlutter.init` options block:

```dart
await SentryFlutter.init((options) {
  // ... other options
  options.tracePropagationTargets.clear(); // prevent CORS failures on web
});
```

Reference: [sentry-dart issue #3247](https://github.com/getsentry/sentry-dart/issues/3247)

---

## Event Filtering with beforeSend

Use `beforeSend` to reduce noise and control billing quota:

```dart
options.beforeSend = (SentryEvent event, Hint hint) async {
  // Drop all events from debug builds
  if (!kReleaseMode) return null;

  // Drop connection errors (DioException with no response = offline, not actionable)
  final exception = event.throwable;
  if (exception is DioException && exception.response == null) return null;

  return event;
};
```

`beforeSend` fires for both uncaught exceptions and explicit `Sentry.captureException` calls. Returning `null` drops the event entirely.

Remove the `DioException` filter if the project does not use Dio.

---

## Stack Trace Clarity: In-App Frames

Grey out third-party frames in Sentry's stack trace view:

```dart
options.considerInAppFramesByDefault = false;
options.addInAppInclude('your_package_name');  // from pubspec.yaml name:
```

This marks only your app's own frames as "in-app" — third-party packages are collapsed in the Sentry dashboard, making errors much easier to read.

---

## Sentry Breadcrumbs (automatic)

Sentry automatically collects breadcrumbs for:
- Console logs
- App lifecycle events (foreground, background)
- Network connectivity changes
- Device orientation changes
- Battery level changes

`SentryNavigatorObserver` adds route navigation events to this trail. `sentry_dio` adds HTTP request/response events.

---

## Sentry Example App

For a comprehensive tour of all available `SentryFlutterOptions`, see the official Flutter example: [getsentry/sentry-dart/flutter/example](https://github.com/getsentry/sentry-dart/tree/main/flutter/example). It demonstrates `debug`, `attachScreenshot`, `enableMetrics`, and many more options.

---

## GDPR / PII Defaults

- Leave `attachScreenshot: false` and `attachViewHierarchy: false` by default — screenshots and view hierarchies may capture PII.
- Do not set `sendDefaultPii: true` unless explicitly reviewed for compliance.
- Use [Sentry Advanced Data Scrubbing](https://docs.sentry.io/security-legal-pii/scrubbing/advanced-datascrubbing/) for server-side PII redaction.
- Wire `Sentry.configureScope` with user ID only after explicit user consent or opt-in.
