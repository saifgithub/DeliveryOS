# Product Requirements Document

## DeliveryOS

### AI-Native SDLC Memory and Orchestration Harness

**Version:** 0.3
**Supersedes:** v0.2 (and v0.1, deprecated at `docs/deprecated/PRD-v0.1.md`)
**Key v0.3 change:** Lifecycle is now 4 default stages plus a configurable library of mid-stages. Discovery decides which mid-stages a project actually needs.
**Product type:** Public proof-of-work prototype
**Primary objective:** A structured SDLC memory and orchestration harness that prepares, governs, and records work performed by external AI coding harnesses
**Primary audience:** AI companies, AI infrastructure teams, developer platform teams, agentic AI teams, technical product leaders, engineering leaders
**Primary user:** A solo builder, technical founder, product manager, solution architect, or small team using AI coding harnesses to build software

---

## 0. Architectural Correction (v0.2)

**DeliveryOS is not an AI coding agent and does not generate or execute code directly.**

DeliveryOS is a meta-harness: a structured SDLC memory and orchestration layer around external AI coding harnesses such as Claude Code, Codex, Cursor, Replit, Lovable, and local coding agents.

The product positioning is layered:

| Layer          | Product examples              | Role                                                                 |
| -------------- | ----------------------------- | -------------------------------------------------------------------- |
| Model          | GPT, Claude, Gemini, DeepSeek | Reasoning and generation                                             |
| Coding harness | Claude Code, Codex, Cursor    | Repo access, tool use, edit/run/test loop                            |
| DeliveryOS     | This product                  | SDLC structure, memory, artefacts, context, validation, traceability |

The thesis: the winning products are not raw models, they are harnesses. DeliveryOS is the SDLC-level harness above the coding harnesses.

---

## 1. Executive Summary

DeliveryOS turns raw software intent into verified Execution Briefs for AI coding agents, then preserves the memory, validation, and release evidence around their work.

A user can begin with only a rough idea. DeliveryOS conducts a structured AI-led discovery interview, converts the conversation into a formal PRD, expands the PRD through specialist AI review, supports analysis and solution design, builds structured project memory, generates test-first validation artefacts, packages an Execution Brief for the chosen coding harness (Claude Code, Codex, Cursor, etc.), captures the result, verifies it against the test specification, and produces release evidence.

The core principle:

The model is not the product. The harness around the model is the product. DeliveryOS applies that idea one level higher: it is a harness around the software delivery lifecycle itself.

---

## 2. Product Vision

AI coding agents know how to change code. DeliveryOS helps decide what should be changed, why, under which constraints, how it should be tested, and what evidence proves it worked.

Current AI coding tools are powerful at the moment of execution, but the work around them is fragile because memory and context are scattered across:

- chat history
- README files
- code comments
- PRDs
- prompts
- terminal output
- Git commits
- human memory

DeliveryOS provides the missing layer: structured project memory plus a clean handoff to whatever coding harness the user prefers.

The user chooses where AI leads and where humans must approve. DeliveryOS preserves the artefacts.

---

## 3. Core Positioning

**Product statement**

DeliveryOS is a structured SDLC memory harness that turns raw software intent into verified Execution Briefs for AI coding agents.

**Alternative product statement**

DeliveryOS manages the memory, context, validation, and release evidence around Claude Code, Codex, Cursor, and other AI coding harnesses.

**Tagline**

A harness around your harness.

**Alternative tagline**

From raw idea to verified release, with memory that survives every session.

**Key message**

Claude Code and Codex are valuable because they combine model, tools, repo access, terminal execution, file editing, instructions, and review loops. DeliveryOS applies the same idea at the SDLC layer: structured memory, context preparation, execution briefs, result capture, and verification, all around the existing coding harnesses you already use.

---

## 4. Problem Statement

AI coding harnesses can generate software quickly, but they do not preserve the structure around the work.

A user may have:

- product ideas in chat history
- requirements in documents
- design decisions in conversations
- architecture notes in separate files
- AI prompts scattered across tools
- generated code in an IDE
- tests written later, if at all
- no clear evidence linking requirements to implementation
- no memory carried from one agent session to the next

This creates AI-assisted delivery chaos.

The user may not know:

- whether the product idea was properly analysed
- whether the PRD reflects the original intent
- whether security, compliance, UX, data, and architecture were reviewed
- whether the coding harness used the correct context
- whether the implementation matched the requirements
- whether tests were designed before code
- whether the final release is traceable to approved requirements

DeliveryOS solves this by maintaining structured memory across the lifecycle and preparing controlled Execution Briefs for the harness that actually edits the code.

---

## 5. Product Goals

**Goal 1: Start before the PRD**

The user should be able to begin with only a rough idea. DeliveryOS should conduct an AI-led discovery interview and gradually form structured product artefacts.

**Goal 2: Convert conversation into PRD**

The system should turn discovery conversations into a structured PRD with clear goals, users, requirements, assumptions, risks, constraints, and success criteria.

**Goal 3: Expand the PRD through specialist AI roles**

Different AI specialists should review and expand the PRD from their discipline (Product, Business Analyst, Solution Architect, Security, Compliance, UX, Data, QA, DevOps, Cost/Operations).

