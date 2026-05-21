# Handover — Documentation (DOS:O)

**Last updated:** 2026-05-21 (end of DOS:O5 — standalone PRD coherence + completeness audit: 4 blockers + 16 majors + ~14 minors fixed; consumer §-cite reconciliation + two inherited carry-overs closed in a follow-up commit; wrap commit landed)

Read this file **first** when starting a new Documentation session (`/start-fresh O`). It is the single rolling source of truth for track O: state, narrative, and carry-overs all in one doc. Older "what just landed" sections rotate out to `docs/planning/PLANNING_HISTORY.md` newest-on-top.

---

## What's on disk + what's running

| Thing | State |
|---|---|
| Repo HEAD | _will be_ the DOS:O5 wrap commit on top of `c496121 feat(webview): add webview package — CHUNK-02 Session 2 (DOS:R2)`. The R-track shipped **five DOS:R2 commits** during this DOS:O5 session: CHUNK-01 steps 4–6 (`278d79f`), 7–11 (`6523214`), 12 (`813a56f`), then CHUNK-02 monorepo restructure (`2f648fa`) and CHUNK-02 webview package (`c496121`). |
| Commit count | 21 after DOS:O5 wrap (10 pre-build + 3 O-track audits/wraps from DOS:O3+O4 + 2 DOS:O5 commits + 5 DOS:R2 R-track + this wrap) |
| Tags | none yet |
| Session model definition | `docs/MULTI_AGENT_BUILD_PROCESS.md` § 12 |
| Session config | `.claude/session-config.yml` (prefix `DOS`, tracks O + R) |
| PRD | `docs/PRD.md` **v0.3 + post-DOS:O5 edits** — first standalone PRD audit applied (§5 modal upgrade, §10 renumbered 10.1..10.8, §11 modes inlined, §12.X memory-type links+mutability, §15 trimmed-scope alignment with §26, §17 v0.3 role list inlined, §18.X header rename + §18.Y archive policy, §18.Z per-profile MVP/post-MVP tags, §24 measurable success criteria, FR21+22+23+24 tightened, FR30..FR37 added, NFR8 jargon removed) |
| Build plan | `docs/BUILD-PLAN.md` — 14 weeks, week 1 starts 2026-05-25, demo target 2026-08-24; untouched in DOS:O5 |
| Phase A planning state | **Complete** (DOS:O3) + **third-pass audited** (DOS:O4) + **PRD audited as a standalone document** (DOS:O5). Corpus is internally consistent at post-iteration-3 state; PRD is internally consistent at post-DOS:O5 state. |
| Iteration history | iteration-1 + iteration-2 in DOS:O3 (`validation-report.md`); iteration-3 in DOS:O4 (`audits/phase-0-audit.md`, Phase 0 scope); **PRD audit in DOS:O5** (`audits/prd-audit.md`, PRD-only scope). |
| Canonical link kinds | **10** (reduced from 13 in DOS:O4 — `targets`, `references-codebase`, `subject-of-decision` retired as zero-writer or redundant) |
| Phase B build state | **In progress** — DOS:R1 landed CHUNK-01 steps 1–3 (`e83940d`, `66c9de1` wrap); DOS:R2 (in flight during this DOS:O5 session, not yet wrapped) landed CHUNK-01 steps 4–12 (`278d79f`, `6523214`, `813a56f`) and then started CHUNK-02 with the monorepo restructure (`2f648fa`) + webview package (`c496121`). DOS:R2's `docs/build/BUILD_STATUS.md` is stale, still says "end of DOS:R1." A future `/handover R` will refresh it. |
| Functional requirements count | **20** in PRD §13 (FR15–FR29 from v0.3 origin; FR30..FR37 added in DOS:O5 for previously-orphan capabilities: PRD generation, Test Spec generation, Release Evidence generation, Requirements Catalogue generation, Allowed/Forbidden enforcement, Mid-stage gate enforcement, Project Lifecycle, Audit Trail snapshots) |
| MVP scope alignment | **§15 now matches §26 trimmed scope** — Test Designer specialist only; Claude Code + Codex profiles only; polymorphic memory entries (rich-objects deferred); stage-library framework only (10-mid-stage catalogue deferred). |
| Open bugs | 0 — `docs/build/bugs.json` is `{"bugs": []}` |
| Worktree residue | None — `.claude/worktrees/` empty |

---

## What just landed (this session — DOS:O5)

First standalone PRD coherence + completeness audit. Triggered by the user: *"audit the rest of the PRD to make sure the requirements are coherent and complete. we cannot afford to have wrong requirements."* Five parallel cohesion-audit subagents (Completeness, Coherence, Vision↔Spec link, MVP boundary, Soft language) ran read-only against `docs/PRD.md` v0.3 (905 lines, 29 sections).

