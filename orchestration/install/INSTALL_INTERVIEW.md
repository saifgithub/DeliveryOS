<!--
INSTALL_INTERVIEW.md — the stand-up interview for this orchestration tree. PORTABLE CORE: copy
verbatim. Hand this file to whatever agent is standing the protocol up in a new project; it conducts
the interview with the stakeholder, emits the project's BINDINGS files and roster, and ends by
running check_bindings.sh, whose exit code is the only claim that the stand-up is complete.

WHY THIS IS A LOOP PROMPT AND NOT A SCRIPT OR A SKILL: it has to travel with `cp -r` of this tree
(a skill installed elsewhere does not), and it has to be runnable by any implementation (a
single-harness artifact would contradict the protocol it installs). A pure script cannot conduct an
interview. The genre already exists here: dispatch/loop_prompts/*.md.
-->

# Standing this protocol up in a new project

You are conducting a stand-up interview. At the end of it this tree is bound to one project and
`install/check_bindings.sh` exits 0. Until it does, the stand-up is not finished, whatever the
transcript says.

## The rules you work under

**1 — Ask; do not assume, and do not invent.** Every unbound token below has an answer only the
project has. A plausible guess that survives into BINDINGS is worse than an open question: it is an
open question that nobody will look at again.

**2 — Research before you ask.** Read the repo first. Come to each question with what you found —
*"this repo has a `docs/` tree with a backlog file at X and a defect list at Y; are those the
registers?"* — not with the bare question. An interview that makes the stakeholder do the reading is
a slow way to get worse answers.

**3 — Never write a sample answer.** Not in this file, not in a template, not as an "e.g." while
asking. A concrete example in a question is an answer a hurried installer will accept, and it will
be *this* tree's answer rather than theirs. State what makes an answer **valid** instead: what it
must resolve to, what would make it wrong, how it will be checked.

**4 — Record every answer as you get it, in `install/ANSWERS.md`.** Write the status row on the
**first** question, not at the end, so a stand-up interrupted halfway can be resumed by reading that
file rather than re-asked from the top.

**5 — An unbound token is a stand-up error, not an empty cell.** You may end with questions
`deferred` or `ruled out`, but never silently blank.

## Question states — five, and the fifth matters

| State | Meaning |
|---|---|
| `open` | Asked or not yet asked; no answer recorded |
| `claimed` | You are working it — researching, drafting, waiting on a reply |
| `resolved` | Answered, and the answer is written into the emitted file |
| `deferred` | Genuinely undecidable now, with a named condition that will decide it. Blocks nothing that does not depend on it |
| `ruled out` | The project's shape makes the question moot — there is no answer to get, ever |

`ruled out` is not a tidier `deferred`. A project with no defect list has no defect-register
question to defer; a project that ships no service has no live-stack answer coming. Marking those
`deferred` leaves a permanent list of things that look unfinished, which is how a stand-up checklist
stops being read.

---

# Phase 0 — Scrub the inherited tree

Do this before asking anything. The tree you just copied carries the previous project's tier-B and
tier-C files, and every one of them is a lie about the new project.

1. `git rm` (or delete) every tier-B and tier-C file this tree arrived with: both BINDINGS files, every
   `roster/*.md`, every lane, intake draft, verdict, run report, regression pin, acceptance check, and
   both ledgers' rows. `PORTABLE_MANIFEST.md` lists exactly which files those are.
2. **Delete them out of the tree, not into a subdirectory of it.** Moving them to
   `install/inherited/` reproduces the exact failure being fixed: they are still in the tree, still
   copied onward, and now filed under a name that implies they are yours.
3. Re-create the tier-C directories **empty**, with their `.gitkeep` files.
4. Confirm: no `roster/*.md` remains. A stale roster is the worst inheritance in the set — it names
   instances that do not exist, owning paths that do not exist, gated by auditors that do not exist,
   and every one of those reads as a real binding to the next agent that opens it.

Record in `ANSWERS.md`: what you removed, and the `git rm` you ran.

---

# Phase 1 — Identity, and the three grep needles

`PORTABLE_MANIFEST.md`'s honesty check is written with placeholders. Substituting them is what first
makes it executable, so it happens now rather than at the end.

| Question | What makes an answer valid |
|---|---|
| **What is this project called**, in every form that could appear in a file? | Every spelling and casing a portable file could accidentally carry. This becomes a grep needle, so a form you omit is a form the check cannot catch |
| **What hosts, domains or environment names** does this project's work touch? | The strings themselves. Same reason |
| **Who is the stakeholder?** | One person or role. Portable files never name them; this is the needle that catches it when one does. `ROLES.md` fixes the *term* — "the stakeholder" — and only the binding may say who that resolves to |
| **What harness/tool/model names** are in play here? | The set that must never appear in a tier-A file. This is `<HARNESS_TERMS>`, and it is what makes "any implementation can fill any role" checkable rather than aspirational |

Write all four into `check_bindings.sh`'s needle block. From here on, that check can catch a leak.

---

# Phase 2 — The registers

The protocol dispatches rows out of the project's own lists (`DISPATCH_PROTOCOL.md` §1a). This phase
binds them, and — where none exist — **creates them**.

## 2.1 Does a register already exist?

Research first: look for a backlog, a change list, a defect or bug list, an issues file, a planned-work
doc. Bring what you found.

| Question | What makes an answer valid |
|---|---|
| **Which existing lists are registers?** | A path per list, and for each: what kind of item its rows are. A doc that *describes* work but has no addressable rows is not a register — it may be what a register's rows point AT |
| **How many?** | Any number from one upward. Zero is not an answer; see 2.2 |

## 2.2 If none exists — create one, and say so

A project with no register is normal, not disqualifying. **Offer to create one**, using
`install/templates/REGISTER.TEMPLATE.md`:

| Question | What makes an answer valid |
|---|---|
| **Which registers should exist?** | The kinds this project actually has work in. Do not create a list for a kind of work the project does not do; an empty register that never fills reads as neglect rather than as absence |
| **Where does each one live?** | A path **outside this tree**, in the project's own docs. The register is the project's, not the protocol's |

**Writing outside `<ORCH_ROOT>/` is a deliberate, stated exception** to the rule that a portable file
names no path outside its own tree. It holds because the *template* names no path: it is a shape,
and the interview asks where it goes and records the answer as that register's `<REGISTER_PATH>`.
The installer is the one component permitted to write outside the tree, and only here.

A scaffolded register satisfies §1a's contract by construction — the template's fields *are* the
contract — which is the point of scaffolding rather than describing one.

## 2.3 Bind each register

Per register, all five, plus the id format once for the whole project:

| Question | What makes an answer valid |
|---|---|
| `<REGISTER_PATH>` | Where it lives, **and how one row is addressed within it**. "The file" is half an answer; a lane has to name a row |
| `<ITEM_KIND>` | What kind of work item its rows are. One kind per register |
| `<STATUS_VOCAB>` | The exact values this register uses, and which mean *not yet started*, *being worked*, *closed*. Exact, because the Architect writes them onto rows |
| `<SPEC_POINTER>` | How a row points at the item's own specification. If rows have no spec, say so — that is a real answer, and it means `ACCEPTANCE:` has nothing to name and every item is dispatchable-in-principle and verifiable in practice by nobody |
| `<DOD_APPLIES>` | Whether items of this kind carry the Definition-of-Done evidence set. **A human decides this, per kind, here.** Not per item, and not by an agent |
| `<ITEM>` **id format** | The shape of an item id, once, for the project. Each register states which slice of it its rows use. Registers do not each re-bind the format |

**Do not ask for a "default `GATE:`".** There is none by design: an unrecorded `GATE:` renders
`UNGATED`, and a documented default would give an Architect that omitted one something to point at.

---

# Phase 3 — Verification surfaces

| Question | What makes an answer valid |
|---|---|
| **Delivery surfaces** | The observable outputs a check can assert against. This is what G2 means by "surfaces, not internals", and an auditor authoring blind has nothing else to aim at |
| **Test command, per surface** | A command per surface, runnable from the repo root. Where a surface has no test, `N/A` and the reason — a surface with no test is a real fact about the project |
| **The contract check** | The command that re-verifies a seam between layers where the project's own type system does not. If nothing crosses such a seam, `ruled out` |
| **The long-running test command** | The one that outlives an ordinary command timeout, and the wrapper that runs it — or `ruled out` if none does |
| **The content self-test** | The asset-integrity check a maintainer runs. `ruled out` where the project has no non-code assets under lanes |
| **Live-stack verification** | How the real thing is exercised for real. Not a test command; the thing the auditor reproduces |
| **The device-only marker** | How to record a claim only physical hardware can confirm, where the project has such a surface. `ruled out` otherwise |
| `<SYNC_COMMAND>` | What an instance runs to bring its checkout level with origin before deriving state |
| `<TZ>` | The timezone the two ledgers' timestamps are written in. One answer; both headers use it |

---

# Phase 4 — The acceptance runner

This binds `GATE: machine`. A project may legitimately end this phase with nothing bound.

| Question | What makes an answer valid |
|---|---|
| **Is there a non-agentic runner?** | Something that executes checks and exits 0 or non-zero with no agent in the loop. "We run the tests" is not one unless *something other than an agent* reads the result |
| `<GATE_RUN_RECORD>` | Where the runner writes its own record, **and the field names for its result and the revision it ran at**. Two hard constraints: the path is under `<AUDIT_ROOT>/**` or untracked, and the record carries the revision. A runner that cannot name its revision does not satisfy this row |
| **Worktree under a machine gate** | Confirm the scratch worktree is bound and mandatory when `GATE: machine` is in play. An archive-style checkout has no VCS metadata, so a runner inside one cannot record its revision |
| **`gate_check.sh`** | The project writes it, from `dispatch/gate_check.sh`'s shape. It reads the record, compares its revision to the lane's submitted one, and exits. **This is the only code an adopting project must write.** Unedited, it exits non-zero for everything, which renders every machine-gated lane `UNGATED` — correct, and loud |

**Two things are deliberately NOT asked here.** Who authors a given item's checks, and whether the
implementer can edit them, are **per-item** properties derived per lane — the auditor authors from
that item's spec, and independence is decided by comparing paths against that instance's `owns:` set.
An install-time answer to either would be a promise about items that do not exist yet.

If there is no runner: mark this phase `ruled out`, disposition the DoD's **Acceptance gate** row
`N/A — no non-agentic runner exists`, and use only `spawned` / `independent` gates. That is the row
working as designed — visible, and closable later by building something.

---

# Phase 5 — What can actually run here

| Question | What makes an answer valid |
|---|---|
| **Which implementations are available?** | One row per distinct way an instance can run here. Two setups differing in tool loop, context budget or write access are two rows, not one — a band is model **and** harness |
| **Per row, the profile columns** | `id`, `kind`, `launch_template`, `resume_template`, `watch_capable`, `anchor`, `context_policy`, `fanout`, `timeout_ceiling`, `result_convention`, `version_pin`. A column with no value is a stand-up error, not an empty cell — including `anchor: none`, which is a real and load-bearing answer |
| **Per row, its band and family** | Band from `ROLES.md`. Family is what decorrelation is computed over, so it must distinguish rows that would otherwise fail the same way |
| **Which profile fills each role?** | And for auditors: **not Economy**, and a different `family` from the coders it gates |
| **`DECORRELATION: required` or `waived`?** | `required` unless this project genuinely has one model family, in which case `waived — <reason>` plus the condition that would lift it. **This is the stakeholder's call, not yours** — put the cost in front of them (an auditor of the same family fails where its subject fails, and the machine gate does not rescue it, because the same family authored the checks) and let them answer. `check_bindings.sh` check 7 fails a correlated fleet without this line, and still prints every correlated pair with it |

---

# Phase 6 — Instances and their owned paths

| Question | What makes an answer valid |
|---|---|
| **What are the domains?** | Enough that two instances rarely want the same file, few enough that each is a real specialization. Split by what collides, not by what looks tidy in a directory listing |
| **Per instance, `owns:`** | One path glob per line, no brace expansion, no inline prose. Test paths written out |
| **Per instance, the rest of the roster entry** | Every field in `DISPATCH_PROTOCOL.md` §2, including a filled `impl:` block |

**Two checks are mechanical — run them, do not eyeball them:**

1. **Disjointness.** No path matches two instances' `owns:` sets. An overlap is a collision the
   protocol has no way to serialize, because `DEPENDS-ON` sequences *lanes*, not owners.
2. **Hot files.** Any file most items touch on the way in — a barrel export, a single registration
   point, a shared schema — goes in the hot-file registry and is serialized. A domain that looks
   shardable but funnels through one such file is **not** shardable; record that honestly in the
   roster entry rather than shipping the more impressive-looking fleet.

**The auditor entries are written here and are install-owned** (`DISPATCH_PROTOCOL.md` §2). The
Architect cannot later add, edit or retire one, or repoint a coder's `auditor:` field.

---

# Phase 7 — Caps, stalls, escalation

| Question | What makes an answer valid |
|---|---|
| **Per-instance WIP cap** | A number, and what it is based on. With no throughput history, the conservative number and the words "no history yet" is the honest answer |
| **Global audit cap** | Same |
| **Stall window** | An elapsed-time input. Note in BINDINGS that nothing computes it — it is an acknowledged gap, not a control |
| **Escalation precedents** | `none yet` is correct for a new stand-up and the only honest answer. This row fills the first time something is escalated. Do **not** copy the previous project's precedents; they are its evidence, not yours |

---

# Phase 8 — The Definition of Done

| Question | What makes an answer valid |
|---|---|
| `<DOD_BINDINGS_PATH>` | Where the project's DoD bindings live — **with its governance docs, outside this tree** |
| **Every core row's answer** | One per row, including `N/A` with a reason. A row with no answer is a stand-up error; discovering it during an audit is too late, because the audit is already blocked on it |
| **Rows this project adds** | A user manual, a changelog, a migration runbook, whatever else this project owes before an item is finished. Projects add rows and never subtract them |
| **Which item kinds render it** | Cross-check against each register's `<DOD_APPLIES>` from phase 2. They must agree |

---

# Phase 9 — Emit, then verify

1. Emit from the templates in `install/templates/`: the dispatch BINDINGS, the audit BINDINGS
   (**named after this project**, so a later re-copy of the portable set cannot clobber it), one
   roster entry per instance, and the DoD bindings at `<DOD_BINDINGS_PATH>`.
2. Seed `board.md`, `trail.md` and `audit-trail.md` headers with `<TZ>` resolved.
3. Confirm every tier-C directory exists and is empty.
4. `sh install/check_bindings.sh` — **its exit code is the verdict.** Not your summary of it.
5. `sh dispatch/dispatch.sh state` — prints an empty board without error. That is the replication
   smoke test.
6. Write `install/ANSWERS.md` final: every question, its state, its answer, and for anything
   `deferred`, the named condition that will decide it.

`ANSWERS.md` is tier C. It is this project's stand-up record and never travels to the next one.
