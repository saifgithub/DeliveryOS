#!/bin/sh
# gate_check.sh - the machine-gate hook (DISPATCH_PROTOCOL.md §4a, GATE: machine).
#
# THIS FILE IS A SHAPE, NOT WORKING CODE. It is the one script an adopting project writes itself.
# Copy it, replace the two marked blocks, delete this warning. Unedited, it exits 1 for every item,
# which renders every machine-gated lane UNGATED — the correct fail-loud behaviour for a hook that
# has not been written yet, and the reason it ships exiting 1 rather than 0.
#
# CONTRACT (the whole of it):
#   argv[1]  the item id
#   exit 0   this item is gated: the project's non-agentic runner exited 0 over the independently
#            authored acceptance checks, AT THE REVISION THE ITEM WAS SUBMITTED AT
#   exit !=0 anything else — no record, a failing record, a record at a different revision, an
#            unreadable record. dispatch.sh renders UNGATED and does not care which.
#
# THREE RULES, and each one is load-bearing:
#
# 1. BE CHEAP. dispatch.sh calls this once per accepted machine-gated lane on EVERY state print and
#    every watcher poll. READ the runner's record; never run the suite here. A hook that runs the
#    build turns `dispatch.sh state` into a build.
#
# 2. CHECK THE REVISION. A green record from an earlier revision is not evidence about this
#    submission. Comparing the record's revision against the lane's submitted SHA is most of this
#    script's value; a hook that only reads pass/fail has re-implemented `GATE: none` with extra
#    steps.
#
# 3. NEVER WRITE. This is a reader. It emits an exit code and nothing else — no lane edits, no
#    record edits, no state. Its stdout and stderr are discarded by the caller.

set -u
ITEM=${1:-}
[ -n "$ITEM" ] || exit 2

# --- REPLACE: locate the runner's record for this item ------------------------------------------
# It must live under <AUDIT_ROOT>/** or on an untracked path, and it must carry the revision it ran
# at (AUDITOR_LOOP_PROMPT.md -> path discipline, revision fidelity). Bind its path and its field
# names in BINDINGS as <GATE_RUN_RECORD>; do not hardcode a format here that BINDINGS does not
# describe.
RECORD=""            # e.g. RECORD="$(dirname -- "$0")/../<...>/$ITEM.<...>"
# ------------------------------------------------------------------------------------------------

[ -n "$RECORD" ] && [ -f "$RECORD" ] || exit 1

# --- REPLACE: read the result and the revision, and compare the revision to the submission -------
# Both halves are required. Read the lane's submitted SHA from
# <AUDIT_LANE_DIR>/$ITEM.architect.md, read the record's own revision, and fail unless they match.
exit 1
# ------------------------------------------------------------------------------------------------