**Goal 4: Maintain structured project memory**

DeliveryOS should maintain a typed memory graph (Intent, Requirement, Design, Codebase, Execution, Result, Verification, Release) that persists across sessions and harnesses.

**Goal 5: Produce Execution Briefs, not raw prompts**

DeliveryOS should generate Execution Briefs (controlled handoff packages) rather than casual prompts, and should format them according to the target harness (Claude Code, Codex, Cursor, etc.).

**Goal 6: Capture results from external harnesses**

DeliveryOS should capture what the coding harness actually did (changed files, tests run, errors, deviations) and link it back to the requirement.

**Goal 7: Build validation from the beginning**

Every requirement should have verification criteria before build begins. The system should follow a test-first mindset.

**Goal 8: Preserve traceability**

DeliveryOS should maintain links from original user intent through to release evidence, via every intermediate artefact.

---

## 6. Non-Goals

DeliveryOS is not trying to be:

- a Jira clone
- a Kanban board
- a code editor
- an IDE
- a model provider
- a chatbot wrapper
- a full DevOps platform
- a replacement for GitHub
- a replacement for Cursor, Replit, Lovable, Claude Code, GitHub Copilot, or Codex
- a coding agent of its own

DeliveryOS is the structured SDLC layer that prepares work for, and records work from, those coding harnesses.

---

## 7. Target Users

### 7.1 Primary User: AI-native solo builder

A person building software using AI coding harnesses but needing discipline and structure. They may use Claude Code, Codex, Cursor, Replit, Lovable, ChatGPT, Claude, Gemini, or local LLMs.

Pain points: ideas move too fast, context gets scattered, requirements are vague, AI produces code before the design is ready, tests are an afterthought, hard to remember what was approved, hard to carry memory between agent sessions.

### 7.2 Secondary User: Technical product manager

A product person who wants to turn ideas into structured, AI-ready delivery artefacts and hand them off cleanly to whoever (or whatever) builds them.

### 7.3 Secondary User: Solution architect

A technical leader who wants AI to respect approved architecture and design decisions, and who wants those decisions to persist across agent sessions.

### 7.4 Secondary User: AI company hiring manager

Not a product user, but an important audience for the public prototype. They should see DeliveryOS and recognise sophisticated thinking about agent harnesses, memory, context engineering, and SDLC integration.

---

## 8. Core Product Principle

AI-generated software work must be discoverable, analysable, designable, testable, reviewable, and traceable, and the memory of that work must survive between agent sessions and harnesses.

---

## 9. Core Lifecycle (v0.3: 4 default stages + configurable mid-stages)

DeliveryOS has four default stages. Every project runs through all four:

```text
1. DISCOVER     (raw idea → interview → draft PRD → configuration)
        ↓
2. DEFINE       (requirements → design → test spec → execution brief)
        ↓
3. EXECUTE      (handoff to external coding harness → result capture)
        ↓
4. VERIFY       (verify against tests → memory update → release evidence)
```

