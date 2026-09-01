#!/bin/sh
# dispatch.sh - lane-state watcher for the dispatch handshake (DISPATCH_PROTOCOL.md §4).
# Derives per-item state from three files: the assign lane, the instance lane, and (for code) the
# audit lane's VERDICT. No shared flag; state is derived from round watermarks + keywords.
#   UNASSIGNED     : assign lane has no ASSIGNED line
#   ASSIGNED       : ASSIGNED round > instance STATUS round, or no instance file yet
#   IN_PROGRESS    : instance STATUS = CLAIMED|IN_PROGRESS
#   BLOCKED        : instance STATUS = BLOCKED
#   NEEDS-INFO     : instance STATUS = NEEDS-INFO (architect must answer Q:)
#   IN_REVIEW      : instance STATUS = READY_FOR_REVIEW (content; architect review)
#   IN_AUDIT       : READY_FOR_AUDIT + audit VERDICT not yet returned
#   AUDIT_RETURNED : audit VERDICT = AWAITING_FIXES
#   AUDIT_PASSED   : audit VERDICT = COMPLETE, DISPATCH not yet ACCEPTED
#   DONE           : DISPATCH = ACCEPTED *and* the lane's GATE is satisfied
#   UNGATED        : DISPATCH = ACCEPTED but the gate is NOT satisfied  <-- loud
#
# DONE does not derive from DISPATCH: ACCEPTED alone: that is the Architect's own token, so reading
# it without a verdict cannot express "shipped without a gate" and prints ungated lanes identically
# to audited ones. UNGATED is that state.
#   GATE: none                -> no audit required; recorded UPFRONT at decomposition time, never
#                                at hand-off (the tired-at-hand-off window is where gates get waived)
#   GATE: spawned|independent -> requires audit VERDICT: COMPLETE, else UNGATED
#   GATE: machine             -> requires the project's gate hook to exit 0, else UNGATED
#   GATE: absent              -> UNGATED. An unbound gate fails LOUD, never open.
# Usage:
#   dispatch.sh state              print the derived board once and exit
#   dispatch.sh inbox              one-shot, non-blocking: lanes the auditor FINISHED and the
#                                    Architect has not integrated (AUDIT_PASSED, UNCOMMITTED).
#                                    Exit 1 if any. Run at session start + after each work unit.
#   dispatch.sh architect [-i N]   block until >=1 lane needs the Architect
#                                    (UNASSIGNED|BLOCKED|NEEDS-INFO|IN_REVIEW|AUDIT_PASSED)
#   dispatch.sh inst <id> [-i N]   block until >=1 lane is ASSIGNED to <id> or AUDIT_RETURNED on it
# Env: DISPATCH_LANE_DIR overrides the lane dir (default <script dir>/lanes).
#      DISPATCH_AUDIT_DIR overrides the audit lane dir (default <script dir>/../audit/cr).
#      DISPATCH_INTAKE_DIR overrides the intake dir (default <script dir>/intake).
#      DISPATCH_GATE_CHECK overrides the machine-gate hook (default <script dir>/gate_check.sh).
# Portable POSIX sh, no dependencies. Sibling of ../audit/watcher.sh.

set -u
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
LANE_DIR=${DISPATCH_LANE_DIR:-"$SCRIPT_DIR/lanes"}
AUDIT_DIR=${DISPATCH_AUDIT_DIR:-"$SCRIPT_DIR/../audit/cr"}
INTAKE_DIR=${DISPATCH_INTAKE_DIR:-"$SCRIPT_DIR/intake"}
GATE_CHECK=${DISPATCH_GATE_CHECK:-"$SCRIPT_DIR/gate_check.sh"}

last_round() {  # $1=file $2=extended-regex; echoes the last round number or empty
  [ -f "$1" ] || { echo ""; return; }
  grep -Eo "$2" "$1" 2>/dev/null | tail -1 | grep -Eo '[0-9]+' | tail -1
}

last_kw() {  # $1=file $2=extended-regex; echoes the 2nd token of the last match (the keyword)
  [ -f "$1" ] || { echo ""; return; }
  grep -Eo "$2" "$1" 2>/dev/null | tail -1 | awk '{print $2}'
}

machine_gate() {  # $1=item; exit 0 if the project's non-agentic runner says this item is gated
  # This is the ONE place portable code calls out to a project-supplied script. It names no runner,
  # opens no result file and knows no result format: the hook owns all three and its EXIT CODE is
  # the entire contract. Absent or non-zero -> not gated, exactly like an unrecorded GATE:.
  # The hook must be CHEAP — it reads the runner's own record; it does not run the suite. This is
  # called once per accepted machine-gated lane on every `state`/`inbox`/watch poll.
  [ -f "$GATE_CHECK" ] || return 1
  sh "$GATE_CHECK" "$1" >/dev/null 2>&1
}

