---
name: audit-presentation-layer
description: 'Audit a Flutter presentation-layer file or folder (screens, widgets, pages, related widget tests) against the project''s documented UI guidelines — Riverpod v3 widget rules, Robot Testing pattern, GoRouter conventions, layout antipatterns, side-effect handling, responsive layout, and web interaction affordances. Platform-aware: auto-detects target platforms from pubspec.yaml and gates rules accordingly; override with --platform=web|android|ios|mobile|all. Emits a violations table with file:line and rule ID, then offers to apply fixes. Use proactively when the user says "audit presentation layer", "audit this widget", "review this widget", "check UI guidelines", "find UI violations", "presentation audit", "lint widgets", or asks to verify a widget/screen against project rules before code review.'
user-invocable: true
---

# Audit Presentation Layer

Statically scans Flutter presentation-layer source and test files against
bundled rule docs. Emits a violations table, then offers targeted fixes.

## Rule source

Rules are bundled locally in `skills/audit-presentation-layer/rules/`.
This skill does **not** delegate to `ai_toolkit/` — it is self-contained.

---

## Phase 0 — Resolve input and platform

### Step 1 — Resolve path

Read the user's request and extract one of:

- **Single file**: a path ending in `.dart`
- **Feature folder**: a path containing a `presentation/` directory

If neither is clear, ask exactly one question:

> "Provide a widget file path or a feature folder path containing a `presentation/` directory."

Do not proceed until a path is confirmed.

### Step 2 — Resolve target platforms

1. Check the user's request for a `--platform=<value>` argument.
   - Accepted values: `web`, `android`, `ios`, `mobile`, `all`.
   - `mobile` expands to `{android, ios}`. `all` expands to `{web, android, ios}`.
2. If no `--platform` argument, read `pubspec.yaml` from the project root.
   Look for the `flutter: { platforms: { ... } }` map (present after
   `flutter create --platforms`). Extract the declared platform keys
   (`web`, `android`, `ios`, `linux`, `macos`, `windows`). Use only
   `web`, `android`, `ios` from this set.
3. If `pubspec.yaml` has no `platforms` map (or cannot be read), fall back to `all`.

**Precedence**: `--platform` arg > pubspec `flutter.platforms` > `all` (fallback).

State the resolved target at the start of Phase 4 output, e.g.:
- `Target platforms: android, ios (from pubspec)`
- `Target platforms: web (from --platform=web)`
- `Target platforms: all (fallback — no platforms map in pubspec)`

### Step 3 — Rule gating

Before applying any rule in Phase 3, check the rule's `Platforms:` tag in
`rules/CATALOG.md`. Skip the rule if its platform set does not intersect the
resolved target set. Rules tagged `all` always run.

---

## Phase 1 — Load rule catalog

Read `skills/audit-presentation-layer/rules/CATALOG.md` in full before scanning.

Do not read individual rule doc files yet — the catalog contains all heuristics
needed for Phase 3. Open a specific rule doc only if you need to clarify a
borderline case or produce a more detailed fix explanation.

---

## Phase 2 — Discover files

### Single-file mode

Target file = the provided `.dart` path.

Check whether a mirrored `*_test.dart` exists under `test/src/`:

```
lib/src/features/<feature>/presentation/<name>.dart
→ test/src/features/<feature>/presentation/<name>_test.dart
```

Include the test file in the scan if it exists.

If the provided file is NOT under `presentation/`, classify it as `domain-file`
(skip the test mirror check) and apply only UI-STR-01 to it.

### Folder mode

Spawn an Explore subagent:

```
Agent(
  subagent_type="Explore",
  prompt="List all .dart files (excluding .g.dart, .freezed.dart) recursively
  under <input_path>. For each file report:
  - Relative path
  - Whether it is a *_test.dart file
  - Line count (approximate)
  - Widget class name and superclass if visible in first 20 lines
  Report as a plain table."
)
```

Also check for the mirrored `test/src/` path of the given lib/ folder and
include all `*_test.dart` files found there.

Also collect non-`presentation/` dart files under the same feature root
(e.g. `application/`, `domain/`, `data/` siblings of `presentation/`).

Classify each file:
- `widget` — non-test dart file under `presentation/`
- `widget-test` — `*_test.dart` file mirroring a presentation widget
- `domain-file` — dart file outside `presentation/` in the same feature tree

---

## Phase 3 — Scan

For each file:

1. Read the full file contents.
2. Apply every heuristic in `rules/CATALOG.md` relevant to the file type **and**
   not gated out by the platform target (see Phase 0 Step 3):
   - `widget` files → apply: RIV-WIDGET-*, LAYOUT-*, SIDE-FX-01, ROBOT-04, ROUTER-*, RESPONSIVE-01, WEB-01
   - `widget-test` files → apply: ROBOT-01, ROBOT-02, ROBOT-03, ROBOT-05
   - `domain-file` files → apply: UI-STR-01 only
3. For each match: record `{file, line_number, rule_id, severity, message, fix_hint, autofix_safe}`.

Heuristic application notes:

