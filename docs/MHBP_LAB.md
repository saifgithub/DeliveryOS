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

> **On test, not assumed.** Run 1 (§8) — a **single run, N = 1, which is not evidence** (§6 wants
> N ≥ 5) — happened to cut *against* this thesis: that one time, the catches came from a blind
> *same-harness* pass while the foreign harness was confidently wrong, suggesting the active
> ingredient may be **context-blindness rather than model-family diversity**. That is a hypothesis the
> run *raised*, not a result it *proved*. The thesis is neither confirmed nor refuted — it stays the
> question under test until the evidence at N ≥ 5 speaks.

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
- **Fallback auditor when the foreign harness is unavailable (normative — the one authorized exception
  to the rule above).** agy can be down: a `--print-timeout`, a pending re-login / auth, a provider
  error, or an empty reply (all seen in Run-1, where agy timed out pre-relogin). The gate does **not**
  silently skip. With **explicit human authorization** (as granted in Run-1), it **degrades to the
  blind same-harness auditor alone** — a fresh, no-build-memory Claude pass (an Opus sub-agent via the
  Agent tool) authoring from the *same manifest*. A Claude auditor here is **not "void"**; it is a
  logged **same-harness fallback**, distinct from running agy-on-Claude. Honesty requirements:
  - Stamp the run `auditor: blind same-harness (fallback)`, `foreign-harness: unavailable (<reason>)`,
    `decorrelation: N/A — same family` in `run.json` and `EXPERIMENT_LOG.md`.
  - It counts toward the **blind same-harness** tally, **never** the foreign-harness tally — the
    cross-harness premium is *not* exercised on a fallback run and must not be banked as cross-harness
    evidence. The foreign-harness slot for that target is logged `unavailable`, not `ran`.
  - Once the blocker clears (e.g. after re-login), **retry the foreign harness** under a fresh run-id
    if the audit still matters — so the cross-harness arm still gets its sample.
- **agy is agentic — read-only and tightly scoped (normative, Run-1).** `--add-dir <root>` scopes the
  workspace agy may read. Two hard rules learned in the field:
  - **Read-only.** agy *writes* as well as reads, and in Run-1 it **silently edited 4 files mid-audit**.
    An auditor must never apply changes. Run agy against a **throwaway git worktree** (or otherwise
    deny write scope); treat any diff it leaves as a *proposed patch to review*, never an applied one,
    and discard the worktree after.
  - **Scope to manifest roots, never the repo root.** Point `--add-dir` at the specific dirs the
    manifest names (e.g. `extension/src/memory`, `extension/test`, `contracts/src`), **not**
    `/<repo>` — the root drags in `node_modules` and makes the run grind for many minutes. (A run
    that "won't start" is usually this: agy buffers its whole reply and writes only at the end, so a
    too-broad scope killed early leaves a 0-byte file that *looks* like a startup failure.)
  - Blindness is controlled by what the architect lets it see — keep Gate 1 scoped to plan docs only.
- **Adversarial stance, baked in — but confidence ≠ accuracy (Run-1).** Every audit prompt tells agy
  to assume the artifact is incomplete/wrong until evidence proves otherwise (baseline §16.3 G4,
  across a harness boundary). **Caveat from the field:** a foreign harness's confidence is
  *uncorrelated with its accuracy* — in Run-1 agy was ruthless, specific, and **wrong on both its loud
  "critical" findings**. Its output therefore deserves *more* skepticism than a same-harness verifier's,
  not less, and G4 ("treat divergence as a defect") must not be applied to its claims without the
  empirical probe in §3.
- **Run it patiently in the background.** Set an explicit `--print-timeout` (minutes), expect a
  minutes-long agentic session, and do not kill it early — output lands only at completion.
- **Run isolation — concurrency-safe (two agents, one repo).** On a busy day two agents may run MHBP
  on the same repo — even the same target — at once. Nothing may be shared between runs:
  - **Unique run-id per invocation.** `<gate>-<tag>-<sha8>-<nonce>` (nonce = `openssl rand -hex 3`).
    Two runs never collide, even on the same tag. This is the only knob the architect must mint.
  - **Per-run directory, not flat files.** Everything for a run lives under
    `docs/build/auditor/runs/<run-id>/` (`manifest.md`, `foreign_audit.md`, `blind_audit.md`,
    `verdict.md`, `agy_stderr.log`, `run.json`). No two runs ever write the same path.
  - **Unique, pinned worktree.** `/tmp/mhbp-<run-id>`, added **detached at the captured HEAD sha** —
    so a *concurrent commit by the other agent* cannot shift the tree under this audit. Never the
    fixed `/tmp/mhbp-audit`. Removed on completion.
  - **Atomic publish.** agy writes `…/foreign_audit.md.partial`, then `mv` to `…/foreign_audit.md`.
    The final name appears only when the run completes, so the other agent (or the architect) never
    reads a half-written or empty report — *presence of the final file = done*.
  - **No concurrent writes to shared ledgers.** `EXPERIMENT_LOG.md` is updated **only** by the
    architect, post-adjudication, one run at a time — never by an auditor process and never by two
    agents at once. Each run's `run.json` is the machine-source; consolidation into the log is
    serialized by the human/architect.
  - **Optional soft-claim** (only if you want to avoid two agents redundantly auditing the *same*
    target): atomic `mkdir docs/build/auditor/locks/<tag>.lock` — `mkdir` fails if it exists; clear by
    mtime if stale. Duplicate audits are harmless, so this is opt-in, not required.

