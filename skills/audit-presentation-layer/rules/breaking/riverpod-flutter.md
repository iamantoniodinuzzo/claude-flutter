<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ bac1f742129af4c111381d9cdb576a3e90f1b412 -->
# Riverpod in Flutter (`flutter_riverpod`) – widget APIs, listening, UI patterns

**Version**: Riverpod 3.x + `flutter_riverpod`  
Use this file for Flutter-specific APIs/patterns that sit on top of core
Riverpod (`riverpod.md`, `riverpod-core.md`).

---

## Widgets: where `WidgetRef` comes from

- `ConsumerWidget` → `WidgetRef ref` in `build`
- `ConsumerStatefulWidget` → `ConsumerState` exposes `ref`
- `Consumer` → `builder: (context, ref, child) { ... }`

Prefer:

- `ConsumerWidget` for stateless UI
- `ConsumerStatefulWidget` when you need lifecycle (`initState`, `dispose`)

---

## Listening in Flutter: `ref.listen` vs `ref.listenManual`

### `ref.listen` (ok in `build` for side-effects)

Use for UI side effects driven by state (dialogs, navigation, snackbars).

```dart
class Example extends ConsumerWidget {
  const Example({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen<AsyncValue<void>>(saveControllerProvider, (previous, next) {
      if (previous?.isLoading == true && next.hasError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Save failed: ${next.error}')),
        );
      }
    });

    return const SizedBox.shrink();
  }
}
```

Rule of thumb:

- Use `ref.listen` when the listener is tied to a widget being mounted and can
  be safely re-registered on rebuild.

### `ref.listenManual` (outside build)

`WidgetRef.listenManual` exists to listen **outside** `build` (e.g. in
`initState`) and keep full control.

```dart
class Example extends ConsumerStatefulWidget {
  const Example({super.key});

  @override
  ConsumerState<Example> createState() => _ExampleState();
}

class _ExampleState extends ConsumerState<Example> {
  @override
  void initState() {
    super.initState();

    ref.listenManual(authStateProvider, (previous, next) {
      // Side effects in lifecycle methods
    });
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
```

---

## `WidgetRef.context`

`WidgetRef` exposes `context`, useful when passing only `ref` around:

```dart
void showError(WidgetRef ref, Object error) {
  ScaffoldMessenger.of(ref.context).showSnackBar(
    SnackBar(content: Text('Error: $error')),
  );
}
```

Still follow Flutter rules: don't use `context` across async gaps without
checking `mounted` (or equivalent flow control).

---

## Performance: `selectAsync` (await + filter rebuilds)

When you have an async provider and want to rebuild only for a subset, use
`selectAsync` (Flutter layer):

```dart
final userName = await ref.watch(
  userProvider.selectAsync((user) => user.name),
);
```

Use this when:

- The provider output is "big"
- You need only one field
- The consumer rebuilds frequently

---

## UI polish: `AsyncValue.when` flags

`AsyncValue.when(...)` supports flags to control UI transitions:

- `skipLoadingOnReload`
- `skipLoadingOnRefresh`
- `skipError`

Use these when you want to preserve previous UI while refreshing, instead of
showing a full-screen spinner.

---

## Tests: `ProviderContainer.pump`

In tests (especially async), you can wait for provider notifications/disposal:

```dart
final container = ProviderContainer();

// trigger something that updates providers...

await container.pump(someProvider);
```

Combine with `ProviderContainer.test()` from Riverpod 3.x when possible.
