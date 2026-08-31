---
description: Pick up work handed over by /sm-handover from a different session, machine, or instance. Takes the ID printed by the handover; with no argument, lists what is available.
argument-hint: [ID]
---

# /sm-takeover

> Command source. Canonical copy in `docs/commands/`; active copy in `.claude/commands/sm-takeover.md`,
> which Claude Code reads. Version-controlled so protocol changes are reviewable.

Read a memo from the project's checkpoint archive and resume that work in this session. This is
`/sm-readpoint` decoupled from session identity — the memo may have been written by
another session, on another machine, on another day.

## Hard rules

1. **Fetch before concluding "no such ID."** The memo may not have arrived on this machine yet.
2. **Verify the memo's `HEAD` exists locally before acting on it.** Resuming against a commit you do
   not have produces confident nonsense.
3. **Never modify or delete a memo.** It is committed history, and two machines editing the same
   memo produce a merge conflict.
4. **Never `pull --rebase`, `reset`, or `stash` to make the verification in step 3 pass.** Report
   the gap and stop.

## Step by step

### 1. Resolve the ID

```bash
if   [ -d .deliveryos ]; then ARCHIVE_DIR=".deliveryos/checkpoint_history"
elif [ -d .claude ];     then ARCHIVE_DIR=".claude/checkpoint_history"
else                          ARCHIVE_DIR=".checkpoint_history"; fi

git fetch --quiet 2>/dev/null; git status --short --branch | head -1

if [ -z "$ARGUMENTS" ]; then
  echo "MODE=list"
  find "$ARCHIVE_DIR" -maxdepth 1 -name '*.md' 2>/dev/null | sort -r | while read -r f; do
    echo "=== $(basename "$f")"; head -8 "$f"
  done
else
  echo "MODE=resolve"
  ls "$ARCHIVE_DIR" 2>/dev/null | grep -F -- "$ARGUMENTS"
fi
```

The ID is any unambiguous substring of a filename — normally the first several characters of the
session id, as printed by `/sm-handover`. The listing uses `find` rather than a glob because an
unmatched glob aborts the loop under `zsh`, which is the default shell on macOS; `sort -r` puts the
newest first, since the filenames lead with a sortable UTC timestamp.

- **No argument** — render the listing as a table, newest first: ID, UTC time, the identity marker
  from line 1 if the project uses one, and the memo's one-line statement of where the work stood.
  **Stop there.** Do not pick one for the user.
- **0 matches** — say the ID is unknown, then fall back to the listing above. If the branch line
  showed this checkout is behind, suggest `git pull` first.
- **More than 1 match** — print all matches and ask which. Never guess.
- **Exactly 1 match** — that is `$MEMO`; continue.

### 2. Read the memo in full

Read `$MEMO` end to end and internalize it as the authoritative record of the state being handed
over. Pay particular attention to **State not in git** — everything listed there is absent from this
machine unless you verify otherwise. A memo with no such section was likely written by
`/sm-savepoint` rather than `/sm-handover`; treat its uncommitted-state claims as unknown.

### 3. Verify you can actually resume

```bash
git rev-parse --abbrev-ref HEAD && git rev-parse HEAD
git cat-file -e <sha-from-memo>^{commit} 2>/dev/null && echo "HANDOVER_COMMIT=present" \
                                                     || echo "HANDOVER_COMMIT=ABSENT"
git status --short
```

- **`ABSENT`** — stop. Either this checkout needs `git pull`, or the originating machine never
  pushed. Say which is likelier and do not proceed.
- **Present but this checkout is behind it** — report the gap and ask before resuming.
- **Present but this checkout is ahead or diverged** — report that too; the memo describes an older
  tree.

Then confirm every path the memo's next step depends on actually exists here, and report each miss
explicitly.

### 4. Report, then resume

Reply in short bullets:

- What you are picking up (one sentence)
- The agreed next step
- One or two key constraints or gotchas from the memo, to prove you absorbed it
- Anything under **State not in git** that is missing here and blocks the next step

If the memo has an **Explicit next step (user-directed)** line, proceed with it immediately — do not
pause for confirmation. Otherwise end with: "Ready — shall I pick up from [next step]?"

## What NOT to do

Do not edit, rename, or delete the memo. Do not take over a memo whose commit you do not have. Do
not paper over a diverged tree to make step 3 pass. Do not treat the memo's **State not in git**
list as if those files are present — they are not, unless you checked.

## Recovery

- **Took the wrong ID** — just take the right one. Memos are immutable and additive; nothing was
  consumed.
- **The memo no longer applies** — do not delete it. Run `/sm-handover` to write a fresh memo
  recording the divergence, and use that ID going forward.
- **Two sessions took over the same memo** — the later one wins by convention; the earlier should
  `/sm-handover` whatever it did before standing down, so nothing is lost.
