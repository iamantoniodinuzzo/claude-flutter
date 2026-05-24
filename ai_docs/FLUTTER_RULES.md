# Flutter Rules

Rules applied when working on Flutter/Dart code in target projects using this toolkit.

## Riverpod v3

The `riverpod-reviewer` agent enforces these — apply when editing any provider code:

- `ref.watch()` inside `build()` only; `ref.read()` in callbacks/handlers only
- `class FooNotifier extends Notifier<T>` generates `fooProvider` (not `fooNotifierProvider`)
- Function providers use `Ref ref` — all `FooRef` subclasses removed in v3
- Any `ref.watch(provider)` that uses only one field must use `.select()`
- All `AsyncValue` must handle data/loading/error; avoid naked `.value!`

## Codegen: `build-filter` vs full rebuild

Never run `dart run build_runner build --delete-conflicting-outputs` on the whole project. Use `/build-filter <path>` instead: it deletes stale `.g.dart` for the target path, then runs `--build-filter` without touching the rest.

## `dart analyze` scoping

Always scope to the feature path:

```bash
dart analyze lib/src/features/FEATURE   # ~30s
# NOT: dart analyze                     # 5-15 min, often times out
```

On Windows, filter output by feature name (not path with `/`) because `dart analyze` outputs backslash paths.

## GoRouter web rules

- `push()` does **not** update the browser URL in go_router v11.1.2+ — always use `go`/`goNamed` for deep-linkable screens.
- The default AppBar back button does not trigger GoRouter URL updates — override `leading` with an explicit `BackButton` that calls `context.goNamed(parentRoute)`.
- Multiple `Scaffold`s → consolidate into one outer Scaffold so the back button override lives in one place.

## Logging format standard

```
[feature][layer] operation – key1=value1, key2=value2
```

Levels: `t()` trace · `d()` debug · `i()` info · `w()` warning · `e()` error · `f()` fatal

`AsyncErrorLogger` handles errors from async providers automatically — never log errors inside async providers.

## Testing conventions

**Unit tests** (`unit-test` skill):
- Mocktail exclusively (never mockito)
- `ProviderContainer.test(overrides: [...])` for Riverpod 3.x
- Mirror `lib/` under `test/src/` exactly
- Pre-stub non-nullable mock returns in `setUp()` before test-specific stubs
- Never mix `verify()` and `verifyInOrder()` on the same mock in one test

**Widget tests** (`generate-widget-tests` skill):
- Robot Testing pattern — finders always private, always Key-based (`find.byKey`)
- Never `find.text(...)` or `find.byTooltip(...)` (breaks with i18n)
- `pumpAndSettle()` forbidden when an infinite animation is in the tree
- Keys as `static const` on the widget class; top-level for private widget classes
