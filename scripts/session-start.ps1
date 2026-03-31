param(
  [string]$WorklogPath = "docs/WORKLOG.md",
  [string]$HandoffCheckPath = "scripts/handoff-check.ps1"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Session Start ===" -ForegroundColor Cyan

try {
  $branch = git branch --show-current
  Write-Host "Branch: $branch"
} catch {
  Write-Host "Branch: (unable to determine)" -ForegroundColor Yellow
}

try {
  $status = git status --short
  if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "Git status: clean"
  } else {
    Write-Host "Git status: dirty"
    $status
  }
} catch {
  Write-Host "Git status: (unable to determine)" -ForegroundColor Yellow
}

if (Test-Path $WorklogPath) {
  $worklog = Get-Content $WorklogPath -Raw
  $entries = [regex]::Split($worklog, "(?m)^## ") | Where-Object { $_.Trim().Length -gt 0 }
  if ($entries.Count -gt 0) {
    $latest = "## " + $entries[-1].TrimEnd()
    Write-Host "`nLatest handoff entry:" -ForegroundColor Cyan
    Write-Host $latest

    $owns = [regex]::Match($latest, "(?m)^- Owns Next:\s*(.+)$")
    $dont = [regex]::Match($latest, "(?m)^- Do Not Touch:\s*(.+)$")
    if ($owns.Success) {
      Write-Host "`nActive ownership: $($owns.Groups[1].Value)" -ForegroundColor Green
    }
    if ($dont.Success) {
      Write-Host "Out of scope: $($dont.Groups[1].Value)" -ForegroundColor Yellow
    }
  } else {
    Write-Host "No worklog entries found in $WorklogPath" -ForegroundColor Yellow
  }
} else {
  Write-Host "Worklog not found: $WorklogPath" -ForegroundColor Yellow
}

if (-not (Test-Path $HandoffCheckPath)) {
  throw "Missing handoff check script: $HandoffCheckPath"
}

Write-Host "`nRunning handoff checks..." -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File $HandoffCheckPath
if ($LASTEXITCODE -ne 0) {
  throw "Handoff checks failed"
}

Write-Host "Session start complete." -ForegroundColor Green
