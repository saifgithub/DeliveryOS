# DeliveryOS — P-track Backlog

Items the P-track owns or flags. Rough priority ordering within each status tier.
Add items here; use `/start-fresh P` to pick them up in a session.

---

## Open

| ID | Item | Priority | Notes |
| --- | --- | --- | --- |
| B-001 | Cast DeliveryOS into the DeliveryOS structure | 🔴 High | Use the tool to manage itself — true dogfood run. See § B-001 below. |
| B-002 | Reverse engineer: code → documentation (brownfield onboarding) | 🔴 High | Infer Intent + PRD + Requirements from existing codebase so DOS can manage future deliveries. See § B-002 below. |
| B-003 | Agent team delivery — cost-optimised multi-tier orchestration | 🟡 Medium | Make the three-tier agent pattern a first-class DOS delivery mode: Haiku for routine work, Sonnet for implementation, Opus on failure only. See § B-003 below. |

---

## In progress

_Nothing in flight._

---

## Done

_Nothing closed yet._

---

## § B-001 — Cast DeliveryOS into the DeliveryOS structure

**What:** Run DeliveryOS development through the DeliveryOS SDLC workflow — use the extension to manage its own v0.2 (or next-feature) work from raw idea through verified release.

**Why:** The dogfooding claim in `docs/essay/meta-harness.md` is currently partial — the BUILD-PLAN + chunk specs were produced by the O/R/P multi-track session model, not by the extension UI itself. Closing the loop means the next feature cycle runs through the full in-extension workflow: raw idea → discovery → PRD → requirements catalogue → test spec → execution brief → harness run → result capture → diff → verification → release evidence.

**Pre-conditions:**
- v0.1.0 tagged and published (screenshots + video done, `git push`, GitHub release live).
- Extension installed from the published `.vsix` (not from source) into VS Code.

**Steps (one-time setup):**
1. Open this repo (`/Volumes/Extreme Pro/DeliveryOS`) in VS Code with the published extension active.
2. Run **DeliveryOS: Create Project** → name it "DeliveryOS".
3. Confirm `.deliveryos/memory.sqlite` initialises at the repo root.
4. Open the **Raw idea** panel — paste the v0.2 (or next-feature) raw intent.
5. Run the discovery interview; paste answers.
6. Generate PRD draft; iterate in the PRD editor.
7. Decompose PRD into requirements catalogue.
8. Run Test Designer for each requirement.
9. Compose an Execution Brief for the first requirement.
10. Select a harness profile (Claude Code); click **Run with Claude Code**.
11. Let Claude Code implement; capture result via the Result Capture panel.
12. Run the Allowed/Forbidden diff; check the diff-results panel.
13. Run Verification; complete the Memory Update gate; export Release Evidence.
14. Note: what broke, what was confusing, what was missing — these become b-track bugs or v0.3 requirements.

**Success signal:** at least one requirement implemented and verified with release evidence exported — all via the extension UI, not the command line.

**Session tag when picked up:** DOS:P5 (or a dedicated R-track session if implementation work is needed).

---

## § B-002 — Reverse engineer: code → documentation (brownfield onboarding)

**What:** A new DeliveryOS command — **Reverse Engineer Project** — that reads an existing codebase and synthesises the DeliveryOS documentation layer from the code outward: inferred Intent Memory, draft PRD, requirements catalogue, and codebase memory entry. Once populated, the project can continue forward through the normal DOS delivery cycle.

**Why:** DOS's natural direction is greenfield — idea → doc → code. But most real projects already have code and no structured documentation. Without a way to bootstrap the doc layer from code, DOS is inaccessible to brownfield teams. This feature makes DOS usable on any existing codebase, not just new ones started inside DOS.

The target case: a developer has a working app (like the Bug Triage backend in `examples/bug-triage/`), opens it in VS Code, runs **Reverse Engineer Project**, and within one session has a populated memory store they can immediately build from — adding new features the DOS way without rewriting history.

