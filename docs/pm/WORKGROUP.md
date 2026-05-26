# DeliveryOS Workgroup — Product Roadmap

**Status:** Vision / pre-spec
**Created:** 2026-05-26
**Updated:** 2026-05-26 — platform-first strategy adopted (GitHub as coordination substrate)
**Track:** P (product direction) — O-track spec sessions to follow per phase

---

## The problem

DOS in its current form models a single person moving through the SDLC: one developer writes the spec, runs the agent, captures the result, and verifies the output. That is useful. It is not how software is actually built.

Real delivery involves role separation. The person who writes the raw idea is not the person who composes the Execution Brief. The person who runs the agent is not the person who should approve their own brief. The stakeholder who wants to see progress does not have VS Code open.

Without a team model, DOS adoption has a ceiling: individual developers who are disciplined enough to follow the process solo. With a team model, DOS becomes the coordination substrate for an entire engineering organisation — the structured layer that replaces informal Slack threads, unreviewed PR descriptions, and sprint reviews that nobody writes.

That is the Workgroup initiative.

---

## The strategic principle: plug in, don't compete

GitHub started as version control for individual developers. It now coordinates millions of open source teams worldwide — without building its own editor, its own CI, or its own IDE. It became the substrate that everything else runs on top of. Jira started as a bug tracker. Kanban started on a Toyota factory floor in 1950. All of them scaled by meeting developers where they already worked, not by asking developers to move.

DOS should follow the same principle. **The coordination infrastructure already exists. Millions of open source teams are already on GitHub. The task is not to build a new coordination layer — it is to become the delivery intelligence that sits behind platforms teams already use.**

Concretely: DOS artifacts map almost perfectly onto existing GitHub primitives. A requirement IS a GitHub Issue. An Execution Brief IS a Pull Request description. The brief review gate IS PR review. Verification IS a CI check run. Release Evidence IS a GitHub Release. The team's notification infrastructure IS GitHub's notification system. DOS doesn't need to replicate any of this — it needs to be a good GitHub citizen.

For enterprise teams using Jira: a ticket IS a requirement. A sprint IS a delivery phase. A Jira automation IS a state transition trigger.

The implication for Workgroup phasing: Phase W2 is not "build a DOS server." Phase W2 is "become a GitHub App."

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

## Platform integration: DOS concepts mapped to GitHub primitives

The DOS delivery lifecycle maps onto GitHub's existing model with near-perfect fidelity. No new coordination infrastructure is needed — DOS surfaces its intelligence through GitHub's primitives that teams already use every day.

| DOS concept | GitHub primitive | Notes |
| --- | --- | --- |
| Requirement | Issue (labelled `deliveryos`, templated fields) | PO/BA creates and manages issues; developers consume them |
| Requirement state machine | Issue labels + project board columns | `draft → spec-ready → in-review → running → verified → released` as label set |
| Execution Brief | Pull Request description (structured YAML/Markdown block) | Brief IS the PR description; Allowed/Forbidden as a fenced block |
| Brief review gate | PR review (approve / request changes) | Tech Lead approves the PR before the agent runs |
| Pre-flight completeness check | PR check run (GitHub Actions, status: pending/pass/fail) | Automated gate fires on PR open; blocks merge until passing |
| Agent run | PR branch + Actions workflow | Agent commits to the PR branch; DOS watches for result |
| Verification | PR check run (pass/fail with annotation) | Forbidden writes fail the check; verification criteria as check annotations |
| Release Evidence | GitHub Release (assets + release notes auto-generated) | DOS generates the release body from the memory graph |
| Notifications | GitHub notifications (native) | PR assignment, review request, check failure — no new channel needed |
| Non-developer access | GitHub.com web UI | PO/BA/Stakeholder use GitHub Issues and Projects; no VS Code required |
| Delivery dashboard | GitHub Projects board / Insights | Requirement status is the issue board; velocity is the burndown |
| Team identity | GitHub user / team membership | git config email + GitHub username; zero new auth infrastructure |

**What this means in practice:**

