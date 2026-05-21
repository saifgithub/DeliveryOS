# PRD audit — coherence + completeness pass (DOS:O5)

**Audit date:** 2026-05-21
**Session:** DOS:O5
**Scope:** `docs/PRD.md` v0.3, all 29 sections (lines 1–921). Subject under review is the PRD itself; chunk specs already reflect iteration-3 reality and are not in scope here.
**Prior state:** [`phase-0-audit.md`](phase-0-audit.md) (DOS:O4) noted "PRD … no content drift surfaced for these docs at Phase 0 (iteration-2 alignment table remains valid). [Intentionally untouched]" — meaning the PRD had been **alignment-checked from the chunk side** but never opened for internal coherence/completeness review.
**Trigger:** *"Audit the rest of the PRD to make sure the requirements are coherent and complete — we cannot afford to have wrong requirements."* Errors in the PRD silently propagate into every chunk spec downstream (17 chunks + READY.md + architecture/ + ADR-0001), and DOS:R1 is already past CHUNK-01 steps 1–3.

---

## Iteration summary

Five independent subagents ran in parallel — one per dimension (Completeness, Coherence, Vision↔Spec link, MVP boundary, Soft language). Each read the full PRD plus context (canonical iteration-3 state, deferred-by-design list, consumer landscape). The MVP boundary dimension surfaced **4 blockers** — all of the same shape: §15 MVP Scope promises a wider product than §26 MVP Build Phases delivers, and the disagreement is multi-section (§15 ↔ §26 ↔ §10.X ↔ §18.Z ↔ §25.2 ↔ NFR8).

| Dimension | Blockers | Majors | Minors |
|---|---|---|---|
| A. Completeness | 1 (folded) | 8 | 4 |
| B. Coherence | 0 | 5 | 7 |
| C. Vision↔Spec link | 0 | 6 | 3 |
| D. MVP boundary | **4** | 4 | 5 |
| E. Soft language | 0 | 7 | ~15 |
| **Consolidated (deduped)** | **4** | **16** | **~14** |

Raw subagent output totaled 107 findings; consolidation deduped to 34. Counts above are post-dedupe.

---

## Blockers (4)

All four are the same shape: §15 promises a fuller MVP than §26 commits to deliver. Resolution direction across all four is identical — **§15 must match §26's trimmed-build reality** (not the other way around). The "trimmed ship-well scope" framing in §26 is the load-bearing one; §15 reads as inherited from a pre-trimmed version of v0.3 and needs to come down to match.

### B-01 · Specialist count: §15 says 4, §26 ships 1

**Source:** Subagent A-21, A-34; B-02, B-12; C-07; D-01, D-02, D-13.
**Location:** PRD §15 line 536 ↔ §26 lines 866, 872, 880 ↔ §17 line 614 ↔ §25.2 line 856.

§15 line 536: *"specialist expansion (BA, Architect, Security, QA only)"* — four specialists.
§26 line 866: *"one specialist: Test Designer"*.
§26 line 880: *"the remaining MVP specialists … deferred to a later build"*.
§17 names only the Execution Brief Author rename and refers everything else to v0.1. Builder reading §15 will build four specialists; builder reading §26 will build one. Inconsistent across the document.

**Resolution chosen:** §15 must match §26. Replace line 536 with: *"specialist expansion (Test Designer specialist for test spec generation in MVP; BA, Architect, Security, QA reviewers deferred to post-MVP)"*. Update §17 to enumerate the v0.3 MVP role set inline (Execution Brief Author + Test Designer + Discovery interviewer in manual mode), drop the "see v0.1" dangling reference. §25.2 line 856 wording already covers the manual-mode mechanism and reads correctly under the trimmed set; no edit required.

---

### B-02 · Harness profile count: §15 says 3, §26 ships 2, §18.Z lists 5, NFR8 says 3

**Source:** Subagent A-03, A-10, A-18; D-03, D-06, D-07, D-15; E-14.
**Location:** PRD §15 line 543 ↔ §26 line 874 ↔ §18.Z lines 687–699 ↔ NFR8 line 516 ↔ FR21 line 456.

