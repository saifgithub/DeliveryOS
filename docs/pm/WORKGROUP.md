# DeliveryOS Workgroup — Product Roadmap

**Status:** Vision / pre-spec
**Created:** 2026-05-26
**Track:** P (product direction) — O-track spec sessions to follow per phase

---

## The problem

DOS in its current form models a single person moving through the SDLC: one developer writes the spec, runs the agent, captures the result, and verifies the output. That is useful. It is not how software is actually built.

Real delivery involves role separation. The person who writes the raw idea is not the person who composes the Execution Brief. The person who runs the agent is not the person who should approve their own brief. The stakeholder who wants to see progress does not have VS Code open.

Without a team model, DOS adoption has a ceiling: individual developers who are disciplined enough to follow the process solo. With a team model, DOS becomes the coordination substrate for an entire engineering organisation — the structured layer that replaces informal Slack threads, unreviewed PR descriptions, and sprint reviews that nobody writes.

That is the Workgroup initiative.

---

## The core shift

| Today (solo) | Workgroup (team) |
| --- | --- |
| One person wears all hats | Roles are explicit and separated |
| Same panel for everyone | Role-aware UI: each person sees their surface |
| Brief runs on trust | Brief requires review before it runs |
| Memory store is local | Memory store is shared and conflict-safe |
| Progress is visible only in VS Code | Progress is visible to non-developers too |
| Handoff is a conversation | Handoff is a structured state transition |

---

## Roles

Five roles cover the full delivery team. A person can hold multiple roles.

| Role | What they do in DOS |
| --- | --- |
| **Product Owner** | Writes raw ideas, answers discovery questions, approves PRDs and requirements. The spec layer is their domain. |
| **Business Analyst** | Runs elicitation sessions (B-005), refines requirements, maintains the PRD. Operates the discovery and requirements panels. |
| **Developer** | Composes Execution Briefs, runs agents, captures results. Cannot approve their own requirements or briefs. |
| **Tech Lead** | Reviews and approves briefs before they run. Owns the allowed/forbidden policy. Final gate before the agent executes. |
| **Stakeholder** | Read-only visibility: delivery dashboard, requirement status, velocity, release evidence. No edit access. |

QA is not a separate role in v1 — verification is owned by the Developer and Tech Lead jointly. It may split out in a later phase.

---

## The requirement state machine

A requirement is the unit of team coordination. Every handoff in the delivery cycle is a state transition on a requirement.

```text
draft
  │  Product Owner / BA writes and refines
  ▼
spec-ready
  │  Test spec exists; BA marks ready for development
  ▼
brief-composed
  │  Developer composes Execution Brief; submits for review
  ▼
in-review
  │  Tech Lead reviews brief; approves or returns with comments
  ▼
approved-to-run
  │  Brief locked; agent run authorised
  ▼
running
  │  Agent executing; file scope locked
  ▼
result-captured
  │  Result written to memory; diff complete
  ▼
verified
  │  Verification checklist passed; Memory Update gate completed
  ▼
released
  │  Included in Release Evidence export
```

Each transition notifies the next owner. No transition can be skipped without a recorded justification.

---

## The brief review gate

This is the single highest-value addition in Workgroup.

Today nothing prevents a developer from composing a vague brief and running it immediately. In a team, the Tech Lead must approve the brief before the agent runs. The review gate enforces this.

**Three-state brief lifecycle (extended from current two):**

- `draft` — being composed; editable
- `in-review` — submitted; locked from editing; in Tech Lead's queue
- `approved-to-run` — Tech Lead approved; agent may run

The pre-flight completeness check (B-007) runs automatically on submission. A brief that fails blocking checks cannot be submitted for review. The Tech Lead reviews briefs that have already passed the automated gate — they focus on intent and scope, not mechanical completeness.

**What the Tech Lead sees in their review queue:**

