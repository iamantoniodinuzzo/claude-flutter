# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A collection of Claude Code agents, commands, scripts, and skills for Flutter/Dart projects using Riverpod v3, GoRouter, clean architecture, and Melos monorepo tooling. It is a **toolkit repo** — the actual Flutter app lives elsewhere (referenced as `apps/tomcat_portal/` or `apps/pollicino_viewer/`). All paths inside commands and skills are relative to the Flutter project root, not this repo.

## Structure

| Path | Purpose |
|---|---|
| `agents/` | Custom Claude Code subagent definitions (`.md` with frontmatter) |
| `commands/` | Slash commands — each is a procedure Claude follows when invoked |
| `scripts/` | Hook scripts run by the Claude Code harness (PostToolUse, PreToolUse, etc.) |
| `skills/` | Reusable skill definitions invoked via the `Skill` tool |

## Commands (slash commands)

Commands reference **source-of-truth files** in the target Flutter project's `ai_toolkit/` directory. When invoked, they load those files first. The commands themselves are thin dispatchers.

| Command | When to use |
|---|---|
| `seed-context-claude` | Start of any session — loads core breaking/pattern docs |
| `seed-new-feature-claude` | End-to-end feature (domain/data/application/presentation) |
| `seed-ui-context-claude` | UI-only / layout / widget work |
| `seed-fix-refactor-claude` | Bug fixes, refactors, performance |
| `git-commit-staged-claude` | Generate Conventional Commits message for staged changes |
| `update-logs-claude` | Update a feature's logging to project standards |

## Key skills

| Skill | Trigger |
|---|---|
| `build-filter` | After modifying `@riverpod`/`@JsonSerializable` — runs `dart run build_runner build --build-filter` on the affected path only |
| `flutter-analyze-targeted` | Fast `dart analyze` scoped to a feature path (not full project) |
| `unit-test-claude` | Generate/update/repair unit tests (mocktail, GWT, Riverpod ProviderContainer) |
| `generate-widget-tests` | Generate widget tests using Robot Testing pattern |
| `build-optimized-widget` | Create a new Flutter widget with Riverpod `.select()`, Consumer, side-effect patterns pre-applied |
| `flutter-go-router` | Navigation: routes, guards, shell navigation, URL-driven state |
| `flutter-melos-workspace` | Melos monorepo orchestration |
| `maestro-screenshot-flow` | Maestro YAML flows for automated screenshots on Android |

## Scripts (hooks)

| Script | Hook type | What it does |
|---|---|---|
| `dart-format-hook.sh` | PostToolUse (Edit/Write) | Auto-formats `.dart` files; skips `.g.dart` and `.freezed.dart` |
| `protect-sensitive-files.sh` | PreToolUse | Blocks edits to `.env*`, `google-services.json`, `GoogleService-Info.plist` |
| `validate-bash.sh` | PreToolUse | Blocks Bash commands matching forbidden patterns (build dirs, pubspec.lock, seed data) |
| `context-monitor.py` | StatusLine | Displays model, context %, git branch, cost, and duration in the terminal status line |

## Agents

| Agent | Purpose |
|---|---|
| `riverpod-reviewer` | Reviews Riverpod v3 provider code for correctness after changes; checks `ref.watch`/`ref.read` placement, `.select()` usage, v3 naming, `AsyncValue` handling |
| `prompt-engineer` | Designs, tests, and optimizes LLM prompts for production systems |

## Critical Riverpod v3 rules (for this toolkit)

The `riverpod-reviewer` agent enforces these — apply them when editing any provider code:

- `ref.watch()` inside `build()` only; `ref.read()` in callbacks/handlers only
- `class FooNotifier extends Notifier<T>` generates `fooProvider` (not `fooNotifierProvider`)
- Function providers use `Ref ref` — all `FooRef` subclasses removed in v3
- Any `ref.watch(provider)` that uses only one field must use `.select()`
- All `AsyncValue` must handle data/loading/error; avoid naked `.value!`

## `build-filter` vs full codegen

Never run `dart run build_runner build --delete-conflicting-outputs` on the whole project. Use `/build-filter <path>` instead: it deletes stale `.g.dart` for the target path, then runs `--build-filter` without touching the rest.

## `dart analyze` scoping

Always scope to the feature path:
```bash
dart analyze lib/src/features/FEATURE   # ~30s
# NOT: dart analyze                     # 5-15 min, often times out
```

On Windows, filter output by feature name (not path with `/`) because `dart analyze` outputs backslash paths.

## GoRouter web rules (from commands)

- `push()` does **not** update the browser URL in go_router v11.1.2+ — always use `go`/`goNamed` for deep-linkable screens.
- The default AppBar back button does not trigger GoRouter URL updates — override `leading` with an explicit `BackButton` that calls `context.goNamed(parentRoute)`.
- Multiple `Scaffold`s → consolidate into one outer Scaffold so the back button override lives in one place.

## Logging format standard (from `update-logs-claude`)

```
[feature][layer] operation – key1=value1, key2=value2
```

Levels: `t()` trace · `d()` debug · `i()` info · `w()` warning · `e()` error · `f()` fatal

`AsyncErrorLogger` handles errors from async providers automatically — never log errors inside async providers.

## Testing conventions

**Unit tests** (`unit-test-claude`):
- Mocktail exclusively (never mockito)
- `ProviderContainer.test(overrides: [...])` for Riverpod 3.x
- Mirror `lib/` under `test/src/` exactly
- Pre-stub non-nullable mock returns in `setUp()` before test-specific stubs
- Never mix `verify()` and `verifyInOrder()` on the same mock in one test

**Widget tests** (`generate-widget-tests`):
- Robot Testing pattern — finders always private, always Key-based (`find.byKey`)
- Never `find.text(...)` or `find.byTooltip(...)` (breaks with i18n)
- `pumpAndSettle()` forbidden when an infinite animation is in the tree
- Keys as `static const` on the widget class; top-level for private widget classes

## Git workflow

- `git start feature <number>_<name>` → creates `feature/<number>_<name>` from develop (single arg, all snake_case)
- `git publish` → pushes current branch to origin
- `git c` → interactive Conventional Commits script
- `git finish` → merges branch back
- GitHub does NOT auto-close issues on PR merge — always run `gh issue close <n>` manually after merging
- `gh pr merge` fails if uncommitted changes exist — `git stash` first, `git stash pop` after

## Tracking gotcha

Files can exist on disk but be untracked by git. Before closing an issue about file existence,
verify with `git ls-files <path>` — not just filesystem check.

## Python3 in bash scripts (Windows/Git Bash)

Git Bash POSIX paths (`/c/Users/...`) are not understood by Python on Windows.
In scripts: `cd "$REPO_ROOT"` first, then use relative paths. Pass file paths via `sys.argv`, not string interpolation.

## Conventional Commits scopes for this toolkit

When committing to this repo: `agents`, `commands`, `scripts`, `skills`, `hooks`, `gemini`, or the specific skill/command name.
