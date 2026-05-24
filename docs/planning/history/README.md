# History — track O (Documentation) — DeliveryOS

Per-session wrap narratives. **Each file = one `/handover O` invocation.**

Filenames are `DOS_O<NNNN>.md` (four-digit zero-padded session number) so
`ls history/` sorts chronologically.

Don't read these unless you need historical context — **current state lives in
[`../PLANNING_STATUS.md`](../PLANNING_STATUS.md)**. The "Recent sessions" list
at the bottom of PLANNING_STATUS.md links to the most recent few.

## File shape

```markdown
---
session: DOS:O<N>
date: YYYY-MM-DD
prev: DOS:O<N-1>     # omit on the first session
---

# DOS:O<N>  (YYYY-MM-DD)

<the narrative — what shipped, what was learned, gotchas for the next session>
```

## Convention

- `/handover O` writes a new file per wrap. Never overwrites — if the same
  session is re-wrapped, the second file gets a `.1` suffix.
- The "What just landed" section is no longer present in PLANNING_STATUS.md.
- Earlier sessions (if any) were split from the legacy `PLANNING_HISTORY.md`
  monolith on 2026-05-25.
