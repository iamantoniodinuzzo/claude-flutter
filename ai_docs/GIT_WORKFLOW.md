# Git Workflow

## Aliases

- `git init-flow` → Initialize git flow on a repo starting from `main` (creates `develop` and pushes to origin).
- `git start <type> <name>` → Create a new branch `<type>/<name>`.
  - Branches from `main`/`master` if type is `hotfix` or `support`.
  - Branches from `develop` for all other types (e.g., `feature`, `bugfix`, `release`).
- `git publish` → Push current branch to origin.
- `git c` → Interactive Conventional Commits script.
- `git finish [-y|--yes]` → Merge branch, auto-generate message, create tag (release/hotfix), push, delete branch. Pass `-y` to skip all interactive prompts.
- `git st-flow` → Show all active flow branches (e.g., feature, bugfix, release, hotfix, support).
- `git sync` → Checkout `develop` and pull latest from origin.

## Feature lifecycle

```bash
git start feature <n>_<name>    # branch from develop
# work on code
git add <files>
git c                           # Conventional Commit (auto-appends #<n> ref)
git publish                     # push branch to origin
# branch merged (via PR or locally)
git sync                        # back to develop, pull
gh issue close <n>              # GitHub does NOT auto-close on merge
```

## Release lifecycle

```bash
bash scripts/bump-version.sh patch   # or minor / major / X.Y.Z
# syncs package.json, plugin.json, marketplace.json source.ref, README badge

git start release v<version>    # branch from develop
# edit CHANGELOG.md: add ## [<version>] section WITHOUT a date (git finish adds it)
git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json README.md CHANGELOG.md
git c                           # "chore(release): bump version to <version>"
git finish -y
# git finish -y on release: merges master+develop, creates tag v<version>,
# pushes origin master develop + --tags, deletes branch
# → GitHub Actions release.yml triggers and creates the GitHub Release automatically
```

Tag naming: always use `v` prefix (e.g., `v3.0.1`). See CONTRIBUTING.md.

## Hotfix lifecycle

```bash
git start hotfix v<version>     # branch from master
# fix the bug
git add <files>
git c
git finish -y                   # same as release: tags, pushes master+develop, deletes branch
```

## Gotchas

- **GitHub does NOT auto-close issues on PR merge** — always run `gh issue close <n>` manually after merging.
- **`gh pr merge` fails with uncommitted changes** — `git stash` first, `git stash pop` after.
- **`git finish` without `-y`** — interactive prompts for message, push, and branch delete. When prompted for push, answer `y` to push; git finish handles everything including tags for release/hotfix.
- **CHANGELOG date** — for `release`/`hotfix` branches, `git finish` auto-inserts today's date into the `## [version]` section. Add the section WITHOUT a date; let `git finish` fill it in.
- **File on disk ≠ tracked by git** — verify with `git ls-files <path>`, not a filesystem check.

## Conventional Commits scopes for this toolkit

When committing to this repo: `agents`, `commands`, `scripts`, `skills`, `hooks`, or the specific skill/command name.
