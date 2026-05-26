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
| B-006 | Change propagation — PRD and requirements as living documents | 🔴 High | When a PRD section or requirement changes, DOS flags all downstream artifacts that are now stale. Prevents silent divergence between spec and delivery. See § B-006 below. |
| B-007 | Pre-flight completeness check — spec compiler before the expensive run | 🔴 High | Before a brief reaches an agent, DOS scores it for completeness: uncovered acceptance criteria, undefined terms, inconsistent allowed/forbidden scope. Catches spec errors before they become runtime failures. See § B-007 below. |
| B-008 | Impact analysis — blast radius before a run | 🟡 Medium | Using the existing memory graph, show which files, tests, and memory entries a given brief puts at risk before the user clicks Run. Especially critical for change requests touching existing functionality. See § B-008 below. |
| B-009 | Rollback — reject a result and restore to pre-run state | 🟡 Medium | One-click rejection of a bad run result: DOS uses the brief's allowed-file list to `git checkout` exactly the files the agent touched. Reduces the cost and fear of failed runs. See § B-009 below. |
| B-010 | Delivery health dashboard — metrics across the SDLC | 🟢 Low | Surface the data DOS already captures (tests before/after, advisor escalations, forbidden writes caught, files changed per brief) as a delivery health view. Shows whether discipline is improving over time. See § B-010 below. |
| B-011 | **Workgroup** — team coordination substrate | 🔴 High | DOS for teams: role separation, brief review gate, shared memory store, requirement state machine, standup view, non-developer access. Full roadmap: [`docs/pm/WORKGROUP.md`](WORKGROUP.md). |
| B-012 | Semantic delivery search — find anything, understand why it was built | 🔴 High | Search across the full DOS memory graph and codebase. Not just where code lives — the complete intent-to-delivery trail: requirement → test spec → brief → result → verification → decisions. See § B-012 below. |
| B-013 | Project knowledge wiki — Karpathy LLM Wiki pattern as DOS synthesis layer | 🔴 High | DOS maintains a living wiki of synthesised project knowledge (one page per domain concept) above the structured memory. Pages compound across deliveries and inject into agent sessions as context. Replaces vector search for many queries. See § B-013 below. |

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

---

## § B-006 — Change propagation: PRD and requirements as living documents

**What:** When any upstream artifact changes — a PRD section is edited, a requirement is updated, a discovery answer is revised — DOS traces the downstream dependency graph and flags every artifact that is now potentially stale. The user sees a clear "stale since [change]" indicator on affected requirements, test specs, and briefs, and can choose to re-derive, manually reconcile, or dismiss each one.

**Why:** This was the most dangerous silent failure mode during the DOS build. A PRD edit propagates no signal downstream. A requirement change doesn't invalidate the test spec written against the old version. A brief composed before a scope change remains unlocked and composable even though its foundation shifted. In a long-running project — exactly the kind DOS is designed for — these divergences compound. By the time a forbidden write fires, the root cause may be a PRD edit made three sessions ago.

**The core mechanism:** DOS already has the memory graph (`derives-from`, `has-test-spec`, `supersedes` links). Change propagation is a write-time side effect on that graph: when artifact A is updated, walk `derives-from` forward and mark every reachable artifact with a `staleReason` annotation pointing back to A's entry ID and the timestamp of the change.

**Staleness states:**

| State | Meaning | UI treatment |
| --- | --- | --- |
| `current` | No upstream change since last confirmed | No indicator |
| `stale:upstream-changed` | A linked upstream artifact was edited | Amber warning banner in the artifact's panel |
| `stale:dismissed` | User reviewed + dismissed the staleness signal | Dimmed indicator (audit trail preserved) |
| `stale:reconciled` | User re-derived or manually updated in response | Cleared; new `reconciled-with` link written |

**Key design questions:**

1. **Granularity.** Does a single-word edit in a PRD section trigger staleness downstream, or only structural changes (section added/removed, requirement scope changed)? Too sensitive = noise; too coarse = misses real drift. Likely answer: user-confirmed saves trigger propagation, not every keystroke.

