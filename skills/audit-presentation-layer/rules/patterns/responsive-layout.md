<!-- source: local (claude-flutter) -->
## Responsive Layout in Flutter – Complete Guide

**Goal:** Understand why hard-coded sizes and `MediaQuery.size`-based branching
are fragile, and how to build layouts that adapt fluidly to any screen or window
size.

---

### 1. Why hard-coded sizes break

Flutter runs on phones, tablets, foldables, desktop windows, and browsers. A
`width: 360.0` or an `if (MediaQuery.of(context).size.width < 600)` baked into
widget code ties the layout to a snapshot of one device class:

- **Refactors relocate widgets** — a widget moved to a different screen inherits
  wrong assumptions.
- **Window resizing** — desktop and web windows resize continuously; a static
  breakpoint check fires only once at build time.
- **`LayoutBuilder` re-runs on constraint change** — `MediaQuery.size` in `build`
  does not.

---

### 2. Known antipatterns and how to fix them

#### 2.1 `MediaQuery.of(context).size` for layout branching

```dart
// ❌ BAD — reads screen size, not the widget's own available space
Widget build(BuildContext context) {
  final width = MediaQuery.of(context).size.width;
  if (width < 600) {
    return const MobileLayout();
  }
  return const DesktopLayout();
}
```

Fix: use `LayoutBuilder` so the decision is based on the widget's *own* constraints,
not the full screen size.

```dart
// ✅ GOOD
Widget build(BuildContext context) {
  return LayoutBuilder(
    builder: (context, constraints) {
      if (constraints.maxWidth < 600) {
        return const MobileLayout();
      }
      return const DesktopLayout();
    },
  );
}
```

#### 2.2 `MediaQuery.sizeOf` without `LayoutBuilder`

`MediaQuery.sizeOf(context)` (Flutter 3.10+) is more efficient than
`MediaQuery.of(context).size` because it only rebuilds when the *size* portion
changes — but it still reads the full screen size. Prefer `LayoutBuilder` for
any layout that needs to react to its own available space.

```dart
// ⚠️ ACCEPTABLE for informational uses (e.g. full-screen dialogs)
final size = MediaQuery.sizeOf(context);

// ❌ BAD for nested widget branching — use LayoutBuilder instead
final size = MediaQuery.sizeOf(context);
return size.width < 600 ? const Narrow() : const Wide();
```

#### 2.3 Hard-coded `width:` / `height:` on layout containers

```dart
// ❌ BAD — breaks on larger/smaller screens
Container(
  width: 360,
  height: 600,
  child: const FormPanel(),
)
```

Fixes depending on intent:

```dart
// ✅ Fractional sizing via FractionallySizedBox
FractionallySizedBox(
  widthFactor: 0.9,
  child: const FormPanel(),
)

// ✅ Flexible inside Row/Column
Flexible(
  flex: 2,
  child: const FormPanel(),
)

// ✅ Constraint-bounded via ConstrainedBox
ConstrainedBox(
  constraints: const BoxConstraints(maxWidth: 600),
  child: const FormPanel(),
)
```

#### 2.4 Exception — small decorative sizes

Hard-coded sizes are **acceptable** for icons, avatars, spacing, and decorative
elements where the semantic meaning is "this is 24 dp regardless of screen":

```dart
// ✅ Fine — icon size, spacing, avatar radius are intentionally fixed
const Icon(Icons.home, size: 24),
const SizedBox(height: 8),
CircleAvatar(radius: 20, ...),
```

The heuristic RESPONSIVE-01 targets **layout containers** (`Container`,
`SizedBox` used for structural sizing), not small fixed-size decorative elements.

---

### 3. General DO / DON'T rules

**DO NOT:**
- Use `MediaQuery.of(context).size` or `MediaQuery.sizeOf` for layout branching
  inside nested widgets — use `LayoutBuilder`.
- Hard-code `width:`/`height:` on `Container`/`SizedBox` used as structural
  layout — use fractional or `Flexible`/`Expanded` sizing.
- Store screen size in a variable at the top of `build` and use it for branching
  throughout the widget tree.

**DO:**
- Use `LayoutBuilder` when the widget needs to adapt to *its own* available width.
- Use `MediaQuery.sizeOf(context)` in top-level routes or dialogs that genuinely
  need the full screen size (e.g. hero-transition sizing, full-screen overlays).
- Use `Flexible`, `Expanded`, `FractionallySizedBox`, `AspectRatio`, or
  `ConstrainedBox` to express sizing intent without hard-coding pixels.
- Define breakpoint constants in one place (e.g. `AppBreakpoints.mobile = 600`)
  and consume them from `LayoutBuilder` constraints.

---

### 4. Practical refactoring patterns

- **Branching in `build` on screen size** → wrap the branching subtree in
  `LayoutBuilder`, switch on `constraints.maxWidth`.
- **Hard-coded `Container(width: N)`** → replace with `FractionallySizedBox`,
  `Flexible`, or `ConstrainedBox(constraints: BoxConstraints(maxWidth: N))`.
- **Reusable breakpoint helper** → extract a static method or extension:

```dart
extension BreakpointX on BoxConstraints {
  bool get isMobile => maxWidth < 600;
  bool get isTablet => maxWidth >= 600 && maxWidth < 1200;
  bool get isDesktop => maxWidth >= 1200;
}
```