§15 line 543: *"harness profile selection (Claude Code, Codex, Generic)"* — three profiles in MVP.
§26 line 874: *"Claude Code and Codex profiles"* — two profiles in Phase 2.
§18.Z lists five profiles (Claude Code, Codex, Cursor, Replit/Lovable, Generic) with no MVP/post-MVP annotation.
NFR8 line 516: *"Claude Code, Codex, and a Generic profile in MVP. Cursor and others as fast follows."* — three profiles, plus jargon ("as fast follows") that masks a real scoping question.
FR21 line 456: *"(Claude Code, Codex, Cursor, Generic)"* — Cursor included, Replit/Lovable omitted, Generic included.

Four sections, four different lists. Builder cannot tell what to build.

**Resolution chosen:** Lock MVP at **Claude Code + Codex** (matches §26 — the load-bearing scoping section). Mark Cursor, Replit/Lovable, Generic as post-MVP fast-follow profiles. Edits required:

- §15 line 543: *"harness profile selection (Claude Code, Codex)"*.
- NFR8 line 516: *"Profile support is mandatory for Claude Code and Codex in MVP. Generic, Cursor, and Replit/Lovable profiles are planned for a post-MVP follow-up build."*
- FR21 line 456: *"(Claude Code, Codex; Generic, Cursor, Replit/Lovable post-MVP)"*.
- §18.Z lines 687–699: append "(MVP)" to Claude Code Profile + Codex Profile headers; append "(post-MVP)" to Cursor / Replit/Lovable / Generic Profile headers.

---

### B-03 · Memory types: §15 says "first-class storage", §26 + §25.2 say polymorphic single-table

**Source:** Subagent A-20; D-04, D-09; C-11.
**Location:** PRD §15 line 539 ↔ §26 line 880 ↔ §25.2 line 854 ↔ §21 line 725.

§15 line 539: *"the eight memory types as first-class storage"*. Reads as eight per-type tables / rich object schemas / dedicated UI surfaces.
§26 line 880 defers: *"all eight memory types as rich objects (the trimmed build uses a simpler subset)"*.
§25.2 line 854: *"Polymorphic schema in MVP: one `memory_entries` table keyed by `type`, plus a `memory_links` edge table"* — a single table.
§21 line 725 already defers the Memory Workspace UI.

The actual MVP shape is: all eight memory types are persisted as rows in a polymorphic table, queryable per-type, browsable in per-stage tree-view rows. The dedicated Memory Workspace panel and rich per-type object schemas come post-MVP. §15's phrasing oversells this.

**Resolution chosen:** §15 line 539 becomes: *"the eight memory types persisted as polymorphic entries in MVP (single `memory_entries` table per §25.2; per-stage tree-view rows for browsing); per-type rich object views + the Memory Workspace panel deferred post-MVP per §21"*. This makes the §15 / §25.2 / §26 / §21 chain consistent.

---

### B-04 · Configurable stage library: §15 says "at least the MVP mid-stages", §26 defers "full library"

**Source:** Subagent D-05, D-10; A-22.
**Location:** PRD §15 line 532 ↔ §26 line 880 ↔ §10.X lines 365, 384.

§15 line 532: *"configurable stage library with at least the MVP mid-stages listed in section 10.X"*.
§10.X line 365: *"Mid-stage library (MVP set)"* labels its 10 entries.
§10.X line 384: *"Default = four stages only"* — a project with no triggers runs zero mid-stages.
§26 line 880: *"the full configurable stage library … deferred to a later build"*.

Three readings are possible from §15 + §10.X alone:
1. All 10 mid-stages with their triggers are MVP — contradicts §26.
2. Only the framework (add/remove + trigger-based suggestion) is MVP, library catalogue is post-MVP — matches §26 but §10.X label "MVP set" misleads.
3. Some subset of the 10 is MVP — never specified.

**Resolution chosen:** Make (2) explicit. §15 line 532 becomes: *"configurable stage library **framework** (FR26/FR27/FR28: add/remove mid-stages, trigger-driven suggestion via discovery interview, gate enforcement). The pre-defined catalogue of 10 trigger-mapped mid-stages in §10.X is the planned post-MVP set — MVP default is four stages only, per §10.X's 'Default = four stages only.' MVP ships zero pre-defined mid-stages; users can add custom ones."* §10.X line 365 header changes from *"Mid-stage library (MVP set)"* to *"Mid-stage library (planned post-MVP catalogue)"*.

