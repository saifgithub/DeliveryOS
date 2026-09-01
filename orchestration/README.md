<!--
README.md — map of the multi-agent orchestration system ("the all-agent company").
PORTABLE CORE — see PORTABLE_MANIFEST.md for what copies and what does not.
Start here. Generic core is copy-verbatim across projects; per-project specifics live in the
BINDINGS files + roster/.
-->

# Orchestration — the all-agent company

How a fleet of specialized agent **instances** builds this project in parallel without colliding,
with every code change independently verified before it lands. File-based, git-mediated — no shared
mutable flag; state derived from round-number watermarks; disjoint write-paths; delivery on origin.

## The two layers

| Layer | Path | Handshake | Owner docs |
|---|---|---|---|
| **Dispatch** | [`dispatch/`](dispatch/) | Architect → builder (assign → build → integrate) | [DISPATCH_PROTOCOL.md](dispatch/DISPATCH_PROTOCOL.md) |
| **Audit** | [`audit/`](audit/) | builder → Auditor (independent verify) | [audit/PROTOCOL.md](audit/PROTOCOL.md) |

A builder instance is the **bridge**: it receives a lane from the Architect (dispatch) and, when
ready, submits into the audit layer; the Auditor's `VERDICT` flows back up. Shared role model:
[ROLES.md](ROLES.md).

## Tree

```
<ORCH_ROOT>/                           # wherever this tree was vendored (BINDINGS)
  README.md · ROLES.md                 # start here; the 4-role model (shared)
  dispatch/                            # Architect ↔ instance layer
    DISPATCH_PROTOCOL.md · dispatch.sh # generic contract + state-deriver/watcher
    BINDINGS.md                        # per-project: paths, hosts, hot-files, hosting/launch
    loop_prompts/{ARCHITECT,AUDITOR,CODER,NONCODER}.md
    roster/<instance-id>.md            # the fleet (open — add a file to add an instance)
    board.md · trail.md                # ops dashboard + active ledger (bounded)
    lanes/<ITEM>.assign.md · <ITEM>.<instance-id>.md   # the live queue
    intake/                            # requester drafts awaiting triage
  audit/                              # builder ↔ Auditor layer (was audit/handshake/)
    PROTOCOL.md · watcher.sh · <PROJECT>_BINDINGS.md
    AUDITOR_LOOP_PROMPT.md · ARCHITECT_LOOP_PROMPT.md
    cr/ · runs/ · regression/ · audit-trail.md
  history/                            # durable memory: archived DONE lanes + rotated ledger
```

## The org (roles)

**Architect** (1, COO) assigns + integrates, never builds or self-closes · **Auditor** (≥1, QA)
independently verifies · **Coder** (many) builds a bound domain · **Non-coder** (≥1) *requesters*
feed work in via intake drafts / *maintainers* edit non-code assets. The stakeholder is CEO — provisions
Tier-1 things and is the single acceptance checkpoint after COMPLETE. Details: [ROLES.md](ROLES.md).

## Running it

- **Instances are independent — they share no memory with each other or with the Architect.** What an
  instance actually *is* (a session, a process, a script, a service, a person) is its
  `impl.kind`; the launch and re-attach commands are its **implementation profile**. See
  [dispatch/BINDINGS.md](dispatch/BINDINGS.md) → Implementation profiles.
- **Board:** `sh <ORCH_ROOT>/dispatch/dispatch.sh state`. **Watch (Architect):** `… architect`.
  **Watch (an instance):** `… inst <id>`.
- **Context/cost:** instances are short-lived per-lane; continuity is in files, so they re-launch or
  resume rather than growing. No human ever manages an instance's context.
  DISPATCH_PROTOCOL.md §8.8–8.9.

## Memory

`history/` (archived lanes + rotated dispatch trail) + `dispatch/trail.md` + `audit/audit-trail.md`
+ `audit/trail/` (rotated audit ledger) + `audit/runs/` are the operational history; the Architect
distills durable lessons into the project's own memory + failure-pattern register.

**Both ledgers stay small by rotation** — `dispatch/rotate_trail.py` (ledger-agnostic, ~4-day
window) rolls old rows into monthly archives. Each ledger is rotated by ITS sole writer: the
Architect rotates `dispatch/trail.md` → `history/trail/`; the Auditor rotates `audit/audit-trail.md`
→ `audit/trail/`. Query the ledgers, don't slurp them ([history/README.md](history/README.md)).

## Replicating in another project

1. `cp -r` this tree. **[PORTABLE_MANIFEST.md](PORTABLE_MANIFEST.md) is the authoritative copy
   list** — what goes verbatim, what is written once per project, what must never be copied.
2. **Scrub** the tier-B and tier-C files the copy brought with it, out of the tree. A stale
   `roster/` is the worst of them: every field in it reads as a real binding.
3. **Run [install/INSTALL_INTERVIEW.md](install/INSTALL_INTERVIEW.md)** — ten phases. It conducts
   the stand-up, creates a register if the project has none, and emits both BINDINGS files, the
   roster and the DoD bindings.
4. **`sh install/check_bindings.sh`** — six checks, and **its exit code is the only claim that the
   stand-up is complete.** Then `sh dispatch/dispatch.sh state` should print an empty board.

The only code an adopting project writes is its own `gate_check.sh`, and only if it uses
`GATE: machine`. Everything else is bindings.

Portable files contain **no project name, no host, no path outside this tree, no person's name, and
no harness, tool or model name.** If you find one, it is a bug in the split, not a detail to
preserve — move it to BINDINGS. `check_bindings.sh` checks 4 and 5 are that rule, executable.