2. **Reconciliation path.** "Stale" is only useful if DOS helps the user resolve it. For each stale artifact, DOS should offer: (a) re-run the generation step that produced it (e.g. re-decompose requirements from the updated PRD); (b) open the artifact for manual edit with the upstream change highlighted as context; (c) dismiss with a reason recorded in `decisions[]`.

3. **Circular protection.** The memory graph can have cycles (a requirement that supersedes another, which derives from the same PRD). The staleness walker must be cycle-safe — same pattern as the verification memory graph walker in CHUNK-14.

4. **Scope.** Staleness propagates forward (upstream → downstream) only. A change to a result memory entry does not mark its parent brief as stale — the brief was the spec; the result is the outcome.

**Relationship to B-005:** Elicitation (B-005) surfaces gaps within an artifact. Change propagation (B-006) surfaces gaps _between_ artifacts caused by time. Together they keep the whole spec layer coherent.

**Success signal:** Edit a PRD section. Confirm that the requirements derived from it show an amber "stale since [timestamp]" indicator. Open one stale requirement and confirm DOS offers the reconciliation options. Dismiss one — confirm the dismissal reason is recorded and the indicator dims but persists.

**Session tag when picked up:** DOS:O7 for spec (pairs naturally with B-005 spec session), then DOS:R20 for implementation.

---

## § B-007 — Pre-flight completeness check: spec compiler before the expensive run

**What:** Before an Execution Brief is handed to an agent, DOS runs a structured completeness check — a "spec compiler" — that scores the brief against the requirement and test spec it derives from. Gaps are surfaced as blocking warnings or advisory notes in the Brief Composer before the user can click Run. The goal: catch spec errors before they become runtime failures, agent confusion, or forbidden writes.

**Why:** The lean brief pattern worked because the orchestrator manually pre-resolved ambiguity. That discipline was human-enforced, not tool-enforced. A new user, or an experienced user in a hurry, skips the pre-resolution step and gets a vague brief. The agent then fills the gaps with guesses — usually wrong ones. Pre-flight makes the discipline automatic.

Think of it as the compiler analogy for specs: just as a compiler catches type errors before the program runs, the pre-flight check catches spec errors before the agent runs.

**Checks to implement (graduated severity):**

| Check | Severity | Description |
| --- | --- | --- |
| Acceptance criteria coverage | 🔴 Blocking | Each criterion in the linked test spec must appear in the brief's Section 10 (Verification Checklist). Missing criteria = agent has no way to self-verify. |
| Forbidden list non-empty | 🔴 Blocking | A brief with an empty Forbidden list is almost always under-specified. At minimum, DOS should warn. |
| Allowed list scope coherent | 🟡 Advisory | Allowed globs should cover the files the acceptance criteria would require touching. If the criteria mention `api/bugs.py` but the allowed list doesn't include it, flag the mismatch. |
| Undefined terms | 🟡 Advisory | Terms that appear in the brief but have no corresponding memory entry (requirement ID, file path, function name) and weren't in the codebase memory. Likely a copy-paste from a stale spec. |
| PRD section cited but stale | 🟡 Advisory | If the brief references a PRD section that is marked stale (B-006), surface the staleness inline. |
| Brief derived from locked requirement | ℹ️ Info | Informational — confirms the requirement the brief derives from is approved, not draft. |
| Test spec exists for requirement | ℹ️ Info | Confirms a test spec was created before the brief. A brief without a test spec is composing blind. |

**Key design questions:**

1. **Blocking vs advisory.** Blocking checks prevent the user from clicking Run until resolved or explicitly overridden. Advisory checks surface warnings but don't block. The user can bypass a blocking check with a recorded justification (same pattern as the Memory Update gate bypass in CHUNK-14).

2. **Where does the check run?** Options: (a) on Save-and-Lock (existing trigger — natural gate since locking is the point of no return); (b) on-demand via a "Check brief" button; (c) both. Option (a) is best — it integrates into the existing flow with no new UX.

