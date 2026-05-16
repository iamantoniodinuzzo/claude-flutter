# Flutter Superpowers (Gemini)

Context file for Gemini CLI. Same toolkit as `CLAUDE.md` — see that file for full detail.
This file adds Gemini-specific tool name translations and platform notes.

## What this repo is

A toolkit of skills, agents, and commands for Flutter/Dart development.
Stack: Riverpod v3 · GoRouter · Clean Architecture · Melos monorepo · mocktail TDD.

This is a **toolkit repo** — the Flutter app lives elsewhere. All paths in commands
and skills are relative to the Flutter project root, not this repo.

## Repo structure

| Path | Purpose |
|---|---|
| `agents/` | Subagent definitions |
| `commands/` | Slash commands — procedures invoked by name |
| `hooks/` | Session-start scripts for context injection |
| `scripts/` | Hook scripts run by the AI harness |
| `skills/` | Reusable skill definitions |

## Commands (slash commands)

| Command | When to use |
|---|---|
| `seed-context-claude` | Start of any Flutter session |
| `seed-new-feature-claude` | New feature end-to-end |
| `seed-ui-context-claude` | UI / widget work only |
| `seed-fix-refactor-claude` | Bug fix or refactor |
| `git-commit-staged-claude` | Conventional commit message for staged changes |
| `update-logs-claude` | Update a feature's logging to project standards |

Note: seed commands load docs from `ai_toolkit/` in the Flutter project root — that
directory must exist in the target project.

## Key skills

| Skill | Trigger |
|---|---|
| `build-filter` | After `@riverpod`/`@JsonSerializable` changes — targeted codegen only |
| `flutter-analyze-targeted` | Fast lint scoped to a feature path |
| `unit-test-claude` | Generate / update / repair unit tests |
| `generate-widget-tests` | Widget tests via Robot Testing pattern |
| `build-optimized-widget` | New widget with Riverpod `.select()`, Consumer, side-effect patterns |
| `flutter-go-router` | Navigation: routes, guards, shell nav, deep linking |
| `flutter-melos-workspace` | Melos monorepo orchestration |
| `maestro-screenshot-flow` | Maestro YAML flows for screenshots on Android |
| `second-opinion` | Independent architecture / approach review |

## Agents

| Agent | Purpose |
|---|---|
| `riverpod-reviewer` | Reviews Riverpod v3 provider code after changes |
| `prompt-engineer` | Designs and optimizes LLM prompts |

## Tool Name Translation

When executing steps from skills or commands, use Gemini CLI tool names:

| Claude Code | Gemini CLI | Notes |
|---|---|---|
| `Bash` | `run_shell_command` | Shell execution |
| `Read` | `read_file` | Read a file |
| `Write` | `write_file` | Create / overwrite a file |
| `Edit` | `replace` | Patch a file (old→new string) |
| `Glob` | `list_directory` / `find_files` | File pattern search |
| `Grep` | `grep_search` | Regex content search |
| `Agent` (subagent) | `@generalist` | Spawn a subagent |
| `WebSearch` | `google_web_search` | Web search |
| `WebFetch` | `fetch_url` | Fetch a URL |

Skills with complex Claude-specific tool sequences have a `references/gemini-tools.md`
file inside the skill directory with step-by-step Gemini equivalents.

## Critical Riverpod v3 rules

- `ref.watch()` inside `build()` only — `ref.read()` in callbacks/handlers only
- `class FooNotifier extends Notifier<T>` generates `fooProvider` (not `fooNotifierProvider`)
- Function providers: `Ref ref` — all `FooRef` subclasses removed in v3
- One field consumed from a provider → use `.select()`
- `AsyncValue` → always handle data / loading / error; no naked `.value!`

## Codegen and analyze rules

```bash
# Codegen — scope to feature path only:
dart run build_runner build --build-filter="lib/src/features/FEATURE/**"

# Analyze — scope to feature path only:
dart analyze lib/src/features/FEATURE
```

Never run full project codegen or analyze.

## GoRouter web rules

- `push()` does not update browser URL in go_router v11.1.2+ — use `go`/`goNamed`
- Default AppBar back button doesn't trigger GoRouter URL updates — override `leading`
- Multiple `Scaffold`s → consolidate into one outer Scaffold

## Testing conventions

**Unit tests**: mocktail exclusively · `ProviderContainer.test(overrides:[])` for Riverpod 3.x ·
mirror `lib/` under `test/src/` · pre-stub non-nullable returns in `setUp()` ·
never mix `verify()` and `verifyInOrder()` on same mock.

**Widget tests**: Robot Testing pattern · always `find.byKey` · never `find.text` ·
`pumpAndSettle()` forbidden with infinite animations · keys as `static const` on widget class.

## Logging format

```
[feature][layer] operation – key1=value1, key2=value2
```

`AsyncErrorLogger` handles async provider errors — never log inside async providers.
