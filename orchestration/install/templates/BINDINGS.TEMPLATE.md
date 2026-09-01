<!--
BINDINGS.TEMPLATE.md — shape for dispatch/BINDINGS.md. PORTABLE CORE: copy verbatim, emit once per
project via install/INSTALL_INTERVIEW.md. Every cell below is <UNBOUND> on purpose: this file
carries NO sample answers, because a sample answer in a template is an answer a hurried installer
accepts, and it would be the previous project's.
EMITS-TO: dispatch/BINDINGS.md
-->

# <UNBOUND> bindings for DISPATCH_PROTOCOL.md

Stood up <UNBOUND> (date). Every row below must resolve before the first lane is dispatched — an
unbound token is a stand-up error, not an empty cell.

## Token resolution

| Token | Binding |
|---|---|
| `<ORCH_ROOT>` | <UNBOUND> |
| `<DISPATCH_ROOT>` | <UNBOUND> |
| `<AUDIT_ROOT>` | <UNBOUND> |
| `<AUDIT_LANE_DIR>` | <UNBOUND> |
| `<WORKTREE_DIR>` | <UNBOUND> |
| `<TAG_PREFIX>` | <UNBOUND> |
| `<ITEM>` id format | <UNBOUND> — one format for the project; registers state which slice they use |
| `<TZ>` | <UNBOUND> — the timezone both ledger headers stamp in |
| `<SYNC_COMMAND>` | <UNBOUND> — what an instance runs to bring its checkout level with origin before deriving state |
| `<GATE_RUN_RECORD>` | <UNBOUND> — the non-agentic runner's own record: its path, its result field, and its revision field. Under `<AUDIT_ROOT>/**` or untracked. `N/A` where no runner is bound |
| `<DOD_BINDINGS_PATH>` | <UNBOUND> — with the project's governance docs, outside this tree |
| The stakeholder | <UNBOUND> — one person or role. The only place a name may appear |
| Shared branch | <UNBOUND> — and what "delivered" means on it |
| Test command — per surface | <UNBOUND> — one row per delivery surface, runnable from the repo root |
| The contract check | <UNBOUND> |
| The long-running test command | <UNBOUND> — and the wrapper that runs it |
| The content self-test | <UNBOUND> |
| Live-stack verification | <UNBOUND> — how the real thing is exercised for real |
| The device-only marker | <UNBOUND> |
| Architect's inner process | <UNBOUND> — the project's normal session flow the Architect builds under |
| Continuity / status record | <UNBOUND> — where current build state is kept between sessions |
| Per-instance WIP cap | <UNBOUND> |
| Global audit cap | <UNBOUND> |
| Stall window | <UNBOUND> — nothing computes this; state that here |
| Escalation precedents | <UNBOUND> — `none yet` is correct at stand-up and the only honest answer |

## Registers (DISPATCH_PROTOCOL.md §1a)

One block per register. At least one is required.

| Register id | `<REGISTER_PATH>` | `<ITEM_KIND>` | `<STATUS_VOCAB>` | `<SPEC_POINTER>` | `<DOD_APPLIES>` |
|---|---|---|---|---|---|
| <UNBOUND> | <UNBOUND> | <UNBOUND> | <UNBOUND> | <UNBOUND> | <UNBOUND> |

The register id is the left half of a lane's `REGISTER: <register-id>:<row-id>` token, so it must be
one whitespace-free word.

## Implementation profiles (DISPATCH_PROTOCOL.md §2)

One row per distinct way an instance can run here. Two setups differing in tool loop, context budget
or write access are two rows: a band is model **and** harness.

| id | kind | launch_template | resume_template | watch_capable | anchor | context_policy | fanout | timeout_ceiling | result_convention | version_pin |
|---|---|---|---|---|---|---|---|---|---|---|
| <UNBOUND> | <UNBOUND> | <UNBOUND> | <UNBOUND> | <UNBOUND> | <UNBOUND> | <UNBOUND> | <UNBOUND> | <UNBOUND> | <UNBOUND> | <UNBOUND> |

`anchor` is which file that implementation auto-loads, if any. `none` is a real answer and a
load-bearing one — an implementation with no anchor must be handed its loop prompt explicitly.

## Capability bands (ROLES.md)

What fills each band **here**. This is the only file in the tree permitted to name a model.

| Band | Fills with | Notes |
|---|---|---|
| Economy | <UNBOUND> | |
| Standard | <UNBOUND> | |
| Premium | <UNBOUND> | |

Record here whether the fleet can decorrelate at all — an auditor whose `impl.family` matches every
coder it gates is a gate that fails the same way its subject does.

## Hot-file registry

Serialize any lane touching these via `DEPENDS-ON` (guardrail 3) — never work them in parallel.

| File | Why every item touches it |
|---|---|
| <UNBOUND> | <UNBOUND> |

## Definition-of-Done bindings

Not in this file, per `PORTABLE_MANIFEST.md`: see `<DOD_BINDINGS_PATH>` above.
