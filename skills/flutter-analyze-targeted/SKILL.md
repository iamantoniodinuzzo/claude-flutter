---
name: flutter-analyze-targeted
description: Run dart analyze scoped to a specific feature or file path, returning errors in seconds instead of waiting 10-15 minutes for a full project analyze. Use when you've edited files in a feature and need fast feedback on compile errors and lint issues. Works for both tomcat_portal and pollicino_viewer apps.
user-invocable: true
---

Run `dart analyze` scoped to the path(s) the user specifies, from the correct app working directory.

## Supported apps

| App | Working directory |
|-----|-------------------|
| `tomcat_portal` | `apps/tomcat_portal/` |
| `pollicino_viewer` | `apps/pollicino_viewer/` |

If the user doesn't specify an app, infer it from the path (e.g. paths under `apps/tomcat_portal/` → tomcat_portal).

## Usage examples

- `/flutter-analyze-targeted apps/tomcat_portal/lib/src/features/flight_plan/`
- `/flutter-analyze-targeted apps/pollicino_viewer/lib/src/features/missions/`
- `/flutter-analyze-targeted lib/src/features/orders/` (from inside the app directory)
- `/flutter-analyze-targeted lib/src/features/auth/data/auth_repository.dart`

## Steps

1. Determine the correct `working_directory` (`apps/tomcat_portal` or `apps/pollicino_viewer`)
2. Make the path relative to that working directory
3. Run: `dart analyze <relative-path>` (no extra flags — `--no-fatal-infos` does not exist and causes exit code 64)
4. Filter and report:
   - **Errors** (blocking — must fix before compiling)
   - **Warnings** (should fix)
   - **Infos** (optional, omit unless requested)
5. If zero errors/warnings: confirm clean and list the analyzed path

## Notes

- `dart analyze <path>` only analyzes files under that path — fast and scoped.
- Do NOT use `flutter analyze` for targeted checks; it always scans the whole project.
- The `ReadLints` tool is even faster for files already open in the IDE — prefer it for single-file checks.
- If the user provides a glob (e.g. `flight_plan/**`), expand it to the directory path.
- For multiple disconnected files, run a single `dart analyze` on their common parent directory.
- Pre-existing warnings in unrelated files are noise — filter output to show only the requested path.

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
