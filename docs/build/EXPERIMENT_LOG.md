# MABP Lab — experiment log

> Pre-registered predictions and per-chunk results for the two experimental arms specced in
> `docs/MABP_LAB.md`, plus the cross-harness auditor gates specced in `docs/MHBP_LAB.md` (§4 below).
> **Rule: predictions are written BEFORE the run.** A row whose prediction
> column was filled after the outcome is invalid evidence — start a fresh row instead.
>
> Control = baseline MABP (`docs/MULTI_AGENT_BUILD_PROCESS.md`, unchanged).
> Founding premise: one run is not evidence — target ≥ 5 chunks per arm before a verdict.

**Created:** 2026-06-18.

---

## How to use this log

For each (chunk, arm) run:

1. **Before the run** — add a row to the matching arm's results table with the **Prediction**
   filled and **Outcome** left blank. Pre-registration is the whole point.
2. **After the run** — fill **Outcome**, **Cost**, and (Arm B) the capture/G3 columns from the
   actual session, verbatim where possible.
3. After N ≥ 5 chunks for an arm, write its **kept / killed / inconclusive** disposition in §3.

Defect classification for the Outcome column: `intent` (wrong chunk / wrong spec) ·
`conformance` (built ≠ spec) · `cross-chunk` (emerges only across chunks) · `none`.

---

## 1. Arm A — Intent-critic peer ("the Adversary")

What it should catch that baseline misses: **intent** and **cross-chunk** defects, upstream of the
build. Cost it adds: a second sustained session + the brief/findings exchange. How it could fail:
noise (crying wolf), or ping-pong that never resolves.

| Chunk | Date | Prediction (pre-registered) | Outcome (caught / classified) | Noise / false alarms | Extra cost (tokens · wall-clock) |
| --- | --- | --- | --- | --- | --- |
| _NN_ | _YYYY-MM-DD_ | _what the Adversary should surface that baseline wouldn't_ | _filled after the run_ | | |

---

## 2. Arm B — Persistent-verifier MABP

Single varied factor: the verifier keeps context across iterations and chunks (vs baseline's fresh,
blind, stateless QA). Gate held fixed. Competing predictions are pre-registered per row.

| Chunk | Date | Stakeholder prediction | Counter-prediction watch (capture / G3-mask) | Outcome (caught / classified) | Capture signal? (severity drift down w/o fix) | G3-BLOCKER rate vs baseline | Extra cost (tokens · wall-clock) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _NN_ | _YYYY-MM-DD_ | _catches more/earlier; shallow-patch catches_ | _did it soften over v1→v4? did it stop flagging unspecified intent?_ | _filled after the run_ | _yes/no + evidence_ | _higher / same / lower_ | |

---

## 3. Dispositions (after N ≥ 5 per arm)

| Arm | N chunks | Net intent/conformance defects caught vs baseline | Capture observed? | Disposition | Rationale (one line, from the ledger) |
| --- | --- | --- | --- | --- | --- |
| A — Adversary | _pending_ | | n/a (issues no verdict) | _kept / killed / inconclusive_ | |
| B — Persistent verifier | _pending_ | | _yes / no_ | _kept / killed / inconclusive_ | |
| MHBP — cross-harness auditor (Gate 1) | _pending_ | | n/a (issues no verdict) | _kept / killed / inconclusive_ | |
| MHBP — cross-harness auditor (Gate 2) | _pending_ | | n/a (issues no verdict) | _kept / killed / inconclusive_ | |
| MHBP — build lanes (foreign tier marginal value, §4.3) | _pending_ | | n/a (issues no verdict) | _kept / killed / inconclusive_ | |

---

## 4. MHBP — cross-harness auditor (agy/Gemini)

Specced in `docs/MHBP_LAB.md`. A **foreign harness** (`agy`, pinned to a non-Claude model —
`Gemini 3.1 Pro (High)`) appears in **three layers**: **Gate 1** (hard synchronous post-plan barrier,
§4.1), the **per-unit build lanes** (parallel autonomous, foreign on a sampled subset, §4.3), and
**Gate 2** (opt-in post-build whole-artifact audit, §4.2). The headline metric is **correlated-error
catches**: real defects all-Claude review missed. Decorrelation requirement: a row run with agy on a
Claude model is **void** — note the model used per row.

Defect classification for the Classified column: `real` (substantive defect) · `false-divergence`
(model-quirk/style, not a defect) · `noise` (false alarm). Correlated-error catches = the subset of
`real` that _both_ Claude verifiers (or the human review) missed. For the build lanes (§4.3), attribute
each catch to the tier that found it (`own` vs `foreign`) via the lane file's `AUDITOR:` field, so the
foreign tier's *marginal* value over the own-harness peer is isolated.

### 4.1 Gate 1 — post-plan audit (intent / plan)

What it should catch that baseline misses: **wrong-thing** at plan time, before expensive build.
How it could fail: noise, false divergence (counter-predictions §5a/§5b).

| Run | Date | Model used | Prediction (pre-registered) | Findings raised | Classified (real / false-divergence / noise) | Correlated-error catches | Build cost prevented? | Cost (wall-clock · provider) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| _tag_ | _YYYY-MM-DD_ | _Gemini 3.1 Pro (High)_ | _what agy should surface about the plan that baseline wouldn't_ | _filled after_ | | | | |

### 4.2 Gate 2 — post-build audit (completeness + accuracy)

What it should catch that baseline misses: **silent incompleteness/inaccuracy** of the whole build.
How it could fail: manifest blind spot (§5d), noise, capability floor (§5c).

| Run | Date | Model used | Manifest source (mechanical?) | Prediction (pre-registered) | Findings raised | Classified (real / false-divergence / noise) | Correlated-error catches | Cost (wall-clock · provider) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| _tag_ | _YYYY-MM-DD_ | _Gemini 3.1 Pro (High)_ | _e.g. git diff --name-only <range> + cited specs_ | _what agy should surface about the build that baseline wouldn't_ | _filled after_ | | | |

### 4.3 Build lanes — per-unit parallel audit (own + foreign tiers)

Specced in `docs/MHBP_LAB.md` §5–§7. Each unit (chunk/CR) runs in a lane; every lane gets an `own`-harness
Claude peer, a sampled/risk-flagged subset *also* gets the `foreign` agy audit, and the `AUDITOR:` field
records which tier ruled. Headline: correlated-error catches **attributable to the foreign tier** (its
marginal value over the own peer). Watch counter-predictions MHBP §8e (coordination failure: stranded
lanes / cap starvation / stale-round race) and §8f (autonomy rubber-stamp: auto-advanced lanes a later
human sample audit reversed). Decorrelation: a `foreign` row run with agy on a Claude model is **void**.

| Unit | Date | Auditor tier(s) ruled | Foreign model (if any) | Prediction (pre-registered) | Findings raised | Classified (real / false-div / noise) | Correlated-error catches (own / foreign) | Lanes in flight at submit | Parked / escalated? | Cost (tokens · wall-clock · provider) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| _CHnn_ | _YYYY-MM-DD_ | _own \| own+foreign \| +human_ | _Gemini 3.1 Pro (High) \| n/a_ | _what the foreign tier should catch on this lane that the own peer wouldn't_ | _filled after_ | | _own: _ / _foreign: _ | | _no \| parked: reason_ | |
