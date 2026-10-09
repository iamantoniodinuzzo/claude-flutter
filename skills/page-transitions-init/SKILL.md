---
name: page-transitions-init
description: "Generate an adaptive `PageTransitionsTheme` for a Flutter app (native transitions on installed Android/iOS, instant on web/desktop) — writes the theme file with a `kIsWeb` gate and a zero-duration builder, wires `pageTransitionsTheme:` into every light and dark theme construction (`ThemeData`, `FlexThemeData`, `copyWith` builders), and optionally migrates a blanket `NoTransitionPage` router helper to plain `builder:` routes with balanced-paren rewriting, keeping `CustomTransitionPage` one-offs. INIT when no `pageTransitionsTheme:` exists, AUDIT when a theme and/or helper already exists (ROUTER-03). Use when the user says \"page transitions\", \"NoTransitionPage\", \"no animation on android\", \"no slide animation on mobile\", \"pageTransitionsTheme\", \"adaptive transitions\", \"transizioni pagine\", \"animazione di navigazione\", or after audit-presentation-layer reports ROUTER-03."
user-invocable: true
---

# page-transitions-init

## Runtime and resources

Use the current agent's native file, search, shell, and question tools; plain-text questions and direct sequential scans are valid fallbacks. Subagents are optional and require host permission. Bundled paths below are relative to this installed skill directory; application paths are relative to the target Flutter project. Resolve sibling skills through the installed skill registry (or sibling directories), never by assuming a `skills/` folder in the application. If a required dependency is absent, name it and report the affected step as unavailable; never invent its rules or claim complete coverage.

Generates the adaptive `PageTransitionsTheme`, wires it into the app theme(s) and, opt-in, removes the blanket
`NoTransitionPage` helper from the router. Fix companion of **ROUTER-03** (`audit-presentation-layer`). Run phases in
order.

Before coding, load the references in parallel:

- `references/platform-matrix.md`
- `references/router-migration.md`

Usage: `/page-transitions-init [app-path]`

---

## Phase 0 — Classify

1. **Melos**: if `melos.yaml` exists at the root, resolve the app per `flutter-melos-workspace` conventions. If
   `app-path` is missing and several apps exist, ask which one (one question). Paths below are relative to the app.
2. **Platforms**: read `flutter.platforms` in `pubspec.yaml` (fallback: platform folders present). If the target is
   **web only**, **abort**: transitions should be instant there, nothing to generate.
3. **INIT vs AUDIT**:
   - no `pageTransitionsTheme:` anywhere in `lib/` and no `NoTransitionPage` helper → **INIT**
   - a theme exists and/or a helper exists → **AUDIT**: report the mismatch (theme set but bypassed by the helper,
     light/dark mismatch, no strategy defined) instead of overwriting. **Never overwrite an existing
     `pageTransitionsTheme` without showing the diff and asking.**

---

## Phase 1 — Discover

1. **Router**: find `GoRouter(`; count routes built with `pageBuilder:` (split: helper / `NoTransitionPage` /
   `CustomTransitionPage` / `MaterialPage`) vs `builder:`. Include `StatefulShellRoute` branches.
2. **Themes**: find every `ThemeData(`, `ThemeData.light/dark(`, `FlexThemeData.light/dark(` and `.copyWith(` theme
   builder. Light and dark are often built in separate places (separate providers/files): **both** must get the theme.
   List each site with its file and line.
3. **Language level**: Dart SDK constraint `>= 3.10` → `.android:` dot-shorthands allowed; otherwise emit
   `TargetPlatform.android`.
4. **Conventions**: where theme constants live (`core/theme/domain/`, `theme/`, …), file naming, package vs relative
   imports, existing `kIsWeb` usage.

---

## Phase 2 — Decisions

One the agent's question tool, or a plain-text question round (recommendation first, max 1–2 blocking questions):

- **Platform matrix**: Android Zoom + iOS Cupertino, web/desktop instant *(recommended)* / Android Predictive Back
  (Android 14+) / fade-through / native on every platform.
- **Routes that must stay instant on mobile** (kiosk/cockpit-style full-screen): keep an explicit `NoTransitionPage`
  *(recommended when any exist)* / follow the theme.
- **Router migration now** (opt-in) or **theme only**. Skip the question when no helper exists.

---

## Phase 3 — Generate

1. **Theme file** `app_page_transition_theme.dart` (name/folder from discovered convention) from
   `platform-matrix.md`: const `PageTransitionsTheme`, private zero-duration builder, `kIsWeb` gate on android/iOS
   (**required**: mobile browsers report android/iOS).
2. **Wire into every discovered theme**: `pageTransitionsTheme: appPageTransitionsTheme` as a constructor argument;
   for `FlexThemeData` use its own `pageTransitionsTheme` parameter; otherwise `copyWith`. Add the import in each file.
3. **Router migration (opt-in)** per `router-migration.md`: remove the helper, rewrite `pageBuilder: ... => helper(X)`
   to `builder: ... => X` with balanced-paren rewriting (not regex-only), strip orphan trailing commas, run
   `dart format` on the router file and **warn that the diff will include reformatting**.
4. **Preserve** every `CustomTransitionPage` and deliberately kept `NoTransitionPage` untouched; list them.

---

## Phase 4 — Verify

- `dart analyze` on touched files (`flutter-analyze-targeted`); run router/redirect tests.
- Print a manual checklist: push animates on Android/iOS device or emulator; instant on Chrome; **dark theme behaves
  like light** (most common miss).
- Flag: widget tests use the default test platform (android), so navigation may now animate. `pumpAndSettle` is fine;
  tests with a single `pump()` after navigation may need adjusting.

---

## Phase 5 — Summary

List files created/modified, decisions, theme sites wired (light + dark), routes migrated, one-offs kept, and the
checklist. If the repo keeps a hand-curated CHANGELOG, remind the user to add an entry; do not edit it blindly.

---

## Pitfalls

1. `NoTransitionPage` never asks the theme: setting a theme alone changes nothing while the helper exists.
2. The `kIsWeb` gate is mandatory, not optional.
3. Dark theme built elsewhere is silently left without the theme.
4. Naive paren matching leaves orphan `,` lines for `helper(\n X,\n )`.
5. `dart format` reflows unrelated lines in the router file.
6. `StatefulShellRoute.indexedStack`: branch switches never animate; only pushes inside a branch do.
7. Predictive Back needs `android:enableOnBackInvokedCallback="true"` in the manifest to take effect.

---

## AUDIT branch

When a theme and/or helper already exists, do not edit. Report against **ROUTER-03**
(`../audit-presentation-layer/rules/CATALOG.md`): theme set but bypassed by the helper; no transition strategy
defined; theme present on fewer constructions than `ThemeData(`/`FlexThemeData.*(` calls. Show the diff of any
proposed change and edit only what the user approves.

---

## Notes

- Related skills: `audit-presentation-layer` (ROUTER-03), `flutter-go-router` (§ Page Transitions),
  `flutter-melos-workspace`, `flutter-analyze-targeted`.
