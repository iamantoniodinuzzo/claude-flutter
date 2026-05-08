# Pattern: FutureProvider Error Paths (auto-dispose)

## The problem

Testing `AsyncError` states on `@riverpod FutureProvider` (auto-dispose) has
three failure modes to avoid:

- **`ProviderContainer.test()` + `.future` getter** → `StateError: provider disposed during loading state`. Auto-dispose races with synchronous teardown.
- **`Future.delayed(Duration.zero)` or `pumpEventQueue()`** → state never transitions. These drain the Dart queue but NOT Riverpod's `_ProviderScheduler`.
- **`Completer` waiting for non-loading state** → times out. The Riverpod scheduler never flushes without `container.pump()`.

## Two patterns — choose based on what you need to verify

### Pattern A — state assertion only (no `verify()` needed)

Bypass the async machinery entirely with `overrideWithValue(AsyncValue.error(...))`.
This is synchronous and has no race condition.

```dart
test(
  'given the repo throws '
  'when provider state is read '
  'then it is AsyncError',
  () async {
    final exception = FetchFooException();
    final container = ProviderContainer.test(
      overrides: [
        fooProvider(id).overrideWithValue(
          AsyncValue.error(exception, StackTrace.empty),
        ),
      ],
    );

    final state = container.read(fooProvider(id));
    expect(state, isA<AsyncError<Foo>>());
    expect(state.error, exception);

    // .future on an AsyncError provider also rejects immediately
    await expectLater(
      container.read(fooProvider(id).future),
      throwsA(same(exception)),
    );
  },
);
```

### Pattern B — execution verification (need `verify(mockRepo.method)`)

Use `ProviderContainer(...)` (NOT `.test()`), keep the provider alive with
`listen`, then call `await container.pump()` to flush Riverpod's scheduler.

```dart
test(
  'given the repo throws '
  'when provider builds '
  'then state is AsyncError and repo was called once',
  () async {
    when(() => mockRepo.fetchFoo(any())).thenThrow(FetchFooException());

    // Manual container — addTearDown fires after body, no disposal race
    final container = ProviderContainer(
      overrides: [fooRepositoryProvider.overrideWithValue(mockRepo)],
    );
    addTearDown(container.dispose);

    // listen() keeps the auto-dispose provider alive
    final sub = container.listen(
      fooProvider(id),
      (_, __) {},
      fireImmediately: true,
    );

    // Flush Riverpod's internal scheduler — required for state transitions
    await container.pump();

    expect(sub.read(), isA<AsyncError<Foo>>());
    verify(() => mockRepo.fetchFoo(any())).called(1);
  },
);
```

## Decision table

| Need | Pattern |
|---|---|
| Assert that state is `AsyncError` | A — `overrideWithValue(AsyncValue.error(...))` |
| Also verify the mock was called (call count, captured args) | B — manual container + `listen` + `container.pump()` |

## Critical rule

**Do NOT use `pumpEventQueue()`** for Riverpod state assertions.
`pumpEventQueue()` drains the Dart event loop but NOT Riverpod's `_ProviderScheduler`.
Only `container.pump()` flushes the Riverpod pipeline.