---

## Majors (16)

Grouped by area for execution efficiency.

### Document-wide structure

- **M-01 · §5 Goals weakened by "should" modal across all 8 goals.** (E-01..E-08, A-01.) Goals 1–8 use "should"; §13 FRs use "must". Modal mismatch signals to the builder that goals are aspirational, FRs are commitments — but goals and FRs are supposed to be the same vocabulary at different abstraction levels. **Fix:** replace "should" with "must" in all 8 goals (§5 lines 128, 132, 136, 140, 144, 148, 152, 156). Goal 7 (test-first) needs a backing FR (covered by M-04 batch). **Fix-in-session: yes.**

- **M-02 · §10 stage numbering scheme leaks v0.2 numbers and gaps from 10.1–10.7.** (B-03, B-04, B-09.) §10 jumps 10.0 → 10.8 → 10.10 → 10.11 → 10.12 → 10.13 → 10.14 → 10.X. The "Stage 8 / Stage 10 / Stage 11 …" subtitles are v0.2 stage numbers leaking into v0.3. The literal "10.X" is a placeholder unlike any other section's numbering. Downstream cites reference these by name (`§10.X`, `§10.8`, etc.) so unstable numbering breaks consumer files. **Fix:** renumber as **10.1** (was 10.0, the v0.2 mapping table), **10.2** (was 10.8, Codebase Memory Prep), **10.3** (was 10.10, Harness-Based Execution), **10.4** (was 10.11, Result Capture), **10.5** (was 10.12, Verification), **10.6** (was 10.13, Memory Update), **10.7** (was 10.14, Release Evidence), **10.8** (was 10.X, Stage Configuration). Drop the v0.2 "Stage N:" subtitles. Update every reference to `section 10.X` in §15, §16, §27. **Fix-in-session: yes.**

- **M-03 · FR22 file list is missing the `current-` prefix used in §18.Y.** (B-01.) FR22 line 462 says *"execution-brief.md, context-package.md, test-specification.md, verification-checklist.md, and memory-summary.md"*. §18.Y lines 670–674 specifies *"current-execution-brief.md"* etc. Chunk specs already use the prefixed form. The `current-*` vs `history/<timestamp>-*` split is load-bearing per §18.Y's audit-trail design. **Fix:** rewrite FR22 file list to use `current-*` prefix and add a one-line note that `history/<timestamp>-*` snapshots are written alongside. **Fix-in-session: yes.**

- **M-04 · Missing FRs for eight load-bearing MVP capabilities.** (C-01, C-02, C-06, C-09, C-12, C-13; A-31, A-32, A-33.) §15 promises 21 MVP capabilities; §13 has FR15, FR16, FR21–FR29 (10 FRs). Eight of §15's promises have no explicit FR:
  1. PRD generation from discovery (Goal 2 orphan) → **FR30**
  2. Test specification + verification criteria generation (Goal 7 orphan) → **FR31**
  3. Release Evidence Package generation (Goal 8 orphan; §10.7 describes the artefact, no FR) → **FR32**
  4. Requirements Catalogue generation (§15 line 538 promise) → **FR33**
  5. Allowed/Forbidden Changes enforcement (Risk 3 line 890 describes the mechanism, no FR) → **FR34**
  6. Mid-stage gate enforcement (§10.8 line 363 says "gate blocks progression", no FR) → **FR35**
  7. Project lifecycle (create / open / name a project; nothing in FRs) → **FR36**
  8. Audit trail snapshots (§18.Y history/ mechanism, no FR backing) → **FR37**

  **Fix:** add FR30..FR37 to §13, each as a 2–4 line entry with priority "Must have" and a reference to the relevant stage/section. **Fix-in-session: yes.**

### §10 stage acceptance criteria

