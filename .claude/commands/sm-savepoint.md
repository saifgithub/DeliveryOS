---
description: Write a session continuity memo before running /compact, so the work survives the context being cleared. The write half of the intra-session pair — /sm-readpoint reads it back afterwards. Use when the user runs /sm-savepoint, or when context is running low and a /compact is coming.
argument-hint: [explicit next step to record in the memo]
model: sonnet
---

# /sm-savepoint — write a continuity memo

> Command source. Canonical copy in `docs/commands/`; active copy in `.claude/commands/sm-savepoint.md`,
> which Claude Code reads. Version-controlled so protocol changes are reviewable.

Writes the memo that `/sm-readpoint` reads back after a `/compact`.

**Why `model: sonnet`.** This runs against the largest context the session will ever hold — that is
where its cost sits — and the memo's shape is fixed by the section list below, so it does not need
the session's top-tier model. The override applies for the rest of the turn and is never written to
settings; the session model returns on your next prompt. This command always ends by handing back to
the user, so the override cannot leak into real work. `/sm-readpoint` deliberately carries no
override for exactly that reason.

## Write the memo

Write `~/.claude/sm_checkpoint_${CLAUDE_CODE_SESSION_ID}.md`, overwriting any existing file. Be
specific and concrete — file paths, line numbers, rule names, error text, port numbers, branch names,
exact command syntax. Cover:

- **Line 1** — any identity or routing marker this project's convention requires, if it has one
  (see the project's own agent guide). Nothing if it does not.
- **Where we are**: project, module, task, and the precise state of that task
- **Plan**: if this repo has a `PLAN_LEDGER.md` (e.g. `core_platform/Docs/governance/PLAN_LEDGER.md`),
  name the exact plan-folder this session's work belongs to — it must match a row in that file.
  Write `n/a` if no plan folder applies. Omit this bullet entirely for repos with no such ledger.
- **What was decided this session**: key choices made and the reasoning behind them
- **What to do next**: the agreed next step, ideally verbatim. If `$ARGUMENTS` is
  non-empty, it's the user's explicit directive — record it verbatim under its own
  **Explicit next step (user-directed)** line instead of inferring one; this tells
  `/sm-readpoint` to act on it without pausing for confirmation.
- **Active constraints**: rules, gotchas, or warnings that surfaced and must not be forgotten
- **Open items**: anything unresolved, blocked, or flagged for later

Arguments given at this invocation: `$ARGUMENTS`

After writing the file, tell the user:

> **Savepoint written.** Now:
> 1. Run `/compact`
> 2. First message after compact: `/sm-readpoint`

## What NOT to do

Do not archive, commit, or delete anything — this writes the working copy and nothing else.
Archiving is `/sm-readpoint`'s job; committing a durable memo for a *different* session is
`/sm-handover`'s. Do not summarize; the memo's value is entirely in its specifics.

## Recovery

- **Overwrote a memo you still needed** — it is gone; the working copy is not versioned. If it had
  already been read back once, its archived copy survives and `/sm-takeover` can address it by ID.
- **Wanted to hand off to another machine, not survive a compact** — that is `/sm-handover`, which
  commits the memo. This one only ever writes to your home directory.
