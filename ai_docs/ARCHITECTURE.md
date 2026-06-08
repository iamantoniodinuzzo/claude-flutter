# Architecture

## What this repo is

A collection of Claude Code agents and skills for Flutter/Dart projects using Riverpod v3, GoRouter, clean architecture, and Melos monorepo tooling.

This is a **toolkit repo** — the actual Flutter app lives elsewhere (e.g. `apps/tomcat_portal/`, `apps/pollicino_viewer/`). All paths inside skills are relative to the Flutter project root, not this repo.

## Repo structure

| Path | Purpose |
|---|---|
| `agents/` | Custom Claude Code subagent definitions (`.md` with frontmatter) |
| `skills/` | Reusable skill definitions invoked via the `Skill` tool |
| `.claude-plugin/` | Claude Code plugin manifest (`marketplace.json`, `plugin.json`) |
| `ai_docs/` | Architecture, rules, and contributor docs (loaded on demand) |

## Module diagram

```mermaid
flowchart LR
    subgraph Repo["claude-flutter toolkit"]
        plugin[".claude-plugin/\nmarketplace.json + plugin.json"]
        agents["agents/\nriverpod-reviewer\nprompt-engineer"]
        skills["skills/\nbootstrap-feature · unit-test · build-filter\nflutter-analyze-targeted · build-optimized-widget\nflutter-go-router · flutter-melos-workspace\ngenerate-widget-tests · maestro-screenshot-flow\naudit-presentation-layer · second-opinion"]
        aidocs["ai_docs/\nARCHITECTURE · FLUTTER_RULES\nGIT_WORKFLOW · CONTRIBUTING"]
    end

    cc[Claude Code]
    target["Target Flutter project\n(apps/<app>)"]
    ai_toolkit["ai_toolkit/\n(in target project)\nbreaking/ · patterns/ · logging.md"]

    cc -->|installs| plugin
    cc -->|invokes| skills
    cc -->|spawns| agents
    skills -.->|load docs from| ai_toolkit
    target --> ai_toolkit
    cc -.->|reads on demand| aidocs
```

## Key skills

| Skill | Trigger |
|---|---|
| `bootstrap-feature` | "Starting a new feature" — Socratic intake, clean-arch scaffold, architecture contract, context seed |
| `build-filter` | After modifying `@riverpod`/`@JsonSerializable` — targeted codegen only |
| `flutter-analyze-targeted` | Fast `dart analyze` scoped to a feature path |
| `unit-test` | Generate/update/repair unit tests (mocktail, GWT, Riverpod ProviderContainer) |
| `generate-widget-tests` | Generate widget tests using Robot Testing pattern |
| `build-optimized-widget` | Create a new Flutter widget with Riverpod `.select()`, Consumer, side-effect patterns |
| `flutter-go-router` | Navigation: routes, guards, shell navigation, URL-driven state |
| `flutter-melos-workspace` | Melos monorepo orchestration |
| `audit-presentation-layer` | Rules-based static audit (Riverpod, Robot Testing, GoRouter, layout, responsive, web affordances) — platform-aware (auto-detect / `--platform`) |
| `second-opinion` | Independent architecture review (requires Gemini CLI) |

## Agents

| Agent | Purpose |
|---|---|
| `riverpod-reviewer` | Reviews Riverpod v3 provider code — `ref.watch`/`ref.read` placement, `.select()` usage, v3 naming, `AsyncValue` handling |
| `prompt-engineer` | Designs, tests, and optimizes LLM prompts for production systems |

## Skill variants: dispatcher vs self-contained

- **Dispatcher skills** (e.g. `build-optimized-widget`): load rules from the target project's `ai_toolkit/` at runtime. Use when rules evolve with the Flutter project.
- **Self-contained skills** (e.g. `audit-presentation-layer`): bundle `rules/` locally. Use when rules are stable or copied from upstream. State this explicitly in SKILL.md to avoid confusion with the dispatcher pattern.
