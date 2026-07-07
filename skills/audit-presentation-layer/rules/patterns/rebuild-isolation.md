<!-- source: local (claude-flutter) -->
# Rebuild Isolation — Beyond Riverpod `.select()`

**Goal:** Keep the repaint/rebuild blast radius of any state change as small as
possible. Riverpod-side scoping is covered in `riverpod-rebuild-optimization.md`;
this doc covers the framework-side levers: `const` subtree caching, scoped
`MediaQuery` accessors, builder `child:` caching, and `setState` blast radius.

The underlying principle is the **Observer pattern done right** (Head First
Design Patterns, ch. 2): a subject should notify only the observers that care
about the change. In Flutter terms, every widget is an observer of its inputs —
the smaller and more precise the observed input, the fewer rebuilds.

---

## 1. `const` constructors — cached, rebuild-immune subtrees (REBUILD-01)

Flutter short-circuits rebuilds when it encounters an identical widget instance.
`const` constructors canonicalize instances at compile time, so a `const`
subtree is *never* rebuilt when its parent rebuilds.

```dart
// ❌ BAD — re-instantiated (and re-diffed) on every parent rebuild
Widget build(BuildContext context) {
  return Column(
    children: [
      SizedBox(height: 16),
      Icon(Icons.flight_takeoff),
      Text('Ready for departure'),
    ],
  );
}

// ✅ GOOD — compile-time canonical instances, skipped during rebuild
Widget build(BuildContext context) {
  return const Column(
    children: [
      SizedBox(height: 16),
      Icon(Icons.flight_takeoff),
      Text('Ready for departure'),
    ],
  );
}
```

**Rule of thumb:** any constructor call whose arguments are all literals or
`const` expressions must be `const`. The Dart analyzer lints
(`prefer_const_constructors`, `prefer_const_literals_to_create_immutables`)
agree — the audit flags the hot spots inside `build` methods where the payoff
is per-frame.

---

## 2. Scoped `MediaQuery` accessors (REBUILD-02)

`MediaQuery.of(context)` subscribes the widget to **every** `MediaQueryData`
change — keyboard insets, text scale, brightness, padding. Opening the on-screen
keyboard then rebuilds every widget that only wanted the screen width.

Flutter 3.10+ exposes `InheritedModel`-backed aspect accessors that subscribe
to a single field:

```dart
// ❌ BAD — rebuilds on keyboard open/close, brightness change, text scale…
final width = MediaQuery.of(context).size.width;

// ✅ GOOD — rebuilds only when the size aspect changes
final size = MediaQuery.sizeOf(context);
final padding = MediaQuery.paddingOf(context);
final insets = MediaQuery.viewInsetsOf(context);
final brightness = MediaQuery.platformBrightnessOf(context);
```

Mechanical substitution table:

| Instead of | Use |
|---|---|
| `MediaQuery.of(context).size` | `MediaQuery.sizeOf(context)` |
| `MediaQuery.of(context).padding` | `MediaQuery.paddingOf(context)` |
| `MediaQuery.of(context).viewInsets` | `MediaQuery.viewInsetsOf(context)` |
| `MediaQuery.of(context).platformBrightness` | `MediaQuery.platformBrightnessOf(context)` |
| `MediaQuery.of(context).textScaler` | `MediaQuery.textScalerOf(context)` |

(For layout *branching*, prefer `LayoutBuilder` entirely — see
`responsive-layout.md` and RESPONSIVE-01/02.)

---

## 3. Builder `child:` parameter — hoist the static subtree (REBUILD-03)

`AnimatedBuilder`, `ListenableBuilder`, and `ValueListenableBuilder` re-invoke
their `builder` on **every notification** — for an animation, that is every
frame. Anything constructed inside the builder is rebuilt 60+ times per second.
All three take a `child:` parameter precisely so the static part is built once
and threaded through.

```dart
// ❌ BAD — the Card and its whole subtree rebuild every animation tick
AnimatedBuilder(
  animation: _controller,
  builder: (context, _) => Transform.rotate(
    angle: _controller.value * 2 * pi,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(children: [/* many static children */]),
      ),
    ),
  ),
)

// ✅ GOOD — static subtree built once, only Transform re-evaluated per tick
AnimatedBuilder(
  animation: _controller,
  child: const _RotatingCardBody(),
  builder: (context, child) => Transform.rotate(
    angle: _controller.value * 2 * pi,
    child: child,
  ),
)
```

**Rule of thumb:** if the builder body exceeds ~10 lines, the static part
belongs in `child:` (or the whole thing in a dedicated widget class).

---

## 4. `setState` blast radius (REBUILD-04)

`setState` marks the **entire** `State`'s `build` dirty. In a `State` with a
large `build` (50+ lines), toggling one boolean rebuilds the whole screen.

Fix options, in order of preference:

1. **Extract the mutable region into a small leaf `StatefulWidget`** so
   `setState` only rebuilds the leaf.
2. **`ValueNotifier` + `ValueListenableBuilder`** around just the reactive
   part (with `child:` for anything static — see §3).
3. **Promote to a Riverpod provider** when the state outlives the widget or is
   shared (see `riverpod-rebuild-optimization.md` §7).

```dart
// ❌ BAD — whole 120-line screen rebuilds when the switch toggles
class _SettingsScreenState extends State<SettingsScreen> {
  bool _notificationsOn = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(/* 120 lines, one Switch calls setState */);
  }
}

// ✅ GOOD — only the tile rebuilds
class _NotificationsTile extends StatefulWidget { /* switch + setState here */ }
```

---

## DO / DON'T summary

**DO**
- Mark every all-literal constructor call in `build` as `const`.
- Use `MediaQuery.sizeOf`/`paddingOf`/`viewInsetsOf` aspect accessors.
- Pass the static subtree through the `child:` parameter of animated/listenable builders.
- Keep `setState`-owning widgets small and leaf-like.

**DON'T**
- Call `MediaQuery.of(context)` to read a single field.
- Build large subtrees inside `builder:` closures that fire per frame.
- Let one `setState` invalidate an entire screen-sized `build`.