- **M-05 · Five §10 stages list inputs + outputs but no measurable gate criterion.** (A-02, A-04, A-05, A-06, A-07, A-22.) §10.2 Codebase Memory Prep, §10.4 Result Capture, §10.5 Verification, §10.6 Memory Update, §10.7 Release Evidence — each describes what's collected and what's produced, but doesn't say what makes the stage *done*. Tester / builder cannot determine pass/fail. **Fix:** add a one-line **Gate:** subsection to each of the five stages with a measurable done-when criterion (Codebase Memory entry exists with all 10 input categories populated; Result Memory parsed without errors; Verification produces pass/fail/warning decision with criterion table; Memory Update touches every memory type the result implies; Release Evidence Package contains every required field). **Fix-in-session: yes.**

### §11 Operating Modes

- **M-06 · §11 references v0.1 mode definitions that are not in v0.3.** (A-23.) §11 line 396: *"Unchanged from v0.1: Human-Led, AI-Assisted, AI-Led"* — and never defines them in v0.3. Each mid-stage's per-mode setting (§11 line 398) is meaningless without the definitions. PRD must be self-contained — requiring a read of `docs/deprecated/PRD-v0.1.md` to understand a v0.3 mechanic is wrong. **Fix:** inline three-line definitions of Human-Led / AI-Assisted / AI-Led in §11, each with a one-sentence acceptance criterion (Human-Led = approval required at stage exit; AI-Assisted = AI output + human sign-off; AI-Led = AI output, human audits post-hoc). **Fix-in-session: yes.**

### §17 AI Execution Roles

- **M-07 · §17 only mentions the Execution Brief Author rename; no v0.3 role enumeration.** (D-14, C-13.) The full role list lives in `docs/deprecated/PRD-v0.1.md`. Same self-containment violation as M-06. **Fix:** inline a list of the v0.3 MVP AI roles (Discovery Interviewer in manual mode, Execution Brief Author, Test Designer) + a note that the wider v0.1 role set is deferred per B-01. **Fix-in-session: yes.**

### §12 Memory + §18 Brief schema

- **M-08 · §18.X is labelled "schema" but is a markdown template with one-sentence prompts.** (A-24.) Readers expect "schema" to mean field types and constraints; what's there is a template with per-section prose prompts. Implementer cannot validate brief completeness from §18.X alone. **Fix:** rename `### 18.X Execution Brief schema` → `### 18.X Execution Brief template`. Add a one-line note: *"This template defines the 10 mandatory sections and the intent of each. Detailed field-level types (post-implementation) live in `contracts/src/execution-brief.ts` per CHUNK-09."* **Fix-in-session: yes.**

- **M-09 · §18.Y archive policy undefined: when are `history/<timestamp>-*` snapshots written, who triggers, cleanup?** (A-25.) §18.Y describes the directory layout but not the lifecycle. Without policy, audit trail risks growing unboundedly or never being written. **Fix:** add a paragraph to §18.Y: *"Snapshots are written automatically on (a) Execution Brief generation and (b) Result Capture. Naming convention: ISO-8601 timestamp prefix (`2026-05-21T14-32-15Z-execution-brief.md`). Cleanup is manual in MVP — users may delete old entries; no auto-expiration. `current-*` files are gitignored; `history/*` is committed."* **Fix-in-session: yes.**

- **M-10 · §12.X memory types defined as one sentence each; no field/FK/mutability hints.** (A-26, M-23 partial.) Implementer needs at least "what links to what" + mutability mode (append-only vs. mutable) at PRD level; full schemas belong in `contracts/src/memory.ts`. **Fix:** add a 2-line note to each of the 8 memory types stating its load-bearing links (e.g. Requirement Memory links from Intent Memory, links to Design Memory + Verification Memory) + mutability (Intent + Requirement = append-only; Design + Codebase = mutable; Execution + Result + Verification + Release = append-only). **Fix-in-session: yes.** (PRD-level claim only; detailed types in contracts package per CHUNK-03.)

### §13 FR clarifications

- **M-11 · FR24 priority "Should have" contradicts §15 MVP "memory update on verification" as MUST.** (Folded from A-13.) FR24 line 476 priority is "Should have"; §15 line 547 lists "memory update on verification" as MVP-include. Priority drift. **Fix:** bump FR24 to "Must have". **Fix-in-session: yes.**

