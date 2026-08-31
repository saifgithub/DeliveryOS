---
description: Read back the session continuity memo written by /sm-savepoint and resume the work. Run it as the first message after a /compact, or as the first action in a brand-new session — with no working copy it falls back to the newest archived memo for this identity. The read half of the intra-session pair.
---

# /sm-readpoint — resume from a continuity memo

> Command source. Canonical copy in `docs/commands/`; active copy in `.claude/commands/sm-readpoint.md`,
> which Claude Code reads. Version-controlled so protocol changes are reviewable.

Reads the memo `/sm-savepoint` wrote and picks the work back up.

This command carries **no `model:` override**, deliberately: it resumes real work in the same turn,
and an override would apply for the rest of that turn. `/sm-savepoint` is where the saving belongs —
it always hands back to the user instead of continuing.

## Step 1 — Locate the memo

```bash
SESSION_ID="${CLAUDE_CODE_SESSION_ID:-fallback-$(hostname)-$$}"
WORKING=~/.claude/sm_checkpoint_${SESSION_ID}.md

if   [ -d .deliveryos ]; then ARCHIVE_DIR=".deliveryos/checkpoint_history"
elif [ -d .claude ];     then ARCHIVE_DIR=".claude/checkpoint_history"
else                          ARCHIVE_DIR="$HOME/.claude/checkpoint_history"; fi

if [ -f "$WORKING" ]; then
  echo "SOURCE=working"; echo "MEMO=$WORKING"
else
  echo "SOURCE=coldstart"
  find "$ARCHIVE_DIR" -maxdepth 1 -name '*.md' 2>/dev/null | sort -r | head -10 | while read -r f; do
    echo "=== $(basename "$f")"; head -3 "$f"
  done
fi
```

**`SOURCE=working`** — this session wrote a memo before compacting. That file is the memo; continue
to Step 2.

**`SOURCE=coldstart`** — a fresh session, so there is no working copy. The listing shows the ten most
recent archived memos, newest first. Pick the newest one carrying **your own** identity marker on
line 1 — never simply the newest file, because the archive interleaves every concurrent line of work
and the literal newest is often someone else's. If this project uses no identity marker, or none
matches, **show the candidates and ask** rather than guessing. A memo resumed from the wrong line of
work is worse than no memo.

## Step 2 — Read it

Read the memo in full and internalize it as the authoritative record of current state.

## Step 3 — Archive it, but only if it was the working copy

```bash
mkdir -p "$ARCHIVE_DIR"
cp "$WORKING" "$ARCHIVE_DIR/$(date -u +%Y%m%dT%H%M%SZ)_${SESSION_ID}.md"
rm "$WORKING"
```

**Skip this entirely when `SOURCE=coldstart`.** That memo is already in the archive — copying it
would duplicate it under a new timestamp and make the next cold start ambiguous, and deleting it
would destroy the only copy.

## Step 4 — Report, then resume

Reply to the user with:

- What you are working on (one sentence)
- The agreed next step
- One or two key constraints or gotchas, to prove you absorbed it
- On a cold start: which memo you picked and why, so a wrong pick is caught immediately

Be succinct when talking to the stakeholder. Use a numbered list where possible.

If the memo has an **Explicit next step (user-directed)** line, proceed with it immediately — do not
pause for confirmation. Otherwise end with: "Ready — shall I pick up from [next step]?"

## What NOT to do

Do not guess on a cold start. Do not archive or delete a memo that came from the archive. Do not
treat a memo written by `/sm-handover` on another machine as describing this working tree — that is
`/sm-takeover`'s job, and it verifies the commit is present locally first.

## Recovery

- **Resumed the wrong memo** — say so, stop, and re-run. Nothing is consumed on a cold start; on the
  working-copy path the memo has already been archived, so it is still addressable by ID.
- **No memo anywhere** — there is nothing to resume. Say so plainly rather than reconstructing state
  from the repo, which produces confident guesses.
