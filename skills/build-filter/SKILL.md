---
name: build-filter
description: Run dart build_runner optimally on a specific feature or file path. Supports targeted codegen with --build-filter, watch mode for active development, --define for per-build builder overrides, and --workspace for Melos monorepos. Use when you've modified @riverpod, @JsonSerializable, or other annotated code and need to regenerate .g.dart files efficiently.
user-invocable: true
---

Run `dart run build_runner` using the best combination of flags for the user's workflow — targeted with `--build-filter`, continuous with `watch`, or full-project. Auto-detects the package working directory from `melos.yaml`.

## When to use `build` vs `watch`

| Scenario | Command |
|---|---|
| Finished editing, need fresh `.g.dart` before test/run | `build` |
| Actively developing: many `@riverpod`/`@JsonSerializable` changes in sequence | `watch` |
| CI / pre-commit hook | **always** `build` |
| Want instant feedback on every save | `watch` |

## Working directory — melos auto-detect

1. If the user provides an absolute path that includes a package root → use that root directly.
2. Else: look for `melos.yaml` at the project root (or walk up from CWD).
   - Parse the `packages:` glob list (e.g. `apps/**`, `packages/**`).
   - Expand the globs to find actual package directories (those containing a `pubspec.yaml`).
   - Match the given input path against those package dirs — the deepest match is the working directory.
3. If no `melos.yaml` is found, or no package matches, ask the user to specify the app root.

> **Note:** This toolkit runs in the context of the **target Flutter project**, not the toolkit repo itself. All paths are relative to the target project root.

## Usage examples

```
/build-filter lib/src/features/auth/
  → detects package from melos.yaml, runs build --build-filter on auth/**

/build-filter lib/src/models/user.dart
  → regenerates user.g.dart only

/build-filter apps/my_app/lib/src/features/booking/
  → infers working dir = apps/my_app/

/build-filter --watch lib/src/features/auth/
  → starts watch mode filtered to auth/**
```

## Steps — `build` mode (default)

1. Detect working directory (see melos auto-detect above).
2. Make the path relative to the working directory if it was absolute.
3. Normalize each path to its **output form** for `--build-filter`:
   - `.dart` file (not `.g.dart`) → replace extension with `.g.dart`
     - `lib/src/features/foo/bar.dart` → `lib/src/features/foo/bar.g.dart`
   - Directory → append `**` glob
     - `lib/src/features/foo/` → `lib/src/features/foo/**`
   - Already `.g.dart` or glob → use as-is

   > **Why output form:** `--build-filter` matches **output** file paths, not source paths. Passing `bar.dart` produces 0 outputs; `bar.g.dart` targets the generated file correctly.

4. Run the filtered build from the package working directory — **without** `--delete-conflicting-outputs`:

   ```bash
   dart run build_runner build \
     --build-filter="<normalized-path>" \
     [--build-filter="<other-path>" ...]
   ```

5. Confirm which `.g.dart` files were regenerated (list them).
6. If `--build-filter` produces no output, fall back to a full build scoped to the package (still without `--delete-conflicting-outputs`):

   ```bash
   dart run build_runner build
   ```

## Steps — `watch` mode

When the user requests watch mode or is actively iterating on annotated code:

```bash
dart run build_runner watch \
  --build-filter="<normalized-path>" \
  [--build-filter="<other-path>" ...]
```

- Same `--build-filter` normalization as `build` mode.
- Automatically regenerates on every source file save.
- Stop with: `dart run build_runner stop` (build_runner ≥ 2.14.0).
- **Do not use in CI** — the process never exits.

## Advanced flags

### Builder option overrides (`--define`)

Override individual builder options per-run without modifying `build.yaml`:

```bash
dart run build_runner build \
  --build-filter="lib/src/features/foo/**" \
  --define=json_serializable:explicit_to_json=true \
  --define=riverpod_generator:riverpod_version=2
```

Format: `--define=<builder_name>:<option>=<value>`

### Melos workspace (`--workspace`)

When running from the Melos workspace root to share `.dart_tool/` across packages (avoids duplicate cache):

```bash
dart run build_runner build --workspace \
  --build-filter="<path>"
```

Stable since build_runner 2.14.0. Only relevant when building across multiple packages simultaneously; for single-package builds, omit it.

## Why no `--delete-conflicting-outputs`

`--delete-conflicting-outputs` deletes **all** cached `.g.dart` files project-wide before building. Combined with `--build-filter`, only the filtered subset gets regenerated — every other `.g.dart` goes missing, forcing a full rebuild anyway.

Since build_runner 2.15.0, "selective file writing only when content changes" and deferred deletion mean conflicts are rare without any manual intervention.

**Do not use `--delete-conflicting-outputs` with `--build-filter`.**

## Note on `--release`

`--release` is a flag for `webdev build` (compiles to optimized JS), **not** for `dart run build_runner build`. Pure Dart code generation has no release/debug split — generated `.g.dart` files are identical regardless. Do not pass `--release` to build_runner.

## Notes

- Multiple filters: repeat `--build-filter` flag
- Glob patterns supported: `lib/src/features/foo/**`
- If the user doesn't provide a path, ask which feature/file they just edited
- For Melos scripts targeting packages with `build_runner`, use `packageFilters.dependsOn: build_runner` to avoid running codegen on unrelated packages

## Troubleshooting

**`Conflicting outputs` error after interrupted build:**

Manually delete only the `.g.dart` file(s) for the target you were building, then retry. The delete scope must match **the original argument's type**, never a broader directory-wide sweep just because a derived `.g.dart` happens to be missing:

```bash
# Single file target (including a brand-new file with no .g.dart yet — this is a no-op, not an error)
rm -f lib/src/features/foo/bar.g.dart

# Directory target (only when the original argument was a directory/glob)
find lib/src/features/foo -name "*.g.dart" -delete
```

This is rarely needed with build_runner ≥ 2.15.0 but remains a valid recovery step when the build cache is in an inconsistent state.
