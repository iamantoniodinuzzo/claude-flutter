# Audit Application Layer — Rule Catalog

Each rule has: ID, severity, source doc, detection heuristic, fix hint, and whether
auto-fix is safe (`autofix_safe`). Phase 3 of the skill scans using this catalog.

---

## Framework isolation rules

### APP-DEP-01
- **Severity**: error
- **Source**: `rules/patterns/feature-creation.md`
- **What**: Application-layer file imports `package:flutter/widgets.dart`,
  `package:flutter/material.dart`, or `package:flutter/cupertino.dart`. The application
  layer must remain framework-free — it may only depend on Dart core, Riverpod packages
  (`riverpod`, `riverpod_annotation`, `flutter_riverpod`), and domain packages.
- **Heuristic**: in files under `application/`, find lines matching
  `import 'package:flutter/(widgets|material|cupertino)\.dart'`. Do NOT flag
  `import 'package:flutter_riverpod/...` or `import 'package:riverpod/...`.
- **Fix**: remove the Flutter framework import. If the file needs a Flutter type (e.g.
  `BuildContext`, `Color`), that logic belongs in the presentation layer; extract it there
  and let the notifier stay pure Dart/Riverpod.
- **autofix_safe**: false (removing the import may require moving or restructuring logic)

---

## Async mutation rules

### APP-NOTIF-02
- **Severity**: error
- **Source**: `rules/breaking/riverpod-async-mutations.md`, `rules/breaking/dart-async-errors.md`
- **What**: Notifier mutation method contains a manual `try/catch` block wrapping `await`
  expressions for the purpose of error *reporting* (e.g. updating state to an error or
  logging). Riverpod's `AsyncNotifier` + `AsyncErrorLogger` already handle async errors
  via the single-error-channel pattern; manual try/catch duplicates that mechanism,
  suppresses the automatic error propagation, and makes the code harder to test.
- **Heuristic**: inside a class that `extends AsyncNotifier`, `AutoDisposeAsyncNotifier`,
  `Notifier`, `AutoDisposeNotifier`, `StreamNotifier`, or `AutoDisposeStreamNotifier`,
  find `try {` blocks in public (non-`build`) methods that contain `await` and whose
  `catch` block either sets `state = AsyncError(...)` or calls a logger. Flag the `try {`
  line. Do NOT flag `try/catch` that explicitly converts an infrastructure exception to a
  domain exception (a valid pattern in notifiers that directly call datasources, though
  preferably that conversion lives in the data layer).
- **Fix**: remove the `try/catch` wrapper and let Riverpod surface the domain exception
  through state automatically. If custom error recovery is needed, use `.guard()` or
  handle at the presentation layer via `ref.listen`.
- **autofix_safe**: false (requires verifying intent of each try/catch block)

### APP-NOTIF-01
- **Severity**: warning
- **Source**: `rules/patterns/async-notifier-command-api.md`
- **What**: Public async mutation method in a notifier class declares a return type other
  than `Future<void>` or `void`. Mutation methods should surface results via state
  (single error channel) rather than returning values to callers, which makes the API
  testable and consistent.
- **Heuristic**: inside notifier classes, find public method declarations matching
  `Future<(?!void)[A-Za-z<>?,\s]+>\s+\w+\s*\(` (i.e. `Future<T>` where T is not `void`).
  Also flag `\bT\b` or unnamed generic returns in async methods. Do NOT flag the `build`
  method or private `_` methods.
- **Fix**: change return type to `Future<void>`. Surface the result or error by updating
  `state` inside the method:
  ```dart
  Future<void> signIn(String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _repo.signIn(email, password));
  }
  ```
- **autofix_safe**: false (callers that consume the return value must be updated)

---

## State type rules

### APP-STATE-01
- **Severity**: warning
- **Source**: `rules/breaking/riverpod-core.md`
- **What**: Provider state type is `dynamic`, `Object?` (as a state type, not a parameter
  type), or `Map` / `List` without type parameters. Unconstrained state types defeat
  type-safety, make tests fragile, and hide incorrect state shapes at compile time.
- **Heuristic**: flag any of the following patterns in `application/` files:
  - `AsyncValue<dynamic>` or `StateProvider<dynamic>`
  - `AsyncValue<Map>` or `AsyncValue<List>` (bare without type params)
  - `AsyncValue<Object?>` used as a state type (not a value parameter)
  - `StateProvider<Object?>`
  - Class-level `state = ` assignments where the right-hand value is typed `dynamic`
  Also flag `@riverpod` functions whose return type is `dynamic` or omitted (Dart infers
  `dynamic` for unannotated async functions returning heterogeneous types).
- **Fix**: replace `dynamic`/bare container with a concrete type or sealed class. If the
  state is a union of loading/error/data, use `AsyncValue<ConcreteModel>` from Riverpod.
- **autofix_safe**: false (requires choosing or defining the correct model type)

---

## Adding new rules

1. Add a rule block here following the schema above.
2. Update Phase 3 heuristic notes in `SKILL.md` if the rule needs a specific detection
   explanation.
3. No other files need changing — Phase 3 reads this catalog at runtime.
