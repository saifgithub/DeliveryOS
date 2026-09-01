<!--
DISPATCH_PROTOCOL.md — the Architect ↔ instance dispatch handshake. GENERIC and PROJECT-AGNOSTIC:
copy verbatim into any project. Project specifics resolve via BINDINGS.md. Companion: ROLES.md
(the role model). Layers ON TOP OF the existing builder→Auditor audit handshake (../audit/PROTOCOL.md),
which it does not modify. On any conflict about verification, the audit PROTOCOL wins.
Owner: the Architect.
-->

# Dispatch handshake: Architect assigns, instances build, Auditor verifies

The Architect and the fleet work CONCURRENTLY across many work items; no role idles waiting on
another. A WORK ITEM is a row in one of the project's **registers** (§1a) — a planned change, a
defect, a backlog entry, whatever list that project already keeps. State is DERIVED from per-item
lane files — **no shared mutable flag, no lock, no merge conflict on concurrent commits**. This is
the audit handshake's pattern, one layer up.

## 1. The trust-critical contract (never changes)

- **Disjoint write-paths, shared branch.** The Architect writes `<ORCH_ROOT>/**` (minus
  `lanes/*.<instance-id>.md`) + the change registers + the work-item specs. Each **instance** writes
  its own SOURCE paths + its own `lanes/<ITEM>.<instance-id>.md` + (for coders) its audit lane
  `<AUDIT_LANE_DIR>/<ITEM>.architect.md`. The Auditor writes `<AUDIT_ROOT>/**` only. Each role
  commits ONLY its own paths, **staged by name**, and PUSHES to origin immediately.
- **Delivery is on origin, not local.** A committed-but-unpushed lane file is invisible to a
  counterpart syncing via origin. A signal counts as handed over only after origin reflects it.
- **The Auditor is the gate.** A code work item is COMPLETE only when its Auditor confirms zero
  BLOCKER + zero MAJOR (audit handshake unchanged). The Architect **integrates** on COMPLETE; it
  never self-closes.

## 1a. Registers — the lists work items come from

The protocol dispatches items; it does not own the list they come from. Each project binds **one or
more registers** (BINDINGS → change registers); this protocol names none of them. A register is
whatever that project already keeps its planned changes, defects, backlog or issues in. The contract
is over the FIELDS a register must supply — never over its shape or file format, which differ
legitimately between one register and the next inside the same project.

Per register, BINDINGS resolves:

| Binding | What it must supply |
|---|---|
| `<REGISTER_PATH>` | where the register lives, and how a single row is addressed within it |
| `<ITEM_KIND>` | what kind of work item its rows are (a planned change, a defect, …) |
| `<STATUS_VOCAB>` | the exact status values this register uses, and which of them mean the item is not yet started, is being worked, and is closed |
| `<SPEC_POINTER>` | how a row points at the item's own specification — the thing a lane's `ACCEPTANCE:` names |
| `<DOD_APPLIES>` | whether items of this kind carry the Definition-of-Done evidence set. Decided **per kind, by a human, at stand-up** — never per item at submission time, where the answer is worth something to whoever is submitting |

The `<ITEM>` id format is bound once for the whole project (see the audit handshake's `PROTOCOL.md`,
which already delegates id shape to BINDINGS); a register does not re-bind it, it states which slice
of that format its own rows use.

Three rules follow, and they are why the binding exists:

1. **The register is the list; `lanes/` is only the subset in flight.** `dispatch.sh state` is a
   **board, not an inventory** — it can only see items someone has already opened a lane for. An
   item with no lane is invisible to every derived state in §4. That is correct behaviour, not a
   gap: ask the register what exists, ask the board what is moving.
2. **An item is dispatchable only once its row exists and its `<SPEC_POINTER>` target exists.** This
   is what makes *"requesters propose; only the Architect mints"* (§7) checkable rather than merely
   procedural — a lane whose `ACCEPTANCE:` resolves to nothing was minted out of order.
3. **At least one register must be bound.** Zero is a stand-up error, not a lean setup: every work
   item is a row in one of them, so with none bound there is nothing an item can be.

