# Flutter Superpowers

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-compatible-blueviolet)](https://claude.ai/code)
[![Gemini CLI](https://img.shields.io/badge/Gemini%20CLI-compatible-blue)](https://github.com/google/gemini-cli)
[![OpenCode](https://img.shields.io/badge/OpenCode-compatible-teal)](https://opencode.ai)

Skills, agents, and commands that turn any AI (Claude, Gemini, Cursor) into a disciplined **Senior Flutter Engineer** — enforcing Riverpod v3, TDD, and Clean Architecture.

---

## Installation

### Claude Code

```bash
claude plugin marketplace add iamantoniodinuzzo/claude-flutter
```

Or add to `.claude/settings.json`:

```json
{ "plugins": ["https://github.com/iamantoniodinuzzo/claude-flutter"] }
```

### Gemini CLI

```bash
gemini extensions install https://github.com/iamantoniodinuzzo/claude-flutter
```

Context is loaded from [`GEMINI.md`](GEMINI.md) via `gemini-extension.json`.

### OpenCode

Add to your project config:

```json
{
  "plugins": ["flutter-claude-toolkit@git+https://github.com/iamantoniodinuzzo/claude-flutter.git"]
}
```

See [`AGENTS.md`](AGENTS.md) for tool-agnostic instructions.

---

## Skills

| Skill | Invoke | Description |
|---|---|---|
| `build-filter` | `/build-filter <path>` | Targeted `dart build_runner` — no full rebuild |
| `flutter-analyze-targeted` | `/flutter-analyze-targeted <path>` | Fast `dart analyze` scoped to a feature path |
| `unit-test-claude` | ask "write tests for X" | Unit tests with mocktail + GWT + Riverpod 3.x |
| `generate-widget-tests` | ask "write widget tests for X" | Widget tests via Robot Testing pattern |
| `build-optimized-widget` | `/build-optimized-widget <desc>` | Widget with `.select()`, Consumer, side-effect patterns |
| `flutter-go-router` | ask about navigation | GoRouter routes, guards, shell nav, deep linking |
| `flutter-melos-workspace` | ask about Melos | Monorepo orchestration |
| `maestro-screenshot-flow` | ask "create maestro flow" | Maestro YAML for Android screenshots |
| `second-opinion` | ask for second opinion | Independent Flutter/Riverpod architecture review |

---

## Commands

| Command | When to use |
|---|---|
| `/seed-context-claude` | Start of any Flutter session — loads core rules |
| `/seed-new-feature-claude` | New feature end-to-end (domain/data/application/presentation) |
| `/seed-ui-context-claude` | UI / widget work only |
| `/seed-fix-refactor-claude` | Bug fix, refactor, or performance optimization |
| `/git-commit-staged-claude` | Generate Conventional Commit message for staged changes |
| `/update-logs-claude <feature>` | Update a feature's logging to project standards |

---

## Agents

| Agent | Purpose |
|---|---|
| `riverpod-reviewer` | Reviews Riverpod v3 provider code after changes — checks `ref.watch`/`ref.read` placement, `.select()` usage, v3 naming |
| `prompt-engineer` | Designs, tests, and optimizes LLM prompts for production |

---

## Prerequisites

Seed commands (`/seed-*`) load documentation from an `ai_toolkit/` directory in your **Flutter project root** (not this repo). That directory must exist and contain your project's architecture and pattern docs.

This toolkit is a companion to your Flutter project's `ai_toolkit/` — install the plugin in the IDE/CLI, then run `/seed-context-claude` at the start of each session.

---

## Core methodology

1. **Socratic Brainstorming** — agent asks design questions before writing any code
2. **Atomic Planning** — every feature broken into 2-5 minute tasks
3. **TDD-First** — failing test before production code (Red → Green → Refactor)
4. **Riverpod Excellence** — no logic in widgets, maximum testability

---

## Release

```bash
./scripts/bump-version.sh --patch   # 1.0.0 → 1.0.1
./scripts/bump-version.sh --minor   # 1.0.0 → 1.1.0
git tag v<version>
```

See [`CLAUDE.md`](CLAUDE.md) for full technical reference.

---

## License

MIT — © [Antonio Di Nuzzo](mailto:iamantoniodinuzzo@gmail.com)
