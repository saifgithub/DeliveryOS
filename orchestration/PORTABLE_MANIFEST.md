<!--
PORTABLE_MANIFEST.md — the authoritative copy list for standing this orchestration protocol up in
another repository. PORTABLE CORE: copy this file too. It answers exactly one question per file:
does it copy verbatim, get written once for the new project, or never leave this repo?
-->

# Portable manifest — what to copy into a new repo

Three tiers. **A** copies byte-for-byte. **B** is written once per project. **C** never leaves the
repo it was created in.

The split has two invariants, and every file in tier A is checked against both.

**1 — No project detail, and no implementation detail.** A portable file names no project, no host,
no person, no path outside this tree, and no work-item id. It also names **no harness, CLI, tool,
model or context size** — those are `<HARNESS_TERMS>`, and keeping them out is the entire content of
the claim that any implementation can fill any role. Naming a *field* is fine; naming a *value* is
the defect. If you find one in a tier-A file, that is a bug in the split — move it to BINDINGS
rather than preserving it.

*The one exception, stated so it is not read as a violation:* `install/templates/REGISTER.TEMPLATE.md`
is emitted **outside** this tree, into the project's own docs. It holds because the template itself
names no path — the interview asks where the register goes and records the answer as its
`<REGISTER_PATH>`. The installer is the only component permitted to write outside the tree.

**2 — No incident history.** State the rule and the mechanism it defends against; do **not** narrate
the incident that produced it. Another repo did not live through our outages, cannot verify our
numbers, and pays tokens to read them in every agent context that loads these files. *"10 of 14
lanes shipped ungated"* is our evidence; *"a board that reads the Architect's own token without a
verdict cannot express «shipped without a gate»"* is the portable rule. Keep the second, drop the
first — the reasoning survives, the archaeology goes to BINDINGS or the commit log.

## Tier A — copy verbatim (24 files)

| File | What it is |
|---|---|
| `PORTABLE_MANIFEST.md` | this file |
| `README.md` | map of the two layers; start here |
| `ROLES.md` | the four-role model, the capability bands, the load-bearing rules |
| `DEFINITION_OF_DONE.md` | the portable DoD questions (answers live in tier B) |
| `history/README.md` | what the durable-memory tree is for |
| `dispatch/DISPATCH_PROTOCOL.md` | Architect ↔ instance contract, registers, roster schema, tokens, state table, the gate |
| `dispatch/dispatch.sh` | state deriver + watcher (`state` / `inbox` / `architect` / `inst <id>`) |
| `dispatch/rotate_trail.py` | ledger retention, ledger-agnostic |
| `dispatch/intake/DRAFT.TEMPLATE.md` | the requester's draft shape; its vocabulary placeholders bind at stand-up |
| `dispatch/loop_prompts/ARCHITECT.md` | Architect role prompt |
| `dispatch/loop_prompts/AUDITOR.md` | Auditor role prompt (dispatch-layer wrapper) |
| `dispatch/loop_prompts/CODER.md` | Coder role prompt |
| `dispatch/loop_prompts/NONCODER.md` | Non-coder role prompt (requester + maintainer) |
| `audit/PROTOCOL.md` | builder ↔ Auditor contract — **wins on any verification conflict** |
| `audit/ARCHITECT_LOOP_PROMPT.md` | the architect's audit-layer loop |
| `audit/AUDITOR_LOOP_PROMPT.md` | the auditor's loop |
| `audit/watcher.sh` | audit-lane state deriver + watcher |
| `install/INSTALL_INTERVIEW.md` | the stand-up interview — start a new project here |
| `install/check_bindings.sh` | the stand-up verdict; **its exit code is the claim** |
| `install/templates/BINDINGS.TEMPLATE.md` | shape for the dispatch bindings |
| `install/templates/AUDIT_BINDINGS.TEMPLATE.md` | shape for the audit bindings |
| `install/templates/roster-entry.TEMPLATE.md` | shape for one instance |
| `install/templates/DOD_BINDINGS.TEMPLATE.md` | shape for the DoD answers (emitted outside this tree) |
| `install/templates/REGISTER.TEMPLATE.md` | shape for a register, for a project that has none (emitted outside this tree) |
| `install/templates/ANSWERS.TEMPLATE.md` | shape for the stand-up record |
| `install/templates/gate_check.sh` | shape for the machine-gate hook — **the only code an adopting project writes** |