- The brief's requirement and its acceptance criteria
- The Allowed/Forbidden diff against the codebase
- The pre-flight completeness score
- The blast radius summary (B-008) — what existing tests and requirements overlap
- A comment field for returning the brief with notes

**Return path:** a returned brief goes back to `draft` with the Tech Lead's comments attached. The developer revises and resubmits. The revision count is recorded in the brief's memory entry as an audit trail.

---

## Conflict prevention

Two developers cannot have briefs in flight that overlap in file scope. DOS enforces this as a hard block, not a warning.

When a brief moves to `approved-to-run`, DOS locks the file scope defined by its Allowed glob list. Any other brief whose Allowed list intersects the locked scope cannot move to `approved-to-run` until the first run completes or is rolled back (B-009).

This is the team equivalent of B-008's blast radius check — instead of advisory, it is enforced at the state machine level.

---

## The standup view

When a team member opens DOS, they see their personal queue before anything else:

- **Pending my action:** briefs waiting for my review (Tech Lead), requirements waiting for my input (BA/PO), results waiting for me to capture (Developer)
- **In progress:** runs I own that are currently executing
- **Needs attention:** blocked items — requirements with no test spec, briefs returned with comments, failed verifications
- **Done today:** what completed since I last opened DOS

This replaces the daily standup question "what are you working on?" with a surface that answers it without a meeting.

---

## The shared memory store

**Phase 1 — repo-native (no new infrastructure):**
The `.deliveryos/` SQLite store lives in the repo, shared via git. Each developer pulls before opening DOS. Concurrent writes are prevented by the state machine: only one person has write access to a given artifact at a given time (enforced by role + state, not by file locking). Acceptable for small co-located teams committing frequently.

**Phase 2 — server-backed (team upgrade path):**
A hosted DOS store that VS Code connects to via a lightweight sync layer. Enables:

- Real-time state updates without requiring a git pull
- Non-developer access (BA, Stakeholder) via a web UI without VS Code
- Async notifications (email, Slack, webhook) on state transitions
- Cross-project visibility for tech leads managing multiple projects

The repo-native mode remains the default. Server-backed is an opt-in team upgrade, likely a paid tier.

---

## Non-developer access

The BA and Stakeholder roles cannot be expected to use VS Code. They need a web surface.

**BA web UI (Phase 2):** Discovery, PRD editing, requirements catalogue, elicitation sessions (B-005). Functionally equivalent to the VS Code panels for the spec layer. Read access to the delivery dashboard.

**Stakeholder web UI (Phase 2):** Read-only delivery dashboard. Requirements by status, velocity chart, release evidence exports. No write access, no spec visibility. The board-level view of delivery health.

---

## Notifications

Every state transition that requires action from another person fires a notification.

| Trigger | Recipient | Channel |
| --- | --- | --- |
| Brief submitted for review | Tech Lead | VS Code notification + email/Slack (Phase 2) |
| Brief approved to run | Developer | VS Code notification |
| Brief returned with comments | Developer | VS Code notification + email/Slack (Phase 2) |
| Run completed | Developer + Tech Lead | VS Code notification |
| Verification passed | Product Owner | Email/Slack (Phase 2) |
| Requirement state blocked | BA | VS Code notification |
| Release Evidence exported | Stakeholder | Email/Slack (Phase 2) |

Phase 1 notifications are VS Code-native (existing `showInformationMessage` pattern). Phase 2 adds webhooks to external channels.

---

## What Workgroup replaces

If the team model is right, DOS becomes the coordination substrate for delivery. That displaces:

| Tool | What DOS replaces |
| --- | --- |
| Jira / Linear | Requirements as DOS artifacts, not tickets. The state machine IS the board. |
| PR description | The Execution Brief IS the PR description — structured, linked to requirements, pre-reviewed. |
| Slack delivery threads | State transitions are the record. No "what's the status of X?" messages. |
| Sprint review meeting | Release Evidence export IS the sprint review. It writes itself. |
| Confluence / Notion docs | The DOS memory graph IS the project knowledge base. Queryable, linked, versioned. |
| Post-mortem documents | The delivery history IS the post-mortem — which briefs needed rollback, which had forbidden writes, which required advisor escalation. |

