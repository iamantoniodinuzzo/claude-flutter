# Pattern: Notifier with Internal ref.listen

## What This Covers

A `Notifier` (sync, not `AsyncNotifier`) whose action method:
1. Performs an async operation (e.g. `sendOrder`)
2. Then calls `ref.listen(someStreamProvider(id), callback)` internally to track the result stream

This is distinct from `build()` watching a provider — here the stream subscription is created on-demand inside a user-triggered action.

## The Testing Challenge

The internal `ref.listen` creates a subscription to a **stream provider**. That provider is built from a dependency (e.g. a service mock). To control stream emissions in tests, you must:

1. Override the **service provider** — not the stream provider directly
2. Use `StreamController` to control exactly when and what the stream emits
3. Pump the microtask queue (`await Future<void>.value()`) after each emission, because `ref.listen` callbacks are dispatched asynchronously

## Setup Pattern

```dart
// The notifier internally does:
//   ref.listen(watchFooOrderProvider(orderId), (_, order) { ... })
// watchFooOrderProvider delegates to service.watchOrder(orderId)

test('given stream emits completed status then state transitions to completed', () async {
  final streamController = StreamController<FooOrder?>();
  addTearDown(streamController.close); // always close

  when(() => mockService.sendOrder(any()))
      .thenAnswer((_) async => 'order-123');
  when(() => mockService.watchOrder('order-123'))
      .thenAnswer((_) => streamController.stream);

  final container = makeContainer(); // overrides fooServiceProvider
  final states = <FooState>[];
  container.listen(fooControllerProvider, (_, next) => states.add(next), fireImmediately: true);

  // Trigger the action — this sets up the internal ref.listen
  await container.read(fooControllerProvider.notifier).sendOrder(scenarioId: 'sc-1');

  // At this point, the internal subscription is active — emit something
  streamController.add(FooOrder(status: OrderStatus.completed, ...));

  // Pump microtask queue — ref.listen callback runs asynchronously
  await Future<void>.value();

  expect(states.last.phase, FooPhase.completed);
});
```

## Key Rules

**Always `addTearDown(streamController.close)`** — if you forget, closed containers from `ProviderContainer.test()` may log errors about stream subscriptions on disposed providers.

**`await Future<void>.value()` after each emission** — without this, `ref.listen` callbacks haven't fired yet and state assertions will see the pre-emission state.

**Do NOT use `await streamController.done`** — that would block until the stream closes.

**Use `StreamController` (not `Stream.value`)** — `Stream.value` emits synchronously during construction, before the internal subscription is set up.

**Use `fireImmediately: true` on your state spy** — to capture the initial state as index 0.

## Testability Smell — Flag in Phase 0

A Notifier that sets up its own `ref.listen` inside an action method conflates two responsibilities:
- **Command**: sending the order
- **Query**: observing its result

This pattern makes testing harder because:
- The stream subscription lifecycle is opaque (when is it cancelled?)
- State transitions depend on async microtask scheduling, not explicit awaits
- Parallel or re-entrant calls require careful teardown of the prior subscription

**If you see this pattern, flag it in your Phase 10 summary** with:
> "ValidateTrajectoryController._watchOrder creates an internal ref.listen in sendOrder. This conflates send + watch responsibilities, making state transitions depend on microtask scheduling. Testability smell — consider having the UI watch the order stream directly via watchFooOrderProvider."

## Override Strategy

| Layer | What to override |
|---|---|
| Service is a `@riverpod` class | `fooServiceProvider.overrideWithValue(mockService)` |
| Stream is a function provider delegating to service | Override the **service** — the stream provider picks it up automatically |
| Stream provider is fully standalone | Override the stream provider directly with `.overrideWith((ref) => streamController.stream)` |

The most common case: override the service, let the stream provider resolve through it naturally.
