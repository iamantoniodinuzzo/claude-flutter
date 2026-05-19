<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ bac1f742129af4c111381d9cdb576a3e90f1b412 -->
# Flutter widgets & performance – construction rules, build discipline, perf checklist

**Version**: Flutter 3.27+ / 3.32+ / 3.35+  
**Source**: split from `flutter.md` to support smaller, task-focused seeds.

Use this file when you are implementing UI and you need **widget construction**
and **performance** guardrails.

---

## Widget construction rules

```dart
// ✅ DO
const MyWidget();      // Prevents rebuilds
ListView.builder();    // For lists
ColoredBox();          // Instead of Container with only color

// ❌ DON'T
Container(color: Colors.red); // Use ColoredBox
ListView(children: [...]);    // Use ListView.builder for large lists
```

### Tap targets: InkWell over GestureDetector

For a simple `onTap` in a Material app, always prefer `InkWell` (or `InkResponse`)
over `GestureDetector`. `GestureDetector` has no ripple feedback and contributes
nothing to Material semantics.

```dart
// ✅ DO – ripple feedback, correct Material semantics
InkWell(
  onTap: () => _handleTap(),
  borderRadius: BorderRadius.circular(8), // matches the visual shape
  child: const _MyContent(),
)

// ❌ DON'T – no feedback, heavier, semantically opaque
GestureDetector(
  onTap: () => _handleTap(),
  child: const _MyContent(),
)
```

Use `GestureDetector` only when you need gestures that `InkWell` does not expose
(e.g. `onPanUpdate`, `onScaleStart`, `onLongPressMoveUpdate`) or when you
deliberately want no ripple (e.g. a custom painter or a video thumbnail with its
own overlay feedback).

### Tappable `Card` — always use `clipBehavior: Clip.antiAlias`

When wrapping a `Card` with `InkWell` to make it tappable, you must set
`clipBehavior: Clip.antiAlias` on the `Card`. Without it, the ripple effect
overflows the card's rounded corners.

```dart
// ✅ DO — ripple stays inside the rounded card
Card(
  clipBehavior: Clip.antiAlias,    // ← required for ripple containment
  child: InkWell(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: ...,
    ),
  ),
)

// ❌ DON'T — ripple overflows the card border radius
Card(
  child: InkWell(
    onTap: onTap,
    child: ...,
  ),
)
```

The `InkWell` must be a **direct child of `Card`** (not wrapped in a `Padding`
first) so the clip applies to the ripple layer.

### Keep build() lightweight

```dart
// ✅ DO
class MyWidget extends StatelessWidget {
  const MyWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return const SomeWidget();
  }
}

// ❌ DON'T
Widget build(BuildContext context) {
  final data = fetchDataFromNetwork(); // heavy operation
  processLargeList(); // CPU-intensive task
  return SomeWidget();
}
```

---

### State updates — prefer Riverpod Notifiers over setState()

While `setState()` is the built-in way to manage local state, it often leads to mixing UI and logic. Following the project's architecture, **prefer dedicated Riverpod Notifiers** (or `AsyncNotifier`) for almost all state, even local UI state (like `isExpanded`, `selectedIndex`, etc.).

**Why:**

- **Stateless UI**: Widgets stay "dumb" and focus only on rendering.
- **Testability**: Logic can be tested in isolation from the widget tree.
- **Consistency**: All state management follows the same pattern.

```dart
// ✅ DO — use a simple Notifier for local UI state
@riverpod
class ExpansionController extends _$ExpansionController {
  @override
  bool build() => false;
  void toggle() => state = !state;
}

// In the widget
final isExpanded = ref.watch(expansionControllerProvider);
// ...
onTap: () => ref.read(expansionControllerProvider.notifier).toggle(),

// ❌ DON'T — mixing local state in StatefulWidget
void _toggle() {
  setState(() {
    _isExpanded = !_isExpanded;
  });
}
```

Use `setState()` only for purely transient, visual-only state that doesn't affect business logic (e.g., an `AnimationController` or a `ScrollController` where the controller itself is the state).

### Selective MediaQuery subscriptions

`MediaQuery.of(context)` subscribes to **every** MediaQuery change (orientation,
text scale, insets, etc.). Prefer the specific getters (Flutter 3.10+) so the
widget only rebuilds when the relevant value changes.

```dart
// ✅ DO — rebuilds only when padding changes
final bottomPadding = MediaQuery.paddingOf(context).bottom;

// ✅ DO — rebuilds only when size changes
final screenWidth = MediaQuery.sizeOf(context).width;

// ✅ DO — rebuilds only when text scale changes
final textScale = MediaQuery.textScaleFactorOf(context);

// ❌ DON'T — subscribes to all MediaQuery changes
final padding = MediaQuery.of(context).padding.bottom;
final width = MediaQuery.of(context).size.width;
```

Available selective getters: `paddingOf`, `sizeOf`, `devicePixelRatioOf`,
`textScaleFactorOf`, `platformBrightnessOf`, `viewInsetsOf`, `viewPaddingOf`.

### Keys in lists

```dart
ListView.builder(
  itemBuilder: (context, index) {
    return MyWidget(key: ValueKey(items[index].id));
  },
);
```

### Memory management (pragmatic)

```dart
// ✅ DO - specify dimensions and cache when possible
CachedNetworkImage(
  imageUrl: url,
  width: 100,
  height: 100,
);

// ✅ DO - lazy lists
ListView.builder(
  itemBuilder: (context, index) => buildItem(index),
);
```

---

## Code organization (UI)

```text
lib/
  features/
    auth/
      presentation/
        auth_screen.dart
        widgets/
          login_button.dart
```

---

## Quick checklist

- [ ] Prefer `const` constructors everywhere possible
- [ ] No expensive work inside `build()`
- [ ] Prefer builders for large lists (`ListView.builder`, `GridView.builder`)
- [ ] Use keys for stateful list items
- [ ] Avoid `Container` when a more specific widget exists
- [ ] Use `InkWell` (not `GestureDetector`) for simple `onTap` in Material context
- [ ] No empty `setState(() {})` — use `ListenableBuilder` / `ValueListenableBuilder`
- [ ] Use `MediaQuery.paddingOf` / `.sizeOf` instead of `MediaQuery.of(context).*`