No code changes are needed in any of them. `dispatch.sh`, `watcher.sh`, `check_bindings.sh` and
`rotate_trail.py` take their locations from their own script directory or from flags. The only code
an adopting project writes is its own `gate_check.sh`, and only if it uses `GATE: machine`.

## Tier B — write once for the new project

| File | What to put in it |
|---|---|
| `dispatch/BINDINGS.md` | every `<TOKEN>` the portable files use, plus caps, hosting/launch commands, the hot-file registry, and the escalation precedents this project has actually paid for |
| `audit/<PROJECT>_BINDINGS.md` | the audit layer's term resolution + gap-fills. Name it after the project so a re-copy of `PROTOCOL.md` can never clobber it |
| `dispatch/roster/<instance-id>.md` | one per instance. Adding a file adds an instance — nothing hardcodes the roster |
| the project's own DoD bindings | the answers to `DEFINITION_OF_DONE.md`'s questions, plus any rows this project adds. Lives with the project's governance docs, not in this tree |
| `dispatch/board.md`, `dispatch/trail.md` | seed the headers only |
| `install/needles.conf` | the four grep needle sets `check_bindings.sh` sources. It lives outside that script deliberately: these are project **values**, and the script is tier A |
| `dispatch/gate_check.sh` | the project's own machine-gate hook, written from the tier-A shape. Only if it uses `GATE: machine` |

**Tokens BINDINGS must resolve before the first lane is dispatched.** An unbound token is a stand-up
error, not an empty cell. `install/check_bindings.sh` is what turns that sentence into an exit code.

**Paths and identity:** `<ORCH_ROOT>` · `<DISPATCH_ROOT>` · `<AUDIT_ROOT>` · `<AUDIT_LANE_DIR>` ·
`<WORKTREE_DIR>` · `<TAG_PREFIX>` · `<ITEM>` **id format** *(the most-used token in the tree)* ·
`<TZ>` · the stakeholder · shared branch · the SOURCE-vs-AUDITOR path split · the auditor identity.

**Registers** (§1a), per register: `<REGISTER_PATH>` · `<ITEM_KIND>` · `<STATUS_VOCAB>` ·
`<SPEC_POINTER>` · `<DOD_APPLIES>`.

**Verification:** the delivery surfaces · the test command per surface · the contract check · the
long-running test command · the content self-test · live-stack verification · the device-only marker
· `<SYNC_COMMAND>` · the acceptance runner · `<GATE_RUN_RECORD>` (its path, its result field, its
revision field) · the acceptance-check directory · `<DOD_BINDINGS_PATH>`.

**Implementation profiles**, as a row per profile with **every column filled** — `id` · `kind` ·
`launch_template` · `resume_template` · `watch_capable` · `anchor` · `context_policy` · `fanout` ·
`timeout_ceiling` · `result_convention` · `version_pin` — plus what fills each capability band here.
A profiles table that exists with empty columns is a stand-up error like any other unbound token;
the table's presence is not the binding, its cells are.

**Decorrelation:** `DECORRELATION: required | waived — <reason>`. An absent line means `required`,
and `check_bindings.sh` check 7 fails a fleet whose auditor shares a family with what it gates. The
waiver exists because one available model family is a normal situation; it waives the failure and
never the visibility, and a human declares it at stand-up.

**Operations:** the Architect's inner process · the continuity/status record · caps and the stall
window · escalation precedents · the hot-file registry.

## Tier B′ — shapes to copy and rewrite

Not portable code: each is a shape whose working content is this project's. Copy it as a starting
point and rewrite it; do **not** treat an unedited copy as working. **Filenames are deliberately not
promised here** — an earlier version of this table listed five scripts this tree does not ship, which
told every downstream reader to look for files that were never there.

| Shape | What is coupled, and how it must fail |
|---|---|
| `dispatch/gate_check.sh` | Written by the project from the tier-A shape at `install/templates/gate_check.sh`. Coupled to where the runner's record lives and its result and revision field names. The **shape** exits non-zero for every item, so a project that copies it and stops renders every machine-gated lane `UNGATED` rather than passing them. The project's own filled copy is tier B and never travels |
| a launch helper | The launch and re-attach commands per profile. Optional — the profiles table already carries the templates; a helper only saves typing |
| a full-suite wrapper | The long-running command and its output contract, including the terminal exit-code line the Auditor polls for |

