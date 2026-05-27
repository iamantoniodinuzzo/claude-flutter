# Flutter Superpowers

[![Version](https://img.shields.io/badge/version-3.0.0-blue)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-compatible-blueviolet)](https://claude.ai/code)

Skills, agents, and commands that turn Claude Code into a disciplined **Senior Flutter Engineer** — enforcing Riverpod v3 and Clean Architecture.

---

## Installation

```bash
claude plugin marketplace add iamantoniodinuzzo/claude-flutter
```

Or add to `.claude/settings.json`:

```json
{ "plugins": ["https://github.com/iamantoniodinuzzo/claude-flutter"] }
```

---

## Skills

| Skill | Invoke | Description |
|---|---|---|
| `bootstrap-feature` | `/bootstrap-feature` or say "we're starting a new feature" | Full new-feature bootstrap: Socratic intake, clean-arch scaffold, context seed |
| `build-filter` | `/build-filter <path>` | Targeted `dart build_runner` — no full rebuild |
| `flutter-analyze-targeted` | `/flutter-analyze-targeted <path>` | Fast `dart analyze` scoped to a feature path |
| `unit-test` | ask "write tests for X" | Unit tests with mocktail + GWT + Riverpod 3.x |
| `generate-widget-tests` | ask "write widget tests for X" | Widget tests via Robot Testing pattern |
| `build-optimized-widget` | `/build-optimized-widget <desc>` | Widget with `.select()`, Consumer, side-effect patterns |
| `flutter-go-router` | ask about navigation | GoRouter routes, guards, shell nav, deep linking |
| `flutter-melos-workspace` | ask about Melos | Monorepo orchestration |
| `maestro-screenshot-flow` | ask "create maestro flow" | Maestro YAML for Android screenshots |
| `audit-presentation-layer` | say "audit presentation layer" | Rules-based static audit: Riverpod, Robot Testing, GoRouter, layout |
| `second-opinion` | ask for second opinion | Independent Flutter/Riverpod architecture review (requires Gemini CLI) |

---

## Agents

| Agent | Purpose |
|---|---|
| `riverpod-reviewer` | Reviews Riverpod v3 provider code after changes — checks `ref.watch`/`ref.read` placement, `.select()` usage, v3 naming |
| `prompt-engineer` | Designs, tests, and optimizes LLM prompts for production |

---

## Core methodology

1. **Socratic Brainstorming** — design questions before any code (via `bootstrap-feature`)
2. **Riverpod Excellence** — no logic in widgets, maximum testability

---

## Release

```bash
# Bump version manually in package.json and .claude-plugin/plugin.json
# then:
git tag v<version>
git push origin v<version>
```

See [ai_docs/ARCHITECTURE.md](ai_docs/ARCHITECTURE.md) for full technical reference.

---

## License

MIT — © [Antonio Di Nuzzo](mailto:iamantoniodinuzzo@gmail.com)