**Invocation form** (isolated run-id, read-only pinned worktree, scoped, atomic publish):

```bash
# 0. mint an isolated run identity (collision-safe across concurrent agents)
SHA8=$(git rev-parse --short=8 HEAD)
RUN_ID="gate2-${TAG}-${SHA8}-$(openssl rand -hex 3)"
RUN_DIR="docs/build/auditor/runs/${RUN_ID}"; mkdir -p "$RUN_DIR"
WT="/tmp/mhbp-${RUN_ID}"

# 1. isolate: audit a throwaway worktree pinned to the captured sha (immune to concurrent commits)
git worktree add --detach "$WT" "$SHA8"

# 2. run agy scoped to the manifest's roots only (never the repo root); publish atomically
~/.local/bin/agy --model "Gemini 3.1 Pro (High)" --print-timeout 9m \
  --add-dir "$WT/<root-1>" [--add-dir "$WT/<root-2>" ...] \
  -p "$(cat "$RUN_DIR/manifest.md")" \
  > "$RUN_DIR/foreign_audit.md.partial" 2> "$RUN_DIR/agy_stderr.log" \
  && mv "$RUN_DIR/foreign_audit.md.partial" "$RUN_DIR/foreign_audit.md"

# 3. quarantine + cleanup: any diff agy left is a proposed patch, never applied; drop the worktree
git -C "$WT" status --short            # expect clean; investigate + discard if not
git worktree remove --force "$WT"
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
- **Output.** `docs/build/auditor/runs/<run-id>/plan_audit.md` (run-id = `gate1-<tag>-<sha8>-<nonce>`,
  see §1 run isolation), each finding tagged `blocking` / `question` / `noted`.
- **Adjudication (human-in-loop).** Planning has a human in the loop, so the **architect works *with*
  the human** on post-analysis of agy's report: revise the plan, accept as-is, or record a dated
  rebuttal. agy issues no binding verdict — its job is done when the doubt is on the table.

---

## 3. Gate 2 — post-build adversarial audit (optional, completeness + accuracy)

- **When.** The architect declares the build complete. Opt-in; this is the common case.
- **The manifest.** The architect writes `docs/build/auditor/runs/<run-id>/manifest.md` (run-id =
  `gate2-<tag>-<sha8>-<nonce>`, see §1 run isolation) — pointers to **every file used and touched**
  during the build: specs consumed, source and tests written, the delivery surfaces (§16.5), and the
  plan/PRD sections that defined "done."
  - **Declare known gaps explicitly (Run-1).** List what is *untested* or *partial* in the manifest
    itself. In Run-1 the manifest pre-declared one API route as untested — and that admitted gap is
    exactly where a real blocker hid. Honesty in the manifest aims the auditor at the soft spots.
  - **Built mechanically, and its blind spot logged (Run-1).** Build it from the touched-files record
    (`git diff --name-only <range>` / `git log --grep <tag>`), not from memory. It is only as good as
    commit-message tagging — a change committed under a mis-tagged message is **invisible** to it.
    Record how each run's manifest was assembled so the blind spot is on the record.
- **What agy audits** (scoped via `--add-dir` to the repo roots the manifest names):
  - **Completeness** — is everything the plan specced actually built *and* tested? Any criterion with
    no corresponding code/test? Any delivery surface unexercised?
  - **Accuracy** — does what shipped match intent? Any silent gap, dead end, stubbed path, or drift
    from the spec the conformance gate would not catch because the spec itself was read wrong?
- **Pair it with a blind same-harness auditor (Run-1).** Run a *second* auditor on the same manifest
  — a fresh, blind-context Claude pass (e.g. an Opus sub-agent that shares no memory with the build).
  In Run-1 the foreign harness scored 0/2 on its loud findings while the blind same-harness pass scored
  2/2 — the real catches came from **context-blindness, not model-family diversity**. Until that
  inverts back over the sample (see §8), the foreign harness is run *alongside*, not instead of, a
  blind same-harness auditor. **If the foreign harness is unavailable**, the blind same-harness pass
  runs alone as the authorized fallback (§1) — the gate degrades, it does not skip.
- **Output.** `docs/build/auditor/runs/<run-id>/foreign_audit.md` (and `blind_audit.md` for the paired
  same-harness pass), severity-tagged as above. Atomic-published per §1 — readers see it only when
  complete.
- **Probe before you route (normative, Run-1).** The architect runs an **empirical probe for every
  `blocking` infrastructure / DB / adapter / DDL claim before routing it** — a real check, not a
  re-read. In Run-1 both foreign-harness false positives were only dismissable by probes (`to_regclass`
  for a "cross-tenant leak" on a table that *doesn't exist*; a live `Promise.all`-over-transaction run
  that *succeeded* against the actual adapter). Code-reading alone left doubt, and G4 would have sent
  the adjudicator chasing two non-bugs. No `blocking` infra claim is routed on reading alone.
- **Routing.** After probing, the architect routes surviving findings into the baseline's existing
  paths: fix-loop, a dated rebuttal in `BUILD_STATUS.md`, or escalation to the human. **agy never
  touches `npm run gate`** — the non-agentic gate (§16.2/§16.4) stays the machine-run binding floor;
  agy is advisory foreign signal layered on top.
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
- **Counter-predictions (to test, not assume).** Tags below note where a *single* Run-1 data point
  landed — **one run is not evidence** (§6 wants N ≥ 5); read these as "observed once," not "shown."
  - **(a) Noise.** Gemini false-alarms at a rate that drowns the signal — a chatty foreign critic
    that cries wolf has real adjudication cost.
  - **(b) False divergence — observed once (Run-1).** Both of the foreign harness's loud "critical"
    findings were false that run (0/2 adjudicated true). A different harness disagreeing is not the
    same as a defect found; worse, it was *confidently* wrong (see §1 caveat, §8). N = 1.
  - **(c) Capability floor — observed once (Run-1).** That run, the real catches came from the blind
    same-harness pass, not agy. Pending more runs, treat the foreign harness as *additive insurance*,
    never a replacement — but its capability is not yet measured, only sampled once.
  - **(d) Manifest blind spot.** Gate 2 sees only what the manifest lists; an omitted file hides its
    own gap. Pre-register how each run's manifest was built (mechanical, not from memory).
  - **(e) Headline inversion — a hypothesis Run-1 raised, not proved.** The active ingredient *might*
    be *fresh adversarial pass + context-blindness* rather than model-family diversity. One run can
    only raise this; it cannot settle it. The thesis above is on test — see §8.

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
5. **Weight by adjudicated-true rate, not confidence (Run-1).** Track, per auditor over time, the
   fraction of its findings that survive adjudication — and weight its future output by that rate, not
   by its self-assigned severity/confidence tag (which Run-1 showed is uncorrelated with truth). Run
   the foreign harness *and* a blind same-harness auditor each run, and tally them separately
   (Run-1 tally: foreign 0/2 blocking true; blind same-harness 2/2). Revisit emphasis at N ≥ 5.
6. **Disposition.** After N runs, a one-line **kept / killed / inconclusive** call grounded in the
   ledger. **Gate 2 itself is so far KEPT** — Run-1 caught two cutover-breaking defects the inner
   reviews and the mechanical gate structurally could not see. The open question is *which auditor*
   earns its place: foreign-harness vs blind same-harness. Kept only if it yields correlated-error
   catches *without* unmanageable false-divergence/noise (a/b) — and always framed as additive (c).

---

## 7. Out of scope (for now, deliberately)

- **No helper script yet.** Gates start as manual file passing (the architect runs agy by hand); a
  wrapper script is an optimization to earn *after* the gates prove their worth (mirrors MABP_LAB §4).
- **agy never replaces Claude QA** and **never enters the non-agentic gate** — it is additive foreign
  signal, not part of the binding mechanical floor.
- **No edits to the baseline** (`docs/MULTI_AGENT_BUILD_PROCESS.md`) or the `sm-mabp-*` skills.
  Promotion of a proven gate into the baseline is a separate, later step.
- **Authoring the ultracode build workflow** (§4) is its own task, validated separately.

---

## 8. Field notes — Run 1 (edgenta_OKR, CR-039 RLS)

First live Gate-2 run, dogfooded on a different project. Full report:
`/Volumes/Extreme Pro/edgenta_OKR/docs/build/auditor/MHBP_GATE2_FEEDBACK.md`. One run is not evidence
(§6 wants N ≥ 5) — these are early signals that have already been folded into §1, §3, §5, §6 above.

- **Gate 2 earned its place.** A whole-artifact pass *after* the build caught two real,
  cutover-breaking blockers (a tenant-context fail-closed on `delegations/[id]` and `action-items/export`)
  that the per-batch reviews **and** the mechanical gate (906 mocked tests + a static read-leak gate)
  structurally could not see — exactly the silent-incompleteness residual the thesis names.
- **The headline inverted.** Two auditors ran (agy/Gemini foreign + a blind same-harness Opus
  fallback). The real catches came from the **blind same-harness pass (2/2)**; the **foreign harness
  was confidently wrong on both its loud findings (0/2)** — a non-existent table it never checked for
  existence, and a transaction-crash claim a live probe disproved. **The decorrelation that paid off
  was context-blindness, not model diversity.** Whether that holds is the central open question.
- **Three process fixes adopted** (now normative above): run agy **read-only / in a worktree** (it
  silently edited 4 files); **probe every blocking infra/DB claim** before routing (reading was
  insufficient); **pair the foreign harness with a blind same-harness auditor** and weight each by its
  adjudicated-true rate, not its confidence.
- **Net:** *Run it; don't trust it.* Gate 2 stays; the foreign-harness-specific premium is unproven
  and, this run, negative.