3. **Allowed list coherence check requires reading the codebase.** Checking whether the allowed globs cover the files the acceptance criteria reference is a light static analysis — no execution needed, just pattern matching against the codebase memory entry. Codebase memory (already in the memory store from CHUNK-03) provides the file tree.

**Relationship to B-003 (agent team):** The pre-flight check is the natural integration point for the Planner tier in agent team mode. The Planner's output should satisfy the same completeness criteria — if the Planner's plan fails the check, it escalates before the Implementer is spawned.

**Success signal:** Compose a brief with an empty Forbidden list and a verification checklist missing two criteria from the linked test spec. Attempt to lock the brief. DOS blocks the lock, shows two blocking warnings (missing criteria + empty forbidden list), and offers inline links to the test spec and the forbidden-list editor. Add the missing items. Re-lock. Pre-flight passes.

**Session tag when picked up:** DOS:O7 or DOS:O8 for spec, then DOS:R20 or DOS:R21 for implementation.

---

## § B-008 — Impact analysis: blast radius before a run

**What:** Before the user clicks Run on an Execution Brief, DOS uses the memory graph to answer: "What does this brief put at risk?" It shows the blast radius — which existing test cases exercise the files in the brief's Allowed scope, which other requirements share those files, which previously verified briefs touched the same area. The user sees a pre-run risk summary and can make an informed decision before committing to the agent run.

**Why:** Every agent run is a bet. The brief's Allowed list scopes _what the agent may touch_, but it doesn't tell you _what already depends on those things_. A change to `api/bugs.py` might break three test cases written for REQ-001 even though the current brief is for REQ-004. DOS has the data to surface this — the memory graph, the test spec, the result history — but currently doesn't connect it to the Run decision.

**The blast radius calculation:**

1. Expand the brief's Allowed glob list against the codebase memory file tree → set of concrete file paths in scope.
2. Walk the result memory graph backwards: find all prior result entries whose `changedFiles` intersect the in-scope set.
3. From those results, find the briefs they came from, and from those briefs, find the requirements.
4. From the requirements, find the test specs and their verification criteria.
5. Surface: "N test cases in M requirements exercise files this brief will touch. Last run touching this area: [date/commit]."

**Output format (pre-run panel):**

- **Safe to run:** no prior results touch the same files. Green signal.
- **Shared scope:** X prior results overlap. Amber — shows which requirements and test cases are at risk. User confirms before proceeding.
- **Direct conflict:** the brief's scope includes files that a _currently in-progress_ brief (session state from B-004) also covers. Red block — concurrent modification risk.

**Key design questions:**