**Key design questions to resolve (for the O-track spec):**

1. **What does the AI read?** Candidate inputs: directory tree, README, existing docs, `git log --oneline`, key source files (entry points, models, routes), package manifests. Probably a two-pass approach: lightweight scan first (tree + README + manifests) to produce a draft; user can expand with specific files.

2. **What does it produce?** Minimum viable output:
   - `intent` memory row — `rawIdea` inferred from README/purpose + `discovery` partial (what it does, key constraints, tech stack)
   - `requirement` rows with `payload.kind = 'prd'` — PRD sections inferred from existing features
   - `requirement` rows (REQ-NNN) for each identifiable existing feature / module boundary
   - `codebase` memory row — folder structure, test runner, lint, conventions

3. **User review gate.** Nothing should be written to the memory store without the user reviewing and approving the inferred artifacts. The UI should present each inferred artifact as an editable draft before committing.

4. **Confidence signalling.** The AI cannot always infer intent reliably from code alone. Inferred fields should carry a `confidence` indicator (`high / low / inferred`) so the user knows what to scrutinise. Low-confidence fields should be pre-highlighted for editing.

5. **Existing `.deliveryos/` handling.** If a `.deliveryos/` memory store already exists for this project, the command should either (a) refuse + surface the existing data, or (b) offer a merge/supplement mode. No silent overwrites.

6. **Scope boundary.** Reverse engineering produces the doc layer only — it does NOT write code, does NOT generate test specs automatically, does NOT create execution briefs. Those remain user-driven after the doc layer exists. The goal is to get to the state equivalent to "PRD approved, requirements catalogued" so the next step is running Test Designer on each requirement.

**Rough implementation surface:**

- New command: `deliveryos.reverseEngineer` (contributes to the activity bar, gated on no existing `intent` row)
- New webview panel: `reverse-engineer/` — multi-step wizard (scan → review intent → review PRD → review requirements → review codebase memory → commit)
- Host-side: a `reverseEngineerPanel.ts` + `reverseEngineerHandlers` that orchestrate the AI inference pass, manage the draft state, and write to the memory store on user confirmation
- Contracts: new `contracts/src/reverseEngineer.ts` message types
- The inference prompt must be designed carefully — it will be the highest-stakes prompt in the system (wrong inferences here poison the entire downstream cycle)

**Relationship to B-001:** B-001 (dogfood DOS on DOS) exercises the forward path. B-002 is what makes DOS applicable to every project that already has code. These are complementary, not sequential — B-002 can be specced and built independently of B-001's outcome.

**Success signal:** Open `examples/bug-triage/` (which has real code but no `.deliveryos/` store) in VS Code, run **Reverse Engineer Project**, approve the inferred artifacts, and confirm that the resulting memory store is coherent enough to immediately compose an Execution Brief for a new requirement — without having done discovery from scratch.

**Session tag when picked up:** DOS:O6 for spec, then DOS:R18 for implementation.

---

## § B-003 — Agent team delivery: cost-optimised multi-tier orchestration

**What:** Promote the three-tier lean orchestration pattern used to build DOS itself into a first-class delivery mode inside the tool. Instead of one agent running the full Execution Brief, DOS orchestrates a team — assigning the cheapest capable model to each tier and escalating only on objective failure.

**Why:** The DOS build proved this pattern works: five consecutive chunks delivered without a single Advisor escalation. The cost advantage is real — Haiku is ~20× cheaper than Opus per token, Sonnet ~5×. A delivery that currently costs $X running a single Opus agent could cost a fraction of that with a Haiku planner + Sonnet implementer + Opus escalation path. DOS should give every project access to this discipline, not just sessions where someone manually applies it.

The principle is: **use the lowest-cost model that can do the job at each tier.** Escalate up the cost ladder only when the tier below fails an objective criterion.

**Proposed three-tier model:**

