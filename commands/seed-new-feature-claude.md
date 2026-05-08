---
description: Seed context for implementing a new feature end-to-end (domain/data/application/presentation)
allowed-tools: Read, Glob, Grep
---

# Seed New Feature Context – Claude Code Edition

Use this command when implementing a **new feature end-to-end**
(`domain/` + `data/` + optional `application/` + `presentation/`).

Goal: load only the minimum docs needed for clean architecture + Riverpod + UI,
without reading unrelated guides.

## Source of Truth

The **single source of truth** for this command is:

- `ai_toolkit/commands/seed-new-feature.md`

## Your Task When This Command Runs

When invoked, you must:

1. **Open and read** `ai_toolkit/commands/seed-new-feature.md` in full.

2. **Read the breaking files (in parallel)**:

   ```
   - ai_toolkit/breaking/dart-language.md
   - ai_toolkit/breaking/dart-async-errors.md
   - ai_toolkit/breaking/flutter-widgets-perf.md
   - ai_toolkit/breaking/riverpod-core.md
   - ai_toolkit/breaking/riverpod-async-mutations.md
   ```

3. **Read the pattern files (in parallel)**:

   ```
   - ai_toolkit/patterns/feature-creation.md
   - ai_toolkit/patterns/repository-pattern.md
   - ai_toolkit/patterns/widget-classes-no-build-helpers.md
   - ai_toolkit/patterns/flutter-side-effects.md
   - ai_toolkit/patterns/go-router-navigation-conventions.md
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

4. **Read project-specific high-leverage docs (in parallel)**:

   ```
   - ai_docs/logging_patterns.md
   ```

5. **Add context-specific files only if relevant** (as listed in
   `seed-new-feature.md`), including:
   - `ai_toolkit/patterns/server-timestamp.md`
   - `ai_toolkit/patterns/parse-json-to-dart.md`
   - `ai_toolkit/patterns/text-field-validation.md`
   - `ai_toolkit/patterns/flutter-constraints-layout.md`
   - `ai_toolkit/breaking/riverpod-streams-lifecycle.md`
   - `ai_toolkit/breaking/riverpod-flutter.md`
   - `ai_toolkit/patterns/firebase-remote-config.md`
   - `ai_toolkit/patterns/no-ui-strings-outside-ui.md`
   - `ai_toolkit/patterns/async-notifier-command-api.md`
   - `ai_toolkit/patterns/deterministic-datetime.md`

## Behavior in Conversations

Whenever this command is active:

- **Internalize, don't echo**: apply the rules silently unless the user explicitly
  asks about them.
- **Do not drift**: if `seed-new-feature.md` changes, follow it without
  modifying this command.

---

**Command Purpose:**
Seed Claude Code with focused context for end-to-end feature implementation,
aligned with `ai_toolkit/commands/seed-new-feature.md`.