undelivered() {  # $1=file; echoes "1" if the file is untracked or differs from HEAD, else ""
  # Evidence that lives only in one working tree is not evidence. These scripts read the working
  # tree, where an untracked file and a pushed one are otherwise indistinguishable — so an
  # uncommitted verdict would read as AUDIT_PASSED and authorise a merge to the shared branch.
  # Silent when git is unavailable or this is not a repo: the check may degrade, never fail
  # the caller.
  command -v git >/dev/null 2>&1 || { echo ""; return; }
  git -C "$(dirname -- "$1")" rev-parse --git-dir >/dev/null 2>&1 || { echo ""; return; }
  git -C "$(dirname -- "$1")" ls-files --error-unmatch -- "$1" >/dev/null 2>&1 || { echo "1"; return; }
  git -C "$(dirname -- "$1")" diff --quiet HEAD -- "$1" 2>/dev/null || { echo "1"; return; }
  echo ""
}

lane_state() {  # $1=item; echoes "STATE instance asg_round st_kw verdict gate register"
  # EVERY token is anchored to line start, so a token quoted in prose is never parsed as a live
  # signal. VERDICT allows leading heading/emphasis markers ([#*]*) because the audit lane files
  # carry it as a `## VERDICT:` heading — the keyword is then the LAST field of the match, not the
  # second. ../audit/watcher.sh reads it with the identical regex; the two must never diverge, or
  # this board and that table can disagree about whether a gate is satisfied.
  a="$LANE_DIR/$1.assign.md"
  asg_line=$(grep -Eo '^ASSIGNED: *[A-Za-z0-9._-]+ *round *[0-9]+' "$a" 2>/dev/null | tail -1)
  # Read GATE and REGISTER before the UNASSIGNED return. A lane written at decomposition and not yet
  # assigned is exactly what the record-upfront rule produces; if the board skipped them it would
  # print a bare `-` whether they were recorded or forgotten. The rule says decide upfront, so the
  # board has to be able to show you did.
  gate_kw=$(last_kw "$a" '^GATE: *(independent|spawned|machine|none)')
  # REGISTER is <register-id>:<row-id> — ONE whitespace-free token, because last_kw takes the second
  # field and the tuple below is consumed positionally. Printed, never enforced: it makes the DoD's
  # register row checkable by the Auditor, but it is still the Architect's own token, so it proves
  # nothing on its own — the same class of claim as DISPATCH: ACCEPTED.
  reg_kw=$(last_kw "$a" '^REGISTER: *[A-Za-z0-9._:-]+')

  if [ -z "$asg_line" ]; then echo "UNASSIGNED - - - - ${gate_kw:-MISSING} ${reg_kw:--}"; return; fi
  inst=$(echo "$asg_line" | awk '{print $2}')
  asg_round=$(echo "$asg_line" | grep -Eo '[0-9]+' | tail -1); asg_round=${asg_round:-0}

  u="$AUDIT_DIR/$1.auditor.md"
  v_kw=$(grep -Eo '^[#*]* *VERDICT: *(COMPLETE|AWAITING_FIXES)' "$u" 2>/dev/null | tail -1 | awk '{print $NF}')
  # Read the verdict's ROUND, not just its keyword. Submissions and verdicts share one counter and a
  # verdict only answers the submission at its own round, so once a newer submission lands the old
  # keyword is history — reading the keyword alone makes a resubmitted lane keep reporting a verdict
  # it has already addressed.
  v_round=$(last_round "$u" '^[#*]* *VERDICT: *(COMPLETE|AWAITING_FIXES) *\(round *[0-9]+'); v_round=${v_round:-0}
  # A verdict nobody committed has not been delivered, so it cannot satisfy a gate. Render it as
  # its own loud state rather than letting it read as a pass — the same reason UNGATED exists.
  if [ -n "$v_kw" ] && [ -n "$(undelivered "$u")" ]; then v_kw="UNCOMMITTED"; fi

  r=${reg_kw:--}

  disp_kw=$(last_kw "$a" '^DISPATCH: *(OPEN|ACCEPTED)')
  if [ "$disp_kw" = "ACCEPTED" ]; then
    case "${gate_kw:-}" in
      none)                echo "DONE $inst $asg_round - ${v_kw:--} none $r" ;;
      spawned|independent)
        if [ "${v_kw:-}" = "COMPLETE" ]; then echo "DONE $inst $asg_round - $v_kw $gate_kw $r"
        else                                  echo "UNGATED $inst $asg_round - ${v_kw:--} $gate_kw $r"; fi ;;
      # No agent verdict is consulted: the runner's exit code IS the verdict, so a machine-gated lane
      # can be DONE with no auditor file at all. That is the point of the value, not a hole in it.
      machine)
        if machine_gate "$1"; then echo "DONE $inst $asg_round - ${v_kw:--} machine $r"
        else                       echo "UNGATED $inst $asg_round - ${v_kw:--} machine $r"; fi ;;
      *)                   echo "UNGATED $inst $asg_round - ${v_kw:--} MISSING $r" ;;
    esac
    return
  fi

  i="$LANE_DIR/$1.$inst.md"
  st_kw=$(last_kw "$i" '^STATUS: *(CLAIMED|IN_PROGRESS|BLOCKED|NEEDS-INFO|READY_FOR_AUDIT|READY_FOR_REVIEW)')
  st_round=$(last_round "$i" '^STATUS: *(CLAIMED|IN_PROGRESS|BLOCKED|NEEDS-INFO|READY_FOR_AUDIT|READY_FOR_REVIEW) *\(round *[0-9]+'); st_round=${st_round:-0}

  g=${gate_kw:-MISSING}

  if [ ! -f "$i" ] || [ "$asg_round" -gt "$st_round" ]; then
    echo "ASSIGNED $inst $asg_round ${st_kw:--} - $g $r"; return
  fi

  case "${st_kw:-}" in
    CLAIMED|IN_PROGRESS) echo "IN_PROGRESS $inst $asg_round $st_kw - $g $r" ;;
    BLOCKED)             echo "BLOCKED $inst $asg_round $st_kw - $g $r" ;;
    NEEDS-INFO)          echo "NEEDS-INFO $inst $asg_round $st_kw - $g $r" ;;
    READY_FOR_REVIEW)    echo "IN_REVIEW $inst $asg_round $st_kw - $g $r" ;;
    READY_FOR_AUDIT)
      # A submission newer than the last verdict is unanswered, whatever that verdict said.
      if [ "$st_round" -gt "$v_round" ]; then echo "IN_AUDIT $inst $asg_round $st_kw - $g $r"; return; fi
      case "${v_kw:-}" in
        AWAITING_FIXES) echo "AUDIT_RETURNED $inst $asg_round $st_kw $v_kw $g $r" ;;
        COMPLETE)       echo "AUDIT_PASSED $inst $asg_round $st_kw $v_kw $g $r" ;;
        # A written-but-uncommitted verdict is its own state, not "still auditing". The auditor has
        # finished and the result exists in exactly one working tree; the fix is one `git add`, and
        # nobody can act on it until then. Architect-actionable: chase the delivery, never merge.
        UNCOMMITTED)    echo "UNCOMMITTED $inst $asg_round $st_kw $v_kw $g $r" ;;
        *)              echo "IN_AUDIT $inst $asg_round $st_kw ${v_kw:--} $g $r" ;;
      esac ;;
    *) echo "ASSIGNED $inst $asg_round ${st_kw:--} - $g $r" ;;
  esac
}

