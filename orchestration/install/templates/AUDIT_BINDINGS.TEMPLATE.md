<!--
AUDIT_BINDINGS.TEMPLATE.md — shape for audit/<PROJECT>_BINDINGS.md. PORTABLE CORE: copy verbatim,
emit once per project. NAME THE EMITTED FILE AFTER THE PROJECT — that is the whole reason a re-copy
of the portable set can never clobber it. No sample answers.
EMITS-TO: audit/*_BINDINGS.md
-->

# <UNBOUND> bindings for audit/PROTOCOL.md

## Token resolution

| Term | Binding |
|---|---|
| `<ITEM>` id format | <UNBOUND> — must match the dispatch BINDINGS' answer; one format, one project |
| `<AUDIT_ROOT>` | <UNBOUND> |
| `<AUDIT_LANE_DIR>` | <UNBOUND> |
| `<DISPATCH_ROOT>` | <UNBOUND> |
| SOURCE vs AUDITOR path split | <UNBOUND> — state both sides explicitly, as paths |
| Independent regression suite | <UNBOUND> — what the auditor re-runs itself, from its own checkout |
| The acceptance runner | <UNBOUND> — the non-agentic runner, or `none — no acceptance runner exists`. Do not bind the regression suite here unless it actually adjudicates independently authored per-item checks; they are different claims and the DoD has a separate row for each |
| `<GATE_RUN_RECORD>` | <UNBOUND> — path, result field, revision field. `N/A` where no runner is bound |
| Acceptance-check directory | <UNBOUND> — where `acceptance/<ITEM>/` lives, and confirmation that no implementing instance's `owns:` set covers it |
| Worktree under a machine gate | <UNBOUND> — mandatory where `GATE: machine` is used; an archive-style checkout cannot record its revision |
| Deploy-target environment | <UNBOUND> |
| Device-only marker | <UNBOUND> |
| `<SYNC_COMMAND>` | <UNBOUND> |
| Auditor identity | <UNBOUND> — the `auditor.*` roster entry that gates this project, its band and its family. **Install-owned**: the Architect may start it and may not write it |
| Handover model | <UNBOUND> — how a round survives an instance ending mid-audit |
| Escalation precedents | <UNBOUND> — `none yet` at stand-up |

## Gap-fills

Anything `PROTOCOL.md` leaves to the project. Where a value merely repeats the dispatch BINDINGS,
say so and point at it rather than restating it — a second copy is a second thing to drift.

| Gap | This project's answer |
|---|---|
| Concurrency cap | <UNBOUND> |
| Stall window | <UNBOUND> |