The prior O-track audits (DOS:O3 iteration-2; DOS:O4 Phase 0) had **alignment-checked the PRD from the chunk side** but never opened the PRD itself to scrutiny — phase-0-audit.md line 190 explicitly marks PRD "intentionally untouched." DOS:O5 closes that gap.

**Substantive deliverables (single substantive commit + wrap):**

1. **`docs/planning/audits/prd-audit.md`** — new audit report (sibling of `phase-0-audit.md`). Finding-by-finding with severity + recommended fix + resolution chosen + files-touched footer. Severity table at the top: 4 blockers + 16 majors + ~14 minors (post-dedupe; subagents returned 107 raw findings).
2. **`docs/PRD.md` substantively edited.** All 4 blockers fixed; all 16 majors fixed; 6 Group A minors fixed in session. ~8 Group B minors deferred to build with rationale.

**The 4 blockers (all the same shape — §15 promised a wider product than §26 ships):**

- **B-01.** Specialist count: §15 said 4 (BA, Architect, Security, QA); §26 ships 1 (Test Designer). **Resolution:** §15 brought down to Test Designer only; §17 inlines the v0.3 MVP role set (Discovery Interviewer + Execution Brief Author + Test Designer); post-MVP role list captured for completeness.
- **B-02.** Harness profile count: §15 said 3 (Claude Code + Codex + Generic); §26 ships 2 (Claude Code + Codex); §18.Z lists 5; NFR8 said 3. **Resolution:** locked MVP at Claude Code + Codex everywhere (§15, NFR8, FR21, §18.Z per-profile MVP/post-MVP tags); Generic + Cursor + Replit/Lovable explicitly post-MVP.
- **B-03.** Memory types: §15 said "eight memory types as first-class storage"; §26 + §25.2 say polymorphic single-table. **Resolution:** §15 rewritten to "eight memory types persisted as polymorphic entries in MVP; per-type rich object views + Memory Workspace panel deferred post-MVP per §21."
- **B-04.** Stage library: §15 said "at least the MVP mid-stages"; §26 defers "full library"; §10.X labelled "MVP set." **Resolution:** §15 clarifies "configurable stage library framework in MVP, zero pre-defined mid-stages by default, 10-mid-stage catalogue is the post-MVP target"; §10.8 header changed to "(planned post-MVP catalogue)."

**The 16 majors fixed (highlights):**