A product owner opens a GitHub Issue with the `deliveryos` template. The issue is a structured form: raw idea, discovery answers, acceptance criteria. DOS reads it and populates the memory store. A developer opens the requirement in VS Code (from the DOS panel), composes the brief, and opens a PR. The PR description IS the brief — structured, machine-readable, linked to the issue. A GitHub Actions check runs the pre-flight completeness check. The Tech Lead reviews the PR. On approval, DOS runs the agent. Results post as PR comments and check annotations. Verification passes or fails as a check run. The PR merges. DOS exports Release Evidence as a GitHub Release draft. The product owner closes the issue.

That is the full DOS delivery cycle. Every step happened in GitHub, with no custom server, no additional login, no new tool for the product owner to learn.

### Jira mapping (enterprise teams)

| DOS concept | Jira primitive |
| --- | --- |
| Requirement | Issue / Story (with custom fields for DOS metadata) |
| Requirement state machine | Jira workflow statuses |
| Execution Brief | Issue description (structured block) + linked PR |
| Brief review gate | Jira approval step / PR review in linked GitHub repo |
| Delivery dashboard | Jira board / sprint burndown |
| Release Evidence | Jira release + fix-version report |

### Other kanban platforms

Linear, Trello, Notion, and any kanban tool with a webhook API can surface the DOS state machine as board columns. The requirement state transitions fire webhooks; the platform moves the card. DOS is the brain; the kanban board is the display.

---

## The shared memory store

**Phase W1 — repo-native (no new infrastructure):**
The `.deliveryos/` SQLite store lives in the repo. For solo use and small co-located teams, shared via git is sufficient. The state machine prevents concurrent writes to the same artifact by enforcing that only one person can hold write access to a given artifact at a given time (by role + state).

**Phase W2 — GitHub-native:**
DOS becomes a GitHub App. The memory store syncs bidirectionally with GitHub Issues and PRs — DOS reads issues as requirements, writes brief metadata to PRs, posts results as check annotations. The `.deliveryos/` store remains the local cache; GitHub is the source of truth for team state. This gives non-developers (PO, BA, Stakeholder) access through GitHub.com with zero additional infrastructure.

**Phase W3 — Multi-platform:**
Jira integration for enterprise. Linear, Notion, and other kanban platform webhooks. The DOS core is platform-agnostic; adapters translate DOS state transitions to each platform's primitives. A team can use GitHub for code and Jira for project tracking — DOS bridges them without requiring a migration.

---

## Non-developer access

**Phase W2 (GitHub-native):** Product owners and BAs use GitHub Issues — a tool they may already use — to write requirements using the DOS issue template. Stakeholders see the GitHub Projects board, the PR list, and release notes. No VS Code, no DOS extension, no new login. The web surface is GitHub.com.

**Phase W3 (Jira):** Enterprise stakeholders use their existing Jira board. The DOS state machine drives Jira status transitions via the Jira API. The sprint review is the Jira release report populated by DOS's Release Evidence export.

---

## Notifications

**Phase W1 (solo, VS Code-native):** VS Code `showInformationMessage` notifications for role transitions (switching hat from Developer to Tech Lead, etc.).

**Phase W2 (GitHub-native):** GitHub's native notification system handles everything. PR review requests, check run failures, issue assignments — developers already have GitHub notifications configured. DOS fires GitHub events; teams get notified through their existing GitHub notification preferences. Zero new notification infrastructure.

**Phase W3 (multi-platform):** Jira notifications, Linear notifications, Slack via existing GitHub/Jira Slack integrations. DOS doesn't build a notification system — it fires the platform events that trigger existing notification flows.

---

## What Workgroup amplifies

DOS is not competing with GitHub, Jira, or Kanban. It is the delivery intelligence layer that makes those tools more valuable for AI-assisted development. Teams keep using the tools they know. DOS adds structured discipline, verified delivery evidence, and memory — on top of the coordination infrastructure that already has millions of users.

| Platform | What DOS adds |
| --- | --- |
| GitHub Issues | Structured requirement templates, state machine discipline, elicitation prompts, change propagation alerts |
| GitHub PRs | Execution Brief structure, pre-flight completeness check, allowed/forbidden policy, blast radius analysis |
| GitHub Actions | Forbidden write detection, verification check runs, automated release evidence generation |
| GitHub Releases | Full delivery audit trail — which requirements, which briefs, which agents, which verifications |
| Jira | AI-assisted brief composition, agent delivery tracking, verification evidence attached to tickets |
| Any kanban board | Requirement state machine as board columns, delivery velocity from real data not estimation |

