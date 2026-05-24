# History — track P (Project Management) — DeliveryOS

Per-session wrap narratives. **Each file = one `/handover P` invocation.**

Filenames are `DOS_P<NNNN>.md` (four-digit zero-padded session number) so
`ls history/` sorts chronologically.

Don't read these unless you need historical context — **current state lives in
[`../PM_STATUS.md`](../PM_STATUS.md)**. The "Recent sessions" list
at the bottom of PM_STATUS.md links to the most recent few.

## File shape

```markdown
---
session: DOS:P<N>
date: YYYY-MM-DD
prev: DOS:P<N-1>     # omit on the first session
---

# DOS:P<N>  (YYYY-MM-DD)

<the narrative — what shipped, what was learned, gotchas for the next session>
```

## Convention

- `/handover P` writes a new file per wrap. Never overwrites — if the same
  session is re-wrapped, the second file gets a `.1` suffix.
- The "What just landed" section is no longer present in PM_STATUS.md.
- Earlier sessions (if any) were split from the legacy `PM_HISTORY.md`
  monolith on 2026-05-25.
