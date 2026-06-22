# MHBP Lab — a foreign harness (agy/Gemini) as adversarial cross-harness auditor

> **Experimental. Non-normative.** The production process is
> `docs/MULTI_AGENT_BUILD_PROCESS.md` (v4) and is unchanged by this document. This file is a sibling
> to `docs/MABP_LAB.md` (Arms A/B, both *same-harness* Claude peers). It specs a different
> instrument: a **second LLM harness** (`agy`, a Gemini CLI) bolted on as an **adversarial auditor at
> the two expensive phase boundaries** — after planning and after build. Nothing here overrides the
> baseline; where they appear to conflict, the baseline wins until evidence promotes this work.

**Created:** 2026-06-19.

---

## Workflow

The foreign harness appears in **three layers** wrapped around an **autonomous, parallel build** — no
longer the two sequential, hand-driven gates of v1. The build runs unattended ("Netflix mode", §7); a
human is pulled in only at the one hard barrier and to drain an asynchronous escalation queue.

- **Gate 1 — a HARD, SYNCHRONOUS barrier at the Design→Build boundary (§2).** The build does not start
  until the plan audit is adjudicated. This is the one place a human may block — and it blocks *once*.
- **Part II Build — parallel autonomous per-unit lanes (§5),** each ruled by a **pluggable auditor (§6):**
  an own-harness Claude peer by default, the foreign harness (`agy`) on a sampled / risk-flagged subset as
  the decorrelation backstop, and the human as an async floor.
- **Gate 2 — an opt-in boundary audit of the whole build (§3),** completeness + accuracy. It catches the
  whole-artifact gaps that no per-unit lane can see.

Gates 1 and 2 are the two foreign **boundary** audits; the per-unit lanes are the new **autonomous
substrate** between them. In the v1 manual model both gates were optional; in autonomous mode Gate 1 is
structurally required — you cannot safely run an unattended parallel build on an unaudited plan.

```text
   PLAN (chunk specs, READY.md)
        │
   ╔══════════════════════════════════════════════╗   GATE 1 · cross-harness · BLOCKING
   ║ HARD SYNCHRONOUS BARRIER  (Design → Build)   ║   agy · Gemini 3.1 Pro (High)
   ║ agy audits the whole plan; build is PARKED   ║   --add-dir docs/planning
   ║ until blocking findings are adjudicated      ║   (human clears once, then leaves)
   ╚══════════════════════════════════════════════╝
        │  ◀── the ONE hard wait (human-in-loop here, and only here)
        ▼
   PART II BUILD ─ parallel autonomous per-unit lanes (Netflix mode)
   ┌──────────────────────────────────────────────────────────────────┐
   │ lanes/<UNIT>.builder.md ┐ state DERIVED from the two files        │
   │ lanes/<UNIT>.auditor.md ┘ (no shared flag · safe concurrent       │
   │ lanes/INDEX.md            commits) · cap ≤ N AWAITING_AUDIT        │
   │                                                                    │
   │ auditor role is PLUGGABLE per lane (§6):                           │
   │   • own     — Claude peer (MABP Arm A/B)   default · cheap · native│
   │   • foreign — agy / Gemini                 sampled · decorrelation │
   │   • human   — async floor                  drains escalation queue │
   │                                                                    │
   │ escalation PARKS one lane; every other lane keeps flowing         │
   └──────────────────────────────────────────────────────────────────┘
        │
   ╔══════════════════════════════════════════════╗   GATE 2 (optional) · cross-harness
   ║ post-build WHOLE-ARTIFACT audit              ║   agy reads TOUCHED-FILES manifest
   ║ COMPLETENESS + ACCURACY (severity-tagged)    ║   --add-dir <repo roots>
   ╚══════════════════════════════════════════════╝
        │
   architect routes findings (fix / rebut in BUILD_STATUS / escalate)
```

---

## 0. Why this lab exists

Baseline MABP runs *every* AI role — architect, builder, QA, even the §16.4 "triangulating" second
verifier — on **Claude**. Its own stated residual is sharp:

> *"a spec confidently wrong, read the same wrong way by every verifier, still ships."*

That is **correlated verifier error**, and it is a *same-harness* artifact. Diversifying the lens
*within one model family* — one Haiku, one Sonnet (baseline §16.4) — does not decorrelate the blind
spot: models that share training share failure modes. The baseline's only backstop against it is a
human sample audit.

