# Git Workflow

## Aliases

- `git init-flow` → Initialize git flow on a repo starting from `main` (creates `develop` and pushes to origin).
- `git start <type> <name>` → Create a new branch `<type>/<name>`.
  - Branches from `main` if type is `hotfix` or `support`.
  - Branches from `develop` for all other types (e.g., `feature`, `bugfix`, `release`).
- `git publish` → Push current branch to origin.
- `git c` → Interactive Conventional Commits script.
- `git finish [--y]` → Merge branch and close with auto-generated message (use `--y` to skip interactive prompts).
- `git st-flow` → Show all active flow branches (e.g., feature, bugfix, release, hotfix, support).
- `git sync` → Checkout `develop` and pull latest from origin.

## Lifecycle

```bash
git start feature <n>_<name>    # branch from develop
# work on code
git add <files>
git c                           # Conventional Commit (auto-appends #<n> ref)
git publish                     # push branch to origin
# branch merged
git sync                        # back to develop, pull
gh issue close <n>              # GitHub does NOT auto-close on merge
```

## Gotchas

- **GitHub does NOT auto-close issues on PR merge** — always run `gh issue close <n>` manually after merging.
- **`gh pr merge` fails with uncommitted changes** — `git stash` first, `git stash pop` after.
- **`git finish` is NOT pipeable** — interactive prompts; after it merges locally, push manually:
  ```bash
  git push origin <target-branches>
  git branch -d <branch>
  git push origin --delete <branch>
  ```
- **File on disk ≠ tracked by git** — verify with `git ls-files <path>`, not a filesystem check.

## Conventional Commits scopes for this toolkit

When committing to this repo: `agents`, `commands`, `scripts`, `skills`, `hooks`, or the specific skill/command name.
