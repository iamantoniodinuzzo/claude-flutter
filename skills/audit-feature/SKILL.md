---
name: audit-feature
description: Orchestrate a full static audit of a Flutter feature folder across all present clean-architecture layers — domain, data, application, and presentation. Delegates each layer to its dedicated per-layer audit skill (running them in parallel via Explore subagents), then aggregates violations into one grouped report and offers targeted fixes. Falls back to audit-presentation-layer alone when only presentation/ is present (sub-feature or UI-only feature). Use proactively when the user says "audit feature", "audit this feature", "review feature", "audit this feature folder", "check all layers", or "full feature audit".
user-invocable: true
---

# Audit Feature

Orchestrates per-layer audits of a Flutter feature folder. Spawns one Explore subagent
per detected layer **in parallel**, aggregates all violations, and offers a combined
fix prompt.

This skill has **no rules of its own** — it reads each layer's
`skills/audit-<layer>-layer/rules/CATALOG.md` and passes the rules inline to the
corresponding Explore subagent.

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
`audit-presentation-layer` by invoking the Skill tool with that skill name, passing the
`presentation/` path. Then stop — do not continue to Phase 2.

Otherwise, for each layer directory that exists, prepare a parallel Explore invocation
(see Phase 2). Log a warning for any expected layer that is absent:

```
⚠️  No application/ directory found — skipping audit-application-layer.
```

**Graceful degradation**: if a layer's CATALOG file
(`skills/audit-<layer>-layer/rules/CATALOG.md`) is missing, emit a warning and continue
auditing the other layers:

```
⚠️  skills/audit-domain-layer/rules/CATALOG.md not found — skipping domain audit.
    Install the audit-domain-layer skill to enable this check.
```

---

## Phase 2 — Parallel layer audits

For each present layer, spawn one Explore subagent **simultaneously** (all in a single
response with multiple Agent tool calls). Pass to each Explore:

1. The full contents of the layer's `rules/CATALOG.md` (read it before spawning).
2. The layer directory path to scan.
3. A self-contained scan prompt (see template below).

### Explore prompt template

```
You are performing a static architecture audit of Flutter <LAYER>-layer files.

## CATALOG (rules to enforce)
<paste full contents of skills/audit-<layer>-layer/rules/CATALOG.md here>

## Target
Scan all .dart files (excluding .g.dart, .freezed.dart) under:
  <feature_path>/<layer>/

## Instructions
1. List every .dart file found (relative path + approximate line count).
2. For each file, read the full content and apply every rule in the CATALOG above.
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

After all Explore subagents complete, merge their outputs into a single report:

```
## Full Feature Audit — <feature>

### Domain Layer
<paste domain Explore output — table + count>

### Data Layer
<paste data Explore output — table + count>

### Application Layer
<paste application Explore output — table + count>

### Presentation Layer
<paste presentation Explore output — table + count>
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
     (read from `skills/audit-<layer>-layer/rules/CATALOG.md`).
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

- Paths are relative to the project root — always resolve from there.
- This skill spawns Explore subagents, not Skill invocations — Explore does not have
  access to the Skill tool, so rules are passed inline in the prompt.
- `audit-presentation-layer` is the exception: for the presentation shortcut path it
  is invoked via the Skill tool (which supports platform detection from `pubspec.yaml`).
  For full multi-layer audits, the presentation layer is scanned via an Explore subagent
  using `audit-presentation-layer`'s CATALOG directly.
- To modify per-layer rules, edit the respective
  `skills/audit-<layer>-layer/rules/CATALOG.md` — this orchestrator reads them at runtime.