`agy` is a **different model family invoked as an external process**. Its blind spots do not line up
with Claude's, and as a separate process it is structurally blind to Claude's context — a stronger
G1 (blind authoring) than any Claude verifier can achieve. That is the thesis of a
Multi-**Harness** Build Process (MHBP): a foreign harness decorrelates the error that same-harness
triangulation cannot reach.

It sits at **phase boundaries, not per chunk** — deliberately. The residual it hunts (wrong-thing at
plan time; silent incompleteness/inaccuracy of the whole build) is a *whole-artifact* question, and
boundary-level auditing keeps the foreign-harness cost low while the signal is highest.

### What is kept fixed (the control)

`docs/MULTI_AGENT_BUILD_PROCESS.md` and the production `sm-mabp-*` skills are **not edited** by this
work. The non-agentic gate (baseline §16.2 / §16.4) stays the binding mechanical floor in every run.
The gates here are advisory foreign signal layered *around* the unchanged baseline.

---

## 1. The harness — agy as foreign auditor

- **File-based handoff.** The only difference from MABP today is that files pass between Claude (the
  architect) and `agy` (an external process), rather than between Claude and a Claude sub-agent. The
  architect writes a brief, invokes agy, captures the report file, reads it back.
- **Anchor vs brief.** The `-p` brief is the per-call *task*; a harness's standing *role* lives in its
  **anchor file** — Claude boots from `CLAUDE.md` + its memory dir, agy/Gemini from `GEMINI.md`. An
  unattended audit needs the auditor role provisioned in the anchor, not rebuilt into a fat brief every
  call. Per-tier anchors and the decorrelation caveat are in §6.
- **Decorrelation requirement (normative).** agy's model list includes `Claude Sonnet 4.6 (Thinking)`
  and `Claude Opus 4.6 (Thinking)`. **If agy runs a Claude model the experiment is void** — it is the
  same family again. Always pin a non-Claude model: `--model "Gemini 3.1 Pro (High)"`. The **High**
  reasoning tier is agy's deep/"ultracode" equivalent and is the default for adversarial audits.
- **agy is agentic.** `--add-dir <root>` scopes the workspace it may read. Gate 2 uses this to read
  the real shipped artifacts; Gate 1 keeps the scope to plan docs only. Do not let agy roam outside
  the scoped roots — blindness is controlled by what the architect lets it see.
- **Adversarial stance, baked in.** Every audit prompt instructs agy to assume the artifact is
  incomplete/wrong until the evidence proves otherwise — divergence is signal, never relaxed to make
  a thing pass (baseline §16.3 G4, applied across a harness boundary).

**Invocation form:**

```bash
~/.local/bin/agy --model "Gemini 3.1 Pro (High)" [--add-dir <root> ...] \
  -p "$(cat docs/build/auditor/<brief>.md)" > docs/build/auditor/<report>.md
```

---

## 2. Gate 1 — post-plan adversarial audit (the HARD synchronous Design→Build barrier)

- **When.** After planning produces chunk specs + `READY.md`, **before** the build. In the autonomous
  model (§5–§7) this is a **hard, synchronous barrier**: the Design→Build boundary is the one boundary
  that cannot be parallelized or made async, because a wrong decomposition poisons every parallel lane
  downstream. **The build is parked until this gate is adjudicated.** (In the v1 manual model it was
  opt-in cheap insurance; under unattended parallel build it is structurally required.)
- **Input.** The plan only: cited PRD sections, `docs/planning/READY.md`, `docs/planning/chunks/*`.
  Scope agy with `--add-dir docs/planning` (plan docs only — no source).
- **What agy attacks (intent / plan):**
  - Is this the *right* decomposition, or is the dependency/order reasoning wrong?
  - What does the plan *assume* that may be false? What "wrong thing" is it about to build correctly?
  - What cross-chunk interaction is unplanned — what breaks when chunk N meets chunks already specced?
  - What would a hostile maintainer say about this design in six months?
- **Output.** `docs/build/auditor/plan_audit_<tag>.md`, each finding tagged `blocking` / `question` /
  `noted`.
- **Adjudication (the one human-in-loop wait).** This barrier is where the human spends their single
  synchronous touchpoint: the **architect works *with* the human** on post-analysis of agy's report —
  revise the plan, accept as-is, or record a dated rebuttal. agy issues no binding verdict; its job is
  done when the doubt is on the table. The human clears blocking findings **once**, then the autonomous
  parallel build (§5) runs unattended and the human is free (§7). Full autonomy degrades gracefully: with
  no human present the gate simply stays parked until agy returns clean or a human arrives — it never
  auto-passes a plan with open `blocking` findings.

