# unit-test-claude — Gemini CLI Tool Reference

Maps the Claude Code tool calls used in this skill to Gemini CLI equivalents.

## Tool mapping

| Step | Claude Code | Gemini CLI |
|---|---|---|
| Read source file to test | `Read lib/src/.../foo.dart` | `read_file lib/src/.../foo.dart` |
| Find existing test file | `Glob test/src/**/*_test.dart` | `find_files test/src/**/*_test.dart` |
| Search for provider/class usage | `Grep "class FooNotifier" lib/` | `grep_search "class FooNotifier" lib/` |
| Create new test file | `Write test/src/.../foo_test.dart` | `write_file test/src/.../foo_test.dart` |
| Update existing test | `Edit` (old→new string) | `replace` (old→new string) |
| Run tests for one file | `Bash(flutter test test/src/.../foo_test.dart --reporter=compact)` | `run_shell_command flutter test test/src/.../foo_test.dart --reporter=compact` |
| Run tests for feature | `Bash(flutter test test/src/features/FEATURE/ --reporter=compact)` | `run_shell_command flutter test test/src/features/FEATURE/ --reporter=compact` |
| Read pattern reference | `Read skills/unit-test-claude/patterns/foo.md` | `read_file skills/unit-test-claude/patterns/foo.md` |

## Pattern files

Before writing complex Riverpod tests, read the relevant pattern:

| Scenario | Pattern file |
|---|---|
| Async providers with error paths | `patterns/future-provider-error-paths.md` |
| Stream provider overrides | `patterns/stream-provider-overrides.md` |
| Notifier with stream deps | `patterns/notifier-with-stream-deps.md` |
| Non-nullable mock pre-stubbing | `patterns/prestub-nonnullable-returns.md` |
| verify vs verifyInOrder | `patterns/verify-verifyinorder-antipattern.md` |

## Key constraints

- Test mirror: `lib/src/features/X/` → `test/src/features/X/`
- Import: `package:mocktail/mocktail.dart` (never mockito)
- Riverpod container: `ProviderContainer.test(overrides: [...])`
- Target ≥80% coverage per file
