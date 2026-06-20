---
name: sm-elicitation
description: Business-analysis elicitation interview — grill the user one question at a time across problem, stakeholders, scope, goals, constraints, assumptions and risks until the specification is complete, then persist the specification, the full question log, and every decision to a transcript artifact AND DeliveryOS memory (an `intent` entry for the spec + one `design` entry per decision). Use when the user runs /sm-elicitation, wants to elicit or stress-test requirements, run a BA interview, or capture a spec + decisions before writing a PRD.
---

# /sm-elicitation — Business-Analysis Elicitation

A relentless, structured elicitation interview. This is the DeliveryOS BA counterpart to a
generic "grill me": it walks the decision tree of a problem one question at a time, but unlike a
throwaway grilling it **captures the result** — a specification, the full question log, and every
decision (with rationale and rejected options) — and **persists it** to a transcript artifact and,
in a DeliveryOS project, to the memory store.

Detailed reference (exact file formats, frontmatter, IDs, rebuild UX): see [REFERENCE.md](REFERENCE.md).

---

## What you produce

1. **Specification** — problem statement, user goals, non-goals, success criteria, constraints, assumptions, open risks.
2. **Question log** — every question asked, your recommended answer, and the user's actual answer.
3. **Decisions** — each resolved branch of the decision tree as a decision + rationale + rejected options + tradeoffs.

All three are written to a transcript artifact (always) and to DeliveryOS memory body files (when in a project) — see § Persist.

---

## Operating rules (read first)

1. **One question at a time.** Never batch. Wait for the answer before the next question.
2. **Always recommend an answer.** For every question, state your recommended answer and one line of why. The user can accept ("yes" / "your call") or override.
3. **Explore before you ask.** If a question is answerable from the repo, the PRD, `.deliveryos/` memory, or the raw idea — go read it instead of asking. Only ask the human what only the human knows (intent, priorities, tradeoffs, external constraints).
4. **Walk the tree depth-first.** Resolve dependencies between decisions one by one. When an answer opens a new branch, follow it before backing out. When an answer closes off other branches, prune them and say so.
5. **One decision per branch.** Each resolved branch becomes exactly one decision record. Capture the rejected options — the *why not* is the highest-value part of the record.
6. **Surface contradictions immediately.** If an answer conflicts with an earlier one, stop and reconcile before moving on.
7. **No code, no PRD.** This is elicitation only. The output feeds the PRD / decompose flow downstream — do not write application code or a PRD here.

---

## Step 0 — Frame the session

1. Establish the **topic / project**. If run inside a DeliveryOS project, read the existing `intent`
   from `.deliveryos/memory/intent/` (or `.deliveryos/memory/INDEX.md`) and the raw idea first.
2. Derive a **kebab-case slug** for this session (e.g. `payments-reconciliation`). It names the artifact and the memory titles.
3. State the spine you'll walk (below) and the first question. Then begin.

---

## Step 1 — Walk the elicitation spine

Cover these topics in order. Each is a branch of the decision tree; skip a branch only when the repo/PRD already answers it (say so). Stay on one topic until it's resolved before moving to the next.

1. **Problem & context** — What problem, for whom, what's the current state, why now, what happens if nothing is done.
2. **Stakeholders & users** — Primary vs secondary users, roles, who decides, who is affected, who must sign off.
3. **Scope & boundaries** — What is explicitly in scope; what is explicitly **out** of scope (non-goals). Non-goals are as important as goals.
4. **Goals & success criteria** — The measurable outcomes. Push every vague goal ("make it faster") to a testable criterion ("p95 < 200ms").
5. **Constraints** — Technical, integration, regulatory/compliance, data, time, budget, team. What is fixed and cannot move.
6. **Assumptions & risks** — What you're assuming to be true (and the cost if wrong); what could derail this; unknowns to validate.
7. **Key decisions** — As branches resolve, name each decision explicitly: the choice, why, what was rejected, the tradeoff accepted.

For each question, follow the [Operating rules](#operating-rules-read-first): one at a time, recommend an answer, explore first.

---

## Step 2 — Check sufficiency

After the spine is walked, self-assess. Declare **sufficient** only when ALL hold:
- Problem statement is one crisp paragraph the user agrees with.
- Goals each have a verifiable success criterion.
- Non-goals are explicit.
- Every major constraint and assumption is captured.
- Every branch that was opened was either resolved into a decision or explicitly deferred (and logged as an open question).

If not sufficient, name the gap and ask the next question. If sufficient, say so and move to persist. The user can also declare "good enough" early — honour it, but record what is still open.

---

## Step 3 — Persist

Write the outputs. The **artifact is always written**; the **memory bodies are written when `.deliveryos/` exists**. Use the exact formats in [REFERENCE.md](REFERENCE.md) — they must be byte-faithful or the memory rebuild will skip them.

1. **Transcript artifact (always).**
   `.deliveryos/elicitation/<slug>.md` in a DeliveryOS project, else `docs/elicitation/<slug>.md` (create the dir). Contains: Specification, Question log (the full table), Decisions, Open questions. Template in REFERENCE § Artifact.

2. **Memory body files (DeliveryOS project only).** Lossless markdown the extension can ingest:
   - **One `intent` entry** — the specification (problemStatement, userGoals, nonGoals, successCriteria). Path `.deliveryos/memory/intent/intent-<8hex>.md`.
   - **One `design` entry per decision** — area, decision, rationale, rejectedOptions, tradeoffs. Path `.deliveryos/memory/design/design-<8hex>.md`. Each links `derives-from` the intent (append the triple to `.deliveryos/memory/LINKS.md`).

   These body files are the **durable, driver-free source of truth**. They do **not** update `memory.sqlite` on their own.

3. **Refresh the index.** Tell the user to run **"DeliveryOS: Rebuild Memory Index from Markdown"** (command `deliveryos.memory.regenerate`) to ingest the new entries into `memory.sqlite` and regenerate `INDEX.md` / `LINKS.md`. Until then the entries live in the markdown (greppable) but not in the SQLite index.

---

## Step 4 — Report

Summarise to the user:
- Spec captured (problem in one line, N goals, M non-goals).
- Decisions recorded (count) and any rejected options worth remembering.
- Open questions / deferred branches.
- Files written (artifact path; intent + design body-file count).
- The one action left: run the Rebuild Memory Index command to land it in `memory.sqlite`.

---

## Hard constraints

- One question at a time. Never batch questions.
- Always provide a recommended answer.
- Do not invent answers the user must give — for genuinely human-only choices, ask.
- Do not write application code or a PRD.
- Memory body files and `LINKS.md` triples must match REFERENCE formats exactly (frontmatter keys, compact `payload_json`, ID shape `<type>-<8hex>`). A malformed file is silently skipped on rebuild.
- Never edit or delete existing memory entries to make room — only add new body files.
