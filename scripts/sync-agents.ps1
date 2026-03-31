param(
  [string]$SourceDir = ".claude/agents",
  [string]$MirrorDir = ".codex/agents"
)

$ErrorActionPreference = "Stop"

function Get-NormalizedHashes {
  param([string]$Dir)

  Get-FileHash -Path (Join-Path $Dir "*.md") -Algorithm SHA256 |
    ForEach-Object {
      [PSCustomObject]@{
        Name = [System.IO.Path]::GetFileName($_.Path)
        Hash = $_.Hash
      }
    } |
    Sort-Object Name
}

if (-not (Test-Path $SourceDir)) {
  throw "Source directory not found: $SourceDir"
}

New-Item -ItemType Directory -Force -Path $MirrorDir | Out-Null

# Byte-for-byte mirror copy from Claude source to Codex mirror.
Copy-Item -Path (Join-Path $SourceDir "*.md") -Destination $MirrorDir -Force

$sourceHashes = Get-NormalizedHashes -Dir $SourceDir
$mirrorHashes = Get-NormalizedHashes -Dir $MirrorDir

$diff = Compare-Object -ReferenceObject $sourceHashes -DifferenceObject $mirrorHashes -Property Name, Hash
if ($diff) {
  Write-Host "Agent mirror verification FAILED." -ForegroundColor Red
  $diff | Format-Table -AutoSize
  exit 1
}

Write-Host "Agent mirror verification OK." -ForegroundColor Green
$sourceHashes | Format-Table -AutoSize
