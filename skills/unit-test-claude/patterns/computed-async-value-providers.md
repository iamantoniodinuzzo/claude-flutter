# Pattern: Testing Computed AsyncValue Providers

## What is a computed AsyncValue provider?

A `@riverpod` function that:
- Is **synchronous** (returns `AsyncValue<T>`, not `Stream<T>` or `Future<T>`)
- Derives its value by calling `asyncDep.whenData(...)` on one or more watched `AsyncValue` dependencies

```dart
@riverpod
AsyncValue<List<DeviceUnit>> availableDevicesForTimeSlot(
  Ref ref, String aeroclubId, String date, String start, String end,
) {
  final asyncDevices = ref.watch(aeroclubAssignedDevicesProvider(aeroclubId));
  final asyncBookings = ref.watch(bookingsForDateProvider(aeroclubId, date));

  return asyncDevices.whenData((devices) {
    final bookings = switch (asyncBookings) {
      AsyncData(:final value) => value,
      _ => <Booking>[],           // loading/error fallback
    };
    return devices.where((d) => d.isOperational && ...).toList();
  });
}
```

## Reading the result — no `await` needed

Because the provider is synchronous, read with `container.read()` directly:

```dart
final container = ProviderContainer.test(
  overrides: [
    aeroclubAssignedDevicesProvider(aeroclubId)
        .overrideWithValue(AsyncData([device1, device2])),
    bookingsForDateProvider(aeroclubId, date)
        .overrideWithValue(AsyncData([])),
  ],
);

final result = container.read(
  availableDevicesForTimeSlotProvider(aeroclubId, date, start, end),
);

expect(result, isA<AsyncData<List<DeviceUnit>>>());
expect(result.value!, [device1, device2]);
```

## AsyncLoading propagation

`AsyncValue.whenData` on an `AsyncLoading` source returns `AsyncLoading`.
Test this for the **primary** dependency (the one the provider `whenData`s on):

```dart
final container = ProviderContainer.test(
  overrides: [
    aeroclubAssignedDevicesProvider(aeroclubId)
        .overrideWithValue(const AsyncLoading()),   // primary dep loading
    bookingsForDateProvider(aeroclubId, date)
        .overrideWithValue(AsyncData([])),
  ],
);

expect(
  container.read(availableDevicesForTimeSlotProvider(...)),
  isA<AsyncLoading>(),
);
```

## Fallback behaviour for secondary dependencies

Some providers use a switch/match to fall back to a safe default when a secondary
dependency is loading. Test the fallback explicitly:

```dart
// Secondary dep loading → falls back to empty bookings → all devices visible
final container = ProviderContainer.test(
  overrides: [
    aeroclubAssignedDevicesProvider(aeroclubId)
        .overrideWithValue(AsyncData([device1])),
    bookingsForDateProvider(aeroclubId, date)
        .overrideWithValue(const AsyncLoading()),  // secondary dep loading
  ],
);

final result = container.read(availableDevicesForTimeSlotProvider(...));
expect(result.value!, [device1]); // visible because bookings fallback = []
```

## Nesting computed providers

When testing a provider that depends on another computed provider, override the
inner one directly to keep tests isolated:

```dart
final container = ProviderContainer.test(
  overrides: [
    availableDevicesForTimeSlotProvider(aeroclubId, date, start, end)
        .overrideWithValue(AsyncData([device1, device2, device3])),
    pilotMembershipTypeForBookingProvider(aeroclubId)
        .overrideWith((ref) => MembershipType.paying),
  ],
);
```

## Coverage checklist for computed AsyncValue providers

- [ ] Happy path: primary dep `AsyncData` with content
- [ ] Empty input: primary dep `AsyncData` with empty list
- [ ] Primary dep `AsyncLoading` → result is `AsyncLoading`
- [ ] Each secondary dep `AsyncLoading` → fallback applied correctly
- [ ] Each branch / condition in the `whenData` callback
- [ ] Edge cases for boundary values (overlap conditions, empty sets, etc.)
