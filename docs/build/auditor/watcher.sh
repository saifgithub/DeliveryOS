#!/bin/sh
# watcher.sh - lane-state watcher for the lane handshake (docs/build/auditor/PROTOCOL.md).
#   AWAITING_AUDIT : builder SUBMITTED round > auditor VERDICT round, or no auditor file yet
#   AWAITING_FIXES : auditor's latest verdict keyword is AWAITING_FIXES
#   COMPLETE       : auditor's latest verdict keyword is COMPLETE
# Usage:
#   watcher.sh state              print the derived state table once and exit
#   watcher.sh auditor   [-i N]   block until >=1 lane is AWAITING_AUDIT  (poll every N s, default 30)
#   watcher.sh architect [-i N]   block until >=1 lane is AWAITING_FIXES
# Env: HANDSHAKE_LANES_DIR overrides the lane directory (default: <script dir>/lanes).
# Portable POSIX sh, no dependencies.

set -u
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
LANES_DIR=${HANDSHAKE_LANES_DIR:-"$SCRIPT_DIR/lanes"}

last_round() {  # $1=file $2=extended-regex with round number as the only capture-ish digits
  grep -Eo "$2" "$1" 2>/dev/null | tail -1 | grep -Eo '[0-9]+' | tail -1
}

lane_state() {  # $1=unit id; echoes "STATE sub vr keyword"
  b="$LANES_DIR/$1.builder.md"; a="$LANES_DIR/$1.auditor.md"
  sub=$(last_round "$b" 'SUBMITTED: *round *[0-9]+'); sub=${sub:-0}
  if [ ! -f "$a" ]; then echo "AWAITING_AUDIT $sub - -"; return; fi
  kw=$(grep -Eo 'VERDICT: *(COMPLETE|AWAITING_FIXES)' "$a" 2>/dev/null | tail -1 | awk '{print $2}')
  vr=$(last_round "$a" 'VERDICT: *(COMPLETE|AWAITING_FIXES) *\(round *[0-9]+'); vr=${vr:-0}
  if [ "$sub" -gt "$vr" ]; then echo "AWAITING_AUDIT $sub $vr ${kw:--}"; return; fi
  case "${kw:-}" in
    AWAITING_FIXES) echo "AWAITING_FIXES $sub $vr $kw" ;;
    COMPLETE)       echo "COMPLETE $sub $vr $kw" ;;
    *)              echo "AWAITING_AUDIT $sub $vr -" ;;   # auditor file exists but no verdict yet
  esac
}

units() {
  for f in "$LANES_DIR"/*.builder.md; do
    [ -f "$f" ] || continue
    basename "$f" .builder.md
  done
}

print_state() {
  n=0
  printf '%-22s %-16s %-10s %-9s\n' "UNIT" "STATE" "SUBMITTED" "VERDICT"
  for it in $(units); do
    n=$((n+1))
    set -- $(lane_state "$it")
    printf '%-22s %-16s %-10s %-9s\n' "$it" "$1" "r$2" "r$3(${4})"
  done
  [ "$n" -eq 0 ] && echo "(no lanes yet under $LANES_DIR)"
}

count_state() {  # counts lanes whose state == $TARGET
  c=0
  for it in $(units); do
    s=$(lane_state "$it"); s=${s%% *}
    [ "$s" = "$TARGET" ] && c=$((c+1))
  done
  echo "$c"
}

MODE=${1:-state}; shift 2>/dev/null || true
INTERVAL=30
[ "${1:-}" = "-i" ] && INTERVAL=${2:-30}

case "$MODE" in
  state) print_state ;;
  auditor|architect)
    [ "$MODE" = "auditor" ] && TARGET=AWAITING_AUDIT || TARGET=AWAITING_FIXES
    echo "watching $LANES_DIR for $TARGET (poll ${INTERVAL}s, ctrl-c to stop)..."
    while :; do
      c=$(count_state "$TARGET")
      if [ "$c" -gt 0 ]; then
        echo "$(date '+%H:%M:%S') $c lane(s) $TARGET:"; print_state; exit 0
      fi
      sleep "$INTERVAL"
    done ;;
  *) echo "usage: watcher.sh state | auditor [-i N] | architect [-i N]" >&2; exit 2 ;;
esac
