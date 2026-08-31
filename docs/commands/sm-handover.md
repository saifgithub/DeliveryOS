---
description: Write a durable, git-committed handover memo so a DIFFERENT session — another machine, another instance, or a fresh session after a crash — can pick the work up with /sm-takeover. Unlike /sm-savepoint this is not keyed to the current session id.
argument-hint: [explicit next step for the receiving session]
model: sonnet
---

# /sm-handover

> Command source. Canonical copy in `docs/commands/`; active copy in `.claude/commands/sm-handover.md`,
> which Claude Code reads. Version-controlled so protocol changes are reviewable.

Write a handover memo into the project's checkpoint archive and commit it, so another session can
resume this work with `/sm-takeover <ID>`.

**This is not `/sm-savepoint`.** That pair is intra-session: it stashes a memo in your home
directory keyed to `$CLAUDE_CODE_SESSION_ID` and reads it back after `/compact`. That file is
invisible to every other session and never reaches another machine. `/sm-handover` is the
inter-session channel — the memo lives in the repo, in git, addressed by an ID anyone can type.

> **Why `model: sonnet`.** Writing the memo is a structured extraction over a large context — the
> expensive part of this command, and a fixed-shape task. The override lasts only the current turn
> and is never written to settings. Like `/sm-savepoint`, this command always terminates by
> handing back to the user, so the override cannot leak into resumed work. `/sm-takeover`
> deliberately carries **no** override: it exists to resume someone else's work, which is the last
> place to economize.

## Hard rules

1. **Commit only the memo, by pathspec.** `git add -- "$MEMO"` then `git commit -m … -- "$MEMO"`.
   Never `git add -A`, never `git add .`. Both halves are load-bearing: the `add` is needed because
   the memo is untracked, and the pathspec on `commit` makes it a partial commit — anything already
   staged from unrelated work stays staged and stays out of this commit.
2. **Never commit, stash, or revert anything else.** The working tree is routinely dirty with
   in-flight work and must be left exactly as you found it. A dirty tree is a fact to *record in the
   memo*, not a problem to fix.
3. **Never push, force, `--no-verify`, pull, rebase, or reset.** Print the push command and let the
   user run it.
4. **The memo must be committable.** If the resolved archive directory is git-ignored or outside the
   repo, stop and say so — a handover that cannot reach another machine hands nothing over.
5. **Write for a reader with no shared disk.** The receiving session may be on other hardware.
   Anything that exists only in your working tree, your shell, or your `/tmp` does not travel.
6. **Handover is terminal for the memo, not for the session.** The working copy in `~/.claude/` is
   removed, so this session's next `/sm-readpoint` has nothing stale to restore and a later
   stale duplicate. You may keep working afterwards.

## Step by step

### 1. Resolve the archive directory

```bash
SESSION_ID="${CLAUDE_CODE_SESSION_ID:-fallback-$(hostname)-$$}"

if   [ -d .deliveryos ]; then ARCHIVE_DIR=".deliveryos/checkpoint_history"
elif [ -d .claude ];     then ARCHIVE_DIR=".claude/checkpoint_history"
else                          ARCHIVE_DIR=".checkpoint_history"; fi
mkdir -p "$ARCHIVE_DIR"

MEMO="${ARCHIVE_DIR}/$(date -u +%Y%m%dT%H%M%SZ)_${SESSION_ID}.md"
echo "MEMO=${MEMO}"
git check-ignore -q "$MEMO" && echo "FATAL: archive dir is git-ignored — stop" || echo "committable"
```

The filename format is deliberately identical to the one `/sm-readpoint` writes when it archives, so
the two commands share one archive and `/sm-takeover` can address either kind of memo.

This resolution deliberately **has no `$HOME` fallback**, unlike `/sm-readpoint`'s archive step.
That one can archive to `$HOME` because it runs in the same session on the same box; a
handover memo in `$HOME` can never be committed, so the last tier is an in-repo directory instead.
Do not "fix" this into consistency.

### 2. Capture the git state the receiving session must match

```bash
git rev-parse --abbrev-ref HEAD && git rev-parse HEAD
git log --oneline -5
git status --short
```

### 3. Write the memo

Write `~/.claude/sm_checkpoint_${SESSION_ID}.md`. Be specific and concrete — file paths, line
numbers, rule names, error text, port numbers, branch names, exact command syntax. Cover:

- **Line 1** — any identity or routing marker this project's convention requires, if it has one
  (see the project's own agent guide). Nothing if it does not.
- **Handover**: UTC timestamp, hostname, branch, and the `HEAD` sha from step 2.
- **Where we are**: project, module, task, and the precise state of that task
- **What was decided this session**: key choices made and the reasoning behind them
- **What to do next**: the agreed next step, ideally verbatim. If `$ARGUMENTS` is non-empty, it's
  the user's explicit directive — record it verbatim under its own **Explicit next step
  (user-directed)** line instead of inferring one; this tells `/sm-takeover` to act on it without
  pausing for confirmation.
- **State not in git**: the section `/sm-savepoint` doesn't need and this one can't omit. Every
  uncommitted and untracked path from step 2, one line each on what it holds and whether it matters;
  running servers, ports, and background jobs; local-only env vars and `.env` contents **by name,
  never by value**; whether a dependency install is needed; local worktrees and branches never
  pushed. If a dirty path is load-bearing for the next step, **bold it** — the receiver cannot see it.
- **Active constraints**: rules, gotchas, or warnings that surfaced and must not be forgotten
- **Open items**: anything unresolved, blocked, or flagged for later

Arguments given at this invocation: `$ARGUMENTS`

### 4. Archive, clear the working copy, commit

```bash
cp ~/.claude/sm_checkpoint_${SESSION_ID}.md "$MEMO"
rm ~/.claude/sm_checkpoint_${SESSION_ID}.md

git add -- "$MEMO"
git commit -q -m "chore(handover): <one-line summary of the state handed over>" -- "$MEMO"
git log --oneline -1
git status --short
```

Confirm the final `git status --short` matches step 2's apart from the memo. If it doesn't, say so
— something else got committed and that is a bug in this run, not a detail to skip.

### 5. Tell the user

> **Handover written and committed** — `<sha>`
> ID: **`<first 8 chars of the session id>`** · file: `<basename of $MEMO>`
> Push it: `git push`
> Then on the other session: `git pull` → `/sm-takeover <ID>`
> Not carried over (dirty here, not in git): `<paths, or "nothing">`

If step 2 showed a dirty tree, repeat that list prominently. It is the single most common way a
handover silently loses work.

## What NOT to do

Do not broaden the `git add`. Do not "tidy the tree first". Do not push. Do not summarize — the
memo's value is entirely in its specifics. Do not `/compact` afterwards on the assumption the memo
covers you: it lives in git, not in this session, and `/sm-savepoint` is what covers a compaction.

## Recovery

- **Memo written but commit failed** — the file is on disk at the path printed in step 1. Fix the
  cause and re-run step 4 only.
- **Handed over the wrong state** — run `/sm-handover` again; it writes a fresh file with a new
  timestamp. Never edit or delete a memo that is already committed — tell the receiving session
  which ID is live.
- **Working copy already existed in `~/.claude/`** — a pending `/sm-savepoint`. Read it as raw
  material, then overwrite it in step 3 as normal; step 4 removes it either way.
