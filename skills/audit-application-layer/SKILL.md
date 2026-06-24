---
name: audit-application-layer
description: Audit a Flutter application-layer file or folder against the project's documented Riverpod v3 notifier rules and async-mutation patterns — Flutter framework imports in application code, redundant manual try/catch in notifiers, mutation methods returning values instead of Future<void>, and unconstrained provider state types. Emits a violations table with file:line and rule ID, then offers to apply fixes. Use proactively when the user says "audit application layer", "audit notifier", "review application layer", "check notifier rules", "find application violations", "audit this notifier", or asks to verify application-layer code against project architecture rules before code review.
user-invocable: true
---

# Audit Application Layer

Statically scans Flutter application-layer source files against bundled Riverpod v3
notifier rules and async-mutation patterns. Emits a violations table, then offers
targeted fixes.

## Rule source

Rules are bundled locally in `skills/audit-application-layer/rules/`.
This skill does **not** delegate to `ai_toolkit/` — it is self-contained.

---

## Phase 0 — Resolve input

Read the user's request and extract one of:

- **Single file**: a path ending in `.dart`
- **Feature folder**: a path that contains an `application/` directory

If neither is clear, ask exactly one question:

> "Provide a `.dart` file path under `application/`, or a feature folder path containing an `application/` directory."

Do not proceed until a path is confirmed.

---

## Phase 1 — Load rule catalog

Read `skills/audit-application-layer/rules/CATALOG.md` in full before scanning.

Do not read individual rule doc files yet — the catalog contains all heuristics
needed for Phase 3. Open a specific rule doc only if you need to clarify a
borderline case or produce a more detailed fix explanation.

---

## Phase 2 — Discover files

### Single-file mode

Target file = the provided `.dart` path.

Classify it as `application-file`.

If the provided file is NOT under `application/`, classify as `non-application` and apply
only `APP-DEP-01` (framework import check) if it is not under `presentation/` either.

### Folder mode

Spawn an Explore subagent:

```
Agent(
  subagent_type="Explore",
  prompt="List all .dart files (excluding .g.dart, .freezed.dart) recursively
  under <input_path>/application/ (or under <input_path> if it is already an application/ dir).
  For each file report:
  - Relative path
  - Whether it appears to be a notifier (class name ends in Notifier or contains AsyncNotifier/Notifier)
  - Line count (approximate)
  Report as a plain table."
)
```

Classify each file as `application-file`.

---

## Phase 3 — Scan

For each `application-file`:

1. Read the full file contents.
2. Apply every heuristic in `rules/CATALOG.md`.
3. For each match: record `{file, line_number, rule_id, severity, message, fix_hint, autofix_safe}`.

Heuristic application notes:

- **APP-DEP-01**: flag any `import 'package:flutter/widgets.dart'` or
  `import 'package:flutter/material.dart'` or `import 'package:flutter/cupertino.dart'`
  in files under `application/`. Riverpod imports (`package:riverpod_annotation`,
  `package:riverpod`, `package:flutter_riverpod`) are allowed and must NOT be flagged.
- **APP-NOTIF-02**: flag `try {` blocks inside a class that extends or mixes in
  `AsyncNotifier`, `Notifier`, `StreamNotifier`, `AutoDisposeAsyncNotifier`,
  `AutoDisposeNotifier`, or any class whose name ends in `Notifier`. The key signal is
  manual `try/catch` around `await` expressions for error *reporting* — the
  `AsyncErrorLogger` and Riverpod's single-error-channel via state assignment already
  handle this. Do NOT flag `try/catch` that converts an infra exception to a domain
  exception (which is data-layer work and valid if present for a specific reason).
- **APP-NOTIF-01**: flag public async methods (not `build`) inside notifier classes that
  declare a return type other than `Future<void>` or `void`. Specifically flag
  `Future<T> methodName(` where `T` is not `void`. Mutation methods must surface errors
  via state (single error channel) and return `Future<void>`.
- **APP-STATE-01**: flag provider annotations (`@riverpod`) where the inferred or declared
  state type is `dynamic`, `Object?` (as a state type, not a param), or `Map` without type
  parameters. Specifically look for `AsyncValue<dynamic>`, `AsyncValue<Map>`,
  `StateProvider<dynamic>`, `StateProvider<Map>`, or class-level `state = ` assignments
  where the assigned value is typed `dynamic`.

---

## Phase 4 — Report

Emit the violations grouped by file:

```
## Audit Results — Application Layer

### lib/.../auth/application/auth_notifier.dart
| Line | Rule ID | Severity | Message |
|------|---------|----------|---------|
| 8  | APP-DEP-01    | error   | import 'package:flutter/material.dart' — application layer must stay framework-free (Riverpod core is OK) |
| 34 | APP-NOTIF-02  | error   | Manual try/catch in AsyncNotifier.signIn() — error is already handled via state; remove try/catch or convert to domain exception in the data layer |
| 52 | APP-NOTIF-01  | warning | Future<AppUser?> signIn() returns a value — mutation should return Future<void> and surface result via state |
| 71 | APP-STATE-01  | warning | StateProvider<dynamic> — constrain state type to a specific model or AsyncValue<T> |

---
**Summary**: 4 violations across 1 file (2 errors, 2 warnings, 0 info)
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
Auto-fix safe: (none)
Requires judgment: APP-DEP-01, APP-NOTIF-02, APP-NOTIF-01, APP-STATE-01
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

- `audit the application layer of features/auth`
- `audit this notifier: lib/src/features/auth/application/auth_notifier.dart`
- `find application violations in features/booking/application/`
- `/audit-application-layer lib/src/features/auth/application/`
- `/audit-application-layer lib/src/features/booking/`

---

## Notes

- Paths are relative to the project root — always resolve from there.
- This skill does not shell out to `dart analyze`; it reads files directly.
- It does not overlap with `riverpod-reviewer` (which audits `ref.watch`/`ref.read`
  placement in widgets) or `audit-domain-layer` / `audit-data-layer`.
- The single-error-channel pattern is documented in
  `skills/audit-application-layer/rules/patterns/async-notifier-command-api.md`.
- To add or modify rules, edit `skills/audit-application-layer/rules/CATALOG.md` only.
