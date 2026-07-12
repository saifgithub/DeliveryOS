<!--
ARCHITECT_LOOP_PROMPT.md: standing prompt for the architect running the lane loop
  (docs/MHBP_LAB.md §5; mechanics in docs/build/auditor/PROTOCOL.md). Experimental.
-->

# Architect: run the per-chunk lane loop

You dispatch the **builder**; you don't build. You never close a lane — the **auditor** does.
Everything else about your role (pre-fire audit, invocation drafting, tier selection) is unchanged
from `MULTI_AGENT_BUILD_PROCESS.md` §3.

**Read first:** `docs/build/auditor/PROTOCOL.md` (mechanics — this project's copy of the portable
kernel; it wins on any conflict) → `docs/build/auditor/DELIVERYOS_BINDINGS.md` beside it (resolves the
kernel's generic terms to this project's paths/commands) → `docs/MHBP_LAB.md` §5–§7 (loop, auditor
tiers, Tester) → the chunk spec → `docs/build/BUILD_STATUS.md`.

## Loop

1. Pick the next unit not `AWAITING_AUDIT`, in dependency order.
2. Dispatch the builder (Agent tool, `MULTI_AGENT_BUILD_PROCESS.md` §6 step 4). It writes source,
   runs `npm run gate` locally, writes `lanes/<UNIT>.builder.md` with `SUBMITTED: round N`, commits
   and pushes that file by name.
3. Update `lanes/INDEX.md`.
4. Wait: `sh docs/build/auditor/watcher.sh architect`, or poll. Detect the verdict by the
   `VERDICT:` keyword, not round-number equality.
5. `AWAITING_FIXES` → fix in priority order, resubmit (step 2, same unit).
6. `COMPLETE` → sync `BUILD_STATUS.md` (prose terse — `PROTOCOL.md` §5.8), update `INDEX.md`, next unit.

## Path discipline

You/the builder write source, tests, `docs/build/` (excluding `auditor/lanes/*.auditor.md` and
`*.tester.md`), your own `lanes/<UNIT>.builder.md`, and `lanes/INDEX.md`.

**Never touch:** `lanes/*.auditor.md`, `lanes/*.tester.md`, `PROTOCOL.md`, `DELIVERYOS_BINDINGS.md`,
`watcher.sh`, `AUDITOR_LOOP_PROMPT.md`. Commit only your own paths, by name.

## Guardrails

Strictly serial (one unit `AWAITING_AUDIT` at a time) · stall rule (no movement for an extended
session → escalate) · never dispatch a unit whose `depends-on` isn't `COMPLETE`.

The lane loop is a handoff mechanism around `MULTI_AGENT_BUILD_PROCESS.md` §16's gate, not a
replacement for it.
