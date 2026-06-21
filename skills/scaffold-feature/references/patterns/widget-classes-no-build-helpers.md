### Widget Classes, Not Build Helpers

This guide describes how to structure UI into **small, dumb widget classes** that
promote **composition**, follow **SRP** and **DRY**, and align with Flutter’s
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
  - Each widget is responsible for **one thing** (e.g. “movie poster tile”,
    “details header”, “rating row”), not “the entire page”.

- **DRY**
  - If you copy-paste a widget tree more than once, extract it into a widget
    class with parameters.

- **Parent owns layout**
  - The **parent decides size and constraints**.
  - Children are layout-agnostic: they don’t use `MediaQuery` for sizing,
    don’t hard-code widths for whole-screen behavior, and avoid “filling” logic
    unless explicitly required.

---

### 2. Why widget classes (and not build helpers)?

Flutter’s adaptive UI best practices emphasize **breaking down large widgets**
into smaller ones to keep:

- **Performance**: many small `const` widgets rebuild faster than one large,
  complex widget ([docs](https://docs.flutter.dev/ui/adaptive-responsive/best-practices#break-down-your-widgets)).
- **Code health**: small widgets are easier to read, test, and refactor.
- **Adaptivity**: you can reuse building blocks across layouts (mobile, tablet,
  desktop) by composing them differently.

Build helpers (`Widget _buildX(...)`) give you none of these:

- They can’t be made `const`.
- They can’t be reused outside the parent widget.
- They usually grow together with the parent, causing “god widgets”.

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

class _MovieStats extends StatelessWidget {
  const _MovieStats({required this.movie});
  final Movie movie;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // rating, year, duration, etc.
      ],
    );
  }
}

class _MovieActions extends StatelessWidget {
  const _MovieActions({required this.movie});
  final Movie movie;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // buttons, favorite icon, share, etc.
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

Following Flutter’s adaptive design best practices:

- Avoid widgets that “gobble up all horizontal space” on large screens
  ([docs](https://docs.flutter.dev/ui/adaptive-responsive/best-practices#dont-gobble-up-all-of-the-horizontal-space)).
- Let parents control:
  - `Expanded`, `Flexible`, `SizedBox`, `ConstrainedBox`, `LayoutBuilder`.
  - Breakpoints and responsive rules.

**Parent defines size:**

```dart
class MovieListSection extends StatelessWidget {
  const MovieListSection({super.key, required this.movies});
  final List<Movie> movies;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 600;
        final crossAxisCount = isWide ? 4 : 2;

        return GridView.builder(
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
          ),
          itemCount: movies.length,
          itemBuilder: (context, index) {
            return _MovieCard(movie: movies[index]); // child doesn't know size
          },
        );
      },
    );
  }
}
```

**Child is size-agnostic:**

```dart
class _MovieCard extends StatelessWidget {
  const _MovieCard({required this.movie});
  final Movie movie;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          // poster, title, etc. – no hard-coded screen widths
        ],
      ),
    );
  }
}
```

---

### 5. When can a widget be “smart”?

While most UI widgets should be dumb, some **feature-level widgets** can be
“smart” by:

- Watching Riverpod providers to get state.
- Exposing **callbacks** or smaller dumb widgets for rendering details.

However, even smart widgets should:

- Delegate complex layouts to dumb children.
- Keep logic at the **feature boundary**, not inside leaf widgets.

Example:

- `MovieDetailsScreen` (smart) watches providers and passes data down.
- `_MovieHeader`, `_MovieStats`, `_MovieActions` (dumb) render only.

---

### 6. Practical rules for this codebase

- **Do**
  - Extract repeated widget trees into private widget classes.
  - Keep widget classes small and focused (SRP).
  - Pass data + callbacks via constructors.
  - Let parents define sizing and layout constraints.
  - Use `const` constructors whenever possible.

- **Don’t**
  - Add new `_buildX()` helpers inside large `build()` methods.
  - Put business logic, navigation, or side effects into dumb widgets.
  - Make children responsible for screen-level layout decisions (breakpoints,
    orientation, full-width assumptions).

Applying these rules keeps the UI **adaptive**, **composable**, and easy to
maintain as the app grows across form factors.

---

### 7. Keys for testability

Every interactive or assertable UI element should have a `static const Key` so
widget tests can locate it without relying on text strings (which break with
i18n) or widget types (which are implementation-specific).

#### On public widget classes

Declare keys as `static const` fields in the class body, right after the
constructor. This co-locates the keys with the widget and makes them
discoverable via IDE autocomplete.

```dart
class MyScreen extends ConsumerStatefulWidget {
  const MyScreen({super.key});

  // Keys for widget testing
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
const myDialogCancelButtonKey = Key('myDialog_cancelButton');

class _MyDialog extends StatefulWidget { ... }
```

#### Naming convention

Pattern: `Key('<widgetNameCamelCase>_<elementNameCamelCase>')`

| Widget | Element | Key string |
|---|---|---|
| `MyScreen` | loading indicator | `'myScreen_loading'` |
| `MyScreen` | submit button | `'myScreen_submitButton'` |
| `_ItemDialog` | title field | `'itemDialog_titleField'` |
| `_ItemDialog` | save button | `'itemDialog_saveButton'` |

#### Which elements need a Key?

- All interactive elements: buttons, text fields, dropdowns, checkboxes.
- All state-driven elements: loading indicators, error banners, empty states.
- All navigation triggers: back buttons, tab bars.
- Elements used in assertions: any widget whose presence or property is
  verified in a test.
