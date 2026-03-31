param(
  [string]$CodexCommand = "codex",
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$CodexArgs
)

$ErrorActionPreference = "Stop"

function Run-IfExists([string]$path, [string[]]$args) {
  if (Test-Path $path) {
    & powershell -ExecutionPolicy Bypass -File $path @args
    return $LASTEXITCODE
  }
  return 0
}

$startScript = "scripts/session-start.ps1"
$endScript = "scripts/session-end.ps1"

Write-Host "Bootstrapping Codex session..." -ForegroundColor Cyan
$startExit = Run-IfExists $startScript @()
if ($startExit -ne 0) {
  throw "Session start checks failed. Fix issues before launching Codex."
}

$codexExit = 0
try {
  & $CodexCommand @CodexArgs
  $codexExit = $LASTEXITCODE
} catch {
  Write-Host "Codex launch failed: $($_.Exception.Message)" -ForegroundColor Red
  $codexExit = 1
} finally {
  Write-Host "Finalizing Codex session..." -ForegroundColor Cyan
  $endExit = Run-IfExists $endScript @("-Agent", "codex")
  if ($endExit -ne 0) {
    Write-Host "Session end checks failed. Review handoff state." -ForegroundColor Red
    if ($codexExit -eq 0) {
      $codexExit = $endExit
    }
  }
}

exit $codexExit
