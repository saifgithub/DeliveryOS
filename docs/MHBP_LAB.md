# MHBP Lab — foreign harnesses (Antigravity/agy · Gemini; Kimi CLI · Moonshot AI) and local-endpoint models as adversarial cross-harness auditors

> **Experimental. Non-normative.** The production process is `docs/MULTI_AGENT_BUILD_PROCESS.md` (v4),
> unchanged by this document. This file is a sibling to `docs/MABP_LAB.md` (Arms A/B, both *same-harness*
> Claude peers). It specs a different instrument: **foreign LLMs** — **Antigravity** (`agy`, Google's
> agentic harness, running Gemini), **Kimi CLI** (Moonshot AI's Kimi), and two local OpenAI-compatible
> endpoints (`ami-llm`, `GLM-5.3-Flash-NVFP4`, called directly by the architect rather than run as their
> own tool loop — §1.3) — bolted on as **adversarial auditors** at the two phase boundaries (after
> planning, after build) and in the per-chunk loop between them. Where this and the baseline appear to
> conflict, the baseline wins until evidence promotes this work.

> **Where this sits after 2026-09-01.** `orchestration/` is now the chassis (`CLAUDE.md`), and this
> lab's central variable has a home in it: decorrelation is `impl.family` on a roster entry, and
> capability is `BAND:` on a lane. That is the *same* claim this file makes — a model family, not a
> tool identity — expressed as roster/BINDINGS data instead of prose. This file stays the place the
> instrument is specified and its evidence recorded; the chassis is where a decorrelated auditor is
> actually configured. `AUDITOR: own | foreign | human` remains correct **here** and must not be
> ported into the chassis: those words are relative to whoever wrote them and invert on copy, which
> is exactly why the portable side records a family value instead.

**Created:** 2026-06-19. (Revision history is in git.)

---

## Invariants

Six load-bearing rules, stated once here; every section below relies on them without re-deriving.

1. **Decorrelation = the model family, not context.** The foreign auditor must run a non-Claude model —
   `agy` → `--model "Gemini 3.1 Pro (High)"`; Kimi CLI → its pinned Kimi model; the local endpoints →
   `ami-llm` (Qwen) / `GLM-5.3-Flash-NVFP4` (Zhipu). An audit run on a Claude model is **void** — same
   family again, regardless of which tool ran it. The foreign tool is *given* full project context
   (`CLAUDE.md` + this doc) for grounding; that does not void the run, because decorrelation comes from
   *whose* model reads the artifact, not from what it may see, and not from whether that model runs its
   own autonomous tool loop or is called directly by the architect (§1.3).
2. **`npm run gate` is the binding mechanical floor.** No auditor or Tester tier — `own`, `foreign`, or
   `human` — ever edits or runs it as its verdict. Every foreign signal here is **advisory**, layered on
   the unchanged baseline §16.2 / §16.4 gate.
3. **Serial — one chunk in flight at a time.** The next chunk does not start until the current is
   COMPLETE. The parallel-lanes attempt was the Run-1 failure; serializing dissolves the concurrent-write
   and stale-round hazards.
4. **A background watcher per role is mandatory.** Each role watches its inbound semaphore file and acts
   when the counterpart writes. No watcher = no handoff = stall — the Run-1 failure mode (§8).
5. **Separate-harness foreign tools run read-only / isolated.** Point `agy`/Kimi CLI at a throwaway
   worktree pinned to the build's HEAD; scope `--add-dir` to manifest roots only, never the live tree or
   repo root. (Run-1: an unscoped `agy` silently edited 4 files.) The local endpoints (§1.3) satisfy this
   *vacuously* — they have no file-editing tool at all — but the architect stays responsible for not
   pasting content beyond manifest scope into the prompt.
6. **Independent verification + pre-registration.** Each auditor re-reads changed source at file:line and
   runs a blind adversarial pass; predictions are pre-registered in `docs/build/EXPERIMENT_LOG.md` before
   each run, N ≥ 5 before any kept/killed call.

> **Run-1 (2026-06-23, N=1 — signal, not evidence)** is the source of invariants 3–5: it serialized the
> loop, mandated the per-role watcher, named the read-only/isolated `agy` scoping, and reversed an
> earlier "withhold context to decorrelate" stance (invariant 1).

---

## Workflow

The foreign tools appear in **three layers** around a serial build, plus a black-box **Tester**
(Part III) per module. A human is pulled in only at Gate 1, to adjudicate Tester defects, and to drain
escalations.

- **Gate 1 — HARD SYNCHRONOUS barrier at Design→Build (§2).** The build does not start until the plan
  audit is adjudicated; the one place a human may block, and it blocks *once*.
- **Part II — serial per-chunk build→audit loop (§5),** each chunk ruled by a pluggable auditor (§6):
  agy/Kimi/a local endpoint as the foreign / decorrelated tier, a Claude peer as the quota fallback, the
  human as async floor.
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
decorrelates the error same-harness triangulation cannot reach. **Kimi CLI (Kimi) and the local
endpoints (§1.3, Qwen/Zhipu) extend the same thesis** — each is its own distinct model family, so the
foreign tier isn't capped at one alternative lens. The foreign tier is applied where signal is highest —
plan-time, whole-build, risk-flagged chunks — because the residual is largely a whole-artifact question
and foreign audits cost a separate provider's quota (or, for the local endpoints, compute time on
hardware the architect doesn't otherwise pay quota for).

**The control:** `docs/MULTI_AGENT_BUILD_PROCESS.md` and the `sm-mabp-*` skills are not edited by this
work (invariant 2).

---

## 1. The harnesses — foreign auditor tools

### 1.1 Antigravity (agy)

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

### 1.2 Kimi CLI (Moonshot AI's Kimi)

- **Third model family**, separate process (invariant 1). Kimi's blind spots need not line up with
  Gemini's — a second foreign tool is decorrelation, not redundancy.
- **Semaphore handoff identical to §1.1** — no lane-file or `watcher.sh` change for a second tool.
- **Auto-loads `AGENTS.md`** (verified: an `AGENTS.md` marker returned from startup context, a
  `CLAUDE.md` one did not), unlike `agy` and unlike Claude. The auditor role can therefore be
  provisioned as a file in the worktree instead of a bootstrap turn — the portable-`AGENTS.md`
  convention `codex` already uses (`docs/architecture/harness-profiles.md`); `--agent-file <path.md>`
  is the explicit alternative.
- **Adversarial stance baked in** — same as §1.1.

**Binary pin.** Two different products on this machine. `PATH` (`~/.kimi-code/bin`) → **`kimi-code`
v0.39.1**, state `~/.kimi-code/` — documented here. Legacy **`kimi-cli` v1.43.0** ships inside the
"Kimi Code" VS Code extension (state `~/.kimi/`) with an incompatible flag set (`--work-dir`,
`--print`, `--afk`, `--config`) and separate stale credentials; `kimi-code migrate` exists for this.
A run must name which binary ruled — `harness_version_pin`, §11.

**Auth: OAuth, no API key.** `kimi login` (device-code) writes
`~/.kimi-code/credentials/kimi-code.json` and populates `config.toml` with
`[providers."managed:kimi-code"]` — `api_key = ""` plus an `oauth` block delegating to that store;
managed models refresh from the provider at startup. No key is needed and none should be created.
Aliases: `kimi-code/k3` (1,048,576 ctx, efforts low/high/max, `default_model`), `kimi-code/k3-256k`,
`kimi-code/kimi-for-coding` (K2.7 Coding, 262,144) + highspeed variant.

**Flags** (v0.39.1, verified): `--add-dir` (repeatable), `-m/--model`, `-p/--prompt` (one prompt,
non-interactive), `--output-format text|stream-json`, `--agent-file`/`--agent`, `--skills-dir`,
`-S/--session`, `-c/--continue`. **No `--work-dir`** — cwd is the session scope, so invariant 5
isolation comes from `cd` into the throwaway worktree plus `--add-dir`. `-p` is **mutually exclusive**
with `-y/--yolo` and `--auto`.

**Dry-run passed** (isolated copy, `kimi-code/k3`): read the target file via its own tools, returned an
accurate §6 summary, created and modified nothing — invariant 5 held.

```bash
cd <isolated-worktree>                     # no --work-dir; cwd IS the session scope
kimi --add-dir <manifest-root> -m kimi-code/k3 -p "<audit brief>"   # -y/--auto rejected with -p

# Auditor role travels as AGENTS.md in the worktree, or --agent-file.
# Exit echoes "kimi -r <session-id>" — log beside the semaphore write. The .partial → rename
# discipline (§1.1) is still unconfirmed for this tool (§11).
```

### 1.3 Local OpenAI-compatible endpoints (direct API call, not a separate harness)

Two local OpenAI-compatible chat-completions endpoints. Tool-calling-capable per their config, but
**no agentic front-end** here — no file-reading tool, no session, no watcher:

| Model id | Underlying model | Endpoint | Max input / output |
| --- | --- | --- | --- |
| `ami-llm` | `Qwen3.8-Flash-Next` (Alibaba) — served as a **community NVFP4 quant**, not an Alibaba-published build | `http://192.168.20.74:8000/v1/` | 245,760 / 16,000 |
| `LibertAIDAI/GLM-5.3-Flash-NVFP4` | `GLM-5.3-Flash` (Z.ai / Zhipu) — a **distinct 320B-A18B model, not a distill** of GLM-5.3 (744B-A40B); likewise a community NVFP4 quant | `http://100.94.223.38:8008/v1/` | 245,760 / 16,000 |

Distinct model families from Gemini/Kimi/Claude, so invariant 1 holds despite the different
integration shape.

**`own`/`foreign` tracks whose model reasons — not who holds the pen or runs the tool loop.** For
these endpoints:

1. The **architect (Claude) makes the API call** — `curl` or an HTTP tool to
   `<endpoint>/v1/chat/completions`. No process to launch or watch.
2. The architect **curates the prompt**, pasting the brief / scoped diff in, since the far side has no
   file-reading tool (contrast §1.1/§1.2, which read files themselves via `--add-dir`).
3. The architect **writes the semaphore file on the model's behalf**: `AUDITOR: foreign` plus
   `MODEL: <endpoint>` (§6 for why the tag stays flat).
4. The judgment is still the non-Claude model's — the run counts `foreign`, not `own`.

No watcher for this leg (§8): call and write are synchronous in the architect's own turn.

### 1.4 Capability tier — measured placement against baseline §15 (provisional)

Not an edit to `docs/MULTI_AGENT_BUILD_PROCESS.md` (invariant 2 — §15 stays provider-agnostic). A
lab-local mapping onto §15's tiers (Haiku=Economy · Sonnet=Standard · Opus=Premium). Retrieved
2026-09-01; **every figure is vendor self-reported unless marked `[indep]`**.

| Model | AA Intelligence Index¹ | DeepSWE v1.1 | Terminal-Bench 2.1 | SWE-bench Pro | LiveCodeBench v6 |
| --- | --- | --- | --- | --- | --- |
| `GLM-5.3-Flash` | 57 | 63.4 | 84.3 | — | — |
| `Qwen3.8-Flash-Next` (ami-llm) | 56 | 58.7 | — | 62.5 | 91.9 |
| `kimi-code/k3` | — | 67.5 | 88.3 | — | — |
| Claude Haiku 4.5 — §15's *Economy* anchor | — | — | 40.2 | — | — |
| Claude Sonnet 5 — §15's *Standard* anchor | — | — | 76.1 | 63.2 | — |
| Claude Opus 5 — §15's *Premium* anchor | 63 | — | 84.6 `[indep]` (81.3 adjusted) | — | — |

¹ Artificial Analysis Intelligence Index — the **only** cited source that holds model *and* harness
constant across vendors, and therefore the only column safe to compare down.

| Tool | Tier | Basis | Confidence |
| --- | --- | --- | --- |
| `ami-llm` (Qwen3.8-Flash-Next) | Standard, provisional | The **one clean head-to-head available**: SWE-bench Pro 62.5 vs Sonnet 5's 63.2 — same benchmark, near-tie | Moderate — single shared benchmark |
| `GLM-5.3-Flash-NVFP4` | Standard, provisional | Peer of ami-llm (AA 57 vs 56; trades wins by task). Its TB2.1 84.3 vs Sonnet 5's 76.1 is **cross-harness and therefore weak** — an 8.2-point gap against a known ±5.5-point harness swing | Moderate — inherited from its peer, not independently anchored |
| Kimi Code (`kimi-code/k3`) | Standard–Premium, provisional | Strongest of the three on both shared benchmarks (DeepSWE 67.5, TB2.1 88.3) and #1 on apex-agents (41 vs 37.1 for #2) | Low — no shared benchmark with any Claude anchor |

**The anchor comparison is unresolved.** AA — the only harness-controlled instrument here — has **no
Sonnet 5 or Haiku 4.5 entry**, so the one column safe to compare down cannot reach §15's Standard
anchor. It does establish a ceiling: both local models (57, 56) sit below Opus 5 (63), so neither is
Premium. These rows support *"the local pair are peers, in the Standard range, below Premium"* — not
*"each is Sonnet's equal."*

**Caveats, all four load-bearing:**

1. **Self-reported** — every HF row carries `verified: false`, sourced to the vendor's own card.
2. **Harness-dependent** — GLM-5.1 scores **69** on TB2.0 under Claude Code's scaffold vs **63.5**
   bare: a 5.5-point swing wider than the gap between our two local models. Tier is model **+
   harness**, and §1.1–§1.3 are three different harnesses.
3. **We run community NVFP4 quants**, not the official builds these scores describe (§1.3).
4. **Cross-vendor comparison is invalid** — each vendor uses its own harness and effort setting. The
   anchor ladder is itself incoherent on SWE-bench Verified: Haiku 4.5 (73.3) above Sonnet 5 (72.7),
   no Opus 5 figure published.

This table is the **prior**, not the verdict. §9(h) — per-tool `real`/`false-divergence`/`noise` rates
on our own chunks — settles it, being the only measurement of this model, quant, harness, codebase.

---

## 2. Gate 1 — post-plan audit (the HARD Design→Build barrier)

- **When.** After planning produces chunk specs + `READY.md`, before the build. A wrong decomposition
  poisons every chunk downstream, so this boundary cannot be made async: **the build is parked until the
  gate is adjudicated.**
- **Input.** The plan only — cited PRD sections, `docs/planning/READY.md`, `docs/planning/chunks/*`.
  Scope `agy`/Kimi CLI with `--add-dir docs/planning` (no source), from a read-only copy; for the local
  endpoints (§1.3) the architect pastes only `docs/planning` content into the prompt, nothing else.
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
- **What the auditor audits** (scoped via `--add-dir` to manifest roots for `agy`/Kimi CLI, read-only
  copy; for the local endpoints, the architect pastes only manifest-scoped content into the prompt):
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
forward, with the manual cycle as fallback. The two Gate 1/Gate 2 audits are **harness-agnostic**: they
wrap *whichever* build produced the artifact, operating on the plan and the touched-files manifest, not
the build's internals. Design: `docs/ULTRACODE_WORKFLOW_DESIGN.md` (see that doc's own note on why a
foreign tool can't plug into a Workflow phase directly). Authoring / validating the runnable workflow
from that design is a separate follow-up (§11).

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
- **`foreign` — any non-Claude tool from §1** (Antigravity/`agy`/Gemini, Kimi CLI/Kimi, or a local
  endpoint/§1.3), via the semaphore handoff (or, for §1.3, the architect writing on the model's behalf).
  The decorrelation tier (invariant 1), applied to risk-flagged / high-blast-radius chunks, cross-chunk
  seams, plus a random sample for the correlated-error backstop.

  **Sampling is a cost constraint, not a design principle, and it does not bind the local endpoints.**
  The subset-plus-sample rule exists because `agy` and Kimi spend a provider's quota per call. Both
  local endpoints benchmark Standard (§1.4) on local compute only, so:

  - **A local endpoint audits every chunk** — GLM-5.3-Flash first, ami-llm the equal-tier alternate,
    not a fallback.
  - **Both run on high-blast-radius chunks.** Different families (Zhipu / Alibaba) buy a second
    decorrelated lens at zero marginal cost. They differ by *task shape*, not strength (§1.4), so
    disagreement between them is signal about the chunk, not noise about the models.
  - **`agy`/Kimi stay reserved** for risk-flagged chunks, seams, and the correlated-error sample,
    where a third and fourth family buy decorrelation the local pair cannot.
- **`human` — the async floor.** Resolves the escalation queue and borderline parks (§8).

**One flat `foreign` tag, not per-tool sub-tags.** `AUDITOR:` stays `own | foreign | human`; a new
`MODEL:` line records which foreign tool ran (`MODEL: Gemini 3.1 Pro (High)`, `MODEL: kimi-code/k3`,
`MODEL: ami-llm`). Why flat: invariant 1 defines decorrelation by *model family*, not tool identity;
`AUDITOR:` is parsed by exact string in the portable kernel (`PROTOCOL.md` §5.8) and propagated
byte-identical downstream, so widening it is kernel churn for a project-local detail; and §9/§10's
headline metric is computed over the tier, so a flat scheme absorbs a 4th tool where sub-tags would
not. `EXPERIMENT_LOG.md`'s "Foreign model (if any)" column already holds this — a values change, not
a schema change.

**Quota fallback (Run-1, expected).** When the foreign tool is unavailable (quota / outage / endpoint
unreachable), an authorized Claude same-harness blind pass takes the chunk so the serial run never stalls.
Log it `AUDITOR: own (foreign unavailable — quota)`; the foreign tier stays "unavailable" for that chunk
and earns **no foreign catch** (invariant 1 — same family). Liveness without inflating the foreign metric.

**Anchor (ergonomics, not a control) — differs per tool.** `agy` auto-loads nothing (§1.1), so the
architect bootstraps its role per session by having it read `CLAUDE.md` + this doc. **Kimi Code
auto-loads `AGENTS.md`** (§1.2, verified), so its auditor role can be provisioned as a file in the
isolated worktree instead — no bootstrap turn needed. The local endpoints (§1.3) have no anchor step at
all; the architect pastes context into the prompt each time. A provisioned harness profile per foreign
tool (`GEMINI.md` for agy, portable `AGENTS.md` for Kimi) via the managed-block convention
(`docs/architecture/harness-profiles.md`; `extension/src/profiles/registry.ts`) would formalize this —
see §11. An ergonomics upgrade, not a correctness requirement.

Trust invariants for this section are §0.2 and §0.6; the foreign tier is **additive insurance**, never a
replacement verifier (counter-prediction §9c).

---

## 7. The Tester — per-module black-box user-acceptance loop (Part III)

**What it is.** A third role: a **black-box Tester representing the user**. The auditor reviews a
*chunk* white-box; the Tester exercises a *completed module* through its **exposed delivery surfaces**
(§16.5) only. It hunts the residual neither the per-chunk audit nor the conformance gate reaches —
**cross-chunk interactions that emerge only when several chunks ship together** (baseline §10).

**Unit = the module / CR.** A module is a cohesive group of chunks delivering one user-facing
capability. §5 drives every chunk to COMPLETE first; only then does the Tester run against the
assembled module.

**Stance — black-box, user fidelity (a role definition, NOT a decorrelation control).**

- Tests come only from (a) intended user-facing behaviour (the PRD/spec sections delivered) and (b)
  exposed surfaces (§16.5: command/host handlers, webview UI, persisted artifacts on reload,
  activation, packaged VSIX).
- It **does not read source, tests, or builder reports to design a test** — a user has no such view.
  It MAY read code post-hoc to localize a confirmed defect to a chunk.
- Role fidelity, **not** the decorrelation mechanism (invariant 1 — that remains the model family).
  Code-blindness is a complementary independence.

**Two modes.**

1. **Exploratory.** Drive realistic journeys and adversarial edge cases against the surfaces — happy
   path, malformed input, empty/repeat/concurrent states, and the seams where one chunk's output feeds
   another. Every defect gets: surface · input · expected · observed · severity.
2. **Authored integration checks.** From spec + surfaces alone, author executable checks (exit 0/1,
   bound to a surface, asserting end-to-end behaviour across chunks) and run them. Advisory — never
   enters `npm run gate` (invariant 2).

**Harness — pluggable (own / foreign / human).**

- **`foreign` — any non-Claude tool from §1** (`agy`/Gemini, Kimi CLI/Kimi, or a local endpoint/§1.3).
  *Doubly* independent: different model family (invariant 1) **and** code-blind by role. Ideal for
  **authoring** black-box scenarios. None can drive a live editor, for two different reasons:
  `agy`/Kimi CLI run read-only/isolated (invariant 5); the local endpoints have no editing tool at all
  (§1.3). A foreign Tester contributes *test design* only, regardless of which tool ran it.
- **`own` — a Claude peer.** Has the tooling (`@vscode/test-electron`, sideload, surface exercise) to
  **execute** the module live. The default executing Tester, and the quota fallback (logged
  `own (foreign unavailable — quota)`, no foreign catch).
- **`human` — the async floor.** The literal user; adjudicates borderline "defect or intended?" calls.

Default: a **foreign** tier *designs* the decorrelated journeys/checks (`MODEL:` records which tool
authored a given round), a Claude **own** tier *executes* them live; on quota the Claude tier does both
(no foreign catch credited).

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

- **New semaphore: `docs/build/auditor/lanes/<MODULE>.tester.md`** (Tester-owned), mirroring §5:
  per-defect rows (surface · repro · expected · observed · severity), an `AUTHOR_TIER`/`EXEC_TIER`
  pair, **`TESTER: own | foreign | human`**, and **`VERDICT: ACCEPTED | DEFECTS (round N)`**.
- **Routing — to the builder via the architect.** Builders are stateless per-chunk fires, so on
  `DEFECTS` the architect routes each defect to the responsible chunk and re-fires it through §5
  (re-audited — the floor is never skipped), or raises a module-level fix / spec BLOCKER when the
  defect is an integration-design fault. A re-fired chunk must regress-pass its own criteria *and* the
  Tester must re-run the failed journeys before the verdict flips to `ACCEPTED`.
- **Watcher (mandatory, §8).** Tester watches the module-complete signal (all the module's chunks'
  `*.auditor.md` = COMPLETE); architect watches `<MODULE>.tester.md` (invariant 4).
- **Depth cap.** Mirroring baseline Cycle 6: at Tester round **`_v4`**, escalate to the human (iterate
  / redesign / re-plan / park) — unbounded test↔fix churn means the **module spec** is wrong, not the
  build.

**Distinct from the auditor (§6) — at a glance.**

| | Auditor (§5/§6) | Tester (§7) |
| --- | --- | --- |
| Unit | chunk | module / CR |
| View | white-box — re-reads source at file:line, reads the builder report | **black-box — exposed surfaces only; never reads code to design a test** |
| Represents | adversarial maintainer / verifier | **the user** |
| Fires | after each chunk is built | after **all** of a module's chunks are COMPLETE |
| Independence | model family (foreign agy/Kimi/local-endpoint) | model family **and** code-blindness (role fidelity) |
| Verdict | `COMPLETE / AWAITING_FIXES` (chunk) | `ACCEPTED / DEFECTS` (module) |
| Feeds back to | builder, same chunk | builder, the responsible chunk(s) / a module fix |
| Binding floor | `npm run gate` (per chunk) | unchanged — Tester is advisory, never enters the gate |

Every §0 invariant holds: the Tester never edits/runs `npm run gate`, verifies independently, and a
**foreign** Tester must be non-Claude or its foreign credit is void.

---

## 8. Notification & unattended operation — the mandatory watcher

During a run the human is **not** in the hand-off path, so for the serial loop to advance each role must
learn the other has written its semaphore file — the background watcher of invariant 4 is **required**,
not an option, for every *separate-harness* leg. Setup: (1) all separate-harness tools run with
auto-approval inside scoped directories (Claude Code auto-accept / scoped skip-permissions; `agy`/Kimi
CLI auto-confirm + read-only `--add-dir`); (2) each role launches its inbound-file watcher before the
exchange. **Local endpoints (§1.3) need no watcher and no auto-approval setup** — the architect calls
the endpoint and writes the semaphore file synchronously in its own turn, so there is no separate
process to watch or approve.

| Transport | How it wakes the counterpart | Portability | Notes |
| --- | --- | --- | --- |
| **Filesystem watcher** *(recommended local)* | a native watch on `lanes/` wakes the role on write | OS-specific; abstracted by chokidar / the VS Code API | **Reuse DeliveryOS's existing debounced, SHA-256-deduped `FileSystemWatcher`** on `.deliveryos-handoff/` — the MABP_LAB §1.3 primitive |
| **Poll / cron** *(portable floor — implemented)* | each role periodically re-reads `lanes/` + `INDEX.md` and acts if it is now its turn | Everywhere, no daemon | `docs/build/auditor/watcher.sh`; the Claude side can self-pace via `ScheduleWakeup` / `/loop` |
| **Git as the bus** *(durable substrate)* | semaphore files committed to the shared branch; a new commit is the signal; a `post-merge` hook or poll-on-fetch triggers | Anywhere git runs | the ledger **is** the git history — durable + auditable for free |
| **MCP message-bus** | a small server exposes turn primitives; both harnesses are MCP clients | **Gated**: needs MCP support on *both* harnesses + a running server | Cleanest semantics, heaviest ops; verify each foreign tool's MCP support first (n/a for the local endpoints — no separate harness to be a client, §1.3) |

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
  - **(a) Noise.** The foreign model false-alarms at a rate that drowns the signal — a chatty critic has
    real adjudication cost.
  - **(b) False divergence.** Divergences are model-quirk / stylistic preference, not substantive defects.
  - **(c) Capability floor.** The foreign tool misses things Claude catches — the gate is only ever
    additive insurance, never a replacement. Kept on that basis or not at all.
  - **(d) Manifest blind spot.** Gate 2 sees only what the manifest lists; an omitted file hides its own
    gap. Pre-register how each manifest was built (mechanical, not from memory).
  - **(e) Handoff failure (serial loop, §5/§8).** A role's watcher is not running or misses a write, an
    atomic-write race shows a half-file, or a parked chunk holds the line. Pre-register whether the watcher
    fired reliably and whether the loop *lost work or stalled*. (The Run-1 failure mode.)
  - **(f) Quota-fallback dilution — a hosted-tool risk only.** Quota exhaustion sends most chunks back
    to the Claude auditor (§6), leaving the foreign tier too thin to backstop correlated error. Binds
    `agy`/Kimi only; a local endpoint has no quota, failing only on outage. Pre-register the share
    audited per tool vs. fallen back to `own`; a *high* local share is the expected case, so a low one
    is a finding about the loop, not quota.
  - **(h) Benchmark tier may not transfer to audit quality.** §1.4's figures are vendor self-reported,
    off-harness, and unquantized — three gaps from what we run. If local findings classify `noise` /
    `false-divergence` at a materially higher rate than agy's or Kimi's, the **tier placement** failed,
    not the thesis; demote the tool. Converse is equally a finding: if they match the paid tools' catch
    rate, §6's quota-driven sampling was never necessary. Pre-register per-tool classification rates so
    the two are separable.
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
  prevented wasted build cost; extra cost (foreign-tool wall-clock — a separate CLI process for
  `agy`/Kimi, or a separate provider call for the local endpoints).
- **Per chunk (§5):** which **auditor tier** ruled (`own` / `foreign` / `human`, and whether `own` was a
  foreign-unavailable fallback), **which foreign tool/model** ran when `foreign` (via the new `MODEL:`
  field), whether the **watcher fired** (n/a for a local-endpoint leg, §8), any park/escalation, and the
  correlated-error catches **attributable to the foreign tier** (via the `AUDITOR:` field).
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
- **Run `agy`/Kimi CLI read-only / isolated** (invariant 5). Tooling to launch either against a
  throwaway worktree pinned to the build's HEAD and to scope `--add-dir` to manifest roots is a required
  enabler.
- **The Tester (§7) needs a live-module execution enabler.** A Claude `own` Tester drives the assembled
  module through its surfaces; a foreign Tester (agy/Kimi/local-endpoint) can only *design*. Wiring the
  design-vs-execute split, the `<MODULE>.tester.md` semaphore + watcher, and the module→chunk
  defect-routing is a required enabler. Advisory — never enters `npm run gate` (invariant 2).
- **No edits to the baseline** (`docs/MULTI_AGENT_BUILD_PROCESS.md`) or the `sm-mabp-*` skills. Promotion
  of a proven gate / loop into the baseline is a separate, later step.
- **Authoring the ultracode build workflow** (§4) is its own task, validated separately. Design is
  done (`docs/ULTRACODE_WORKFLOW_DESIGN.md`); the runnable script and its validation on a real chunk
  are what's left.
- **A Gemini/Antigravity harness profile** operationalizes the §6 per-session bootstrap. The registry
  (`extension/src/profiles/registry.ts`) ships only `claude-code` (`CLAUDE.md`) and `codex` (`AGENTS.md`)
  today; a `gemini`/`agy` profile (`instruction_file: GEMINI.md` or portable `AGENTS.md`,
  `command_template` per §1.1, `harness_version_pin` to the agy/Gemini CLI) would provision the auditor
  role once instead of bootstrapping each session. A product task, ergonomics only.
- **Same profile-registry deferral extends to Kimi Code and the local endpoints.** The registry ships
  only `claude-code`/`codex` today (explicit "MVP: two profiles only" comment in source); a `kimi`
  profile is now concretely specifiable — `instruction_file: AGENTS.md` (verified auto-loaded, §1.2, so
  it rides the same portable anchor as `codex`), a cwd-based `command_template` (no `--work-dir`), and
  `harness_version_pin` to `kimi-code` 0.39.x to keep it off the legacy `kimi-cli` line. The local
  endpoints (§1.3) are a
  different question — they aren't a harness a profile *launches* (no `command_template` makes sense for
  a bare API call), so whether they even fit `HarnessProfile`'s shape at all is an open question for that
  future follow-up, not answered here. No changes to `extension/src/profiles/*` in this pass.
- **Kimi Code is live; only the semaphore-write leg is unproven.** Auth (OAuth, no key), flags, model
  aliases, autonomous file reading, `AGENTS.md` anchor-loading, and read-only behaviour are all
  **verified by test** (§1.2). What remains before a real chunk/gate audit: (a) have it write
  `<UNIT>.auditor.md` with the `.partial` → rename discipline `agy` uses (§1.1) and confirm the
  architect's watcher never reads a half-file; (b) confirm it honours the adversarial auditor stance
  when that role is provisioned via `AGENTS.md`/`--agent-file` rather than a prompt preamble; (c) log
  which binary ruled — **`kimi-code` v0.39.1, not the legacy `kimi-cli` v1.43.0 also present on the
  machine** (§1.2), a `harness_version_pin` concern that would silently invalidate a run's flags and
  credentials if confused.
