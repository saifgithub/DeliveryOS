# /sm-checkpoint — Context Continuity

Preserves and restores working context across `/compact`.

## Step 1 — Detect phase

Run this and observe the output:

```bash
SESSION_ID="${CLAUDE_CODE_SESSION_ID:-fallback-$(hostname)-$$}"
ls ~/.claude/sm_checkpoint_${SESSION_ID}.md 2>/dev/null && echo "EXISTS" || echo "MISSING"
```

---

## Phase: SAVE (output was MISSING)

Write `~/.claude/sm_checkpoint_${CLAUDE_CODE_SESSION_ID}.md`. Be specific and concrete
— file paths, line numbers, rule names, error text, port numbers, branch names, exact
command syntax. Cover:

- **Where we are**: project, module, task, and the precise state of that task
- **What was decided this session**: key choices made and the reasoning behind them
- **What to do next**: the agreed next step, ideally verbatim
- **Active constraints**: rules, gotchas, or warnings that surfaced and must not be forgotten
- **Open items**: anything unresolved, blocked, or flagged for later

After writing the file, tell the user:

> **Checkpoint saved.** Now:
> 1. Run `/compact`
> 2. First message after compact: `/sm-checkpoint`

---

## Phase: RESTORE (output was EXISTS)

1. Read `~/.claude/sm_checkpoint_${CLAUDE_CODE_SESSION_ID}.md` in full and internalize
   it as the authoritative record of current session state
2. Archive the checkpoint, then remove the working copy:
   ```bash
   mkdir -p .deliveryos/checkpoint_history
   cp ~/.claude/sm_checkpoint_${CLAUDE_CODE_SESSION_ID}.md ".deliveryos/checkpoint_history/$(date -u +%Y%m%dT%H%M%SZ)_${CLAUDE_CODE_SESSION_ID}.md"
   rm ~/.claude/sm_checkpoint_${CLAUDE_CODE_SESSION_ID}.md
   ```
3. Reply to the user with:
   - What you are working on (one sentence)
   - The agreed next step
   - One or two key constraints or gotchas to prove you absorbed it
4. End with: "Ready — shall I pick up from [next step]?"
