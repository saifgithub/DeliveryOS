# MABP Lab — experimental variants chasing the residual 10%

> **Experimental. Non-normative.** The production process is
> `docs/MULTI_AGENT_BUILD_PROCESS.md` (v4) and is unchanged by this document. This file specs two
> experimental *arms* layered on top of it, plus the protocol for deciding — from evidence, not
> anecdote — whether either arm earns its way into the baseline. Nothing here overrides the
> baseline; where they appear to conflict, the baseline wins until an arm is proven and promoted.

**Created:** 2026-06-18.

---

## 0. Why this lab exists

Baseline MABP is judged to work to ~90%. By its own admission (§10, §13, §16.4 of the baseline)
the part it **cannot** catch is a specific residual:

- the architect designing the *wrong chunk* — correct execution of an incorrect spec
- a bug class no test detects — the spec is *met* but the spec is *wrong*
- cross-chunk interactions that only emerge when several chunks ship together
- "a spec confidently wrong, read the same wrong way by every verifier, still ships"

The pattern is sharp: **MABP nails "built right" (conformance); the 10% it can't reach is "right
thing" (intent).** A blind, stateless, mechanical gate is *structurally incapable* of catching
"the spec itself is wrong" — because it authors its acceptance checks **from** the spec. No amount
of conformance rigor closes that gap; it is a different question that needs a different instrument.

Two candidate instruments are specced below as independent arms. They are run as deliberate,
logged variations against the unchanged baseline (the **control**), and scored by the protocol in
§3. The founding premise: **one successful run is not evidence.**

### What is deliberately kept fixed (the control)

`docs/MULTI_AGENT_BUILD_PROCESS.md` and the production `sm-mabp-*` skills are **not edited** by
this work. The arms are executed by hand (an architect session running the variation), doc-only,
until the evidence says otherwise. The non-agentic gate (baseline §16.2 / §16.4) stays in force in
every arm so that it is never the varied factor.

---

## 1. Arm A — Intent-critic peer ("the Adversary")

**Thesis.** Add a role MABP lacks. Leave the §16 conformance machinery untouched; bolt on a
*second sustained session*, peer to the architect, whose only job is to attack **intent**.

This arm repurposes three instincts that are *liabilities* in the conformance loop — persistent
context, peer standing, file-based peer comms — and points them where they are *assets*: the
intent layer, upstream of the build.

### 1.1 The role

- **The Adversary** is a red-team peer, context-equal to the architect. It reads the same
  pre-reads: the full `docs/build/BUILD_STATUS.md`, every chunk spec in `docs/planning/chunks/`,
  and the cited PRD sections. **Persistent context is a feature here** — cross-chunk intent drift
  is exactly the residual it hunts, and it cannot see drift without remembering the arc.
- It does **not** verify conformance, write checks, or issue pass/fail. It surfaces *doubt about
  intent* for the architect (and ultimately the human) to adjudicate.

### 1.2 The questions it asks (per chunk)

- Is this the *right chunk* to build now, or is the dependency/order reasoning wrong?
- Is the spec actually *correct*, not merely *clear*? What does it assume that may be false?
- What cross-chunk interaction are we blind to — what breaks when chunk N meets chunks already
  shipped?
- What would a *hostile maintainer* say about this design in six months?

### 1.3 Mechanism — the file-watcher peer (its correct home)

Two **sustained peer sessions** (architect + Adversary) are separate processes. Files are the only
channel between them — which is precisely why the file-watcher mechanism fits here and is redundant
in the conformance loop (where the Agent tool already hands off synchronously).

```text
docs/build/adversary/
├── to_adversary_chunk_NN.md          # architect writes: the design-intent brief for chunk NN
└── adversary_findings_chunk_NN.md    # Adversary writes: intent critique, severity-tagged
```

1. At a chunk's **design step** (baseline §6 step 2–3, before the builder is fired), the architect
   writes `to_adversary_chunk_NN.md`: the chunk's intent, the key design decisions, why this chunk
   now, and the assumptions it rests on.
2. The Adversary (separate session) watches the dir, reads the brief plus its own standing context,
   and writes `adversary_findings_chunk_NN.md` — each finding tagged `blocking-intent` /
   `question` / `noted`.
