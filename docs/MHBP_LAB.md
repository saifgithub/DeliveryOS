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

Two **optional, independent** gates. The user opts into either, both, or neither per build — they are
asynchronous and decoupled; Gate 2 is the common case, Gate 1 is cheap insurance before an expensive
build, and neither is a prerequisite for the other.

```text
DISCOVER / PRD ─▶ PLAN (chunk specs, READY.md)
                      │
     ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤  ← user may opt into Gate 1 here
     ┊    ╔═══════════════════════════════════╗
     ┊    ║ GATE 1 (optional) post-plan audit ║  adversarial · cross-harness
     ┊    ║ in : PRD + READY.md + chunk specs ║  agy · Gemini 3.1 Pro (High)
     ┊    ║ out: plan critique (severity-tag) ║
     ┊    ╚═══════════════════════════════════╝
     ┊                │
     ┊                ▼
     ┊   architect + HUMAN adjudicate  ◀── human-in-loop (revise / accept / rebut)
     └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤
                      ▼
      BUILD  ──  ultracode (Claude Workflow)   ┐  the expensive phase
                 └─ or fallback: manual MABP   ┘
                      │
     ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤  ← user may opt into Gate 2 here (independent of Gate 1)
     ┊    architect writes TOUCHED-FILES MANIFEST  (pointers to every file used/touched)
     ┊                │
     ┊                ▼
     ┊    ╔═══════════════════════════════════════════╗
     ┊    ║ GATE 2 (optional) post-build audit        ║  adversarial · cross-harness
     ┊    ║ in : manifest → agy --add-dir reads files ║  agy · Gemini 3.1 Pro (High)
     ┊    ║ audits: COMPLETENESS + ACCURACY           ║
     ┊    ║ out: audit report (severity-tag)          ║
     ┊    ╚═══════════════════════════════════════════╝
     ┊                │
     ┊                ▼
     ┊    architect routes findings (fix / rebut in BUILD_STATUS / escalate)
     └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘
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

## 2. Gate 1 — post-plan adversarial audit (optional, human-in-loop)

- **When.** After planning produces chunk specs + `READY.md`, **before** the expensive build. Opt-in;
  use it when the plan is large/risky enough that a wrong decomposition would waste real build cost.
- **Input.** The plan only: cited PRD sections, `docs/planning/READY.md`, `docs/planning/chunks/*`.
  Scope agy with `--add-dir docs/planning` (plan docs only — no source).
- **What agy attacks (intent / plan):**
  - Is this the *right* decomposition, or is the dependency/order reasoning wrong?
  - What does the plan *assume* that may be false? What "wrong thing" is it about to build correctly?
  - What cross-chunk interaction is unplanned — what breaks when chunk N meets chunks already specced?
  - What would a hostile maintainer say about this design in six months?
- **Output.** `docs/build/auditor/plan_audit_<tag>.md`, each finding tagged `blocking` / `question` /
  `noted`.
- **Adjudication (human-in-loop).** Planning has a human in the loop, so the **architect works *with*
  the human** on post-analysis of agy's report: revise the plan, accept as-is, or record a dated
  rebuttal. agy issues no binding verdict — its job is done when the doubt is on the table.

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
- **Known limitation (pre-registered, see §5d).** Gate 2 only sees what the manifest lists. An omitted
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

## 5. Pre-registered predictions

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

---

## 6. Protocol

Reuse the shared protocol from `docs/MABP_LAB.md` §3:

1. **Control = baseline MABP**, scored on identical plans/builds.
2. **Pre-register predictions** in `EXPERIMENT_LOG.md` *before* each run. No post-hoc story.
3. **Sample size.** Target **N ≥ 5** audited plans/builds per gate before any verdict. One run is not
   evidence.
4. **Metrics per run, logged verbatim** (per gate): findings raised; classified **real /
   false-divergence / noise**; **correlated-error catches** — real defects all-Claude review missed
   (the headline metric); for Gate 1, catches that prevented wasted build cost; extra cost (agy
   wall-clock, and note that it is a separate provider).
5. **Disposition.** After N runs, a one-line **kept / killed / inconclusive** call grounded in the
   ledger. **Kept only if** it yields correlated-error catches *without* unmanageable
   false-divergence/noise (counter-predictions a/b) — and always framed as additive (counter-c).

---

## 7. Out of scope (for now, deliberately)

- **No helper script yet.** Gates start as manual file passing (the architect runs agy by hand); a
  wrapper script is an optimization to earn *after* the gates prove their worth (mirrors MABP_LAB §4).
- **agy never replaces Claude QA** and **never enters the non-agentic gate** — it is additive foreign
  signal, not part of the binding mechanical floor.
- **No edits to the baseline** (`docs/MULTI_AGENT_BUILD_PROCESS.md`) or the `sm-mabp-*` skills.
  Promotion of a proven gate into the baseline is a separate, later step.
- **Authoring the ultracode build workflow** (§4) is its own task, validated separately.