**Anything else that renders an item's status is a cache and must say so.** A status restated in a
plan doc, a ledger, a board file or a second register drifts from the row, and nothing detects the
drift. The register row is the answer to *"what is the real status of this item"*.

## 2. Instances and addressing

Every agent is an **instance** with a stable ID `<role>.<spec>` (lowercase, dot):
`coder.api`, `coder.room`, `auditor.backend`, `noncoder.errors`, … The instance ID is the routing
key on EVERY channel:

| Channel | Keyed by instance ID |
|---|---|
| Assignment | `ASSIGNED: <instance-id> round N` in `lanes/<ITEM>.assign.md` |
| Return lane | `lanes/<ITEM>.<instance-id>.md` (disjoint write path — the instance's own file) |
| Watcher | `dispatch.sh inst <instance-id>` blocks until a lane targets THIS instance |
| Worktree | `<WORKTREE_DIR>/<instance-id>-<ITEM>/` |
| Commit tag | `(<TAG_PREFIX>:<instance-id> <ITEM>)` |
| Interrogation | `live_handle` — an **opaque re-attach token whose form the instance's implementation profile defines**. The protocol never parses it; it hands it back to whatever launched the instance |

### The roster entry

`roster/<instance-id>.md` is the whole binding for one instance. Adding a file adds an instance — the
fleet is open, and nothing hardcodes the roster. The field list is portable; every value is local:

```
role:          architect | auditor | coder | noncoder
spec:          <the narrow sub-specification this instance owns>
kind:          code | content | requester-note
owns:          <path globs — see the grammar below>
schema_owner:  true | false      # may this instance change a shared interface/schema
wip_cap:       <max concurrent lanes>
auditor:       <instance-id of the auditor that gates this instance, or the per-lane GATE>
live_handle:   <opaque re-attach token, per impl.profile — blank until launched>
commit_tag:    (<TAG_PREFIX>:<instance-id> <ITEM>)
worktree:      <WORKTREE_DIR>/<instance-id>-<ITEM>
active_lanes:  []
impl:
  profile:     <id of a row in BINDINGS → Implementation profiles>   MANDATORY
  kind:        in-process | process | script | service | human       MANDATORY
  band:        economy | standard | premium                          MANDATORY
  family:      <model family>                                        MANDATORY
  turn_taking: self-watch | invoked | always-on                      MANDATORY
  lifetime:    one-shot | resumable | persistent                     MANDATORY
  write_mode:  commits | patch-returned | read-only                  MANDATORY
```

**`impl:` names the mechanism, never the allegiance.** There is deliberately no `own | foreign` field:
those words are defined relative to whoever wrote the file and invert the moment the tree is copied
into a project whose fleet is different. Decorrelation is `family:` — two instances are decorrelated
when their `family:` values differ, which is a fact about the models and stays true on copy.
`family:` is MANDATORY on **every** instance, not only auditor-capable ones: the check that matters
is *coder family ≠ its auditor's family*, and that comparison is a lookup only if both sides record it.

**`owns:` grammar (normative).** One path glob per line, no brace expansion, no inline prose, comments
on their own line. Prose like *"and their test counterparts"* is not a path and no check can compute
set disjointness over it — and disjointness is what guardrail 3 (collision avoidance) and the
independence rule below both reduce to. Write the test paths out.

**Exception to "the Architect maintains the roster": an auditor's entry is install-owned.** The
Architect may add, edit and retire coder and non-coder entries. It may not create, edit or retire an
`auditor.*` entry, or change the `auditor:` field that points a coder at one. Those are written at
stand-up and changed only by the stakeholder. The reason is structural, not procedural: an Architect
that can rewrite its own gate's roster entry controls the existence of its own gate, and independence
becomes prose again (ROLES.md rule 4). The Architect may freely *start* an auditor's watcher — that
is scheduling, not roster control.

**Hosting (important).** An instance is an **independent, listable session — NOT a subagent of the
Architect.** Only an independent session appears in the stakeholder's session/agent list and can be opened
and interrogated; an Agent-tool subagent is nested in its parent and is invisible. Consequences:
(1) coordination is **file-only** — independent sessions share no memory, so the Architect never
messages an instance in-process; each instance self-notices its turn via `dispatch.sh inst <id>`.
(2) The stakeholder launches and names the instance sessions (onboarding); the Architect only assigns work
via lanes. (3) `live_handle` records the session name/id for stakeholder interrogation. See BINDINGS for the
concrete launch/monitor commands. (SendMessage applies only in the degenerate case where an instance
is deliberately run as the Architect's own ephemeral subagent — not the interrogable-fleet model.)

## 3. The lanes (directory as queue, no shared mutable flag)

Per work item, under `<DISPATCH_ROOT>/lanes/`:

- **`<ITEM>.assign.md`** (Architect owns): `KIND:` (code | content | requester-note),
  `INSTANCE: <instance-id>`, `GATE: independent | spawned | machine | none` (see §4a),
  `REGISTER: <register-id>:<row-id>` — which register row this lane serves (§1a),
  `BAND: <capability band>` — the band this lane is dispatched at (ROLES.md), sourced from the
  instance's roster entry, **written by the Architect, never self-reported by the instance**,
  `ACCEPTANCE:` — the item's own spec, resolved through its register's `<SPEC_POINTER>`,
  `DEPENDS-ON:` (or none), `HOT-FILES:` (or none), the what/why, and two signal lines:
  - `ASSIGNED: <instance-id> round N` — creating or bumping this line is the "your turn" signal.
  - `DISPATCH: OPEN | ACCEPTED (round N)` — `ACCEPTED` = the Architect integrated after the
    Auditor's COMPLETE; the lane is closed.
- **`<ITEM>.<instance-id>.md`** (the instance owns): progress notes + one signal line:
  - `STATUS: CLAIMED | IN_PROGRESS | BLOCKED | NEEDS-INFO | READY_FOR_AUDIT (round N)`
    (a Maintainer non-coder uses `READY_FOR_REVIEW` instead of `READY_FOR_AUDIT`).

### 3a. Machine-parsed tokens — NEVER paraphrased

`ASSIGNED: <id> round N`, `STATUS: <KEYWORD> (round N)`, `DISPATCH: <KEYWORD> (round N)`,
`GATE: <KEYWORD>`, `REGISTER: <register-id>:<row-id>`, `TRIAGE: <KEYWORD>`, `DEPENDS-ON:`,
`INSTANCE:`, `KIND:`, and the clarification tokens `NEEDS-INFO` / `Q[n]:` / `A[n]:`
are read by `dispatch.sh` regex and by the Architect's trust-critical integration test. Write them
byte-exact — a paraphrase silently breaks the state machine. Narrative prose around them is
compressed (fragments, no filler); the tokens are not.

**Every machine-parsed value is ONE whitespace-free token.** `dispatch.sh` reads a keyword as the
second whitespace-separated field and passes lane state around positionally; a value containing a
space is silently truncated to its first word. That is why `REGISTER:` is `<register-id>:<row-id>`
and not two fields. `BAND:` is a lane field but not a machine-parsed one — it is read by the
Auditor, not by a script, so it is absent from this list on purpose.

## 4. State derivation (the core logic)

STATE is derived per lane from the assign file, the instance file, and (for code) the audit lane's
`VERDICT`. `dispatch.sh` implements this exactly; `tail -1` wins (lanes accumulate rounds by
appending).

| State | Condition | Whose turn |
|---|---|---|
| `UNASSIGNED` | no `ASSIGNED` line | **Architect** — allocate |
| `ASSIGNED` | `ASSIGNED round` > instance `STATUS round`, or no instance file | Instance — claim/build |
| `IN_PROGRESS` | instance `STATUS` = CLAIMED/IN_PROGRESS | Instance |
| `BLOCKED` | instance `STATUS` = BLOCKED | **Architect** / stakeholder |
| `NEEDS-INFO` | instance `STATUS` = NEEDS-INFO | **Architect** — answer `Q:` |
| `IN_REVIEW` | instance `STATUS` = READY_FOR_REVIEW (content) | **Architect** — content review |
| `IN_AUDIT` | `READY_FOR_AUDIT` + audit `VERDICT` not COMPLETE/AWAITING_FIXES yet | Auditor |
| `AUDIT_RETURNED` | audit `VERDICT: AWAITING_FIXES` | Instance — fix, bump round |
| `AUDIT_PASSED` | audit `VERDICT: COMPLETE` + `DISPATCH` not ACCEPTED | **Architect** — integrate |
| `DONE` | `DISPATCH: ACCEPTED` **and** the lane's `GATE` is satisfied (§4a) | — |
| `UNGATED` | `DISPATCH: ACCEPTED` but the gate is **not** satisfied | **Architect** — gate it or record why |

## 4a. The gate

`DONE` requires a satisfied gate, never `DISPATCH: ACCEPTED` alone — that is the Architect's own
token, so a board reading it without consulting a verdict cannot express *"shipped without a gate"*
and prints ungated lanes identically to audited ones. `UNGATED` is that missing state.

| `GATE:` | Meaning | Reaches `DONE` when |
|---|---|---|
| `none` | No audit required — a chunk small enough, and with a small enough blast radius, to ship on its self-test | `DISPATCH: ACCEPTED` |
| `spawned` | Audited by an agent the Architect spawned | audit `VERDICT: COMPLETE` |
| `independent` | Audited by a stakeholder-started session the Architect does not control | audit `VERDICT: COMPLETE` |
| `machine` | Gated by a **non-agentic runner** over acceptance checks authored independently of the implementer, run at the submitted revision. No agent verdict is required, because no agent issues one | the project's gate hook exits 0 (see below) |
| *absent* | — | **never** — renders `UNGATED`. An unbound gate fails **loud**, never open |

**Record `GATE:` when you WRITE the lane, not when the work comes back.** At decomposition you have
no stake in the answer; at hand-off the work looks finished and skipping is the cheapest move — the
exact state in which a gate gets waived on the lane that most needed it. *Prompt instructions are
not controls.*

**How `machine` is satisfied.** `dispatch.sh` invokes an optional project-supplied hook —
`gate_check.sh` beside it, or the path in `DISPATCH_GATE_CHECK` — with the item id as its only
argument. **Exit 0 = gated; anything else, including the hook being absent, renders `UNGATED`**,
matching the fail-loud rule for an unrecorded `GATE:`. The portable code names no command, opens no
result file and knows no result format: the hook is where the project's own runner and record shape
live (`<GATE_RUN_RECORD>`, BINDINGS). This is the one place tier-A code calls out to a
project-supplied script, and it is deliberate — it is what makes `machine` a derived state rather
than a word on a lane.

**Why `machine` is not `none` with extra steps.** `none` reaches `DONE` on `DISPATCH: ACCEPTED`
alone — the Architect's own token, unverified by anything. `machine` reaches `DONE` on an exit code
the Architect did not write, over checks the implementer did not author and cannot edit. The two
sound adjacent and differ in exactly the property gates exist for.

**What a single verifier's green does NOT prove, stated plainly.** With one auditor authoring the
checks, green means *"this verifier's reading of the spec is satisfied"* — nothing more. Two
verifiers on **different `impl.family` values** authoring blind from the same spec add a real signal:
where they disagree, the spec is ambiguous, and that divergence is the finding. One verifier has no
such signal and cannot manufacture one by being careful. So: `machine` at one verifier is a genuine
gate and a **weaker** one, and a project that runs it that way should know which of the two it has
rather than discovering it later. The residual that stays with the stakeholder either way — *do the
checks faithfully encode the intent?* — is at least concentrated on one reviewable artifact.

**An item ships as chunks + an item-level audit, or as item-only. The item-level audit is mandatory
in both branches.** That is what makes `GATE: none` safe on a chunk: there is no path to a finished
item that skips the terminal gate, so chunking is a cost-and-parallelism decision rather than a
safety one. "Chunk" here is this protocol's own word for a sub-unit of one item — it is not imported
project vocabulary, and a project that calls them something else changes nothing but the noun.
Write **all** chunks down before dispatching any of them — that is the only way to check the
decomposition is *complete*, and it is what the item-level audit diffs against the item's spec, so a
chunk you forgot to write down is a hole the terminal audit can actually catch.

**Choosing `none` vs an audit** — two terms, either one sufficient to require a gate:
*size* (if you cannot state the chunk in one sentence with one acceptance criterion, it is too big:
split it again or gate it) and *blast radius* (anything in the `HOT-FILES` registry, the safety
floor, or the schema — regardless of how small the diff is).
**Choosing `spawned` vs `independent`** — route on **reversibility**: ships to a store, legal or
compliance text, a schema migration that moves data, money/credits/entitlements, the safety floor,
or a user-facing claim about what the product does ⇒ `independent`. Everything else is a redeploy
away from being fixed. Judge it against the **real diff after the work**, not a prediction made
before it — a chunk sized as trivial that comes back touching a `HOT-FILES` entry trips the rule on
its own.

`dispatch.sh` modes: `state` (print the board once); `inbox` (one-shot, **non-blocking**: list only
lanes where the auditor has FINISHED and the Architect owes integration — `AUDIT_PASSED`/`UNCOMMITTED`
— exit 1 if any, 0 if clear; the multi-lane Architect's per-work-unit trigger, since a blocking
watcher would freeze its other lanes); `architect [-i N]` (block until a lane needs the Architect —
`UNASSIGNED`/`BLOCKED`/`NEEDS-INFO`/`IN_REVIEW`/`AUDIT_PASSED`/`UNGATED`); `inst <id> [-i N]`
(block until a lane is `ASSIGNED` to `<id>` or `AUDIT_RETURNED` on its lane). HOW a role notices its
turn is its own choice — the state is always re-derivable from files, so nothing is lost while a
role is busy elsewhere.

## 5. Bidirectional clarification round-trip

Either party can pause a lane to ask the other a question, addressed to a specific instance:

- **Durable (source of truth):** the asker appends a `Q[n]:` block. An instance asking the Architect
  sets `STATUS: NEEDS-INFO`. The Architect asking a requester sets `TRIAGE: NEEDS-INFO` on the
  intake draft. The answerer appends `A[n]:` and clears the flag (bumps STATUS back). Forward
  progress resumes only when answered — survives restarts.
- **Live (doorbell):** if the instance is running, SendMessage its `live_handle` the question for an
  immediate reply — but still record the resolved fact in the file. **The file is truth; the live
  channel is only a doorbell and stays lightweight** (status, clarification, simple hand-offs — never
  large context, never a command to execute; agents cannot run slash commands).

## 6. The two-handshake bridge

A coder instance is the bridge into the audit layer. On `READY_FOR_AUDIT` it ALSO writes the
existing `<AUDIT_LANE_DIR>/<ITEM>.architect.md` + `SUBMITTED: round N` (playing the "builder" role
in the audit handshake, unchanged). Its roster `auditor:` field names WHICH auditor instance gates
it, so review shards by domain. The audit handshake then runs verbatim; `dispatch.sh` reads its
`VERDICT` to surface `IN_AUDIT`/`AUDIT_RETURNED`/`AUDIT_PASSED` here.

## 7. Non-coder flows

- **Requester** (`noncoder.*` feeding a register): never receives an assignment lane. Drops a draft
  into `<DISPATCH_ROOT>/intake/`; the Architect triages (with the §5 round-trip if more is needed) →
  mints the register row and authors its spec → opens an assignment lane. **Requesters propose; only
  the Architect mints the dispatched work item.**

  A draft carries, at minimum: a crisp problem statement; evidence a reader can re-check (file:line,
  logs, a measurement, a repro); the proposed `<ITEM_KIND>` — which is a proposal for *which
  register* it belongs in, not an id; severity/priority on the project's own scale; and
  `TRIAGE: OPEN | NEEDS-INFO | ACCEPTED | REJECTED`, which the **Architect** owns and the requester
  never writes past the initial `OPEN`. A draft is not a register row and carries no `<ITEM>` id.
- **Maintainer** (`noncoder.*` editing assets): receives assignment lanes like a coder, but
  `READY_FOR_REVIEW` routes to Architect/stakeholder content review (`IN_REVIEW`) — no Auditor, no tests.

## 8. Guardrails

1. **Per-instance WIP cap** (default in BINDINGS): an instance holds at most N active lanes.
2. **Global audit cap**: at most 3 lanes `IN_AUDIT` per auditor, so review is never rushed.
3. **Domain ownership = collision avoidance.** Never assign a lane touching another instance's owned
   paths without splitting it (per-domain sub-lanes joined by `DEPENDS-ON`) or serializing.
   **Hot files** (BINDINGS registry) are serialized via `DEPENDS-ON`, never worked in parallel.
4. **Worktree isolation.** Each instance builds in its own worktree, commits its own paths by name,
   pushes to origin. The Auditor audits the committed SHA in its own worktree, never the live tree.
5. **Dependencies.** A dependent item's COMPLETE is provisional until its `DEPENDS-ON` is COMPLETE.
6. **Single ledger + shared board + retention (keep files small).** `trail.md` is the chronological
   record — the Architect appends one **terse, timestamped** row (`YYYY-MM-DD HH:MM` in `<TZ>`) per
   assignment and per closure. The trail is a **LOG, not a state store**: the current state of any
   lane always comes from the lane files (`dispatch.sh state`), never the trail — so old rows can be
   archived safely even for a still-open item. Keep it bounded with **`rotate_trail.py`** (a SINGLE,
   SHARED Architect job — NOT per-agent, since `trail.md`/`history/` are single-writer and N rotators
   would race): it moves rows older than `--keep-days` into monthly `../history/trail/trail-<YYYY-MM>.md`
   archives. Run it manually or wire it to ONE daily routine. **Query the trail, never slurp it**
   (`grep`/`tail`). Per-item *detail* is NOT in the trail — it is the archived lane
   (`../history/lanes/<ITEM>.md`). `board.md` is the glanceable table, regenerable via
   `dispatch.sh state`; it may lag — detect real state from the tokens, never from the board. Only the
   Architect reads/writes the trail; instances read their lane + the relevant archived lane.
7. **Stall rule.** At a cap with no movement for the BINDINGS stall window, the Architect escalates
   to the stakeholder rather than blocking indefinitely. **Nothing computes this and nothing
   enforces it**: a lane can sit awaiting audit indefinitely while the board renders it as an
   ordinary in-flight state. Until it has an owner and a real elapsed-time input it is an
   acknowledged gap, not a control — so the Architect re-derives the board at the **start of every
   session** and clears anything in `UNGATED` / `AWAITING_AUDIT` before taking new work.
7a. **Concurrency cap.** The cap is on **concurrently spawned agents of any role** — every role
   draws one shared quota — and it **queues rather than blocks**. The binding constraint is the
   provider's rolling usage window: exhausting it strands every in-flight agent at once and
   everything uncommitted dies with them. Therefore instances **commit incrementally**, and the
   Architect **stops at lane boundaries** rather than starting an audit that may die mid-verdict.
8. **Context (no human needed).** `/compact` cannot be automated — agents can't run slash commands,
   no skill/hook/setting triggers compaction (`PreCompact` only observes or blocks one), and there is
   no SDK trigger. It is also **not needed**: auto-compaction is **always on and runs in headless /
   SDK / subagent contexts** (it clears old tool outputs, then summarizes, as an instance nears its
   limit — no human, no command). Three tiers, all Architect-automatable: (1) auto-compaction handles
   routine creep; (2) **session resume** (`resume: sessionId`) or respawn-fresh-on-the-same-lane
   resets an instance's context while continuity lives in files; (3) heavy reads go to disposable
   subagents (ultracode) so an instance's own context stays lean. The one failure mode — a single
   tool output so large it refills context immediately after compacting — is avoided by keeping lanes
   narrowly scoped. **No human is ever required to manage an instance's context.**

9. **Token economy — bound instance lifetime to a work unit, not the context ceiling.**
   Auto-compaction (§8) fires only near the model's context limit (~1M tokens); operating there is
   expensive because input is billed on every tool call in proportion to the context carried, so it
   is a backstop, NOT the operating point. Keep instances **short-lived**: spawn a fresh instance per
   lane (or per round), build, hand off, **exit** — the next lane gets a new instance starting small.
   Continuity is in files, so ending early costs nothing. Push heavy reads/exploration into
   **disposable subagents** (ultracode) whose transcript never enters the instance's context. Keep
   the stable prefix (these protocol docs, the agent guide, the lane file) byte-stable so **prompt caching**
   discounts it every call. Use **session resume** only for a tight same-lane bounce loop where the
   prior context is still relevant; otherwise respawn fresh. The Architect sizes lanes narrowly so no
   single instance-session grows large.

## 9. Done (per item)

On the Auditor's COMPLETE (`AUDIT_PASSED`), the Architect: verifies the verdict is on origin,
updates the status on the row the lane's `REGISTER:` names, appends the `trail.md` closure row, writes
`DISPATCH: ACCEPTED (round N)` on the assign lane, **archives the closed lane pair to
`../history/lanes/<ITEM>.md`** (the durable per-item record — what/why, every Q/A round-trip, the
verdict; this keeps active `lanes/` lean and is the collective memory), **reaps the lane's
worktree** (see below), and frees the instance's WIP slot. The stakeholder's own hands-on test after
ACCEPTED is their single checkpoint; a defect they find reopens the lane at the next round.

**Worktree reaping (do NOT skip).** Reaping merged lane worktrees belongs to lane closure and to
nothing else: a project that parks it in a session-wrap routine loses it the moment that routine is
retired, which is how a tree accumulates stale worktrees nobody owns. When a lane reaches
`DISPATCH: ACCEPTED` and its branch is merged, remove the worktree + branch so they don't pile up
(they mislead the merge-state greps and clutter `git worktree list`):

```bash
# Only after the branch is fully merged — an empty log means nothing unmerged is lost.
git log <main-branch>..lane/<ITEM>.<instance-id> --oneline   # MUST be empty
git worktree remove -f -f <WORKTREE_DIR>/<instance-id>-<ITEM>
git branch -D lane/<ITEM>.<instance-id>
```

If `git log main..<branch>` is **non-empty**, STOP — that branch carries unmerged commits; do not
remove it. As a backstop for lanes that closed without reaping, the Architect runs a **sweep at
session start** alongside the board re-derivation (§8 guardrail 7): for every `git worktree list`
entry matching `worktree_pattern`/`<instance-id>-*` whose lane is `DISPATCH: ACCEPTED` and whose
branch is merged, reap it. Never touch a worktree whose branch is unmerged or whose lane is still
open.

**Collective memory.** The archived lanes + `trail.md` + the audit layer's `audit/audit-trail.md` +
`audit/runs/` are the operational history any agent can grep for prior decisions. Periodically (at
session wrap, or whatever continuity routine the project uses) the Architect distills durable,
cross-agent lessons from them
into the project's existing memory and its recurring-failure register — feeding the SAME
collective memory, not a parallel one.

## 10. Replicability

`PORTABLE_MANIFEST.md` is the authoritative copy list and the only place the tiers are enumerated —
this section states the shape, not the inventory. Portable (copy verbatim): this file, `ROLES.md`,
`DEFINITION_OF_DONE.md`, `loop_prompts/`, `dispatch.sh`, the install kit, and the audit handshake's
`PROTOCOL.md` + loop prompts + `watcher.sh`. Per-project (write once): the two BINDINGS files,
`roster/`, and the seeded `board.md`/`trail.md` headers. Never copied: `lanes/`, `intake/` drafts,
and everything under `<AUDIT_ROOT>/` that records a verdict or a run.

Stand up a new project with `install/INSTALL_INTERVIEW.md`, which conducts the binding interview and
ends in `install/check_bindings.sh` — whose exit code is the only claim that the stand-up is
complete. The one piece of code an adopting project writes itself is its `gate_check.sh`, and only
if it uses `GATE: machine`.
