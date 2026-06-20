# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.0]

### Added

- `scripts/bump-version.sh` — one-command version sync across all four locations (`package.json`, `plugin.json`, `marketplace.json` `source.ref`, README badge); fixes auto-update for marketplace consumers by ensuring `source.ref` is always bumped with the version
- `.github/workflows/validate-marketplace.yml` — CI workflow: asserts version parity across all four locations on every PR and push to `master`/`develop`; validates `plugin.json` and `marketplace.json` JSON structure
- `.github/workflows/release.yml` — CI workflow: creates a GitHub Release with the matching CHANGELOG section body on every `v*` tag push

### Changed

- `ai_docs/CONTRIBUTING.md` — version bump procedure now references `scripts/bump-version.sh`; documents why `marketplace.json` `source.ref` must be bumped for auto-update to work
- `ai_docs/GIT_WORKFLOW.md` — release lifecycle updated to use `scripts/bump-version.sh` and notes GitHub Actions creates the Release automatically
- `README.md` — release block updated; version badge fixed (`3.0.1` → `3.1.0`); added "How auto-update works" subsection
- `skills/build-filter/skill.md` → `SKILL.md` — renamed to match uppercase convention used by all other skills

## [3.1.0] - 2026-06-08

### Added

- `skills/sentry-init` — Sentry SDK bootstrap skill for Flutter+Riverpod+GoRouter: installs `sentry_flutter`, patches `main.dart`, wires GoRouter `SentryNavigatorObserver`, Riverpod error capture (decorator or standalone), web BetterFeedback, release-upload checklist; 5 reference docs bundled (#28)
- `.claude/agents/skill-reviewer` — internal subagent that reviews new/changed skills
- Marketplace-validation hook in `.claude/settings.json` (repo dev tooling)
- `skills/audit-presentation-layer/rules/patterns/responsive-layout.md` and `web-interaction-affordances.md` — new rule docs (#25)

### Changed

- `skills/audit-presentation-layer` — now platform-aware (auto-detect / `--platform` Android/iOS/web); CATALOG + SKILL updated, 2 new rule families (#25)
- `skills/flutter-go-router/SKILL.md` — added "Adding a SentryNavigatorObserver" section (observer goes on `GoRouter`, not `MaterialApp.router`)
- `README.md` — added troubleshooting section for plugin install issues; sentry-init table row; title/install fixes
- `ai_docs/ARCHITECTURE.md` — Key skills table + Mermaid node now include `sentry-init`; audit-presentation-layer description updated
- `ai_docs/GIT_WORKFLOW.md` — release/hotfix lifecycle + `git finish` flag docs
- `.gitignore` — track `.claude/agents/` and `.claude/settings.json`

## [3.0.1] - 2026-05-31

### Fixed

- `.claude-plugin/marketplace.json`: source type corrected from `url` to `github` with `repo` + `ref` fields; removed duplicate `version` field (plugin.json is authoritative per spec); aligned description with plugin.json; expanded tags to cover all 11 skills and 2 agents
- `.claude-plugin/plugin.json`: expanded `keywords` to match marketplace tags
- `ai_docs/GIT_WORKFLOW.md`: document all git aliases (`init-flow`, `st-flow`, `finish --y`)
- `CLAUDE.md`: remove redundant `# CLAUDE.md` heading

## [3.0.0] - 2026-05-27

### Removed

- `commands/` directory and all 6 command files (`git-commit-staged.md`, `git-flow-feature-finish.md`, `seed-context.md`, `seed-fix-refactor.md`, `seed-ui-context.md`, `update-logs.md`) — functionality superseded by the skill system (#22)
- `hooks/` directory (`hooks.json`, `session-start.sh`) — SessionStart hook no longer needed; session behaviours handled by the skill/config system (#23)
- `scripts/` directory (`bump-version.sh`, `context-monitor.py`, `dart-format-hook.sh`, `protect-sensitive-files.sh`, `validate-bash.sh`) — leftovers from pre-2.0.0 multi-tool support, no longer relevant (#24)
- `.version-bump.json` — no longer needed without `bump-version.sh` (#24)

### Breaking Changes

- Consumers referencing `flutter-toolkit:<command>` slash commands must switch to the equivalent skills (see README Skills table).
- Version bump is now a manual procedure documented in `ai_docs/CONTRIBUTING.md`; the `./scripts/bump-version.sh` script is gone.

## [2.0.0] - 2026-05-24

### Added

- `ai_docs/ARCHITECTURE.md` — repo structure, Mermaid flowchart (modules + interaction with target project's `ai_toolkit/`), skill dispatcher-vs-self-contained patterns
- `ai_docs/FLUTTER_RULES.md` — Riverpod v3 rules, GoRouter web rules, logging format, testing conventions, codegen/analyze scoping
- `ai_docs/GIT_WORKFLOW.md` — git aliases (start/publish/c/finish), PR/issue workflow, gotchas
- `ai_docs/CONTRIBUTING.md` — adding new skills, version bump procedure, Conventional Commits scopes, upstream rule docs, Windows/Python gotcha

### Changed

- `CLAUDE.md` — slimmed to a 10-line pointer file; all content extracted to `ai_docs/` (loaded on demand, not injected every session)
- `README.md` — Claude-only; dropped Gemini CLI / OpenCode badges and install sections; updated skill/command names
- `package.json` — dropped `gemini-cli` keyword; Claude-only description
- `scripts/bump-version.sh` — no longer updates `gemini-extension.json`
- `.version-bump.json` — removed `gemini-extension.json` from tracked files
- `skills/second-opinion/SKILL.md` — added prerequisite note: this skill intentionally retains a Gemini CLI runtime dependency
- `skills/bootstrap-feature/references/patterns/repository-pattern.md` — replaced "Cursor AI" with "AI assistants"

### Removed

- Gemini CLI support: `GEMINI.md`, `gemini-extension.json`, `references/gemini-tools.md` in `build-filter`, `generate-widget-tests`, `unit-test`
- Cursor support: `.cursor-plugin/`
- OpenCode / generic agent support: `AGENTS.md`

### Breaking Changes

Commands renamed (drop `-claude` suffix):
- `seed-context-claude` → `seed-context`
- `seed-ui-context-claude` → `seed-ui-context`
- `seed-fix-refactor-claude` → `seed-fix-refactor`
- `git-commit-staged-claude` → `git-commit-staged`
- `update-logs-claude` → `update-logs`

Skill renamed:
- `unit-test-claude` → `unit-test`

## [1.1.0] - 2026-05-19

### Added

- `skills/audit-presentation-layer` — rules-based static audit skill for Flutter presentation layers; scans widgets and widget tests against 14 bundled rules across 5 families (Riverpod v3 widget patterns, Robot Testing, GoRouter conventions, layout antipatterns, side-effect handling); emits violations table with file:line references and optional targeted fix mode; rule docs copied from `iamantoniodinuzzo/flutter_ai_toolkit@bac1f74` (#18)

## [1.0.2] - 2026-05-16

### Fixed

- `skills/github-issue-create`: correct label map to use real repo labels (`enhancement`, `bug`, `documentation`); add prerequisite check for template availability on default branch; document sequential-only issue creation
- `skills/github-issue-create`: move SKILL.md to `.claude/skills/` canonical location
- `settings.local.json`: add `Skill(github-issue-create)` to allowlist

## [1.0.1] - 2026-05-16

### Fixed

- `.claude-plugin/marketplace.json`: renamed plugin `superpowers` → `flutter-toolkit` to avoid collision with official Superpowers plugin and fix strict-mode name mismatch that caused "empty" on install
- `.claude-plugin/plugin.json`: aligned `name` to `flutter-toolkit`, removed non-standard `capabilities` and `entrypoints` fields, converted `author` to object per spec
- `.version-bump.json`: added `.claude-plugin/marketplace.json` to `files` list so version bumps propagate correctly

## [1.0.0] - 2026-05-16

### Added

- `skills/bootstrap-feature` — architecture-only feature bootstrap skill with embedded reference docs
  (`breaking/`, `patterns/`, `logging.md`); Socratic intake, clean-arch scaffold, architecture
  contract, context seeding. Replaces deprecated `seed-new-feature-claude` command. (#16)
- `skills/flutter-go-router` — GoRouter navigation conventions skill
- `skills/unit-test-claude` — unit test generation skill (mocktail, GWT, Riverpod ProviderContainer)
- `skills/generate-widget-tests` — widget tests via Robot Testing pattern
- `skills/build-optimized-widget` — Flutter widget scaffold with Riverpod `.select()` and side-effects
- `skills/build-filter` — targeted `build_runner --build-filter` skill (avoids full project codegen)
- `skills/flutter-analyze-targeted` — `dart analyze` scoped to feature path
- `skills/flutter-melos-workspace` — Melos monorepo orchestration skill
- `skills/maestro-screenshot-flow` — Maestro YAML flows for automated screenshots
- `agents/riverpod-reviewer` — subagent that reviews Riverpod v3 provider code after changes
- `agents/prompt-engineer` — subagent for designing and optimizing LLM prompts
- `commands/seed-context-claude` — session context loader (breaking + pattern docs)
- `commands/seed-ui-context-claude` — UI/layout/widget context loader
- `commands/seed-fix-refactor-claude` — bug-fix and refactor context loader
- `commands/git-commit-staged-claude` — Conventional Commits message generator
- `commands/update-logs-claude` — logging update command to project standard
- `scripts/dart-format-hook.sh` — PostToolUse hook auto-formatting `.dart` files
- `scripts/protect-sensitive-files.sh` — PreToolUse hook blocking edits to env/credential files
- `scripts/validate-bash.sh` — PreToolUse hook blocking forbidden bash patterns
- `scripts/context-monitor.py` — StatusLine script displaying model, context %, branch, cost
- `hooks/session-start.sh` — session-start hook auto-injecting Flutter context
- `scripts/bump-version.sh` — versioning system for toolkit releases (#6)
- `AGENTS.md` and `package.json` for generic agent support (#3)
- Gemini CLI support with full tool translation (#2)
- Marketplace installation guide in README (#7)

### Changed

- `CLAUDE.md` — updated `bootstrap-feature` skill description; removed `seed-new-feature-claude` row
- Plugin manifests (`.claude-plugin/`, `.cursor-plugin/`) now tracked in git (#15)

### Removed

- `commands/seed-new-feature-claude.md` — superseded by `bootstrap-feature` skill (#16)
- `commands/[deprecated]make-plan.md` — removed deprecated command
