# DeliveryOS — P-track Backlog

Items the P-track owns or flags. Rough priority ordering within each status tier.
Add items here; use `/sm-start-fresh P` to pick them up in a session.

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
| B-012 | Project intelligence — search and knowledge injection | 🔴 High | Make the DOS memory graph navigable and injectable: find any delivery artifact by intent or keyword, surface the full delivery chain behind it, and inject standing project knowledge into agent sessions at start. Three implementation options — see § B-012 below. |
| B-013 | MABP — structural quality gate | 🔴 High | Agents prioritise completion over clean structure. Four targeted changes to the MABP cycle (invocation stance, QA structural sweep, blocking-default for structural hot spots, debt register) to push cleanliness upstream and reduce remediation. See § B-013 below. |
| B-014 | MABP — prompt and process tightening | 🔴 High | Builder invocations are too long and create compliance theatre. Five process improvements: succinctness rule, pre-fire audit interpretation, QA independence, cross-chunk cohesion review, and iteration budget reform. See § B-014 below. |
| B-015 | MABP — model-tier awareness and escalation protocol | 🔴 High | Architects default to premium tier for all work regardless of task complexity. The flat 3-attempt builder budget burns identical compute on every retry. Two changes: task-proportionate tier selection for architects; model-escalation ladder for builders (standard → standard → premium → human). Provider-agnostic tier language throughout. Supersedes B-014 Change 5. See § B-015 below. |
| B-016 | MABP — evidence manifest and adversarial QA verification | 🔴 High | Builder agents can fabricate completion; QA confirms without re-running ground truth. Four targeted changes: builder evidence manifest, adversarial-default QA, architect spot-check of QA evidence, verdict gating on manifest coverage. See § B-016 below. |

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

**What:** Make session lifecycle management a first-class feature inside DOS. When you close the extension and return hours or days later, DOS should know exactly where you left off — what was in progress, what decisions were made, what the carry-overs are — and offer a structured resume path. Mirrors the `/sm-handover` + `/sm-start-fresh` skill pattern used to build DOS itself, but implemented natively in the extension rather than as external Claude Code skills.

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

