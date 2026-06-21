#!/usr/bin/env bash
# maestro-audit-ids.sh — find interactive widgets missing Semantics(identifier:) in a feature
#
# Usage: bash maestro-audit-ids.sh <feature-path>
# Example: bash maestro-audit-ids.sh lib/src/features/auth/presentation
#
# Read-only: does not modify any files.

set -euo pipefail

FEATURE_PATH="${1:-}"

if [[ -z "$FEATURE_PATH" ]]; then
  echo "Usage: $0 <feature-path>"
  echo "Example: $0 lib/src/features/auth/presentation"
  exit 1
fi

if [[ ! -d "$FEATURE_PATH" ]]; then
  echo "Error: directory not found: $FEATURE_PATH"
  exit 1
fi

echo "=========================================="
echo "Maestro ID audit — $FEATURE_PATH"
echo "=========================================="
echo ""

# --- 1. Interactive widgets without Semantics(identifier:) ---

INTERACTIVE_PATTERN='InkWell|GestureDetector|ElevatedButton|FilledButton|OutlinedButton|TextButton|IconButton|ListTile|TextField|TextFormField|FloatingActionButton|BottomNavigationBarItem|NavigationRailDestination|NavigationBarDestination|Checkbox|Switch|Radio|Slider'

echo "-- Interactive widgets (candidates for Semantics(identifier:)) --"
echo ""

FOUND=0
while IFS= read -r -d '' file; do
  # Find lines with interactive widgets
  matches=$(grep -nE "$INTERACTIVE_PATTERN" "$file" 2>/dev/null || true)
  if [[ -z "$matches" ]]; then
    continue
  fi

  # Check if the file has ANY Semantics(identifier: — if not, all matches are candidates
  has_semantics=$(grep -c "Semantics(identifier:" "$file" 2>/dev/null || echo "0")

  while IFS= read -r match_line; do
    line_num=$(echo "$match_line" | cut -d: -f1)
    line_content=$(echo "$match_line" | cut -d: -f2-)

    # Check if within ~5 lines above there is a Semantics(identifier: wrapper
    start_line=$(( line_num > 5 ? line_num - 5 : 1 ))
    context=$(sed -n "${start_line},${line_num}p" "$file" 2>/dev/null || true)
    near_semantics=$(echo "$context" | grep -c "Semantics(identifier:" || true)

    if [[ "$near_semantics" -eq 0 ]]; then
      echo "  MISSING  $file:$line_num  →  $(echo "$line_content" | sed 's/^[[:space:]]*//')"
      FOUND=$(( FOUND + 1 ))
    fi
  done <<< "$matches"
done < <(find "$FEATURE_PATH" -name "*.dart" ! -name "*.g.dart" ! -name "*.freezed.dart" -print0)

if [[ "$FOUND" -eq 0 ]]; then
  echo "  All interactive widgets appear to have Semantics(identifier:) nearby."
else
  echo ""
  echo "  Total missing: $FOUND"
  echo "  Add Semantics(identifier: '<feature>_<element>_<role>') around each."
  echo "  See: skills/maestro-screenshot-flow/reference/selectors.md"
fi

echo ""

# --- 2. appId ---

echo "-- appId --"
BUILD_GRADLE="android/app/build.gradle.kts"
if [[ -f "$BUILD_GRADLE" ]]; then
  grep "applicationId" "$BUILD_GRADLE" | sed 's/^[[:space:]]*/  /'
else
  echo "  android/app/build.gradle.kts not found — run from app root"
fi

echo ""

# --- 3. Device connesso ---

echo "-- Devices connessi --"
ADB_PATHS=(
  "$HOME/AppData/Local/Android/Sdk/platform-tools/adb"
  "/c/Users/$USER/AppData/Local/Android/Sdk/platform-tools/adb"
  "adb"
)
ADB_CMD=""
for p in "${ADB_PATHS[@]}"; do
  if command -v "$p" &>/dev/null 2>&1 || [[ -x "$p" ]]; then
    ADB_CMD="$p"
    break
  fi
done

if [[ -n "$ADB_CMD" ]]; then
  "$ADB_CMD" devices 2>/dev/null | sed 's/^/  /' || echo "  adb not responding"
else
  echo "  adb not found — add Android SDK platform-tools to PATH"
fi

echo ""

# --- 4. Firebase emulator reminder ---

echo "-- Firebase emulator reminder (flavor .dev) --"
echo "  If appId ends in .dev, start emulators before running Maestro:"
echo "  firebase emulators:start --project <project-id> \\"
echo "    --config apps/<app>/firebase.json --import apps/<app>/seed/data"
echo ""
echo "=========================================="
