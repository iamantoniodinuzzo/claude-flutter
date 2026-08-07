#!/usr/bin/env bash
# session-evidence.sh — dispatcher for session-evidence.js, which does the actual
# transcript parsing (needs a real JSON parser to correctly pair tool_result blocks back
# to the tool_use call that produced them — see that file's header for why the logic
# lives there and not here).
#
# Usage:
#   session-evidence.sh [--transcript <path-to-jsonl>]
#
# Companion: session-evidence.ps1 (PowerShell). Both dispatch to session-evidence.js —
# there is no separate parsing logic to keep in sync, only argument passing.

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "no transcript found (node not available)"
  exit 0
fi

node "$DIR/session-evidence.js" "$@"