- **RIV-WIDGET-01**: flag `ref.watch(` lines where the enclosing method is NOT named `build`. Look at method declarations above the line to determine context.
- **RIV-WIDGET-02**: flag `ref.watch(someProvider)` result where the return value is immediately accessed with `.fieldName` (within 3 lines) and no `.select(` appears on the watch call.
- **RIV-WIDGET-03**: flag `Consumer(` blocks where the `builder:` body exceeds 50 lines.
- **RIV-WIDGET-04**: flag `ref.read(` lines inside a `build(BuildContext` method span.
- **ROBOT-01**: flag any `find.text(` in `*_test.dart` files.
- **ROBOT-02**: flag any `find.byTooltip(` in `*_test.dart` files.
- **ROBOT-03**: flag all `pumpAndSettle(` lines in test files that also contain `CircularProgressIndicator` or `LinearProgressIndicator`.
- **ROBOT-04**: for each interactive widget found (see catalog for list), check if the same file declares a Key for it; flag if missing.
- **ROBOT-05**: flag public `find…()` methods in Robot classes (method name starts with `find` but no leading `_`).
- **ROUTER-01**: flag `context.push(` and `GoRouter.of(context).push(` in `presentation/` source files.
- **ROUTER-02**: flag `AppBar(` in `*_screen.dart` files where `leading:` is not present in the same `AppBar(…)` span.
- **LAYOUT-01**: flag any file with more than one `Scaffold(` occurrence.
- **LAYOUT-02**: flag `Widget _` methods inside widget class bodies.
- **SIDE-FX-01**: flag `showDialog(`, `Navigator.push(`, `ScaffoldMessenger.of(context).show`, `addPostFrameCallback(` inside `build(BuildContext` method spans.
- **UI-STR-01**: flag long string literals (> ~20 chars, > 3 words) in files outside `presentation/`.
- **RESPONSIVE-01**: flag `MediaQuery.of(context).size` or `MediaQuery.sizeOf(context)` used in an `if`/ternary branch for layout decisions; also flag `width:` / `height:` values ≥ 100 on `Container(`/`SizedBox(` constructor spans (proxy for hard-coded structural sizing, not small decorative values).
- **WEB-01** _(web target only)_: flag `GestureDetector(` or `InkWell(` blocks containing `onTap:` where no `MouseRegion`, `Focus`, or `FocusableActionDetector` appears as an ancestor within the same `build` method span (~20 lines above). Skip occurrences inside Flutter's built-in button/tile classes.

---

## Phase 4 — Report

Emit the violations grouped by file. Begin with the resolved platform line:

```
## Audit Results

**Target platforms**: android, ios (from pubspec)

### lib/.../sign_in_screen.dart
| Line | Rule ID | Severity | Message |
|------|---------|----------|---------|
| 42 | RIV-WIDGET-02 | warning | ref.watch(authProvider) accesses single field — add .select() |
| 88 | LAYOUT-02 | warning | Widget _buildForm() is a build helper — extract to widget class |

### test/.../sign_in_screen_test.dart
| Line | Rule ID | Severity | Message |
|------|---------|----------|---------|
| 55 | ROBOT-01 | error | find.text('Login') — breaks i18n; use find.byKey(SignInScreen.loginButtonKey) |
| 73 | ROBOT-03 | error | pumpAndSettle() used in file containing CircularProgressIndicator — use pump() |

---
**Summary**: 4 violations across 2 files (1 error, 2 warnings, 1 info)
```

If no violations are found, say so explicitly:

```
No violations found in <path>. All checked rules pass.
```

---

## Phase 5 — Fix prompt

After the report, ask:

```
Apply fixes for which rule IDs? (comma-separated list, "all", or "none")
Auto-fix safe: RIV-WIDGET-02, ROBOT-05
Requires judgment: RIV-WIDGET-01, RIV-WIDGET-04, ROBOT-01, ROBOT-02, ROBOT-03,
                   ROBOT-04, ROUTER-01, ROUTER-02, LAYOUT-01, LAYOUT-02,
                   SIDE-FX-01, UI-STR-01, RESPONSIVE-01, WEB-01
```

On response:

- **"none"** or no response: done.
- **"all"** or specific IDs:
  1. For each violation matching the selected IDs:
     - If `autofix_safe: true`: apply the edit directly, show diff.
     - If `autofix_safe: false`: show the specific change needed and ask the
       user to confirm before editing. Provide the exact code transformation.
  2. After all edits, re-run Phase 3 on touched files only.
  3. Confirm which violations were resolved.

Never edit files that were not explicitly approved by the user.

---

## Usage examples

- `audit the presentation layer of features/booking`
- `audit this widget: lib/src/features/auth/presentation/sign_in_screen.dart`
- `find UI violations in features/flight_plan/presentation/`
- `/audit-presentation-layer apps/pollicino_viewer/lib/src/features/booking/presentation/`
- `/audit-presentation-layer lib/src/features/home/presentation/ --platform=web`
- `/audit-presentation-layer lib/src/features/auth/presentation/ --platform=mobile`

---

## Notes

- Paths are relative to the project root — always resolve from there.
- This skill does not shell out to `dart analyze`; it reads files directly.
- It does not overlap with `riverpod-reviewer` (which audits provider declarations)
  or `flutter-analyze-targeted` (which runs the Dart analyzer).
- To add or modify rules, edit `skills/audit-presentation-layer/rules/CATALOG.md` only.
- **Platform gating**: rules tagged `platforms: all` always run. Rules tagged
  `mobile` are skipped on web-only targets; rules tagged `web` are skipped on
  mobile-only targets. When `pubspec.yaml` has no `flutter.platforms` map, the
  target defaults to `all` so no rule is ever silently skipped on legacy projects.
