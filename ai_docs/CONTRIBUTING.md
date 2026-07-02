# Contributing

## Adding a new skill

Skills are auto-discovered by directory presence under `skills/` — no `marketplace.json` change needed. New skills automatically become available through both the Claude Code plugin marketplace and `npx skills add` — no extra manifest edit required for either.

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

Use `scripts/bump-version.sh` — it syncs all four locations atomically:
- `package.json` `version` (authoritative)
- `.claude-plugin/plugin.json` `version`
- `.claude-plugin/marketplace.json` `source.ref` (vX.Y.Z) ← **critical for auto-update**
- `README.md` version badge

```bash
# patch: x.x.N — fixes
# minor: x.N.0 — new skills
# major: N.0.0 — breaking changes
bash scripts/bump-version.sh patch   # or minor / major / explicit X.Y.Z
```

The script prints the exact follow-up `git start release` / `git c` / `git finish -y` commands.
It does NOT commit or tag — that is owned by git-flow `git finish`.

> **Why `marketplace.json` `source.ref` matters:** Claude Code resolves the version string at the
> pinned ref to detect updates. If `source.ref` stays on the old tag, `marketplace update` is a
> no-op for all consumers. The script always bumps this field so auto-update works correctly.

## Tracking gotcha

Files can exist on disk but be untracked by git. Before closing an issue about file existence, verify with `git ls-files <path>` — not just a filesystem check.
