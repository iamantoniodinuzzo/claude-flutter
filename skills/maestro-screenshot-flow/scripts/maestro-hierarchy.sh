#!/usr/bin/env bash
# maestro-hierarchy.sh — dump Maestro accessibility tree, with optional substring filter
#
# Usage:
#   bash maestro-hierarchy.sh           # full dump
#   bash maestro-hierarchy.sh <query>   # filter lines containing <query>
#
# Requires: maestro on PATH (export PATH="$PATH:$HOME/.maestro/bin")
# Run from the app directory (apps/<app_name>/) or anywhere with a device connected.

set -euo pipefail

QUERY="${1:-}"

if ! command -v maestro &>/dev/null; then
  echo "Error: maestro not found on PATH."
  echo "Add to PATH: export PATH=\"\$PATH:\$HOME/.maestro/bin\""
  exit 1
fi

echo "-- Maestro accessibility tree --"
if [[ -n "$QUERY" ]]; then
  echo "   filter: \"$QUERY\""
fi
echo ""

if [[ -n "$QUERY" ]]; then
  maestro hierarchy | grep -i "$QUERY" || echo "(no matches for \"$QUERY\")"
else
  maestro hierarchy
fi
