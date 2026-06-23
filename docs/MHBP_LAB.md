# MHBP Lab — a foreign harness (Antigravity/agy · Gemini) as adversarial cross-harness auditor

> **Experimental. Non-normative.** The production process is
> `docs/MULTI_AGENT_BUILD_PROCESS.md` (v4) and is unchanged by this document. This file is a sibling
> to `docs/MABP_LAB.md` (Arms A/B, both *same-harness* Claude peers). It specs a different
> instrument: a **second LLM harness** — **Antigravity** (`agy`, Google's agentic harness, running
> Gemini) — bolted on as an **adversarial auditor**, at the two expensive phase boundaries (after
> planning, after build) and in the per-chunk build loop between them. The auditor role is
> **harness-pluggable: it can be Claude or Antigravity (agy)** (§6). Nothing here overrides the
> baseline; where they appear to conflict, the baseline wins until evidence promotes this work.

**Created:** 2026-06-19. **Revised:** 2026-06-23 — folds in the Run-1 dogfood (N=1, signal not
evidence): the build loop is **serial, one chunk at a time** (the parallel-lanes attempt was the
failure); the semaphore handoff requires a **mandatory background watcher** per role (the missing
watcher was the stall); `agy` is named as **Antigravity** and run **read-only** from a session that is
**fed `CLAUDE.md` + this doc** for grounding; **decorrelation = different model family alone**; and a
**Claude quota-fallback** is codified.

---

## Workflow

The foreign harness appears in **three layers** wrapped around a **serial, one-chunk-at-a-time build**.
A human is pulled in only at the one hard barrier (Gate 1) and to drain escalations.

- **Gate 1 — a HARD, SYNCHRONOUS barrier at the Design→Build boundary (§2).** The build does not start
  until the plan audit is adjudicated. This is the one place a human may block — and it blocks *once*.
- **Part II Build — serial per-chunk build → audit loop (§5),** each chunk ruled by a **pluggable
  auditor (§6):** Antigravity (`agy`) as the foreign / decorrelated tier, a same-harness Claude peer as
  the quota fallback, and the human as an async floor. **One chunk is in flight at a time** — the next
  chunk does not start until the current chunk is COMPLETE.
- **Gate 2 — an opt-in boundary audit of the whole build (§3),** completeness + accuracy. It catches the
  whole-artifact gaps no single-chunk audit can see.

The exchange between the two roles is **file-based semaphores** (`*.builder.md` / `*.auditor.md`), and
**each role runs a background process watching its inbound semaphore file** — that watch is what fires
the handoff. Skipping it (no watcher) is what stalled Run-1.

