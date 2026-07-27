# History — track R (Development) — DeliveryOS

**Closed convention — no longer receives new entries.** Per-session wrap narratives written by
`/sm-handover R`, retired in favor of the `/sm-checkpoint` archive mechanism
(`.claude/checkpoint_history/`); see `docs/MULTI_AGENT_BUILD_PROCESS.md` §12. Kept for historical
context only.

Filenames are `DOS_R<NNNN>.md` (four-digit zero-padded session number) so
`ls history/` sorts chronologically.

`../BUILD_STATUS.md` (this directory's "current state" doc) is **not** retired — unlike
`PLANNING_STATUS.md`/`PM_STATUS.md`, it doubles as the Architect's active per-chunk ledger
(`docs/MULTI_AGENT_BUILD_PROCESS.md` §4/§6/§9), so its fate is a separate, still-open decision. It
continues to be read/written directly by the Architect; `/sm-handover` no longer touches it.

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

## Convention (historical)

- `/sm-handover R` wrote a new file per wrap. Never overwrote — if the same
  session was re-wrapped, the second file got a `.1` suffix.
- Earlier sessions (if any) were split from the legacy `BUILD_HISTORY.md`
  monolith on 2026-05-25.