Inside each default stage, the user (or the discovery interview, on the user's behalf) may add optional mid-stages from a stage library. Mid-stages are real stages with their own artefacts, gates, and verification criteria, not just checklist items. They are added only when the project actually needs them.

```text
DISCOVER ──┬─→ DEFINE ──┬─→ EXECUTE ──┬─→ VERIFY
           │            │             │
           │            ▼             │
           │   [Security Review]      │
           │   [Compliance Review]    │
           │   [Legal Sign-off]       │
           │   [Privacy/Data Review]  │
           │   [UX Review]            │
           │   [Architecture Review]  │
           │   [Accessibility Review] │
           │   [Cost / Ops Review]    │
           │                          ▼
           │                  [Pre-release sign-off]
           │                  [Post-deploy validation]
```

This is the central v0.3 mechanic. A solo builder building a weekend tool runs the four-stage default and ships. A team building a regulated product runs the same four stages with Legal, Compliance, Security, and Privacy mid-stages slotted in, each with its own gate. One product, two extremely different weights, driven by the project's actual requirements.

See `docs/architecture/stage-configuration.md` for the full stage library and the discovery questions that trigger each mid-stage.

---

## 10. SDLC Stages

### 10.0 Mapping v0.2 stages onto the v0.3 four-stage model

The granular v0.2 stages (Raw Idea, Discovery Interview, Draft PRD, Specialist Expansion, Consolidated PRD, Requirement Analysis, Solution Design, Codebase Memory Preparation, Test Specification, Harness-Based Execution, Result Capture, Verification, Memory Update, Release Evidence) are not deleted. They become sub-steps inside the four default stages:

- **DISCOVER** contains: Raw Idea, Discovery Interview, Draft PRD, Stage Configuration.
- **DEFINE** contains: Specialist Expansion (only the specialists the project actually needs), Consolidated PRD, Requirement Analysis, Solution Design, Codebase Memory Preparation, Test Specification, Execution Brief generation.
- **EXECUTE** contains: Handoff via `.deliveryos-handoff/`, External Coding Harness work, Result Capture.
- **VERIFY** contains: Verification against test spec, Memory Update, Release Evidence.

The detailed sub-step descriptions from v0.2 are unchanged and described in `docs/deprecated/PRD-v0.1.md` and in the architecture references. Below are the updated and new stages with the configurable-mid-stage mechanic applied.

### 10.8 Stage 8: Codebase Memory Preparation (renamed from "Context Preparation")

Before handoff to a coding harness, DeliveryOS prepares structured memory that the harness can consume directly.

Inputs collected:

- approved PRD sections
- relevant requirements
- design decisions
- architecture notes
- database schema
- existing code references
- coding standards and test commands
- API contracts
- security constraints
- known defects and excluded context

If an existing codebase is connected, DeliveryOS compares the planned change against current folder structure, components, APIs, schema, naming conventions, dependencies, and prior decisions.

Output:

- Codebase Memory entry (see Memory Types in section 12.X)
- impact summary
- missing context warnings

### 10.10 Stage 10: Harness-Based Execution (replaces "AI-Assisted Implementation")

DeliveryOS does not generate or execute code. It produces an Execution Brief for the chosen external coding harness.

The Execution Brief is a structured handoff package (see section 18.X for the schema) that contains:

1. Objective
2. Approved requirement
3. Business intent
4. Approved design context
5. Existing codebase context
6. Test-first specification
7. Allowed changes
8. Forbidden changes
9. Expected output format
10. Completion criteria

The user routes the Execution Brief into Claude Code, Codex, Cursor, Replit, Lovable, or another coding harness. Three handoff modes are supported (see section 18.Y).

The system records:

- target harness
- harness profile used
- execution brief content
- date and time
- context package used
- expected outputs

Output:

- Execution Memory entry
- Result Capture template ready to receive the harness output

### 10.11 Stage 11: Result Capture

The output from the external coding harness is captured back into DeliveryOS, either through paste, file ingestion from `.deliveryos-handoff/`, or (later) MCP exchange.

Captured:

- summary of changes
- changed files
- tests added or updated
- tests run and results
- errors
- deviations from the brief
- harness session metadata

Output:

- Result Memory entry, linked to the Execution Brief and the originating requirement

### 10.12 Stage 12: Verification

Verification compares the captured result against the test specification and the requirement.

Checks include: did the harness satisfy the requirement, did all verification criteria pass, were tests executed, were forbidden changes respected, did the harness deviate from the brief, are any requirements partially satisfied?

Output:

- Verification Memory entry
- failed criteria
- defect list
- rework instructions
- approval or rejection decision

### 10.13 Stage 13: Memory Update

The system updates project memory based on what the harness actually did, decisions it made, and deviations.

Update targets: Design Memory (if new decisions were made), Codebase Memory (if new files or conventions emerged), Requirement Memory (if assumptions changed).

### 10.14 Stage 14: Release Evidence

When work is complete, DeliveryOS captures release evidence: approved requirement, design reference, codebase memory snapshot, execution brief, harness identity, result, verification, human approval, release notes, known limitations, deferred items.

---

## 10.X Stage Configuration (new in v0.3)

During DISCOVER, the AI interview asks targeted questions whose answers determine which mid-stages are added to the project. The user can also add or remove mid-stages manually at any time. Each mid-stage is a real stage with its own artefacts and a gate that blocks progression until satisfied.

### Mid-stage library (MVP set)

Each entry below is a configurable stage. The trigger column lists the discovery answers that auto-suggest it.

| Stage                    | Trigger (discovery answer)                                              | Gate produces                            |
| ------------------------ | ----------------------------------------------------------------------- | ---------------------------------------- |
| Security Review          | "handles user data", "exposes APIs", "auth required"                    | Security verification criteria + sign-off |
| Privacy / Data Review    | "stores PII", "processes personal data"                                 | Data classification + retention policy   |
| Compliance Review        | "regulated industry (health/finance/gov)", "SOC 2", "HIPAA", "GDPR"     | Compliance checklist + audit notes       |
| Legal Sign-off           | "external publish", "customer-facing contracts", "third-party data"     | Legal approval record                    |
| UX Review                | "customer-facing", "multi-step user flow"                               | UX flow review + usability checklist     |
| Accessibility Review     | "public-facing", "regulated accessibility (WCAG, ADA)"                  | Accessibility checklist                  |
| Architecture Review      | "multi-service", "scale matters", "touches core systems"                | Architecture decision record (ADR)        |
| Cost / Ops Review        | "production deploy", "cost-sensitive", "high-traffic"                   | Cost estimate + ops runbook              |
| Pre-release Sign-off     | "external release", "customers will see this"                           | Release approval record                  |
| Post-deploy Validation   | "production traffic", "live data dependency"                            | Live verification result                 |

Profiles can also be saved. For example: "Regulated SaaS Default" might include Security, Privacy, Compliance, Legal, Pre-release Sign-off, and Post-deploy Validation. The user picks a profile at project creation and tweaks from there.

### Default = four stages only

If discovery does not surface any of the triggers above, the project runs the four-stage default with no mid-stages. This is the path most solo builders will take. The product does not feel heavy unless the project warrants it.

### Adding stages mid-project

Mid-stages can be added after the project has started. Example: a feature originally scoped as internal becomes customer-facing. The user (or AI) flags the change, DeliveryOS proposes adding UX Review and Pre-release Sign-off, the user accepts, and those stages slot in before EXECUTE proceeds.

### Why this mechanic matters

It collapses the "solo builder vs regulated enterprise" tension into one product. Both users see four stages on the homepage. Only one of them sees Legal and Compliance gates inside DEFINE, because their project actually needs them. Nothing is ceremony, every gate has a reason it exists.

## 11. Operating Modes

Unchanged from v0.1: Human-Led, AI-Assisted, AI-Led. Each configurable mid-stage can be set to a different operating mode. A team might run Architecture Review in Human-Led mode while Security Review runs in AI-Assisted mode.

---

## 12. Core Objects

### 12.X Memory Types

DeliveryOS maintains a typed memory graph. Each type is a first-class object.

**Intent Memory** — what the user originally wanted. Stores raw idea, discovery answers, problem statement, user goals, non-goals, success criteria.

**Requirement Memory** — what the system agreed to build. Stores requirements, assumptions, constraints, priorities, verification criteria.

**Design Memory** — how the system should be built. Stores architecture decisions, data model, API design, security design, UX flows, tradeoffs, rejected options.

**Codebase Memory** — what already exists. Stores folder structure, key files, components, database schema, APIs, coding conventions, test commands, known defects.

**Execution Memory** — what the coding harness was asked to do. Stores execution brief, target harness, harness profile, date and time, context package, expected outputs.

**Result Memory** — what actually happened. Stores output from the harness, changed files, tests run, errors, reviewer notes, deviations from the plan.

**Verification Memory** — whether the work passed. Stores test result, failed criteria, defects, rework notes, approval decision.

**Release Memory** — what was released and why. Stores release evidence, known limitations, deferred items, final sign-off.

The memory graph is the product. Every other artefact derives from it or feeds it.

### 12.Y Execution Brief

A controlled handoff package for an external coding harness. See section 18.X for full schema.

### 12.Z Execution Harness Profile

A profile that defines how an Execution Brief should be rendered for a specific coding harness. Includes target file paths, instruction conventions, and harness-specific guidance.

The other core objects (Project, Discovery Record, PRD, Specialist Expansion, Requirement Item, Design Artefact, Test Specification, Verification Result, Release Evidence Package) are unchanged from v0.1, with the exception that the "Implementation Artefact" object is removed and replaced by Execution Brief plus Result Capture.

---

## 13. Functional Requirements (deltas from v0.1)

The v0.1 functional requirements remain in force, with these changes:

**FR15 (revised): Generate Execution Brief**

The system must generate a structured Execution Brief for the chosen target harness. The brief must include all ten sections defined in section 18.X.

Priority: Must have

**FR16 (revised): Capture Harness Result**

The user must be able to paste, upload, or ingest from a handoff directory the result returned by the external coding harness. The system must parse summary of changes, file list, test results, and deviations.

Priority: Must have

**FR21 (new): Select Execution Harness Profile**

The user must be able to choose a target harness profile (Claude Code, Codex, Cursor, Generic). The Execution Brief must be rendered according to the chosen profile.

Priority: Must have

**FR22 (new): File-based handoff**

The system must be able to write a `.deliveryos-handoff/` directory containing execution-brief.md, context-package.md, test-specification.md, verification-checklist.md, and memory-summary.md.

Priority: Must have

**FR23 (new): Memory persistence**

The system must maintain a typed memory store (the eight memory types in section 12.X) that persists between sessions and is queryable by the user and by the system.

Priority: Must have

**FR24 (new): Memory update on result capture**

When a Result is captured and verified, the system must update Design, Codebase, and Requirement memories where applicable, and record the change in an audit log.

Priority: Should have

**FR25 (new, future): MCP server mode**

In a later release, DeliveryOS may expose its memory graph through an MCP server, so that Claude Code or other MCP-capable harnesses can query approved requirements, design decisions, test specifications, and constraints directly.

Priority: Future phase

**FR26 (new in v0.3): Configurable Stage Library**

The system must maintain a library of mid-stages (Security, Privacy, Compliance, Legal, UX, Accessibility, Architecture, Cost/Ops, Pre-release Sign-off, Post-deploy Validation, plus user-defined). Each mid-stage has a defined gate and produces a defined artefact.

Priority: Must have

**FR27 (new in v0.3): Discovery-driven stage suggestion**

During the discovery interview, the system must ask trigger questions and propose appropriate mid-stages based on the answers. The user must be able to accept, reject, or modify the proposal.

Priority: Must have

**FR28 (new in v0.3): Add or remove stages mid-project**

The user must be able to add or remove mid-stages after the project has started. The system must record the reason, the timestamp, and re-route any in-flight work through the updated stage list.

Priority: Should have

**FR29 (new in v0.3): Stage profiles**

The user must be able to save and apply named stage profiles (e.g., "Solo Default", "Regulated SaaS", "Internal Tool", "Open Source Library").

Priority: Should have

---

## 14. Non-Functional Requirements

Unchanged from v0.1. Add:

**NFR8: Harness Neutrality**

DeliveryOS must not lock the user to a single coding harness. Profile support is mandatory for at least Claude Code, Codex, and a Generic profile in MVP. Cursor and others as fast follows.

**NFR9: Memory Durability**

The memory graph must survive app restarts and project re-opens. Local-first storage is required for MVP.

---

## 15. MVP Scope

**MVP must include**

- project creation
- raw idea capture
- AI discovery interview prompts (manual mode)
- discovery-driven mid-stage suggestion (FR27)
- configurable stage library with at least the MVP mid-stages listed in section 10.X
- discovery summary
- PRD generation
- PRD editor
- specialist expansion (BA, Architect, Security, QA only)
- PRD consolidation
- requirements catalogue with verification criteria
- the eight memory types as first-class storage
- Codebase Memory preparation
- test specification generation
- Execution Brief generation
- harness profile selection (Claude Code, Codex, Generic)
- file-based handoff via `.deliveryos-handoff/`
- result capture (paste mode)
- verification summary
- memory update on verification
- release evidence export

**MVP should not include**

- direct API calls to OpenAI, Anthropic, or other model providers
- direct code execution
- MCP server mode
- GitHub write integration
- billing, auth, enterprise permissions
- real-time collaboration
- mobile app

---

## 16. MVP User Journey

In v0.3, the user journey starts the same way as v0.2 but adds a stage configuration step inside DISCOVER. After the AI captures the raw idea and runs the interview, it asks the trigger questions in section 10.X. Based on the answers, DeliveryOS proposes a set of mid-stages.

Example for a solo internal tool:
- "Will this touch user data?" → "Yes, but only internal team data."
- "Is this customer-facing?" → "No."
- "Any regulated industry?" → "No."

Proposed mid-stages: none. The project runs the four-stage default.

Example for a customer-facing healthtech feature:
- "Will this touch user data?" → "Yes, patient data."
- "Is this customer-facing?" → "Yes."
- "Any regulated industry?" → "Yes, HIPAA."

Proposed mid-stages: Privacy/Data Review, Compliance Review, Security Review, Legal Sign-off, Pre-release Sign-off, Post-deploy Validation. The user accepts. Each mid-stage now has a gate that blocks progression to the next default stage until satisfied.

The rest of the v0.2 user journey is retained through Step 9 (test specification). After that:

**Step 10: DeliveryOS generates an Execution Brief**

The user selects a target harness profile (e.g., Claude Code). DeliveryOS renders the brief using that profile's conventions.

**Step 11: File-based handoff**

DeliveryOS writes `.deliveryos-handoff/` into the project repo containing the execution brief, context package, test specification, verification checklist, and memory summary.

**Step 12: External harness execution**

The user invokes Claude Code (or Codex / Cursor / etc.) and instructs it to read `.deliveryos-handoff/current-execution-brief.md` and execute only that work. For harnesses with their own conventions (AGENTS.md, CLAUDE.md), DeliveryOS can also produce a suggested update to those files.

**Step 13: Result capture**

The user pastes the harness's summary into DeliveryOS, or DeliveryOS ingests a `result.md` from the handoff directory.

**Step 14: Verification**

DeliveryOS compares the captured result against the test specification and verification criteria.

**Step 15: Memory update**

Design, Codebase, and Requirement memories are updated to reflect what happened.

**Step 16: Release evidence**

DeliveryOS exports a package showing: Idea → Discovery → PRD → Requirements → Design → Memory → Tests → Execution Brief → Harness → Result → Verification.

---

## 17. AI Execution Roles

Unchanged from v0.1, with one rename: "Implementation Assistant" becomes **Execution Brief Author**, whose only job is to produce a well-formed Execution Brief for the selected harness. The brief is then handed to the external coding harness, which is treated as the actual implementer.

---

## 18. Execution Briefs and Handoff

### 18.X Execution Brief schema

```md
# DeliveryOS Execution Brief

## 1. Objective
Describe exactly what the AI coding harness must accomplish.

## 2. Approved Requirement
Link to the requirement and include the approved requirement text.

## 3. Business Intent
Explain why this requirement exists.

## 4. Approved Design Context
Include relevant architecture, API, data model, UX and security notes.

## 5. Existing Codebase Context
Include relevant files, folder structure, conventions and known constraints.

## 6. Test-First Specification
List verification criteria and tests that must be satisfied.

## 7. Allowed Changes
Define what the coding harness may change.

## 8. Forbidden Changes
Define what it must not touch.

## 9. Expected Output
Ask for:
- summary of changes
- files changed
- tests added or updated
- tests run
- risks
- unresolved questions

## 10. Completion Criteria
Define what must be true before the work is considered complete.
```

### 18.Y Handoff modes

**Mode 1: Manual copy-paste.** DeliveryOS renders the brief, user copies it into the harness, pastes the result back. Simplest MVP, low integration cost.

**Mode 2: File-based handoff.** DeliveryOS writes a `.deliveryos-handoff/` directory (dotfile, workspace-relative) into the user's repo:

```text
.deliveryos-handoff/
  current-execution-brief.md          # regenerated each session
  current-context-package.md          # regenerated each session
  current-test-specification.md       # regenerated each session
  current-verification-checklist.md   # regenerated each session
  memory-summary.md                   # regenerated each session
  result.md                           # written back by the harness or the user
  history/
    <timestamp>-execution-brief.md    # committed audit trail
    <timestamp>-result.md             # committed audit trail
```

The `current-*` files are working files, regenerated on every session (typically gitignored). The `history/<timestamp>-*` snapshots are the committed audit trail — they resolve the tension between auditability (success criterion in § 24) and diff noise. This mirrors how Claude Code itself splits `CLAUDE.md` (shared) from `CLAUDE.local.md` (user-only). The dotfile root (`.deliveryos-handoff/`) matches `.vscode/`, `.claude/`, `.codex/` — the conventional shape for tool sidecars.

The user instructs the harness: "Read .deliveryos-handoff/current-execution-brief.md and execute only that work." Codex reads AGENTS.md, Claude Code reads CLAUDE.md, both can be pointed at the handoff directory by convention or by an entry in their respective config files.

**Mode 3: MCP server (future).** DeliveryOS exposes memory through MCP so harnesses can query approved requirements, design decisions, and constraints in-session. Not in MVP.

### 18.Z Execution Harness Profiles

Each profile customises the rendering of the Execution Brief.

**Claude Code Profile.** Outputs an Execution Brief, a suggested CLAUDE.md update, and a file-based handoff. Later: MCP-compatible memory exposure.

**Codex Profile.** Outputs an Execution Brief plus a suggested AGENTS.md update. Includes repo-local context files and explicit test/build commands.

**Cursor Profile.** Outputs a concise implementation-style prompt, a target file list, an expected patch, and a test checklist.

**Replit/Lovable Profile.** Outputs a product-level build prompt with UI behaviour, constraints, and verification checklist.

**Generic Profile.** A harness-agnostic markdown brief usable in any chat-based AI tool.

---

## 19. Public Demo Scenario

Unchanged from v0.1: Bug Triage Assistant. With the v0.2 architecture, the demo additionally shows DeliveryOS producing an Execution Brief, handing off to Claude Code (or Codex) via `.deliveryos-handoff/`, capturing the result, verifying, and updating memory.

---

## 20. Differentiation (revised)

**Versus AI coding harnesses (Claude Code, Codex, Cursor).** They are execution engines. DeliveryOS is the SDLC memory and orchestration layer above them. The relationship is complementary, not competitive.

**Versus Jira or Linear.** They manage work items. DeliveryOS manages SDLC artefacts, execution briefs, memory, and traceability from intent to verified release.

**Versus Devin-style autonomous agents.** They execute. DeliveryOS defines, prepares, governs, validates, and records what they execute.

**Versus AGENTS.md / CLAUDE.md alone.** Those files are static instruction surfaces. DeliveryOS maintains the structured memory and traceability that produces and updates those files, and adds the verification and release evidence layer underneath.

---

## 21. Key Screens

Mostly unchanged from v0.1. Renamed and added:

- **Memory Workspace** (deferred post-MVP): browse Intent, Requirement, Design, Codebase, Execution, Result, Verification, Release memories. The trimmed MVP relies on the canonical SQLite store plus per-stage tree-view rows surfacing each artefact under its parent stage; the dedicated Memory Workspace panel lands in a later build.
- **Execution Brief Composer** (renamed from Implementation Capture): renders the brief, lets the user pick the harness profile, exports the handoff directory.
- **Harness Profile Manager** (new): edit Claude Code / Codex / Cursor / Generic profiles.
- **Result Capture** (new): paste or import the harness output, link to brief, compute diff against expected output.

---

## 22. Prompt and Brief Structure

The generic prompt format from v0.1 (Role, Objective, Project Context, Approved Inputs, Your Task, Output Format, Rules) is retained for specialist AI work (discovery, BA review, security review, etc.). The Execution Brief schema in section 18.X is used for handoff to the external coding harness and is distinct from the specialist prompts.

---

## 23. Example: Execution Brief for Claude Code

```md
# DeliveryOS Execution Brief
## Profile: Claude Code
## Project: Bug Triage Assistant
## Requirement: REQ-002 — Bug submission API

## 1. Objective
Implement a POST /bugs endpoint that accepts a bug report payload and persists it.

## 2. Approved Requirement
Users must be able to submit a bug report containing title, description,
severity suggestion, screenshot URL, and affected module.

## 3. Business Intent
Capturing structured bug reports is the prerequisite to AI-assisted triage.

## 4. Approved Design Context
- Backend: FastAPI service in src/backend/api/
- Data: bug_reports table (see Codebase Memory)
- Auth: bearer token, validated against existing middleware
- Storage: PostgreSQL via existing repository pattern

## 5. Existing Codebase Context
- Repo layout: src/backend/api/, src/backend/models/, src/backend/services/
- Convention: route handlers thin, business logic in services
- Existing pattern: see src/backend/api/users.py
- Test runner: pytest -q
- Lint: ruff check .

## 6. Test-First Specification
- POST /bugs with valid payload returns 201 and persists row
- POST /bugs with missing title returns 422
- POST /bugs without auth returns 401
- POST /bugs persists severity_suggestion as enum

## 7. Allowed Changes
- src/backend/api/bugs.py (new)
- src/backend/models/bug_report.py (new)
- src/backend/services/bug_report_service.py (new)
- tests/integration/test_bugs_api.py (new)

## 8. Forbidden Changes
- src/backend/api/users.py
- migrations/ (a separate migration brief will follow)
- src/frontend/

## 9. Expected Output
Write your result summary to `.deliveryos-handoff/result.md` as structured
markdown with the following six H2 sections (in this order):

1. Summary of Changes
2. Files Changed
3. Tests Added/Updated
4. Tests Run
5. Risks
6. Unresolved Questions

Claude Code has no native result-file flag in 2026; the instruction above is
how the file gets written. For the Codex profile the equivalent command is
`codex exec -o .deliveryos-handoff/result.md "Run the brief at
.deliveryos-handoff/current-execution-brief.md"` — Codex's `-o /
--output-last-message <file>` flag writes the final assistant message to
the same path natively.

## 10. Completion Criteria
- All four test cases above pass
- ruff and mypy clean
- No changes outside the Allowed Changes list
- `.deliveryos-handoff/result.md` exists with all six sections populated
```

---

## 24. Success Criteria (revised)

DeliveryOS succeeds as a public proof-of-work if it demonstrates:

- a clear, defensible architectural thesis (meta-harness around coding harnesses)
- credible understanding of agent harnesses (Claude Code, Codex, Cursor) and how they consume context
- practical, working file-based handoff that actually drives a real harness session end to end
- a memory graph that is more than a database table, demonstrably useful between sessions
- test-first thinking applied through the Execution Brief
- strong artefact traceability from intent to release
- one complete, polished demo

The project does not need to become a commercial product. It needs to make the builder look credible to AI companies.

---

## 25. Delivery Mechanism and Technical Stack

### 25.1 Delivery Mechanism (decided v0.3)

DeliveryOS ships as a **VS Code extension, packaged as a sideloadable `.vsix` file**. It is not a fork of VS Code and not a standalone application. See `docs/decisions/0001-vsix-extension-not-fork.md` for the decision record.

Rationale in brief:

- The extension API is shared by VS Code, Cursor, Windsurf, Antigravity, and VSCodium. One `.vsix` runs in all five editors, which is the widest possible surface for a proof of work to get noticed.
- No fork means no installer, no platform code-signing certificates, no auto-update infrastructure, no maintenance of a forked codebase.
- Sideloading the `.vsix` (via `code --install-extension`, the "Install from VSIX" command, or an install script) avoids any marketplace dependency.
- It preserves the harness-neutrality thesis: DeliveryOS runs inside whatever editor and alongside whatever coding harness the user already has.

Distribution: `.vsix` published on GitHub Releases, plus an install script that detects installed editors and installs into each. OpenVSX is the fallback path if auto-update and discoverability become needed later.

Two known constraints, both minor for a prototype: sideloaded VSIX files do not auto-update (mitigated by an in-extension version check against GitHub Releases), and recent VS Code builds are tightening extension signature verification (must be tested on each target editor early).

### 25.2 Technical Stack

**Extension shell.** TypeScript VS Code extension. Native surfaces: activity-bar icon, sidebar tree view (the four stages), commands, status bar, terminal integration. The extension declares `capabilities.untrustedWorkspaces.supported: false` and `capabilities.virtualWorkspaces.supported: false` in `package.json`: DeliveryOS reads and writes `.deliveryos-handoff/` and `.deliveryos/`, runs terminals against the workspace, and reads source files for Codebase Memory — it cannot safely run on untrusted code or against virtual filesystems.

**Rich UI.** Radix UI primitives + Tailwind + Lucide React icons rendered inside Vite-built React webview panels (PRD workspace, Execution Brief composer, verification dashboard). The memory viewer / Memory Workspace key screen is **deferred post-MVP** — the canonical SQLite store + per-stage tree-view artefact rows are sufficient for the trimmed demo. `@vscode/webview-ui-toolkit` is deliberately rejected: Microsoft sunset the toolkit on 2025-01-01 (repo archived 2025-01-06). Webviews give full visual control independent of the host editor's theme. **Hybrid theming:** the DeliveryOS palette is the primary visual identity; a small set of chrome-level tokens (focus rings, panel borders, body background) is anchored to VS Code CSS variables such as `--vscode-editor-background` and `--vscode-focusBorder` so the extension reads correctly against any host theme.

**Backend logic.** Runs in the extension host (Node.js). No separate server process.

**Memory store.** `sql.js` (SQLite compiled to WebAssembly) plus a markdown documents directory, stored in the workspace under `.deliveryos/`. Rationale: a native SQLite binding such as `better-sqlite3` would be compiled against a specific Electron-Node ABI, and VS Code, Cursor, Windsurf, Antigravity, and VSCodium each ship slightly different Electron versions. A sideloaded `.vsix` cannot rebuild on the user's machine, so the matrix of prebuilt binaries explodes — historically the single biggest cause of extension breakage on editor upgrades. `sql.js` ships one `.wasm` blob, has zero ABI concerns, and is more than fast enough for the memory-graph workload. Polymorphic schema in MVP: one `memory_entries` table keyed by `type`, plus a `memory_links` edge table. The full discriminated-union types live in `contracts/src/memory.ts`.

**AI integration for MVP.** Manual mode for specialist AI work (generate prompt, user runs it in their harness, pastes back). No API calls in MVP.

**Handoff mechanism.** File-based via `.deliveryos-handoff/` written into the workspace, plus suggested updates to `CLAUDE.md` (Claude Code) and `AGENTS.md` (Codex). Terminal integration launches the chosen harness with the brief reference pre-typed.

**Future integrations.** API adapters, MCP server mode exposing the memory graph, local LLMs via Ollama, GitHub read integration for richer Codebase Memory, OpenVSX publishing for auto-update.

---

## 26. MVP Build Phases

The first build targets the **trimmed ship-well scope** (four stages, one specialist: Test Designer, two harness profiles: Claude Code and Codex, one demo: Bug Triage). The full week-by-week schedule, sized for a light pace of 5 to 10 hours per week, is in `docs/BUILD-PLAN.md`.

Phase summary:

**Phase 0: Extension skeleton.** VS Code extension scaffold, sidebar with the four stages, a working webview, memory store wired up, `.vsix` builds and sideloads into VS Code and Cursor.

**Phase 1: DISCOVER and DEFINE.** Raw idea capture, discovery interview (manual mode), PRD editor, requirements with verification criteria, the Test Designer specialist.

**Phase 2: Execution Brief and handoff.** Brief composer, Claude Code and Codex profiles, `.deliveryos-handoff/` file handoff, terminal integration.

**Phase 3: Result capture and the diff feature.** Result capture, the Allowed/Forbidden Changes diff against actual harness output, verification against test spec, memory update, release evidence export.

**Phase 4: Demo and polish.** Bug Triage demo built end to end, demo recording, README, screenshots, short writeup.

Scope deliberately deferred to a later build: the remaining MVP specialists, the full configurable stage library, all eight memory types as rich objects (the trimmed build uses a simpler subset), MCP server mode, API integration.

---

## 27. Risks and Mitigations (revised)

**Risk 1: Still feels too heavy.** Mitigation: progressive disclosure, demo only the path through one requirement end to end.

**Risk 2: Harness profiles diverge fast.** Claude Code, Codex, and Cursor change frequently. Mitigation: keep profiles as small, declarative templates; document the version they target.

**Risk 3: File-based handoff is leaky.** Agents may ignore the brief or modify forbidden areas. Mitigation: explicit Allowed/Forbidden Changes sections in the brief, post-execution diff checks during Result Capture (universal across harnesses — the load-bearing backstop). Additionally, for the **Claude Code profile**, DeliveryOS generates a `PreToolUse` hook inside a managed block in `.claude/settings.json` that reads the Forbidden list from `.deliveryos-handoff/current-execution-brief.md` and exits non-zero on any matching `Edit` / `Write` / `MultiEdit` attempt. Critically, `PreToolUse` fires *before* permission-mode checks; it cannot be bypassed by `--dangerously-skip-permissions`. This is real-time enforcement, not after-the-fact diffing. Codex has no equivalent in 2026, so the post-hoc diff remains the universal backstop on every other profile.

**Risk 4: Memory becomes write-only.** Memory entries get created but never updated. Mitigation: Stage 13 Memory Update is mandatory before release evidence.

**Risk 5: Confused with Linear/Jira.** Mitigation: lead with the harness language (Execution Brief, Result Capture, Memory) not the task language.

**Risk 6: Confused with coding tools.** Mitigation: position clearly. DeliveryOS does not run code. It prepares and records.

**Risk 7: MCP path becomes mandatory before users see value.** Mitigation: file-based handoff must be excellent on its own. MCP is upside, not table stakes.

---

## 28. Public Positioning

**Project title.** DeliveryOS: A Meta-Harness for AI-Assisted Software Delivery.

**One-line pitch.** A harness around your harness.

**Short description.** DeliveryOS is a structured SDLC memory and orchestration harness around Claude Code, Codex, Cursor, and other AI coding agents. It turns raw intent into verified Execution Briefs, captures results, and preserves the memory and release evidence around the work.

**Stronger public statement.** Claude Code and Codex are valuable because they are harnesses, not just models. DeliveryOS applies the same idea one level higher: a harness around the software delivery lifecycle itself.

---

## 29. Final Product Definition

DeliveryOS is an AI-native SDLC memory and orchestration harness that prepares, governs, and records work performed by external AI coding harnesses. It uses AI to conduct discovery, form PRDs, expand requirements, support design, build typed project memory, define validation before build, package Execution Briefs for Claude Code, Codex, Cursor, and other agents, capture results, verify against specifications, and produce release evidence.

The product's central belief:

The model is not the product. The harness is the product. DeliveryOS is the harness for the delivery lifecycle itself.
