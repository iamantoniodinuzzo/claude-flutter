---
description: Seed the AI agent with core Flutter/Dart/Riverpod and project rules
allowed-tools: Read, Glob, Grep
---

# Seed Context – Claude Code Edition

This command seeds Claude Code with the **foundational knowledge, constraints, and patterns** for this Flutter project **before any other work** in a conversation.

## Source of Truth

The **single source of truth** for this command is:

- `ai_toolkit/commands/seed-context.md`

That file:

- Explains which **breaking** documents to read (Dart, Flutter, Riverpod)
- Points to **pattern** documents for specific tasks (widgets, repositories, forms, errors, etc.)
- Defines the **critical rules** that apply to every feature in this repo

## Your Task When This Command Runs

When invoked, you must:

1. **Open and read** `ai_toolkit/commands/seed-context.md` in full.

2. **Follow its instructions literally**:
   - Treat the listed **breaking** docs as mandatory foundations.
   - Use the **Quick Reference by Task** section to decide which pattern docs are relevant for the current user request.
   - Apply the **Critical Rules (Always Follow)** section as hard constraints on any code you write.

3. **Read the breaking files immediately in parallel**:

   ```
   - ai_toolkit/breaking/dart.md
   - ai_toolkit/breaking/flutter.md
   - ai_toolkit/breaking/riverpod.md
   - ai_toolkit/breaking/riverpod-flutter.md
   ```

   These files contain **essential knowledge** that applies to every feature and every file you write.

4. **Identify the current task** from the user's request and consult the appropriate pattern files:
   - For UI work: Read widget patterns, side effects, layout constraints
   - For data layer: Read repository pattern, exceptions, JSON parsing
   - For forms: Read validation patterns
   - For state management: Read Riverpod-specific patterns

5. **Do not duplicate or drift** from those files:
   - If `seed-context.md` is updated later, you must automatically respect the new rules without changing this command.
   - Prefer referencing rule files by name in your reasoning instead of restating their full content.

## Behavior in Conversations

Whenever this command is active:

- **Internalize, don't echo**:
  - Use `seed-context.md` and the referenced breaking/pattern files to shape your reasoning, architecture choices, and code style.
  - Do **not** spam the user with long excerpts or restatements; apply the rules silently unless the user explicitly asks about them.

- **Enforce project standards**:
  - Follow the clean architecture (feature-first, domain/data/application/presentation).
  - Respect naming, layout, Riverpod usage, error handling, and testing guidance from `seed-context.md` and its referenced docs.
  - Prefer **happy-path-first** implementation, then add guards for real failures, as described in the project philosophy (see CLAUDE.md).

## Output Expectations

When this command is used, your primary responsibility is to:

- Have the **project rules loaded into context**.
- Write code and explanations that:
  - Match **Dart/Flutter/Riverpod best practices** from this project.
  - Respect **file structure, naming, and architectural boundaries** described in `seed-context.md`.
  - Avoid introducing patterns explicitly listed as anti-patterns in the referenced docs.

You do **not** need to summarize `seed-context.md` every time; you just need to **honor it as the governing contract** for all your work in this repository.

---

**Command Purpose:**
Ensure Claude Code has full context of this project's Flutter architecture, coding standards, and best practices before performing any development tasks. This prevents common mistakes and ensures consistency with established patterns.
