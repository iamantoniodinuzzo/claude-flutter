---
description: Seed for bug fixes, refactoring, and performance optimization
allowed-tools: Read, Glob, Grep
---

# Seed Fix & Refactor – Claude Code Edition

This command seeds Claude Code with **debugging, performance, and refactoring patterns** for fixing bugs and optimizing existing code.

## Source of Truth

The **single source of truth** for this command is:

- `ai_toolkit/commands/seed-fix-refactor.md`

## Your Task When This Command Runs

When invoked, you must:

1. **Open and read** `ai_toolkit/commands/seed-fix-refactor.md` in full.

2. **Read the breaking files (in parallel)**:

   ```
   - ai_toolkit/breaking/dart-language.md
   - ai_toolkit/breaking/dart-async-errors.md
   - ai_toolkit/breaking/dart-performance-organization.md
   - ai_toolkit/breaking/flutter-widgets-perf.md
   ```

3. **Read the pattern files (in parallel)**:

   ```
   - ai_toolkit/patterns/flutter-side-effects.md
   - ai_toolkit/patterns/widget-classes-no-build-helpers.md
   - ai_toolkit/patterns/no-ui-strings-outside-ui.md
   ```

4. **Read project-specific docs (if present in the repo)**:

   ```
   - ai_docs/logging_patterns.md
   ```

5. **Add context-specific files only if relevant** (as listed in
   `seed-fix-refactor.md`), including:
   - `ai_toolkit/breaking/riverpod-core.md`
   - `ai_toolkit/breaking/riverpod-async-mutations.md`
   - `ai_toolkit/breaking/flutter-layout-constraints.md`
   - `ai_toolkit/patterns/flutter-constraints-layout.md`
   - `ai_toolkit/patterns/text-field-validation.md`
   - `ai_toolkit/patterns/repository-pattern.md`
   - `ai_toolkit/breaking/flutter-accessibility-testing.md`
   - `ai_toolkit/patterns/async-notifier-command-api.md`
   - `ai_toolkit/patterns/deterministic-datetime.md`

## Behavior in Conversations

Whenever this command is active:

- **Internalize, don't echo**: Apply the rules silently unless the user explicitly asks about them.
- **Focus on real issues**: Don't add theoretical defenses—fix actual bugs and performance problems.
- **Preserve functionality**: Ensure refactored code maintains the same behavior.
 - **Do not drift**: if `seed-fix-refactor.md` changes, follow it without modifying
   this command.

---

**Command Purpose:**
Ensure Claude Code has the debugging and refactoring context needed to fix bugs, optimize performance, and improve code quality while following project standards.
