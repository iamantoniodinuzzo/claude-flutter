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
        skills["skills/\nscaffold-feature · unit-test · build-filter\nflutter-analyze-targeted · flutter-go-router\nflutter-melos-workspace · generate-widget-tests\nmaestro-screenshot-flow · audit-presentation-layer\naudit-domain-layer · audit-data-layer\naudit-application-layer · audit-feature\nsentry-init · flutter-flavors · second-opinion\nretro · tune-setup"]
        aidocs["ai_docs/\nARCHITECTURE · FLUTTER_RULES\nGIT_WORKFLOW · CONTRIBUTING"]
    end

    cc[Claude Code]

    cc -->|installs| plugin
    cc -->|invokes| skills
    cc -->|spawns| agents
    cc -.->|reads on demand| aidocs
```

## Key skills

| Skill | Trigger |
|---|---|
| `scaffold-feature` | "Starting a new feature" — Socratic intake, clean-arch directory scaffold, architecture contract, context seed |
| `build-filter` | After modifying `@riverpod`/`@JsonSerializable` — targeted codegen, guarded against out-of-scope deletions, escalates to full rebuild when the working tree has drifted too far |
| `flutter-analyze-targeted` | Fast `dart analyze` scoped to a feature path |
| `unit-test` | Generate/update/repair unit tests (mocktail, GWT, Riverpod ProviderContainer) |
| `generate-widget-tests` | Generate widget tests using Robot Testing pattern |
| `flutter-go-router` | Navigation: routes, guards, shell navigation, URL-driven state |
| `flutter-melos-workspace` | Melos monorepo orchestration |
| `maestro-screenshot-flow` | Maestro YAML for Android screenshots — id-based selectors (`Semantics(identifier:)`), immune to translation and UI refactors; edits app source to add missing identifiers; helper scripts for tree inspection and ADB reset |
| `audit-presentation-layer` | Rules-based static audit (Riverpod, Robot Testing, GoRouter, layout, responsive, web affordances) — platform-aware (auto-detect / `--platform`) |
| `audit-domain-layer` | Rules-based static audit: infra imports in domain, untyped/non-sealed exceptions, entity serialization, hardcoded UI strings |
| `audit-data-layer` | Rules-based static audit: leaky abstractions, missing exception conversion, model mapper gaps, untyped datasource exceptions |
| `audit-application-layer` | Rules-based static audit: Flutter imports in application code, redundant try/catch in notifiers, mutation return types, unconstrained state types |
| `audit-feature` | Orchestrator: runs all four per-layer audits in parallel via Explore subagents; aggregates into one report; presentation-only shortcut for sub-features |
| `sentry-init` | Bootstrap `sentry_flutter`: installs deps, patches `main.dart`, wires GoRouter observer, Riverpod error capture (LoggerService decorator or a scaffolded ErrorLogger sink), beforeSend/sampling policy, web BetterFeedback, release-upload checklist |
| `flutter-flavors` | Init dev/stg/prod flavors (flutter_flavorizr targeted processors, or manual fallback) across Android/iOS/Web + VSCode/Android Studio IDE config; detects an existing partial/broken setup and switches to an AUDIT+FIX branch against a bundled rule catalog; optional multi-project Firebase |
| `second-opinion` | Independent architecture review (requires Gemini CLI) |
| `retro` | End-of-task self-audit: reads session transcript for verifiable friction evidence (`scripts/session-evidence.{sh,ps1}`), answers 6 hard questions backed by it, auto-persists learnings to auto-memory with dedup, flags unintegrated git work, proposes fixes (generic, not Flutter-specific) |
| `tune-setup` | On-demand config & workflow audit: `CLAUDE.md` / `.claude/settings.json`(+`.local`) / hooks / `agents/` / skill-trigger-miss, backed by `retro`'s script extended with an opt-in `--config-audit` flag; proposes config fixes, never runs automatically (generic, not Flutter-specific) |

## Agents

| Agent | Purpose |
|---|---|
| `riverpod-reviewer` | Reviews Riverpod v3 provider code — `ref.watch`/`ref.read` placement, `.select()` usage, v3 naming, `AsyncValue` handling |
| `prompt-engineer` | Designs, tests, and optimizes LLM prompts for production systems |

## Skill design: self-contained

All skills bundle their reference docs locally (e.g. `rules/`, `references/` subdirectories). No skill loads docs from the target project's `ai_toolkit/` at runtime — that dispatcher pattern has been retired. State in SKILL.md which reference subtree the skill uses.

This flat `skills/<name>/SKILL.md` layout doubles as the discovery contract for [skills.sh](https://www.skills.sh)'s `npx skills add` — no format changes needed to support both the Claude Code plugin marketplace and npx-based multi-agent distribution.

## Orchestrator skills

`audit-feature` is an **orchestrator**: it has no `rules/` of its own. Instead, it reads the
`CATALOG.md` from each per-layer skill at runtime and passes the catalog inline to parallel
Explore subagents — one per layer. The orchestrator does not use the Skill tool internally
(Explore subagents cannot invoke skills); rules are embedded in the Explore prompt.

This is distinct from the old **dispatcher** pattern (which delegated to a central `ai_toolkit/`
doc tree). Orchestrators own the aggregation and fix logic; per-layer skills own the rules.
