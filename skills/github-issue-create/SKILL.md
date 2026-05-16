---
name: github-issue-create
description: Create GitHub issues via gh CLI using the project's YAML templates (feature, task, bug) or as blank issues. Use this skill whenever the user says "crea una issue", "apri una issue", "new issue", "create issue", "bug report", "feature request", "task issue", or asks to track something on GitHub. Also use proactively after completing a feature branch to suggest closing the related issue.
user-invocable: true
---

Create issues via `gh issue create` using the correct template, labels, and body for the issue type.

## Template map

| Type | `--template` value | `--label` | When to use |
|---|---|---|---|
| Feature | `"Feature Request"` | `feature` | New capability or enhancement |
| Task | `"Task"` | `task` | Chore, refactor, maintenance, docs |
| Bug | `"Bug Report"` | `bug` | Reproducible unexpected behavior |
| Blank | *(omit `--template`)* | *(choose as needed)* | Freeform — no structure needed |

> **Why labels matter:** `--template` pre-fills the body but does NOT apply the YAML-defined labels automatically. Always pass `--label` explicitly to match what the template defines.

## Non-interactive creation (preferred)

Build the body string yourself and pass everything in one command:

```bash
gh issue create \
  --title "..." \
  --body "$(cat <<'EOF'
## Summary
...

## Acceptance criteria
- [ ] ...
EOF
)" \
  --label "feature"
```

Use heredoc (`<<'EOF'`) to avoid shell interpolation issues with multi-line bodies.

## Template-assisted (editor opens)

When you want the template fields pre-filled in an editor:

```bash
gh issue create --template "Bug Report" --editor
```

This opens `$EDITOR` with the template body. Add `--title "..."` to skip the title prompt.

## Browser (human fills it out)

```bash
gh issue create --web
# or with template pre-selected:
gh issue create --template "Feature Request" --web
```

## Blank issue

Omit `--template`. Add any label that fits or none:

```bash
gh issue create --title "Quick note" --body "..."
```

## Full examples per type

### Feature
```bash
gh issue create \
  --title "Add dark mode toggle to settings screen" \
  --label "feature" \
  --body "$(cat <<'EOF'
## Summary
Users want to switch between light and dark themes without leaving the app.

## Motivation
Top-requested UX improvement in user feedback.

## Acceptance criteria
- [ ] Toggle in Settings > Appearance
- [ ] Preference persisted across restarts
- [ ] Respects system theme by default
EOF
)"
```

### Task
```bash
gh issue create \
  --title "Migrate auth module to Riverpod v3 Notifier API" \
  --label "task" \
  --body "$(cat <<'EOF'
## Objective
Update auth providers from StateNotifier to Riverpod v3 Notifier.

## Steps
- [ ] Audit current auth providers
- [ ] Rewrite to Notifier<T>
- [ ] Run riverpod-reviewer agent

## Area
skills
EOF
)"
```

### Bug
```bash
gh issue create \
  --title "Login screen crashes on empty password submit" \
  --label "bug" \
  --body "$(cat <<'EOF'
## Description
App throws unhandled exception when submitting login with empty password field.

## Steps to reproduce
1. Open login screen
2. Enter any email, leave password blank
3. Tap Login

## Expected behavior
Inline validation error shown.

## Actual behavior
App crashes with `Null check operator used on a null value`.

## Environment
- Flutter 3.22
- Branch: develop
EOF
)"
```

## Post-creation: open branch

After creating an issue, capture the number from the URL output and open the feature branch:

```bash
# gh output: https://github.com/owner/repo/issues/42
git start feature 42_short_snake_case_name
```

## Gotchas

- `--template "Name"` matches the `name:` field in the YAML file — NOT the filename (`feature.yml` → `"Feature Request"`).
- Labels must match labels that exist in the repo. Check with `gh label list` if unsure.
- `gh issue create` output includes the issue URL — extract the number from it for `git start`.
- GitHub does NOT auto-close issues on PR merge. After merging, always run `gh issue close <n>`.
