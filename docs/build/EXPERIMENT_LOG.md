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
| MHBP — per-chunk serial loop (foreign tier marginal value, §4.3) | _pending_ | | n/a (issues no verdict) | _kept / killed / inconclusive_ | |
| MHBP — per-module Tester (cross-chunk defects, §9g) | _pending_ | | n/a (advisory) | _kept / killed / inconclusive_ | |

---

## 4. MHBP — cross-harness auditor (agy/Kimi/local-endpoint)

Specced in `docs/MHBP_LAB.md`; the per-chunk loop's lane mechanism (§4.3) is now concrete in
`docs/build/auditor/PROTOCOL.md`. **Foreign tools** (`agy`→Gemini, Kimi CLI→Kimi, and the local
endpoints `ami-llm`/`GLM-5.3-Flash-NVFP4`, `MHBP_LAB.md` §1) appear at **Gate 1** (hard synchronous
post-plan barrier, §4.1), in the **serial per-chunk build→audit loop** (foreign on a risk-flagged /
sampled subset, §4.3), and at **Gate 2** (opt-in post-build whole-artifact audit, §4.2); a per-module
black-box **Tester** (`MHBP_LAB.md` §7) adds a fourth layer, scored in the dispositions (§3). The
headline metric is **correlated-error catches**: real defects all-Claude review missed. Decorrelation
requirement: a row run with a foreign tool on a Claude model is **void** — note the model used per row.

> **Run-1 (2026-06-23, N=1 — signal, not evidence; unscored).** The first MHBP dogfood. Not a scored row:
> it produced the process learnings now folded into `docs/MHBP_LAB.md` (serial loop, mandatory per-role
> watcher, read-only/isolated `agy`). Logged here so the ledger and the spec agree Run-1 happened; the
> tables below start at the first pre-registered run.

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

### 4.3 Per-chunk serial audit loop (own + foreign tiers)

Specced in `docs/MHBP_LAB.md` §5–§6. Chunks are audited **serially, one in flight at a time**; every
chunk gets an `own`-harness Claude peer, a risk-flagged / sampled subset also gets the `foreign` audit
(agy/Kimi/local-endpoint, `MHBP_LAB.md` §1), and the `AUDITOR:` field records which tier ruled — the
`MODEL:` field on the lane file records which foreign tool. Headline: correlated-error catches
**attributable to the foreign tier** (its marginal value over the own peer). Watch counter-predictions
MHBP §9e (handoff failure: a role's watcher not running / a stale-round race / a parked chunk holding the
line) and §9f (quota-fallback dilution: too many chunks fall back to the `own` Claude auditor for the
foreign tier to backstop correlated error). Decorrelation: a `foreign` row run with a foreign tool on a
Claude model is **void**.

| Unit | Date | Auditor tier(s) ruled | Foreign model (if any) | Prediction (pre-registered) | Findings raised | Classified (real / false-div / noise) | Correlated-error catches (own / foreign) | Round at submit | Watcher fired? | Parked / escalated? | Cost (tokens · wall-clock · provider) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| _CHnn_ | _YYYY-MM-DD_ | _own \| own+foreign \| +human_ | _Gemini 3.1 Pro (High) \| n/a_ | _what the foreign tier should catch on this chunk that the own peer wouldn't_ | _filled after_ | | own: / foreign: | _N_ | _yes / no_ | _no \| parked: reason_ | |
