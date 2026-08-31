#!/usr/bin/env bash
# sm-precompact-snapshot.sh — PreCompact hook, general release (global, every repo, every session).
# Companion to /sm-savepoint and /sm-readpoint (~/.claude/commands/).
#
# What it does: if a working checkpoint memo already exists at
# ~/.claude/sm_checkpoint_${session_id}.md (written by a curated /sm-savepoint run, or by this
# script on an earlier compaction this session), it is a no-op — this script never overwrites a
# memo Claude or the user already wrote. Otherwise it writes a fast MECHANICAL fallback (git
# state + a short transcript tail) to that same path, so sm-sessionstart-restore.sh always has
# something to restore, even for a surprise auto-compact nobody prepared for.
#
# Depends on: bash, git, jq. Wired globally via ~/.claude/settings.json's `hooks` block, so it
# runs before every compaction (manual /compact or auto) in every session, in every repo, on this
# machine. Safe by design in that scope: it only ever acts when no memo already exists, and the
# repo-specific bits (checkpoint_history/ resolution) live in sm-sessionstart-restore.sh, not here.
# The auto-compact WINDOW/threshold is a separate, deliberately scoped concern handled elsewhere,
# not by this hook.
#
# Must stay fast: PreCompact is synchronous/blocking and can fire mid-tool-loop, not just between
# turns, so a slow hook here would stall live work. Never blocks compaction — always exits 0.

INPUT="$(cat)"

command -v jq >/dev/null 2>&1 || exit 0

SESSION_ID="$(printf '%s' "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)"
[ -n "$SESSION_ID" ] || exit 0

CWD="$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)"
TRIGGER="$(printf '%s' "$INPUT" | jq -r '.trigger // "unknown"' 2>/dev/null)"
TRANSCRIPT="$(printf '%s' "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)"

WORKING="$HOME/.claude/sm_checkpoint_${SESSION_ID}.md"

# Never touch an existing memo — curated or a prior mechanical snapshot.
[ -f "$WORKING" ] && exit 0

[ -n "$CWD" ] && cd "$CWD" 2>/dev/null

mkdir -p "$HOME/.claude" 2>/dev/null

{
  echo "---"
  echo "source: auto-mechanical-snapshot (no /sm-savepoint was run before this compaction)"
  echo "session_id: $SESSION_ID"
  echo "trigger: $TRIGGER"
  echo "timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "cwd: $CWD"
  echo "---"
  echo
  echo "## Mechanical snapshot (no curated /sm-savepoint memo was available)"
  echo
  echo "This is a low-fidelity, auto-generated fallback — not a substitute for a curated"
  echo "/sm-savepoint memo. It exists so an unplanned auto-compact doesn't lose everything."
  echo
  echo "### Git state"
  echo '```'
  git branch --show-current 2>/dev/null || echo "(not a git repo or detached HEAD)"
  echo "--- status --short ---"
  git status --short 2>/dev/null
  echo "--- diff --stat HEAD ---"
  git diff --stat HEAD 2>/dev/null
  echo '```'
  echo

  if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
    echo "### Recent transcript tail (best-effort, last ~15 turns)"
    echo '```'
    tail -n 400 "$TRANSCRIPT" 2>/dev/null \
      | jq -r 'select(.type=="user" or .type=="assistant") | .message.content[]? | select(.type=="text") | .text' 2>/dev/null \
      | tail -n 60
    echo '```'
  fi
} > "$WORKING" 2>/dev/null

exit 0
