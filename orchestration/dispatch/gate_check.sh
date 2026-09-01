#!/bin/sh
# gate_check.sh - DeliveryOS's machine-gate hook (DISPATCH_PROTOCOL.md §4a, GATE: machine).
# TIER B — this project's own; never copied onward. The portable shape is
# ../install/templates/gate_check.sh.
#
#   argv[1]  the item id
#   exit 0   docs/build/gate/item-<ITEM>.json says passed AND its gitSha matches the SHA the lane
#            was submitted at
#   exit !=0 anything else
#
# A READER. It runs no build — dispatch.sh calls it on every state print and every watcher poll.
# `npm run gate -- --item <ITEM>` is what produces the record; this only reads it.
set -u
ITEM=${1:-}
[ -n "$ITEM" ] || exit 2

DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO=$(CDPATH= cd -- "$DIR/../.." && pwd)
RECORD="$REPO/docs/build/gate/item-$ITEM.json"
LANE="$REPO/orchestration/audit/cr/$ITEM.architect.md"

[ -f "$RECORD" ] || exit 1
[ -f "$LANE" ]   || exit 1

# The record's own claim. Both fields are written by scripts/gate.mjs; neither is agent-authored.
grep -q '"passed": *true' "$RECORD" || exit 1
REC_SHA=$(grep -Eo '"gitSha": *"[0-9a-f]+"' "$RECORD" | head -1 | grep -Eo '[0-9a-f]{7,}')
[ -n "$REC_SHA" ] || exit 1

# The SHA the lane was submitted at — the LAST one in the file, since a lane accumulates rounds by
# appending and only the newest submission is the one a verdict can be about.
LANE_SHA=$(grep -Eio '\b[0-9a-f]{7,40}\b' "$LANE" | tail -1)
[ -n "$LANE_SHA" ] || exit 1

# Prefix comparison, so an abbreviated SHA on either side still matches the same commit. This is the
# half that makes the check mean something: without it, a green record from an earlier revision
# gates a submission it never saw.
case "$REC_SHA" in "$LANE_SHA"*) exit 0 ;; esac
case "$LANE_SHA" in "$REC_SHA"*) exit 0 ;; esac
exit 1