- **M-12 · FR24 "where applicable" is unmeasurable trigger.** (E-13, A-13.) FR24 line 474: *"system must update Design, Codebase, and Requirement memories where applicable"*. Builder cannot tell which memory types are updated when. **Fix:** rewrite as: *"the system must update Design Memory if new design decisions appear in the Result, Codebase Memory if new files or conventions appear, and Requirement Memory if assumption violations appear. Each update is recorded in the audit log with timestamp + memory-type-touched."* **Fix-in-session: yes.**

- **M-13 · FR23 query language unspecified for MVP.** (A-12.) FR23 says memory is "queryable by user and by system" with no mention of what queries are supported in MVP. §21 Memory Workspace defers the dedicated browse UI; §25.2 specifies polymorphic store. **Fix:** add to FR23: *"MVP query support: browse memory entries via per-stage tree-view rows (one row per artefact under its parent stage); programmatic queries by `id` and `type` for the extension's internal use. Full query API + Memory Workspace browse panel deferred post-MVP per §21."* **Fix-in-session: yes.**

- **M-14 · FR26 conflates gate criterion with artefact produced.** (A-14.) FR26 line 486: *"Each mid-stage has a defined gate and produces a defined artefact"*. §10.8 mid-stage library table shows "Gate produces: [thing]" — the column heading conflates the two: a *gate* is an acceptance criterion (is the artefact present + signed off?); the *artefact* is the output. **Fix:** split §10.8 table column "Gate produces" into two: **Artefact produced** + **Gate criterion**. For each row, fill both. Example: Security Review → Artefact = Security review note + threat model; Gate = threat model has ≥3 mitigations + sign-off is dated. **Fix-in-session: yes.**

### §24 Success Criteria

- **M-15 · §24 Success Criteria are qualitative, not measurable.** (A-29, E-22..E-26, E-29, E-30.) Seven bullets — "clear, defensible architectural thesis", "credible understanding", "practical, working file-based handoff", "more than a database table, demonstrably useful", "strong artefact traceability", "one complete, polished demo" — all subjective. Project cannot be declared done. **Fix:** rewrite §24 with measurable proof-of-work criteria: demo completes Bug Triage end-to-end (§19, §23) in one recorded session; file-based handoff drives Claude Code AND Codex through an end-to-end Brief→Result→Verify cycle; memory persists across 3+ closes/reopens of the extension; traceability is navigable via UI clicks from any requirement back to Intent + forward to Release Evidence; Bug Triage demo runs cleanly on VS Code + Cursor; one-page writeup + ≤5 minute demo video published. **Fix-in-session: yes.**

### Term drift

