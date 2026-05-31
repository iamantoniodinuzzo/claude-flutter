# claude-flutter

[![Version](https://img.shields.io/badge/version-3.0.1-blue)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-compatible-blueviolet)](https://claude.ai/code)

Skills, agents, and commands that turn Claude Code into a disciplined **Senior Flutter Engineer** — enforcing Riverpod v3 and Clean Architecture.

---

## Installation

### Via CLI (recommended)

```bash
claude plugin marketplace add iamantoniodinuzzo/claude-flutter
claude plugin install flutter-toolkit@claude-flutter
```

### Via `.claude/settings.json` (team/project scope)

```json
{
  "extraKnownMarketplaces": {
    "claude-flutter": {
      "source": {
        "source": "github",
        "repo": "iamantoniodinuzzo/claude-flutter"
      }
    }
  },
  "enabledPlugins": {
    "flutter-toolkit@claude-flutter": true
  }
}
```

---

## Skills

Skills are namespaced under `flutter-toolkit:`. Natural language triggers also work.

| Skill | Invoke | Description |
|---|---|---|
| `bootstrap-feature` | `/flutter-toolkit:bootstrap-feature` or "we're starting a new feature" | Full new-feature bootstrap: Socratic intake, clean-arch scaffold, context seed |
| `build-filter` | `/flutter-toolkit:build-filter <path>` | Targeted `dart build_runner` — no full rebuild |
| `flutter-analyze-targeted` | `/flutter-toolkit:flutter-analyze-targeted <path>` | Fast `dart analyze` scoped to a feature path |
| `unit-test` | "write tests for X" | Unit tests with mocktail + GWT + Riverpod v3 |
| `generate-widget-tests` | "write widget tests for X" | Widget tests via Robot Testing pattern |
| `build-optimized-widget` | `/flutter-toolkit:build-optimized-widget <desc>` | Widget with `.select()`, Consumer, side-effect patterns |
| `flutter-go-router` | "how do I navigate to X" | GoRouter routes, guards, shell nav, deep linking |
| `flutter-melos-workspace` | "set up Melos" | Monorepo orchestration |
| `maestro-screenshot-flow` | "create maestro flow" | Maestro YAML for Android screenshots |
| `audit-presentation-layer` | "audit presentation layer" | Rules-based static audit: Riverpod, Robot Testing, GoRouter, layout |
| `second-opinion` | "give me a second opinion" | Independent Flutter/Riverpod architecture review (requires Gemini CLI) |

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

See [ai_docs/CONTRIBUTING.md](ai_docs/CONTRIBUTING.md) for the full version bump procedure.

```bash
npm version patch --no-git-tag-version   # or minor / major
# copy new version into .claude-plugin/plugin.json
git start release v<version>
git add package.json .claude-plugin/plugin.json CHANGELOG.md
git c
git finish -y   # merges master+develop, tags v<version>, pushes, deletes branch
```

---

## License

MIT — © [Antonio Di Nuzzo](mailto:iamantoniodinuzzo@gmail.com)
