<!--
README.md — read this before treating anything else in this directory as current.
-->

# This kernel is superseded — `orchestration/audit/` is the live one

The five files here (`PROTOCOL.md`, `ARCHITECT_LOOP_PROMPT.md`, `AUDITOR_LOOP_PROMPT.md`,
`watcher.sh`, `DELIVERYOS_BINDINGS.md`) and the five in `orchestration/audit/` are **the same kernel
at two maturities**. As of 2026-09-01 (`CLAUDE.md`) `orchestration/` is the chassis, and retiring
this duplicate is migration step 1.

They have already diverged, substantially and in one direction:

| File | here | `orchestration/audit/` |
|---|---|---|
| `PROTOCOL.md` | 82 lines | 130 — parallel per-item lanes, round currency, the acceptance/regression split |
| `AUDITOR_LOOP_PROMPT.md` | 43 | 207 — blind from-spec authoring before reading the implementation, the round journal, lifetime branches |
| `ARCHITECT_LOOP_PROMPT.md` | 43 | 195 |
| `watcher.sh` | 79 | 130 — anchored verdict read, undelivered-submission detection |

**`PROTOCOL.md`'s own header here is now wrong about itself.** It says to keep the file
byte-identical and propagate upstream fixes by plain `cp`. There is no longer an upstream that
matches it; `orchestration/audit/PROTOCOL.md` is where the fixes went, and copying either over the
other would lose work.

## Why these files are still here

`docs/MULTI_AGENT_BUILD_PROCESS.md`'s serial per-chunk loop — the process that has actually shipped
this repo's 16 chunks — points at *these* files. Deleting them would break the working process to
tidy up for one that has never run a lane. They stay until a work item completes end to end under
`orchestration/`, which is the event that makes the migration real rather than planned.

## What to do with a change

**Make it in `orchestration/audit/`.** If it also has to apply here for the chunk loop to keep
working, make it here too and say so in the commit — but never assume a fix landed in one has
reached the other. It has not, four times over, and that is what this table is for.
