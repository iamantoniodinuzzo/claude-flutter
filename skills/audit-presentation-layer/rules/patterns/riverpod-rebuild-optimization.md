<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ bac1f742129af4c111381d9cdb576a3e90f1b412 -->
# Riverpod Rebuild Optimization

Patterns for minimizing unnecessary widget rebuilds when using Riverpod.
Apply these during widget creation — retrofitting is harder.

---

## 1. Default to `ConsumerWidget`, not `ConsumerStatefulWidget`

Use `ConsumerStatefulWidget` only when you need lifecycle hooks (`initState`, `dispose`)
or own a `TextEditingController`.

---

## 2. `.select()` to watch only what you need

If `build` only uses a subset of a provider's fields, use `.select()`.
The widget rebuilds **only when the selected value changes**, not on any field change.

```dart
// GOOD — rebuilds only when `isOnline` changes
final isOnline = ref.watch(
  pilotProvider(pilotId).select((p) => p.asData?.value?.isOnline ?? false),
);

// BAD — rebuilds on every field change
final pilot = ref.watch(pilotProvider(pilotId)).asData?.value;
final isOnline = pilot?.isOnline ?? false;
```

**Rule**: if you touch 1–2 fields of a large object, use `.select()`.

---

## 3. `.select()` with Dart record types (multiple booleans)

Collapse multiple boolean selections into a single `.select()` call using record types.
Equality is checked structurally — rebuilds only when either boolean changes.

```dart
// GOOD — one select call, structurally compared
final (:canUndo, :canRedo) = ref.watch(
  commandHistoryProvider(aeroclubId, bookingId)
      .select((s) => (canUndo: s.canUndo, canRedo: s.canRedo)),
);

// BAD — two separate watch calls
final canUndo = ref.watch(commandHistoryProvider(aeroclubId, bookingId).select((s) => s.canUndo));
final canRedo = ref.watch(commandHistoryProvider(aeroclubId, bookingId).select((s) => s.canRedo));
```

---

## 4. Inline `Consumer` for per-item selection in lists

When a `ListView.builder` renders items with individual selection state,
watch inside each item via an inline `Consumer` with `.select()`.

```dart
// GOOD — only the changed items rebuild
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
Widget build(BuildContext context, WidgetRef ref) {
  final selectedIndex = ref.watch(selectedIndexProvider);
  return SliverList.builder(
    itemCount: items.length,
    itemBuilder: (context, i) => ItemTile(item: items[i], isSelected: selectedIndex == i),
  );
}
```

---

## 5. Computed providers for expensive derivations

When a widget only needs derived booleans from a large object, move the derivation
to a computed provider. The widget rebuilds only when the boolean output changes.

---

## 6. `asData?.value` over explicit casting

```dart
// GOOD
final booking = ref.watch(bookingProvider(id)).asData?.value;

// BAD — verbose
final asyncVal = ref.watch(bookingProvider(id));
final booking = asyncVal is AsyncData<Booking?> ? asyncVal.value : null;
```

---

## 7. When to extract form state to a parameterized Notifier

A `ConsumerStatefulWidget` with **more than 4 `setState`-managed fields** tracking
a lifecycle (initialized / dirty / reset / guard flags) is a signal to extract state
to a `@riverpod` Notifier.

**Widget keeps:** `TextEditingController`, transient loading flags (`_isSaving`, `_isDeleting`).

**Notifier takes:** baseline values, initialization guards, race-condition guards, business methods.
