---
name: build-filter
description: Run dart build_runner optimally on a specific feature or file path. Supports targeted codegen with --build-filter, watch mode for active development, --define for per-build builder overrides, and --workspace for Melos monorepos. Use when you've modified @riverpod, @JsonSerializable, or other annotated code and need to regenerate .g.dart files efficiently.
user-invocable: false
disable-model-invocation: true
---

> **Deprecated (v3.9.0).** This skill is no longer invocable — kept on disk, not deleted, because the
> [Known failure mode](#known-failure-mode-1-345-deleted-gdart-files) below (`#41`, 345 unrelated `.g.dart`
> files silently deleted by a filtered build) and the guard-script mitigation are still real, still worth
> reading, and still worth reusing by hand. Everything below this notice is preserved verbatim.
>
> Run `--build-filter` manually instead — never combined with `--delete-conflicting-outputs` (see
> [Why no `--delete-conflicting-outputs`](#why-no---delete-conflicting-outputs) below) — and keep the `#41`
> caveat in mind: even alone, `--build-filter` can silently delete out-of-scope `.g.dart` files after a
> large batch of edits. The guard scripts (`scripts/guarded-build.sh` / `.ps1`) still work standalone if you
> want the pre-flight/snapshot-diff protection without the skill wrapper:
> ```bash
> bash skills/build-filter/scripts/guarded-build.sh --cwd "<package-dir>" --build-filter="<path>"
> ```

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

4. Run the filtered build from the package working directory through the guard script — **without** `--delete-conflicting-outputs`:

   ```bash
   bash <toolkit-root>/skills/build-filter/scripts/guarded-build.sh \
     --cwd "<package-working-dir>" \
     --build-filter="<normalized-path>" \
     [--build-filter="<other-path>" ...]
   ```

   On Windows/PowerShell, use the companion script instead:

   ```powershell
   & <toolkit-root>/skills/build-filter/scripts/guarded-build.ps1 `
     -Cwd "<package-working-dir>" `
     -BuildFilter "<normalized-path>" [-BuildFilter "<other-path>" ...]
   ```

   The script does three things a bare `dart run build_runner build --build-filter=...` does not (see [Known failure mode](#known-failure-mode-1-345-deleted-gdart-files) below):
   - **Pre-flight escalation**: if more than 10 `.dart` files are modified/untracked in the working tree, it skips the filter and runs a full unfiltered build instead — the cached asset graph is likely stale enough that a filtered build is unsafe.
   - **Before/after `.g.dart` snapshot diff**: any `.g.dart` deleted outside the filtered scope is reported loudly with a restore command. It never auto-restores.
   - Still never passes `--delete-conflicting-outputs`.

5. Confirm which `.g.dart` files were regenerated (list them), and check the script's exit code — non-zero means it detected out-of-scope deletions.
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
- **Not covered by the guard script** — `watch` runs the same filtered codegen and carries the same [known failure mode](#known-failure-mode-1-345-deleted-gdart-files) as `build`, but a long-running process has no natural "before/after" to diff. After any extended `watch` session (many files touched across the run), run an unfiltered `dart run build_runner build` as a safety net before trusting the generated output.

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

**Never combine `--delete-conflicting-outputs` with `--build-filter`.** (The flag itself is fine — even routine — for a full, unfiltered `build_runner build`; it's the combination with `--build-filter` that's unsafe.)

## Known failure mode: 345 deleted `.g.dart` files (#41)

Filtered builds are **not** guaranteed safe even without `--delete-conflicting-outputs`. Observed in production (build_runner 4.0.2, Dart 3.10.1): after ~30 source files were edited across a session (no `@riverpod`/`@JsonSerializable` *signature* changes, only bodies/annotations), a `--build-filter` build scoped to 3 files completed and logged only `"wrote 6 outputs"` — no warnings, no mention of deletions. `git status` looked clean immediately after. Minutes later, `git status` showed **345 unrelated `.g.dart` files deleted** project-wide, scattered across unrelated features.

Working theory (unconfirmed against build_runner internals): with many source files changed since the last full build, the cached asset graph considers many outputs "stale" relative to their inputs. Because `--build-filter` scopes the *rebuild* to a few files, build_runner may delete the stale-but-out-of-scope outputs without regenerating them, deferring regeneration to a future non-filtered run — without surfacing this anywhere in its logs.

**This means an agent following a bare `--build-filter` command has no visible signal that anything went wrong.** That's why step 4 above routes through `guarded-build.sh` / `.ps1` instead of a bare `dart run build_runner build --build-filter=...`: the script snapshots `.g.dart` state before and after, escalates to a full build when the working tree has accumulated too many edits, and reports (never auto-fixes) any out-of-scope deletion.

If `.g.dart` files are gitignored in the target project, a silent deletion is **unrecoverable** — the guard script's `find`-based snapshot still detects and reports it, but there is no `git checkout --` to fall back on. Recommend committing generated files, or budgeting for a full rebuild after any batch of wide-reaching edits.

## Note on `--release`

`--release` is a flag for `webdev build` (compiles to optimized JS), **not** for `dart run build_runner build`. Pure Dart code generation has no release/debug split — generated `.g.dart` files are identical regardless. Do not pass `--release` to build_runner.

## Notes

- Multiple filters: repeat `--build-filter` flag
- Glob patterns supported: `lib/src/features/foo/**`
- If the user doesn't provide a path, ask which feature/file they just edited
- For Melos scripts targeting packages with `build_runner`, use `packageFilters.dependsOn: build_runner` to avoid running codegen on unrelated packages
- `scripts/guarded-build.sh` and `scripts/guarded-build.ps1` must stay functionally identical — when editing one, mirror the change in the other

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
