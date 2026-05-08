# Pattern: Notifier whose build() watches a StreamProvider

## The problem

A code-generated Notifier has a private base class (`_$FooNotifier`) that cannot be
subclassed from outside the generated file. This pattern also fails when `build()`
watches a stream that touches Firebase, causing errors in tests with no emulator.

```dart
// ❌ COMPILE ERROR — _$FooNotifier is private
class FakeFooNotifier extends _$FooNotifier {
  @override
  FooState build() => FooState.initial();
}
```

**Never subclass `_$FooNotifier`**. Override the stream dependency instead.

## Two strategies — pick based on what you are testing

| What you are testing | Strategy |
|---|---|
| A public method (`select()`, `refresh()`, etc.) | A — `overrideWith((ref) => Stream.value([]))` to neutralise `build()` |
| The computed logic inside `build()` (auto-select, derived state, defaults) | B — `overrideWithValue(AsyncData(...))` on the stream dep |
| Prevent Firebase calls without caring about `build()` output | A |
| Both `build()` logic AND a public method | B for `build()`, then call the method on the resulting notifier |

### Strategy A — test public methods (neutralise build())

```dart
// SelectedBookingAeroclub.build() watches myActiveMembershipsProvider.
// We don't care what build() returns — we just want to call select().

final container = ProviderContainer.test(
  overrides: [
    myActiveMembershipsProvider.overrideWith((ref) => Stream.value([])),
  ],
);

container.read(selectedBookingAeroclubProvider.notifier).select('aeroclub-1');
expect(container.read(selectedBookingAeroclubProvider), 'aeroclub-1');
```

### Strategy B — test build() computed logic

`overrideWithValue(AsyncData(...))` injects the final state **synchronously**, so
`build()` sees `AsyncData` immediately. No `await` required.

```dart
// build() auto-selects when exactly 1 membership:
// if (membershipsAsync case AsyncData(:final value)) {
//   if (value.length == 1) return value.first.aeroclubId;
// }

// 1 membership → auto-select
final container = ProviderContainer.test(
  overrides: [
    myActiveMembershipsProvider.overrideWithValue(
      AsyncData([membership('aeroclub-1')]),
    ),
  ],
);
expect(container.read(selectedBookingAeroclubProvider), 'aeroclub-1');

// 2 memberships → no auto-select
final container2 = ProviderContainer.test(
  overrides: [
    myActiveMembershipsProvider.overrideWithValue(
      AsyncData([membership('aeroclub-1'), membership('aeroclub-2')]),
    ),
  ],
);
expect(container2.read(selectedBookingAeroclubProvider), isNull);
```

> **Why `overrideWithValue` and not `overrideWith`?**
> `overrideWith((ref) => Stream.value(...))` sets up a real subscription — the
> container starts in `AsyncLoading` and transitions asynchronously.
> `overrideWithValue(AsyncData(...))` injects the final state synchronously.

## Using overrideWithBuild

Use when you want a specific starting state but the test exercises the real methods:

```dart
final container = ProviderContainer.test(
  overrides: [
    fooProvider.overrideWithBuild((ref) => FooState.loaded(items)),
  ],
);
// The notifier's real methods still work:
container.read(fooProvider.notifier).doSomething();
expect(container.read(fooProvider), expectedState);
```

## Key rules

- **Never** subclass `_$FooNotifier` — it is private and its signature changes after build_runner.
- Check the Notifier source for all `ref.watch` calls in `build()` — every stream dependency must be overridden or neutralised.
- If a dependency is a `Provider<T>` (not a stream), use `depProvider.overrideWithValue(value)`.