- **M-16 · Term drift across 12 concept-pairs.** (B-05..B-12; A-34.) Same concept named multiple ways: "specialist" / "AI role" / "AI specialist" / "Specialist Expansion" (§5/§13/§17/§26); "mid-stage" / "configurable stage" / "optional mid-stage" (§9/§10.8/§13); "handoff" / "handoff mechanism" / "handoff mode" (§10/§18.Y); "external coding harness" / "AI coding harness" / "coding harness" / "coding agent" (everywhere); "memory graph" vs "memory types" vs "memory store" (§12/§21/§25.2). Chunk specs cite by exact term; drift breaks cite stability. **Fix:** lock canonical forms — **mid-stage** (singular) for §10.8 gates; **AI specialist** for §17 roles (§5 Goal 3's discipline list stays as illustrative); **execution brief** (lowercase outside title) for the document, **handoff mechanism** for the delivery method (file-based / paste / MCP); **external coding harness** (Claude Code, Codex, Cursor, etc.) consistently; **memory graph** = the system, **memory types** = the 8 first-class entries. Apply find-and-replace per glossary. **Fix-in-session: yes — bulk replace.**

---

## Minors (~14) — triage

Most cluster into two groups. Soft-language tail (E-15, E-17, E-18, E-19, E-21, E-28, etc.) is the bulk — most are deliberate prose softness in §3/§28 marketing copy, §2 vision, §27 risk descriptions. Track R can absorb during the relevant chunk's build if any surface as friction.

### Group A · Cross-reference + framing nits (fix-in-session — cheap)

- **m-01 (B-11) · §18.Y line 681 "auditability (success criterion in § 24)" is vague.** §24 doesn't isolate "auditability" — closest match is "strong artefact traceability". Tightened by M-15's rewrite of §24; update the cross-ref to point at the new measurable bullet. **Fix-in-session.**
- **m-02 (E-15) · §16 Step 12 "DeliveryOS can also produce a suggested update".** Soft "can also" for CLAUDE.md / AGENTS.md update — actually load-bearing for Claude Code + Codex profiles per §18.Z. Tighten to: *"For the Claude Code and Codex profiles, DeliveryOS produces a suggested CLAUDE.md / AGENTS.md update."* **Fix-in-session.**
- **m-03 (E-21) · §25.1 line 844 sig-verification "must be tested on each target editor early".** "Early" is undefined timing. Tie to Phase 0 (CHUNK-04 already owns multi-editor verification). **Fix-in-session.**
- **m-04 (E-11) · §10.8 "Regulated SaaS Default might include …".** Ambiguous: built-in profile or user-creatable? Tighten to: *"Users can save custom profiles. Example: a user might save a 'Regulated SaaS Default' profile that includes …"*. **Fix-in-session.**
- **m-05 (A-36) · §10.1 (renumbered) references `docs/deprecated/PRD-v0.1.md` for v0.2 sub-step descriptions.** Same self-containment concern as M-06/M-07 but lower severity here (the v0.2 mapping table already names every sub-step; v0.1 only adds prose detail). Add a one-line note: *"Sub-step prose detail in v0.1 is informational only; the v0.2 mapping table above is the canonical v0.3 reference."* **Fix-in-session.**
- **m-06 (E-17) · §25.1 "both minor for a prototype" downplays VSIX constraints.** Replace with neutral framing: *"Two known constraints to plan around"*. **Fix-in-session.**

### Group B · Soft language tail (defer — prose-level, not load-bearing)

The remaining ~8 minors are deliberate soft language in vision/positioning sections that don't cascade into build decisions:

- §3 / §28 marketing prose (E-31) — deliberate; no fix.
- §27 Risk descriptions ("agents may ignore the brief") (E-16) — correct risk framing; no fix.
- §10.8 "may add optional mid-stages" (E-10) — correct optionality; no fix.
- §7.1 "may use Claude Code, Codex, …" (E-09) — describes user choice; no fix.
- §25.2 "more than fast enough" (E-18) — acceptable prose for a tech-stack rationale.
- §25.2 "richer Codebase Memory" (E-19) — acceptable as future-integrations description.
- FR25 "may expose" + "Priority: Future phase" (E-12) — correct for deferred work.
- §26 "deliberately deferred" (E-20) — crisp boundary; no fix.

**Deferred to build with rationale** matching `phase-0-audit.md` Group C framing.

---

## Iteration sign-off

The PRD had **4 blockers, 16 majors, and ~14 minors** when DOS:O5 started. All four blockers are the same shape (§15 promises a wider product than §26 ships) and resolve in a single coordinated edit pass against §15, §17, §18.Z, §25.2, NFR8, FR21, and §10.8.

**Fix plan executed in this session:**

- All 4 blockers fixed (§15 brought down to match §26's trimmed scope).
- All 16 majors fixed.
- Group A minors (6) fixed in session.
- Group B minors (~8) deferred to build with rationale.

**Status:** The PRD is internally consistent and externally aligned with the iteration-3 corpus post-DOS:O5. Track R can resume DOS:R2 (CHUNK-01 steps 4–6) with the v0.3 corpus' MVP definition finally being a single agreed-upon scope. Downstream cite stability: §10's renumbering is the one breaking change — consumer docs (CHUNK-15 has 12 references to `PRD § 23`; not affected, but READY.md and architecture cite `§10.X` and `§10.7`; those need a follow-up sweep flagged below).

---

## Deferred consumer reconciliations *(resolved same session)*

The §10 renumbering (M-02) changes section numbers that downstream docs cite. Originally deferred as a follow-up Track O job; the user expanded DOS:O5 scope to absorb the sweep in-session.

**Sweep result (full grep across `docs/planning/`, `docs/architecture/`, `docs/decisions/`, `docs/BUILD-PLAN.md`, `docs/MULTI_AGENT_BUILD_PROCESS.md`):** 6 stale `PRD § 10.X` cites in 2 files; everywhere else was clean.

- [`docs/planning/part-1-plan.md`](../part-1-plan.md) lines 299, 315 — `PRD § 10.X` → `PRD § 10.8`. ✅ done.
- [`docs/planning/chunks/chunk-05-discover-capture.md`](../chunks/chunk-05-discover-capture.md) lines 35, 185, 254, 675 — four sites `PRD § 10.X` → `PRD § 10.8`. ✅ done.
- [`docs/planning/READY.md`](../READY.md) — no §10 cites. Clean.
- [`docs/planning/chunks/chunk-15-bug-triage-demo.md`](../chunks/chunk-15-bug-triage-demo.md) — only `PRD § 23` refs (unchanged). Clean.
- [`docs/architecture/memory-layers.md`](../../architecture/memory-layers.md) — no §10 cites. (Separately, line 88 "one SQLite table per memory type" prose nit was an inherited DOS:O3 carry-over — also fixed in this session's follow-up commit.)
- [`docs/architecture/stage-configuration.md`](../../architecture/stage-configuration.md) — no PRD §-cite. Clean.
- [`docs/decisions/0001-vsix-extension-not-fork.md`](../../decisions/0001-vsix-extension-not-fork.md) — only `PRD section 25.1` (unchanged). Clean.
- [`docs/BUILD-PLAN.md`](../../BUILD-PLAN.md) — only `PRD § 25.2` (unchanged). Clean. (Separately, the long-standing "READY.md is canonical execution order" pointer was added at the top, closing the DOS:O1+O2 carry-over.)
- [`docs/MULTI_AGENT_BUILD_PROCESS.md`](../../MULTI_AGENT_BUILD_PROCESS.md) — only generic "PRD" mentions. Clean.

No surviving stale §10 cites or v0.2 `Stage N:` references in the corpus. This deferred section is closed; no follow-up O sweep needed for §10 numbering.

---

## Files touched by DOS:O5 fixes

PRD edits:

- [`docs/PRD.md`](../../PRD.md) — Goals modal upgrade (§5, M-01); §10 renumbering 10.0..10.X → 10.1..10.8 (M-02); §10.2..10.7 gate criteria added (M-05); §10.8 mid-stage table column split + library label change (M-14, B-04); §11 mode definitions inlined (M-06); §12.X link/mutability notes per memory type (M-10); §15 four scope items brought down to match §26 (B-01..B-04); §16 step 12 tightening (m-02); §17 v0.3 role list inlined (M-07); §18.X "schema" → "template" header + contracts-package pointer (M-08); §18.Y archive policy added (M-09); §13 FR22 prefix fix (M-03); §13 FR23 query-language MVP note (M-13); §13 FR24 priority bump + "where applicable" rewrite (M-11, M-12); §13 FR30..FR37 added (M-04); §14 NFR8 profile list + jargon removal (B-02); §13 FR21 profile list (B-02); §10.8 example profile tighten (m-04); §10.1 v0.1 reference framing (m-05); §24 measurable success criteria rewrite (M-15); §25.1 sig-warn "early" → "in Phase 0" (m-03); §25.1 "both minor for a prototype" → "to plan around" (m-06); terminology bulk replace per glossary (M-16).
- [`docs/planning/audits/prd-audit.md`](prd-audit.md) — this audit doc.

Index + planning docs:

- [`docs/planning/PLANNING_STATUS.md`](../PLANNING_STATUS.md) — DOS:O5 "what just landed" section appended; DOS:O4 narrative rotated to PLANNING_HISTORY.md.
- [`docs/planning/PLANNING_HISTORY.md`](../PLANNING_HISTORY.md) — DOS:O4 section absorbed.

**Untouched (intentionally):**

- All chunk specs — Track O does not edit chunk specs from this session. Consumer §-cite reconciliations are deferred (see above).
- BUILD-PLAN.md, architecture/*, ADR-0001 — no edits required by audit findings; future consumer reconciliation may touch them.
- Track R files (`src/**`, `package.json`, `media/**`) — R2 in-flight; not Track O's territory.