---

## 3. Gate 2 — post-build adversarial audit (optional, completeness + accuracy)

- **When.** The architect declares the build complete. Opt-in; this is the common case.
- **The manifest.** The architect writes `docs/build/auditor/build_manifest_<tag>.md` — pointers to
  **every file used and touched** during the build: specs consumed, source and tests written, the
  delivery surfaces (§16.5), and the plan/PRD sections that defined "done."
- **What agy audits** (scoped via `--add-dir` to the repo roots the manifest names):
  - **Completeness** — is everything the plan specced actually built *and* tested? Any criterion with
    no corresponding code/test? Any delivery surface unexercised?
  - **Accuracy** — does what shipped match intent? Any silent gap, dead end, stubbed path, or drift
    from the spec the conformance gate would not catch because the spec itself was read wrong?
- **Output.** `docs/build/auditor/build_audit_<tag>.md`, severity-tagged as above.
- **Routing.** The architect routes findings into the baseline's existing paths: fix-loop, a dated
  rebuttal in `BUILD_STATUS.md`, or escalation to the human. **agy never touches `npm run gate`** —
  the non-agentic gate (§16.2/§16.4) stays the machine-run binding floor; agy is advisory foreign
  signal layered on top.
- **Known limitation (pre-registered, see §8d).** Gate 2 only sees what the manifest lists. An omitted
  file hides its own gap — so the manifest must be built mechanically from the build's touched-files
  record (e.g. `git diff --name-only` over the build range + the specs cited), not from memory.

---

## 4. Build phase — the ultracode option

The manual MABP per-chunk cycle (architect → builder sub-agent → QA sub-agent → verdict) can be
replaced by an **ultracode Claude Workflow** that orchestrates the build deterministically — MABP is
"somewhat superseded by ultracode." This is the **recommended** build harness going forward, with the
manual MABP cycle as the fallback.

The two agy gates are **harness-agnostic**: they wrap *whichever* build harness produced the artifact,
because they operate on the plan and on the touched-files manifest, not on the build's internal
mechanics. Authoring and validating the ultracode build workflow is a **separate follow-up task**,
out of scope for this lab doc.

---

## 5. Parallel autonomous build lanes (Part II)

Once Gate 1 (§2) clears, Part II runs as **parallel, autonomous, per-unit lanes** — the mechanism the
aegis-quant-frontier team dogfooded (their `audit/handshake/PROTOCOL.md` v2), which is itself the
parallelized, productionized form of the file-watcher peer in `docs/MABP_LAB.md` §1.3. The lane mechanism
is **harness-agnostic**: it does not care whether a lane's auditor is an own-harness Claude peer or the
foreign `agy` (§6).

**Lane files.** Per unit (chunk / CR), two files under `docs/build/auditor/lanes/`:

- `<UNIT>.builder.md` — the build harness owns. Commit SHA, `depends-on: <UNIT>` (or none), what/why, the
  tests run + results, the builder's own revert-proof QA, and a `SUBMITTED: round N` line. Creating or
  bumping this file (a new round) is the build harness signalling AWAITING_AUDIT for that unit.
- `<UNIT>.auditor.md` — the auditor owns. Per-finding verdict, a
  `VERDICT: COMPLETE | AWAITING_FIXES (round N)` line, the run-report path, and an
  **`AUDITOR: own | foreign | human`** line recording which harness ruled — MHBP's one addition to the
  aegis schema, so the ledger can separate own-harness from foreign-harness catches (metrics: §9).

**State is derived, never flagged.** A unit's state is computed from its two files, so there is no shared
mutable file and no merge conflict on concurrent commits (identical to aegis "directory as queue"):

- **AWAITING_AUDIT** — builder `SUBMITTED round` > auditor `VERDICT round` (or no auditor file yet) → the
  auditor's turn.
- **AWAITING_FIXES** — the auditor's latest verdict is `AWAITING_FIXES` → the build harness's turn.
- **COMPLETE** — the auditor's latest verdict is `COMPLETE`.

**Disjoint write paths** (already DeliveryOS-shaped): the build harness writes `src/`, `tests/`,
`docs/build/`, config, its own `*.builder.md`, and `lanes/INDEX.md`; the auditor side writes
`docs/build/auditor/**` and `*.auditor.md`. Each role commits only its own paths.

**Guardrails (carried verbatim from aegis; harness-agnostic):**

