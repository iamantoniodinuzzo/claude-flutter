# Contributing

## Adding a new skill

Skills are auto-discovered by directory presence under `skills/` — no `marketplace.json` change needed.

When adding a new skill, update BOTH:
- `README.md` → skills table
- `ai_docs/ARCHITECTURE.md` → Key skills table

Version bump (`scripts/bump-version.sh --minor` for new skill, `--patch` for fix) runs **post-merge**, not in the PR.

## Fetching upstream rule docs (flutter_ai_toolkit)

To copy rule docs from `iamantoniodinuzzo/flutter_ai_toolkit` into a skill's `rules/` folder:

```bash
# Get HEAD SHA for attribution comment
gh api repos/iamantoniodinuzzo/flutter_ai_toolkit/git/refs/heads/main --jq '.object.sha'
# Fetch file content (decoded)
gh api repos/iamantoniodinuzzo/flutter_ai_toolkit/contents/<path> --jq '.content' | base64 -d
```

Add `<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ <sha> -->` at top of each copied file.

## Version bump

```bash
./scripts/bump-version.sh --patch   # x.x.N — fixes
./scripts/bump-version.sh --minor   # x.N.0 — new skills/commands
./scripts/bump-version.sh --major   # N.0.0 — breaking changes
git tag v<version>
git push origin v<version>
```

Updates `package.json` and `.claude-plugin/plugin.json`.

## Python3 in bash scripts (Windows / Git Bash)

Git Bash POSIX paths (`/c/Users/...`) are not understood by Python on Windows.
In scripts: `cd "$REPO_ROOT"` first, then use relative paths. Pass file paths via `sys.argv`, not string interpolation.

## Tracking gotcha

Files can exist on disk but be untracked by git. Before closing an issue about file existence, verify with `git ls-files <path>` — not just a filesystem check.
