param(
  [string]$TodoPath = "TODO.md",
  [string]$WorklogPath = "docs/WORKLOG.md",
  [string]$SyncScriptPath = "scripts/sync-agents.ps1"
)

$ErrorActionPreference = "Stop"
$today = Get-Date -Format "yyyy-MM-dd"
$ok = $true

function Fail([string]$msg) {
  Write-Host "FAIL: $msg" -ForegroundColor Red
  $script:ok = $false
}

function Pass([string]$msg) {
  Write-Host "OK: $msg" -ForegroundColor Green
}

if (-not (Test-Path $TodoPath)) {
  Fail "Missing $TodoPath"
} else {
  $todo = Get-Content $TodoPath -Raw
  if ($todo -match "Current date:\s*$today") {
    Pass "TODO date is current ($today)"
  } else {
    Fail "TODO date is not current ($today)"
  }
}

if (-not (Test-Path $WorklogPath)) {
  Fail "Missing $WorklogPath"
} else {
  $worklog = Get-Content $WorklogPath -Raw
  if ($worklog -match [regex]::Escape("## $today")) {
    Pass "Worklog has an entry for $today"
  } else {
    Fail "Worklog missing entry for $today"
  }

  # Validate required ownership fields on the latest worklog entry.
  $entries = [regex]::Split($worklog, "(?m)^## ")
  $entries = $entries | Where-Object { $_.Trim().Length -gt 0 }
  if ($entries.Count -eq 0) {
    Fail "Worklog has no entries"
  } else {
    $latest = "## " + $entries[-1]
    if ($latest -match "(?m)^- Owns Next:\s*\S+") {
      Pass "Latest worklog entry includes Owns Next"
    } else {
      Fail "Latest worklog entry missing Owns Next"
    }
    if ($latest -match "(?m)^- Do Not Touch:\s*\S+") {
      Pass "Latest worklog entry includes Do Not Touch"
    } else {
      Fail "Latest worklog entry missing Do Not Touch"
    }
  }
}

if (-not (Test-Path $SyncScriptPath)) {
  Fail "Missing $SyncScriptPath"
} else {
  try {
    & powershell -ExecutionPolicy Bypass -File $SyncScriptPath | Out-Host
    if ($LASTEXITCODE -eq 0) {
      Pass "Agent mirror sync/hash verification passed"
    } else {
      Fail "Agent mirror sync/hash verification failed"
    }
  } catch {
    Fail "Agent mirror sync/hash verification threw: $($_.Exception.Message)"
  }
}

if (-not $ok) {
  exit 1
}

Write-Host "Handoff checks passed." -ForegroundColor Green
