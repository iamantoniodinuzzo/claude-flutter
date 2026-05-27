# Contributing

## Adding a new skill

Skills are auto-discovered by directory presence under `skills/` — no `marketplace.json` change needed.

When adding a new skill, update BOTH:
- `README.md` → skills table
- `ai_docs/ARCHITECTURE.md` → Key skills table

Version bump runs **post-merge**, not in the PR. See the Version bump section below for the manual procedure.

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

Manual procedure (replaces the removed `scripts/bump-version.sh`):

1. Edit `package.json` — update the `"version"` field:
   ```bash
   # patch: x.x.N — fixes
   # minor: x.N.0 — new skills
   # major: N.0.0 — breaking changes
   npm version patch --no-git-tag-version   # or minor / major
   ```
2. Copy the new version into `.claude-plugin/plugin.json` (sed or manual edit):
   ```bash
   NEW_VER=$(node -p "require('./package.json').version")
   sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VER\"/" .claude-plugin/plugin.json
   ```
3. Commit, tag, push:
   ```bash
   git add package.json .claude-plugin/plugin.json
   git commit -m "chore(release): bump version to $NEW_VER"
   git tag "v$NEW_VER"
   git push origin "v$NEW_VER"
   ```

## Tracking gotcha

Files can exist on disk but be untracked by git. Before closing an issue about file existence, verify with `git ls-files <path>` — not just a filesystem check.
