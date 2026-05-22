# DeliveryOS install script (Windows / PowerShell 5.1+ / 7+).
# Detects supported editor CLIs on PATH and installs the .vsix into each.
# Idempotent — always passes --force, so re-runs are safe.

[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [string]$VsixPath,

  [Alias('v')]
  [switch]$Verbose
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$editors = @('code', 'cursor', 'windsurf', 'codium', 'antigravity')

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentDir = Split-Path -Parent $scriptDir

function Get-DefaultVsix {
  param([string]$Dir)
  $matches = Get-ChildItem -Path $Dir -Filter 'deliveryos-*.vsix' -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending
  if ($matches) { return $matches[0].FullName }
  return $null
}

if ([string]::IsNullOrWhiteSpace($VsixPath)) {
  $VsixPath = Get-DefaultVsix -Dir $parentDir
  if (-not $VsixPath) {
    $VsixPath = Get-DefaultVsix -Dir (Join-Path $parentDir 'extension')
  }
  if (-not $VsixPath) {
    Write-Error "no deliveryos-*.vsix found in $parentDir or $parentDir\extension; pass a path explicitly."
    exit 2
  }
}

if (-not (Test-Path -LiteralPath $VsixPath -PathType Leaf)) {
  Write-Error "$VsixPath does not exist or is not readable."
  exit 2
}

$VsixPath = (Resolve-Path -LiteralPath $VsixPath).Path

Write-Host "DeliveryOS — installing $VsixPath"
Write-Host ""

$detected = 0
$ok = 0
$failed = 0
$rows = @()

foreach ($editor in $editors) {
  $cmd = Get-Command $editor -ErrorAction SilentlyContinue
  if ($null -ne $cmd) {
    $detected++
    $version = & $editor --version 2>$null | Select-Object -First 1
    if (-not $version) { $version = '?' }

    Write-Host "→ installing into $editor ($version)…"
    if ($Verbose) {
      & $editor --install-extension $VsixPath --force
    } else {
      & $editor --install-extension $VsixPath --force *> $null
    }

    if ($LASTEXITCODE -eq 0) {
      $ok++
      $rows += [pscustomobject]@{ editor = $editor; status = 'OK'; version = $version }
    } else {
      $failed++
      $rows += [pscustomobject]@{ editor = $editor; status = 'FAIL'; version = $version }
    }
  } else {
    $skipReason = 'not on PATH'
    # Antigravity 2.x dropped the antigravity CLI binary entirely (bundle
    # restructure removed /Contents/Resources/app/bin/antigravity). When the
    # app is installed but the CLI is missing, surface a clearer SKIP
    # reason so the user knows to install via the app UI rather than hunt
    # for a missing CLI on PATH. On Windows the typical install path is
    # %LOCALAPPDATA%\Programs\Antigravity\Antigravity.exe — check both that
    # and the macOS path for cross-platform PowerShell users.
    if ($editor -eq 'antigravity') {
      $antiMac = '/Applications/Antigravity.app'
      $antiWin = Join-Path $env:LOCALAPPDATA 'Programs\Antigravity\Antigravity.exe'
      if ((Test-Path -LiteralPath $antiMac) -or
          ($env:LOCALAPPDATA -and (Test-Path -LiteralPath $antiWin))) {
        $skipReason = 'Antigravity 2.x — CLI removed; install manually via app UI'
      }
    }
    $rows += [pscustomobject]@{ editor = $editor; status = 'SKIP'; version = $skipReason }
  }
}

Write-Host ""
Write-Host "DeliveryOS install summary:"
foreach ($row in $rows) {
  Write-Host ("  {0,-12} {1,-6} ({2})" -f $row.editor, $row.status, $row.version)
}
Write-Host ""
Write-Host ("  detected: {0} · ok: {1} · failed: {2}" -f $detected, $ok, $failed)

if ($detected -eq 0) {
  Write-Host ""
  Write-Warning "no supported editor CLIs were detected on PATH."
  Write-Warning "open each editor and run `"Shell Command: Install '<editor>' command in PATH`""
  Write-Warning "(via Cmd/Ctrl+Shift+P) then re-run this script."
  exit 0
}

if ($ok -eq 0) {
  exit 1
}

exit 0
