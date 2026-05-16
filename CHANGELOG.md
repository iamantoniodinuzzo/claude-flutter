# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