This is not a claim that DOS replaces everything these tools do. It is a claim that the delivery coordination function — tracking what is being built, by whom, in what state, with what evidence — belongs in DOS, not spread across six tools.

---

## Phasing

### Phase W1 — Role-aware solo (no infrastructure change)

DOS gains explicit role configuration and role-aware UI. A single developer can declare their active hat (`product-owner`, `developer`, `tech-lead`) and see the appropriate panel surface. The brief review gate works in solo mode: the developer switches to tech-lead hat to approve their own brief, with the approval recorded. This is a discipline aid, not a team enforcement mechanism.

**Delivers:** role model, three-state brief lifecycle, standup view, solo review gate.
**Infrastructure:** none beyond current `.deliveryos/` repo-native store.

### Phase W2 — Team repo-native

Multiple developers share the `.deliveryos/` store via git. The state machine enforces role separation: a developer cannot approve their own brief even if they also hold the tech-lead role for that project. Conflict prevention (file scope locking) is enforced. VS Code notifications fire on state transitions.

**Delivers:** multi-user state machine, conflict prevention, in-VS Code notifications, Tech Lead review queue.
**Infrastructure:** lightweight file-locking layer on top of SQLite. No server required.

### Phase W3 — Server-backed + non-developer access

Hosted DOS store with real-time sync. Web UI for BA and Stakeholder roles. External notifications (email, Slack, webhook). Cross-project visibility for tech leads.

**Delivers:** web UI, real-time sync, external notifications, stakeholder dashboard, cross-project view.
**Infrastructure:** DOS sync server + web app. This is the commercial tier.

---

## Relationship to the backlog

Workgroup subsumes and extends several existing backlog items:

| Backlog item | Relationship |
| --- | --- |
| B-004 (session continuity) | Extended to multi-person: handoff is between team members, not just context windows |
| B-007 (pre-flight check) | Becomes the automated gate before the human review gate |
| B-008 (impact analysis) | Powers the Tech Lead's blast radius view in the brief review queue |
| B-009 (rollback) | Scope lock is released on rollback — unblocks the next developer in the queue |
| B-010 (delivery dashboard) | The Stakeholder view is the team-facing version of the delivery dashboard |
| B-005 (elicitation) | The BA role is the primary user of the elicitation engine |

Workgroup does not replace these items. It gives them a team context that makes them more valuable.

---

## Open questions (to resolve in O-track spec sessions)

1. **Identity.** How does DOS know who is who? Options: git config email (Phase W1/W2), DOS account (Phase W3). Git config is zero-infrastructure and sufficient for Phase W1.

2. **Role assignment.** Who decides which team member holds which role? Options: a project settings panel (admin-only), a config file in the repo (`.deliveryos/team.yml`), or self-declaration per session. Config file is most version-control-friendly.

3. **Solo override.** A solo developer needs to be able to wear all hats without friction. The override mechanism must be explicit (recorded) rather than silent. "I am approving my own brief as tech lead — reason: solo project" is an acceptable bypass; silently skipping the review gate is not.

4. **The BA / PO distinction.** In many teams these are the same person. The role model should support role combining without ceremony — a `.deliveryos/team.yml` entry with both roles on one person is sufficient.

5. **Conflict resolution on concurrent spec edits.** Two team members editing the same PRD section concurrently. Phase W1 (git-based) accepts last-write-wins. Phase W2 needs optimistic locking or operational transform. Scope this carefully — it is where the complexity lives.

---

## Next step

When ready to begin: open a DOS:O track session targeting Workgroup Phase W1 spec. The deliverable is a set of chunk specs (likely 3–5 chunks) covering role model, three-state brief lifecycle, brief review gate, and standup view — all within the existing repo-native architecture.
