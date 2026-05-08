---
name: flutter-go-router
description: Use when implementing, reviewing, or debugging navigation in Flutter apps that use go_router — routes, guards, shell navigation, type-safe routes, deep linking, nested navigators, or bottom nav persistence.
---

# Flutter GoRouter Navigation

## Overview

GoRouter is Flutter's declarative, URL-based router built on the Router API.
Core rule: **routes define structure; `go()` replaces stack, `push()` adds to it.**

## Route Types

| Type | Use case |
|------|----------|
| `GoRoute` | Standard screen/page |
| `ShellRoute` | Persistent UI wrapper (e.g. BottomNavigationBar) — stateless |
| `StatefulShellRoute` | Persistent shell with independent navigation stacks per branch |

## Setup

```dart
// app_router.dart
final goRouter = GoRouter(
  initialLocation: '/',
  debugLogDiagnostics: true,           // enable in dev
  routes: [...],
  redirect: _guard,                    // top-level auth guard
  errorBuilder: (ctx, state) => ErrorScreen(error: state.error),
);

// main.dart
MaterialApp.router(routerConfig: goRouter);
```

With Riverpod:

```dart
@riverpod
GoRouter router(Ref ref) {
  final authState = ref.watch(authStateProvider);
  return GoRouter(
    refreshListenable: RouterNotifier(ref),  // re-evaluate redirects on state change
    redirect: (ctx, state) => _guard(authState, state),
    routes: [...],
  );
}
```

## Navigation Methods

```dart
context.go('/home');                  // replace entire stack
context.push('/detail/42');           // push on stack
context.pushReplacement('/login');    // replace top of stack
context.pop();                        // pop (only if canPop)
context.canPop();

// Named routes
context.goNamed('detail', pathParameters: {'id': '42'});
context.pushNamed('detail', pathParameters: {'id': '42'}, queryParameters: {'tab': 'info'});

// Pass non-serializable objects via extra
context.push('/detail', extra: myObject);
```

## Path & Query Parameters

```dart
GoRoute(
  path: '/item/:id',
  name: 'item',
  builder: (ctx, state) {
    final id = state.pathParameters['id']!;
    final tab = state.uri.queryParameters['tab'];
    final obj = state.extra as MyObject?;
    return ItemScreen(id: id, tab: tab, obj: obj);
  },
),
```

## URL-Driven Tab / Query-Param State

Replace a Riverpod/Provider tab state with the URL as the single source of truth.

**Rule**: if the state can live in the URL → it should. Enables deep links, browser back, bookmarking for free.

### Reading — anywhere in the widget tree

```dart
// In build() — GoRouterState rebuilds widget when URL changes
final dest = DashboardDestinations.fromQueryParam(
  GoRouterState.of(context).uri.queryParameters['tab'],
) ?? DashboardDestinations.missions;   // always non-null fallback
```

### Writing — navigate to change tab

```dart
// Inline URI string — the correct way with context.go()
context.go('/dashboard?tab=${dest.queryParam}');

// goNamed alternative (has queryParameters named param)
context.goNamed('dashboard', queryParameters: {'tab': dest.queryParam});
```

> **Gotcha**: `context.go()` has **no** `queryParameters` named param — inline only.
> `context.goNamed()` has it. Both approaches work; pick one per call-site.

### Syncing TabController to URL (didUpdateWidget)

When a `TabController` lives alongside URL routing, sync it when the URL changes externally (browser back, deep link):

```dart
@override
void didUpdateWidget(MyTabWidget oldWidget) {
  super.didUpdateWidget(oldWidget);
  if (oldWidget.currentDestination != widget.currentDestination) {
    final newIndex = widget.tabs.indexOf(widget.currentDestination);
    if (newIndex >= 0 && _tabController?.index != newIndex) {
      _tabController?.animateTo(newIndex);
    }
  }
}
```

### Calling go() from ref.listen (Riverpod)

Navigating in response to a provider change (e.g. permissions revoked → redirect to fallback tab):

```dart
ref.listen(availableDestinationsProvider, (_, next) {
  if (!next.contains(dest)) {
    final fallback = _selectFallback(next);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (context.mounted) {
        context.go('/dashboard?tab=${fallback.queryParam}');
      }
    });
  }
});
```

> **Why addPostFrameCallback**: `ref.listen` fires during build; calling `go()` mid-build triggers a router rebuild conflict. Post-frame callback avoids this.

## Redirects / Auth Guard

```dart
String? _guard(BuildContext context, GoRouterState state) {
  final isLoggedIn = ...;
  final isOnLogin = state.matchedLocation == '/login';

  if (!isLoggedIn && !isOnLogin) return '/login';
  if (isLoggedIn && isOnLogin) return '/home';
  return null;  // no redirect
}
```

