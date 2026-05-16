---
name: git-workflow
description: >
  Operate git using the project's custom aliases (git start, git c, git finish,
  git publish, git sync, git st-flow, git init-flow). Use when the user asks to
  create a branch, commit, merge, push, or manage the git flow lifecycle.
user-invocable: true
---

## Alias quick reference

| Alias | Syntax | What it does |
|---|---|---|
| `init-flow` | `git init-flow` | Create `develop` from `main`/`master`, push to origin |
| `start` | `git start <type> <name>` | Create typed branch from correct base |
| `c` | `git c` | Interactive Conventional Commits via script |
| `finish` | `git finish` | Merge branch with auto-message, tag, CHANGELOG |
| `publish` | `git publish` | Push current branch to origin |
| `st-flow` | `git st-flow` | List all active feature/bugfix/release/hotfix/support branches |
| `sync` | `git sync` | Checkout develop + pull latest |

---

## Branch types and base routing

`git start <type> <name>` picks the base automatically:

| Type | Base branch |
|---|---|
| `feature` | `develop` |
| `bugfix` | `develop` |
| `release` | `develop` |
| `hotfix` | `main` / `master` |
| `support` | `main` / `master` |

Naming convention for features: `git start feature <issue#>_<snake_case_name>`

```bash
git start feature 42_auth_login   # → feature/42_auth_login from develop
git start hotfix 1.0.2            # → hotfix/1.0.2 from main
```

---

## `git c` — interactive commit

Runs `~/.git-scripts/git-commit.sh`. Behavior:

1. Validates staged files exist (aborts if nothing staged)
2. Auto-detects issue number from branch name (`feature/42_name` → `#42`)
3. Shows Conventional Commits template guide in editor
4. Validates format after editing, shows preview
5. Prompts: accept / re-edit / cancel
6. On accept: auto-appends `#<issue>` reference to commit message

**Always stage files before running `git c`.**

---

## `git finish` — merge and close branch

Runs `~/.git-scripts/git-finish.sh`. Merge targets by branch type:

| Branch type | Merges into |
|---|---|
| `feature/*`, `bugfix/*` | `develop` |
| `release/*`, `hotfix/*` | `main`/`master` + `develop` |
| `support/*` | `main`/`master` only |

Additional behavior for `release/*` and `hotfix/*`:
- Updates `CHANGELOG.md` with current date
- Creates an annotated git tag

After merging, the script prompts:
1. Push merged branches to origin?
2. Delete local branch?

**Requires clean working directory.** Stash or commit everything first.

---

## Typical feature lifecycle

```
1. git start feature <n>_<name>   # branch from develop
2. [work on code]
3. git add <files>                 # stage changes
4. git c                           # Conventional Commit (auto issue ref)
5. git publish                     # push branch to origin
6. gh pr create ...                # open PR on GitHub
7. [PR review + merge]
8. git sync                        # back to develop, pull
9. gh issue close <n>              # GitHub does NOT auto-close on merge
```

If using `gh pr merge` instead of the GitHub UI:

```bash
git stash          # gh pr merge fails with uncommitted changes
gh pr merge        # merge PR
git stash pop      # restore local state
```

---

## Gotchas

- **GitHub does NOT auto-close issues on PR merge** — always run `gh issue close <n>` manually after merging.
- **`gh pr merge` fails with uncommitted changes** — `git stash` first, `git stash pop` after.
- **`git finish` requires clean working directory** — commit or stash everything before running.
- **File exists on disk ≠ tracked by git** — verify with `git ls-files <path>`, not a filesystem check.
- **`git start` requires `develop` to exist** (except for `hotfix`/`support`) — run `git init-flow` first on a fresh repo.