1. **Concurrency cap.** At most **N** units may be AWAITING_AUDIT at once (aegis used 3). If the queue is
   full the build harness throttles building-ahead until the auditor clears one — parallelism never
   creates pressure to rush a review.
2. **Shared index.** The build harness maintains `lanes/INDEX.md`, a glanceable read-only table of every
   unit, its derived state, its `depends-on`, and **which auditor tier** ruled — the queue is visible
   without deriving from N lane files.
3. **Dependencies.** A dependent unit's COMPLETE is **provisional** until its `depends-on` is COMPLETE.
   The auditor may review a dependent early but does not set it COMPLETE until the dependency is — so a
   bounced dependency never strands a dependent.
4. **Per-unit rigor unchanged.** Every unit gets the full independent treatment (source re-read at
   file:line + suite re-run + blind adversarial pass). Parallel is **not** batch-and-skim; the cap is what
   protects this.
5. **Single ledger.** `docs/build/EXPERIMENT_LOG.md` stays the ONE chronological record across all lanes
   (every verdict appended) — reusing the existing pre-registration file, not a new one.

---

## 6. Pluggable auditor — own / foreign / human

A lane's auditor is a **role**, satisfiable three ways; the `AUDITOR:` field records which ran:

- **`own`** — a same-harness Claude peer: the baseline §16.4 blind verifier (G1–G4), and/or
  `docs/MABP_LAB.md`'s Arm A intent-critic ("the Adversary") / Arm B persistent verifier. **Default per
  lane** — cheap, parallel, native Agent-tool handoff. This is the aegis model: MABP_LAB §1.3 run in
  parallel autonomous lanes.
- **`foreign`** — `agy` / Gemini, via file passing. Applied to a **risk-targeted + random sample** of
  lanes (high-blast-radius chunks, cross-chunk seams, plus a random fraction for the correlated-error
  backstop). The foreign tier plays the role baseline §16.4's **human sample audit** plays — the scaling
  backstop against verifiers converging on a shared wrong reading — but it is cheaper to scale than a
  human and more decorrelated than a Claude peer. **Decorrelation rule (load-bearing):** the foreign
  auditor MUST be non-Claude (`--model "Gemini 3.1 Pro (High)"`); a lane audited by agy on a Claude model
  is **void** — it is the same family again.
- **`human`** — the async floor. Resolves the escalation queue and borderline-severity parks (§7).

**Routing (tunable per run):** every lane gets `own`; a sampled / risk-flagged subset *additionally* gets
`foreign`; anything either tier marks blocking-and-borderline escalates to `human`. This is why per-unit
foreign auditing — which v1 deliberately avoided on cost grounds — is now affordable: you foreign-audit a
**sample**, not every chunk.

**Anchors — each harness boots from its own context file, not just the per-call brief.** Claude's standing
context is `CLAUDE.md` + its memory dir; the `-p` brief is only the *task*. A foreign harness has the same
split, and an unattended audit needs the auditor **role** provisioned in the anchor rather than rebuilt
into a fat brief every call. Map the anchor per tier, reusing DeliveryOS's existing harness-profile
`instruction_file` + managed-block convention (`docs/architecture/harness-profiles.md`;
`extension/src/profiles/registry.ts`):

| Tier | Harness | Anchor file | Carries |
| --- | --- | --- | --- |
| `own` | Claude Code | `CLAUDE.md` + memory dir | project conventions + the lane protocol |
| `foreign` | agy / Gemini CLI | `GEMINI.md` (default; `contextFileName`-configurable — verify per CLI version) | the auditor role **only** (see caveat) |
| `foreign` / other | Codex, Cursor, Windsurf, … | `AGENTS.md` (open standard, read by many harnesses) | portable auditor role |

Write the anchor inside the DeliveryOS managed block (`<!-- DELIVERYOS:BEGIN --> … <!-- DELIVERYOS:END -->`,
additive, never destructive) so it can be refreshed without clobbering the harness's own anchor content.
Prefer the **portable `AGENTS.md`** where the harness honours the open standard; fall back to the
harness-native file (`GEMINI.md`, `CLAUDE.md`) otherwise. Each profile is **version-pinned** (`harness_version_pin`)
— a harness that moves its anchor filename or format invalidates the profile, exactly as for the command shape.

