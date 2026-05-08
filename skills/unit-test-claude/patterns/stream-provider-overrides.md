# Pattern: StreamProvider Overrides in Tests

## The problem

A `@riverpod` function that returns `Stream<T>` creates a provider whose state is
`AsyncValue<T>`. How you override it determines whether the container sees `AsyncData`
immediately or `AsyncLoading` first.

## Two strategies — pick the right one

| You are testing… | Correct override |
|---|---|
| The StreamProvider **itself** | `overrideWith((ref) => Stream.value(v))` |
| A **computed** provider that `ref.watch`s the stream as `AsyncValue<T>` | `overrideWithValue(AsyncData(v))` |

### Strategy A — `overrideWith` (testing the StreamProvider itself)

The container subscribes to the stream; initial state is `AsyncLoading` until the
first event arrives. You must `await` before asserting.

```dart
final container = ProviderContainer.test(
  overrides: [
    fooStreamProvider.overrideWith((ref) => Stream.value([item])),
  ],
);

// MUST await — state starts as AsyncLoading
final value = await container.read(fooStreamProvider.future);
expect(value, [item]);
```

### Strategy B — `overrideWithValue` (testing a computed provider)

Sets the state to `AsyncData` synchronously — no async plumbing, no `await`.
Use when the dependency is consumed through `whenData` / pattern matching inside
another provider.

```dart
// computed provider under test:
// @riverpod
// AsyncValue<List<Foo>> filteredFoos(Ref ref) {
//   final asyncItems = ref.watch(fooStreamProvider);
//   return asyncItems.whenData((items) => items.where(...).toList());
// }

final container = ProviderContainer.test(
  overrides: [
    fooStreamProvider.overrideWithValue(AsyncData([item1, item2])),
  ],
);

// Read synchronously — no await required
final result = container.read(filteredFoosProvider);
expect(result.value!, [item1]);
```

## Testing the AsyncLoading fallback

```dart
// Loading state → fallback behaviour
final containerLoading = ProviderContainer.test(
  overrides: [
    fooStreamProvider.overrideWithValue(const AsyncLoading()),
    otherProvider.overrideWithValue(AsyncData([item])),
  ],
);
final result = containerLoading.read(filteredFoosProvider);
expect(result.value!, [item]); // item still visible because fallback = []

// AsyncData state → normal filter
final containerData = ProviderContainer.test(
  overrides: [
    fooStreamProvider.overrideWithValue(AsyncData([toFilter, toKeep])),
    otherProvider.overrideWithValue(AsyncData([item])),
  ],
);
expect(containerData.read(filteredFoosProvider).value!, [toKeep]);
```

## Testing AsyncError propagation

```dart
final container = ProviderContainer.test(
  overrides: [
    fooStreamProvider.overrideWithValue(
      AsyncError(FooException(), StackTrace.empty),
    ),
  ],
);

final result = container.read(filteredFoosProvider);
expect(result, isA<AsyncError>());
```
