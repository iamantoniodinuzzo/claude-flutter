## GoRouter navigation conventions (Flutter)

Use this guide in apps that use GoRouter to avoid inconsistent navigation code.

### 1) Prefer GoRouter APIs for app navigation

In screens/pages:

- prefer `context.go(...)`, `context.push(...)`
- for back navigation, prefer `context.pop(...)`

This keeps navigation behavior consistent with route parsing, deep links, and
redirect logic.

---

### 2) Dialogs: `Navigator.pop` vs `context.pop`

Dialogs are hosted by the `Navigator` that `showDialog` uses.

Both are generally acceptable:

- `Navigator.of(context).pop(result)` (standard Flutter)
- `context.pop(result)` (GoRouter extension, consistent style)

Team convention suggestion:

- **Use `context.pop(...)`** when the file already depends on GoRouter and you
  want uniform navigation style.
- **Use `Navigator.pop(...)`** when you want the most framework-native,
  dependency-light dialog closing.

The important part is consistency inside a project.

---

### 3) Returning values from dialogs

Pattern:

- dialog validates input and returns a value via `pop(value)`
- caller awaits `showDialog<T>()` and performs async work outside the dialog

This avoids mixing "input collection" with "network mutation" in the dialog.

---

### 4) `go` vs `push` on web: URL behavior (go_router v11.1.2+)

**Breaking change in go_router v11.1.2+**: `push` no longer updates the browser
URL. It only affects the Flutter navigation stack. To update the browser address
bar, you must use `go`.

| Method | Browser URL updated | Flutter stack |
|--------|---------------------|---------------|
| `context.go(path)` | Yes | Rebuilds full stack to match path |
| `context.push(path)` | No | Adds on top of current stack |
| `context.replace(path)` | Yes (replaces current entry) | Replaces top |

```dart
// ✅ Navigates AND updates the browser URL (use for deep-linkable screens)
context.goNamed(AppRoute.someScreen.name, pathParameters: {'id': id});

// ❌ On web, this does NOT update the browser URL in go_router v11.1.2+
context.pushNamed(AppRoute.someScreen.name, pathParameters: {'id': id});
```

**Rule**: whenever the destination is a deep-linkable route (visible in the
browser address bar as a URL users can share or bookmark), use `goNamed` / `go`.

---

### 5) Back navigation and URL sync on web

When using `goNamed` to navigate to a child route, the **AppBar back button
uses `Navigator.maybePop()`**, which pops the Flutter stack but does **not**
call GoRouter's URL update logic. The result: the user sees the previous screen
but the browser address bar still shows the child route's URL with query
parameters.

**Fix**: override `leading` in the AppBar with an explicit `BackButton` that
calls `context.goNamed()` to the parent route:

```dart
// ✅ Back button that also updates the browser URL
AppBar(
  leading: BackButton(
    onPressed: () => context.goNamed(
      AppRoute.parentScreen.name,
      pathParameters: {'id': parentId},
    ),
  ),
  ...
)
```

This pattern is needed any time a screen:
1. was reached via `goNamed` (not `push`), AND
2. carries query parameters or path segments that must disappear from the URL
   when the user goes back.

The **browser's native back button** is not affected — GoRouter creates a
browser history entry on `go`, so pressing the browser back button navigates
to the previous URL correctly without any extra code.

---

### 6) Consolidate Scaffolds when overriding the back button

If a screen has multiple `Scaffold`/`AppBar` widgets (e.g. a main state and an
empty state), consolidate them into a single outer `Scaffold` so the back
button override only needs to live in one place:

```dart
// ❌ Two Scaffolds — back button must be duplicated in both
class MyScreen extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    if (condition) return const _EmptyState(); // its own Scaffold + AppBar
    return Scaffold(appBar: AppBar(...), body: ...);
  }
}

// ✅ Single Scaffold — one AppBar with the correct leading
class MyScreen extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(
          onPressed: () => context.goNamed(
            AppRoute.parentScreen.name,
            pathParameters: {'id': parentId},
          ),
        ),
        title: ...,
      ),
      body: condition ? const _EmptyBody() : const _RealContent(),
    );
  }
}

// _EmptyBody is a plain widget with no Scaffold
class _EmptyBody extends StatelessWidget {
  Widget build(BuildContext context) => Center(child: ...);
}
```

---

### 7) Nested routes inside `StatefulShellBranch` (shell routes)

When adding a detail screen reachable from a branch tab (e.g. profile → knowledge management, membership → aeroclub detail), declare it as a **nested `GoRoute`** inside the branch's root `GoRoute`, **not** as a top-level route.

**Critical rules**

- Nested route paths are **relative** — no leading `/`:
  ```dart
  // ✅ correct — relative path
  GoRoute(path: 'knowledge-management', ...)

  // ❌ wrong — absolute path breaks nesting
  GoRoute(path: '/knowledge-management', ...)
  ```
- Declare nested routes in the `routes:` list of their **parent** `GoRoute`, not in the `StatefulShellBranch.routes` list directly.
- Use `goNamed` to navigate to the nested route (updates browser URL).
- Back navigation must call `context.go(AppRoute.parent.path)` — not `context.pop()` — so the URL updates correctly (see section 5).

**Pattern** (mirrors `aircraftDetail`/`flightPlan` in the codebase):

```dart
// In appRouter — branch 0 (profile)
StatefulShellBranch(
  routes: [
    GoRoute(
      path: AppRoute.profile.path,         // e.g. '/profile'
      name: AppRoute.profile.name,
      pageBuilder: ...,
      routes: [                            // nested routes here
        GoRoute(
          path: AppRoute.knowledgeManagement.path,  // 'knowledge-management' (relative)
          name: AppRoute.knowledgeManagement.name,
          pageBuilder: (context, state) => _page(const KnowledgeManagementScreen()),
        ),
      ],
    ),
  ],
),

// In appRouter — branch 3 (membership)
StatefulShellBranch(
  routes: [
    GoRoute(
      path: AppRoute.pilotMembership.path, // e.g. '/membership'
      name: AppRoute.pilotMembership.name,
      pageBuilder: ...,
      routes: [
        GoRoute(
          path: AppRoute.aeroclubDetail.path,  // 'aeroclubs/:aeroclubId' (relative)
          name: AppRoute.aeroclubDetail.name,
          pageBuilder: (context, state) {
            final aeroclubId = state.pathParameters['aeroclubId']!;
            final aeroclubName = state.uri.queryParameters['aeroclubName'] ?? '';
            return _page(AeroclubDetailScreen(
              aeroclubId: aeroclubId,
              aeroclubName: aeroclubName,
            ));
          },
        ),
      ],
    ),
  ],
),
```

**AppRoute enum**: add new entries alongside existing ones, keeping the path value relative (no leading `/`):

```dart
enum AppRoute {
  profile('profile'),
  knowledgeManagement('knowledge-management'),   // navigates to /profile/knowledge-management
  pilotMembership('membership'),
  aeroclubDetail('aeroclubs/:aeroclubId'),        // navigates to /membership/aeroclubs/:id
  // ...
}
```

**Navigating to nested routes**:

```dart
// From anywhere — goNamed resolves the full URL automatically
context.goNamed(AppRoute.knowledgeManagement.name);

context.goNamed(
  AppRoute.aeroclubDetail.name,
  pathParameters: {'aeroclubId': id},
  queryParameters: {'aeroclubName': name},
);
```

**Back button in the nested screen** (see also section 5–6):

```dart
AppBar(
  leading: BackButton(
    onPressed: () => context.go(AppRoute.profile.path), // or .pilotMembership.path
  ),
  ...
)
```
