# claude-flutter

[![Version](https://img.shields.io/badge/version-3.9.0-blue)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-compatible-blueviolet)](https://claude.ai/code)
[![skills.sh](https://img.shields.io/badge/skills.sh-npx%20skills%20add-black)](https://www.skills.sh)

Skills, agents, and commands that turn any coding agent into a disciplined **Senior Flutter Engineer** — enforcing Riverpod v3 and Clean Architecture. Built for Claude Code; installable on 70+ agents (Cursor, Codex, Windsurf, Cline, etc.) via [skills.sh](https://www.skills.sh).

---

## Installation

### Any agent, via `npx` (broadest reach)

`skills/` matches the [skills.sh](https://www.skills.sh) flat catalog layout (`skills/<name>/SKILL.md`) — no extra setup needed:

```bash
npx skills add iamantoniodinuzzo/claude-flutter
npx skills update claude-flutter
```

> Tracks `master` HEAD — bleeding edge, no version pinning.

### Claude Code, via plugin marketplace (stable, pinned)

```bash
claude plugin marketplace add iamantoniodinuzzo/claude-flutter
claude plugin install flutter-toolkit@claude-flutter
```

Or via `.claude/settings.json` (team/project scope):

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

> Pins tagged releases — use this in Claude Code for reproducible versions instead of tracking `master` HEAD.

Install issues (stuck versions, SSH errors, how auto-update resolves)? See [ai_docs/TROUBLESHOOTING.md](ai_docs/TROUBLESHOOTING.md).

---

## Skills

Skills are namespaced under `flutter-toolkit:`. Natural language triggers also work.

| Skill | Invoke | Description |
|---|---|---|
| `scaffold-feature` | `/flutter-toolkit:scaffold-feature` or "we're starting a new feature" | Scaffold a new feature: Socratic intake, clean-arch directory scaffold, architecture contract, context seed |
| `flutter-analyze-targeted` | `/flutter-toolkit:flutter-analyze-targeted <path>` | Fast `dart analyze` scoped to a feature path |
| `unit-test` | "write tests for X" | Unit tests with mocktail + GWT + Riverpod v3 |
| `generate-widget-tests` | "write widget tests for X" | Widget tests via Robot Testing pattern |
| `flutter-go-router` | "how do I navigate to X" | GoRouter routes, guards, shell nav, deep linking |
| `flutter-melos-workspace` | "set up Melos" | Monorepo orchestration |
| `maestro-screenshot-flow` | "create maestro flow" | Maestro YAML for Android screenshots — id-based selectors (`Semantics(identifier:)`), immune to translation and UI refactors; edits app source to add missing identifiers |
| `audit-presentation-layer` | "audit presentation layer" | Rules-based static audit: Riverpod, Robot Testing, GoRouter, layout, responsive layout, web affordances — platform-aware (auto-detect / `--platform`) |
| `audit-domain-layer` | "audit domain layer" | Rules-based static audit: infra imports in domain, untyped/non-sealed exceptions, entity serialization, hardcoded UI strings |
| `audit-data-layer` | "audit data layer" | Rules-based static audit: leaky abstractions (raw framework types), missing exception conversion, model mapper gaps, untyped datasource exceptions |
| `audit-application-layer` | "audit application layer" | Rules-based static audit: Flutter framework imports, redundant manual try/catch in notifiers, mutation return types, unconstrained state types |
| `audit-feature` | "audit this feature" or "full feature audit" | Orchestrates all four per-layer audits in parallel; aggregates into one report; falls back to presentation-only for sub-features |
| `sentry-init` | `/flutter-toolkit:sentry-init` or "set up Sentry" | Bootstrap `sentry_flutter` — installs deps, patches `main.dart`, wires GoRouter observer, Riverpod error capture (LoggerService decorator or a scaffolded ErrorLogger sink), beforeSend/sampling policy, web BetterFeedback, release upload checklist |
| `flutter-flavors` | `/flutter-toolkit:flutter-flavors` or "add flavors to this app" | Init dev/stg/prod flavors (flutter_flavorizr or manual) across Android/iOS/Web + IDE config, or audit and fix an existing broken/partial setup; optional multi-project Firebase |
| `force-update-init` | `/flutter-toolkit:force-update-init` or "add force update" | Bootstrap `force_update_helper` — installs deps, patches AndroidManifest.xml, wires `ForceUpdateWidget`, sets up a remote `required_version` source (Gist, Firebase Remote Config, or a scaffolded Dart Shelf backend), handles non-store distribution, or audits an existing setup for the two silent failure modes (missing `APP_STORE_ID`, missing Android `<queries>` intent) |
| `second-opinion` | "give me a second opinion" | Independent Flutter/Riverpod architecture review (requires Gemini CLI) |
| `retro` | `/retro` or "retrospettiva" / "self-audit" | End-of-task self-audit: extracts verifiable evidence (tool errors, repeated commands) from the session transcript, answers 6 hard questions backed by it, auto-persists learnings to memory with dedup, flags unintegrated git work, proposes fixes — generic, not Flutter-specific |
| `tune-setup` | `/tune-setup` or "ottimizza il setup" / "audit config" | On-demand config & workflow audit — CLAUDE.md, settings.json(+.local), hooks, agents/, skill-trigger-miss — cross-referenced against transcript evidence (repeated hook injections, denials); proposes concrete config fixes. Never automatic — generic, not Flutter-specific |

---

## Agents

| Agent | Purpose |
|---|---|
| `riverpod-reviewer` | Reviews Riverpod v3 provider code after changes — checks `ref.watch`/`ref.read` placement, `.select()` usage, v3 naming |
| `prompt-engineer` | Designs, tests, and optimizes LLM prompts for production |

---

## Core methodology

1. **Socratic Brainstorming** — design questions before any code (via `scaffold-feature`)
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