3. The architect reads the findings and either:
   - **(a)** revises the chunk spec or re-picks the chunk (routes into the baseline's existing
     spec-change / BLOCKER path — nothing new downstream), or
   - **(b)** records a dated **rebuttal** in `BUILD_STATUS.md` ("Adversary raised X on chunk NN;
     not actioned because …").
4. Bound the exchange to **two rounds** per chunk (mirrors baseline Cycle 6's depth cap) to avoid
   ping-pong, then the architect decides and logs.

The Adversary operates **upstream** of the build, at the spec/design layer. It never touches the
gate, never reads as a verdict. Until a real `fswatch` wrapper is justified (§4), "watch" can be
the architect simply pinging the Adversary session and reading the output file back.

### 1.4 Why capture risk is low here

The Adversary issues no binding verdict, so there is no pass/fail to soften. Its persistent context
is aimed at a question (intent) the mechanical gate cannot evaluate at all, so it adds signal
rather than competing with the gate. The human/architect adjudicates — the Adversary's job is done
when the doubt is *on the table*, not when it is resolved.

---

## 2. Arm B — Persistent-verifier MABP (the original hypothesis, tested head-to-head)

**Thesis.** Test the literal claim: does a *persistent-context peer verifier* beat the fresh, blind,
stateless QA — or does it degrade via capture at scale? This arm exists to settle a genuine
disagreement with evidence, not to win it by assertion.

### 2.1 The single varied factor

- **Baseline QA** is fresh per fire, blind (§16.3 G1), no inter-session memory.
- **Arm B QA** is a *sustained* verifier session that keeps context across iterations *and* across
  chunks, with peer standing in the verdict discussion.
- **Everything else is held identical to baseline**, including the non-agentic gate (§16.2 / §16.4)
  as a fixed mechanical floor. Context persistence of the verifier is the *only* variable.

### 2.2 Pre-registered, competing predictions

Logged in `EXPERIMENT_LOG.md` **before** each run, so neither outcome can be rationalized after the
fact:

- **Stakeholder's prediction:** persistent context lets the verifier catch more, earlier — no
  re-derivation tax, and memory of prior findings catches *shallow patches* (a fix that papers over
  a symptom and silently reintroduces an earlier defect a version later).
- **Counter-prediction (to be tested, not assumed):**
  - **Capture / anchoring** — across a chunk's `v1 → v4` revisions, the verifier *softens* findings
    as it accommodates the architect's framing (severity drifts down without the defect being
    fixed).
  - **Spec-gap masking** — the verifier stops filing the baseline §16.3 **G3** "spec not ready"
    BLOCKER because it now fills the gap from accumulated context instead of flagging that the
    intent was never written down.

### 2.3 What "kept" requires

Arm B is kept only if it catches conformance defects baseline misses **without** measurable capture
(§2.2) over the sample. If capture or G3-masking shows up at scale, that is the predicted failure
and the arm is killed regardless of early wins.

---

## 3. Shared experimental protocol

1. **Control = baseline MABP.** Each arm is scored against the baseline on **identical chunks**.
2. **Pre-register predictions** in `docs/build/EXPERIMENT_LOG.md` *before* each run: what the arm
   should catch that baseline misses, what it costs, and how it could fail. No post-hoc story.
3. **Sample size.** Run each arm over a meaningful N of chunks (**target ≥ 5**) before any verdict.
   One run is not evidence — that is the founding premise of this lab.
4. **Metrics per chunk, logged verbatim:**
   - Defects caught that baseline missed, **classified**: intent / conformance / cross-chunk.
   - False alarms / noise raised (a chatty critic that cries wolf has a real cost).
   - Extra cost: tokens **and** wall-clock vs baseline.
   - **Arm B only:** capture signal (did finding severity drift *down* across revisions without a
     fix?); G3-BLOCKER rate vs baseline.
5. **Disposition.** After N chunks, each arm gets a one-line **kept / killed / inconclusive** call
   grounded in the ledger — not in the best single anecdote.

---

## 4. Out of scope (for now, deliberately)

- No edits to `docs/MULTI_AGENT_BUILD_PROCESS.md` or the production `sm-mabp-*` skills. Promotion
  of a proven arm into the baseline is a separate, later step.
- No `fswatch`/automation for the file-watcher yet. Arm A starts with the architect manually
  checking the Adversary's output dir; a real watcher wrapper is an optimization to earn *after*
  the arm proves its worth.
