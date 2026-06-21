# Riverpod Rebuild Optimization

Patterns for minimizing unnecessary widget rebuilds when using Riverpod.
Apply these during widget creation — retrofitting is harder.

---

## 1. Default to `ConsumerWidget`, not `ConsumerStatefulWidget`

`ConsumerStatefulWidget` has a higher rebuild surface. Use it only when you
need lifecycle hooks (`initState`, `dispose`) or own a `TextEditingController`.

```dart
// GOOD — no lifecycle needed
class BookingCard extends ConsumerWidget {
  const BookingCard({super.key, required this.bookingId});
  final String bookingId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final booking = ref.watch(bookingByIdProvider(bookingId)).asData?.value;
    // ...
  }
}

// BAD — ConsumerStatefulWidget for no lifecycle reason
class BookingCard extends ConsumerStatefulWidget { ... }
```

---

## 2. `.select()` to watch only what you need

If `build` only uses a subset of a provider's fields, use `.select()`.
The widget rebuilds **only when the selected value changes**, not on any field
change.

```dart
// GOOD — rebuilds only when `isOnline` changes
final isOnline = ref.watch(
  pilotProvider(pilotId).select((p) => p.asData?.value?.isOnline ?? false),
);

// BAD — rebuilds on every field change (name, avatar, certificates, …)
final pilot = ref.watch(pilotProvider(pilotId)).asData?.value;
final isOnline = pilot?.isOnline ?? false;
```

**Rule**: if you touch 1–2 fields of a large object, use `.select()`.

---

## 3. `.select()` with Dart record types (multiple booleans)

Collapse multiple boolean selections into a single `.select()` call using
record types. Equality is checked structurally — rebuilds only when either
boolean changes.

```dart
// GOOD — one select call, rebuilds only when canUndo or canRedo changes
final (:canUndo, :canRedo) = ref.watch(
  commandHistoryProvider(aeroclubId, bookingId)
      .select((s) => (canUndo: s.canUndo, canRedo: s.canRedo)),
);

// BAD — two separate watch calls, both can trigger a rebuild independently
final canUndo = ref.watch(
  commandHistoryProvider(aeroclubId, bookingId).select((s) => s.canUndo),
);
final canRedo = ref.watch(
  commandHistoryProvider(aeroclubId, bookingId).select((s) => s.canRedo),
);
```

Record equality in Dart 3 is structural — `(a: true, b: false) == (a: true, b: false)`.

---

## 4. Inline `Consumer` for per-item selection in lists

When a `ListView.builder` / `SliverList.builder` renders items that have
individual selection state, **do not watch selection at the list level**.
Watch it inside each item via an inline `Consumer` with `.select()`.

**Without `Consumer`**: selecting item 3 rebuilds the entire list widget tree.  
**With `Consumer`**: only items 2 (deselected) and 3 (selected) rebuild.

```dart
// GOOD
SliverList.builder(
  itemCount: items.length,
  itemBuilder: (context, i) => Consumer(
    builder: (context, ref, _) {
      final isSelected = ref.watch(
        selectedIndexProvider.select((idx) => idx == i),
      );
      return ItemTile(item: items[i], isSelected: isSelected);
    },
  ),
),

// BAD — entire parent widget rebuilds on every selection change
@override
Widget build(BuildContext context, WidgetRef ref) {
  final selectedIndex = ref.watch(selectedIndexProvider);
  return SliverList.builder(
    itemCount: items.length,
    itemBuilder: (context, i) => ItemTile(
      item: items[i],
      isSelected: selectedIndex == i,
    ),
  );
}
```

---

## 5. Computed providers for expensive derivations

When a widget only needs derived booleans (e.g., `isDirty`, `canSubmit`) from
a large string or complex object, **move the derivation to a computed provider**
instead of doing it inline in `build()`.

The widget rebuilds only when the boolean output changes — not on every
character change in the source string.

```dart
// In application layer
@riverpod
({bool isDirty, bool hasEnoughWaypoints}) flightPlanActionState(
  Ref ref,
  String aeroclubId,
  String bookingId,
) {
  final draft = ref.watch(flightPlanDraftProvider(aeroclubId, bookingId)).asData?.value;
  final saved = ref.watch(flightPlanGeoJsonProvider(aeroclubId, bookingId)).asData?.value;
  final isDirty = draft != null && saved != null && draft != saved;
  final path = draft != null ? FlightPlanCodec.parse(draft) : null;
  final hasEnoughWaypoints = (path?.waypoints.length ?? 0) >= 2;
  return (isDirty: isDirty, hasEnoughWaypoints: hasEnoughWaypoints);
}

// In widget — rebuilds only when isDirty or hasEnoughWaypoints changes
@override
Widget build(BuildContext context, WidgetRef ref) {
  final (:isDirty, :hasEnoughWaypoints) = ref.watch(
    flightPlanActionStateProvider(aeroclubId, bookingId),
  );
  // ...
}
```

**Rule**: if deriving booleans from strings > a few hundred chars, use a
computed provider.

---

## 6. `asData?.value` over explicit casting

Prefer the null-safe chain over `is AsyncData<T>` pattern casts.

```dart
// GOOD
final booking = ref.watch(bookingProvider(id)).asData?.value;

// BAD — verbose and type-argument-sensitive
final asyncVal = ref.watch(bookingProvider(id));
final booking = asyncVal is AsyncData<Booking?> ? asyncVal.value : null;
```

---

## 7. When to extract form state to a parameterized Notifier

A `ConsumerStatefulWidget` with **more than 4 `setState`-managed fields**
tracking a lifecycle (initialized / dirty / reset / guard flags) is a signal
to extract state to a `@riverpod` Notifier.

**Widget keeps:**
- `TextEditingController` (binds directly to a `TextField`)
- Transient loading flags: `_isSaving`, `_isDeleting`

**Notifier takes:**
- Baseline values for dirty detection
- Initialization guards (`formInitialized`, `departureInitializedFromBooking`)
- Race-condition guards (`resetNeeded` for cancel + provider-reload windows)
- Methods: `tryInitForm`, `beginCancel`, `completeReset`, `updateBaselineAfterSave`, `resetAfterDelete`

```dart
// Parameterized Notifier (aeroclubId + bookingId as params)
@riverpod
class FormController extends _$FormController {
  @override
  FormState build(String aeroclubId, String bookingId) => const FormState();

  String? tryInitForm(String geoJson) { ... }
  void beginCancel() { ... }
  String completeReset(String freshGeoJson) { ... }
  void updateBaselineAfterSave(String savedGeoJson, String speedText) { ... }
  void resetAfterDelete() { ... }
}

// Widget — only 2 fields remain
class _MyFormState extends ConsumerState<MyForm> {
  bool _isSaving = false;
  final TextEditingController _speedController = TextEditingController();
}
```

**Benefit**: no `setState` race conditions; state survives navigation if
`keepAlive: true`; trivially testable in isolation.
