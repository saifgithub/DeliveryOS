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
| B-004 | Session continuity — handover and start-fresh as a DOS-native concept | 🔴 High | DOS should manage its own session lifecycle: persist carry-overs, resume from last state, wrap completed work — without relying on external Claude Code skills. See § B-004 below. |
| B-005 | AI-driven elicitation — business analysis integrated across the SDLC | 🔴 High | The AI interrogates the human at every stage (not just discovery) to extract requirements, resolve ambiguity, and populate DOS artifacts. Replaces ad-hoc prompting with structured BA-style conversation flows. See § B-005 below. |

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

---

## § B-004 — Session continuity: handover and start-fresh as a DOS-native concept

**What:** Make session lifecycle management a first-class feature inside DOS. When you close the extension and return hours or days later, DOS should know exactly where you left off — what was in progress, what decisions were made, what the carry-overs are — and offer a structured resume path. Mirrors the `/handover` + `/start-fresh` skill pattern used to build DOS itself, but implemented natively in the extension rather than as external Claude Code skills.

**Why:** The DOS build relied heavily on session continuity. Each session wrap produced a structured handover document (commit count, test state, carry-overs, next-session name); each session open consumed it and resumed coherently. Without this, AI-assisted delivery degrades over time: agents lose context, work gets duplicated, decisions get re-litigated. DOS already stores memory — it should use that memory to manage its own session state, not just project artifacts.

**The core insight from building DOS:** context windows end. Work doesn't. The handover pattern bridges that gap without human overhead. DOS should do this automatically.

**What a native session lifecycle looks like:**

| Event | DOS action |
| --- | --- |
| User opens extension after a gap | Show "Resume last session" banner with carry-overs from previous wrap |
| User explicitly wraps a session | DOS records a Session Memory entry: what was completed, decisions made, carry-overs, next recommended action |
| User starts a new session | DOS reads the last Session Memory and pre-populates the activity bar with "In progress" and "Up next" indicators |
| Agent completes a delivery | DOS auto-generates a session snapshot (tests before/after, files changed, brief used) as a candidate wrap entry |

**New memory type: `session`**

A `session` memory row captures:

- `completedArtifacts[]` — list of memory entry IDs finalised this session (requirements approved, briefs locked, results captured)
- `decisions[]` — key design decisions made (freeform, user-editable before wrap)
- `carryOvers[]` — open items flagged for next session
- `testCountBefore` / `testCountAfter` — for development sessions
- `sessionTag` — user-visible label (e.g. `v0.2-S1`)
- `wrappedAt` — ISO timestamp

**Key design questions to resolve:**

1. **Wrap trigger.** Who decides when a session ends? Options: (a) explicit user action ("Wrap this session" button); (b) DOS detects idle + prompts; (c) auto-wrap when the extension closes. Option (a) is safest — a session wrap is a deliberate act, not a background save.

2. **Carry-over surfacing.** The "Resume" view should show carry-overs as actionable items, not just a list. Each carry-over should link directly to the artifact it refers to (a requirement, a brief, an open diff) so clicking it navigates the user to the right panel.

3. **Relationship to the existing memory graph.** Session Memory entries connect to the artifacts they touched via `links` — same graph structure as everything else. The memory walker (CHUNK-14) already handles cross-type traversal; sessions would be natural nodes in that graph.

4. **Multiple concurrent workstreams.** A single project may have parallel sessions (different features in flight). Session Memory must support tagging by workstream, not just by timestamp. This mirrors the O/R/P multi-track model.

5. **What the AI sees at resume.** When the user opens a session resume, DOS should prime the AI with the last Session Memory entry — giving it carry-overs, in-progress artifacts, and last decisions — before the user types anything. This is the `start-fresh` equivalent: structured priming, not a blank slate.

**Relationship to other items:** B-004 is load-bearing for B-003 (agent team delivery needs session state to track which tier is running and resume after interruption) and for B-005 (elicitation conversations need session context to avoid asking the same questions twice).

**Success signal:** Close the extension mid-way through a requirements decomposition session. Re-open it. DOS surfaces a "Resume" banner with the in-progress requirement and the carry-over list. Clicking resume navigates to the correct panel with the correct artifact loaded.

**Session tag when picked up:** DOS:O6 for spec (high priority — enables B-003 and B-005), then DOS:R18 for implementation.

---

## § B-005 — AI-driven elicitation: business analysis integrated across the SDLC

> **Reference to resolve before spec:** The elicitation prompt pattern here is similar to the **"grill me with docs"** function by Matt Peacock. Definition not yet available — to be added when the O-track spec session opens. Until then, treat this entry as directionally correct but potentially under-specified on the prompt mechanics.

**What:** The AI interrogates the human at every stage of the DOS workflow — not just the initial discovery interview — to extract requirements, resolve ambiguity, and fill gaps before they become delivery failures. This is structured business analysis (BA) embedded in the tool: the AI plays the analyst role, the human plays the domain expert, and the outputs populate DOS artifacts directly.

