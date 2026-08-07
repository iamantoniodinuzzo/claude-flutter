# guarded-build.ps1 — runs `dart run build_runner build --build-filter=...` with a safety
# net against issue #41: a filtered build can silently delete unrelated .g.dart files
# when the cached asset graph is far out of date, and build_runner reports a clean
# success with no warning about it.
#
# Usage:
#   .\guarded-build.ps1 -Cwd <package-dir> -BuildFilter "<glob>" [-BuildFilter "<glob>" ...]
#
# What it does:
#   1. Pre-flight — if more than $PreflightThreshold (default 10) .dart files are
#      modified/untracked in the working tree, the asset graph is likely stale enough
#      that a filtered build is unsafe. Skip the filter entirely and run a full
#      unfiltered build instead.
#   2. Snapshot every *.g.dart path in the working tree before the build.
#   3. Run the filtered build (never with --delete-conflicting-outputs).
#   4. Re-snapshot and diff. Any *.g.dart that disappeared and does NOT match one of
#      the supplied -BuildFilter globs is a violation: report it loudly with the
#      exact restore command. Never auto-restore.
#
# Testing hook: set $env:GUARDED_BUILD_CMD to override the actual `dart run build_runner`
# invocation (used to simulate deletions without a Flutter/Dart toolchain — see the
# skill's verification suite).
#
# Companion: guarded-build.sh (bash). Keep both in sync on every edit.

param(
    [Parameter(Mandatory = $true)]
    [string]$Cwd,

    [Parameter(Mandatory = $true)]
    [string[]]$BuildFilter,

    [int]$PreflightThreshold = 10
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $Cwd -PathType Container)) {
    Write-Error "Working directory not found: $Cwd"
    exit 1
}

Push-Location $Cwd
try {
    function Test-PathMatchesFilter {
        param([string]$Path, [string[]]$Filters)
        foreach ($f in $Filters) {
            # Translate build_runner glob (** and *) to a regex.
            $pattern = [regex]::Escape($f) -replace '\\\*\\\*', '.*' -replace '\\\*', '[^/]*'
            if ($Path -match "^$pattern$") { return $true }
        }
        return $false
    }

    # --- 1. Pre-flight: escalate to a full build if too much has changed since last build ---
    $editedRaw = git status --porcelain -- '*.dart' 2>$null
    $editedCount = 0
    if ($editedRaw) { $editedCount = ($editedRaw | Measure-Object -Line).Lines }

    if ($editedCount -gt $PreflightThreshold) {
        Write-Host "warning: $editedCount .dart files modified/untracked (> $PreflightThreshold) since last build."
        Write-Host "    Cached asset graph is likely stale relative to the filtered scope (see issue #41)."
        Write-Host "    Escalating to a full unfiltered build instead of --build-filter."
        if ($env:GUARDED_BUILD_CMD) {
            Invoke-Expression $env:GUARDED_BUILD_CMD
        } else {
            dart run build_runner build
        }
        exit $LASTEXITCODE
    }

    # --- 2. Snapshot .g.dart paths before the build (works regardless of gitignore state) ---
    $before = Get-ChildItem -Recurse -Filter '*.g.dart' -File -ErrorAction SilentlyContinue |
        ForEach-Object { (Resolve-Path -Relative $_.FullName) -replace '^\.[\\/]', '' -replace '\\', '/' } |
        Sort-Object

    # --- 3. Run the filtered build ---
    if ($env:GUARDED_BUILD_CMD) {
        Invoke-Expression $env:GUARDED_BUILD_CMD
        $buildStatus = $LASTEXITCODE
    } else {
        $filterArgs = @()
        foreach ($f in $BuildFilter) { $filterArgs += "--build-filter=$f" }
        dart run build_runner build @filterArgs
        $buildStatus = $LASTEXITCODE
    }

    # --- 4. Snapshot after & diff, regardless of build exit code ---
    $after = Get-ChildItem -Recurse -Filter '*.g.dart' -File -ErrorAction SilentlyContinue |
        ForEach-Object { (Resolve-Path -Relative $_.FullName) -replace '^\.[\\/]', '' -replace '\\', '/' } |
        Sort-Object

    $deleted = @($before | Where-Object { $_ -notin $after })

    $violations = @()
    foreach ($path in $deleted) {
        if (-not (Test-PathMatchesFilter -Path $path -Filters $BuildFilter)) {
            $violations += $path
        }
    }

    if ($violations.Count -gt 0) {
        Write-Host ""
        Write-Host "ALERT: build-filter guard: $($violations.Count) .g.dart file(s) deleted OUTSIDE the filtered scope."
        Write-Host "   This is the failure mode from issue #41 - build_runner did not report it."
        Write-Host ""

        $trackedRestore = @()
        $untrackedLost = @()
        foreach ($path in $violations) {
            git ls-files --error-unmatch -- "$path" *>$null
            if ($LASTEXITCODE -eq 0) {
                $trackedRestore += $path
            } else {
                $untrackedLost += $path
            }
        }

        if ($trackedRestore.Count -gt 0) {
            Write-Host "   Tracked in git - restore with:"
            Write-Host "     git checkout -- $($trackedRestore -join ' ')"
        }
        if ($untrackedLost.Count -gt 0) {
            Write-Host "   NOT tracked in git - unrecoverable from git. Run a full unfiltered build:"
            foreach ($path in $untrackedLost) { Write-Host "     - $path" }
            Write-Host "     dart run build_runner build"
        }
        Write-Host ""
        Write-Host "   No automatic restore was performed."
        exit 1
    }

    exit $buildStatus
}
finally {
    Pop-Location
}