1. **Cost of the calculation.** The memory graph walk is cheap (it's SQL). The codebase file tree expansion is a glob match against a stored list — also cheap. This should run in under 100ms and display inline in the Brief Composer before Run.

2. **False positives.** Two briefs touching the same file doesn't always mean conflict — one may add a function, another may add a test for a different function in the same file. The blast radius is a signal, not a block. The user decides whether the overlap is real.

3. **Integration with B-009 (rollback).** If the user runs despite an amber signal and the run fails, B-009's rollback should restore exactly the files flagged in the blast radius — confirming the pre-run analysis was accurate.

**Relationship to B-006:** Change propagation tells you what's stale. Impact analysis tells you what's at risk. Together they answer the two questions before any delivery: "Is my spec up to date?" and "What could break if I run it?"

**Success signal:** Compose a brief for REQ-004 whose Allowed scope overlaps files from a previous REQ-001 result. Open the Brief Composer. Before clicking Run, DOS shows an amber "Shared scope" warning: "2 test cases for REQ-001 exercise files this brief will touch." Confirm the warning is accurate by checking the REQ-001 test spec.

**Session tag when picked up:** DOS:O8 for spec, then DOS:R21 for implementation.

---

## § B-009 — Rollback: reject a result and restore to pre-run state

**What:** A one-click "Reject and restore" action in the Result Capture panel that undoes the agent's file changes and returns the working tree to its pre-run state. DOS uses the brief's Allowed file list and the run's recorded `changedFiles` to determine the exact set of files to restore via `git checkout`. No manual `git` commands required; no guessing which files were touched.

**Why:** Fear of rollback is one of the hidden costs of agent-assisted delivery. If running an agent might leave the codebase in a broken state that's hard to unpick, users run agents less aggressively — especially on complex or risky requirements. Making rollback trivial removes that friction. It also makes it safe to run agents on partially-specified briefs, gather the result, reject it, and refine the spec — a tighter iteration loop.

**The rollback mechanism:**

DOS already has all the information needed:

- `ResultPayload.changedFiles` — the exact files the agent touched (captured by CHUNK-12's result parser)
- The brief's Allowed glob list — the files the agent _was permitted_ to touch
- The pre-run git commit — the clean state to restore to (the commit HEAD at the time the brief was locked)

Restore steps:

1. Assert the working tree has no uncommitted changes outside the brief's scope (safety guard — mirrors `reset-demo.sh` pattern from CHUNK-15).
2. Run `git checkout <pre-run-commit> -- <file>` for each file in `changedFiles`.
3. If the agent also created new files (not in the pre-run tree), run `git clean -f` scoped to those paths.
4. Write a `rejection` annotation to the result memory entry (`status: 'rejected', rejectedAt, rejectedReason`).
5. Surface the rejected brief as a candidate for revision (link to Brief Composer with the same requirement pre-loaded).

**What rollback does NOT do:**

- Does not delete the result memory entry — the rejected run is preserved as audit evidence.
- Does not revert database changes, network calls, or side effects the agent caused outside the file system.
- Does not rollback commits the agent made (if the agent committed mid-run). In that case, DOS surfaces a `git revert` suggestion instead of a file-level restore.

**Key design questions:**

1. **Mid-run commits.** Some harness profiles (Claude Code in particular) commit frequently. If the agent made commits, file-level `git checkout` isn't enough — DOS needs to detect committed vs uncommitted changes and offer `git revert` for committed ones.

2. **Partial rollback.** The user may want to keep some of the agent's changes and discard others (e.g. keep the new test file, discard the implementation file that violated a boundary). The restore UI should show a checklist of changed files and allow per-file selection.

3. **Safety guard scope.** The guard against uncommitted changes outside the brief's scope (step 1) must be airtight. Restoring files that the user was editing independently would be a data-loss bug. The guard should enumerate any such files and require explicit user confirmation before proceeding.

**Relationship to B-007 (pre-flight) and B-008 (impact analysis):** Pre-flight catches spec errors before the run. Impact analysis flags risks before the run. Rollback recovers after a failed run. Together the three form a complete risk management layer around the agent execution step.

**Success signal:** Run a brief that produces a forbidden write (deliberately). Diff panel shows the violation. Click "Reject and restore" in the Result Capture panel. Confirm the forbidden file is restored to its pre-run state. Confirm the result memory entry is preserved with `status: 'rejected'`. Confirm the Brief Composer opens pre-loaded with the same requirement.

**Session tag when picked up:** DOS:O8 for spec (pairs with B-008), then DOS:R21 or DOS:R22 for implementation.

---

## § B-010 — Delivery health dashboard: metrics across the SDLC

**What:** A dashboard panel that surfaces the delivery data DOS already captures — test counts before/after each run, files changed per brief, forbidden writes caught, advisor escalations triggered, verification pass rates — as a health view across the project's history. Shows whether delivery discipline is improving, where quality problems cluster, and which requirements have cost the most delivery effort.

**Why:** DOS is a structured delivery tool but currently produces no summary of how well delivery is going. All the evidence is there — in the memory graph, the result entries, the diff outcomes, the session wraps — but none of it is aggregated. A team using DOS can't answer "are we getting better?" without reading individual memory entries. A dashboard answers that at a glance.

This also closes a credibility gap: DOS's essay claims it improves delivery discipline. The dashboard is how you measure whether that claim is true.

**Metrics to surface:**

| Metric | Source | Signal |
| --- | --- | --- |
| Requirements shipped per session | Session memory + result entries | Velocity |
| Tests added per requirement | Test spec + result `testCountAfter − testCountBefore` | Quality coverage |
| Forbidden writes caught (pre-commit) | Diff outcome entries | Safety net effectiveness |
| Forbidden writes caught (post-run) | Diff outcome entries | Brief quality (fewer post-run = better specs) |
| Advisor escalation rate | Agent team result entries (B-003) | Brief quality (lower = better) |
| Verification pass rate (first attempt) | Verification memory entries | End-to-end quality |
| Rollback rate | Result entries with `status: 'rejected'` | Run reliability |
| Average files changed per brief | Result `changedFiles.length` | Scope discipline |

**Key design questions:**

1. **Scope: project vs cross-project.** The dashboard is per-project initially (all memory lives in one `.deliveryos/` store). Cross-project aggregation (B-009's multi-project concern) is post-MVP.

2. **Time axis.** Metrics should be trended over sessions, not just totals. A bar chart of "tests added per session" is more useful than a lifetime total. Session memory entries (B-004) provide the time axis.

3. **Actionability.** A metric with no action path is noise. Each metric should link to the underlying artifacts: clicking "3 forbidden writes" opens the diff results for those three runs. The dashboard is a navigation surface, not just a report.

4. **When to show it.** Natural trigger: session wrap (B-004). After wrapping a session, show the health snapshot for the session that just closed — what shipped, what was caught, what regressed. This makes the wrap feel productive, not bureaucratic.

**Relationship to B-004 (session continuity):** The session memory entries that B-004 introduces are the time-series backbone of the dashboard. Without B-004, the dashboard has no session axis — only a flat lifetime view. Implement B-004 first.

**Success signal:** After completing three delivery sessions (each with at least one brief run), open the delivery health dashboard. Confirm it shows per-session test counts, at least one forbidden write event (if any occurred), and verification pass/fail rates. Click a metric to confirm it navigates to the underlying result entry.

**Session tag when picked up:** DOS:O9 for spec (after B-004 is implemented — depends on session memory), then DOS:R22 or later for implementation.

---

## § B-012 — Semantic delivery search: find anything, understand why it was built

**What:** A search capability that spans the entire DOS memory graph and codebase, returning results in delivery context — not just where something appears in code, but the full intent-to-delivery trail that explains why it was built that way. A developer searching "interest calculation" in a core banking system should find the requirement that specified it, the test spec that defined correct behaviour, the brief that scoped the implementation, the result that captured what the agent did, the verification that confirmed it passed, and the decisions recorded along the way.

**Why:** Code search already exists — `grep`, ripgrep, GitHub code search, IDE Find-in-Files. These tools tell you _where_ something is. They cannot tell you _why it was built_, _what constraints the agent was given_, _what was explicitly forbidden_, _what decisions were made_, or _what evidence exists that it works correctly_. DOS has all of that information in the memory graph. Search is the interface that makes it accessible.

This is the capability that transforms DOS from a delivery process tool into a **living project intelligence layer**. A new team member can onboard by searching, not by reading documentation. An auditor can find all verified deliveries related to a compliance requirement. A tech lead investigating a production incident can trace the code back to the brief, the requirement, and the original intent — in seconds.

**Two search modes:**

_Full-text search_ — fast, exact match across all memory body files and source code. Finds literal occurrences of the search terms. Implemented as SQLite FTS5 (already available in the `sql.js` runtime DOS uses) against all stored memory bodies, plus a ripgrep pass against the codebase files.

_Semantic search_ — finds conceptually related content even when the words differ. Searching "interest calculation" finds requirements that mention "APR computation", "yield accrual", or "penalty rate" because the concepts are related. Implemented via embeddings (small local model or API call). Slower than full-text but dramatically more useful for domain-rich codebases where terminology varies.

**Result structure:**

Each search result surfaces the full delivery chain for that match:

```text
REQ-007 — Calculate compound interest monthly          [requirement]
  ├── Discovery note: "compound chosen over simple — regulatory requirement"
  ├── Test spec TS-REQ-007 — 4 verification criteria
  ├── Brief brief_a3f9... — allowed: src/finance/interest.ts; forbidden: src/finance/principal.ts
  ├── Result result_c7d2... — agent touched 2 files, 1 test added
  └── Verification — PASSED 2026-05-14
```

The user can expand any node to navigate directly to that artifact in the relevant DOS panel.

**Search entry points:**

- Command palette: `DOS: Search project` (global, any time)
- Activity bar: persistent search box above the stage tree
- Contextual: right-click any file in VS Code Explorer → "Find in DOS delivery history" (searches by file path — shows all briefs that touched this file, all requirements that mentioned it)
- Panel-specific: search within a panel (e.g. requirements catalogue search already exists; this extends it to cross-artifact search)

**What the search indexes:**

| Content | Search type | Notes |
| --- | --- | --- |
| All memory body files (`.md`) | Full-text + semantic | Requirement descriptions, PRD sections, brief content, result summaries, decision notes |
| Memory payload JSON fields | Full-text | Requirement IDs, brief IDs, file paths, tag values |
| Source code files | Full-text | Codebase files in the workspace — bridges delivery context to code |
| Canned responses / handoff files | Full-text | `.deliveryos-handoff/` contents if present |

**The archaeology use case (example: core banking):**

A developer is investigating a production bug in interest compounding. They search "compound interest" in DOS Search. Results show:

- REQ-007 and REQ-012 — the two requirements that specified compound interest behaviour
- Brief `brief_a3f9` — scoped to `src/finance/interest.ts`; forbidden: `src/finance/principal.ts` (revealing the boundary the agent was given)
- A decision note from the brief review: "Tech Lead flagged: rounding mode must be HALF_UP per regulatory guidance"
- Result capture: agent touched `interest.ts` + `interest.test.ts`; 3 tests added
- Verification: PASSED — but criteria 3 ("rounding mode") was marked low-confidence at the time

The developer now knows the rounding mode decision was flagged during delivery, was only low-confidence at verification, and the file `principal.ts` was explicitly off-limits — possible root cause located in under five seconds.

**Key design questions:**

1. **Embedding model choice.** Local (fast, private, no API cost) vs hosted (higher quality, requires network). For Phase 1, full-text search alone is valuable. Semantic search is an enhancement that can be added later without changing the interface.

2. **Index freshness.** The full-text index must update when memory entries are written. SQLite FTS5 triggers handle this automatically. The semantic embedding index needs re-computation on writes — acceptable if async (background indexing after each save).

3. **Cross-project search.** Phase 1: single project (current workspace). Phase W3 (multi-platform): search across all projects in the organisation's DOS workspace. This is the enterprise knowledge base use case.

4. **Search and the non-code domain.** For a film production, searching "submarine interior" should find every requirement, brief, and result that mentioned the submarine setting — across all scenes. The search is domain-agnostic because the memory store is domain-agnostic.

**Relationship to B-002 (reverse engineer):** B-002 populates the memory store from existing code. B-012 makes that populated store searchable. Together they answer the brownfield onboarding question: "I inherited this codebase — what was the intent behind X?" B-002 fills the gaps; B-012 navigates them.

**Relationship to B-008 (impact analysis):** Impact analysis asks "what does this brief put at risk?" — it traverses the graph from a starting point. Search asks "where is X in this project?" — it finds the starting point. They are complementary navigation modes over the same memory graph.

**Relationship to VISION.md (non-code domains):** The core banking interest calculation example is software. The same search in a film production finds every scene brief that mentioned the submarine set, every director's note about underwater lighting constraints, every result that confirmed the visual brief was delivered. Domain-agnostic search is the interface that makes DOS's domain-agnostic memory useful.

**Success signal:** In a project with at least 5 requirements and 3 completed delivery cycles, search "interest calculation" (or any domain term from the project). Confirm results group by artifact type, each result shows the delivery chain, and clicking any result navigates to that artifact in the correct DOS panel. Run the same search in semantic mode and confirm it returns a related result that doesn't contain the exact search string.

**Session tag when picked up:** DOS:O8 for spec (can be co-specced with B-008 — both navigate the memory graph), then DOS:R21 or DOS:R22 for implementation.

---

## § B-013 — Project knowledge wiki (Karpathy LLM Wiki pattern)

**Status:** Backlogged
**Priority:** 🔴 High

### The problem

DOS accumulates structured artifacts — intent memory, requirements, briefs, results, verification records — across every delivery cycle. But each agent session starts from near-zero. The handover protocol injects the previous session's context, but that context is narrow: what was done last time, what's in flight now. The agent has no standing knowledge of what this project _is_.

A developer joining a new team spends days reading the codebase to build a mental model: how auth works here, where the data layer is, what conventions the team follows, what traps to avoid. A new AI agent session has to re-derive all of this from scratch on every invocation — or rely on a CLAUDE.md file that inevitably becomes stale and generic.

The result: agents make decisions that contradict established project knowledge because they weren't told it. DOS has the data — every brief, every result, every verification record is in the memory store — but no synthesis layer that turns that data into injected standing knowledge.

### The insight (Karpathy LLM Wiki pattern)

In April 2026, Andrej Karpathy described a memory architecture for LLM agents that separates three layers:

1. **Source** — raw structured facts (like DOS's SQLite memory store)
2. **Wiki** — synthesised, human-readable pages, one per domain concept, maintained by an AI agent as a living document
3. **Injection** — relevant wiki pages injected into the agent's context window at session start

The key property: wiki pages _compound_. Each delivery cycle, the wiki agent reads new artifacts and updates the relevant pages. Knowledge accumulates rather than being re-derived per query. The wiki becomes the project's institutional memory — the thing a new team member reads to understand how this project works.

DOS already has the bones of this pattern: markdown body files per memory artifact, a structured graph linking them. What's missing is the synthesis layer above the graph — the wiki that turns "here is a list of all decisions made in this project" into "here is what you need to know about this project before you touch it."

Reference: [Karpathy LLM Wiki gist — April 2026](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

### What it looks like

A DOS project grows a `wiki/` folder under `.deliveryos/`. Each file is a plain markdown page for a domain concept:

```text
.deliveryos/
  wiki/
    auth-conventions.md          ← how authentication works in this project
    data-access-patterns.md      ← ORM? raw SQL? query builder conventions?
    interest-calculation.md      ← where it lives, how it works, known edge cases
    known-constraints.md         ← things agents must not do and why
    test-conventions.md          ← how tests are structured, what helpers exist
    domain-model.md              ← the core entities and their relationships
```

At session start, DOS injects the relevant pages into the agent's context. For a brief targeting the billing module, DOS injects `interest-calculation.md`, `data-access-patterns.md`, and `known-constraints.md`. The agent starts with standing knowledge, not a blank slate.

### Three operations

**Ingest** (after each verified delivery):
A wiki agent reads the completed brief, result, and verification record. It identifies which domain concepts were touched and updates the relevant wiki pages — or creates new ones if a concept appears for the first time. The update is a synthesis, not a dump: the agent writes what a competent developer would want to know, not a transcription of the brief.

**Query / inject** (at session start):
When a new agent session opens, DOS reads the brief's Allowed list and the requirement text, identifies the relevant domain concepts, and injects the corresponding wiki pages into the context window. The agent knows the project before it reads a line of code.

**Lint** (linked to B-006 change propagation):
If a brief's result contradicts a wiki page — e.g. a convention is changed, a constraint is lifted — DOS flags the wiki page as stale. The wiki agent is prompted to reconcile. This closes the loop between B-006 (change propagation) and B-013: staleness detection applies to synthesised knowledge, not just raw requirements.

### Relationship to other backlog items

**B-012 (delivery search):** B-012 finds a delivery artifact. B-013 synthesises the knowledge _from_ those artifacts into injected context. They complement each other — search is for when you want to navigate; wiki injection is for when you want the agent to already know. Together they make B-012's vector search layer less necessary for many queries: if the wiki page for "interest calculation" already exists and is current, the agent doesn't need to search — it was injected.

**B-004 (session continuity):** The wiki layer IS the deep session continuity mechanism. The handover protocol keeps short-term session context alive across windows. The wiki keeps long-term project knowledge alive across sessions, team members, and agent model versions.

**B-001 (DOS built with DOS):** DOS's own wiki would contain pages like `extension-architecture.md`, `memory-schema.md`, `webview-conventions.md`, `specialist-interface.md`. Every new R-session would inject the relevant pages rather than re-reading BUILD_STATUS.md and scattered source files.

### Non-code domain application

The wiki pattern is domain-agnostic because DOS's memory store is. For a film production:

- `submarine-setting.md` — established visual rules, lighting constraints, confirmed set pieces
- `character-voice.md` — tone, vocabulary, known contradictions to avoid per character
- `act-structure.md` — what's established in Acts 1 and 2 that Act 3 briefs must not violate

For a marketing campaign:

- `brand-voice.md` — tone rules, terms to avoid, approved language
- `audience-segments.md` — what's been established about each segment
- `campaign-constraints.md` — legal review outcomes, regulatory limits

The wiki page is the domain expert's briefing note, synthesised from all prior delivery evidence.

### Implementation sketch

Phase 1 (simple, high value):

- A `wiki/` folder under `.deliveryos/`
- A "Synthesise wiki page" action in the verification panel (manual trigger after each verified delivery)
- Pages injected into the brief composer panel as a collapsible "Project context" section
- Pages are plain markdown — editable by the developer, versioned in git

Phase 2 (automated ingest):

- Post-verification hook: trigger wiki agent automatically after each `verified` state transition
- Diff-based update: the wiki agent reads only the new artifacts since last wiki update (not the whole project each time)
- Staleness detection: if a result contradicts a wiki page, flag it in the verification panel

Phase 3 (smart injection):

- Relevance scoring: inject only the pages relevant to the current brief (not all pages — context budget)
- Wiki page quality scoring: surface pages that haven't been updated in N delivery cycles as candidates for review
- Cross-project wiki: Phase W3 — a team's wiki pages are shared across all projects, building an organisation-level knowledge base

**Pre-conditions:** B-003 (agent team) spec complete — the wiki agent is a specialist type (§ B-003). B-006 (change propagation) spec locked — staleness semantics for wiki pages follow the same model as requirement staleness.

**Key design questions:**

1. **Wiki agent model tier.** Ingest is a synthesis task — Sonnet-class at minimum. Injection selection (choosing which pages to inject) is cheaper — Haiku-class. The lint/staleness check is a comparison task — Haiku-class.

2. **Page granularity.** One page per domain concept is the target. Too coarse (one page for the whole project) loses the relevance scoring benefit. Too fine (one page per requirement) recreates the memory store with extra steps. The right granularity is: one page per concept a developer would search for in the team wiki.

3. **Git versioning.** Wiki pages in `.deliveryos/wiki/` are committed to the repo. They are versioned alongside the code they describe. A `git blame` on a wiki page shows which delivery cycle last updated it — instant provenance.

4. **Cold start.** A brownfield project has no wiki. B-002 (reverse engineer) populates the memory store. B-013 Phase 1 then runs a one-time "synthesise from existing memory" pass to bootstrap the wiki from those artifacts. B-002 → B-013 cold start is the brownfield onboarding path.

**Success signal:** A new agent session for an existing project receives wiki-page injection in the brief composer. The agent's first action references a project convention it was not told in the brief itself — it got it from the wiki. A developer reviewing the agent's output confirms the convention reference was correct.

**Session tag when picked up:** DOS:O9 for spec (can be co-specced with B-003 — the wiki agent is a specialist), then DOS:R23+ for implementation.
