# generate-widget-tests — Gemini CLI Tool Reference

Maps the Claude Code tool calls used in this skill to Gemini CLI equivalents.

## Tool mapping

| Step | Claude Code | Gemini CLI |
|---|---|---|
| Read widget to test | `Read lib/src/.../foo_screen.dart` | `read_file lib/src/.../foo_screen.dart` |
| Find existing robot file | `Glob test/src/**/*_robot.dart` | `find_files test/src/**/*_robot.dart` |
| Search widget Keys | `Grep "static const.*Key" lib/src/.../foo_screen.dart` | `grep_search "static const.*Key" lib/src/.../foo_screen.dart` |
| Create robot file | `Write test/src/.../foo_robot.dart` | `write_file test/src/.../foo_robot.dart` |
| Create test file | `Write test/src/.../foo_screen_test.dart` | `write_file test/src/.../foo_screen_test.dart` |
| Update existing robot | `Edit` (old→new string) | `replace` (old→new string) |
| Run widget tests | `Bash(flutter test test/src/.../foo_screen_test.dart --reporter=compact)` | `run_shell_command flutter test test/src/.../foo_screen_test.dart --reporter=compact` |

## Key constraints

- Finders: always `find.byKey(Key('...'))` — never `find.text`, `find.byTooltip`
- Keys: `static const` on the widget class; top-level for private widget classes
- Robot class separates: finders (private) · actions · assertions
- Never `pumpAndSettle()` when an infinite animation is in the widget tree
- i18n-safe: no hardcoded strings in finders
