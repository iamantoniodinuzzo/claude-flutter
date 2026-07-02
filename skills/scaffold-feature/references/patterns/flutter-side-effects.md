## Side Effects in Flutter – Complete Guide

**Goal:** Understand what side effects are in Flutter, why they cause bugs and
performance issues, and how to structure your code so that **widgets build UI**
and **side effects live elsewhere**.  
Based on: [`Side Effects in Flutter: What They Are and How to Handle Them`](https://codewithandrea.com/articles/side-effects-flutter/).

---

### 1. What is a side effect?

In Flutter, a side effect is **any operation inside a widget that changes
state or interacts with the outside world, beyond just returning a widget**.

**Examples of side effects:**

- **Mutating state**:
  - `setState()` calls.
  - Updating a `ValueNotifier`, `ChangeNotifier`, bloc, or provider.
- **Running async work**:
  - Starting network calls, database writes, or other async tasks.
- **Triggering external behaviors**:
  - Starting animations.
  - Navigation, showing dialogs/snackbars/toasts.
  - Writing to Firestore or other services.

The **intended effect** of `build()` (or any `builder` callback) is to **return
a widget tree**, nothing else. Side effects in build methods make UI
unpredictable and can run **on every frame**.

---

### 2. Known bad side effects and how to fix them

#### 2.1 Calling `setState()` inside `build()`

**Bad: mutate local `State` inside `build()`**

```dart
class _IncrementButtonState extends State<IncrementButton> {
  int _counter = 0;

  @override
  Widget build(BuildContext context) {
    // ❌ Side effect: mutates state during build
    setState(() => _counter++);

    return ElevatedButton(
      // ✅ Ok: callback is only run on user tap
      onPressed: () => setState(() => _counter++),
      child: Text('$_counter'),
    );
  }
}
```

**Why it is wrong:**

- `build()` can be called **many times** (even every frame).
- Each build increments `_counter`, causing **runaway state changes**.
- Triggers extra rebuilds and hard‑to‑track bugs.

**Fix:**

- Only call `setState()` inside **callbacks** (`onPressed`, `onTap`, etc.) or
  lifecycle methods (`initState`, `didChangeDependencies`, etc.).

---

#### 2.2 Updating a `ValueNotifier` inside `build()`

**Bad: incrementing a notifier in `build()`**

```dart
class IncrementButton extends StatelessWidget {
  const IncrementButton({required this.counter});
  final ValueNotifier<int> counter;

  @override
  Widget build(BuildContext context) {
    // ❌ Side effect: increments on every build
    counter.value++;

    return ValueListenableBuilder<int>(
      valueListenable: counter,
      builder: (_, value, __) => ElevatedButton(
        // ✅ Ok: only triggered on user interaction
        onPressed: () => counter.value++,
        child: Text('$value'),
      ),
    );
  }
}
```

**Why it is wrong:**

- `counter.value++` in `build()` causes **an infinite rebuild loop**:
  - `build()` increments the value → listener rebuilds → `build()` increments
    again, and so on.

**Fix:**

- Only change the notifier inside:
  - event callbacks (`onPressed`, `onChanged`, etc.),
  - controllers / view models that widgets listen to.

---

#### 2.3 Starting an animation in `build()`

**Bad: calling `forward()` in `build()`**

```dart
@override
Widget build(BuildContext context) {
  // ❌ Side effect: mutates animation controller each build
  animationController.forward();

  return ScaleTransition(
    scale: animationController,
    child: Container(
      width: 180,
      height: 180,
      color: Colors.red,
    ),
  );
}
```

**Why it is wrong:**

- `AnimationController` holds state (current animation value).
- `forward()` changes that state and may re‑trigger animations unexpectedly.

**Fix:**

- Start the animation in **`initState()`** or inside a **callback**:

```dart
@override
void initState() {
  super.initState();
  // ✅ Safe: runs once when the widget is inserted in the tree
  animationController.forward();
}
```

---

#### 2.4 Doing Firestore writes (or other I/O) inside `StreamBuilder` / `FutureBuilder`

**Bad: writing to Firestore inside `builder`**

```dart
class AuthWidget extends StatelessWidget {
  const AuthWidget({required this.auth, required this.database});

  final FirebaseAuth auth;
  final FirestoreDatabase database;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: auth.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.active) {
          final user = snapshot.data;
          if (user == null) {
            return const SignInPage();
          } else {
            // ❌ Side effect in builder: database write
            database.setUserData(
              UserData(
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
              ),
            );
            return const HomePage();
          }
        }
        return const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        );
      },
    );
  }
}
```

**Why it is wrong:**

- `StreamBuilder` rebuilds whenever the stream emits a value.
- The write runs **every time** the auth state changes.
- If the user signs out and signs in again, you may **write duplicates**.

**Fix options:**

- Move this responsibility **server‑side** (e.g. Cloud Function triggered on
  sign‑in).
- Or trigger the write **once**, outside the widget tree, via:
  - an auth service,
  - a controller / bloc / provider reacting to auth changes,
  - a `ref.listen()` (Riverpod) / `BlocListener` (flutter_bloc) that runs
    **outside `builder`**.

The `builder` should **only decide what UI to show** for a given auth state.

---

#### 2.5 Running async work directly in `build()`

**Bad: fire‑and‑forget async call in `build()`**

```dart
Future<void> doSomeAsyncWork() async {
  // network call, database write, etc.
}

@override
Widget build(BuildContext context) {
  // ❌ Potential side effect: called on every build
  doSomeAsyncWork();
  return const SomeWidget();
}
```

**Why it is wrong:**

- `build()` is **synchronous** and intended only for UI.
- You may start many overlapping async tasks as the widget rebuilds.
- Hard to reason about timing, cancellation, and error handling.

**Fix:**

- Run async work in:

```dart
Future<void> doSomeAsyncWork() async { /* ... */ }

@override
void initState() {
  super.initState();
  // ✅ Runs once when the widget is created
  doSomeAsyncWork();
}

ElevatedButton(
  // ✅ Async work in callbacks is fine
  onPressed: () async {
    await doSomeAsyncWork();
    await doSomeOtherAsyncWork();
  },
  child: const Text('Do work'),
);
```

- Or inside **listeners** (`BlocListener`, `ref.listen`, animation listeners),
  not in `build()`.

---

### 3. General DO / DON’T rules

#### 3.1 Do NOT modify state or call async code

- **Inside a `build()` method** of any widget.
- **Inside `builder` callbacks**, such as:
  - `MaterialPageRoute(builder: ...)`
  - `FutureBuilder.builder`
  - `StreamBuilder.builder`
  - `ValueListenableBuilder.builder`
  - any other callback whose job is to **return a widget tree**.
- **Inside methods that return a widget**, e.g. `Widget _buildFoo()` with
  side effects inside.

If you are changing state or firing async side effects in any of these, you
should **move that logic elsewhere**.

---

#### 3.2 DO modify state or call async code

- **Inside callbacks**:
  - `onPressed`, `onTap`, `onChanged`, gesture detectors, etc.
- **Inside lifecycle methods**:
  - `initState()` (start animations, subscribe to streams, kick off async
    initialization),
  - `dispose()` (cancel timers/streams, dispose controllers).
- **Inside controllers, blocs, or providers** that your widgets listen to:
  - UI reads state via `setState`/bloc/provider/Riverpod.
  - Side effects happen in the **business logic layer**, not in `build()`.
- **Inside listeners**:
  - `BlocListener`, `ref.listen`, animation listeners, etc.
  - These run in response to state changes, not on every build.
- In rare cases, **after the frame is rendered**, via:

```dart
WidgetsBinding.instance.addPostFrameCallback((_) {
  // ✅ Runs once after the current frame
  // Use sparingly for things that must happen after layout
});
```

---

### 4. Practical refactoring patterns

- **If you find side effects in `build()` or `builder`**:
  - Move the logic to:
    - a dedicated **state object** (`State`, bloc, provider, controller),
    - a **callback** or **listener** that is triggered by user actions or
      state changes.
  - Let the widget **only render** based on current state.

- **If you need one‑time initialization**:
  - Use **`initState()`** for:
    - starting animations,
    - initial data fetches,
    - setting up listeners.

- **If you need to react to state changes**:
  - Use **listeners**:
    - `BlocListener` (BLoC),
    - `ref.listen` (Riverpod),
    - a stream subscription or `AnimationController` listener.

This separation keeps your widget tree **pure and declarative**, avoids
unwanted rebuild loops, and makes side effects easier to reason about and
test.
