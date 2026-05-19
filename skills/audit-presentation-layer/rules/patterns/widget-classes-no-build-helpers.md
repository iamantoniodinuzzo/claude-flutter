<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ bac1f742129af4c111381d9cdb576a3e90f1b412 -->
### Widget Classes, Not Build Helpers

This guide describes how to structure UI into **small, dumb widget classes** that
promote **composition**, follow **SRP** and **DRY**, and align with Flutter's
adaptive & responsive best practices ([docs](https://docs.flutter.dev/ui/adaptive-responsive/best-practices)).

---

### 1. Core principles

- **Composition over helpers**
  - Prefer **widget classes** (especially private ones) over `Widget _buildX(...)`
    helper methods inside a large parent widget.
  - A widget is a unit of composition; methods are not.

- **Dumb widgets**
  - UI-only: no business logic, no navigation decisions, no side-effects.
  - Receive everything via constructor (data + callbacks).
  - No internal state unless purely visual (e.g. animation, controllers).

- **Single Responsibility Principle (SRP)**
  - Each widget is responsible for **one thing** (e.g. "movie poster tile",
    "details header", "rating row"), not "the entire page".

- **DRY**
  - If you copy-paste a widget tree more than once, extract it into a widget
    class with parameters.

- **Parent owns layout**
  - The **parent decides size and constraints**.
  - Children are layout-agnostic: they don't use `MediaQuery` for sizing,
    don't hard-code widths for whole-screen behavior, and avoid "filling" logic
    unless explicitly required.

---

### 2. Why widget classes (and not build helpers)?

Flutter's adaptive UI best practices emphasize **breaking down large widgets**
into smaller ones to keep:

- **Performance**: many small `const` widgets rebuild faster than one large,
  complex widget ([docs](https://docs.flutter.dev/ui/adaptive-responsive/best-practices#break-down-your-widgets)).
- **Code health**: small widgets are easier to read, test, and refactor.
- **Adaptivity**: you can reuse building blocks across layouts (mobile, tablet,
  desktop) by composing them differently.

Build helpers (`Widget _buildX(...)`) give you none of these:

- They can't be made `const`.
- They can't be reused outside the parent widget.
- They usually grow together with the parent, causing "god widgets".

---

### 3. Extraction pattern: from build helpers to dumb widgets

**Anti-pattern – helper methods inside a huge `build`:**

```dart
class MovieDetailsScreen extends StatelessWidget {
  const MovieDetailsScreen({super.key, required this.movie});
  final Movie movie;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          _buildHeader(context),
          _buildStats(context),
          _buildActions(context),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) { ... }
  Widget _buildStats(BuildContext context) { ... }
  Widget _buildActions(BuildContext context) { ... }
}
```

**Preferred – private widget classes:**

```dart
class MovieDetailsScreen extends StatelessWidget {
  const MovieDetailsScreen({super.key, required this.movie});
  final Movie movie;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          _MovieHeader(movie: movie),
          _MovieStats(movie: movie),
          _MovieActions(movie: movie),
        ],
      ),
    );
  }
}

class _MovieHeader extends StatelessWidget {
  const _MovieHeader({required this.movie});
  final Movie movie;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // poster, title, etc.
      ],
    );
  }
}
```

Key points:

- Each class has **one responsibility**.
- All are **stateless and dumb**: they just render the given `movie`.
- `MovieDetailsScreen` now reads like a **high-level layout**.

---

### 4. Parent decides size, children stay adaptive

- Avoid widgets that "gobble up all horizontal space" on large screens.
- Let parents control: `Expanded`, `Flexible`, `SizedBox`, `ConstrainedBox`, `LayoutBuilder`.

---

### 5. When can a widget be "smart"?

Feature-level widgets can watch Riverpod providers, but:

- Delegate complex layouts to dumb children.
- Keep logic at the **feature boundary**, not inside leaf widgets.

---

### 6. Practical rules for this codebase

- **Do**
  - Extract repeated widget trees into private widget classes.
  - Keep widget classes small and focused (SRP).
  - Pass data + callbacks via constructors.
  - Let parents define sizing and layout constraints.
  - Use `const` constructors whenever possible.

- **Don't**
  - Add new `_buildX()` helpers inside large `build()` methods.
  - Put business logic, navigation, or side effects into dumb widgets.
  - Make children responsible for screen-level layout decisions.

---

### 7. Keys for testability

Every interactive or assertable UI element should have a `static const Key` so
widget tests can locate it without relying on text strings (which break with
i18n) or widget types (which are implementation-specific).

#### On public widget classes

Declare keys as `static const` fields in the class body, right after the
constructor.

```dart
class MyScreen extends ConsumerStatefulWidget {
  const MyScreen({super.key});

  static const loadingKey = Key('myScreen_loading');
  static const submitButtonKey = Key('myScreen_submitButton');
  static const errorBannerKey = Key('myScreen_errorBanner');

  @override
  ConsumerState<MyScreen> createState() => _MyScreenState();
}
```

#### On private widget classes — use top-level constants

`static const` fields on a private class (`_MyDialog`) are not accessible from
test files outside the same library. Declare keys as top-level constants in the
same source file instead.

```dart
// ❌ WRONG — inaccessible from test files
class _MyDialog extends StatefulWidget {
  static const titleKey = Key('myDialog_title');
}

// ✅ CORRECT — top-level; any file can import and use
const myDialogTitleKey = Key('myDialog_title');
const myDialogSaveButtonKey = Key('myDialog_saveButton');

class _MyDialog extends StatefulWidget { ... }
```

#### Naming convention

Pattern: `Key('<widgetNameCamelCase>_<elementNameCamelCase>')`

#### Which elements need a Key?

- All interactive elements: buttons, text fields, dropdowns, checkboxes.
- All state-driven elements: loading indicators, error banners, empty states.
- All navigation triggers: back buttons, tab bars.
- Elements used in assertions.
