<!--
REGISTER.TEMPLATE.md — shape for a work-item register, for a project that has none yet
(INSTALL_INTERVIEW.md phase 2.2). PORTABLE CORE: copy verbatim.

THIS IS THE ONE TEMPLATE THAT EMITS OUTSIDE <ORCH_ROOT>. The register belongs to the project, not to
the protocol, so it lives in the project's own docs. That is a deliberate, stated exception to the
tier-A rule against naming a path outside this tree — and it holds because THIS FILE NAMES NO PATH:
the interview asks where the register goes and records the answer as its <REGISTER_PATH>.

Its fields ARE DISPATCH_PROTOCOL.md §1a's contract, so a register scaffolded from this file
satisfies that contract by construction rather than by review.
EMITS-TO: <interview-bound>
-->

# <UNBOUND> register

**Item kind:** `<UNBOUND>` · **Id format:** `<UNBOUND>` · **DoD applies:** `<UNBOUND>`

**Status vocabulary:** `<UNBOUND>` — list every value, and mark which one means *not yet started*,
which mean *being worked*, and which mean *closed*. The Architect writes these values onto rows
verbatim, so they are exact, not descriptive.

**This file is the source of truth for the status of every item in it.** A status restated anywhere
else — a plan doc, a ledger, a board, a second register — is a cache. Caches drift, nothing detects
the drift, and the drift is silent in the direction that matters (a row that says closed while the
work is not).

**The board is not this list.** `dispatch.sh state` shows only items someone opened a lane for. Ask
this register what exists; ask the board what is moving.

## Rows

| Id | Title | Status | Spec | Opened | Closed |
|---|---|---|---|---|---|
| | | | | | |

- **Id** — in the project's `<ITEM>` id format. Minted by the Architect only, at triage. A requester
  proposes an item; it never names one.
- **Spec** — this register's `<SPEC_POINTER>`: how this row points at the item's own specification.
  A lane's `ACCEPTANCE:` resolves through it. **A row whose spec target does not exist is not
  dispatchable** — that item was minted out of order.
- **Status** — one value from the vocabulary above. Nothing else.

## Adding a row

1. The Architect mints the id and writes the row, at triage — after an intake draft reaches
   `TRIAGE: ACCEPTED`, or when it opens planned work directly.
2. The spec is authored at the `<SPEC_POINTER>` target **before** a lane is opened.
3. The lane's `REGISTER:` token names this register and this row.
4. On the Auditor's COMPLETE and the Architect's integration, the status moves to *closed*. That is
   the only write to this row anyone makes after it is opened, unless the item is reopened.
