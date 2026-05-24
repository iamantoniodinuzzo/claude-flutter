# Git Workflow

## Aliases

- `git start feature <number>_<name>` → creates `feature/<number>_<name>` from develop (single arg, all snake_case)
- `git publish` → pushes current branch to origin
- `git c` → interactive Conventional Commits script
- `git finish` → merges branch back to its base (develop for features, master+develop for releases)
- `git sync` → checkout develop + pull latest

## Lifecycle

```
git start feature <n>_<name>   # branch from develop
# work on code
git add <files>
git c                           # Conventional Commit (auto-appends #<n> ref)
git publish                     # push branch to origin
gh pr create ...                # open PR
# PR reviewed and merged
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
