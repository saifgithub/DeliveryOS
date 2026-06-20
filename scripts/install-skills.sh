#!/usr/bin/env sh
# DeliveryOS skills deploy (macOS / Linux).
# Copies every skill in <repo>/skills/ into the agent skills dir
# (~/.claude/skills/ by default). Idempotent — re-runs overwrite in place.

set -eu

usage() {
  cat <<EOF
DeliveryOS skills installer

Usage: $0 [--dry-run] [--dest <dir>]

Copies each <repo>/skills/<name>/ (any dir containing a SKILL.md) into the
agent skills directory.

Options:
  --dry-run        List what would be copied; change nothing.
  --dest <dir>     Target skills dir. Default: \$CLAUDE_SKILLS_DIR, else ~/.claude/skills
  -h, --help       Show this help.

Exit codes:
  0 — skills deployed (or dry-run, or nothing to deploy: warning only).
  2 — the skills source directory was not found.
EOF
}

DRY_RUN=0
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --dest) shift; [ $# -gt 0 ] || { echo "error: --dest needs a value" >&2; exit 2; }; DEST="$1" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown flag: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)
SKILLS_SRC=$(dirname "$SCRIPT_DIR")/skills

if [ ! -d "$SKILLS_SRC" ]; then
  echo "error: skills source not found at $SKILLS_SRC" >&2
  exit 2
fi

echo "DeliveryOS — deploying skills"
echo "  from: $SKILLS_SRC"
echo "  to:   $DEST"
[ "$DRY_RUN" -eq 1 ] && echo "  (dry run — no changes)"
echo

deployed=0
for dir in "$SKILLS_SRC"/*/; do
  [ -f "${dir}SKILL.md" ] || continue   # only real skills (must have SKILL.md)
  name=$(basename "$dir")
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "→ would deploy $name"
  else
    mkdir -p "$DEST"
    rm -rf "$DEST/$name"
    cp -R "$dir" "$DEST/$name"
    echo "→ deployed $name"
  fi
  deployed=$((deployed + 1))
done

echo
if [ "$deployed" -eq 0 ]; then
  echo "warning: no skills (dirs with a SKILL.md) found under $SKILLS_SRC" >&2
  exit 0
fi
if [ "$DRY_RUN" -eq 1 ]; then
  echo "DeliveryOS skills: $deployed would be deployed to $DEST"
else
  echo "DeliveryOS skills: $deployed deployed to $DEST"
fi
exit 0
