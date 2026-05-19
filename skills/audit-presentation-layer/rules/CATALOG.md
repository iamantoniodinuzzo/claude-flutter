# Audit Presentation Layer — Rule Catalog

Each rule has: ID, severity, source doc, detection heuristic, fix hint, and whether
auto-fix is safe (`autofix_safe`). Phase 3 of the skill scans using this catalog.

---

## Riverpod widget rules

### RIV-WIDGET-01
- **Severity**: error
- **Source**: `rules/breaking/riverpod-flutter.md`
- **What**: `ref.watch(` called outside a `build(` method body (e.g. in a callback, `onPressed`, `initState`)
- **Heuristic**: find `ref.watch(` lines; check if the enclosing method name is NOT `build`
- **Fix**: replace `ref.watch(` with `ref.read(` in callbacks; for lifecycle, restructure using `ref.listenManual` or `ref.listen` inside `build`
- **autofix_safe**: false (context-dependent; requires structural judgment)

### RIV-WIDGET-02
- **Severity**: warning
- **Source**: `rules/patterns/riverpod-rebuild-optimization.md`
- **What**: `ref.watch(someProvider)` result accessed with a single dot field (`.field`, `.value`) — should use `.select()` to scope rebuilds
- **Heuristic**: pattern `ref.watch(<provider>)\s*[;\n]` followed immediately (within 3 lines) by `\.<fieldName>` access, with no `.select(` on the watch call
- **Fix**: `ref.watch(someProvider.select((s) => s.field))`
- **autofix_safe**: true (mechanical transform if field access is clear)

### RIV-WIDGET-03
- **Severity**: warning
- **Source**: `rules/patterns/riverpod-rebuild-optimization.md`
- **What**: `Consumer(builder: ...)` wrapping a very large subtree (50+ lines), making the narrow-rebuild benefit moot
- **Heuristic**: `Consumer(` followed by a `builder:` block spanning > 50 lines before its closing `)`
- **Fix**: narrow the `Consumer` to wrap only the part of the tree that actually reads from `ref`
- **autofix_safe**: false (requires reading widget tree semantics)

### RIV-WIDGET-04
- **Severity**: error
- **Source**: `rules/breaking/riverpod-flutter.md`
- **What**: `ref.read(` called inside `build(` method body (read in build is a code smell; use watch or listen)
- **Heuristic**: within a `build(BuildContext context` or `build(BuildContext context, WidgetRef ref` method, find `ref.read(`
- **Fix**: replace with `ref.watch(` if value is needed for rendering, or move the `ref.read(` call into a callback
- **autofix_safe**: false (intent must be checked)

---

## Robot Testing pattern rules

### ROBOT-01
- **Severity**: error
- **Source**: `rules/patterns/robot-testing.md`
- **What**: `find.text(` used in a `*_test.dart` file under `presentation/` — breaks with i18n
- **Heuristic**: regex `find\.text\(` in `*_test.dart` files
- **Fix**: replace with `find.byKey(<WidgetClass>.<elementKey>)`; add Key to widget source first if missing
- **autofix_safe**: false (requires adding Key to widget and knowing the Key name)

### ROBOT-02
- **Severity**: error
- **Source**: `rules/patterns/robot-testing.md`
- **What**: `find.byTooltip(` used in a test — locale-dependent
- **Heuristic**: regex `find\.byTooltip\(` in `*_test.dart` files
- **Fix**: replace with Key-based finder
- **autofix_safe**: false

### ROBOT-03
- **Severity**: error
- **Source**: `rules/patterns/robot-testing.md`
- **What**: `pumpAndSettle(` used in a test file that also references `CircularProgressIndicator`, `LinearProgressIndicator`, or a looping animation — will throw `FlutterError('pumpAndSettle timed out')`
- **Heuristic**: file contains both `pumpAndSettle(` and (`CircularProgressIndicator` or `LinearProgressIndicator`). Flag all `pumpAndSettle(` lines in such files.
- **Fix**: replace `await tester.pumpAndSettle()` with `await tester.pump()` for frames containing infinite animations; restore `pumpAndSettle()` for frames after the animation resolves
- **autofix_safe**: false (context-dependent — some pumpAndSettle calls in the same file may be fine)

### ROBOT-04
- **Severity**: warning
- **Source**: `rules/patterns/robot-testing.md`
- **What**: Interactive widget (`TextField`, `ElevatedButton`, `IconButton`, `FilledButton`, `OutlinedButton`, `TextButton`, `Switch`, `Checkbox`, `Radio`, `Slider`, `InkWell` with `onTap`) present in source file without a corresponding `static const Key` on the containing class or a top-level `const …Key` in the same file
- **Heuristic**: find interactive widget constructor calls; check same file for `static const.*Key` or top-level `const.*Key`; flag if none found
- **Fix**: add `static const <elementName>Key = Key('<widgetName>_<element>');` to the widget class (or top-level constant if class is private)
- **autofix_safe**: false (naming convention must be followed; private-class exception applies)