items() {
  for f in "$LANE_DIR"/*.assign.md; do
    [ -f "$f" ] || continue
    basename "$f" .assign.md
  done
}

count_intake() {  # echoes the number of drafts awaiting the Architect (TRIAGE: OPEN or NEEDS-INFO)
  # An intake draft has no lane, so every derived state above is blind to it: a requester's draft
  # would sit in a directory nobody reads while the board printed "no lanes need you". This is the
  # only place the board looks outside lanes/, and it reads exactly one token from a shape tier A
  # owns (intake/DRAFT.TEMPLATE.md). A draft is not a work item and never gets a row on the board.
  c=0
  for f in "$INTAKE_DIR"/*.md; do
    [ -f "$f" ] || continue
    case "$f" in *.TEMPLATE.md) continue ;; esac
    t=$(last_kw "$f" '^TRIAGE: *(OPEN|NEEDS-INFO|ACCEPTED|REJECTED)')
    case "${t:-OPEN}" in OPEN|NEEDS-INFO) c=$((c+1)) ;; esac
  done
  echo "$c"
}

print_state() {
  n=0
  printf '%-14s %-16s %-16s %-5s %-18s %-9s %-12s %s\n' "ITEM" "STATE" "INSTANCE" "ASG" "STATUS" "VERDICT" "GATE" "REGISTER"
  for it in $(items); do
    n=$((n+1))
    set -- $(lane_state "$it")
    printf '%-14s %-16s %-16s r%-4s %-18s %-9s %-12s %s\n' "$it" "$1" "$2" "$3" "$4" "$5" "$6" "$7"
  done
  [ "$n" -eq 0 ] && echo "(no lanes yet under $LANE_DIR)"
  ic=$(count_intake)
  [ "$ic" -gt 0 ] && echo "intake: $ic draft(s) awaiting triage under $INTAKE_DIR"
  return 0
}

# needs_architect: lane state is one the Architect must act on.
# UNGATED is included: an accepted lane whose gate is unsatisfied or unrecorded is a
# protocol breach the Architect must resolve — either route it to an auditor or record GATE: none.
needs_architect() {
  case "$1" in
    UNASSIGNED|BLOCKED|NEEDS-INFO|IN_REVIEW|AUDIT_PASSED|UNGATED|UNCOMMITTED) return 0 ;;
    *) return 1 ;;
  esac
}

count_architect() {
  c=0
  for it in $(items); do
    st=$(lane_state "$it"); s=${st%% *}
    needs_architect "$s" && c=$((c+1))
  done
  echo "$c"
}

count_inst() {  # uses $TARGET_INST; counts lanes ASSIGNED to it or AUDIT_RETURNED on it
  c=0
  for it in $(items); do
    set -- $(lane_state "$it")
    s=$1; who=$2
    if [ "$who" = "$TARGET_INST" ]; then
      case "$s" in ASSIGNED|AUDIT_RETURNED) c=$((c+1)) ;; esac
    fi
  done
  echo "$c"
}

print_inbox() {
  # Exit 1 on AUDIT_PASSED (merge it) or UNCOMMITTED (verdict unpushed — chase, then merge), so a
  # caller can gate "take new work" on a clean inbox. Other Architect-owed states go on one trailer
  # line and DO NOT affect the exit code: a chronic backlog would otherwise keep this permanently
  # red and desensitise it to the one event it exists to catch — a fresh auditor COMPLETE.
  hot=0; other=0; hot_rows=""
  for it in $(items); do
    set -- $(lane_state "$it")
    case "$1" in
      AUDIT_PASSED|UNCOMMITTED)
        hot=$((hot+1))
        row=$(printf '  %-14s %-13s %-16s verdict=%s' "$it" "$1" "$2" "$5")
        hot_rows="${hot_rows}${row}
"
        ;;
      UNASSIGNED|BLOCKED|NEEDS-INFO|IN_REVIEW|UNGATED) other=$((other+1)) ;;
    esac
  done
  if [ "$hot" -gt 0 ]; then
    echo "AUDITOR DONE — integrate before taking new work ($hot):"
    printf '%s' "$hot_rows"
  else
    echo "inbox clear — no auditor verdict awaiting integration."
  fi
  [ "$other" -gt 0 ] && echo "(also owing you: $other lane(s) UNASSIGNED/BLOCKED/NEEDS-INFO/IN_REVIEW/UNGATED — full board: dispatch.sh state)"
  # Intake goes on the trailer, NOT the exit code — same reason as the other Architect-owed states:
  # a chronic backlog would keep this permanently red and desensitise it to the one event it exists
  # to catch, a fresh auditor COMPLETE.
  ic=$(count_intake)
  [ "$ic" -gt 0 ] && echo "(also owing you: $ic intake draft(s) awaiting triage)"
  [ "$hot" -gt 0 ] && return 1
  return 0
}

MODE=${1:-state}; shift 2>/dev/null || true

case "$MODE" in
  state) print_state; exit 0 ;;
  inbox) print_inbox; exit $? ;;
  architect)
    INTERVAL=30; [ "${1:-}" = "-i" ] && INTERVAL=${2:-30}
    echo "watching $LANE_DIR for Architect-actionable lanes (poll ${INTERVAL}s, ctrl-c to stop)..."
    while :; do
      # Untriaged intake wakes the Architect too: a draft nobody triages never becomes a register
      # row, never gets a lane, and is therefore invisible to every lane-derived state.
      c=$(( $(count_architect) + $(count_intake) ))
      if [ "$c" -gt 0 ]; then echo "$(date '+%H:%M:%S') $c item(s) need the Architect:"; print_state; exit 0; fi
      sleep "$INTERVAL"
    done ;;
  inst)
    TARGET_INST=${1:-}; shift 2>/dev/null || true
    [ -z "${TARGET_INST:-}" ] && { echo "usage: dispatch.sh inst <instance-id> [-i N]" >&2; exit 2; }
    INTERVAL=30; [ "${1:-}" = "-i" ] && INTERVAL=${2:-30}
    echo "watching $LANE_DIR for lanes targeting $TARGET_INST (poll ${INTERVAL}s, ctrl-c to stop)..."
    while :; do
      c=$(count_inst "$TARGET_INST")
      if [ "$c" -gt 0 ]; then echo "$(date '+%H:%M:%S') $c lane(s) for $TARGET_INST:"; print_state; exit 0; fi
      sleep "$INTERVAL"
    done ;;
  *) echo "usage: dispatch.sh state | inbox | architect [-i N] | inst <instance-id> [-i N]" >&2; exit 2 ;;
esac