- **M-01.** §5 Goals "should" → "must" across all 8 goals (modal alignment with FRs).
- **M-02.** §10 stage numbering scheme repaired. Old numbering had gaps (10.0, 10.8, 10.10–10.14, 10.X) and leaked v0.2 stage numbers ("Stage 8:", "Stage 13:") into v0.3. Renumbered as 10.1 (mapping table), 10.2 (Codebase Memory Prep), 10.3 (Harness-Based Execution), 10.4 (Result Capture), 10.5 (Verification), 10.6 (Memory Update), 10.7 (Release Evidence), 10.8 (Stage Configuration). v0.2 "Stage N:" subtitles dropped. Heading levels normalised (10.8 sub-sections now `####`).
- **M-03.** FR22 missing `current-` prefix vs §18.Y — fixed. FR22 now lists `current-execution-brief.md` etc. + `history/<timestamp>-*` snapshots.
- **M-04.** **Eight missing FRs added.** Each had a load-bearing capability promised by §15 or by a Goal but no FR backing. **FR30** Generate PRD from Discovery (Goal 2 was orphan); **FR31** Generate Test Specification with Verification Criteria (Goal 7 was orphan); **FR32** Generate Release Evidence Package (Goal 8 was orphan; §10.7 described the artefact but no FR); **FR33** Generate Requirements Catalogue (§15 promise, no FR); **FR34** Enforce Allowed/Forbidden Changes (Risk 3 described the mechanism, no FR); **FR35** Enforce Mid-stage Gates (§10.8 said "gate blocks progression", no FR); **FR36** Project Lifecycle (no FR for project creation); **FR37** Audit Trail Snapshots (§18.Y described the mechanism, no FR). Total FRs in §13 went from 12 to 20.
- **M-05.** §10.2/10.4/10.5/10.6/10.7 each got a **Gate** subsection with measurable done-when criteria.
- **M-06.** §11 Operating Modes inlined — Human-Led / AI-Assisted / AI-Led now defined in v0.3 with per-mode acceptance criteria. No more "Unchanged from v0.1, see deprecated PRD."
- **M-07.** §17 AI Execution Roles enumerated for v0.3 — MVP role set inline (Discovery Interviewer manual mode + Execution Brief Author + Test Designer); post-MVP role catalogue documented.
- **M-08.** §18.X "schema" → "Execution Brief template" header rename + pointer to `contracts/src/execution-brief.ts` for field-level types (per CHUNK-09).
- **M-09.** §18.Y gained an **Archive policy (MVP)** paragraph specifying when `history/<timestamp>-*` snapshots are written, ISO-8601 naming, immutability, manual cleanup, commit recommendations.
- **M-10.** §12.X memory types each got 2-line links + mutability notes (Intent = root, append-only; Requirement = derives-from Intent, append-only; Design = derives-from Requirement, mutable; Codebase = updated by Result, mutable; Execution/Result/Verification/Release = append-only chains).
- **M-11.** FR24 priority bumped "Should have" → "Must have" (was contradicting §15's MUST-include "memory update on verification").
- **M-12.** FR24 "where applicable" rewritten with crisp triggers (update Design if new decisions appear; Codebase if new files/conventions; Requirement if assumptions violated; audit log with timestamp + memory type).
- **M-13.** FR23 query-language MVP scope clarified (per-stage tree-view + programmatic id/type lookup in MVP; full query API + Memory Workspace panel deferred per §21).
- **M-14.** §10.8 mid-stage library table column split — was a single "Gate produces" column conflating gate criterion with artefact produced; now two columns: **Artefact produced** + **Gate criterion**. Populated for all 10 mid-stages.
- **M-15.** §24 Success Criteria rewritten with 7 measurable verifiable outcomes (end-to-end Bug Triage demo; both MVP profiles drive the loop; memory persists across ≥3 close/reopen cycles; navigable click-path traceability; VS Code + Cursor cross-editor surface; publishable proof-of-work with INSTALL.md + demo.mp4 + writeup; audit-trail completeness in committed `history/`).
- **M-16.** Terminology lock-in — canonical glossary captured in audit doc (mid-stage / AI specialist / external coding harness / memory graph vs memory types). Inline disambiguation in §17, §18.X, §18.Y. No bulk find-replace performed (PRD already mostly uses canonical forms post-renumbering).

**6 Group A minors landed in session:**

- §18.Y cross-ref to "auditability success criterion in §24" now points at the rewritten measurable bullet (m-01).
- §16 step 12 "DeliveryOS can also produce a suggested update" tightened — now Claude Code + Codex profiles produce CLAUDE.md / AGENTS.md updates explicitly (m-02).
- §25.1 signature-verification "must be tested on each target editor early" → tied to Phase 0 + CHUNK-04's multi-editor smoke (m-03).
- §10.8 "Regulated SaaS Default might include" disambiguated as a user-saveable profile example (m-04).
- §10.1 v0.1 reference framing — v0.2 mapping table is canonical; v0.1 prose is informational only (m-05).
- §25.1 "both minor for a prototype" → "to plan around" (m-06).

**~8 Group B minors deferred to build** with rationale, documented in `audits/prd-audit.md`. All are deliberate prose softness in §2/§3/§28 marketing copy, §27 risk descriptions, or §25 future-integrations framing — none cascade into build decisions.

**2 files modified + 1 new audit doc:** `docs/PRD.md` (substantively edited per above) + `docs/planning/audits/prd-audit.md` (new) + `docs/planning/PLANNING_HISTORY.md` (DOS:O4 narrative rotated) + this file. **R-track files (src/, package.json, media/) untouched** per the dirty-tree constraint — the user opened DOS:O5 with R2 in-flight files in the working tree and chose "leave dirty, start O anyway." DOS:O5 wrote only under `docs/**`. **Side effect during the session:** Track R committed DOS:R2 in parallel (three commits landing CHUNK-01 steps 4–12 — `278d79f`, `6523214`, `813a56f`), clearing the dirty tree before DOS:O5's commit step. DOS:R2's BUILD_STATUS.md wrap has not yet run.

**Follow-up commit landed same session:** the deferred consumer §-cite reconciliation (originally carried over to DOS:O6) was executed inline. Edits:

- `docs/planning/part-1-plan.md` lines 299, 315 — `PRD § 10.X` → `PRD § 10.8`.
- `docs/planning/chunks/chunk-05-discover-capture.md` lines 35, 185, 254, 675 — `PRD § 10.X` → `PRD § 10.8` (four sites).
- `docs/architecture/memory-layers.md` line 88 — "SQLite tables, one per memory type" rewritten to match CHUNK-03's polymorphic single-table strategy (was a DOS:O3 carry-over; closed here).
- `docs/BUILD-PLAN.md` — "Canonical execution order: READY.md" pointer added at the top (was a DOS:O1+O2 carry-over; closed here).

Architecture / ADR / BUILD-PLAN / MULTI_AGENT_BUILD_PROCESS scanned and clean — no other stale §10 cites or v0.2 `Stage N:` references survive.

### Gotchas the next session should know

- **PRD §10 numbering changed.** Old `§10.X` and `§10.8`–`§10.14` are gone. New scheme: `§10.1` (mapping table), `§10.2` (Codebase Memory Prep), `§10.3` (Harness-Based Execution), `§10.4` (Result Capture), `§10.5` (Verification), `§10.6` (Memory Update), `§10.7` (Release Evidence), `§10.8` (Stage Configuration). Consumer docs that cite `PRD § 10.X` or `§ 10.8` (old meaning = Codebase Memory Prep) need a follow-up sweep — see audit doc § "Deferred consumer reconciliations." This is the only PRD edit that breaks downstream cites.
- **FR count is now 20.** §13 has FR15–FR29 (original v0.3) + FR30–FR37 (added by DOS:O5). When chunk specs are next audited, expect FR30..FR37 to surface as missing-from-chunks in places (Phase 1 audit territory if/when it runs).
- **§15 MVP Scope is now the canonical scoping section.** Builder should read §15 first for "what's in MVP" — §26 is the build-phase sequencing of those items but §15 is the contract. Both now agree (B-01..B-04 resolved); the previous "trimmed ship-well scope" vs "MVP" distinction is gone.
- **§17 names the v0.3 MVP AI role set inline.** No more "see v0.1." Track R can implement against §17 directly.
- **§24 Success Criteria are now measurable.** The Bug Triage demo is the single load-bearing demo; both MVP profiles (Claude Code + Codex) must drive the loop end-to-end; cross-editor target is VS Code + Cursor at minimum.
- **The DOS:R2 dirty tree was not touched.** R-track files (`src/extension.ts`, `package.json`, `media/`, `src/stages/`) are still uncommitted. Track R picks them up at DOS:R2 unchanged.
- **Audit doc lives at `docs/planning/audits/prd-audit.md`.** Sibling to `phase-0-audit.md`. Both are sign-off docs; the validation-report.md remains the corpus-wide validation record from DOS:O3+O4.

---

## How to start the next session

The natural next move is the **DOS:R2 handover wrap** that didn't run yet:

```text
/handover R
```

DOS:R2 landed five commits during this DOS:O5 session — CHUNK-01 steps 4–12 (`278d79f`, `6523214`, `813a56f`) plus an early start on CHUNK-02 (`2f648fa` monorepo restructure + `c496121` webview package). `docs/build/BUILD_STATUS.md` was never refreshed. `/handover R` will rotate the DOS:R1 narrative there into BUILD_HISTORY.md and write the DOS:R2 narrative on top, refreshing the "What's on disk" table to reflect all five new R-commits.

After that wrap, the next development session is **DOS:R3**:

```text
/start-fresh R
```

Substantive work for DOS:R3 is **continuing CHUNK-02** (CHUNK-02 already started in DOS:R2 — the monorepo restructure and webview package are in; the remaining CHUNK-02 work is webview-host wiring + the React+Tailwind "hello" panel per CHUNK-02 spec). CHUNK-01 step 13 (`.vsix` smoke verification across editors) may have already been folded into the CHUNK-02 sessions — check BUILD_STATUS.md once it's refreshed. The DOS:O5 PRD edits do not break any active chunk spec; the §10 renumbering's consumer reconciliation was closed in this session's follow-up commit.

If another Documentation session is opened (`/start-fresh O` → DOS:O6), the carry-overs are:

### Carry-overs for DOS:O6 (if opened)

- **The ~8 Group B prose-softness minors** documented in `audits/prd-audit.md` § "Group B" — Track R can ignore; these are §2/§3/§28 vision/positioning prose nits, no build impact.
- **Phase 1 audit (CHUNK-05..08) when Track R approaches CHUNK-05.** Same shape as `phase-0-audit.md` but Phase 1 scope. Trigger: ask the user when Track R reports a chunk-spec friction point during build, or when CHUNK-04 ships. Note CHUNK-05 now reflects the post-O5 PRD §10 numbering — Phase 1 audit can assume cite stability.
- **`docs/build/BUILD_STATUS.md` line 43 citation typo** (cites CHUNK-01 § 4 instead of § 5 / § 7) — Track R hygiene fix from DOS:O4; not Track O's to edit. Will be naturally resolved at the next `/handover R`.
- **Memory Workspace UI planning sub-loop** (PRD §21) — if the project decides post-MVP to ship it.

**Resolved in DOS:O5 (no longer carry-overs):**

- ~~Consumer §-cite reconciliation for PRD §10 renumbering~~ — closed; 6 sites edited.
- ~~`memory-layers.md` "one SQLite table per memory type" prose nit~~ — closed; rewritten to match CHUNK-03 polymorphic single-table.
- ~~`BUILD-PLAN.md` → `READY.md` pointer~~ — closed; pointer added at top of BUILD-PLAN.
