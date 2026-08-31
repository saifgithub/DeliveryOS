# History — track R (Development) — DeliveryOS

**Closed convention — no longer receives new entries.** Per-session wrap narratives written by
`/sm-handover R` — the old config-driven command, not today's `/sm-handover` — retired in favor of
the `/sm-savepoint` + `/sm-readpoint` archive mechanism (`.deliveryos/checkpoint_history/`); see
`docs/MULTI_AGENT_BUILD_PROCESS.md` §12. Kept for historical context only.

Filenames are `DOS_R<NNNN>.md` (four-digit zero-padded session number) so
`ls history/` sorts chronologically.

`../BUILD_STATUS.md` (this directory's former "current state" doc) is renamed to
`../CHUNK_LEDGER.md` — resolved 2026-07-27: it doubled as the Architect's active per-chunk build
state, so it isn't retired like `PLANNING_STATUS.md`/`PM_STATUS.md`, just renamed and stripped of
the handover-ritual framing (the "read this first" pointer, `/sm-start-fresh` line, and the stale
"how to start next session" narrative are gone). Structural debt and cohesion-check entries that
used to live inside it now go to `../STRUCTURAL_DEBT.md` and `../COHESION_LOG.md` instead.

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
