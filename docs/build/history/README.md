# History — track R (Development) — DeliveryOS

Per-session wrap narratives. **Each file = one `/handover R` invocation.**

Filenames are `DOS_R<NNNN>.md` (four-digit zero-padded session number) so
`ls history/` sorts chronologically.

Don't read these unless you need historical context — **current state lives in
[`../BUILD_STATUS.md`](../BUILD_STATUS.md)**. The "Recent sessions" list
at the bottom of BUILD_STATUS.md links to the most recent few.

## File shape

```markdown
---
session: DOS:R<N>
date: YYYY-MM-DD
prev: DOS:R<N-1>     # omit on the first session
---

# DOS:R<N>  (YYYY-MM-DD)

<the narrative — what shipped, what was learned, gotchas for the next session>
```

## Convention

- `/handover R` writes a new file per wrap. Never overwrites — if the same
  session is re-wrapped, the second file gets a `.1` suffix.
- The "What just landed" section is no longer present in BUILD_STATUS.md.
- Earlier sessions (if any) were split from the legacy `BUILD_HISTORY.md`
  monolith on 2026-05-25.