**Decorrelation caveat for the foreign anchor (load-bearing — an anchor can void a run as easily as a wrong
model).** The foreign anchor must carry **role + protocol + scope ONLY**: the adversarial "assume wrong
until proven" stance, and the lane mechanics (read `*.builder.md`, write `*.auditor.md`, derive state,
never touch `npm run gate`, stay inside `--add-dir`). It must **never** carry Claude's reading of the
artifact — no `CLAUDE.md` contents, no builder hot-spots, no Claude's spec interpretation, no prior
verdicts. Leaking any of those re-correlates the blind spot and voids the run exactly as running agy on a
Claude model does (§1). This is the anchor-level form of blind authoring (baseline §16.3 G1).

**Trust-critical invariants (unchanged — stated here so the parallel/autonomy churn cannot erode them):**

- **`npm run gate` stays the binding mechanical floor.** No auditor tier — own, foreign, or human — ever
  edits or runs the non-agentic gate (baseline §16.2 / §16.4) as its verdict. Lanes are advisory signal
  layered on top.
- The auditor verifies **independently**, never closes on the build harness's word, re-reads changed
  source at file:line, and runs the blind adversarial pass (aegis "per-CR rigor unchanged").
- The foreign harness is **additive insurance**, never a replacement verifier (counter-prediction §8c).
- **Pre-register** predictions in `EXPERIMENT_LOG.md` before each run; N ≥ 5 before any kept/killed call.

---

## 7. Autonomy ("Netflix mode") and transport options

The premise: **the human cannot sit at the keyboard authorizing actions.** Unattended setup has two parts:
(1) both harnesses run with **auto-approval** inside scoped directories (Claude Code auto-accept / scoped
skip-permissions; `agy` auto-confirm + `--add-dir` scoping); and (2) each harness's **anchor (§6) is
provisioned** via the managed-block convention so it boots straight into the auditor role with no human to
paste context. With those in place, the only piece doc-level file passing is missing is a way for each
harness to **learn the other has passed something** — a document-watcher / notification. Spec the
transport as options weighed for portability ("the multitude of systems this could run on"); do not
hard-code one beyond a recommended default.

| Transport | How it wakes the counterpart | Portability | Notes |
| --- | --- | --- | --- |
| **Poll / cron** *(recommended floor)* | each harness periodically re-reads `lanes/` + `INDEX.md` and acts on any lane now its turn | Runs **everywhere**, no daemon | aegis's CRON-TRIGGERED model; latency = poll interval; the Claude side can self-pace via `ScheduleWakeup` / `/loop` |
| **Filesystem watcher** | a native watch on `lanes/` wakes the harness on write | OS-specific; abstracted by chokidar / the VS Code API | **Reuse DeliveryOS's existing debounced, SHA-256-deduped `FileSystemWatcher`** on `.deliveryos-handoff/` — the same primitive as MABP_LAB §1.3's file-watcher peer |
| **Git as the bus** *(recommended durable substrate)* | lane files are committed to the shared branch (disjoint paths); a new commit is the signal; a `post-merge` hook or poll-on-fetch triggers | Anywhere git runs | aegis already commits lane files to a shared branch; the ledger **is** the git history — durable + auditable for free |
| **MCP message-bus** | a small server exposes `submit_lane` / `await_turn` / `poll_state`; both harnesses are MCP clients | **Gated**: needs MCP support on *both* harnesses + a running server | Cleanest semantics, heaviest ops; **verify `agy` / Gemini MCP support before mandating** — Claude Code supports MCP, agy is unconfirmed |

**Recommended default:** **git + poll** as the floor (zero daemon, maximum portability); the **filesystem
watcher** as a low-latency local enhancement that reuses the watcher DeliveryOS already ships; the **MCP
bus** as an opt-in upgrade once agy's MCP support is confirmed.

**Escalation is async and non-blocking.** A borderline or blocking finding **parks that one lane** (leaves
it AWAITING_AUDIT, writes the finding + an escalation entry to a queue) while every other lane keeps
flowing. The human drains the queue whenever they return; the loop never globally stalls in Part II. The
**one** hard synchronous wait in the whole process is Gate 1 (§2), by design — clear it once, then go
watch Netflix.

---

## 8. Pre-registered predictions

Logged in `docs/build/EXPERIMENT_LOG.md` **before** each run, so neither outcome can be rationalized
after the fact.

- **Thesis.** The foreign harness catches **correlated-error** defects that all-Claude review missed:
  *wrong-thing* at plan time (Gate 1) and *silent incompleteness/inaccuracy* of the whole build
  (Gate 2) — precisely the residual a same-harness gate is structurally unable to evaluate.
