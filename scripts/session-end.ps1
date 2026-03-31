param(
  [string]$Agent = "codex",
  [string]$WorklogPath = "docs/WORKLOG.md",
  [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $WorklogPath)) {
  throw "Worklog not found: $WorklogPath"
}

$statusLines = (& git status --porcelain 2>$null)
$changed = @($statusLines | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })

# Efficiency fast-path: no workspace changes, no handoff write needed.
if ($changed.Count -eq 0) {
  Write-Host "No workspace changes detected. Skipping worklog append." -ForegroundColor Yellow
  if (-not $SkipChecks) {
    & powershell -ExecutionPolicy Bypass -File "scripts/handoff-check.ps1"
  }
  exit 0
}

$branch = ((& git branch --show-current 2>$null) -join "")
if ([string]::IsNullOrWhiteSpace($branch)) {
  $branch = "(unknown)"
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$tz = "America/Denver"

$filesTouched = @()
foreach ($line in $changed) {
  if ($line.Length -ge 4) {
    $path = $line.Substring(3).Trim()
    if (-not [string]::IsNullOrWhiteSpace($path)) {
      $filesTouched += $path
    }
  }
}
$filesTouched = $filesTouched | Select-Object -Unique

$ownsNext = ($filesTouched -join ", ")
$doNotTouch = "files outside Owns Next, unless explicitly required for dependency fixes"

$entry = @"

## $timestamp ($tz) - $Agent
- Branch: $branch
- Objective: auto-generated handoff for current workspace changes
- Decisions: auto-captured from git state; refine manually if nuanced decisions were made
- Open Questions: none captured automatically
- Next Step: continue work on owned files and refine this handoff entry if needed
- Owns Next: $ownsNext
- Do Not Touch: $doNotTouch
- Files Touched: $ownsNext
"@

Add-Content -Path $WorklogPath -Value $entry
Write-Host "Appended auto-handoff entry to $WorklogPath" -ForegroundColor Green

if (-not $SkipChecks) {
  & powershell -ExecutionPolicy Bypass -File "scripts/handoff-check.ps1"
  if ($LASTEXITCODE -ne 0) {
    throw "Handoff checks failed after auto-entry append"
  }
}

Write-Host "Session end complete." -ForegroundColor Green
