---
description: Seed context for UI-only work (layout, widgets, styling)
allowed-tools: Read, Glob, Grep
---

# Seed UI Context – Claude Code Edition

Use this command when your session is **UI-only / layout / widgets**.

Goal: load only the minimum foundations required to build high-quality Flutter UI
without pulling repository/domain/testing docs.

## Source of Truth

The **single source of truth** for this command is:

- `ai_toolkit/commands/seed-ui-context.md`

## Your Task When This Command Runs

When invoked, you must:

1. **Open and read** `ai_toolkit/commands/seed-ui-context.md` in full.

2. **Read the breaking files (in parallel)**:

   ```
   - ai_toolkit/breaking/dart-language.md
   - ai_toolkit/breaking/flutter-widgets-perf.md
   - ai_toolkit/breaking/flutter-layout-constraints.md
   - ai_toolkit/breaking/flutter-accessibility-testing.md
   ```

   If the UI work includes async flows (loading/error propagation), also read:
   - `ai_toolkit/breaking/dart-async-errors.md`

3. **Read the pattern files (in parallel)**:

   ```
   - ai_toolkit/patterns/widget-classes-no-build-helpers.md
   - ai_toolkit/patterns/flutter-side-effects.md
   - ai_toolkit/patterns/flutter-constraints-layout.md
   - ai_toolkit/patterns/replace-container-nested-widgets.md
   - ai_toolkit/patterns/go-router-navigation-conventions.md
   - ai_toolkit/patterns/no-ui-strings-outside-ui.md
   - ai_toolkit/patterns/firestore-write-throttle-ui.md
   ```

   > **GoRouter web note**: sections 4–6 of `go-router-navigation-conventions.md`
   > are critical for this app. Key rules:
   > - `push` does **not** update the browser URL in go_router v11.1.2+ — always
   >   use `go`/`goNamed` for deep-linkable screens.
   > - The AppBar default back button does not trigger GoRouter's URL update;
   >   always override `leading` with an explicit `BackButton` that calls
   >   `context.goNamed(parentRoute)` when the screen has query parameters or
   >   path segments that must disappear on back navigation.
   > - Consolidate multiple Scaffolds into one outer Scaffold so the back button
   >   override lives in a single place.

4. **Add Riverpod docs only if the UI uses providers** (as listed in
   `seed-ui-context.md`):
   - `ai_toolkit/breaking/riverpod-core.md`
   - `ai_toolkit/breaking/riverpod-async-mutations.md`
   - `ai_toolkit/breaking/riverpod-flutter.md`

## Behavior in Conversations

Whenever this command is active:

- **Internalize, don't echo**: apply the rules silently unless the user explicitly
  asks about them.
- **Do not drift**: if `seed-ui-context.md` changes, follow it without modifying
  this command.

---

**Command Purpose:**
Seed Claude Code with focused UI/layout context aligned with
`ai_toolkit/commands/seed-ui-context.md`.
