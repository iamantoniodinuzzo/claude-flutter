---
name: audit-feature
description: "Orchestrate a full static audit of a Flutter feature folder across all present clean-architecture layers — domain, data, application, and presentation. Delegates each layer to its dedicated per-layer audit skill (using permitted read-only subagents or sequential scans), then aggregates violations into one grouped report and offers targeted fixes. Falls back to audit-presentation-layer alone when only presentation/ is present (sub-feature or UI-only feature). Use proactively when the user says \"audit feature\", \"audit this feature\", \"review feature\", \"audit this feature folder\", \"check all layers\", or \"full feature audit\"."
user-invocable: true
---

# Audit Feature

## Runtime and resources

Use the current agent's native file, search, shell, and question tools; plain-text questions and direct sequential scans are valid fallbacks. Subagents are optional and require host permission. Bundled paths below are relative to this installed skill directory; application paths are relative to the target Flutter project. Resolve sibling skills through the installed skill registry (or sibling directories), never by assuming a `skills/` folder in the application. If a required dependency is absent, name it and report the affected step as unavailable; never invent its rules or claim complete coverage.

Orchestrates per-layer audits of a Flutter feature folder. Spawns one read-only subagent
per detected layer when available and permitted (otherwise scans sequentially), aggregates all violations, and offers a combined
fix prompt.

This skill has **no rules of its own** — it reads each layer's
`../audit-<layer>-layer/rules/CATALOG.md` and passes the rules inline to the
corresponding read-only subagent.

---

## Phase 0 — Resolve feature path

Read the user's request and extract a feature folder path. Accepted forms:

- Top-level feature: `lib/src/features/<feature>/`
- Sub-feature: `lib/src/features/<parent>/<sub>/`
- Bare feature name (e.g. `auth`) — expand to `lib/src/features/auth/`

If the path is ambiguous, ask exactly one question:

> "Provide the feature folder path (e.g. `lib/src/features/auth/`) or the feature name."

Do not proceed until a path is confirmed.

---

## Dependencies

Requires `audit-domain-layer`, `audit-data-layer`, `audit-application-layer`, and `audit-presentation-layer` for the audited layers. Resolve each installed directory before reading `<installed layer skill directory>/rules/CATALOG.md`; `../audit-<layer>-layer/` is only a sibling-layout shortcut. Missing catalogs mean incomplete coverage, not clean layers.

## Phase 1 — Detect layers

Check which layer directories exist under the resolved feature path:

```
<feature>/
  domain/          ← layer key: domain
  data/            ← layer key: data
  application/     ← layer key: application
  presentation/    ← layer key: presentation
```

**Sub-feature / presentation-only shortcut**: if only `presentation/` is present (and no
`domain/`, `data/`, or `application/`), delegate the entire audit to
`audit-presentation-layer` by loading that installed skill's instructions and following them for the
`presentation/` path. Then stop — do not continue to Phase 2.

Otherwise, for each layer directory that exists, prepare a layer scan
(see Phase 2). Log a warning for any expected layer that is absent:

```
⚠️  No application/ directory found — skipping audit-application-layer.
```

**Graceful degradation**: if a layer's CATALOG file
(`../audit-<layer>-layer/rules/CATALOG.md`) is missing, emit a warning and continue
auditing the other layers:

```
⚠️  ../audit-domain-layer/rules/CATALOG.md not found — skipping domain audit.
    Install the audit-domain-layer skill to enable this check.
```

---

## Phase 2 — Parallel layer audits

For each present layer, scan with a permitted read-only subagent in parallel, or scan directly and sequentially when delegation is unavailable. Give each scanner:

1. The full contents of the layer's `<installed layer skill directory>/rules/CATALOG.md` (read it before spawning).
2. The layer directory path to scan.
3. A self-contained scan prompt (see template below).

Include the installed layer skill's absolute directory and its scan instructions, so resource links resolve outside the target application's cwd. Preserve the layer's file discovery and rule gating; for presentation, forward any requested `--platform` and follow that skill's platform resolution. Stop each layer scan before its fix prompt; this orchestrator collects fix choices in Phase 4.

### Layer scan prompt template

```
You are performing a static architecture audit of Flutter <LAYER>-layer files.

## Installed skill and scan instructions
Skill directory: <absolute installed layer skill directory>
<paste the layer skill's scan instructions; exclude its fix phase>
Resolve bundled rules and references from this directory. Report inaccessible resources as incomplete coverage.

## CATALOG (rules to enforce)
<paste full contents of ../audit-<layer>-layer/rules/CATALOG.md here>

## Target
Scan all .dart files (excluding .g.dart, .freezed.dart) under:
  <feature_path>/<layer>/

## Instructions
1. List every .dart file found (relative path + approximate line count).
2. For each file, read the full content and apply applicable rules in the CATALOG above, preserving the layer skill's scope and platform gating.
3. For each violation found, record:
   - file (relative path)
   - line number
   - rule_id
   - severity (error / warning / info)
   - brief message (one line)
4. Return results as a markdown table grouped by file, followed by a violation count
   summary: "N violations (E errors, W warnings, I info)".
5. If no violations found in a file, omit that file from the table.
6. If no violations found at all, write: "No violations — <layer> layer passes all rules."
```

---

## Phase 3 — Aggregate and report

After all layer scans complete, merge their outputs into a single report:

```
## Full Feature Audit — <feature>

### Domain Layer
<paste domain layer scan output — table + count>

### Data Layer
<paste data layer scan output — table + count>

### Application Layer
<paste application layer scan output — table + count>

### Presentation Layer
<paste presentation layer scan output — table + count>
(platform-aware rules run by audit-presentation-layer; platform: <resolved>)

---
**Grand total**: N violations across K files (E errors, W warnings, I info)
```

If a layer was skipped (missing directory or missing CATALOG), include the warning in its
section header instead of a table.

---

## Phase 4 — Combined fix prompt

After the report, ask:

```
Apply fixes for which rule IDs? (comma-separated, "all", or "none")
List the rule IDs you want fixed:
```

On response:

- **"none"** or no response: done.
- **"all"** or specific IDs:
  1. Group selected IDs by layer.
  2. For each layer with selected fixes, apply heuristics from that layer's CATALOG
     (read from `../audit-<layer>-layer/rules/CATALOG.md`).
  3. For `autofix_safe: true` rules: apply edits directly, show diff.
  4. For `autofix_safe: false` rules: show the required transformation and ask for
     confirmation before editing.
  5. After edits, state which violations were resolved.

Never edit files that were not explicitly approved by the user.

---

## Usage examples

- `audit all layers of features/auth`
- `full feature audit for features/booking`
- `check all layers in lib/src/features/flight_plan/`
- `/audit-feature auth`
- `/audit-feature lib/src/features/booking/`
- `/audit-feature lib/src/features/home/home_screen/` ← sub-feature → presentation-only

---

## Notes

- Application paths resolve from the project root; bundled catalogs resolve from the installed layer skill directories.
- Pass rules inline to permitted subagents. Without delegation, apply those same rules directly.
- For the presentation-only shortcut, follow the installed `audit-presentation-layer` instructions, including its platform detection from `pubspec.yaml`.
- To modify per-layer rules, edit the respective
  `../audit-<layer>-layer/rules/CATALOG.md` — this orchestrator reads them at runtime.
