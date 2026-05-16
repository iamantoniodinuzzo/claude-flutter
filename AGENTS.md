# Flutter Superpowers — Agent Instructions

Generic instructions for AI agents (OpenAI Codex, OpenCode, Cursor, and others).
Platform-specific details: see `CLAUDE.md` (Claude Code) or `GEMINI.md` (Gemini CLI).

## What this repo is

A toolkit of skills, agents, and commands for Flutter/Dart development.
Stack: Riverpod v3 · GoRouter · Clean Architecture · Melos monorepo · mocktail TDD.

This is a **toolkit repo** — the Flutter app lives elsewhere. All paths in commands
and skills are relative to the Flutter project root, not this repo.

## Repo structure

| Path | Purpose |
|---|---|
| `agents/` | Subagent definitions (specialist reviewers) |
| `commands/` | Slash commands — procedures invoked by name |
| `hooks/` | Session-start scripts for context injection |
| `scripts/` | Hook scripts run by the AI harness |
| `skills/` | Reusable skill definitions |

## Available skills

| Skill | When to invoke |
|---|---|
| `build-filter` | After modifying `@riverpod` / `@JsonSerializable` — targeted codegen only |
| `flutter-analyze-targeted` | Fast lint scoped to a feature path (not full project) |
| `unit-test-claude` | Generate / update / repair unit tests (mocktail, GWT, Riverpod 3.x) |
| `generate-widget-tests` | Widget tests using Robot Testing pattern |
| `build-optimized-widget` | New Flutter widget with Riverpod `.select()`, Consumer, side-effect patterns |
| `flutter-go-router` | Navigation: routes, guards, shell nav, deep linking |
| `flutter-melos-workspace` | Melos monorepo orchestration |
| `maestro-screenshot-flow` | Maestro YAML flows for automated screenshots on Android |
| `second-opinion` | Independent architecture / approach review |

## Available commands

| Command | When to use |
|---|---|
| `seed-context-claude` | Start of any Flutter session |
| `seed-new-feature-claude` | New feature end-to-end |
| `seed-ui-context-claude` | UI / widget work only |
| `seed-fix-refactor-claude` | Bug fix or refactor |
| `git-commit-staged-claude` | Conventional commit message for staged changes |
| `update-logs-claude` | Update a feature's logging to project standards |

## Available agents

| Agent | Purpose |
|---|---|
| `riverpod-reviewer` | Reviews Riverpod v3 provider code after changes |
| `prompt-engineer` | Designs and optimizes LLM prompts |

## Tool name translation

When executing commands from skills or instructions, map tool names to your platform:

| Concept | Claude Code | Gemini CLI | Generic |
|---|---|---|---|
| Run shell command | `Bash` | `run_shell_command` | execute shell |
| Read file | `Read` | `read_file` | read file |
| Write file | `Write` | `write_file` | write file |
| Edit file | `Edit` | `replace` | patch file |
| Find files | `Glob` | `list_directory` / `find_files` | glob |
| Search content | `Grep` | `grep_search` | regex search |
| Spawn subagent | `Agent` | `@generalist` | spawn agent |
| Web search | `WebSearch` | `google_web_search` | web search |
| Fetch URL | `WebFetch` | `fetch_url` | http get |

## Critical Riverpod v3 rules

Apply before writing any provider or notifier:

- `ref.watch()` inside `build()` only — `ref.read()` in callbacks/handlers only
- `class FooNotifier extends Notifier<T>` generates `fooProvider` (not `fooNotifierProvider`)
- Function providers: `Ref ref` — all `FooRef` subclasses removed in v3
- One field consumed from a provider → use `.select()`
- `AsyncValue` → always handle data / loading / error; no naked `.value!`

## Codegen and analyze rules

Never run full project codegen or analyze:

```bash
# Codegen — scope to feature path only:
dart run build_runner build --build-filter="lib/src/features/FEATURE/**"

# Analyze — scope to feature path only:
dart analyze lib/src/features/FEATURE   # ~30s vs 15 min full
```

## Recommended session workflow

1. Load context → `seed-context-claude` (or `seed-new-feature-claude` for new features)
2. Write failing test first (TDD Red)
3. Implement minimal code (TDD Green)
4. Run targeted codegen if `@riverpod`/`@JsonSerializable` changed → `build-filter`
5. Run targeted analyze → `flutter-analyze-targeted`
6. Refactor → `riverpod-reviewer` agent for provider code
7. Commit → `git-commit-staged-claude`

## Prerequisites

Commands like `seed-new-feature-claude` load docs from `ai_toolkit/` in the Flutter
project root. This toolkit is a companion to that directory — it must exist in the
target project for seed commands to work.
