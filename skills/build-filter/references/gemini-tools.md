# build-filter — Gemini CLI Tool Reference

Maps the Claude Code tool calls used in this skill to Gemini CLI equivalents.

## Tool mapping

| Step | Claude Code | Gemini CLI |
|---|---|---|
| Delete stale `.g.dart` (file) | `Bash(rm -f lib/src/.../foo.g.dart)` | `run_shell_command rm -f lib/src/.../foo.g.dart` |
| Delete stale `.g.dart` (dir) | `Bash(find lib/src/.../feature/ -name "*.g.dart" -delete)` | `run_shell_command find lib/src/.../feature/ -name "*.g.dart" -delete` |
| Run filtered codegen | `Bash(dart run build_runner build --build-filter="lib/src/.../foo.g.dart")` | `run_shell_command dart run build_runner build --build-filter="lib/src/.../foo.g.dart"` |
| List regenerated files | `Bash(find lib/src/.../feature/ -name "*.g.dart")` | `run_shell_command find lib/src/.../feature/ -name "*.g.dart"` |

## Working directory detection

Must `cd` to the correct app root before running build_runner:

| Path contains | Working directory |
|---|---|
| `apps/tomcat_portal/` | `apps/tomcat_portal/` |
| `apps/pollicino_viewer/` | `apps/pollicino_viewer/` |
| ambiguous | Ask the user |

## Key constraint

Never use `--delete-conflicting-outputs` with `--build-filter` — it wipes all `.g.dart`
project-wide before rebuilding only the filtered subset, forcing a full rebuild.
Delete only the target `.g.dart` files manually before running the filtered build.
