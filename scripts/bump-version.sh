#!/usr/bin/env sh
# scripts/bump-version.sh
#
# Atomically bump version in all four locations that must stay in sync:
#   package.json              (authoritative source)
#   .claude-plugin/plugin.json  version field
#   .claude-plugin/marketplace.json  source.ref  (vX.Y.Z)
#   README.md                 version badge
#
# Usage:
#   bash scripts/bump-version.sh patch      # x.x.N
#   bash scripts/bump-version.sh minor      # x.N.0
#   bash scripts/bump-version.sh major      # N.0.0
#   bash scripts/bump-version.sh 3.2.0      # explicit version
#
# The script does NOT commit or tag — that is owned by git-flow:
#   git start release v<version>
#   git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json README.md
#   git c                       # chore(release): bump version to <version>
#   git finish -y               # merges master+develop, tags v<version>, pushes, deletes branch

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

PLUGIN_JSON="$REPO_ROOT/.claude-plugin/plugin.json"
MARKETPLACE_JSON="$REPO_ROOT/.claude-plugin/marketplace.json"
PKG_JSON="$REPO_ROOT/package.json"
README="$REPO_ROOT/README.md"

# ── 1. Validate argument ──────────────────────────────────────────────────────
if [ $# -ne 1 ]; then
  echo "Usage: $0 patch|minor|major|<X.Y.Z>" >&2
  exit 1
fi

LEVEL="$1"

# ── 2. Bump package.json (npm handles semver arithmetic) ─────────────────────
cd "$REPO_ROOT"

if echo "$LEVEL" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  # Explicit version — npm version accepts raw semver strings too
  npm version "$LEVEL" --no-git-tag-version --allow-same-version >/dev/null
else
  case "$LEVEL" in
    patch|minor|major) npm version "$LEVEL" --no-git-tag-version >/dev/null ;;
    *)
      echo "Error: argument must be patch, minor, major, or X.Y.Z — got '$LEVEL'" >&2
      exit 1
      ;;
  esac
fi

NEW_VER="$(node -p "require('./package.json').version")"
NEW_REF="v${NEW_VER}"

echo "Bumping to ${NEW_VER} …"

# ── 3. Sync .claude-plugin/plugin.json ───────────────────────────────────────
# Replaces any "version": "<anything>" line
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VER}\"/" "$PLUGIN_JSON"
rm -f "${PLUGIN_JSON}.bak"

# ── 4. Sync .claude-plugin/marketplace.json source.ref ───────────────────────
# This is the step that fixes auto-update: consumers resolve the version string
# at this ref; if it stays on the old tag, marketplace update is a no-op.
sed -i.bak "s/\"ref\": \"v[^\"]*\"/\"ref\": \"${NEW_REF}\"/" "$MARKETPLACE_JSON"
rm -f "${MARKETPLACE_JSON}.bak"

# ── 5. Sync README.md version badge ──────────────────────────────────────────
# Badge format: version-X.Y.Z-blue
sed -i.bak "s/version-[0-9][^-]*-blue/version-${NEW_VER}-blue/" "$README"
rm -f "${README}.bak"

# ── 6. Verify all four locations now agree ───────────────────────────────────
PKG_VER="$(node -p "require('./package.json').version")"
PLUGIN_VER="$(grep '"version"' "$PLUGIN_JSON" | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')"
MKT_REF="$(grep '"ref"' "$MARKETPLACE_JSON" | head -1 | sed 's/.*"ref": "v\([^"]*\)".*/\1/')"
README_VER="$(grep -oE 'version-[0-9]+\.[0-9]+\.[0-9]+-blue' "$README" | head -1 | sed 's/version-//;s/-blue//')"

MISMATCH=0
for LABEL_VAL in "package.json:$PKG_VER" "plugin.json:$PLUGIN_VER" "marketplace.json ref:$MKT_REF" "README badge:$README_VER"; do
  LABEL="${LABEL_VAL%%:*}"
  VAL="${LABEL_VAL#*:}"
  if [ "$VAL" != "$NEW_VER" ]; then
    echo "  ✗ ${LABEL} = '${VAL}' (expected '${NEW_VER}')" >&2
    MISMATCH=1
  fi
done

if [ "$MISMATCH" -eq 1 ]; then
  echo "Version sync failed — see above." >&2
  exit 1
fi

echo "  ✓ package.json            ${NEW_VER}"
echo "  ✓ plugin.json             ${NEW_VER}"
echo "  ✓ marketplace.json ref    ${NEW_REF}"
echo "  ✓ README badge            ${NEW_VER}"
echo ""
echo "Next steps (release lifecycle):"
echo "  git start release ${NEW_REF}"
echo "  # edit CHANGELOG.md — add ## [${NEW_VER}] section WITHOUT a date"
echo "  git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json README.md CHANGELOG.md"
echo "  git c   # chore(release): bump version to ${NEW_VER}"
echo "  git finish -y"
