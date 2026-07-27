# MHBP Lab — a foreign harness (Antigravity/agy · Gemini) as adversarial cross-harness auditor

> **Experimental. Non-normative.** The production process is `docs/MULTI_AGENT_BUILD_PROCESS.md` (v4),
> unchanged by this document. This file is a sibling to `docs/MABP_LAB.md` (Arms A/B, both *same-harness*
> Claude peers). It specs a different instrument: a **second LLM harness** — **Antigravity** (`agy`,
> Google's agentic harness, running Gemini) — bolted on as an **adversarial auditor** at the two phase
> boundaries (after planning, after build) and in the per-chunk loop between them. Where this and the
> baseline appear to conflict, the baseline wins until evidence promotes this work.

**Created:** 2026-06-19. (Revision history is in git.)

---

## Invariants

Six load-bearing rules, stated once here; every section below relies on them without re-deriving.

1. **Decorrelation = the model family, not context.** The foreign auditor must run a non-Claude model
   (`--model "Gemini 3.1 Pro (High)"`); an audit by `agy` on a Claude model is **void** — same family
   again. `agy` is *given* full project context (`CLAUDE.md` + this doc) for grounding; that does not
   void the run, because decorrelation comes from *whose* model reads the artifact, not from what it may
   see.
2. **`npm run gate` is the binding mechanical floor.** No auditor or Tester tier — `own`, `foreign`, or
   `human` — ever edits or runs it as its verdict. Every foreign signal here is **advisory**, layered on
   the unchanged baseline §16.2 / §16.4 gate.
3. **Serial — one chunk in flight at a time.** The next chunk does not start until the current is
   COMPLETE. The parallel-lanes attempt was the Run-1 failure; serializing dissolves the concurrent-write
   and stale-round hazards.
4. **A background watcher per role is mandatory.** Each role watches its inbound semaphore file and acts
   when the counterpart writes. No watcher = no handoff = stall — the Run-1 failure mode (§8).
5. **`agy` runs read-only / isolated.** Point it at a throwaway worktree pinned to the build's HEAD;
   scope `--add-dir` to manifest roots only, never the live tree or repo root. (Run-1: an unscoped `agy`
   silently edited 4 files.)
6. **Independent verification + pre-registration.** Each auditor re-reads changed source at file:line and
   runs a blind adversarial pass; predictions are pre-registered in `docs/build/EXPERIMENT_LOG.md` before
   each run, N ≥ 5 before any kept/killed call.

> **Run-1 (2026-06-23, N=1 — signal, not evidence)** is the source of invariants 3–5: it serialized the
> loop, mandated the per-role watcher, named the read-only/isolated `agy` scoping, and reversed an
> earlier "withhold context to decorrelate" stance (invariant 1).

---

## Workflow

The foreign harness appears in **three layers** around a serial build, plus a black-box **Tester**
(Part III) per module. A human is pulled in only at Gate 1, to adjudicate Tester defects, and to drain
escalations.

- **Gate 1 — HARD SYNCHRONOUS barrier at Design→Build (§2).** The build does not start until the plan
  audit is adjudicated; the one place a human may block, and it blocks *once*.
- **Part II — serial per-chunk build→audit loop (§5),** each chunk ruled by a pluggable auditor (§6):
  `agy` as the foreign / decorrelated tier, a Claude peer as the quota fallback, the human as async floor.
- **Part III — per-module black-box Tester loop (§7).** When every chunk of a module is COMPLETE, a
  Tester that **represents the user** exercises the assembled module through its **exposed surfaces
  only**, then loops defects back to the builder via the architect.
- **Gate 2 — opt-in whole-build audit (§3),** completeness + accuracy — the whole-artifact gaps no
  single-chunk audit can see.

Roles exchange via file-based semaphores (`*.builder.md` / `*.auditor.md`); each runs a background
watcher on its inbound file (invariant 4).

**Flowcharts:** see [`docs/MHBP_PROCESS_DIAGRAM.md`](MHBP_PROCESS_DIAGRAM.md) — end-to-end layers, the
semaphore handshake, and the pluggable-auditor / Tester decision trees.

---

## 0. Why this lab exists

Baseline MABP runs *every* AI role — architect, builder, QA, the §16.4 second verifier — on Claude. Its
own residual is sharp:

> *"a spec confidently wrong, read the same wrong way by every verifier, still ships."*

That is **correlated verifier error**, a *same-harness* artifact. Diversifying the lens within one model
family (one Haiku, one Sonnet) does not decorrelate the blind spot: models that share training share
failure modes; the baseline's only backstop is a human sample audit.

**Antigravity (`agy`) is a different model family** (Gemini). Its blind spots do not line up with
Claude's, so a defect both Claude verifiers read the same wrong way has an independent chance of being
caught (invariant 1). That is the thesis of a Multi-**Harness** Build Process: a foreign harness
decorrelates the error same-harness triangulation cannot reach. The foreign tier is applied where signal
is highest — plan-time, whole-build, risk-flagged chunks — because the residual is largely a
whole-artifact question and foreign audits cost a separate provider's quota.

**The control:** `docs/MULTI_AGENT_BUILD_PROCESS.md` and the `sm-mabp-*` skills are not edited by this
work (invariant 2).

---

## 1. The harness — Antigravity (agy)

- **`agy` is Antigravity** — Google's agentic harness, pinned to a non-Claude model (Gemini), invoked as
  a separate process (invariant 1).
- **File-based handoff via semaphores.** The builder and the auditor exchange through the lane files of
  §5; each watches its inbound file with a background process (§8, invariant 4). No human is in the
  hand-off path during a run.
- **`agy` auto-loads no anchor — it must be fed context.** Unlike Claude (which boots from `CLAUDE.md` +
  its memory dir), `agy` reads no anchor on its own. The architect starts the session and, as the first
  turns, has it read `CLAUDE.md` (project) and this doc (its auditor role) before handing over the audit
  brief. This grounding is required (invariant 1).
- **Adversarial stance, baked in.** Every audit prompt instructs `agy` to assume the artifact is
  incomplete/wrong until evidence proves otherwise — divergence is signal (baseline §16.3 G4, across a
  harness boundary).

**Invocation (session, read-only, grounded):**

```bash
# 1. Start an Antigravity session on a non-Claude model, scoped read-only to an
#    isolated worktree/copy (manifest roots only — never repo root):
~/.local/bin/agy --model "Gemini 3.1 Pro (High)" --add-dir <isolated-worktree>/<manifest-root> ...

# 2. First in-session turns — bootstrap grounding (agy auto-loads no anchor):
#      "Read CLAUDE.md and docs/MHBP_LAB.md so you know the project and your auditor role."

# 3. Hand the audit brief; agy writes findings to its semaphore file (atomic: write a
#    .partial, then rename, so the architect's watcher never reads a half-file):
#      docs/build/auditor/lanes/<UNIT>.auditor.md   (or plan_audit_<tag>.md for Gate 1)
```

---

## 2. Gate 1 — post-plan audit (the HARD Design→Build barrier)

- **When.** After planning produces chunk specs + `READY.md`, before the build. A wrong decomposition
  poisons every chunk downstream, so this boundary cannot be made async: **the build is parked until the
  gate is adjudicated.**
- **Input.** The plan only — cited PRD sections, `docs/planning/READY.md`, `docs/planning/chunks/*`.
  Scope `agy` with `--add-dir docs/planning` (no source), from a read-only copy.
- **What the auditor attacks:**
  - Is this the *right* decomposition, or is the dependency / order reasoning wrong?
  - What does the plan assume that may be false? What "wrong thing" is it about to build correctly?
  - What cross-chunk interaction is unplanned — what breaks when chunk N meets chunks already specced?
  - What would a hostile maintainer say about this design in six months?
- **Output.** `docs/build/auditor/plan_audit_<tag>.md`, each finding tagged `blocking` / `question` /
  `noted`. (Re-runs use a fresh `<tag>`.)
- **Adjudication (the one human-in-loop wait).** The architect works *with* the human on the report —
  revise the plan, accept as-is, or record a dated rebuttal. The auditor issues no binding verdict; its
  job is done when the doubt is on the table. The human clears blocking findings once, then the serial
  build (§5) runs. It never auto-passes a plan with open `blocking` findings — with no human present the
  gate stays parked.

---

## 3. Gate 2 — post-build audit (optional, completeness + accuracy)

- **When.** The architect declares the build complete. Opt-in; the common case.
- **The manifest.** The architect writes `docs/build/auditor/build_manifest_<tag>.md` — pointers to every
  file used and touched: specs consumed, source and tests written, the delivery surfaces (§16.5), and the
  plan/PRD sections that defined "done."
- **What the auditor audits** (scoped via `--add-dir` to manifest roots, read-only copy):
  - **Completeness** — is everything specced actually built *and* tested? Any criterion with no
    code/test? Any delivery surface unexercised?
  - **Accuracy** — does what shipped match intent? Any silent gap, dead end, stubbed path, or drift the
    conformance gate would miss because the spec itself was read wrong?
- **Output.** `docs/build/auditor/build_audit_<tag>.md`, severity-tagged.
- **Routing.** The architect routes findings into the baseline's paths: fix-loop, a dated rebuttal in
  `CHUNK_LEDGER.md`, or escalation (invariant 2 — the auditor never touches `npm run gate`).
- **Known limitation (§9d).** Gate 2 sees only what the manifest lists; an omitted file hides its own
  gap. Build the manifest mechanically from the touched-files record (`git diff --name-only` over the
  build range + cited specs), not from memory.

---

## 4. Build phase — the ultracode option

The manual MABP per-chunk cycle (architect → builder → QA → verdict) can be replaced by an **ultracode
Claude Workflow** that orchestrates the build deterministically — the recommended build harness going
forward, with the manual cycle as fallback. The two `agy` gates are **harness-agnostic**: they wrap
*whichever* build produced the artifact, operating on the plan and the touched-files manifest, not the
build's internals. Design: `docs/ULTRACODE_WORKFLOW_DESIGN.md`. Authoring / validating the runnable
workflow from that design is a separate follow-up (§11).

---

## 5. Serial per-chunk build → audit loop (Part II)

Once Gate 1 clears, Part II runs **one chunk at a time** (invariant 3). The lane mechanism —
semaphore files, derived state, disjoint write paths, guardrails — is specified once in
`docs/build/auditor/PROTOCOL.md` (DeliveryOS is the canonical origin of that kernel) +
`DELIVERYOS_BINDINGS.md` beside it (this project's concrete paths/commands); this section adds only
what's MHBP-specific.

**Harness-agnostic.** The mechanism does not care whether a chunk's auditor is a Claude peer or the
foreign tier (§6) — same files, same derived state.

**The watch is mandatory (invariant 4).** No watcher = the run stalls. `docs/build/auditor/watcher.sh`
implements the portable poll floor; transport options are in §8.

**Per-chunk rigor unchanged (invariant 6).** Every chunk gets the full treatment — source re-read at
file:line, suite re-run, blind adversarial pass. Serial is not an excuse to skim.

Loop prompts for the two sessions: `docs/build/auditor/ARCHITECT_LOOP_PROMPT.md` and
`AUDITOR_LOOP_PROMPT.md`.

---

## 6. Pluggable auditor — own / foreign / human

A chunk's auditor is a **role**, satisfiable three ways; the `AUDITOR:` field records which ran:

- **`own` — a same-harness Claude peer.** The baseline §16.4 blind verifier (G1–G4), and/or
  `docs/MABP_LAB.md`'s Arm A intent-critic / Arm B persistent verifier. Cheap, native Agent-tool handoff.
  **Same model family → not decorrelated.**
- **`foreign` — Antigravity (`agy`), non-Claude (Gemini), via the semaphore handoff.** The decorrelation
  tier (invariant 1), applied to risk-flagged / high-blast-radius chunks, cross-chunk seams, plus a random
  sample for the correlated-error backstop.
- **`human` — the async floor.** Resolves the escalation queue and borderline parks (§8).

**Quota fallback (Run-1, expected).** When `agy` is unavailable (quota / outage), an authorized Claude
same-harness blind pass takes the chunk so the serial run never stalls. Log it
`AUDITOR: own (agy unavailable — quota)`; the foreign tier stays "unavailable" for that chunk and earns
**no foreign catch** (invariant 1 — same family). Liveness without inflating the foreign metric.

**Anchor (ergonomics, not a control).** Because `agy` auto-loads no anchor, the architect bootstraps its
role per session by having it read `CLAUDE.md` + this doc (§1). A future convenience is a provisioned
Gemini harness profile (`GEMINI.md` or portable `AGENTS.md`) via the managed-block convention
(`docs/architecture/harness-profiles.md`; `extension/src/profiles/registry.ts`) — see §11. An ergonomics
upgrade, not a correctness requirement.

Trust invariants for this section are §0.2 and §0.6; the foreign harness is **additive insurance**, never
a replacement verifier (counter-prediction §9c).

---

## 7. The Tester — per-module black-box user-acceptance loop (Part III)

**What it is.** A third role, distinct from builder and auditor: a **black-box Tester that represents the
user.** The auditor reviews a *chunk* with full sight of source (white-box maintainer); the Tester
exercises a *completed module* purely through its **exposed delivery surfaces** (§16.5) and judges it as a
user would — does the assembled capability work end to end at realistic use? It hunts the residual neither
the per-chunk audit nor the conformance gate can reach: **cross-chunk interactions that emerge only when
several chunks ship together** (baseline §10).

**Unit = the module / CR, not the chunk.** A module is a cohesive group of chunks delivering one
user-facing capability. The §5 loop drives every chunk of a module to COMPLETE first; only then is the
Tester initiated against the assembled module.

**Stance — black-box, user fidelity (a role definition, NOT a decorrelation control).**

- It designs and runs tests purely from (a) the module's intended user-facing behaviour (the PRD/spec
  sections it delivers) and (b) its exposed surfaces (§16.5: command/host handlers, the webview UI,
  persisted artifacts on reload, activation, the packaged VSIX).
- It **does not read source, tests, or builder reports to design a test** — no view of internals, as a
  user has none. It MAY read code post-hoc only to localize a confirmed defect to a chunk.
- This is **role fidelity, not the decorrelation mechanism** (invariant 1 — that remains the model
  family). Code-blindness makes the Tester a faithful *user*: a complementary independence.

**What it does (both modes).**

1. **Exploratory dynamic testing.** Drive the running module through realistic user journeys and
   adversarial edge cases against the exposed surfaces — happy path, malformed input,
   empty/repeat/concurrent states, and the cross-chunk seams where one chunk's output feeds another. Every
   defect gets reproduction: surface · input · expected · observed · severity.
2. **Authored module-level integration checks.** From spec + surfaces alone, author executable integration
   acceptance checks (exit 0/1, bound to a surface, asserting observable end-to-end behaviour across
   chunks) and run them. Advisory only — they never enter `npm run gate` (invariant 2).

**Harness — pluggable (own / foreign / human).**

- **`foreign` — `agy`/Gemini.** *Doubly* independent: different model family (invariant 1) **and**
  code-blind by role. Ideal for **authoring** black-box scenarios. Caveat: `agy` runs read-only/isolated
  (invariant 5) and cannot drive a live editor — a foreign Tester contributes *test design*.
- **`own` — a Claude peer.** Has the tooling (`@vscode/test-electron`, sideload, surface exercise) to
  **execute** the module live. The default executing Tester, and the quota fallback (logged
  `own (agy unavailable — quota)`, no foreign catch).
- **`human` — the async floor.** The literal user; adjudicates borderline "defect or intended?" calls.

Default: a **foreign** tier *designs* the decorrelated journeys/checks, a Claude **own** tier *executes*
them live; on quota the Claude tier does both (no foreign catch credited).

**The defect → builder feedback loop (the OUTER loop), nesting outside §5:**

```text
   per-chunk build↔audit (§5) ──all chunks COMPLETE──▶ assemble MODULE
          ▲                                                   │
          │ architect re-fires the                   Tester drives the
          │ responsible chunk through §5             EXPOSED SURFACES
          │ (re-audited — floor never bypassed)              │
          │                                                  ▼
     builder fixes ◀──── DEFECTS (round N) ──── <MODULE>.tester.md
                                                             │
                                          ACCEPTED ──▶ module done ─▶ next module
```

- **New semaphore: `docs/build/auditor/lanes/<MODULE>.tester.md`** (the Tester owns), mirroring §5. It
  carries per-defect rows (surface · repro · expected · observed · severity), an `AUTHOR_TIER` /
  `EXEC_TIER` pair, a **`TESTER: own | foreign | human`** record, and
  **`VERDICT: ACCEPTED | DEFECTS (round N)`**.
- **Routing — back to the builder via the architect.** Builders are stateless per-chunk fires, so on
  `DEFECTS` the architect routes each defect to the responsible chunk and re-fires it through §5 (a changed
  chunk is re-audited — the floor is never skipped), or raises a module-level fix / spec BLOCKER when the
  defect is an integration-design fault. A re-fired chunk must regress-pass its own criteria *and* the
  Tester re-runs the failed journeys before the verdict can flip to `ACCEPTED`.
- **Watcher (mandatory, §8).** The Tester watches the module-complete signal (all the module's chunks'
  `*.auditor.md` = COMPLETE); the architect watches `<MODULE>.tester.md` (invariant 4).
- **Depth cap.** Mirror baseline Cycle 6: at Tester round **`_v4`** for a module, escalate to the human
  (keep iterating / redesign / re-plan / park) — unbounded test↔fix churn means the **module spec**, not
  the build, is wrong.

**Distinct from the auditor (§6) — at a glance.**

| | Auditor (§5/§6) | Tester (§7) |
| --- | --- | --- |
| Unit | chunk | module / CR |
| View | white-box — re-reads source at file:line, reads the builder report | **black-box — exposed surfaces only; never reads code to design a test** |
| Represents | adversarial maintainer / verifier | **the user** |
| Fires | after each chunk is built | after **all** of a module's chunks are COMPLETE |
| Independence | model family (foreign `agy`) | model family **and** code-blindness (role fidelity) |
| Verdict | `COMPLETE / AWAITING_FIXES` (chunk) | `ACCEPTED / DEFECTS` (module) |
| Feeds back to | builder, same chunk | builder, the responsible chunk(s) / a module fix |
| Binding floor | `npm run gate` (per chunk) | unchanged — Tester is advisory, never enters the gate |

Every §0 invariant holds: the Tester never edits/runs `npm run gate`, verifies independently, and a
**foreign** Tester must be non-Claude or its foreign credit is void.

---

## 8. Notification & unattended operation — the mandatory watcher

During a run the human is **not** in the hand-off path, so for the serial loop to advance each role must
learn the other has written its semaphore file — the background watcher of invariant 4 is **required**,
not an option. Setup: (1) both harnesses run with auto-approval inside scoped directories (Claude Code
auto-accept / scoped skip-permissions; `agy` auto-confirm + read-only `--add-dir`); (2) each role launches
its inbound-file watcher before the exchange.

| Transport | How it wakes the counterpart | Portability | Notes |
| --- | --- | --- | --- |
| **Filesystem watcher** *(recommended local)* | a native watch on `lanes/` wakes the role on write | OS-specific; abstracted by chokidar / the VS Code API | **Reuse DeliveryOS's existing debounced, SHA-256-deduped `FileSystemWatcher`** on `.deliveryos-handoff/` — the MABP_LAB §1.3 primitive |
| **Poll / cron** *(portable floor — implemented)* | each role periodically re-reads `lanes/` + `INDEX.md` and acts if it is now its turn | Everywhere, no daemon | `docs/build/auditor/watcher.sh`; the Claude side can self-pace via `ScheduleWakeup` / `/loop` |
| **Git as the bus** *(durable substrate)* | semaphore files committed to the shared branch; a new commit is the signal; a `post-merge` hook or poll-on-fetch triggers | Anywhere git runs | the ledger **is** the git history — durable + auditable for free |
| **MCP message-bus** | a small server exposes turn primitives; both harnesses are MCP clients | **Gated**: needs MCP support on *both* harnesses + a running server | Cleanest semantics, heaviest ops; verify `agy` MCP support first |

**Recommended default:** the **FileSystemWatcher** locally, with **`watcher.sh` (poll)** as the portable
floor — implemented. Whichever is chosen, a watcher must be running on each side for the run to be valid
(invariant 4).

**Escalation.** Because the loop is serial, a `blocking` or borderline finding **parks the current chunk**
(AWAITING_FIXES / escalated, finding written to the queue) and the run waits there until the human drains
it or an authorized fallback resolves it. There is no "other lane keeps flowing." The one hard synchronous
wait by design is Gate 1 (§2); chunk-level parks resolve as the human returns.

---

## 9. Pre-registered predictions

Logged in `docs/build/EXPERIMENT_LOG.md` **before** each run, so neither outcome can be rationalized after
the fact.

- **Thesis.** The foreign harness catches **correlated-error** defects all-Claude review missed:
  *wrong-thing* at plan time (Gate 1) and *silent incompleteness/inaccuracy* of the whole build (Gate 2) —
  the residual a same-harness gate is structurally unable to evaluate. The **Tester (§7)** adds a third
  target: **cross-chunk integration defects** that surface only when a module's chunks ship together
  (baseline §10's residual), from the user's black-box view.
- **Counter-predictions (to test, not assume):**
  - **(a) Noise.** Gemini false-alarms at a rate that drowns the signal — a chatty critic has real
    adjudication cost.
  - **(b) False divergence.** Divergences are model-quirk / stylistic preference, not substantive defects.
  - **(c) Capability floor.** `agy` misses things Claude catches — the gate is only ever additive
    insurance, never a replacement. Kept on that basis or not at all.
  - **(d) Manifest blind spot.** Gate 2 sees only what the manifest lists; an omitted file hides its own
    gap. Pre-register how each manifest was built (mechanical, not from memory).
  - **(e) Handoff failure (serial loop, §5/§8).** A role's watcher is not running or misses a write, an
    atomic-write race shows a half-file, or a parked chunk holds the line. Pre-register whether the watcher
    fired reliably and whether the loop *lost work or stalled*. (The Run-1 failure mode.)
  - **(f) Quota-fallback dilution.** The foreign provider runs out of quota often enough that most chunks
    fall back to the Claude auditor (§6) — so the foreign tier audits too few chunks to backstop
    correlated error. Pre-register the share of chunks actually audited by `agy` vs. fallen back to `own`.
  - **(g) Tester redundancy / false-user defects.** The Tester either catches nothing that the per-chunk
    audit and Gate 2 did not, OR raises "defects" that are intended behaviour it misread as a user. Pre-register
    the module defects the Tester caught that no per-chunk audit/gate did, and the share triaged out as
    not-a-defect.

---

## 10. Protocol

Reuse the shared protocol from `docs/MABP_LAB.md` §3 (control = baseline MABP; pre-register before each
run; target N ≥ 5 before any verdict — Run-1 is N=1). MHBP-specific metrics to log per run, in addition:

- **Per gate:** findings raised; classified **real / false-divergence / noise**; **correlated-error
  catches** (real defects all-Claude review missed — the headline metric); for Gate 1, catches that
  prevented wasted build cost; extra cost (`agy` wall-clock, a separate provider).
- **Per chunk (§5):** which **auditor tier** ruled (`own` / `foreign` / `human`, and whether `own` was an
  agy-unavailable fallback), whether the **watcher fired**, any park/escalation, and the correlated-error
  catches **attributable to the foreign tier** (via the `AUDITOR:` field).
- **Per module (§7):** which **Tester tier** ruled (`TESTER:` field), module-level defects caught that no
  per-chunk audit/gate did, the share triaged out as not-a-defect, and whether the watcher fired.
- **Disposition.** After N, a one-line **kept / killed / inconclusive** call grounded in the ledger. Kept
  only if it yields correlated-error catches without unmanageable false-divergence/noise (a/b), the serial
  handoff neither stalled nor lost work (e), and the foreign tier covered enough chunks despite quota (f) —
  always framed as additive (c).

---

## 11. Out of scope (deliberately) and required follow-ups

- **The watcher's portable floor now exists** (`docs/build/auditor/watcher.sh`, invariant 4) —
  poll/cron, implemented. The FileSystemWatcher-reuse and MCP-bus transports (§8) remain future
  upgrades; a manual, watcher-less exchange is still the Run-1 failure mode to avoid.
- **Run `agy` read-only / isolated** (invariant 5). Tooling to launch `agy` against a throwaway worktree
  pinned to the build's HEAD and to scope `--add-dir` to manifest roots is a required enabler.
- **The Tester (§7) needs a live-module execution enabler.** A Claude `own` Tester drives the assembled
  module through its surfaces; a foreign `agy` Tester can only *design*. Wiring the design-vs-execute
  split, the `<MODULE>.tester.md` semaphore + watcher, and the module→chunk defect-routing is a required
  enabler. Advisory — never enters `npm run gate` (invariant 2).
- **No edits to the baseline** (`docs/MULTI_AGENT_BUILD_PROCESS.md`) or the `sm-mabp-*` skills. Promotion
  of a proven gate / loop into the baseline is a separate, later step.
- **Authoring the ultracode build workflow** (§4) is its own task, validated separately. Design is
  done (`docs/ULTRACODE_WORKFLOW_DESIGN.md`); the runnable script and its validation on a real chunk
  are what's left.
- **A Gemini/Antigravity harness profile** operationalizes the §6 per-session bootstrap. The registry
  (`extension/src/profiles/registry.ts`) ships only `claude-code` (`CLAUDE.md`) and `codex` (`AGENTS.md`)
  today; a `gemini`/`agy` profile (`instruction_file: GEMINI.md` or portable `AGENTS.md`,
  `command_template` per §1, `harness_version_pin` to the agy/Gemini CLI) would provision the auditor role
  once instead of bootstrapping each session. A product task, ergonomics only.
