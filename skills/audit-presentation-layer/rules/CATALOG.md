# Audit Presentation Layer — Rule Catalog

Each rule has: ID, severity, source doc, detection heuristic, fix hint, and whether
auto-fix is safe (`autofix_safe`). Phase 3 of the skill scans using this catalog.

---

## Riverpod widget rules

### RIV-WIDGET-01
- **Severity**: error
- **Platforms**: all
- **Source**: `rules/breaking/riverpod-flutter.md`
- **What**: `ref.watch(` called outside a `build(` method body (e.g. in a callback, `onPressed`, `initState`)
- **Heuristic**: find `ref.watch(` lines; check if the enclosing method name is NOT `build`
- **Fix**: replace `ref.watch(` with `ref.read(` in callbacks; for lifecycle, restructure using `ref.listenManual` or `ref.listen` inside `build`
- **autofix_safe**: false (context-dependent; requires structural judgment)

### RIV-WIDGET-02
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/riverpod-rebuild-optimization.md`
- **What**: `ref.watch(someProvider)` result accessed with a single dot field (`.field`, `.value`) — should use `.select()` to scope rebuilds
- **Heuristic**: pattern `ref.watch(<provider>)\s*[;\n]` followed immediately (within 3 lines) by `\.<fieldName>` access, with no `.select(` on the watch call
- **Fix**: `ref.watch(someProvider.select((s) => s.field))`
- **autofix_safe**: true (mechanical transform if field access is clear)

### RIV-WIDGET-03
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/riverpod-rebuild-optimization.md`
- **What**: `Consumer(builder: ...)` wrapping a very large subtree (50+ lines), making the narrow-rebuild benefit moot
- **Heuristic**: `Consumer(` followed by a `builder:` block spanning > 50 lines before its closing `)`
- **Fix**: narrow the `Consumer` to wrap only the part of the tree that actually reads from `ref`
- **autofix_safe**: false (requires reading widget tree semantics)

### RIV-WIDGET-04
- **Severity**: error
- **Platforms**: all
- **Source**: `rules/breaking/riverpod-flutter.md`
- **What**: `ref.read(` called inside `build(` method body (read in build is a code smell; use watch or listen)
- **Heuristic**: within a `build(BuildContext context` or `build(BuildContext context, WidgetRef ref` method, find `ref.read(`
- **Fix**: replace with `ref.watch(` if value is needed for rendering, or move the `ref.read(` call into a callback
- **autofix_safe**: false (intent must be checked)

---

## Rebuild isolation rules

### REBUILD-01
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/rebuild-isolation.md`
- **What**: Constructor call inside a `build` method whose arguments are all literals or `const` expressions, but is not marked `const` — the subtree is re-instantiated and re-diffed on every parent rebuild instead of being compile-time canonicalized and skipped
- **Heuristic**: inside `build(` method spans, flag `SizedBox(`, `EdgeInsets.all(`/`EdgeInsets.symmetric(`/`EdgeInsets.only(`, `Icon(Icons.`, `Text('...')` (literal-only args), `Divider(`, `Padding(padding: EdgeInsets` calls not preceded by `const ` on the same line or covered by an enclosing `const` (check ~3 lines above for an enclosing `const` constructor call)
- **Fix**: add `const` to the constructor call (or hoist `const` to the outermost const-able ancestor)
- **autofix_safe**: true (mechanical when all args are literal; equivalent to `prefer_const_constructors`)

### REBUILD-02
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/rebuild-isolation.md`
- **What**: `MediaQuery.of(context)` used to read a single property — subscribes the widget to every `MediaQueryData` change (keyboard insets, text scale, brightness), causing unrelated rebuilds; scoped aspect accessors exist since Flutter 3.10
- **Heuristic**: flag `MediaQuery.of(context).size`, `MediaQuery.of(context).padding`, `MediaQuery.of(context).viewInsets`, `MediaQuery.of(context).platformBrightness`, `MediaQuery.of(context).textScaler` — any `MediaQuery.of(context).<prop>` single-property access
- **Fix**: replace with the scoped accessor: `MediaQuery.sizeOf(context)`, `MediaQuery.paddingOf(context)`, `MediaQuery.viewInsetsOf(context)`, `MediaQuery.platformBrightnessOf(context)`, `MediaQuery.textScalerOf(context)`
- **autofix_safe**: true (one-to-one mechanical substitution)

### REBUILD-03
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/rebuild-isolation.md`
- **What**: `AnimatedBuilder(`, `ListenableBuilder(`, or `ValueListenableBuilder(` with a `builder:` body longer than ~10 lines and no `child:` parameter — the whole subtree is rebuilt on every notification (every frame for animations) instead of the static part being built once and threaded through `child`
- **Heuristic**: find `AnimatedBuilder(`/`ListenableBuilder(`/`ValueListenableBuilder(` constructor spans; flag when the span contains no `child:` argument and the `builder:` closure body exceeds ~10 lines
- **Fix**: move the static subtree into the `child:` parameter and receive it in the builder signature (`builder: (context, child) => Transform.rotate(..., child: child)`); or extract the static part into a `const` widget class
- **autofix_safe**: false (requires separating dynamic wrapper from static subtree)

### REBUILD-04
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/rebuild-isolation.md`
- **What**: `setState(` called in a `State` class whose `build` method exceeds ~50 lines — every `setState` invalidates the entire large build, rebuilding the whole screen for a local change
- **Heuristic**: in files containing `setState(`, measure the enclosing class's `build(` method span; flag each `setState(` call site when that span > 50 lines
- **Fix**: extract the mutable region into a small leaf `StatefulWidget`, or wrap only the reactive part in `ValueNotifier` + `ValueListenableBuilder` (with `child:`), or promote the state to a Riverpod provider
- **autofix_safe**: false (structural extraction required)

---

## Widget extraction & cohesion/coupling rules

### EXTRACT-01
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/widget-extraction-cohesion.md`
- **What**: `build` method longer than ~80 lines — composes several independently-changing sections in one place (low cohesion; violates Single Responsibility); also blocks `const` subtree caching and isolated rebuilds
- **Heuristic**: measure each `build(` method span (from signature to matching closing brace); flag the `build(` line when the span > 80 lines
- **Fix**: extract each logical section (header, list, action bar, …) into a private widget class with a `const` constructor; the screen `build` should read as a table of contents
- **autofix_safe**: false (extraction requires identifying captured variables per section)

### EXTRACT-02
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/widget-extraction-cohesion.md`
- **What**: Top-level or `static` function returning `Widget` — same problem as private build-helper methods (LAYOUT-02) but outside a class body: no element identity, no `const`, rebuilt inline with every caller, invisible in the widget inspector
- **Heuristic**: regex `^Widget\s+\w+\s*\(` at top level (column 0) and `static\s+Widget\s+\w+\s*\(` anywhere in widget files
- **Fix**: convert to a `StatelessWidget` (or `ConsumerWidget`) class with the function parameters as constructor fields
- **autofix_safe**: false (call sites must be rewritten to constructor invocations)

### COHESION-01
- **Severity**: info
- **Platforms**: all
- **Source**: `rules/patterns/widget-extraction-cohesion.md`
- **What**: Widget constructor receives a whole entity/state object but its `build` reads ≤ 2 of its fields — Principle of Least Knowledge violation; couples the widget to the entity's full shape, blocks `const` construction, widens rebuild scope, and complicates tests
- **Heuristic**: for each widget class with a single non-Key constructor field of a non-primitive project type (`final Booking booking;`), count distinct `<field>.<member>` accesses in the class body; flag the field declaration when ≤ 2 distinct members are read
- **Fix**: replace the object parameter with the specific fields the widget renders (e.g. `required this.pilotName, required this.slotLabel`); keep the object parameter only when the widget genuinely renders most of it (detail cards, 5+ fields)
- **autofix_safe**: false (constructor and all call sites change)

### COUPLING-01
- **Severity**: error
- **Platforms**: all
- **Source**: `rules/patterns/widget-extraction-cohesion.md`
- **What**: Presentation file imports a `data/` path (repository implementation, datasource, or data model) — violates the clean-architecture dependency rule; UI must consume state via application-layer providers and domain types
- **Heuristic**: in files under `presentation/`, flag `import` lines whose path contains `/data/` (relative like `../../data/...` or package imports containing `/data/`)
- **Fix**: route the call through an application-layer provider/notifier; if none exists, create it — do not import `data/` from a widget
- **autofix_safe**: false (may require creating the missing application-layer abstraction)

### COUPLING-02
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/widget-extraction-cohesion.md`
- **What**: Cross-feature presentation import (`features/<other>/presentation/`) — lateral coupling; the other feature can no longer change or be removed independently
- **Heuristic**: in files under `features/<name>/presentation/`, flag `import` lines matching `features/<other-name>/presentation/` where `<other-name>` differs from the file's own feature directory
- **Fix**: prefer navigation via the router (`context.goNamed`) to embed another feature's screen; promote genuinely shared widgets to the common UI package (e.g. `lib/src/common_widgets/`); or duplicate deliberately if the widgets are diverging
- **autofix_safe**: false (architectural decision per import)

---

## Robot Testing pattern rules

### ROBOT-01
- **Severity**: error
- **Platforms**: all
- **Source**: `rules/patterns/robot-testing.md`
- **What**: `find.text(` used in a `*_test.dart` file under `presentation/` — breaks with i18n
- **Heuristic**: regex `find\.text\(` in `*_test.dart` files
- **Fix**: replace with `find.byKey(<WidgetClass>.<elementKey>)`; add Key to widget source first if missing
- **autofix_safe**: false (requires adding Key to widget and knowing the Key name)

### ROBOT-02
- **Severity**: error
- **Platforms**: all
- **Source**: `rules/patterns/robot-testing.md`
- **What**: `find.byTooltip(` used in a test — locale-dependent
- **Heuristic**: regex `find\.byTooltip\(` in `*_test.dart` files
- **Fix**: replace with Key-based finder
- **autofix_safe**: false

### ROBOT-03
- **Severity**: error
- **Platforms**: all
- **Source**: `rules/patterns/robot-testing.md`
- **What**: `pumpAndSettle(` used in a test file that also references `CircularProgressIndicator`, `LinearProgressIndicator`, or a looping animation — will throw `FlutterError('pumpAndSettle timed out')`
- **Heuristic**: file contains both `pumpAndSettle(` and (`CircularProgressIndicator` or `LinearProgressIndicator`). Flag all `pumpAndSettle(` lines in such files.
- **Fix**: replace `await tester.pumpAndSettle()` with `await tester.pump()` for frames containing infinite animations; restore `pumpAndSettle()` for frames after the animation resolves
- **autofix_safe**: false (context-dependent — some pumpAndSettle calls in the same file may be fine)

### ROBOT-04
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/robot-testing.md`
- **What**: Interactive widget (`TextField`, `ElevatedButton`, `IconButton`, `FilledButton`, `OutlinedButton`, `TextButton`, `Switch`, `Checkbox`, `Radio`, `Slider`, `InkWell` with `onTap`) present in source file without a corresponding `static const Key` on the containing class or a top-level `const …Key` in the same file
- **Heuristic**: find interactive widget constructor calls; check same file for `static const.*Key` or top-level `const.*Key`; flag if none found
- **Fix**: add `static const <elementName>Key = Key('<widgetName>_<element>');` to the widget class (or top-level constant if class is private)
- **autofix_safe**: false (naming convention must be followed; private-class exception applies)

### ROBOT-05
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/robot-testing.md`
- **What**: Public method named `find…()` in a Robot class — finders must be private (prefixed `_find`)
- **Heuristic**: in `*_test.dart`, find method declarations matching `\bfind[A-Z]\w+\(` that are NOT prefixed with `_`
- **Fix**: rename to `_find<Name>()`; update all call sites in the Robot
- **autofix_safe**: true (mechanical rename within the same test file)

---

## GoRouter rules

### ROUTER-01
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/go-router-navigation-conventions.md`
- **What**: `context.push(` or `GoRouter.of(context).push(` used for a deep-linkable screen (go_router v11.1.2+ does not update browser URL on push)
- **Heuristic**: regex `context\.push\(|GoRouter\.of\(context\)\.push\(` in `*.dart` files under `presentation/`
- **Fix**: replace `context.push(path)` with `context.go(path)` or `context.goNamed(routeName, ...)` for deep-linkable routes; keep `push` only for routes deliberately excluded from browser history
- **autofix_safe**: false (requires knowing if the route is deep-linkable)

### ROUTER-02
- **Severity**: info
- **Platforms**: mobile
- **Source**: `rules/patterns/go-router-navigation-conventions.md`
- **What**: `AppBar(` without explicit `leading:` in a screen class whose file name ends in `_screen.dart` — the default back button does not update GoRouter URL
- **Heuristic**: `AppBar(` in a `*_screen.dart` file where `leading:` does not appear within the `AppBar(…)` constructor span
- **Fix**: add `leading: BackButton(onPressed: () => context.goNamed(AppRoute.parent.name, ...))` to the `AppBar`
- **autofix_safe**: false (parent route name must be provided manually)

### ROUTER-03
- **Severity**: warning when the resolved target explicitly includes android or ios (`--platform` or pubspec `platforms`); info when the target is the `all` fallback
- **Platforms**: mobile
- **Source**: `rules/patterns/go-router-navigation-conventions.md` §8
- **What**: Blanket `NoTransitionPage` in the router file — a helper (top-level/private function or lambda, body ≤ 3 lines) returning `NoTransitionPage(` / `NoTransitionPage<...>(`, or inline `pageBuilder: ... => NoTransitionPage(`, used by ≥ 50% of the file's `GoRoute` page builders (and at least 3 routes). It removes native transitions on Android/iOS and bypasses `ThemeData.pageTransitionsTheme` — a page built with `NoTransitionPage` never asks the theme
- **Heuristic**: **scope gate** — inspects the router file; run only when the audited input is an app root, `lib/`, a `routing/` folder, or the router file itself; skip silently for a feature folder or other single file. Find `NoTransitionPage(<[^>]*>)?\(` inside a function/lambda body of ≤ 3 lines (helper); count helper call sites plus inline uses vs total `pageBuilder:`/`builder:` entries in `GoRoute(`/`StatefulShellRoute` spans; flag when ≥ 50% and ≥ 3. Never flag one-offs below the threshold. Then grep `lib/` for `pageTransitionsTheme:`: it does not gate firing, it selects the message — *theme set but bypassed by the helper* vs *no transition strategy defined*; also note when it appears in fewer calls than there are `ThemeData(`/`FlexThemeData.*(` calls (light/dark mismatch)
- **Fix**: define an adaptive `PageTransitionsTheme` (native on installed mobile, instant on web/desktop), set it on **both** light and dark themes, and change the helper to `MaterialPage` (or drop it and use `builder:`); keep an explicit `NoTransitionPage`/`CustomTransitionPage` only for deliberate one-offs. See `flutter-go-router` § Page Transitions
- **autofix_safe**: false (product decision on which platforms animate)

---

## Layout antipattern rules

### LAYOUT-01
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/breaking/flutter-widgets-perf.md`, `rules/patterns/go-router-navigation-conventions.md` §6
- **What**: More than one `Scaffold(` constructor call in the same widget file — the back button override must be duplicated in each
- **Heuristic**: count occurrences of `Scaffold(` in a single file; flag if > 1
- **Fix**: consolidate into a single outer `Scaffold`; extract non-Scaffold bodies as plain widget classes
- **autofix_safe**: false (structural refactor required)

### LAYOUT-02
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/widget-classes-no-build-helpers.md`
- **What**: Private method returning `Widget` (i.e. `Widget _buildX(` or `Widget _buildX(BuildContext`) inside a class that extends `StatelessWidget`, `ConsumerWidget`, `StatefulWidget`, `ConsumerStatefulWidget`, or `State`
- **Heuristic**: regex `Widget\s+_\w+\s*\(` inside a widget class body
- **Fix**: extract the method body into a private widget class (e.g. `class _MySection extends StatelessWidget`)
- **autofix_safe**: false (extraction requires reading the method's captured variables)

---

## Side-effect rules

### SIDE-FX-01
- **Severity**: error
- **Platforms**: all
- **Source**: `rules/patterns/flutter-side-effects.md`
- **What**: `showDialog(`, `Navigator.push(`, `ScaffoldMessenger.of(context).show`, or `WidgetsBinding.instance.addPostFrameCallback(` called directly inside a `build(` method body
- **Heuristic**: within a `build(BuildContext` method span, find any of these call patterns
- **Fix**: move the call into a callback (`onPressed`, `onTap`) or use `ref.listen` / `BlocListener` outside `build`
- **autofix_safe**: false (requires moving logic to an event handler)

---

## UI string rules

### UI-STR-01
- **Severity**: info
- **Platforms**: all
- **Source**: `rules/patterns/no-ui-strings-outside-ui.md`
- **What**: Hardcoded user-facing string literal (> 3 words) in a layer file outside `presentation/` — e.g. in `application/`, `domain/`, or `data/`
- **Heuristic**: in `*.dart` files NOT under `presentation/`, find string literals matching `'[A-Za-z ]{20,}'` (rough proxy for multi-word human copy) that are not in comments and not assigned to `const` technical names (e.g. `url`, `path`, `key`, `tag`)
- **Fix**: replace with a typed enum or exception; add a presentation-layer extension that maps the type to a localized string
- **autofix_safe**: false (typed enum design is project-specific)

---

## Responsive layout rules

### RESPONSIVE-01
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/responsive-layout.md`
- **What**: `MediaQuery.of(context).size` or `MediaQuery.sizeOf(context)` used for layout branching inside a nested widget, OR hard-coded numeric `width:` / `height:` on a `Container` or `SizedBox` used as a structural layout container (not a small decorative size ≤ 64)
- **Heuristic**: (a) regex `MediaQuery\.of\(context\)\.size|MediaQuery\.sizeOf\(context\)` in a widget file — flag any occurrence used in an `if`/ternary branch for layout decisions; (b) regex `width:\s*\d{3,}|height:\s*\d{3,}` in `Container(`/`SizedBox(` constructor spans (values ≥ 100 as proxy for layout sizing)
- **Fix**: (a) wrap the branching subtree in `LayoutBuilder` and switch on `constraints.maxWidth`; (b) replace with `FractionallySizedBox`, `Flexible`/`Expanded`, or `ConstrainedBox(constraints: BoxConstraints(maxWidth: N))`
- **autofix_safe**: false (requires reading widget tree semantics and sizing intent)

### RESPONSIVE-02
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/responsive-layout.md` §5
- **What**: Magic-number width breakpoint in a layout conditional (`width > 600`, `maxWidth < 840`, …) — breakpoints scattered as literals drift out of sync across screens; layout selection should be a Strategy keyed on named breakpoint constants
- **Heuristic**: flag comparisons of a width-like expression (`constraints.maxWidth`, `size.width`, `width`) against a 3–4 digit numeric literal inside `if`/ternary/`switch` conditions, unless the literal is referenced via an identifier (e.g. `AppBreakpoints.compact`)
- **Fix**: define breakpoint constants once (e.g. `abstract final class AppBreakpoints { static const double compact = 600; static const double expanded = 840; }`) and switch on them inside `LayoutBuilder`; each size-class layout becomes its own widget (concrete strategy)
- **autofix_safe**: false (constants class location and naming are project-specific)

### RESPONSIVE-03
- **Severity**: info
- **Platforms**: all
- **Source**: `rules/patterns/responsive-layout.md` §6
- **What**: `Row(` containing ≥ 2 children with hard-coded `width:` and no `Flexible`/`Expanded` sibling — overflows (yellow-black stripes) when available width shrinks below the fixed sum (small phones, split-screen, resized windows)
- **Heuristic**: within a `Row(` constructor span, count children with `width:\s*\d+` (`SizedBox`/`Container`); flag the `Row(` line when ≥ 2 such children exist and the span contains no `Flexible(`/`Expanded(`
- **Fix**: wrap children in `Expanded`/`Flexible` so they share available width, or convert the `Row` to `Wrap` to let items flow to the next line
- **autofix_safe**: false (intent — share vs wrap — must be chosen)

### RESPONSIVE-04
- **Severity**: info
- **Platforms**: all
- **Source**: `rules/patterns/responsive-layout.md` §7
- **What**: Grid with a literal `crossAxisCount:` (`SliverGridDelegateWithFixedCrossAxisCount` or `GridView.count`) — column count frozen at design time renders the same 2 columns on a phone and a 32-inch monitor
- **Heuristic**: flag `crossAxisCount:\s*\d+` literal arguments in `SliverGridDelegateWithFixedCrossAxisCount(` and `GridView.count(` spans, unless the value is computed from constraints/width
- **Fix**: switch to `SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: <tileWidth>)` so the framework derives the count from available width; or compute the count from `LayoutBuilder` constraints
- **autofix_safe**: false (tile max-extent value must be chosen by design)

---

## Web interaction affordance rules

### WEB-01
- **Severity**: warning
- **Platforms**: web
- **Source**: `rules/patterns/web-interaction-affordances.md`
- **What**: `GestureDetector(` or `InkWell(` with an `onTap:` callback, where neither `MouseRegion` nor `Focus` nor `FocusableActionDetector` wraps the widget within the same build method — missing hover cursor and keyboard-focus affordance for web/desktop users
- **Heuristic**: in widget files, find `GestureDetector(` or `InkWell(` that include `onTap:`; check whether `MouseRegion`, `Focus`, or `FocusableActionDetector` appears as an ancestor within the same `build` method span (within ~20 lines above); flag if none found. Skip occurrences inside Flutter's built-in button classes (`ElevatedButton`, `TextButton`, `FilledButton`, `OutlinedButton`, `IconButton`, `ListTile`).
- **Fix**: wrap with `MouseRegion(cursor: SystemMouseCursors.click, child: ...)` for hover; add `FocusableActionDetector` (with `ActivateIntent` → tap handler) or `Focus` + `focusNode` for keyboard access
- **autofix_safe**: false (wrapping hierarchy and keyboard binding must be reviewed manually)

### WEB-02
- **Severity**: warning
- **Platforms**: web
- **Source**: `rules/patterns/web-boot-loader.md`
- **What**: Flutter web app ships without a working boot loader — blank white page for 3-5 s while the runtime downloads. Sub-checks: (a) `web/index.html` `<body>` has no visible element before the `flutter_bootstrap.js` script; (b) custom `flutter_bootstrap.js` never listens for `flutter-first-frame` (loader removed on `runApp()` resolve, or never removed); (c) custom `flutter_bootstrap.js` with top-level `const`/`let`/`class` outside an IIFE or block — breaks `flutter run -d chrome` with `Identifier 'loader' has already been declared`; (d) custom bootstrap missing `serviceWorkerSettings` while `--pwa-strategy=none` is not configured; (e) loader styles on `body` (`display:flex`)
- **Heuristic**: **scope gate** — inspects `web/`, not Dart; run only when the audited input is an app root (directory with `pubspec.yaml`) or `lib/`, skip silently for a feature folder or single file. Read `web/index.html`, `web/flutter_bootstrap.js` (if present) and `web/*.css`. (a) first non-script element child of `<body>` before the bootstrap `<script>`; (b) no `flutter-first-frame` string in the bootstrap; (c) `^(const|let|class)\s` at column 0 outside a function/block, ignoring the `{{flutter_js}}`/`{{flutter_build_config}}` tokens; (d) no `serviceWorkerSettings` and no `--pwa-strategy=none` in CI scripts/`melos.yaml`/docs; (e) `body\s*\{[^}]*display:\s*flex`. Without a custom bootstrap only (a) and (e) apply
- **Fix**: run `/web-loader-init` (the audit reports, the skill scaffolds); for (c) alone wrap everything after `{{flutter_js}}`/`{{flutter_build_config}}` in `(function () { ... })();`
- **autofix_safe**: false (loader design, palette and PWA strategy need decisions)

---

## Asset loading rules

### ASSET-01
- **Severity**: warning (SVG) / info (raster)
- **Platforms**: all
- **Source**: `rules/patterns/asset-first-frame-warmup.md`
- **What**: `SvgPicture.asset(` / `Image.asset(` / `AssetImage(` in a first-route or shell widget whose path has no warm-up in startup code — the first frame draws it one or two frames late (pop-in)
- **Heuristic**: in widget files reachable from the first route/shell, find these constructors with a literal or constant path; grep `main.dart`/startup code for `SvgAssetLoader(`/`precacheImage(` covering the same path; flag if none. Skip assets preloaded by an engine registry (Flame `Images`, sprite registry) and `rootBundle`-only assets. Severity is warning for SVG (cache reachable before `runApp`), info for raster (needs a `BuildContext`)
- **Fix**: SVG → `SvgAssetLoader(path).loadBytes(null)` in `main()` before `runApp`; raster → `precacheImage(AssetImage(path), context)` post-first-frame or in a splash widget; or run `/asset-preload-init`
- **autofix_safe**: false (first-frame reachability and startup placement need judgment)

### ASSET-02
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/asset-size-budget.md`
- **What**: Raster asset far larger than its display size — source pixels > display logical px × 3 (max DPR) × 1.5, or, when display size is unknown, decoded size (`w × h × 4`) > 4 MB
- **Heuristic**: needs the project root (`pubspec.yaml`); read pixel size from the file header for raster assets declared under `flutter: assets:`; take display size from `width:`/`height:` on the consuming widget when present. In single-file mode, check only assets referenced by the file. Skip SVG
- **Fix**: propose a resize (e.g. `magick in.png -resize 256x256 out.png`) — never run unasked; if files cannot be edited, `cacheWidth`/`cacheHeight` or `ResizeImage`
- **autofix_safe**: false (modifies binary assets)

### ASSET-03
- **Severity**: info
- **Platforms**: all
- **Source**: `rules/patterns/asset-unused.md`
- **What**: Asset declared in pubspec (file or directory entry) but referenced nowhere — it still ships in every build
- **Heuristic**: needs the project root; expand `flutter: assets:`, grep quoted file names (names may contain spaces), follow `flutter_gen` accessors and runtime-built paths (prefix + enum `.name` + extension) before flagging. `rootBundle.load` counts as a reference
- **Fix**: report only — the user decides whether to delete the file or narrow the pubspec entry
- **autofix_safe**: false (never delete automatically)

### ASSET-04
- **Severity**: error
- **Platforms**: all
- **Source**: `rules/patterns/asset-warmup-safety.md`
- **What**: Existing warm-up is unsafe or ineffective: (a) the warm-up `Future` has no error handler attached at creation; (b) the cache key cannot match the widget's (`theme:`/`colorMapper:`/`bundle:` on `SvgPicture.asset`, or a `DefaultSvgTheme` ancestor); (c) `precacheImage` used for an engine-managed cache
- **Heuristic**: find `SvgAssetLoader(`/`precacheImage(` in startup code; (a) check for `.then(…, onError:` / `catchError` at the creation expression, not only at the `await`; (b) for each warmed path, inspect its `SvgPicture.asset` consumers for the args above; (c) check whether the path is consumed by a Flame `Images`/sprite registry
- **Fix**: (a) `.then<void>((_) {}, onError: …)` at creation; (b) remove the warm-up for that asset or align the key; (c) use the engine's own preload
- **autofix_safe**: false (startup flow and cache-key alignment need review)

---

## Autofill rules

### AUTOFILL-01
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/autofill.md`
- **What**: A `Form`/screen with a password field (`obscureText: true`, or a `PasswordTextField`-style wrapper) next to an email/username field, with no `AutofillGroup` ancestor wrapping both — the OS cannot link them into one credential
- **Heuristic**: in a widget file, find a password field (`obscureText:\s*true` or a class matching `Password\w*Field`) and a sibling field whose `keyboardType` is `TextInputType.emailAddress` or whose label/controller name matches `email|user(name)?|login`; flag when `AutofillGroup(` does not enclose both within the same `build` span
- **Fix**: wrap the credential fields (not the whole screen if avoidable) in `AutofillGroup(onDisposeAction: AutofillContextAction.cancel, child: Column(...))`
- **autofix_safe**: false (group boundaries must be chosen)

### AUTOFILL-02
- **Severity**: warning
- **Platforms**: all
- **Source**: `rules/patterns/autofill.md`
- **What**: Credential field with no `autofillHints`, or hints that do not match the flow/keyboard — sign-in: email `[username, email]`, password `[password]`; sign-up/reset/change-password: new password `[newPassword]` (also on the confirm field), sign-up email `[newUsername, email]`; `AutofillHints.email` needs `TextInputType.emailAddress`, `AutofillHints.name` needs `TextInputType.name`; a field that must not be personal data (e.g. an organisation name being created) should have no hints
- **Heuristic**: for each password/email/name/phone field lacking `autofillHints:`, flag. For each present hint, check the pairing above; in files whose class/route name matches `register|sign_?up|reset|change_?password`, flag `AutofillHints.password` used on a *new* password field
- **Fix**: add the hint list; set the matching `keyboardType`
- **autofix_safe**: false (correct hint depends on the flow)

### AUTOFILL-03
- **Severity**: error
- **Platforms**: all
- **Source**: `rules/patterns/autofill.md`
- **What**: (a) `AutofillGroup(` without `onDisposeAction: AutofillContextAction.cancel` — the default `commit` offers to save a wrong password after a failed login; (b) a submit handler (sign-in / register / change-password) with no `TextInput.finishAutofillContext()` on its success path; (c) `finishAutofillContext()` placed after the credential controllers are cleared
- **Heuristic**: (a) `AutofillGroup(` span lacks `onDisposeAction:\s*AutofillContextAction\.cancel`; (b) in the `State` class that owns the group, no `finishAutofillContext(` call reachable after an awaited success result (`if (success)`, `if (ok)`, `.then`); (c) in the success branch, `.clear()` / `.text = ''` on the credential controllers appears textually before `finishAutofillContext(`. Skip (b) for forgot-password screens — the reset completes outside the app
- **Fix**: `onDisposeAction: AutofillContextAction.cancel` on the group; `if (success) TextInput.finishAutofillContext();` right after the awaited call and before clearing the form
- **autofix_safe**: true for (a); false for (b)/(c) (needs the success condition)

### AUTOFILL-04
- **Severity**: info
- **Platforms**: all
- **Source**: `rules/patterns/autofill.md`
- **What**: Shared text-field wrapper (`AppTextField`, `PasswordTextField`, ...) that builds a `TextFormField`/`TextField` but does not expose/forward `autofillHints` (ideally also `focusNode`, `onChanged`) — feature screens are forced back to raw `TextFormField`, fragmenting the design system
- **Heuristic**: a class under a `common/`/`shared/`/`widgets/` folder whose `build` returns `TextFormField(`/`TextField(` and whose constructor has no `autofillHints` parameter. Also flag a password wrapper that re-implements its own border instead of composing the shared field
- **Fix**: add `final Iterable<String>? autofillHints;` and forward it; make the password wrapper compose the shared field
- **autofix_safe**: true (additive optional parameter)

---

## Adding new rules

1. Add a rule block here following the schema above.
2. Include a **`Platforms`** line (required): `all`, `mobile`, `web`, `android`, or `ios`.
   - `all` — rule applies regardless of target platform (never skipped).
   - `mobile` — expands to `{android, ios}`; skipped on web-only targets.
   - `web` — skipped on mobile-only targets.
3. Update `SKILL.md` rule count in the quick-reference table (optional).
4. No other files need changing — Phase 3 reads this catalog at runtime.
