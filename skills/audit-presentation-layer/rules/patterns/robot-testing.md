<!-- distilled from: skills/generate-widget-tests/SKILL.md (Phases 2, 3, 6, 10) -->
# Robot Testing Pattern — Audit Rules

Rules enforced by the `audit-presentation-layer` skill. Original full spec in
`skills/generate-widget-tests/SKILL.md`.

---

## Finder rules (ROBOT-01, ROBOT-02)

Finders in Robot classes must be Key-based. Never use locale-sensitive finders:

```dart
// ❌ VIOLATIONS — break with i18n
find.text('Login')
find.byTooltip('Submit')

// ✅ CORRECT
find.byKey(MyScreen.submitButtonKey)
```

All finders must be **private** (prefixed `_find`). Public finders are a violation.

---

## Key rules (ROBOT-04)

Every interactive or assertable widget element needs a Key:

- Buttons, text fields, dropdowns, checkboxes, switches, icons with `onTap`
- Loading indicators, error banners, empty states
- Navigation triggers

**On public widget classes** — `static const` Key fields:

```dart
class MyScreen extends ConsumerStatefulWidget {
  static const submitButtonKey = Key('myScreen_submitButton');
  static const loadingKey = Key('myScreen_loading');
}
```

**On private widget classes** — top-level constants (not `static const` — inaccessible from tests):

```dart
// ❌ WRONG — inaccessible from test file
class _MyDialog extends StatefulWidget {
  static const titleKey = Key('myDialog_title');
}

// ✅ CORRECT — top-level
const myDialogTitleKey = Key('myDialog_title');
const myDialogSaveButtonKey = Key('myDialog_saveButton');
```

Naming pattern: `Key('<widgetNameCamelCase>_<elementNameCamelCase>')`

---

## pumpAndSettle rule (ROBOT-03)

`pumpAndSettle()` throws `FlutterError('pumpAndSettle timed out')` when an infinite
animation is in the widget tree.

**Never** use `pumpAndSettle()` when the tree contains:
- `CircularProgressIndicator`
- `LinearProgressIndicator`
- A looping `AnimationController`

Use `pump()` instead for single-frame advancement.

```dart
// ❌ VIOLATION — hangs when CircularProgressIndicator is visible
await tester.pumpAndSettle();

// ✅ CORRECT
await tester.pump();
robot.expectLoadingIndicatorVisible();
```

---

## Dialog trigger rule (ROBOT-05)

Never use `WidgetsBinding.instance.addPostFrameCallback` inside a `Builder` to
open a dialog in tests — causes `!_debugLocked` assertion.

Use an `ElevatedButton` as trigger and `tester.tap()`.

---

## Viewport rule (ROBOT-06)

For tests that open dialogs with rich content (text editors, tall forms, multiple fields),
set a larger viewport and always reset it:

```dart
testWidgets('...', (tester) async {
  tester.view.physicalSize = const Size(800, 1600);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset); // REQUIRED — prevents leaking into other tests
});
```

---

## Acceptable `find.byType()` use

Only for generic framework indicators within a Key-scoped parent:
- `find.byType(SnackBar)`
- `find.byType(CircularProgressIndicator)`
- `find.descendant(of: keyFinder, matching: find.byType(T))`

Never as primary finder for business widgets.

---

## Do not

- `find.text(...)` — breaks with i18n
- `find.byTooltip(...)` — locale-dependent
- Public finders (not prefixed `_find`)
- `pumpAndSettle()` when infinite animation in tree
- `addPostFrameCallback` to open dialogs
- Mixing `verify()` and `verifyInOrder()` on the same mock in one test
- `DateTime.now()` — use `DateTime.utc(year, month, day)`
- `withOpacity()` — use `withValues(alpha: x)`
