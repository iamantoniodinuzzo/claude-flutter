---
name: flutter-analyze-targeted
description: Run dart analyze scoped to a specific feature or file path for fast targeted feedback (seconds vs full-project minutes). Auto-detects apps from melos.yaml or infers from path. Supports machine-readable output for tooling integration. Use when you've edited files in a feature and need fast feedback on compile errors and lint issues.
user-invocable: true
---

Run `dart analyze` scoped to the path(s) the user specifies, from the correct app working directory.

## App resolution

Resolve the working directory in this order:

1. **Check for `melos.yaml`** in the project root — parse `packages:` globs to enumerate all app/package paths
2. **Infer from the argument path** — match the path prefix against discovered packages
3. **Fallback**: if `melos.yaml` is absent, check if the current directory is a Flutter package (`pubspec.yaml` present) and use it directly
4. **Ask** only if still ambiguous after steps 1–3

Example — `melos.yaml` with:
```yaml
packages:
  - apps/*
  - packages/*
```
→ resolve all dirs matching `apps/*` and `packages/*`; pick the one whose path is a prefix of the argument.

## Usage examples

- `/flutter-analyze-targeted lib/src/features/flight_plan/`
- `/flutter-analyze-targeted lib/src/features/auth/data/auth_repository.dart`
- `/flutter-analyze-targeted lib/src/features/orders/ --fatal-warnings`
- `/flutter-analyze-targeted lib/src/features/missions/ --format machine`

## Steps

1. Resolve working directory via App resolution (above)
2. Make the path relative to that working directory
3. Run: `dart analyze <relative-path>` with any user-requested flags

   **Valid flags** (Dart SDK 3.x):

   | Flag | Effect |
   |------|--------|
   | *(none)* | exit 0 = no issues; exit 1 = issues found |
   | `--fatal-warnings` | treat warnings as fatal (exit 1) |
   | `--fatal-infos` | treat infos as fatal (exit 1) |
   | `--format machine` | structured pipe-delimited output (see below) |

   ❌ `--no-fatal-infos` — does **not** exist; causes exit code 64 (usage error). Do not use.

4. Filter and report:
   - **Errors** (blocking — must fix before compiling)
   - **Warnings** (should fix)
   - **Infos** (optional, omit unless requested)
5. If zero errors/warnings: confirm clean and list the analyzed path

## Machine-readable output

Use `--format machine` for tooling or downstream parsing.

Output — one issue per line:
```
SEVERITY|TYPE|CODE|file/path.dart|line|col|length|message
```

Example:
```
ERROR|COMPILE_TIME_ERROR|UNDEFINED_FUNCTION|lib/src/foo.dart|10|5|3|The function 'bar' isn't defined.
WARNING|STATIC_WARNING|UNUSED_IMPORT|lib/src/foo.dart|1|1|27|Unused import: 'dart:io'.
```

PowerShell parse:
```powershell
$raw = dart analyze --format machine lib/src/features/orders/ 2>&1
$issues = $raw | Where-Object { $_ -match "^(ERROR|WARNING|INFO)" }
$issues | ForEach-Object {
    $parts = $_ -split '\|'
    [PSCustomObject]@{
        Severity = $parts[0]
        Code     = $parts[2]
        File     = $parts[3]
        Line     = $parts[4]
        Message  = $parts[7]
    }
} | Format-Table -AutoSize
```

Bash parse:
```bash
dart analyze --format machine lib/src/features/orders/ 2>&1 |
  awk -F'|' '/^(ERROR|WARNING|INFO)/ { printf "%s  %s:%s  %s\n", $1, $4, $5, $8 }'
```

## Notes

- `dart analyze <path>` only analyzes files under that path — fast and scoped.
- Do NOT use `flutter analyze` for targeted checks; it always scans the whole project.
- The `ReadLints` tool is even faster for files already open in the IDE — prefer it for single-file checks.
- If the user provides a glob (e.g. `flight_plan/**`), expand it to the directory path.
- For multiple disconnected files, run a single `dart analyze` on their common parent directory.
- Pre-existing warnings in unrelated files are noise — filter output to show only the requested path.
- `analysis_options.yaml` controls which rules fire and at what severity. A warning downgraded to `info` there won't be caught by `--fatal-warnings`. Run without `--fatal-*` first to see effective severities.
- `exclude:` globs in `analysis_options.yaml` silence issues in generated files (e.g., `**.g.dart`). If analyze reports 0 issues on a file you expect issues on, check the exclude rules.

## Filtering output (PowerShell / Windows)

**IMPORTANT**: On Windows, `dart analyze` outputs paths with backslashes (`fleet\shared\...`).
Never filter with a forward-slash pattern like `"flight_plan/"` — it will silently match nothing.
Use only the feature/directory name without any trailing slash.

The severity keyword is at the **start** of each issue line (`error - path:line - msg`),
so anchor the pattern to avoid false matches inside paths or messages.

```powershell
$output = dart analyze lib/src/features/flight_plan/ 2>&1
$issues = $output | Where-Object { $_ -match "^(error|warning|hint)" } |
                    Where-Object { $_ -match "flight_plan" }
Write-Host "Issues: $($issues.Count)"
$issues | ForEach-Object { Write-Host $_ }
```

## Filtering output (bash / macOS / Linux)

```bash
dart analyze lib/src/features/flight_plan/ 2>&1 |
  grep -E "^(error|warning|hint)" |
  grep "flight_plan"
```

## Zero-error false positive guard

If the filtered output shows zero errors/warnings after a non-trivial change, cross-check by running
the raw `dart analyze` output without filtering to confirm there are truly no issues in the analyzed path.
This guards against a filter pattern accidentally matching nothing.
