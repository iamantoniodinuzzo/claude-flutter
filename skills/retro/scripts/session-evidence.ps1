# session-evidence.ps1 — dispatcher for session-evidence.js, which does the actual
# transcript parsing (needs a real JSON parser to correctly pair tool_result blocks back
# to the tool_use call that produced them — see that file's header for why the logic
# lives there and not here).
#
# Usage:
#   .\session-evidence.ps1 [-Transcript <path-to-jsonl>] [-Session <id>] [-List] [-ConfigAudit]
#
# -Session / -List forward --session / --list (see session-evidence.js for selection order).
#
# -ConfigAudit forwards --config-audit to session-evidence.js (tune-setup's opt-in
# extended block — retro never passes this, see that file's header for why).
#
# Companion: session-evidence.sh (bash). Both dispatch to session-evidence.js — there is
# no separate parsing logic to keep in sync, only argument passing.

param(
    [ValidateSet('auto', 'claude', 'codex')]
    [string]$Agent = 'auto',
    [string]$Transcript,
    [string]$Session,
    [switch]$List,
    [switch]$ConfigAudit
)

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "no transcript found (node not available)"
    exit 0
}

$nodeArgs = @('--agent', $Agent)
if ($Transcript) { $nodeArgs += @('--transcript', $Transcript) }
if ($Session) { $nodeArgs += @('--session', $Session) }
if ($List) { $nodeArgs += @('--list') }
if ($ConfigAudit) { $nodeArgs += @('--config-audit') }

& node (Join-Path $dir 'session-evidence.js') @nodeArgs
exit $LASTEXITCODE