> **Reference:** The elicitation prompt pattern here is the **"grill me with docs"** / "grill me" skill pattern by Matt Pocock — see [`mattpocock/skills`](https://github.com/mattpocock/skills) on GitHub. The discovery interview specifically should evolve from a static 12-question template into a dynamic AI-driven interview: some seed questions to orient the agent, then the agent interrogates the user interactively rather than returning a batch prompt to copy-paste. The static template in `extension/src/discovery/promptBuilder.ts` is the current placeholder; this item replaces it. Resolve prompt mechanics by reading the mattpocock/skills source before the O-track spec session.

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

## § B-012 — Project intelligence: search and knowledge injection

**What:** Make the DOS memory graph navigable and injectable. A developer searching "interest calculation" in a core banking project should find the requirement that specified it, the brief that scoped it, the decision that locked in rounding mode, and the verification that passed — not just the file where the code lives. That same knowledge should also flow automatically into the next agent session so the agent starts with it, not from scratch.

**Why:** Code search already exists. What doesn't exist is delivery-chain archaeology: not _where_ something is, but _why it was built_, _what constraints the agent was given_, _what was forbidden_, _what was decided_, and _what evidence says it works_. DOS has all of that in the memory graph. This item is the interface that makes it accessible — for humans navigating, and for agents starting a new session.

**The use case:**

A developer investigates a production bug in interest compounding. They search "compound interest." Results show REQ-007 (the requirement), brief `brief_a3f9` (scoped to `interest.ts`; `principal.ts` explicitly forbidden), a Tech Lead decision note ("rounding mode must be HALF_UP — regulatory"), and verification PASSED but criteria 3 marked low-confidence. Root cause located in under five seconds — from a search, not from reading code.

---

### Implementation options

Three approaches exist. We will pick one when we come to build it.

#### Option A — SQLite FTS5 _(recommended)_

Full-text search over all memory body files, indexed automatically on write. FTS5 is already inside the `sql.js` runtime DOS uses — zero new dependencies, zero API cost, works offline. Implementation is roughly 50 lines of SQL and a search panel. Results are keyword-matched and BM25-ranked.

_Effective for:_ delivery-chain archaeology, finding a requirement by name, locating all briefs that touched a file. Works well because DOS artifacts have deliberately consistent vocabulary — the same terms appear in requirement, brief, and result.

_Limitation:_ no semantic leap. Searching "interest rate" won't surface a requirement that only says "APR calculation" unless the terms overlap.

_Effort:_ low. New dependency count: 0. API cost: $0.

---

#### Option B — Haiku context-injection

For each search query, inject relevant memory artifacts into a Haiku prompt and ask it to find and rank the matches. No embedding index, no vector store — just an API call. Returns semantically ranked results with a one-line explanation of why each result is relevant.

_Effective for:_ semantic queries ("where do we handle authentication edge cases?"), cross-domain terminology mismatch, natural language questions about the project.

_Limitation:_ requires an API call per search (~$0.01/query). Slower than FTS5. Requires network. Context window caps how many artifacts can be injected per query — large projects need chunking logic.

_Effort:_ low-medium. Builds on existing API integration. New dependency count: 0.

---

#### Option C — Karpathy LLM Wiki pattern

After each verified delivery, a Sonnet-class agent synthesises the new artifacts into a `wiki/` folder under `.deliveryos/` — one plain markdown page per domain concept (`interest-calculation.md`, `auth-conventions.md`, `known-constraints.md`). At session start, DOS injects the relevant pages into the agent's context window. Knowledge compounds across deliveries rather than being re-derived per query.

Reference: [Karpathy LLM Wiki gist — April 2026](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

_Effective for:_ standing agent knowledge — the agent starts the session already knowing project conventions, constraints, and domain model without reading a line of code. Also works as onboarding for new team members (read the wiki, not the codebase). Domain-agnostic: a film production wiki has `character-voice.md` and `submarine-setting.md`; a marketing project has `brand-voice.md` and `campaign-constraints.md`.

_Limitation:_ highest implementation effort of the three. Requires B-003 (agent team) and B-006 (change propagation) to be spec-complete first — wiki staleness semantics follow the same model as requirement staleness. Cold-start on brownfield projects requires a one-time synthesis pass (pairs with B-002). Ingest is Sonnet-class per delivery cycle — not free.

_Effort:_ high. Pre-conditions: B-003, B-006. New specialist type required.

---

### Comparison

| | Option A — FTS5 | Option B — Haiku injection | Option C — Wiki |
| --- | --- | --- | --- |
| New dependencies | None | None | None |
| API cost | $0 | ~$0.01/search | ~$0.05/delivery cycle (Sonnet ingest) |
| Works offline | Yes | No | Yes (once built) |
| Semantic understanding | No | Yes | Yes |
| Knowledge compounds | No | No | Yes |
| Implementation effort | Low | Low–medium | High |
| Pre-conditions | None | None | B-003, B-006 |
| **Recommended** | **Yes** | — | — |

### What all three share

Each option surfaces results grouped by delivery artifact type, with the full chain visible: requirement → test spec → brief → result → verification. Each result links directly to the relevant DOS panel. Search is domain-agnostic — a film production search works the same way as a software search because the memory graph is domain-agnostic.

**Relationship to B-002:** B-002 populates the memory store from an existing codebase. B-012 makes that populated store navigable. Together they answer the brownfield onboarding question: "I inherited this — what was the intent behind X?"

**Relationship to B-004 (session continuity):** Option C's wiki layer is the deep session continuity mechanism. The handover protocol keeps short-term context alive across windows. The wiki keeps long-term project knowledge alive across sessions, team members, and model versions.

**Relationship to B-008 (impact analysis):** Impact analysis traverses the graph _forward_ from a starting point ("what does this brief put at risk?"). Search finds the starting point. They are complementary navigation modes over the same graph.

**Success signal:** In a project with at least 5 requirements and 3 completed delivery cycles, search "interest calculation" (or any domain term). Results group by artifact type, each shows the delivery chain, clicking any result navigates to the correct DOS panel.

**Session tag when picked up:** DOS:O8 for spec (can be co-specced with B-008), then DOS:R21+ for implementation.

---

## § B-013 — MABP: structural quality gate

**Status:** Backlogged
**Priority:** 🔴 High
**Applies to:** `docs/MULTI_AGENT_BUILD_PROCESS.md`

### The flaw

The MABP defines "done" entirely in functional terms: tests pass, features work, extension activates. There is no structural quality criterion anywhere in the cycle. A builder optimising for "make the red go green" will always take the path of least resistance through schema and code structure — and the MABP currently gives them permission to do so.

Three root causes:

1. **Builder invocations have no design quality stance.** The invocation drafting instructions say: auditor stance + chunk spec + done criteria. Nothing tells the builder to prefer a normalised schema over a flat one, or a clean abstraction over a working hack.

2. **QA has no structural sweep.** Cycle 5 checks functional correctness and test quality. It doesn't check schema design, naming consistency, missing constraints, or hardcoded values.

3. **Hot spots are self-declared by the builder.** A builder who took a structural shortcut to meet their 3-attempt budget has completion bias — they're unlikely to flag the shortcut at the severity it deserves. Under iteration pressure, structural debt becomes advisory rather than blocking.

### Four changes

**Change A — Design quality stance in every builder invocation** (Section 6 Step 4 and Section 9):

Add a mandatory opening paragraph to the architect's invocation drafting guidance:

> "Build clean first. Functional correctness is necessary but not sufficient. If the clean structure and the fast structure diverge, build the clean one. The only permitted shortcut is one explicitly declared as a hot spot — with the clean version described and the reason for deferral stated."

This runs before the chunk spec, not after. Agents anchor on the first instruction.

**Change B — Structural quality sweep in QA** (Section 8, Cycle 5):

Add to QA's mandatory checks a structural audit pass:

- Schema: normalised form respected, all constraints named, foreign keys explicit, no nullable columns where the domain forbids null
- Code: no magic numbers, no hardcoded strings that belong in config, no TODO/FIXME committed, no dead code
- Naming: consistent with the codebase's existing conventions (grep three comparable files to establish the baseline)
- Abstractions: no leaky abstractions introduced for the sake of speed

Any finding here is a hot spot. Schema design and constraint issues are blocking severity by default.

**Change C — Blocking-by-default for structural hot spots** (Section 8, Cycle 4):

Add a severity rule to the hot spots declaration:

> "Structural shortcuts — denormalised schema, missing constraint, magic number, inconsistent naming, leaky abstraction — are **blocking** severity unless the builder explicitly states (a) what the clean version would have been and (b) why it was not feasible within the attempt budget. Advisory is not available for structural issues without that justification."

This closes the gap where "it works, it's just a bit messy" becomes advisory and ships.

**Change D — Structural debt register in BUILD_STATUS.md** (Section 9, architect role contract):

Add to the architect role contract:

> "The architect is the only agent who can approve a structural shortcut. When approving a chunk whose hot spots include a structural shortcut, the `BUILD_STATUS.md` entry for that chunk must include a `Structural debt:` field: what was cut, what the clean version looks like, and which future chunk should clean it up. Debt that is not registered does not exist as far as future architects are concerned."

This makes structural debt visible across sessions and assignable to a future chunk rather than silently accumulating.

### Relationship to B-014

B-013 changes _what quality standard_ the agents are held to. B-014 changes _how the process is run_ (prompt shape, audit rigour, QA independence). Both are needed. B-013 without B-014 sets a higher bar but delivers it via the same long, compliance-theatre invocations. B-014 without B-013 tightens the process but still has no structural quality gate.

**Success signal:** A chunk that touches a database schema or core abstraction is reviewed by QA for structural quality. A shortcut that would previously have shipped as advisory is flagged as blocking. The `BUILD_STATUS.md` chunk entry has either a clean structural audit or an explicit `Structural debt:` field — never silence.

**Implementation note:** B-013 is a document edit, not a code change. An O-track session edits `docs/MULTI_AGENT_BUILD_PROCESS.md` to incorporate the four changes. No R-track work required.

**Session tag when picked up:** DOS:O6 (or the next available O session) — edit `docs/MULTI_AGENT_BUILD_PROCESS.md` directly.

---

## § B-014 — MABP: prompt and process tightening

**Status:** Backlogged
**Priority:** 🔴 High
**Applies to:** `docs/MULTI_AGENT_BUILD_PROCESS.md`

### The problem

The MABP's builder invocations are too long. The current instruction is: "auditor stance + chunk spec verbatim + audit corrections + done-criteria runbook." A chunk spec is 100–300 lines. An audit correction log adds 20–50 lines. Done criteria add another 20–40 lines. The result is a 200–400 line prompt delivered to a fresh sub-agent with no prior context.

Long prompts create three failure modes:

1. **Recency bias.** Agents weight the last thing they read most heavily. Constraints buried in the middle of a long invocation are followed inconsistently. The structural quality stance (B-013 Change A) is useless if it appears on line 8 of a 350-line prompt.

2. **Compliance theatre.** When an invocation says "paste the pre-fire audit output verbatim," the builder pastes it — but the act of pasting is not the same as understanding it. The audit becomes a checkbox, not a diagnostic.

3. **QA anchoring.** QA reads the builder's hot spots section first. This primes QA's attention toward what the builder flagged rather than what QA independently finds. QA becomes a verifier of the builder's self-assessment, not an independent reviewer.

Beyond prompt length, the process has two structural weaknesses in how structural consistency across chunks is checked — each chunk is verified in isolation, so cross-chunk pattern drift only surfaces after both chunks are done.

### Five changes

**Change 1 — Minimum-necessary invocation rule** (Section 6 Step 4 and Section 9):

Replace "chunk spec verbatim" with "key decisions pre-resolved + pointer to read the spec." The invocation should state:

- What the chunk must produce (one paragraph)
- The three to five decisions the builder must not re-litigate (pre-resolved by the architect in the invocation)
- The constraints that govern the build (scope, forbidden files, design quality stance)
- A pointer: "Read the chunk spec at `docs/planning/chunks/chunk-NN-<slug>.md` before writing any code"
- The done criteria as a numbered checklist (10 lines maximum)

Target: invocations under 80 lines. The chunk spec is a reference document, not a paste target.

**Change 2 — Pre-fire audit interpretation rule** (Section 6 Step 3 and Section 8 Cycle 1):

Replace "paste the output verbatim" with "paste the output verbatim AND state one sentence per command: what you expected, what you got, and whether it is a drift." A builder who pastes output and writes "API exists: confirmed" has understood the audit. A builder who pastes output and writes nothing has performed a ritual.

This also applies to the architect's own pre-fire pass. The audit is not done until the interpretation is written.

**Change 3 — QA independent pass before hot spots** (Section 8 Cycle 5):

QA must complete an independent verification pass before reading the builder's hot spots section. The sequence:

1. QA re-runs every done criterion against primary sources (current behaviour)
2. QA runs the structural quality sweep (B-013 Change B)
3. QA records its own findings independently
4. QA then reads the builder's hot spots and reconciles: findings that appear in both are confirmed; findings in hot spots that QA cannot reproduce are flagged as unverified; findings QA made independently that the builder did not flag are elevated

This preserves QA's independence and catches the class of builder self-assessment bias.

**Change 4 — Cross-chunk structural cohesion review** (Section 9, architect role contract):

Every four to five chunks, the architect runs a cross-chunk structural review before firing the next builder:

- Grep for the three most common patterns introduced in the last four chunks (naming conventions, error handling shapes, data access patterns)
- Confirm they are consistent across all chunks delivered so far
- If drift is found, raise a fix prompt targeting the inconsistency before continuing

This review is logged in `BUILD_STATUS.md` as a `Cohesion check:` entry. It does not require a full builder fire — the architect does it in-session and either approves as consistent or drafts a targeted fix prompt.

**Change 5 — Iteration budget reform** (Section 8 Cycle 3):

The current 3-attempt budget creates time pressure that encourages structural shortcuts (take the fast fix, not the clean fix). Two additions:

- A structural shortcut taken on attempt 2 or 3 is automatically a blocking hot spot regardless of severity (links to B-013 Change C). The builder cannot trade "I'm running out of attempts" for "I'll mark this advisory."
- If a builder-owned error persists to attempt 3 and the only available fix is a structural shortcut, the correct action is a BLOCKER, not a shortcut. "I can make this work by denormalising the schema" is not a valid attempt 3 resolution — it is a BLOCKER with a description of what clean resolution requires.

### Relationship to B-013

B-014 changes how the process runs. B-013 changes what quality standard the agents are held to. The changes interact: B-014 Change 1 (shorter invocations) makes B-013 Change A (design quality stance) more effective, because the stance now appears near the top of a short prompt rather than buried in a long one. Implement both together.

**Success signal:** A builder invocation is under 80 lines. The pre-fire audit includes one interpretation sentence per command. QA's report shows an independent pass section distinct from the hot spots reconciliation section. The `BUILD_STATUS.md` shows a `Cohesion check:` entry every four to five chunks. No structural shortcut appears in a report without a blocking severity declaration.

**Implementation note:** B-014 is a document edit, not a code change. The same O-track session that implements B-013 should implement B-014 — both edit `docs/MULTI_AGENT_BUILD_PROCESS.md` and the changes are tightly coupled.

**Session tag when picked up:** Same O-track session as B-013 — edit `docs/MULTI_AGENT_BUILD_PROCESS.md` in one pass.

---

## § B-015 — MABP: model-tier awareness and escalation protocol

**Status:** Backlogged
**Priority:** 🔴 High
**Applies to:** `docs/MULTI_AGENT_BUILD_PROCESS.md`
**Supersedes:** B-014 Change 5 (iteration budget reform)

### Two flaws

The MABP is implicitly Claude-centric and cost-unaware. Two specific flaws:

**Flaw 1 — Architect tier defaults to premium regardless of task.** In practice, architect sessions run on the highest-capability model available. But not all architect tasks require that. Syncing `BUILD_STATUS.md`, running a pre-fire audit, or writing a straightforward fix prompt are standard-tier tasks being billed at premium rates. Over a 16-chunk build, this is significant waste.

**Flaw 2 — The iteration budget is tier-blind.** The current rule gives a builder three attempts at the same model tier, then a BLOCKER. This wastes premium compute (if the builder was already premium) on attempts that won't change the outcome, and wastes human escalation bandwidth (if the builder was standard) on problems that a higher-capability model could have resolved.

The deeper principle: **the tier of the agent is the escalation mechanism.** A problem that a standard-tier agent cannot solve in two tries is not a problem that a third standard-tier try will resolve — it is a problem that warrants premium compute. A problem that a premium-tier agent cannot solve in two tries is not a problem that any amount of compute will resolve — it requires human judgement.

### Generic tier model

The MABP should express all model references in capability tiers, not provider names or version strings. The team fills each tier with whatever model their chosen provider offers at that capability level.

| Tier | Capability profile | Cost profile | When to use |
| --- | --- | --- | --- |
| **Economy** | Fast, low context, good at mechanical and deterministic tasks | Lowest | Pre-fire audit execution, status reads, log parsing, boilerplate scaffolding, config-only chunks, file searches, `BUILD_STATUS.md` updates |
| **Standard** | Strong reasoning, large context, good at implementation | Medium | Writing code, running tests, standard analysis, most builder and QA work |
| **Premium** | Highest reasoning, best at complex design and judgment calls | Highest | Architecture decisions, BLOCKER resolution, escalated builder attempts, advisor role, complex chunk design |

Current provider examples (not normative — update as models evolve):
_Economy_: Haiku-class. _Standard_: Sonnet-class. _Premium_: Opus-class.

The MABP never names a specific model. It names a tier. Teams running on non-Anthropic providers map their own models to these tiers.

**When to start a builder at Economy tier:** A chunk qualifies for an economy-tier builder when it has no design decisions — the output is fully determined by the spec. Examples: a chunk that generates boilerplate files from a template, applies a pre-defined migration, or makes only configuration changes. If any part of the chunk requires the builder to choose between approaches, it is not an economy-tier chunk.

### Change 1 — Task-proportionate tier selection for the architect

The architect session tier is selected based on the nature of the work being opened, not defaulted to premium:

| Architect task | Tier |
| --- | --- |
| `BUILD_STATUS.md` update, status sync, log parsing | Economy |
| Opening a session to build a straightforward implementation chunk | Standard |
| Opening a session for a cross-chunk cohesion review (B-014 Change 4) | Standard |
| Fix-prompt drafting for a simple revision | Standard |
| Opening a session to resolve a BLOCKER or redesign a chunk | Premium |
| Invocation drafting for a complex chunk with non-obvious design decisions | Premium |
| Spawning the Advisor role (three-tier pattern, objective failure only) | Premium |

The default for routine build sessions is **Standard**. Economy is appropriate for pure mechanical tasks where the architect is reading and writing structured state, not reasoning about design. Premium is reserved for sessions where the architect is doing design work or resolving something that proved beyond standard capability. When in doubt, start Standard.

### Change 2 — Model-escalation iteration budget

Replace the flat 3-attempt rule with a tiered escalation ladder. The builder's starting tier determines the ladder. The principle: Economy failure signals "needs more capability" — step up immediately. Standard and Premium failure might be noise — allow one same-tier retry before stepping up.

**Economy-tier builder** (mechanical chunks with no design decisions):

| Attempt | Tier | Rationale |
| --- | --- | --- |
| 1 | Economy | First pass |
| 2 | Standard | Economy failure = task needs reasoning, not just execution — step up |
| 3 | Premium | Standard failed — problem is genuinely complex |
| 4+ | BLOCKER → human | Premium failed — requires human judgement |

**Standard-tier builder** (most implementation chunks):

| Attempt | Tier | Rationale |
| --- | --- | --- |
| 1 | Standard | First pass |
| 2 | Standard | Single retry — first failure may be noise or a minor miss |
| 3 | Premium | Two standard failures = capability ceiling reached — escalate |
| 4+ | BLOCKER → human | Premium failed — requires human judgement |

**Premium-tier builder** (complex chunks, used when the architect judges design risk is high from the outset):

| Attempt | Tier | Rationale |
| --- | --- | --- |
| 1 | Premium | First pass |
| 2 | Premium | Single retry at same tier |
| 3+ | BLOCKER → human | Premium twice is the maximum reasonable spend — further attempts will not change the outcome |

The economy ladder is the most complete: three tier escalations before human. The premium ladder is the shortest: premium is already the ceiling, so two attempts is the hard cap.

**QA tier follows builder's final attempt tier.** Economy chunk that passed on attempt 1 → economy QA. Chunk that escalated to premium on attempt 3 → premium QA. The reviewer's capability should match the complexity level that was required to produce the work.

**The signal.** Economy failure = capability mismatch (step up, no retry). Same-tier failure twice = tier ceiling (escalate). Premium failure = beyond compute (human). These are signals, not penalties — the ladder is how the process learns what a chunk actually requires.

### What this changes vs B-014 Change 5

B-014 Change 5 addressed structural shortcuts taken under iteration pressure. B-015 supersedes it with a more complete approach: the iteration budget rule changes such that structural shortcuts are less tempting because the model is upgraded before the attempt budget runs out. The rule from B-014 Change 5 — "structural shortcuts under budget pressure are automatically blocking" — is preserved and incorporated into the B-015 escalation ladder: if a standard builder on attempt 2 is tempted by a structural shortcut, the correct action is to declare a BLOCKER and trigger escalation to premium, not to take the shortcut and mark it advisory.

### Relationship to B-003

B-003 (agent team delivery) addresses tiered orchestration for DOS-native deliveries — the three-tier Haiku/Sonnet/Opus pattern for running briefs. B-015 addresses tiered orchestration for the MABP build process itself. They share the same underlying principle (match compute cost to task complexity) but apply to different layers: B-003 applies to what DOS delivers; B-015 applies to how DOS is built.

Both B-003 and B-015 should use the same generic tier language. When B-003 is implemented, the tier definitions from B-015 should be shared rather than duplicated.

**Success signal:** A MABP build log shows standard-tier sessions for routine chunks and premium-tier sessions only for complex or escalated work. A chunk that required escalation to premium shows in `BUILD_STATUS.md` with a `Tier escalated:` note. No specific model names appear in the MABP document — only tier labels.

**Implementation note:** B-015 is a document edit. It should be implemented in the same O-track session as B-013 and B-014, since all three edit `docs/MULTI_AGENT_BUILD_PROCESS.md` and the changes are interdependent.

**Session tag when picked up:** Same O-track session as B-013 and B-014.

---

## § B-016 — MABP: evidence manifest and adversarial QA verification

**Status:** Backlogged
**Priority:** 🔴 High
**Applies to:** `docs/MULTI_AGENT_BUILD_PROCESS.md`

### The fabrication flaw

Builder agents produce confident prose stating that work is done. QA agents read that prose and reason about whether it sounds plausible. Neither side is required to execute verification commands and show verbatim output. The result: a builder can fabricate completion; a QA agent anchored on the builder's confident narrative can confirm it. Tests that were never run appear as "passed." Functions that were never written appear as "implemented."

The root cause: **both sides are reasoning about claims rather than producing ground-truth evidence.** Agent prose can lie. Tool output cannot.

### Four targeted changes

#### Change 1 — Builder evidence manifest (Cycle 2)

Before closing the builder report, the builder must append an evidence manifest — one row per done-criterion item:

| Artifact | Verification command | Output (first 3 lines) |
| --- | --- | --- |
| function X exported | `grep -r "export function X" src/` | `src/foo.ts:12: export function X` |
| tests pass | `npm test 2>&1 \| tail -5` | `378 passing (2s)` |

Verbatim output only — no paraphrase, no summary. Missing manifest = architect rejects without reviewing code. The manifest is not a narrative: it is a table of commands run and their exact outputs.

#### Change 2 — QA adversarial default (Cycle 5, Pass 1)

QA's default stance shifts from "let me verify this was done" to "**FAILED until evidence proves otherwise**." QA does not read the builder report in Pass 1. It runs every verification command independently and records verbatim output in its own evidence manifest (same table format as the builder manifest). The builder report is read only in Pass 2 for reconciliation.

#### Change 3 — Architect spot-check (Section 6, Step 7)

After QA returns and before the architect recommends a verdict, the architect re-runs 2–3 rows from the QA evidence manifest verbatim. If any spot-check fails, the QA verdict is rejected and QA re-fires with a note on which rows failed. The spot-check is a direct re-execution, not a review of QA's claims.

#### Change 4 — Verdict gating

The mandatory 4-line verdict block is extended to require evidence manifest coverage:

```text
Chunk: NN
QA report: <abs path>
Builder report reviewed: <abs path> (v<K>)
Verdict: approve | revise | escalate
Evidence manifest: <N rows — every done criterion covered>
QA-only findings (not in builder hot spots): <list or 'none'>
```

A verdict block missing the evidence manifest line is invalid. The architect rejects it without reading the verdict.

### Why this closes the fabrication loop

The builder manifest prevents fabrication at source: the builder must run the commands and paste the output. If the output is fabricated, the architect's spot-check catches it — the architect re-runs the same command and gets a different result. If the builder genuinely ran the commands, the spot-check passes. QA's adversarial default means even a builder who produced a real manifest cannot influence QA's independent pass — QA starts from "FAILED" and builds to "passed" using its own command outputs, not the builder's.

### Relationship to B-013 and B-014

B-013 adds structural quality criteria (what to verify). B-014 adds process discipline (how to run the audit). B-016 adds evidence requirements (how to prove the verification happened). All three address different layers of the same root cause: agents optimising for the appearance of completion rather than completion itself.

**Success signal:** A builder report has an evidence manifest table with verbatim command outputs. QA's report has its own independent manifest. The architect spot-checks 2–3 rows and records the results. The verdict block has 6 lines, not 4. A fabricated completion (test output pasted without running) fails the spot-check and triggers a QA re-fire.

**Implementation note:** B-016 is a document edit. It should be implemented in the same O-track session that applies B-013/B-014/B-015 changes, since all four edit `docs/MULTI_AGENT_BUILD_PROCESS.md`.

**Session tag when picked up:** Same O-track session as B-013, B-014, and B-015.