### ROBOT-05
- **Severity**: warning
- **Source**: `rules/patterns/robot-testing.md`
- **What**: Public method named `find…()` in a Robot class — finders must be private (prefixed `_find`)
- **Heuristic**: in `*_test.dart`, find method declarations matching `\bfind[A-Z]\w+\(` that are NOT prefixed with `_`
- **Fix**: rename to `_find<Name>()`; update all call sites in the Robot
- **autofix_safe**: true (mechanical rename within the same test file)

---

## GoRouter rules

### ROUTER-01
- **Severity**: warning
- **Source**: `rules/patterns/go-router-navigation-conventions.md`
- **What**: `context.push(` or `GoRouter.of(context).push(` used for a deep-linkable screen (go_router v11.1.2+ does not update browser URL on push)
- **Heuristic**: regex `context\.push\(|GoRouter\.of\(context\)\.push\(` in `*.dart` files under `presentation/`
- **Fix**: replace `context.push(path)` with `context.go(path)` or `context.goNamed(routeName, ...)` for deep-linkable routes; keep `push` only for routes deliberately excluded from browser history
- **autofix_safe**: false (requires knowing if the route is deep-linkable)

### ROUTER-02
- **Severity**: info
- **Source**: `rules/patterns/go-router-navigation-conventions.md`
- **What**: `AppBar(` without explicit `leading:` in a screen class whose file name ends in `_screen.dart` — the default back button does not update GoRouter URL
- **Heuristic**: `AppBar(` in a `*_screen.dart` file where `leading:` does not appear within the `AppBar(…)` constructor span
- **Fix**: add `leading: BackButton(onPressed: () => context.goNamed(AppRoute.parent.name, ...))` to the `AppBar`
- **autofix_safe**: false (parent route name must be provided manually)

---

## Layout antipattern rules

### LAYOUT-01
- **Severity**: warning
- **Source**: `rules/breaking/flutter-widgets-perf.md`, `rules/patterns/go-router-navigation-conventions.md` §6
- **What**: More than one `Scaffold(` constructor call in the same widget file — the back button override must be duplicated in each
- **Heuristic**: count occurrences of `Scaffold(` in a single file; flag if > 1
- **Fix**: consolidate into a single outer `Scaffold`; extract non-Scaffold bodies as plain widget classes
- **autofix_safe**: false (structural refactor required)

### LAYOUT-02
- **Severity**: warning
- **Source**: `rules/patterns/widget-classes-no-build-helpers.md`
- **What**: Private method returning `Widget` (i.e. `Widget _buildX(` or `Widget _buildX(BuildContext`) inside a class that extends `StatelessWidget`, `ConsumerWidget`, `StatefulWidget`, `ConsumerStatefulWidget`, or `State`
- **Heuristic**: regex `Widget\s+_\w+\s*\(` inside a widget class body
- **Fix**: extract the method body into a private widget class (e.g. `class _MySection extends StatelessWidget`)
- **autofix_safe**: false (extraction requires reading the method's captured variables)

---

## Side-effect rules

### SIDE-FX-01
- **Severity**: error
- **Source**: `rules/patterns/flutter-side-effects.md`
- **What**: `showDialog(`, `Navigator.push(`, `ScaffoldMessenger.of(context).show`, or `WidgetsBinding.instance.addPostFrameCallback(` called directly inside a `build(` method body
- **Heuristic**: within a `build(BuildContext` method span, find any of these call patterns
- **Fix**: move the call into a callback (`onPressed`, `onTap`) or use `ref.listen` / `BlocListener` outside `build`
- **autofix_safe**: false (requires moving logic to an event handler)

---

## UI string rules

### UI-STR-01
- **Severity**: info
- **Source**: `rules/patterns/no-ui-strings-outside-ui.md`
- **What**: Hardcoded user-facing string literal (> 3 words) in a layer file outside `presentation/` — e.g. in `application/`, `domain/`, or `data/`
- **Heuristic**: in `*.dart` files NOT under `presentation/`, find string literals matching `'[A-Za-z ]{20,}'` (rough proxy for multi-word human copy) that are not in comments and not assigned to `const` technical names (e.g. `url`, `path`, `key`, `tag`)
- **Fix**: replace with a typed enum or exception; add a presentation-layer extension that maps the type to a localized string
- **autofix_safe**: false (typed enum design is project-specific)

---

## Adding new rules

1. Add a rule block here following the schema above.
2. Update `SKILL.md` rule count in the quick-reference table (optional).
3. No other files need changing — Phase 3 reads this catalog at runtime.
