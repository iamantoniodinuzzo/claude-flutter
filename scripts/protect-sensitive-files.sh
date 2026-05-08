#!/usr/bin/env bash
# PreToolUse hook: block edits to sensitive config files.
# Exit code 2 = blocked (Claude will not proceed with the tool call).
INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | node -e \
  "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const o=JSON.parse(d);process.stdout.write(o.tool_input?.file_path||'')}catch(e){}})" \
  2>/dev/null)

BASENAME=$(basename "$FILE_PATH")

case "$BASENAME" in
  .env|.env.local|.env.prod|.env.dev)
    echo "🚫 Blocked: '$FILE_PATH' contains API keys. Edit manually if intentional."
    exit 2
    ;;
  google-services.json|GoogleService-Info.plist)
    echo "🚫 Blocked: '$FILE_PATH' is a Firebase service config. Edit manually if intentional."
    exit 2
    ;;
esac

exit 0