```text
   PLAN (chunk specs, READY.md)
        │
   ╔══════════════════════════════════════════════╗   GATE 1 · cross-harness · BLOCKING
   ║ HARD SYNCHRONOUS BARRIER  (Design → Build)   ║   auditor: Claude  or  Antigravity (agy)
   ║ audit the whole plan; build is PARKED        ║   agy → Gemini 3.1 Pro (High), read-only
   ║ until blocking findings are adjudicated      ║   --add-dir docs/planning
   ╚══════════════════════════════════════════════╝
        │  ◀── the ONE hard wait (human-in-loop here, and only here)
        ▼
   PART II BUILD ─ SERIAL · one chunk at a time
   ┌──────────────────────────────────────────────────────────────────┐
   │ for each chunk, in dependency order (one in flight at a time):     │
   │                                                                    │
   │   builder builds ─▶ writes lanes/<UNIT>.builder.md  (SUBMITTED)    │
   │                          │  (auditor's background watcher fires)   │
   │                          ▼                                         │
   │   auditor audits  ─▶ writes lanes/<UNIT>.auditor.md (VERDICT)      │
   │                          │  (builder's background watcher fires)   │
   │                          ▼                                         │
   │   COMPLETE ─▶ next chunk    |    AWAITING_FIXES ─▶ same chunk again │
   │                                                                    │
   │ auditor is PLUGGABLE (§6):                                         │
   │   • Antigravity (agy · Gemini)  foreign · decorrelated by family   │
   │   • Claude peer                 same-family · quota fallback        │
   │   • human                       async floor · drains escalations    │
   │                                                                    │
   │ state DERIVED from the two files · each role WATCHES its inbound    │
   │ semaphore via a MANDATORY background process · NO parallelism       │
   └──────────────────────────────────────────────────────────────────┘
        │
   ╔══════════════════════════════════════════════╗   GATE 2 (optional) · cross-harness
   ║ post-build WHOLE-ARTIFACT audit              ║   auditor reads TOUCHED-FILES manifest
   ║ COMPLETENESS + ACCURACY (severity-tagged)    ║   agy read-only · --add-dir <repo roots>
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

**Antigravity (`agy`) is a different model family** (Gemini). Its blind spots do not line up with
Claude's, so a defect both Claude verifiers read the same wrong way has an independent chance of being
caught by a harness that does not share Claude's training. **That different model family is the entire
decorrelation guarantee** — not context-blindness. The foreign auditor is given the project's full
context for grounding (it is *fed* `CLAUDE.md` and this doc, §1); decorrelation survives that because it
comes from *whose* model reads the artifact, not from *what* the model is allowed to see. That is the
thesis of a Multi-**Harness** Build Process (MHBP): a foreign harness decorrelates the error that
same-harness triangulation cannot reach.

It sits at **phase boundaries and per chunk** — but the foreign tier is applied where the signal is
highest (plan-time, whole-build, and risk-flagged chunks), because the residual it hunts is largely a
*whole-artifact* question, and foreign-harness audits cost a separate provider's quota.

### What is kept fixed (the control)

`docs/MULTI_AGENT_BUILD_PROCESS.md` and the production `sm-mabp-*` skills are **not edited** by this
work. The non-agentic gate (baseline §16.2 / §16.4) stays the binding mechanical floor in every run.
The gates here are advisory foreign signal layered *around* the unchanged baseline.

---

## 1. The harness — Antigravity (agy) as foreign auditor

- **`agy` is Antigravity** — Google's agentic harness, pinned to a **non-Claude** model (Gemini). It is
  invoked as a separate process, so its reasoning is a different model family from Claude's (§0).
- **File-based handoff via semaphores.** The architect/builder and the auditor exchange through the lane
  files of §5 (`*.builder.md` / `*.auditor.md`), and each side **watches its inbound file with a
  background process** (§7) — that watch is what triggers the audit and the read-back. There is no
  human in the hand-off path during a run.
- **agy is started as a session, then fed context — it auto-loads no anchor.** Unlike Claude (which
  boots from `CLAUDE.md` + its memory dir), `agy` does **not** read `CLAUDE.md` or any anchor on its
  own. So the architect **starts the session and, as the first turns, has it read `CLAUDE.md` (project)
  and `docs/MHBP_LAB.md` (its auditor role + this protocol)** before handing over the audit brief. This
  grounding is required, not optional — a context-starved `agy` was the first Run-1 failure.
- **Decorrelation requirement (normative) = the model family.** Always pin a non-Claude model:
  `--model "Gemini 3.1 Pro (High)"` (the **High** tier is agy's deep/"ultracode" equivalent). **If `agy`
  runs a Claude model the run is void** — it is the same family again. Feeding `agy` `CLAUDE.md` and this
  doc does **not** void the run: decorrelation comes from the different model, not from withholding
  context (this reverses the earlier "withhold framing" stance).
- **agy is agentic → run it READ-ONLY / isolated.** `--add-dir <root>` scopes what it may reach, but
  `agy` can *edit* files in scope (Run-1: it silently edited 4). So point it at an **isolated copy /
  throwaway worktree pinned to the build's HEAD**, never the live tree, and scope `--add-dir` to the
  **manifest roots only, never the repo root**. The auditor must not be able to mutate the artifact it
  is auditing.
- **Adversarial stance, baked in.** Every audit prompt instructs `agy` to assume the artifact is
  incomplete/wrong until the evidence proves otherwise — divergence is signal, never relaxed to make a
  thing pass (baseline §16.3 G4, applied across a harness boundary).

**Invocation form (session, read-only, grounded):**

```bash
# 1. Start an Antigravity session on a non-Claude model, scoped read-only to an
#    isolated worktree/copy of the artifact (manifest roots only — never repo root):
~/.local/bin/agy --model "Gemini 3.1 Pro (High)" --add-dir <isolated-worktree>/<manifest-root> ...