**Why:** The discovery interview (12 questions) is a good start but covers only one moment: the raw idea capture. In practice, ambiguity surfaces at every stage — a PRD section is vague, a requirement has an untested assumption, an acceptance criterion is missing a boundary condition, a brief's Forbidden list omits an obvious risk. Currently the user has to notice these gaps themselves and either fix them manually or accept the ambiguity. A BA-style interrogation loop would catch these proactively, ask the right questions at the right moment, and write the answers back into the relevant artifact.

**The BA pattern observed during DOS's own build:** the O-track spec sessions were effectively structured interrogation — the orchestrator asked targeted questions about design decisions, the answers shaped each chunk spec, and those decisions were recorded in the spec itself for future sessions to read. That discipline is why the lean brief worked: ambiguity had been removed upstream.

**Elicitation touchpoints across the SDLC:**

| Stage | Current state | With B-005 |
| --- | --- | --- |
| Raw idea | User types a free-form blob | AI asks 3–5 clarifying questions before saving (scope, users, success metric, constraints, one non-goal) |
| Discovery | 12 fixed questions | Dynamic follow-up: if an answer is vague or contradicts another, AI asks a targeted probe before moving on |
| PRD section edit | User edits a section | AI flags sections that are too short, missing key subsections, or internally inconsistent; offers to generate targeted questions |
| Requirements decomposition | AI generates REQ-NNN list | For each requirement, AI asks: "Is this the right granularity? What would make this unambiguous? Is there a hidden dependency?" |
| Test spec | AI generates verification criteria | AI asks: "What does failure look like for this criterion? Is there a boundary case the tests don't cover?" |
| Execution Brief (Allowed/Forbidden) | User fills glob lists | AI reviews the brief and asks: "Have you considered X file? Should Y directory be forbidden given the scope?" |
| Post-result diff | Forbidden write detected | AI asks: "Why did the agent touch this file? Was the forbidden rule correct, or does the brief need amending?" |

**Key design questions to resolve:**

1. **Push vs pull.** Does the AI ask questions proactively (pushed into the UI at each stage) or only when the user requests it ("Analyse this section")? A hybrid is likely right: proactive on first entry to a stage, on-demand thereafter. Proactive interrogation after first use becomes noise; on-demand is too passive.

2. **Question quality over quantity.** BA failure mode is question fatigue — asking too many questions, too broadly, driving the user away. Each elicitation should surface at most 3–5 questions, ranked by impact. Questions that can be inferred from context should not be asked.

3. **Answer persistence.** Answers must write back to the artifact, not disappear into a chat log. Every answered question either updates a memory entry field or appends to a `decisions[]` block that future sessions can read (connecting to B-004).

4. **Consistency checks across artifacts.** The most valuable BA insight is cross-artifact: "The PRD says users must be authenticated, but REQ-003 says the API is open — which is right?" DOS has the full memory graph to run this check. A periodic consistency audit (triggered on stage transition) could surface contradictions before they reach the brief.

5. **Tone and pacing.** The interrogation must feel collaborative, not bureaucratic. Questions should be brief, specific, and explain why they matter. "What does success look like for REQ-002? (Helps write unambiguous acceptance criteria)" is better than a generic "Please clarify."

6. **Relationship to the discovery specialist.** The current discovery interview is one specialist. B-005 generalises this into a cross-stage elicitation engine. The discovery specialist becomes the first instance of a general `ElicitationSpecialist` that can be targeted at any DOS artifact type.

**Rough implementation surface:**

- New `ElicitationSpecialist` module in `extension/src/specialists/elicitation/` — accepts an artifact type + current content, produces a ranked question set
- Each existing panel gains an "Analyse" button that triggers the specialist for that artifact
- A `ConsistencyAuditor` module that scans the memory graph on stage transitions and surfaces cross-artifact contradictions
- New `contracts/src/elicitation.ts` message types
- Answers write back via the existing artifact update handlers — no new memory writes needed

**Relationship to B-002 (reverse engineer):** When DOS infers artifacts from code, the confidence is inherently lower than when the human provides them. B-005's elicitation engine is the natural follow-on for B-002: after reverse engineering produces a draft, the AI interrogates the human to fill the gaps the inference couldn't resolve.

**Relationship to B-004 (session continuity):** Elicitation conversations are session-scoped. If the user closes the extension mid-interrogation, B-004's session memory should preserve the open questions so they surface again at resume, not start over.

**Success signal:** Open a PRD section with a deliberately vague description. Click "Analyse". The AI surfaces 3–5 targeted questions. Answer them. Confirm the section is updated with the answers incorporated and a `decisions[]` entry records what was asked and answered.

**Session tag when picked up:** DOS:O7 for spec, then DOS:R19 or DOS:R20 for implementation.