## Tier C — never copy (runtime state)

`dispatch/lanes/` · `dispatch/intake/` (except the `*.TEMPLATE.md` above) · `dispatch/DELIVERY_PLAN.md` ·
`audit/cr/` · `audit/runs/` · `audit/regression/` · `audit/acceptance/` · `audit/trail/` ·
`audit/audit-trail.md` · `history/lanes/` · `history/trail/` · `install/ANSWERS.md`

These are one repo's operational history. Copying them imports another project's lanes, verdicts and
regression pins as if they were yours — creating exactly the fabricated evidence the audit layer
exists to prevent. Create the directories empty. `DELIVERY_PLAN.md` is the Architect's *current* wave
plan — dated, greenlit by one stakeholder, scoped to specific work-item ids; a new project writes its
own when it has a wave to plan, and inheriting someone else's reads as a mandate nobody gave.

## Standing it up

1. **Copy tier A.** That is the whole of what travels.
2. **Scrub.** Delete every tier-B and tier-C file the copy brought with it — **out of the tree, not
   into a subdirectory of it.** A stale `roster/` is the worst of them: every field in it reads as a
   real binding to the next agent that opens the file.
3. **Run the interview:** `install/INSTALL_INTERVIEW.md`, ten phases. It conducts the stand-up,
   creates a register where the project has none, and emits the two BINDINGS files, the roster, the
   DoD bindings and `install/ANSWERS.md`.
4. Seed `board.md` / `trail.md` / `audit/audit-trail.md` headers (resolving `<TZ>` in each);
   create every tier-C directory empty — including the two rotation/acceptance targets
   `audit/trail/` and `audit/acceptance/`, which the auditor's loop writes into and will not create.
5. **`sh install/check_bindings.sh` — its exit code is the verdict.** Six checks: template rows
   survived emission, no `<UNBOUND>` outside the templates, roster `owns:` grammar and disjointness,
   the project-name grep, the harness-name grep, and an advisory incident-narration heuristic.
6. `sh dispatch/dispatch.sh state` — it should print an empty board without error. That is the
   replication smoke test.

Steps 5 and 6 are the only two claims that stand-up is finished. A transcript that says so is not.

## Keeping the split honest

The split rots in one direction only: a rule gets clearer when you cite the incident that produced
it, so project detail drifts *into* the portable files. `check_bindings.sh` runs the check below with
this project's needles substituted; run it whenever you touch this tree, not only at stand-up.

```sh
# from the orchestration root — every hit is a candidate defect in the split.
# Substitute the four needle sets at stand-up. AN EMPTY NEEDLE SET PASSES EVERYTHING AND PRINTS A
# PASS, which is worse than not running it — check_bindings.sh fails rather than allowing that.
grep -rniE "<this project's name>|<hosts>|<the stakeholder's name>|<HARNESS_TERMS>" \
  README.md ROLES.md DEFINITION_OF_DONE.md PORTABLE_MANIFEST.md history/README.md \
  audit/PROTOCOL.md audit/*_LOOP_PROMPT.md audit/watcher.sh \
  dispatch/DISPATCH_PROTOCOL.md dispatch/dispatch.sh dispatch/rotate_trail.py \
  dispatch/intake/DRAFT.TEMPLATE.md dispatch/loop_prompts/ install/
```

`<HARNESS_TERMS>` is the fourth needle set and the newest: the harness, CLI, tool and model names in
play here. Invariant 1 covers it, and it is the one a reader is most likely to leave in, because a
concrete command reads as helpful rather than as project detail.

**No `TIER_A.sha256`.** Byte-integrity of tier A belongs in this tree's own CI, over its own copy —
not shipped downstream. A manifest hash cannot contain its own hash, and it would be self-defeating
anyway: this file tells adopting projects to *move* project detail out of tier-A files, so a project
that obeys would fail the check permanently, and the fix would be to stop obeying.

Write the incident down where it belongs: the rule in the portable file, the evidence in BINDINGS.