# 2. First in-session turns — bootstrap grounding (agy auto-loads no anchor):
#      "Read CLAUDE.md and docs/MHBP_LAB.md so you know the project and your auditor role."

# 3. Hand the audit brief; agy writes findings to its semaphore file (atomic write —
#    write to a .partial and rename, so the architect's watcher never reads a half-file):
#      docs/build/auditor/lanes/<UNIT>.auditor.md   (or plan_audit_<tag>.md for Gate 1)
```

---

## 2. Gate 1 — post-plan adversarial audit (the HARD synchronous Design→Build barrier)

- **When.** After planning produces chunk specs + `READY.md`, **before** the build. This is a **hard,
  synchronous barrier**: the Design→Build boundary is the one boundary that cannot be made async,
  because a wrong decomposition poisons every chunk downstream. **The build is parked until this gate is
  adjudicated.**
- **Input.** The plan only: cited PRD sections, `docs/planning/READY.md`, `docs/planning/chunks/*`.
  Scope `agy` with `--add-dir docs/planning` (plan docs only — no source), from a read-only copy.
- **What the auditor attacks (intent / plan):**
  - Is this the *right* decomposition, or is the dependency/order reasoning wrong?
  - What does the plan *assume* that may be false? What "wrong thing" is it about to build correctly?
  - What cross-chunk interaction is unplanned — what breaks when chunk N meets chunks already specced?
  - What would a hostile maintainer say about this design in six months?
- **Output.** `docs/build/auditor/plan_audit_<tag>.md`, each finding tagged `blocking` / `question` /
  `noted`. (Re-runs use a fresh `<tag>` so a prior audit is never overwritten.)
- **Adjudication (the one human-in-loop wait).** This barrier is where the human spends their single
  synchronous touchpoint: the **architect works *with* the human** on post-analysis of the report —
  revise the plan, accept as-is, or record a dated rebuttal. The auditor issues no binding verdict; its
  job is done when the doubt is on the table. The human clears blocking findings **once**, then the
  serial build (§5) runs and the human is free. It **never** auto-passes a plan with open `blocking`
  findings — with no human present the gate simply stays parked.

---

## 3. Gate 2 — post-build adversarial audit (optional, completeness + accuracy)

- **When.** The architect declares the build complete. Opt-in; this is the common case.
- **The manifest.** The architect writes `docs/build/auditor/build_manifest_<tag>.md` — pointers to
  **every file used and touched** during the build: specs consumed, source and tests written, the
  delivery surfaces (§16.5), and the plan/PRD sections that defined "done."
- **What the auditor audits** (scoped via `--add-dir` to the manifest roots, from a read-only copy):
  - **Completeness** — is everything the plan specced actually built *and* tested? Any criterion with
    no corresponding code/test? Any delivery surface unexercised?
  - **Accuracy** — does what shipped match intent? Any silent gap, dead end, stubbed path, or drift
    from the spec the conformance gate would not catch because the spec itself was read wrong?
- **Output.** `docs/build/auditor/build_audit_<tag>.md`, severity-tagged as above.
- **Routing.** The architect routes findings into the baseline's existing paths: fix-loop, a dated
  rebuttal in `BUILD_STATUS.md`, or escalation to the human. **The auditor never touches `npm run
  gate`** — the non-agentic gate (§16.2/§16.4) stays the machine-run binding floor; the foreign audit is
  advisory signal layered on top.
- **Known limitation (pre-registered, §8d).** Gate 2 only sees what the manifest lists. An omitted file
  hides its own gap — so the manifest must be built mechanically from the build's touched-files record
  (e.g. `git diff --name-only` over the build range + the specs cited), not from memory.

---

## 4. Build phase — the ultracode option

The manual MABP per-chunk cycle (architect → builder sub-agent → QA sub-agent → verdict) can be
replaced by an **ultracode Claude Workflow** that orchestrates the build deterministically — MABP is
"somewhat superseded by ultracode." This is the **recommended** build harness going forward, with the
manual MABP cycle as the fallback.

The two `agy` gates are **harness-agnostic**: they wrap *whichever* build harness produced the artifact,
because they operate on the plan and on the touched-files manifest, not on the build's internal
mechanics. Authoring and validating the ultracode build workflow is a **separate follow-up task**, out
of scope for this lab doc.

---

## 5. Serial per-chunk build → audit loop (Part II)

Once Gate 1 (§2) clears, Part II runs **one chunk at a time** — the semaphore-handshake mechanism the
aegis-quant-frontier team dogfooded (their `audit/handshake/PROTOCOL.md` v2) and the file-watcher peer
in `docs/MABP_LAB.md` §1.3, **run serially**. Run-1 proved the serial form works with both auditor
harnesses (Claude and Antigravity); the *parallel* form was the failure. The mechanism is
**harness-agnostic**: it does not care whether a chunk's auditor is a Claude peer or `agy` (§6).

> **Serial, by decision (Run-1).** Exactly **one chunk is in flight at a time**. The next chunk does not
> start until the current chunk is COMPLETE. No concurrency cap, no "lanes in flight," no parallel
> substrate — the parallel attempt is what broke, and serializing dissolves the concurrent-write and
> stale-round hazards a parallel queue creates.

**Semaphore files.** Per chunk (unit), two files under `docs/build/auditor/lanes/`:

- `<UNIT>.builder.md` — the build harness owns. Commit SHA, `depends-on: <UNIT>` (or none), what/why,
  the tests run + results, the builder's own revert-proof QA, and a `SUBMITTED: round N` line. Writing
  or bumping this file (a new round) is the **semaphore** that signals AWAITING_AUDIT — the auditor's
  turn.
- `<UNIT>.auditor.md` — the auditor owns. Per-finding verdict, a
  `VERDICT: COMPLETE | AWAITING_FIXES (round N)` line, the audit-report path, and an
  **`AUDITOR: own | foreign | human`** line recording which harness ruled (and, for `own` used as the
  agy fallback, the reason — see §6). Writing this file is the **semaphore** back to the builder.

**The watch is mandatory.** Each role must run a **background process watching its inbound semaphore
file** *before* the exchange begins: the auditor watches `<UNIT>.builder.md`, the builder/architect
watches `<UNIT>.auditor.md`. The handoff fires on that watch. **No watcher = no handoff = the run
stalls** — that, not a schema bug, was the Run-1 failure (neither side was watching). Transport is §7;
the watcher is a precondition of a valid run, not an optimization.

**State is derived, never flagged.** A chunk's state is computed from its two files, so there is no
shared mutable flag:

- **AWAITING_AUDIT** — builder `SUBMITTED round` > auditor `VERDICT round` (or no auditor file yet) →
  the auditor's turn.
- **AWAITING_FIXES** — the auditor's latest verdict is `AWAITING_FIXES` → the build harness's turn.
- **COMPLETE** — the auditor's latest verdict is `COMPLETE` → advance to the next chunk.

Because the loop is serial, the builder never re-submits a chunk before its verdict is in (the
"builder-outruns-verdict" race only exists under parallelism), and there is at most one writer active at
a time — so the single ledger below has no concurrent-write hazard.

**Disjoint write paths** (DeliveryOS-shaped): the build harness writes `src/`, `tests/`, `docs/build/`,
config, its own `*.builder.md`, and `lanes/INDEX.md`; the auditor side writes `docs/build/auditor/**`
and `*.auditor.md`. Each role commits only its own paths; commit the lane file together with `INDEX.md`
in one commit so a watcher never sees an inconsistent pair.

**Guardrails:**

1. **Per-chunk rigor unchanged.** Every chunk gets the full independent treatment (source re-read at
   file:line + suite re-run + blind adversarial pass). Serial is not an excuse to skim.
2. **Dependencies.** Build in dependency order; a chunk is not started until its `depends-on` is
   COMPLETE. (Serial execution makes this automatic — there is no early-dependent to strand.)
3. **Progress index.** The build harness maintains `lanes/INDEX.md`, a glanceable table of every chunk,
   its derived state, its `depends-on`, and **which auditor tier** ruled. It is **advisory** — the
   canonical state is always derived from the two semaphore files, never read from `INDEX.md`.
4. **Single ledger.** `docs/build/EXPERIMENT_LOG.md` stays the ONE chronological record (every verdict
   appended by whichever role is active). Serial execution guarantees no concurrent append.

---

## 6. Pluggable auditor — Claude or Antigravity (own / foreign / human)

A chunk's auditor is a **role**, satisfiable three ways; the `AUDITOR:` field records which ran:

- **`own` — a same-harness Claude peer.** The baseline §16.4 blind verifier (G1–G4), and/or
  `docs/MABP_LAB.md`'s Arm A intent-critic ("the Adversary") / Arm B persistent verifier. Cheap,
  native Agent-tool handoff. **Same model family as the builder → not decorrelated.**
- **`foreign` — Antigravity (`agy`), on a non-Claude (Gemini) model, via the semaphore handoff.** The
  decorrelation tier (§0). Applied to risk-flagged / high-blast-radius chunks, cross-chunk seams, plus a
  random sample for the correlated-error backstop. **Decorrelation rule (load-bearing): the foreign
  auditor MUST be non-Claude (`--model "Gemini 3.1 Pro (High)"`); a chunk audited by `agy` on a Claude
  model is void** — same family again.
- **`human` — the async floor.** Resolves the escalation queue and borderline-severity parks (§7).

**Fallback auditor (Run-1, expected — not exotic).** Foreign-provider **quota runs out**; when `agy` is
unavailable (quota / outage), an authorized **Claude same-harness blind pass takes the chunk** so the
serial run never stalls. Log it `AUDITOR: own (agy unavailable — quota)`; the **foreign tier stays
"unavailable" for that chunk and earns no decorrelated/foreign catch** — by the §0 rule it is the same
family, so it counts only toward the same-harness tally. This keeps liveness without inflating the
foreign metric.

**Decorrelation is the model, not the context (reversed from the prior draft).** Earlier drafts treated
*withholding context* from `agy` (no `CLAUDE.md`, no framing) as load-bearing and said leaking it voids
a run. That was wrong. **`agy` is given the project's full context for grounding** — it is told to read
`CLAUDE.md` and this doc at session start (§1) — and the run remains valid, because the blind-spot
decorrelation comes entirely from the **different model family**. The only thing that voids a foreign
run is `agy` running a **Claude model**.

**Anchor (operational convenience, not a decorrelation control).** Because `agy` auto-loads no anchor
today, the architect bootstraps its role per session by having it read `CLAUDE.md` + this doc. A future
convenience is a provisioned **Gemini harness profile** (`GEMINI.md`, or the portable `AGENTS.md`) via
the DeliveryOS managed-block convention (`docs/architecture/harness-profiles.md`;
`extension/src/profiles/registry.ts`), version-pinned to the agy/Gemini CLI in use — see §10. It would
carry the auditor role + protocol + scope so future runs need less per-session bootstrapping; it is an
ergonomics upgrade, not a correctness requirement.

**Trust-critical invariants (unchanged):**

- **`npm run gate` stays the binding mechanical floor.** No auditor tier — own, foreign, or human — ever
  edits or runs the non-agentic gate (baseline §16.2 / §16.4) as its verdict. The audit is advisory
  signal layered on top.
- The auditor verifies **independently**, never closes on the build harness's word, re-reads changed
  source at file:line, and runs the blind adversarial pass.
- The foreign harness is **additive insurance**, never a replacement verifier (counter-prediction §8c).
- **Pre-register** predictions in `EXPERIMENT_LOG.md` before each run; N ≥ 5 before any kept/killed call.

---

## 7. Notification & unattended operation — the mandatory watcher

The premise: during a run the human is **not** in the hand-off path. For the serial loop to advance,
each role must **learn the other has written its semaphore file** — so the background watcher of §5 is
**required**, not an option. (This is the piece Run-1 skipped, and the run stalled.) Setup has two
parts: (1) both harnesses run with **auto-approval** inside scoped directories (Claude Code
auto-accept / scoped skip-permissions; `agy` auto-confirm + read-only `--add-dir` scoping); and (2)
each role launches its **inbound-file watcher** before the exchange.

| Transport | How it wakes the counterpart | Portability | Notes |
| --- | --- | --- | --- |
| **Filesystem watcher** *(recommended local)* | a native watch on `lanes/` wakes the role on write | OS-specific; abstracted by chokidar / the VS Code API | **Reuse DeliveryOS's existing debounced, SHA-256-deduped `FileSystemWatcher`** on `.deliveryos-handoff/` — the same primitive as MABP_LAB §1.3's file-watcher peer |
| **Poll / cron** *(portable floor)* | each role periodically re-reads `lanes/` + `INDEX.md` and acts if it is now its turn | Runs **everywhere**, no daemon | latency = poll interval; the Claude side can self-pace via `ScheduleWakeup` / `/loop` |
| **Git as the bus** *(durable substrate)* | semaphore files committed to the shared branch; a new commit is the signal; a `post-merge` hook or poll-on-fetch triggers | Anywhere git runs | the ledger **is** the git history — durable + auditable for free |
| **MCP message-bus** | a small server exposes turn primitives; both harnesses are MCP clients | **Gated**: needs MCP support on *both* harnesses + a running server | Cleanest semantics, heaviest ops; verify `agy`/Antigravity MCP support before mandating |

**Recommended default:** the **FileSystemWatcher** locally (low-latency, reuses what DeliveryOS ships),
with **git + poll** as the portable floor. **Whichever is chosen, a watcher must be running on each
side for the run to be valid** — a manual, watcher-less exchange is not a supported run (it is the
failure mode).

**Escalation.** Because the loop is serial, a `blocking` or borderline finding **parks the current
chunk** (leaves it AWAITING_FIXES / escalated, writes the finding to the queue) and the run waits there
until the human drains it or an authorized fallback resolves it. There is no "other lane keeps flowing"
— serial means the one parked chunk holds the line. The **one** hard synchronous wait by design is Gate
1 (§2); chunk-level parks are the others, resolved as the human returns.

---

## 8. Pre-registered predictions

Logged in `docs/build/EXPERIMENT_LOG.md` **before** each run, so neither outcome can be rationalized
after the fact.

- **Thesis.** The foreign harness (Antigravity/Gemini) catches **correlated-error** defects that
  all-Claude review missed: *wrong-thing* at plan time (Gate 1) and *silent
  incompleteness/inaccuracy* of the whole build (Gate 2) — precisely the residual a same-harness gate is
  structurally unable to evaluate.
- **Counter-predictions (to test, not assume):**
  - **(a) Noise.** Gemini false-alarms at a rate that drowns the signal — a chatty foreign critic that
    cries wolf has real adjudication cost.
  - **(b) False divergence.** Divergences turn out to be model-quirk / stylistic preference, not
    substantive defects (a different harness disagreeing is not the same as a defect found).
  - **(c) Capability floor.** `agy` misses things Claude catches — so the gate is only ever *additive
    insurance*, never a replacement verifier. Kept on that basis or not at all.
  - **(d) Manifest blind spot.** Gate 2 sees only what the manifest lists; an omitted file hides its own
    gap. Pre-register how each run's manifest was built (mechanical, not from memory).
  - **(e) Handoff failure (serial loop, §5/§7).** The semaphore handoff stalls — a role's **watcher is
    not running** or misses a write, an atomic-write race shows a half-file, or a parked chunk holds the
    line. Pre-register whether the watcher fired reliably and whether the loop *lost work or stalled*,
    not just whether it advanced. (This is the Run-1 failure mode — promoted to a pre-registered watch.)
  - **(f) Quota-fallback dilution.** The foreign provider runs out of quota often enough that most
    chunks fall back to the Claude same-harness auditor (§6) — so the *foreign* tier audits too few
    chunks to backstop correlated error. Pre-register the share of chunks actually audited by `agy` vs.
    fallen back to `own`, so the foreign tier's coverage is honest.

---

## 9. Protocol

Reuse the shared protocol from `docs/MABP_LAB.md` §3:

1. **Control = baseline MABP**, scored on identical plans/builds.
2. **Pre-register predictions** in `EXPERIMENT_LOG.md` *before* each run. No post-hoc story.
3. **Sample size.** Target **N ≥ 5** audited plans/builds per gate before any verdict. One run is not
   evidence (Run-1 is N=1 — signal, not evidence).
4. **Metrics per run, logged verbatim** (per gate): findings raised; classified **real /
   false-divergence / noise**; **correlated-error catches** — real defects all-Claude review missed (the
   headline metric); for Gate 1, catches that prevented wasted build cost; extra cost (`agy` wall-clock,
   noted as a separate provider). For the per-chunk loop (§5), also log per chunk: which **auditor tier**
   ruled (`own` / `foreign` / `human`, and whether `own` was an agy-unavailable fallback), whether the
   **watcher fired** on the handoff, any park/escalation, and the correlated-error catches
   **attributable to the foreign (Antigravity) tier** (separated from same-harness catches via the
   `AUDITOR:` field).
5. **Disposition.** After N runs, a one-line **kept / killed / inconclusive** call grounded in the
   ledger. **Kept only if** it yields correlated-error catches *without* unmanageable
   false-divergence/noise (counter-predictions a/b), the serial handoff neither stalled nor lost work
   (counter-prediction e), and the foreign tier actually covered enough chunks despite quota
   (counter-prediction f) — and always framed as additive (counter-c).

---

## 10. Out of scope (deliberately) and required follow-ups

- **The watcher is a REQUIRED part of the protocol, not an optimization.** A valid run needs a
  background watcher on each role's inbound semaphore file (§7). Building/wiring one transport (the
  FileSystemWatcher reuse, git+poll floor, or the MCP bus) plus auto-approval config for both harnesses
  is the **named, required** enabler — a manual, watcher-less exchange is the Run-1 failure mode, not a
  fallback.
- **Run `agy` read-only / isolated.** Tooling to launch `agy` against a throwaway worktree pinned to the
  build's HEAD (so its agentic edits cannot touch the live tree) and to scope `--add-dir` to manifest
  roots is a required enabler (§1). Run-1 showed an unscoped `agy` silently edits files.
- **`agy` never replaces Claude QA** and **never enters the non-agentic gate** — it is additive foreign
  signal, not part of the binding mechanical floor (§6 invariants).
- **No edits to the baseline** (`docs/MULTI_AGENT_BUILD_PROCESS.md`) or the `sm-mabp-*` skills.
  Promotion of a proven gate or loop into the baseline is a separate, later step.
- **Authoring the ultracode build workflow** (§4) is its own task, validated separately.
- **A Gemini/Antigravity harness profile operationalizes the per-session bootstrap (§6).** The registry
  (`extension/src/profiles/registry.ts`) ships only `claude-code` (`CLAUDE.md`) and `codex`
  (`AGENTS.md`) today. A `gemini`/`agy` profile (`instruction_file: GEMINI.md` or portable `AGENTS.md`,
  `command_template` per §1's invocation form, `harness_version_pin` to the agy/Gemini CLI in use) would
  let the auditor role be provisioned once instead of bootstrapped each session. It widens `ProfileName`
  and touches the render/suggested-update switches — a product task, separate from this lab doc, and an
  ergonomics upgrade only (decorrelation does not depend on it).
