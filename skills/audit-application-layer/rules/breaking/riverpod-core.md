<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ bac1f742129af4c111381d9cdb576a3e90f1b412 -->
# Riverpod core – principles, provider selection, parameter rules, ref API

**Version**: Riverpod 3.x  
**Source**: split from `riverpod.md` to support smaller, task-focused seeds.

Use this file when you need the **core mental model** and the **must-follow**
rules (`@riverpod`, parameter order, `watch/read/listen`).

---

## Core principles

- Providers = **READ** (computed or fetched state)
- Notifiers = **WRITE** (methods that update state)
- Always use **code generation** (`@riverpod`, not manual providers)
- Always handle all `AsyncValue` states: data, loading, error
- Keep providers **pure** and **side-effect-free**

---

## Riverpod 3.x notes (important)

### Legacy APIs moved under `legacy.dart`

Riverpod 3.x treats these as **legacy** (avoid for new code):

- `StateProvider`
- `StateNotifierProvider`
- `ChangeNotifierProvider`

If you must maintain existing legacy code, import them from:

```dart
import 'package:flutter_riverpod/legacy.dart';
```

### Unified autoDispose interfaces

In Riverpod 3.x, “autoDispose” no longer requires separate public base classes
like `AutoDisposeNotifier`/`AutoDisposeRef`. Prefer `Notifier`/`AsyncNotifier`
and rely on `riverpod_lint` for misuse.

### `ProviderException` wrapper

Provider failures caused by a dependency may be wrapped in `ProviderException`.
If you log provider failures globally (e.g. via `ProviderObserver`), ignore
`ProviderException` to avoid duplicate logging.

---

## Choosing the right provider (rule of thumb)

- **Sync read-only value** → `@riverpod T`
- **Async read-only** → `@riverpod Future<T>` / `@riverpod Stream<T>`
- **Local UI state** → `Notifier`
- **Business logic + loading/error + actions** → `AsyncNotifier`
- **Continuous real-time data** → stream providers (or `StreamNotifier` if you need actions too)

---

## Provider types (quick reference)

| Provider Type | Use case |
| --- | --- |
| `@riverpod T` | sync read-only |
| `@riverpod Future<T>` | async read-only |
| `@riverpod Stream<T>` | continuous data |
| `Notifier` | mutable sync UI state |
| `AsyncNotifier` | mutable async state |
| `StreamNotifier` | stream + actions |

---

## Parameter ordering rules (non-negotiable)

```dart
@riverpod
Future<User> user(Ref ref, String userId) async {
  // Ref first, then params
}

@riverpod
class TodoNotifier extends _$TodoNotifier {
  @override
  List<Todo> build(String listId) {
    // build() takes only params (no Ref)
    return const [];
  }
}
```

Rules:

1. Function providers: `Ref ref` always first.
2. Notifier `build(...)`: params only.
3. Required params first, then optional (Dart rule).

---

## ref API – watch, read, listen, invalidate, refresh

**watch (reactive read)**

```dart
final user = ref.watch(userProvider);
```

**read (one-shot read in callbacks)**

```dart
onPressed: () {
  final notifier = ref.read(counterNotifierProvider.notifier);
  notifier.increment();
}
```

**listen (side effects: navigation, toasts, dialogs, analytics)**

```dart
ref.listen(authStateProvider, (previous, next) {
  if (previous?.isAuthenticated != next.isAuthenticated) {
    if (next.isAuthenticated) {
      Navigator.of(context).pushNamed('/home');
    } else {
      Navigator.of(context).pushNamed('/login');
    }
  }
});
```

Note (Flutter): inside widgets, `WidgetRef` also has `listenManual` (listen
outside `build`) and `context`. See `riverpod-flutter.md`.

**invalidate / refresh**

```dart
ref.invalidate(userProvider);
final value = ref.refresh(userProvider);
```

---

## Notifier helpers: `listenSelf()` (migrating from StateNotifier listeners)

If you need to react to **your own state changes** inside a `Notifier` /
`AsyncNotifier`, prefer `listenSelf` (instead of `StateNotifier.addListener` or
`stream.listen` from legacy patterns):

```dart
@riverpod
class CounterNotifier extends _$CounterNotifier {
  @override
  int build() {
    listenSelf((previous, next) {
      // debugPrint('$previous -> $next');
    });
    return 0;
  }

  void increment() => state++;
}
```
