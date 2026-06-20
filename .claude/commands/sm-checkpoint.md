# /sm-checkpoint — Context Continuity

This command preserves and restores your working context across a `/compact` operation. You are writing a memo to your future self.

## Step 1 — Detect phase

Run this and observe the output:

```bash
SESSION_ID="${CLAUDE_CODE_SESSION_ID:-fallback-$(hostname)-$$}"
ls ~/.claude/sm_checkpoint_${SESSION_ID}.md 2>/dev/null && echo "EXISTS" || echo "MISSING"
```

---

## Phase: SAVE (output was MISSING)

The checkpoint file does not exist. You are saving context before a compact.

Write `~/.claude/sm_checkpoint_${CLAUDE_CODE_SESSION_ID}.md` with a free-form synthesis of everything a future Claude needs to continue this work without asking the user to re-explain anything. Be specific and concrete — include file paths, line numbers, rule names, error text, port numbers, branch names, exact command syntax. Cover:

- **Where we are**: project, module, task, and the precise state of that task
- **What was decided this session**: key choices made and the reasoning behind them
- **What to do next**: the agreed next step, ideally verbatim
- **Active constraints**: rules, gotchas, or warnings that surfaced and must not be forgotten
- **Open items**: anything unresolved, blocked, or flagged for later

Write as if briefing yourself after a week away. One focused document, no headers needed, prose or bullets — whatever captures it fastest.

After writing the file, tell the user:

> **Checkpoint saved.** Now:
> 1. Run `/compact`
> 2. First message after compact: `/sm-checkpoint`

---

## Phase: RESTORE (output was EXISTS)

The checkpoint file exists. You are restoring context after a compact.

1. Read `~/.claude/sm_checkpoint_${CLAUDE_CODE_SESSION_ID}.md` in full
2. Internalize it — treat it as the authoritative record of current session state
3. Delete the file: `rm ~/.claude/sm_checkpoint_${CLAUDE_CODE_SESSION_ID}.md`
4. Reply to the user with:
   - What you are working on (one sentence)
   - The agreed next step
   - One or two key constraints or gotchas to prove you absorbed it
5. End with: "Ready — shall I pick up from [next step]?"
