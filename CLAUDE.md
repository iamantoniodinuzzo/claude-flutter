Claude Code toolkit for Flutter/Dart (Riverpod v3, GoRouter, clean architecture, Melos).
Toolkit repo — paths inside commands/skills are relative to the **target Flutter project root**, not this repo.

Load on demand:
- [ai_docs/ARCHITECTURE.md](ai_docs/ARCHITECTURE.md) — repo structure, modules, dispatcher vs self-contained skills
- [ai_docs/FLUTTER_RULES.md](ai_docs/FLUTTER_RULES.md) — Riverpod v3 / GoRouter / testing / logging / codegen rules
- [ai_docs/GIT_WORKFLOW.md](ai_docs/GIT_WORKFLOW.md) — branch aliases, PR/issue commands
- [ai_docs/CONTRIBUTING.md](ai_docs/CONTRIBUTING.md) — adding skills, version bump, commit scopes, upstream rule docs

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
