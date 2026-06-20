# DeliveryOS skills deploy (Windows / PowerShell 5.1+ / 7+).
# Copies every skill in <repo>\skills\ into the agent skills dir
# (~\.claude\skills\ by default). Idempotent — re-runs overwrite in place.

[CmdletBinding()]
param(
  [switch]$DryRun,
  [string]$Dest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Dest)) {
  if ($env:CLAUDE_SKILLS_DIR) { $Dest = $env:CLAUDE_SKILLS_DIR }
  else { $Dest = Join-Path $HOME '.claude/skills' }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$skillsSrc = Join-Path (Split-Path -Parent $scriptDir) 'skills'

if (-not (Test-Path -LiteralPath $skillsSrc -PathType Container)) {
  Write-Error "skills source not found at $skillsSrc"
  exit 2
}

Write-Host "DeliveryOS — deploying skills"
Write-Host "  from: $skillsSrc"
Write-Host "  to:   $Dest"
if ($DryRun) { Write-Host "  (dry run — no changes)" }
Write-Host ""

$deployed = 0
foreach ($dir in Get-ChildItem -Path $skillsSrc -Directory) {
  if (-not (Test-Path -LiteralPath (Join-Path $dir.FullName 'SKILL.md'))) { continue }
  $name = $dir.Name
  if ($DryRun) {
    Write-Host "→ would deploy $name"
  } else {
    if (-not (Test-Path -LiteralPath $Dest)) { New-Item -ItemType Directory -Path $Dest -Force | Out-Null }
    $target = Join-Path $Dest $name
    if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
    Copy-Item -LiteralPath $dir.FullName -Destination $target -Recurse
    Write-Host "→ deployed $name"
  }
  $deployed++
}

Write-Host ""
if ($deployed -eq 0) {
  Write-Warning "no skills (dirs with a SKILL.md) found under $skillsSrc"
  exit 0
}
if ($DryRun) {
  Write-Host ("DeliveryOS skills: {0} would be deployed to {1}" -f $deployed, $Dest)
} else {
  Write-Host ("DeliveryOS skills: {0} deployed to {1}" -f $deployed, $Dest)
}
exit 0
