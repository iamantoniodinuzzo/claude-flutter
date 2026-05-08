---
name: build-filter
description: Run dart build_runner on a specific feature or file path using --build-filter, avoiding a full project rebuild. Use when you've modified @riverpod, @JsonSerializable, or other annotated code and need to regenerate only the affected .g.dart files.
user-invocable: true
---

Run `dart run build_runner build` with `--build-filter` targeting only the path(s) the user specifies — **without** `--delete-conflicting-outputs`, which would wipe every `.g.dart` outside the filter scope.

## Working directory

Auto-detect from the path argument:

| Path contains | Working directory |
|---|---|
| `apps/tomcat_portal/` or current dir is `tomcat_portal` | `apps/tomcat_portal/` |
| `apps/pollicino_viewer/` or current dir is `pollicino_viewer` | `apps/pollicino_viewer/` |
| ambiguous / not specified | Ask the user which app |

## Usage examples

- `/build-filter lib/src/features/knowledge_management/` → tomcat_portal
- `/build-filter lib/src/features/scenario_composition/` → pollicino_viewer
- `/build-filter lib/src/features/missions/application/mission_service.dart`
- `/build-filter apps/tomcat_portal/lib/src/features/booking/`

## Steps

1. Determine the working directory from the path (see table above).
2. Make the path relative to the working directory if it was absolute.
3. Normalize each path to its **output form** for `--build-filter`:
   - If the path ends in `.dart` (not `.g.dart`) → replace extension with `.g.dart`
     - `lib/src/features/foo/bar.dart` → `lib/src/features/foo/bar.g.dart`
   - If the path is a directory → append `**` glob
     - `lib/src/features/foo/` → `lib/src/features/foo/**`
   - If the path already ends in `.g.dart` or is a glob → use as-is

   > **Why:** `--build-filter` matches OUTPUT file paths, not source file paths. Passing
   > `bar.dart` produces 0 outputs because no output is named `bar.dart`; passing
   > `bar.g.dart` correctly targets the generated file.

4. Delete only the stale `.g.dart` files for the target(s) to pre-empt conflicts:
   - For a `.g.dart` file target: delete that specific file if it exists

     ```bash
     rm -f <relative-path>.g.dart
     ```

   - For a directory target: delete all `.g.dart` files inside it

     ```bash
     find <relative-path> -name "*.g.dart" -delete
     ```

5. Run the filtered build — **no** `--delete-conflicting-outputs`:

   ```
   dart run build_runner build --build-filter="<normalized-path>" [--build-filter="..." ...]
   ```

6. Confirm which `.g.dart` files were regenerated (list them).
7. If `--build-filter` produces no output, fall back to a full build scoped to the feature directory only (still without `--delete-conflicting-outputs`).

## Why no `--delete-conflicting-outputs` here

`--delete-conflicting-outputs` deletes **all** cached `.g.dart` files project-wide before building. Combined with `--build-filter`, only the filtered subset gets regenerated, leaving every other `.g.dart` missing and forcing a full rebuild anyway. Deleting only the target files in step 3 achieves the same conflict-free result without collateral damage.

## Notes

- `--build-filter` accepts glob patterns: `lib/src/features/foo/**`
- Multiple filters: repeat `--build-filter` flag
- If the user doesn't provide a path, ask which feature they just edited
