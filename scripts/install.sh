#!/usr/bin/env sh
# DeliveryOS install script (macOS / Linux).
# Detects supported editor CLIs on PATH and installs the .vsix into each.
# Idempotent — always passes --force, so re-runs are safe.

set -eu

EDITORS="code cursor windsurf codium antigravity"
VERBOSE=0

usage() {
  cat <<EOF
DeliveryOS install script

Usage: $0 [--verbose|-v] [<path-to-vsix>]

If <path-to-vsix> is omitted, the highest-versioned deliveryos-*.vsix
in the script's parent directory is used.

Exit codes:
  0 — at least one detected editor installed successfully (or no editors detected: warning only).
  1 — at least one editor was detected, and every detected editor failed to install.
  2 — the <path-to-vsix> argument was given but the file does not exist or is not readable.
EOF
}

VSIX=""
for arg in "$@"; do
  case "$arg" in
    --verbose|-v) VERBOSE=1 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "unknown flag: $arg" >&2; usage >&2; exit 2 ;;
    *) VSIX="$arg" ;;
  esac
done

SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)
PARENT_DIR=$(dirname "$SCRIPT_DIR")

if [ -z "$VSIX" ]; then
  # Default: highest-versioned deliveryos-*.vsix in the repo root (script's parent dir).
  VSIX=$(ls -1 "$PARENT_DIR"/deliveryos-*.vsix 2>/dev/null | sort -V | tail -n1 || true)
  if [ -z "$VSIX" ]; then
    # Fall back to extension/deliveryos-*.vsix (dev layout).
    VSIX=$(ls -1 "$PARENT_DIR"/extension/deliveryos-*.vsix 2>/dev/null | sort -V | tail -n1 || true)
  fi
  if [ -z "$VSIX" ]; then
    echo "error: no deliveryos-*.vsix found in $PARENT_DIR or $PARENT_DIR/extension; pass a path explicitly." >&2
    exit 2
  fi
fi

if [ ! -r "$VSIX" ]; then
  echo "error: $VSIX does not exist or is not readable." >&2
  exit 2
fi

echo "DeliveryOS — installing $VSIX"
echo

detected=0
ok=0
failed=0

# Per-editor summary lines collected for the final block.
summary=""

run_cli() {
  cli=$1
  if [ "$VERBOSE" -eq 1 ]; then
    "$cli" --install-extension "$VSIX" --force
  else
    "$cli" --install-extension "$VSIX" --force >/dev/null 2>&1
  fi
}

read_version() {
  cli=$1
  "$cli" --version 2>/dev/null | head -n1 || echo "?"
}

for editor in $EDITORS; do
  if command -v "$editor" >/dev/null 2>&1; then
    detected=$((detected + 1))
    version=$(read_version "$editor")
    echo "→ installing into $editor ($version)…"
    if run_cli "$editor"; then
      ok=$((ok + 1))
      summary="$summary  $editor	OK	($version)\n"
    else
      failed=$((failed + 1))
      summary="$summary  $editor	FAIL	($version)\n"
    fi
  else
    skip_reason="not on PATH"
    # Antigravity 2.x dropped the `antigravity` CLI binary entirely (bundle
    # restructure: /Contents/Resources/app/bin/antigravity no longer exists,
    # /Contents/Resources/bin/ now contains only language_server +
    # webm_encoder). Surface a clearer SKIP reason when the app bundle is
    # present so the user knows to install via the app UI instead of going
    # hunting for a missing CLI symlink.
    if [ "$editor" = "antigravity" ] && [ -d "/Applications/Antigravity.app" ]; then
      skip_reason="Antigravity 2.x — CLI removed; install manually via app UI"
    fi
    summary="$summary  $editor	SKIP	($skip_reason)\n"
  fi
done

echo
echo "DeliveryOS install summary:"
printf "$summary"
echo
echo "  detected: $detected · ok: $ok · failed: $failed"

if [ "$detected" -eq 0 ]; then
  echo
  echo "warning: no supported editor CLIs were detected on PATH."
  echo "open each editor and run \"Shell Command: Install '<editor>' command in PATH\"" >&2
  echo "(via Cmd/Ctrl+Shift+P) then re-run this script." >&2
  exit 0
fi

if [ "$ok" -eq 0 ]; then
  exit 1
fi

exit 0
