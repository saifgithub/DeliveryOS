<!--
ROLES.md — the role model for the multi-agent orchestration protocol. GENERIC and
PROJECT-AGNOSTIC: copy this file verbatim into any project. All project specifics (paths, hosts,
the actual roster of instances) live in BINDINGS.md + roster/, never here.
Owner: the Architect. Companion: DISPATCH_PROTOCOL.md (mechanics).
-->

# Roles — an all-agent company

Four roles. A **role** is a stable abstraction; an **agent is an instance** of a role bound to a
narrow sub-specification. Only the Architect is a singleton — every other role scales by adding
instances. The Architect maintains the roster — with one exception, and it is the one that keeps the
gate real: **an `auditor.*` entry, and the `auditor:` field pointing a coder at one, are written at
stand-up and are not the Architect's to change** (DISPATCH_PROTOCOL.md §2).

## The org

| Role | Per project | Codes? | Function |
|---|---|---|---|
| **Architect** | **exactly 1** | no | Maintains the roster. Triages incoming requests, files the work item, assigns a lane to a specific instance, integrates on COMPLETE. Never builds source; **never self-closes a lane**. |
| **Auditor** | **≥1** (shard by domain) | no — verifies | The independent verification gate. Re-runs, re-reads, re-measures; never closes on the builder's word. Multiple auditors parallelize review (e.g. `auditor.backend`, `auditor.mobile`). |
| **Non-coder** | **≥1**, specialized | no | **Requester** sub-kind feeds work items IN — drafts into intake, proposing which register the item belongs in; never mints an id. **Maintainer** sub-kind edits non-code assets (content, data, docs, translations). Gated by content-review, not the Auditor. |
| **Coder** | **many**, granular | yes | Builds within a bound domain (its sub-specification). Routed through an Auditor. |

## The company metaphor (how to reason about it)

- **Architect = COO.** Runs operations; does not set strategy and does not do the building.
- **The stakeholder = CEO / board.** Sets strategy and does the things only they can do
  (accounts, money, legal, pricing, business decisions, real-device testing, store submissions).
  **The stakeholder is the single acceptance checkpoint after COMPLETE.** This is an audited
  operation, not an autonomous swarm.
  **"The stakeholder" is the protocol's only term for the person these files answer to** — the
  portable files never name an individual, and "the human" where it appears means exactly this
  role. Who it resolves to is a BINDINGS entry, not a fact any portable file states.
- **Auditor = QA / compliance.** Independent sign-off — separation of duties. Operations cannot
  approve its own work.
- **Coders = engineering. Non-coders = content / marketing / support / intake.**
- Lanes = work orders. `board.md` = the ops dashboard. `trail.md` = the company record.
  A per-instance WIP cap = not overloading a team.

## Capability bands

Every instance runs at a **band**, never at a named model. Bands are the protocol's only vocabulary
for capability: a portable file names the band, BINDINGS names what fills it here, and a roster entry
records which band that instance runs at.

| Band | Capability profile | Where it belongs |
|---|---|---|
| **Economy** | Fast, low context, good at mechanical and deterministic tasks | Status reads, log parsing, boilerplate scaffolding, config-only chunks, ledger updates |
| **Standard** | Strong reasoning, large context, good at implementation | Writing code, running tests, routine analysis — most coder and chunk-audit work |
| **Premium** | Highest reasoning, best at complex design and judgment | Design decisions, BLOCKER resolution, escalated attempts, the item-level audit |

**Never name a model in a portable file, and never name one in an invocation — name the band.** A
band is a level of capability; which model sits at that level changes on a timescale shorter than
this protocol's, and a project that hardcodes one inherits a stale answer the day it copies the tree.

**A band is model *and* harness together.** The same weights behind a different tool loop — different
context budget, different tool access, different retry behaviour — is not the same band. Bind the
pair, not the model.

**Never Economy for an auditor.** A cheap auditor returns a confident `COMPLETE` it never earned,
which is worse than no auditor: it manufactures false confidence where an absent one would at least
leave a visible gap.

## Load-bearing rules (do not weaken)

1. **Separation of duties.** The Architect assigns and integrates but never verifies its own
   fleet's output as "done" — COMPLETE is an Auditor call. A Coder never closes its own findings.
   A Requester never mints the dispatched work item (only the Architect does). A Maintainer never
   ships code.
2. **One role, many instances.** Everything is addressed to a specific **instance ID**
   (`<role>.<spec>`), never to a role in the abstract. See DISPATCH_PROTOCOL.md §2.
3. **The fleet is open.** A new instance joins by dropping a `roster/<instance-id>.md`; nothing in
   the protocol or `dispatch.sh` hardcodes the roster. Auditor entries are the exception above.
4. **Independence is structural, not promised.** The Auditor's independence rests on things that are
   true whether or not anyone reads a prompt: disjoint write-paths, re-verification of committed
   SHAs, an install-owned roster entry the Architect cannot rewrite, and — where a project has a
   non-agentic runner — acceptance checks the implementing instance does not own and therefore
   cannot edit. **Prompt instructions are not controls.** Each of those is checkable by someone who
   distrusts every agent in the fleet; that is the test a control has to pass.
5. **Decorrelation is the fifth, and the one a project can legitimately not have.** An auditor drawn
   from the same model family as what it audits fails where its subject fails. A project with one
   available family declares that (`DECORRELATION: waived`, DISPATCH_PROTOCOL.md §2) rather than
   pretending otherwise — a declared weakness is worked around; an undeclared one is relied upon.
