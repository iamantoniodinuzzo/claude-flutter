# Router migration (opt-in)

Goal: stop bypassing the theme. Routes built with plain `builder:` get `MaterialPage` and therefore ask
`ThemeData.pageTransitionsTheme`.

## Rewrite rules

1. **Expression body**
   `pageBuilder: (context, state) => _page(const HomeScreen())` → `builder: (context, state) => const HomeScreen()`
2. **Block body**
   `pageBuilder: (c, s) { return _page(X); }` → `builder: (c, s) { return X; }`
3. **Inline** `pageBuilder: ... => NoTransitionPage(child: X)` → `builder: ... => X` (unless it is a kept one-off).
4. **Remove the helper** (`NoTransitionPage<void> _page(Widget child) => ...`) once no call sites remain.
5. **Drop `key:`/`name:`/`arguments:` extras** only if they are the default `state.pageKey` pass-through; if a custom
   value is present, stop and ask.

## Balanced-paren extraction

Do not use a regex alone. From the helper's `(` scan to its matching `)`, tracking nesting of `()`, `[]`, `{}` and
skipping string literals (single, double, triple-quoted, raw) and `//`, `/* */` comments. The extracted text is the
argument `X`. Handle nested and multi-line constructors.

**Orphan comma gotcha**: after unwrapping, `_page(\n  X,\n)` yields `X,` followed by a bare `,` line. Strip a trailing
comma left directly before the removed `)`.

## Keep untouched (list them in the summary)

- every `CustomTransitionPage`
- explicit `NoTransitionPage` for routes the user chose to keep instant on mobile

## After rewriting

- Run `dart format` on the router file and **warn the diff will include reformatting** of unrelated lines.
- `dart analyze` the router file; fix unused imports/helpers.
- Re-count `pageBuilder:` vs `builder:` and report before/after.
- Run router/redirect tests; navigation may now animate under the android test platform (`pump()` vs
  `pumpAndSettle`).

## Example

Before:
```dart
NoTransitionPage<void> _page(Widget child) => NoTransitionPage<void>(child: child);

GoRoute(
  path: '/settings',
  pageBuilder: (context, state) => _page(
    const SettingsScreen(),
  ),
),
```

After:
```dart
GoRoute(
  path: '/settings',
  builder: (context, state) => const SettingsScreen(),
),
```
