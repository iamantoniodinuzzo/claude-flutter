#!/usr/bin/env bash
# Usage: ./scripts/bump-version.sh --patch | --minor | --major
# Updates version in package.json, .claude-plugin/plugin.json

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [ $# -ne 1 ] || [[ "$1" != "--patch" && "$1" != "--minor" && "$1" != "--major" ]]; then
    echo "Usage: $0 --patch | --minor | --major" >&2
    exit 1
fi

BUMP_TYPE="${1#--}"

CURRENT=$(python3 -c "import json; print(json.load(open('package.json'))['version'])")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP_TYPE" in
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    patch) PATCH=$((PATCH + 1)) ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

update_version() {
    local FILE="$1"
    python3 - "$FILE" "$NEW_VERSION" <<'PYEOF'
import json, sys
path, version = sys.argv[1], sys.argv[2]
with open(path) as f:
    data = json.load(f)
data['version'] = version
with open(path, 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
PYEOF
    echo "  updated $FILE"
}

echo "Bumping $CURRENT → $NEW_VERSION ($BUMP_TYPE)"
update_version "package.json"
update_version ".claude-plugin/plugin.json"
echo "Done. Tag with: git tag v$NEW_VERSION"