The team that adopts DOS doesn't change how they use GitHub. They get structured AI-assisted delivery discipline layered on top of it.

---

## Phasing

### Phase W1 — Role-aware solo (no infrastructure change)

DOS gains explicit role configuration and role-aware UI. A single developer declares their active hat (`product-owner`, `developer`, `tech-lead`) and sees the appropriate panel surface. The brief review gate works in solo mode: the developer switches to tech-lead hat to approve their own brief, with the approval recorded. This is discipline enforcement, not bureaucracy — the approval is instant but it is on the record.

**Delivers:** role model, three-state brief lifecycle, standup view, solo review gate, `.deliveryos/team.yml` config.
**Infrastructure:** none beyond current `.deliveryos/` repo-native store.
**Who it serves:** solo developers who want role discipline; pairs and very small teams sharing a repo.

### Phase W2 — GitHub-native (GitHub App)

DOS becomes a GitHub App. Requirements sync bidirectionally with GitHub Issues. Briefs appear as structured PR descriptions. Pre-flight completeness runs as a GitHub Actions check. The Tech Lead review gate is GitHub PR review. Verification posts as check annotations. Release Evidence generates a GitHub Release draft. All team coordination, notifications, and non-developer access go through GitHub — no new server, no new login, no new web UI to build.

**Delivers:** GitHub Issues as requirements, PRs as briefs, Actions as verification, GitHub Release as release evidence, team access via GitHub.com.
**Infrastructure:** GitHub App (OAuth + webhooks). The `.deliveryos/` store remains the local cache; GitHub is the team source of truth.
**Who it serves:** open source teams and small-to-mid product teams already on GitHub — the largest addressable population of engineering teams in the world.

### Phase W3 — Multi-platform (Jira, Linear, others)

Adapters for enterprise and alternative platforms. Jira tickets become DOS requirements; sprint boards become delivery phases. Linear, Notion, and other kanban tools with webhook APIs surface the state machine as board columns. DOS is platform-agnostic at its core; each adapter translates DOS events to platform primitives. A team using GitHub for code and Jira for project tracking gets both connected through DOS without migrating either.

**Delivers:** Jira integration, Linear/kanban webhook adapters, cross-platform state machine, enterprise SSO.
**Infrastructure:** adapter layer (stateless webhooks + platform APIs). Still no DOS server — the adapters translate events, they do not store state.
**Who it serves:** enterprise teams on Jira; teams with split GitHub/Jira workflows; organisations standardising on a non-GitHub platform.

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

1. **Identity.** Phase W1: git config email (zero infrastructure). Phase W2: GitHub user identity via the GitHub App OAuth flow — the same login the developer already uses. Phase W3: Jira account / enterprise SSO. No DOS account ever needed.

2. **Role assignment.** Who decides which team member holds which role? Options: a project settings panel (admin-only), a config file in the repo (`.deliveryos/team.yml`), or self-declaration per session. Config file is most version-control-friendly.

3. **Solo override.** A solo developer needs to be able to wear all hats without friction. The override mechanism must be explicit (recorded) rather than silent. "I am approving my own brief as tech lead — reason: solo project" is an acceptable bypass; silently skipping the review gate is not.

4. **The BA / PO distinction.** In many teams these are the same person. The role model should support role combining without ceremony — a `.deliveryos/team.yml` entry with both roles on one person is sufficient.

5. **Conflict resolution on concurrent spec edits.** Two team members editing the same PRD section concurrently. Phase W1 (git-based) accepts last-write-wins. Phase W2 needs optimistic locking or operational transform. Scope this carefully — it is where the complexity lives.

---

## Next step

**Phase W1:** Open a DOS:O track session targeting Workgroup Phase W1. Deliverable: 3–5 chunk specs covering role model, three-state brief lifecycle, brief review gate, and standup view — all within the existing repo-native `.deliveryos/` architecture.

**Phase W2:** Requires a GitHub App registration and a GitHub Actions workflow spec. Open a separate DOS:O session once W1 is shipped and validated. The key design work is the bidirectional sync between `.deliveryos/memory.sqlite` and GitHub Issues/PRs — get that contract right before building the adapter.
