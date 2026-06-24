<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ bac1f742129af4c111381d9cdb576a3e90f1b412 -->
# AsyncNotifier Command API – Single Channel & Command/Query Separation

**Goal:** Keep `AsyncNotifier` controllers simple: one error channel (state),
commands that stop at the boundary of their own work, and queries delegated
to dedicated providers or the UI layer.

---

## 1. Single error channel — use state, not return values

An `AsyncNotifier` already has a built-in channel: its `state`. Use it as the
**only** channel for success, loading, and error. Do NOT also return a value
from the command method.

**Bad — dual channel (return value AND state)**

```dart
// Caller has to decide: check return value or read state?
Future<String?> stopComputation({required String scenarioId}) async {
  state = const AsyncLoading();
  try {
    final orderId = await _service.sendStopOrder(scenarioId: scenarioId);
    state = const AsyncData(null);
    return orderId; // ← second channel
  } catch (e, st) {
    state = AsyncError(e, st);
    return null; // ← also second channel
  }
}
```

Problems:
- Tests need two assertions per path (return value + state).
- Callers can ignore state and read only the return value — divergent behaviour.

**Good — state is the only channel**

```dart
Future<void> stopComputation({required String scenarioId}) async {
  state = const AsyncLoading();
  state = await AsyncValue.guard(
    () => _service.sendStopOrder(scenarioId: scenarioId),
  );
}
```

If callers need the result value, they read `state.requireValue` or
`state.asData?.value` after awaiting the method. One assertion per path.

---

## 2. Command vs query — keep them separate

A command method (`sendOrder`, `stopComputation`) should do exactly one thing:
execute the operation and reflect the result in `state`. It must NOT:

- Install a `ref.listen` / stream subscription inside the command.
- Store subscriptions as fields that the command manages.
- Drive further state transitions via microtask scheduling.

**Bad — command that installs its own watcher**

```dart
Future<void> sendOrder({required String scenarioId}) async {
  state = state.copyWith(phase: Phase.sendingOrder);
  final orderId = await _service.sendOrder(...);
  state = state.copyWith(phase: Phase.waitingAck, orderId: orderId);

  // ❌ The command now also wires a subscription to watch the result
  _orderSubscription?.cancel();
  _orderSubscription = ref.listen(watchOrderProvider(orderId), (_, order) {
    if (order == null) return;
    state = state.copyWith(phase: _phaseFor(order.status));
  });
}
```

Problems:
- Re-entrant calls silently discard the first subscription.
- State transitions depend on microtask scheduling, making tests brittle
  (`await Future.value()` pumping required).
- The controller owns TWO concerns: sending AND watching.

**Good — command stops at its own boundary**

```dart
// Controller — pure command, transitions to waitingAck and stops
Future<void> sendOrder({required String scenarioId}) async {
  state = state.copyWith(phase: Phase.sendingOrder, clearError: true);
  final orderId = await _service.sendOrder(
    ValidateTrajectoryOrder.create(scenarioId: scenarioId),
  );
  state = state.copyWith(phase: Phase.waitingAck, orderId: orderId);
}

// UI / parent widget — installs the watcher independently
ref.listen(watchValidateTrajectoryOrderProvider(orderId), (_, order) {
  if (order == null) return;
  ref.read(controllerProvider.notifier).applyOrderStatus(order.status);
});
```

Benefits:
- Each piece is independently testable without stream plumbing.
- No re-entrancy hazard.
- State transitions are explicit awaits, not microtask-scheduled callbacks.

---

## 3. Summary rules

| Rule | Rationale |
|---|---|
| Return `void` from command methods | State is the channel; return values create a second one |
| Never install `ref.listen` inside a command | Commands and queries are separate concerns |
| Use `AsyncValue.guard()` for single-step mutations | Handles loading→data/error transition in one line |
| Callers read `state.requireValue` for result data | One source of truth |
| Extract stream watchers to the UI layer or a dedicated provider | Keeps controllers focused on commands |
