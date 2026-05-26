// CHUNK-13 § hooks/forbiddenPathsScript.ts — static template strings for the
// POSIX and PowerShell PreToolUse hook scripts. Pure constants — no logic.
// The generator picks one and writes it verbatim to disk.

/**
 * POSIX bash script content for the DeliveryOS forbidden-paths PreToolUse hook.
 * Written to .claude/hooks/deliveryos-forbidden-paths.sh
 */
export const POSIX_HOOK_SCRIPT = `#!/usr/bin/env bash
# Managed by DeliveryOS. Do not edit by hand; re-generate from the
# diff-results panel "Hook install" tab.

set -euo pipefail

BRIEF=".deliveryos-handoff/current-execution-brief.md"

INPUT=$(cat)
TARGET=$(printf '%s' "$INPUT" | awk '
  /"file_path"[[:space:]]*:/ {
    sub(/^[^:]*:[[:space:]]*"/, "");
    sub(/".*$/, "");
    print; exit
  }')

if [ -z "\${TARGET:-}" ]; then exit 0; fi
if [ ! -f "$BRIEF" ]; then exit 0; fi

TARGET="\${TARGET#./}"
TARGET="\${TARGET//\\\\//}"

PATTERNS=$(awk '
  /^## 8\\. Forbidden Changes/ { capture = 1; next }
  /^## / { capture = 0 }
  capture && /^[[:space:]]*[-*][[:space:]]/ {
    sub(/^[[:space:]]*[-*][[:space:]]+/, "");
    sub(/[[:space:]]+$/, "");
    gsub(/\`/, "");
    print
  }
' "$BRIEF")

while IFS= read -r PATTERN; do
  [ -z "$PATTERN" ] && continue
  [ "$PATTERN" = "(none)" ] && continue
  # shellcheck disable=SC2254
  case "$TARGET" in
    $PATTERN)
      printf 'DeliveryOS: blocked write to "%s" — matches Forbidden rule "%s" in current brief.\\n' \\
        "$TARGET" "$PATTERN" >&2
      exit 2
      ;;
  esac
done <<< "$PATTERNS"

exit 0
`;

/**
 * PowerShell script content for the DeliveryOS forbidden-paths PreToolUse hook.
 * Written to .claude/hooks/deliveryos-forbidden-paths.ps1
 */
export const POWERSHELL_HOOK_SCRIPT = `# Managed by DeliveryOS. Do not edit by hand; re-generate from the
# diff-results panel "Hook install" tab.

$ErrorActionPreference = 'Stop'

$brief = '.deliveryos-handoff/current-execution-brief.md'
$inputContent = [Console]::In.ReadToEnd()

$match = [regex]::Match($inputContent, '"file_path"\\s*:\\s*"([^"]+)"')
if (-not $match.Success) { exit 0 }
$target = $match.Groups[1].Value -replace '\\\\', '/'
$target = $target -replace '^\\./', ''

if (-not (Test-Path $brief)) { exit 0 }

$capture = $false
$patterns = @()
foreach ($line in Get-Content $brief) {
  if ($line -match '^##\\s*8\\.\\s*Forbidden Changes') { $capture = $true; continue }
  if ($capture -and $line -match '^##\\s') { break }
  if ($capture -and $line -match '^\\s*[-*]\\s+(.+?)\\s*$') {
    $patterns += ($matches[1] -replace '\`', '')
  }
}

foreach ($pattern in $patterns) {
  if ([string]::IsNullOrWhiteSpace($pattern)) { continue }
  if ($pattern -eq '(none)') { continue }
  $likePattern = $pattern -replace '\\*\\*', '*'
  if ($target -like $likePattern) {
    [Console]::Error.WriteLine("DeliveryOS: blocked write to \`"$target\`" — matches Forbidden rule \`"$pattern\`" in current brief.")
    exit 2
  }
}

exit 0
`;

export const HOOK_SCRIPT_VERSION = 1 as const;
