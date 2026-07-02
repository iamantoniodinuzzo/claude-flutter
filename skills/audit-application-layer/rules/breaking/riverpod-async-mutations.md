<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ bac1f742129af4c111381d9cdb576a3e90f1b412 -->
# Riverpod async & mutations – AsyncValue, AsyncNotifier, guard(), error patterns

**Version**: Riverpod 3.x  
**Source**: split from `riverpod.md` to support smaller, task-focused seeds.

Use this file when you implement **actions** (CRUD, auth, workflows) and you
need loading/error states modeled via `AsyncValue`.

---

## AsyncNotifier (mutable async state)

```dart
@riverpod
class ItemsController extends _$ItemsController {
  @override
  FutureOr<List<Item>> build(String listId) async {
    final repo = ref.watch(itemsRepositoryProvider);
    return repo.fetchItems(listId);
  }

  Future<void> addItem(Item item) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(itemsRepositoryProvider);
      await repo.addItem(item);
      return await future;
    });
  }
}
```

Rules:

- Use `AsyncValue.guard()` to capture errors + stack trace automatically.
- Prefer reloading from `future` after a successful mutation when the source of
  truth is remote.

---

## Handling AsyncValue in UI (always exhaustive)

```dart
return switch (itemsAsync) {
  AsyncData(:final value) => ItemsList(items: value),
  AsyncError(:final error) => ErrorView(error: error),
  _ => const LoadingView(),
};
```

---

## Riverpod 3.x: `ProviderException` and error reporting

Riverpod 3.x may wrap errors as `ProviderException` when a provider fails
because one of its dependencies failed. If you have global error reporting via
`ProviderObserver`, ignore `ProviderException` to avoid duplicate logging.

---

## Extracting data from AsyncValue in computed providers

`AsyncValue.valueOrNull` is **not available** in Riverpod 3.x.
Use a `switch` expression to safely extract data in computed providers.

```dart
// ❌ COMPILE ERROR — valueOrNull undefined
final devices = ref.watch(devicesProvider).valueOrNull ?? <Device>[];

// ✅ CORRECT — exhaustive switch
final devicesAsync = ref.watch(devicesProvider);
final devices = switch (devicesAsync) {
  AsyncData(:final value) => value,
  _ => <Device>[],
};
```

This applies everywhere you need to extract a value from `AsyncValue`
outside of a widget build: inside other providers, services, or
`AsyncNotifier.build()`.

---

## Anti-pattern: whenData() as side effect in build()

Do **not** trigger writes/updates inside provider `build()` (or widget build).
If you need reactive side effects, use `ref.listen(...)`.

```dart
// ❌ DO NOT
@override
List<Item> build(String listId) {
  final asyncDep = ref.watch(depProvider);
  asyncDep.whenData((value) {
    // side effect
    _doSomething(value);
  });
  return const [];
}
```
