# Pattern: Fixture Helper Functions

## Why

Domain models often require many required fields. Repeating full constructors in
every test creates noise and makes tests harder to read. Fixture helpers create
minimal, readable test data with sensible defaults.

## Where to declare them

Inside `main()`, before the `group(...)` blocks. They are closures that capture
local constants (e.g. `aeroclubId`, a fixed timestamp).

```dart
void main() {
  // Shared constants
  const aeroclubId = 'aeroclub-1';
  final kTs = DateTime.utc(2026, 1, 1);

  // Fixture helpers — only the fields that vary between tests are parameters
  DeviceUnit device(
    String id, {
    DeviceLifecycle lifecycle = DeviceLifecycle.operational,
  }) =>
      DeviceUnit(
        id: id,
        model: DeviceModel.ga,
        lifecycle: lifecycle,
        createdAt: kTs,
        updatedAt: kTs,
      );

  Booking booking({
    required String deviceId,
    String start = '09:00',
    String end = '10:00',
    BookingStatus status = BookingStatus.confirmed,
    String pilotId = 'pilot-1',
  }) =>
      Booking(
        id: 'bk-$deviceId',
        pilotId: pilotId,
        pilotName: 'Pilot',
        aeroclubId: aeroclubId,
        date: '2026-06-15',
        startTime: start,
        endTime: end,
        deviceId: deviceId,
        deviceName: 'Device',
        aircraftSource: AircraftSource.private,
        status: status,
        createdAt: kTs,
        updatedAt: kTs,
      );

  group('MyFeature', () {
    test('...', () {
      final d1 = device('d1');
      final b1 = booking(deviceId: 'd1', start: '08:00', end: '09:00');
      // ...
    });
  });
}
```

## Rules

- Use **named parameters with defaults** so call sites only specify what varies.
- Always use `DateTime.utc(year, month, day)` — never `DateTime.now()`.
- Generate deterministic IDs using the primary key: `id: 'bk-$deviceId'`.
- Keep helpers minimal: only fields that tests actually vary should be parameters.

## Container helper pattern

Pair fixture helpers with a `makeContainer(...)` factory to keep `ProviderContainer`
setup clean:

```dart
ProviderContainer makeContainer({
  required List<DeviceUnit> devices,
  List<Booking> bookings = const [],
}) =>
    ProviderContainer.test(
      overrides: [
        aeroclubAssignedDevicesProvider(aeroclubId)
            .overrideWithValue(AsyncData(devices)),
        bookingsForDateProvider(aeroclubId, date)
            .overrideWithValue(AsyncData(bookings)),
      ],
    );
```

This keeps each test focused on intent, not setup:

```dart
test('given booked device when queried then excludes it', () {
  // Given
  final container = makeContainer(
    devices: [device('d1'), device('d2')],
    bookings: [booking(deviceId: 'd1')],
  );

  // When
  final result = container.read(myProvider(aeroclubId, date));

  // Then
  expect(result.value!.map((d) => d.id), ['d2']);
});
```
