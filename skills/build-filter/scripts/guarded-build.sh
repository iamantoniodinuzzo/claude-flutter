#!/usr/bin/env bash
# guarded-build.sh — runs `dart run build_runner build --build-filter=...` with a safety
# net against issue #41: a filtered build can silently delete unrelated .g.dart files
# when the cached asset graph is far out of date, and build_runner reports a clean
# success with no warning about it.
#
# Usage:
#   guarded-build.sh --cwd <package-dir> --build-filter="<glob>" [--build-filter="<glob>" ...]
#
# What it does:
#   1. Pre-flight — if more than PREFLIGHT_THRESHOLD (default 10) .dart files are
#      modified/untracked in the working tree, the asset graph is likely stale enough
#      that a filtered build is unsafe. Skip the filter entirely and run a full
#      unfiltered build instead.
#   2. Snapshot every *.g.dart path in the working tree before the build.
#   3. Run the filtered build (never with --delete-conflicting-outputs).
#   4. Re-snapshot and diff. Any *.g.dart that disappeared and does NOT match one of
#      the supplied --build-filter globs is a violation: report it loudly with the
#      exact restore command. Never auto-restore.
#
# Testing hook: set GUARDED_BUILD_CMD to override the actual `dart run build_runner`
# invocation (used to simulate deletions without a Flutter/Dart toolchain — see the
# skill's verification suite).
#
# Companion: guarded-build.ps1 (PowerShell). Keep both in sync on every edit.

set -uo pipefail

CWD=""
FILTERS=()
PREFLIGHT_THRESHOLD="${PREFLIGHT_THRESHOLD:-10}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cwd)
      CWD="$2"; shift 2 ;;
    --cwd=*)
      CWD="${1#--cwd=}"; shift ;;
    --build-filter=*)
      FILTERS+=("${1#--build-filter=}"); shift ;;
    --build-filter)
      FILTERS+=("$2"); shift 2 ;;
    *)
      echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$CWD" ]]; then
  echo "Usage: $0 --cwd <package-dir> --build-filter=\"<glob>\" [--build-filter=\"<glob>\" ...]" >&2
  exit 1
fi

if [[ ! -d "$CWD" ]]; then
  echo "Error: working directory not found: $CWD" >&2
  exit 1
fi

cd "$CWD"

# Translate a build_runner glob (supports ** and *) into a shell extglob-free match.
path_matches_filter() {
  local path="$1" f
  for f in "${FILTERS[@]}"; do
    case "$path" in
      $f) return 0 ;;
    esac
  done
  return 1
}

# --- 1. Pre-flight: escalate to a full build if too much has changed since last build ---
EDITED_COUNT=$(git status --porcelain -- '*.dart' 2>/dev/null | wc -l | tr -d ' ')
EDITED_COUNT="${EDITED_COUNT:-0}"

if [[ "$EDITED_COUNT" -gt "$PREFLIGHT_THRESHOLD" ]]; then
  echo "⚠️  $EDITED_COUNT .dart files modified/untracked (> $PREFLIGHT_THRESHOLD) since last build."
  echo "    Cached asset graph is likely stale relative to the filtered scope (see issue #41)."
  echo "    Escalating to a full unfiltered build instead of --build-filter."
  if [[ -n "${GUARDED_BUILD_CMD:-}" ]]; then
    eval "$GUARDED_BUILD_CMD"
  else
    dart run build_runner build
  fi
  exit $?
fi

# --- 2. Snapshot .g.dart paths before the build (works regardless of gitignore state) ---
BEFORE=$(find . -name '*.g.dart' -type f 2>/dev/null | sed 's|^\./||' | sort)

# --- 3. Run the filtered build ---
FILTER_ARGS=()
for f in "${FILTERS[@]}"; do
  FILTER_ARGS+=(--build-filter="$f")
done

if [[ -n "${GUARDED_BUILD_CMD:-}" ]]; then
  eval "$GUARDED_BUILD_CMD"
  BUILD_STATUS=$?
else
  dart run build_runner build "${FILTER_ARGS[@]}"
  BUILD_STATUS=$?
fi

# --- 4. Snapshot after & diff, regardless of build exit code ---
AFTER=$(find . -name '*.g.dart' -type f 2>/dev/null | sed 's|^\./||' | sort)

DELETED=$(comm -23 <(echo "$BEFORE") <(echo "$AFTER") | sed '/^$/d')

VIOLATIONS=()
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  if ! path_matches_filter "$path"; then
    VIOLATIONS+=("$path")
  fi
done <<< "$DELETED"

if [[ "${#VIOLATIONS[@]}" -gt 0 ]]; then
  echo ""
  echo "🚨 build-filter guard: ${#VIOLATIONS[@]} .g.dart file(s) deleted OUTSIDE the filtered scope."
  echo "   This is the failure mode from issue #41 — build_runner did not report it."
  echo ""
  TRACKED_RESTORE=()
  UNTRACKED_LOST=()
  for path in "${VIOLATIONS[@]}"; do
    if git ls-files --error-unmatch -- "$path" >/dev/null 2>&1; then
      TRACKED_RESTORE+=("$path")
    else
      UNTRACKED_LOST+=("$path")
    fi
  done
  if [[ "${#TRACKED_RESTORE[@]}" -gt 0 ]]; then
    echo "   Tracked in git — restore with:"
    echo "     git checkout -- ${TRACKED_RESTORE[*]}"
  fi
  if [[ "${#UNTRACKED_LOST[@]}" -gt 0 ]]; then
    echo "   NOT tracked in git — unrecoverable from git. Run a full unfiltered build:"
    for path in "${UNTRACKED_LOST[@]}"; do
      echo "     - $path"
    done
    echo "     dart run build_runner build"
  fi
  echo ""
  echo "   No automatic restore was performed."
  exit 1
fi

exit "$BUILD_STATUS"
