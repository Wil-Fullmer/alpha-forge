param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("claude", "codex")]
  [string]$From,

  [Parameter(Mandatory = $true)]
  [ValidateSet("claude", "codex")]
  [string]$To
)

$ErrorActionPreference = "Stop"

if ($From -eq $To) {
  throw "From and To are the same ('$From'). Choose different endpoints."
}

Write-Host "Preparing handoff: $From -> $To" -ForegroundColor Cyan

# Close current side cleanly (fast-path if nothing changed is handled in session-end).
& powershell -ExecutionPolicy Bypass -File "scripts/session-end.ps1" -Agent $From
if ($LASTEXITCODE -ne 0) {
  throw "session-end failed for $From"
}

if ($To -eq "codex") {
  Write-Host "Launching Codex with automatic start/end wrapper..." -ForegroundColor Cyan
  & powershell -ExecutionPolicy Bypass -File "scripts/codex-auto.ps1"
  exit $LASTEXITCODE
}

# To Claude: pre-run session-start so context/checks are already fresh.
Write-Host "Pre-running shared session start checks for Claude..." -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File "scripts/session-start.ps1"
if ($LASTEXITCODE -ne 0) {
  throw "session-start precheck failed for Claude handoff"
}

Write-Host "Claude handoff prepared. Open Claude now." -ForegroundColor Green