| Tier | Role | Default model | Trigger |
| --- | --- | --- | --- |
| 1 — Planner | Reads codebase + brief; produces a scoped implementation plan; identifies risky files | Haiku | Always runs first |
| 2 — Implementer | Receives plan; writes code; runs tests; commits | Sonnet | Runs after Planner succeeds |
| 3 — Advisor | Diagnoses failures; produces a corrected brief or targeted patch | Opus | Spawned only on objective failure (test regression, typecheck error, build failure) |

**Objective failure criteria (hard gates — not user-tunable):**

- Test count regresses vs baseline captured before the run
- `npm run typecheck` exits non-zero
- `npm run build` exits non-zero
- Diff panel reports a forbidden-file write

**Key design questions to resolve (for the O-track spec):**

1. **Where does model selection live?** Options: (a) a new field on the harness profile (`agent_team: { planner: 'haiku', implementer: 'sonnet', advisor: 'opus' }`); (b) a separate "team profile" concept layered above the harness profile; (c) a per-brief override in the Execution Brief composer. The harness profile extension is cleanest — it keeps model config co-located with CLI config.

2. **How does DOS invoke each tier?** The Execution Brief currently just generates a brief file that Claude Code reads. Agent-team mode requires DOS to invoke tiers sequentially and inspect results between tiers. This implies a more active orchestration role for DOS — closer to spawning `claude --model haiku` for the Planner, reading its output, then spawning `claude --model sonnet` for the Implementer with the plan prepended to the brief.

3. **What does the Planner produce?** A structured plan that the Implementer receives. Candidates: (a) a scoped file list + pseudocode; (b) a reduced brief with only the files the Planner decided are in scope; (c) a natural-language "implementation steps" block prepended to the original brief. Option (c) is lowest-risk — it doesn't require changing the brief schema.

4. **Failure path.** When the Implementer fails an objective criterion, DOS must: capture the failure output, compose an escalation brief for the Advisor, spawn the Advisor, and apply the Advisor's patch before re-running the objective criteria. The escalation brief should include the original brief + the failure output + the Implementer's diff so the Advisor has full context.

5. **Provenance in memory.** The result memory entry should record which tier produced the final commit (Implementer succeeded / Advisor patch applied) and the model used. This is audit evidence — a future Release Evidence export should surface whether Opus was needed.

6. **User control surface.** The user should be able to: (a) select team mode vs single-agent mode per delivery; (b) override the default model at each tier; (c) set a cost cap (estimated token budget) that DOS enforces before spawning the Advisor. Cost cap is a hard stop, not a soft warning.

7. **Relationship to existing harness profiles.** Claude Code is the only profile that currently supports programmable subagent invocation. Codex may not support this pattern. Team mode should be gated on the harness profile declaring `supports_agent_team: true`.

**Rough implementation surface:**

- Harness profile schema extended: `agent_team` block (optional; presence enables team mode)
- New `AgentTeamOrchestrator` module in `extension/src/agentTeam/` — owns the tier-sequencing state machine, failure detection, escalation brief composition
- Brief Composer gets a "Team mode" toggle in the profile rail (visible only when the selected profile supports it)
- Result Capture panel extended to show which tier produced the result + escalation history
- New `contracts/src/agentTeam.ts` for the tier-result message types

**Relationship to B-001 and B-002:** B-001 exercises the forward path manually. B-003 automates the orchestration pattern B-001 uses. Once B-001 proves the dogfood loop works, B-003 is the natural next capability upgrade — the user gets cost discipline without having to run P-track sessions manually for every delivery.

**Success signal:** Deliver one DOS requirement (from the B-001 dogfood run) using team mode. Confirm Haiku+Sonnet complete the delivery without Advisor escalation. Then deliberately inject a bug and confirm Opus is spawned, fixes it, and the escalation is recorded in the result memory.

**Session tag when picked up:** DOS:O6 or DOS:O7 for spec (can be co-specced with B-002), then DOS:R18 or DOS:R19 for implementation.