Route-level redirect (runs after top-level):

```dart
GoRoute(
  path: '/admin',
  redirect: (ctx, state) => isAdmin ? null : '/home',
  builder: ...,
),
```

## Shell Navigation (Bottom Nav)

### Stateless shell (shared state lost on tab switch)

```dart
ShellRoute(
  builder: (ctx, state, child) => AppScaffold(child: child),
  routes: [
    GoRoute(path: '/home', builder: (ctx, s) => HomeScreen()),
    GoRoute(path: '/profile', builder: (ctx, s) => ProfileScreen()),
  ],
),
```

### Stateful shell (independent stacks per tab, state preserved)

```dart
StatefulShellRoute.indexedStack(
  builder: (ctx, state, navigationShell) =>
      AppScaffold(navigationShell: navigationShell),
  branches: [
    StatefulShellBranch(
      navigatorKey: _homeNavKey,
      routes: [GoRoute(path: '/home', builder: ...)],
    ),
    StatefulShellBranch(
      navigatorKey: _profileNavKey,
      routes: [GoRoute(path: '/profile', builder: ...)],
    ),
  ],
),

// In AppScaffold:
BottomNavigationBar(
  currentIndex: navigationShell.currentIndex,
  onTap: (i) => navigationShell.goBranch(i,
      initialLocation: i == navigationShell.currentIndex), // reset on re-tap
),
```

> **Rule**: use `StatefulShellRoute` when users expect tab state to persist (scroll position, sub-routes, forms).

## Type-Safe Routes (recommended for large apps)

Requires `go_router_builder` + `build_runner`.

```dart
// routes.dart
part 'routes.g.dart';

@TypedGoRoute<HomeRoute>(
  path: '/',
  routes: [TypedGoRoute<DetailRoute>(path: 'detail/:id')],
)
@immutable
class HomeRoute extends GoRouteData with _$HomeRoute {
  @override Widget build(BuildContext ctx, GoRouterState s) => HomeScreen();
}

@immutable
class DetailRoute extends GoRouteData with _$DetailRoute {
  final int id;
  const DetailRoute({required this.id});
  @override Widget build(BuildContext ctx, GoRouterState s) => DetailScreen(id: id);
}

// Navigate:
DetailRoute(id: 42).go(context);
DetailRoute(id: 42).push(context);
```

Extra (non-URL) objects: declare as `final MyObject $extra;` — not URL-serialized, lost on deep link.

## Nested Sub-Routes

```dart
GoRoute(
  path: '/missions',
  builder: (ctx, s) => MissionListScreen(),
  routes: [
    GoRoute(
      path: ':id',              // resolves to /missions/:id
      builder: (ctx, s) => MissionDetailScreen(id: s.pathParameters['id']!),
      routes: [
        GoRoute(
          path: 'playback',     // resolves to /missions/:id/playback
          builder: (ctx, s) => PlaybackScreen(id: s.pathParameters['id']!),
        ),
      ],
    ),
  ],
),
```

## Deep Linking

**Android** (`AndroidManifest.xml`): add `<intent-filter>` with `android.intent.action.VIEW` for your scheme/host.

**iOS** (`Info.plist`): add `CFBundleURLSchemes` or Associated Domains for universal links.

GoRouter handles the URL → route matching automatically.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `go()` when you need back button | use `push()` |
| `pop()` without `canPop()` check | always guard with `if (context.canPop())` |
| Passing `extra` and expecting it on deep link | use URL params for deep-linkable data |
| Missing `refreshListenable` with Riverpod | add `RouterNotifier` to re-run redirects |
| `ShellRoute` when tab state must persist | use `StatefulShellRoute` |
| Named routes with wrong param key | verify key matches `:param` name in path |
| `context.go('/path', queryParameters: {...})` | not valid — inline: `context.go('/path?k=v')` or use `goNamed` |
| Riverpod provider for tab state when URL can hold it | use `GoRouterState.of(context).uri.queryParameters` instead |
| Calling `context.go()` inside `ref.listen` directly | wrap in `addPostFrameCallback` + `context.mounted` guard |

## Quick Decision Tree

```
Need to navigate?
├── Replace entire stack? → go()
├── Add to stack (back works)? → push()
└── Replace top only? → pushReplacement()

Persistent UI (tabs)?
├── State must persist per tab? → StatefulShellRoute
└── Simple shared scaffold? → ShellRoute

Tab/view state inside a screen?
├── Should be bookmarkable / deep-linkable? → query param + GoRouterState.of(context)
└── In-memory only (no URL needed)? → Riverpod provider

Route params?
├── URL-addressable / deep-linkable? → pathParameters / queryParameters
└── In-memory object (no deep link) → extra
```
