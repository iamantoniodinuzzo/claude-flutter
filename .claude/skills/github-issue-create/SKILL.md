---
name: github-issue-create
description: Create GitHub issues via gh CLI using the project's YAML templates (feature, task, bug) or as blank issues. Use this skill whenever the user says "crea una issue", "apri una issue", "new issue", "create issue", "bug report", "feature request", "task issue", or asks to track something on GitHub. Also use proactively after completing a feature branch to suggest closing the related issue.
user-invocable: true
---

Create issues via `gh issue create` using the correct template, labels, and body for the issue type.

## Prerequisites: templates must be on the default branch

GitHub and `gh` serve issue templates only from the **default branch** (main/master).
Templates live in `.github/ISSUE_TEMPLATE/` on `develop` — they are NOT available until merged to main.

**Before using `--template`, verify availability:**

```bash
gh api repos/{owner}/{repo}/contents/.github/ISSUE_TEMPLATE --jq '.[].name'
```

- If files are listed → templates are on main → use `--template` (preferred path).
- If 404 / empty → templates are still on develop → use manual body (fallback path).

## Template map

| Type | `--template` value | `--label` | When to use |
|---|---|---|---|
| Feature | `"Feature Request"` | `feature` | New capability or enhancement |
| Task | `"Task"` | `task` | Chore, refactor, maintenance, docs |
| Bug | `"Bug Report"` | `bug` | Reproducible unexpected behavior |
| Blank | *(omit `--template`)* | *(choose from `gh label list`)* | Freeform |

> **Labels in templates** (`feature`, `task`) may not exist yet — see **Label setup** below.

## Label setup

Run once to check what exists:

```bash
gh label list
```

If `feature` or `task` are missing, create them before the first issue of that type:

```bash
gh label create "feature" --description "New feature or enhancement" --color "#0052cc"
gh label create "task" --description "Chore, refactor, or maintenance" --color "#e4e669"
```

## Creation with template (preferred — requires templates on main)

```bash
gh issue create \
  --title "..." \
  --template "Feature Request" \
  --label "feature"
```

> `--template` pre-fills the body structure but does NOT apply the YAML-defined labels automatically. Always pass `--label` explicitly.

## Creation without template (fallback — templates not yet on main)

Build the body manually using the structures below:

```bash
gh issue create \
  --title "..." \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary
...

## Acceptance criteria
- [ ] ...
EOF
)"
```

Use `enhancement` / `bug` (default GitHub labels) as fallback when `feature` / `task` don't exist yet.

## Body structure by type

### Feature Request
```
## Summary
<one-paragraph description of the new capability>

## Motivation
<why this matters — user pain, stakeholder ask, tech need>

## Implementation notes
<optional: approach hints, files to touch, related skills/agents>

## Acceptance criteria
- [ ] ...
```

### Task
```
## Objective
<what needs to be done and why>

## Steps
- [ ] ...

## Area
<skills | agents | commands | scripts | hooks>
```

### Bug Report
```
## Description
<what is broken>

## Steps to reproduce
1. ...

## Expected behavior
<what should happen>

## Actual behavior
<what actually happens — include error messages>

## Environment
- Flutter version:
- Branch:
```

## Multiple issues: run sequentially

Do NOT create multiple issues in parallel. If one fails, the parallel sibling is cancelled automatically. Run sequentially and verify each URL before proceeding.

## Post-creation: open branch

```bash
# gh output: https://github.com/owner/repo/issues/42
git start feature 42_short_snake_case_name
```

## Gotchas

- `--template "Name"` matches the `name:` field in the YAML — NOT the filename (`feature.yml` → `"Feature Request"`).
- Templates are served from the **default branch only** — `develop`-only templates are invisible to `gh`.
- Labels `feature` and `task` are custom — create them if missing before the first use.
- `gh issue create` output includes the URL — extract the number for `git start`.
- GitHub does NOT auto-close issues on PR merge. After merging, run `gh issue close <n>`.