- **Counter-predictions (to test, not assume):**
  - **(a) Noise.** Gemini false-alarms at a rate that drowns the signal — a chatty foreign critic
    that cries wolf has real adjudication cost.
  - **(b) False divergence.** Divergences turn out to be model-quirk / stylistic preference, not
    substantive defects (a different harness disagreeing is not the same as a defect found).
  - **(c) Capability floor.** agy misses things Claude catches — so the gate is only ever *additive
    insurance*, never a replacement verifier. Kept on that basis or not at all.
  - **(d) Manifest blind spot.** Gate 2 sees only what the manifest lists; an omitted file hides its
    own gap. Pre-register how each run's manifest was built (mechanical, not from memory).
  - **(e) Coordination failure (parallel lanes, §5).** The derived-state queue deadlocks or strands
    work — a bounced dependency parks a chain, the concurrency cap starves throughput, or two rounds
    race so a stale verdict sticks. Pre-register whether the lane mechanism *added latency or lost work*,
    not just whether it added throughput.
  - **(f) Autonomy rubber-stamp (Netflix mode, §7).** Unattended, the loop advances lanes a human would
    have parked — the foreign sample rate is too low to backstop correlated error, or auto-approval lets
    a borderline finding self-clear. Pre-register the escalation-queue depth and how many auto-advanced
    lanes a later human sample audit reversed.

---

## 9. Protocol

Reuse the shared protocol from `docs/MABP_LAB.md` §3:

1. **Control = baseline MABP**, scored on identical plans/builds.
2. **Pre-register predictions** in `EXPERIMENT_LOG.md` *before* each run. No post-hoc story.
3. **Sample size.** Target **N ≥ 5** audited plans/builds per gate before any verdict. One run is not
   evidence.
4. **Metrics per run, logged verbatim** (per gate): findings raised; classified **real /
   false-divergence / noise**; **correlated-error catches** — real defects all-Claude review missed
   (the headline metric); for Gate 1, catches that prevented wasted build cost; extra cost (agy
   wall-clock, and note that it is a separate provider). For the per-unit lanes (§5), also log per lane:
   which **auditor tier** ruled (`own` / `foreign` / `human`), lanes in flight, lanes parked / escalated,
   and the correlated-error catches **attributable to the foreign tier** (separated from own-harness
   catches via the `AUDITOR:` field).
5. **Disposition.** After N runs, a one-line **kept / killed / inconclusive** call grounded in the
   ledger. **Kept only if** it yields correlated-error catches *without* unmanageable
   false-divergence/noise (counter-predictions a/b), and the parallel/autonomy machinery neither stranded
   work nor rubber-stamped (counter-predictions e/f) — and always framed as additive (counter-c).

---

## 10. Out of scope (deliberately) and required follow-ups

- **Wrapper / trigger is now a REQUIRED follow-up, not an optional optimization.** Manual file passing
  (the architect runs agy by hand) is **incompatible with Netflix mode** — an unattended loop cannot have
  a human in the hand-off path. So the autonomy plumbing (auto-approval config for both harnesses + the
  document-watcher / notification transport of §7) is a **named, required** task before any unattended
  run. The *manual* path remains the fallback for one-off, human-driven gates. (v1 deferred this as
  "no helper script yet"; autonomy promotes it.)
- **agy never replaces Claude QA** and **never enters the non-agentic gate** — it is additive foreign
  signal, not part of the binding mechanical floor (§6 invariants).
- **No edits to the baseline** (`docs/MULTI_AGENT_BUILD_PROCESS.md`) or the `sm-mabp-*` skills.
  Promotion of a proven gate or lane into the baseline is a separate, later step.
- **Authoring the ultracode build workflow** (§4) is its own task, validated separately.
- **The transport is specced, not built (§7).** Choosing and wiring one transport (git+poll floor, the
  FileSystemWatcher reuse, or the MCP bus) is the follow-up that makes the lanes runnable unattended.
- **A Gemini harness profile operationalizes the foreign anchor (§6).** The registry
  (`extension/src/profiles/registry.ts`) ships only `claude-code` (`CLAUDE.md`) and `codex` (`AGENTS.md`)
  today. The foreign auditor needs a `gemini` / `agy` profile (`instruction_file: GEMINI.md`,
  `command_template` per §1's invocation form, `mcp_capable` per §7, `harness_version_pin` to the agy/Gemini
  CLI in use). Adding it widens `ProfileName` and touches the render/suggested-update switches — a product
  task, separate from this lab doc.
