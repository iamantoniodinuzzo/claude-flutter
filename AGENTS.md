# Flutter Toolkit

This repository distributes skills for Flutter/Dart projects. The target application lives elsewhere.

- Keep one catalog under `skills/<name>/SKILL.md` for Claude Code, Codex, and other agents.
- Resolve bundled resources from each installed skill's directory; resolve application paths from the target project.
- Use native host tools. Questions may be plain text; scans may run sequentially when delegation is unavailable or not permitted.
- Dependencies between skills are explicit. Report missing resources and incomplete coverage instead of inventing rules.
- `build-filter` is archived. Preserve its guidance and guard scripts without re-enabling invocation.
- `tune-setup` runs only on explicit request. Preserve that policy in Codex metadata.
- Read `ai_docs/ARCHITECTURE.md`, `FLUTTER_RULES.md`, `CONTRIBUTING.md`, and `GIT_WORKFLOW.md` on demand.
- Validate changes with `node scripts/validate-skills.js` and `node --test tests/**/*.test.js`.
- Version bumps happen after merge; do not publish or push as part of skill edits.

When available, query the existing knowledge graph with `graphify query` for relationships. Check freshness against the source before relying on it. Update only with a supported local command without paid extraction; otherwise retain the historical graph's freshness warning.
