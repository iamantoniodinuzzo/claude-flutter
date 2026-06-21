# claude-flutter

[![Version](https://img.shields.io/badge/version-3.2.0-blue)](package.json)
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

### Troubleshooting

**Plugin stuck on old version / install fails with SSH error**

Claude Code clones plugins via SSH by default. If SSH keys are not configured, installation fails silently or the cached version never updates. Fix:

```bash
# Force HTTPS for GitHub (run once, global)
git config --global url."https://github.com/".insteadOf "git@github.com:"

# Refresh marketplace index, then update
claude plugin marketplace update claude-flutter
claude plugin update flutter-toolkit@claude-flutter
```

Restart Claude Code after updating.

**How auto-update works**

This marketplace uses pinned-tag version resolution. When a new release is published:

1. A git tag (`vX.Y.Z`) is pushed to GitHub.
2. `marketplace.json` `source.ref` is updated to point to that tag.
3. `plugin.json` `version` field changes to `X.Y.Z`.

Claude Code detects the update **only when the resolved version string changes at the pinned ref** (both the tag and the ref must be in sync). If `source.ref` is stale, `marketplace update` is a no-op. The `scripts/bump-version.sh` script keeps all four locations in sync atomically.

To get the latest version:

```bash
claude plugin marketplace update claude-flutter
claude plugin update flutter-toolkit@claude-flutter
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
| `maestro-screenshot-flow` | "create maestro flow" | Maestro YAML for Android screenshots — id-based selectors (`Semantics(identifier:)`), immune to translation and UI refactors; edits app source to add missing identifiers |
| `audit-presentation-layer` | "audit presentation layer" | Rules-based static audit: Riverpod, Robot Testing, GoRouter, layout, responsive layout, web affordances — platform-aware (auto-detect / `--platform`) |
| `sentry-init` | `/flutter-toolkit:sentry-init` or "set up Sentry" | Bootstrap `sentry_flutter` — installs deps, patches `main.dart`, wires GoRouter observer, Riverpod capture (decorator or standalone), web BetterFeedback, release upload checklist |
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
bash scripts/bump-version.sh patch   # or minor / major — syncs all 4 locations
git start release v<version>
# edit CHANGELOG.md — add ## [<version>] section WITHOUT a date
git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json README.md CHANGELOG.md
git c   # chore(release): bump version to <version>
git finish -y   # merges master+develop, tags v<version>, pushes, deletes branch
```

---

## License

MIT — © [Antonio Di Nuzzo](mailto:iamantoniodinuzzo@gmail.com)
