# History — track P (Project Management) — DeliveryOS

**Closed convention — no longer receives new entries.** Per-session wrap narratives written by
`/sm-handover P`, retired in favor of the `/sm-checkpoint` archive mechanism
(`.claude/checkpoint_history/`); see `docs/MULTI_AGENT_BUILD_PROCESS.md` §12. Kept for historical
context only.

Filenames are `DOS_P<NNNN>.md` (four-digit zero-padded session number) so
`ls history/` sorts chronologically.

`PM_STATUS.md` (this directory's former "current state" doc) was retired alongside
`/sm-handover`; current state now lives in the checkpoint-archive convention referenced above.

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

## Convention (historical)

- `/sm-handover P` wrote a new file per wrap. Never overwrote — if the same
  session was re-wrapped, the second file got a `.1` suffix.
- Earlier sessions (if any) were split from the legacy `PM_HISTORY.md`
  monolith on 2026-05-25.
