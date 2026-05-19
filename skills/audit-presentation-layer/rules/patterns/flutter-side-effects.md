<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ bac1f742129af4c111381d9cdb576a3e90f1b412 -->
## Side Effects in Flutter – Complete Guide

**Goal:** Understand what side effects are in Flutter, why they cause bugs and
performance issues, and how to structure your code so that **widgets build UI**
and **side effects live elsewhere**.

---

### 1. What is a side effect?

In Flutter, a side effect is **any operation inside a widget that changes
state or interacts with the outside world, beyond just returning a widget**.

**Examples of side effects:**

- Mutating state: `setState()`, updating a `ValueNotifier`, `ChangeNotifier`, or provider.
- Running async work: network calls, database writes.
- Triggering external behaviors: starting animations, navigation, showing dialogs/snackbars, writing to Firestore.

The **intended effect** of `build()` is to **return a widget tree**, nothing else.
Side effects in build methods make UI unpredictable and can run **on every frame**.

---

### 2. Known bad side effects and how to fix them

#### 2.1 Calling `setState()` inside `build()`

```dart
// ❌ BAD — mutates state during build
Widget build(BuildContext context) {
  setState(() => _counter++);  // runs on every frame!
  return ElevatedButton(
    onPressed: () => setState(() => _counter++),  // ✅ callback is fine
    child: Text('$_counter'),
  );
}
```

Fix: only call `setState()` inside callbacks or lifecycle methods.

#### 2.2 Calling `showDialog` / `ScaffoldMessenger` / `Navigator.push` inside `build()`

```dart
// ❌ BAD — dialog opens on every rebuild
Widget build(BuildContext context) {
  showDialog(context: context, builder: (_) => const MyDialog());
  return const SomeWidget();
}
```

Fix: call from callbacks (`onPressed`, `onTap`) or `ref.listen` / `BlocListener`.

#### 2.3 Starting an animation in `build()`

```dart
// ❌ BAD — forward() called on every build
Widget build(BuildContext context) {
  animationController.forward();  // mutates animation state
  return ScaleTransition(scale: animationController, child: ...);
}
```

Fix: call `animationController.forward()` in `initState()` or a callback.

#### 2.4 Doing I/O inside `StreamBuilder` / `FutureBuilder` builder

```dart
// ❌ BAD — database write on every auth state change
StreamBuilder<User?>(
  stream: auth.authStateChanges(),
  builder: (context, snapshot) {
    database.setUserData(snapshot.data!);  // side effect in builder!
    return const HomePage();
  },
);
```

Fix: use a controller/provider/`ref.listen` that reacts to state changes outside the widget builder.

#### 2.5 Running async work directly in `build()`

```dart
// ❌ BAD — multiple overlapping async tasks on every rebuild
Widget build(BuildContext context) {
  doSomeAsyncWork();  // fire and forget on every frame
  return const SomeWidget();
}
```

Fix: run async work in `initState()`, callbacks, or listeners.

---

### 3. General DO / DON'T rules

**DO NOT modify state or call async code:**
- Inside `build()` of any widget
- Inside `builder` callbacks (`FutureBuilder.builder`, `StreamBuilder.builder`, `MaterialPageRoute(builder: ...)`)
- Inside methods that return a Widget (`Widget _buildFoo()` with side effects)

**DO modify state or call async code:**
- Inside callbacks: `onPressed`, `onTap`, `onChanged`, gesture detectors
- Inside lifecycle methods: `initState()`, `dispose()`
- Inside controllers, blocs, or providers
- Inside listeners: `BlocListener`, `ref.listen`, animation listeners
- Via `WidgetsBinding.instance.addPostFrameCallback` (sparingly, for post-layout work)

---

### 4. Practical refactoring patterns

- **Side effect in `build()`** → move to callback or listener.
- **One-time initialization** → `initState()`.
- **React to state changes** → `ref.listen` (Riverpod), `BlocListener`.
- **Pure widgets** → never call external services; receive callbacks via constructor.
