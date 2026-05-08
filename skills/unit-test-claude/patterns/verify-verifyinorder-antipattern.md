# Pattern: verify() + verifyInOrder() Anti-pattern

## The Problem

In **mocktail 1.0.x**, calling `verify()` on a mock **before** calling `verifyInOrder()` on the same mock in the same test marks all recorded interactions as `[VERIFIED]`. When `verifyInOrder` then runs, it finds no unverified calls and fails with:

```
There were no invocations
```

or:

```
Matching call #2 not found
```

## Example of the Broken Pattern

```dart
test('state transitions correctly', () async {
  // ...
  final listener = Listener<AsyncValue<void>>();
  container.listen(provider, listener.call, fireImmediately: true);

  await container.read(provider.notifier).doSomething();

  // WRONG: this verify() marks all listener calls as [VERIFIED]
  verify(() => listener(null, const AsyncData<void>(null))).called(1);

  // WRONG: verifyInOrder now finds nothing — all calls already verified
  verifyInOrder([
    () => listener(null, const AsyncLoading<void>()),
    () => listener(any(), const AsyncData<void>(null)),
  ]);
});
```

## Fix Option 1: Use Only `verifyInOrder` (Preferred for Order Assertions)

Never call `verify()` before `verifyInOrder()` on the same mock. Put everything in `verifyInOrder`:

```dart
verifyInOrder([
  () => listener(null, isA<AsyncLoading<void>>()),
  () => listener(any(), const AsyncData<void>(null)),
]);
```

## Fix Option 2: Use Direct State Assertions (Preferred for AsyncNotifier)

For `AsyncNotifier` controllers, skip `Listener` entirely and assert on the container state directly. This is simpler, more readable, and avoids the `verify`/`verifyInOrder` clash:

```dart
test('given service throws when method called then final state is AsyncError', () async {
  when(() => mockService.doSomething()).thenThrow(Exception('boom'));

  final container = makeContainer();
  await container.read(fooControllerProvider.notifier).doSomething();

  expect(container.read(fooControllerProvider), isA<AsyncError<void>>());
});

test('given successful call when method called then final state is AsyncData', () async {
  when(() => mockService.doSomething()).thenAnswer((_) async => 'result');

  final container = makeContainer();
  final result = await container.read(fooControllerProvider.notifier).doSomething();

  expect(result, 'result');
  expect(container.read(fooControllerProvider), const AsyncData<void>(null));
});
```

## Fix Option 3: Use a `<List<State>>` Spy for Transition Tests

For testing the full transition sequence (idle → loading → data), collect states via `container.listen` into a list:

```dart
final states = <AsyncValue<void>>[];
container.listen(
  fooControllerProvider,
  (_, next) => states.add(next),
  fireImmediately: true,
);
await container.read(fooControllerProvider.notifier).doSomething();

expect(states[0], const AsyncData<void>(null)); // initial
expect(states[1], isA<AsyncLoading<void>>());
expect(states[2], const AsyncData<void>(null)); // after success
```

This avoids `Listener` mocks entirely and never needs `verify`.

## Decision Tree

```
Do you need to assert ORDER of calls?
  └─ Yes → Use verifyInOrder ONLY (no verify() before it on same mock)
         → OR use List<State> spy

Do you need call COUNT only?
  └─ Yes → Use verify().called(N)

Do you need final state only?
  └─ Yes → Use container.read(provider) — no Listener needed
```

## Rule Summary

**Never mix `verify()` and `verifyInOrder()` on the same mock in the same test.**
Prefer direct state assertions for `AsyncNotifier` — they are simpler and immune to this issue.
