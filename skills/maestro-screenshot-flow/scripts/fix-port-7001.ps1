# fix-port-7001.ps1 — reset ADB and free port 7001 for Maestro
#
# Symptom: java.util.concurrent.TimeoutException at TcpForwarder.waitFor
# Run from the app root with: pwsh skills/maestro-screenshot-flow/scripts/fix-port-7001.ps1

$AdbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

Write-Host "-- Killing process on port 7001 --"
try {
    $pids = (Get-NetTCPConnection -LocalPort 7001 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique
    if ($pids) {
        foreach ($pid in $pids) {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "  Killed PID $pid"
        }
    } else {
        Write-Host "  No process on port 7001"
    }
} catch {
    Write-Host "  Could not query port 7001: $_"
}

Write-Host ""
Write-Host "-- Clearing ADB forwards --"
if (Test-Path $AdbPath) {
    & $AdbPath forward --remove-all
    Write-Host "  Done"
} else {
    Write-Host "  adb not found at $AdbPath — adjust path if SDK is elsewhere"
    $AdbPath = "adb"
}

Write-Host ""
Write-Host "-- Restarting ADB server --"
& $AdbPath kill-server
& $AdbPath start-server

Write-Host ""
Write-Host "-- Devices after restart --"
& $AdbPath devices

Write-Host ""
Write-Host "Done. Run maestro test again."
