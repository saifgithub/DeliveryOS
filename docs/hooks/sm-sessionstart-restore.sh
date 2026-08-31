#!/usr/bin/env bash
# sm-sessionstart-restore.sh — SessionStart hook (matcher: compact), general release (global,
# every repo, every session). Companion to /sm-savepoint and /sm-readpoint (~/.claude/commands/).
#
# What it does: only acts when source == "compact" (fires right after compaction completes, for
# both manual and auto triggers). Finds the working checkpoint at
# ~/.claude/sm_checkpoint_${session_id}.md — written either by a curated /sm-savepoint run or by
# sm-precompact-snapshot.sh's mechanical fallback — prints it to stdout (Claude Code injects
# SessionStart stdout into context automatically on exit 0, no /sm-readpoint needed), then
# archives it exactly like /sm-readpoint Step 3: a UTC-timestamped copy into the current repo's
# checkpoint_history/ dir (same three-way resolution /sm-readpoint itself uses), then delete the
# working copy.
#
# Depends on: bash, jq. Wired globally via ~/.claude/settings.json's `hooks` block, so it runs
# after every compaction (manual or auto) in every session, in every repo, on this machine.

INPUT="$(cat)"

command -v jq >/dev/null 2>&1 || exit 0

SOURCE="$(printf '%s' "$INPUT" | jq -r '.source // empty' 2>/dev/null)"
[ "$SOURCE" = "compact" ] || exit 0

SESSION_ID="$(printf '%s' "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)"
[ -n "$SESSION_ID" ] || exit 0

CWD="$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)"
[ -n "$CWD" ] && cd "$CWD" 2>/dev/null

WORKING="$HOME/.claude/sm_checkpoint_${SESSION_ID}.md"
[ -f "$WORKING" ] || exit 0

# Same three-way resolution order as /sm-readpoint.
if   [ -d .deliveryos ]; then ARCHIVE_DIR=".deliveryos/checkpoint_history"
elif [ -d .claude ];     then ARCHIVE_DIR=".claude/checkpoint_history"
else                          ARCHIVE_DIR="$HOME/.claude/checkpoint_history"; fi

echo "Auto-restored checkpoint after compaction (mirrors /sm-readpoint, session ${SESSION_ID}):"
echo
cat "$WORKING"

mkdir -p "$ARCHIVE_DIR" 2>/dev/null
cp "$WORKING" "$ARCHIVE_DIR/$(date -u +%Y%m%dT%H%M%SZ)_${SESSION_ID}.md" 2>/dev/null
rm -f "$WORKING"

exit 0
