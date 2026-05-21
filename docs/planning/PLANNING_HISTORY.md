# History — track O (Documentation)

Older "what just landed" sections from `PLANNING_STATUS.md`, newest on top.

---

## DOS:O4  (2026-05-21)

Third validation pass scoped to Phase 0 (CHUNK-01..04 + the source-of-truth docs they reference + the Phase 1+ chunks that consume Phase 0 contracts). Triggered by DOS:R1 producing the first real-world test of the planning corpus — building CHUNK-01 steps 1–3 + smoke-verifying a 3.79 KB `.vsix`. Four parallel cohesion-audit subagents (coverage, structure, contracts, verification) ran against the Phase 0 slice.

**Substantive deliverables (single commit `88b95b1`):**

1. **`docs/planning/audits/phase-0-audit.md`** — new audit report (new `audits/` folder). Finding-by-finding with severity + recommended fix + resolution chosen + files-touched footer. Mirrors the Prompt-3 cohesion-audit shape from DOS:O3 but scoped to Phase 0 only.
2. **3 blockers + 17 majors + ~34 minors** documented. All blockers + majors fixed in-session. Group A (cross-ref hygiene) + Group B (build-friction) minors landed. ~26 verification-framing minors deferred to build with rationale.
3. **`docs/planning/validation-report.md`** sign-off section appended with Iteration 3 entry. Iteration-2's "13-entry LINK_KINDS" claim explicitly superseded.

**Findings the iteration-2 corpus had missed (because iteration-2 audited the corpus as a whole; iteration-3 traced producer→consumer contract surfaces explicitly):**

- **B-01.** `targets` and `references-codebase` link kinds had zero writers; `subject-of-decision` was semantically identical to `verifies`. **Resolution:** `LINK_KINDS` reduced from 13 to 10. CHUNK-14 walker simplified — Execution → Requirement reached via `derives-from`; Execution → Codebase deferred until a Codebase Memory writer chunk lands; `verifies` covers both active-verdict scope and history edge.
- **B-02.** CHUNK-03 used subpath imports (`@deliveryos/contracts/memory`) that CHUNK-02's `contracts/package.json` shape didn't resolve. **Resolution:** added `exports` map to CHUNK-02 § 3.1 covering `./memory`, `./links`, `./panels/*`.
- **B-03.** CHUNK-09 imported `Requirement`/`CodebaseMemory`/`TestSpecMemory` aliases CHUNK-03 didn't export. **Resolution:** added canonical per-type aliases (`IntentMemory`, `RequirementMemory`, `DesignMemory`, …) in CHUNK-03's `contracts/src/memory.ts`.

**Majors fixed (highlights):**

- CHUNK-01 § 4 didn't actually sanction DOS:R1's pre-include of `activationEvents` at step 1 — spec citation in BUILD_STATUS line 43 was wrong. CHUNK-01 § 7 step 6 now states both orderings are acceptable, with step-1 preferred for partial-session smokes.
- CHUNK-01 § 8.1 expected `.vsix` contents annotated per step-slice (steps 1–3 vs 1–6 vs 1–13) + size band per slice so partial-session smokes verify the right subset.
- Phase 0 boundary now has a **consolidated rehearsal checklist** in CHUNK-04 § 11.5 (single source replacing the cross-chunk composition that lived implicitly across four chunks).
- CHUNK-09/12 call shapes corrected to match CHUNK-03's `MemoryStore` API (positional `link(from, to, kind)`; object-arg `create({ type, title, payload, body? })`).
- READY.md "Parallelisable pairs" claim rewritten to reflect CHUNK-03's actual CHUNK-02 dependency.
- vscode-messenger version pin cross-chunk enforcement note added to CHUNK-02 § 4.2.
- CHUNK-03 § 1 Phase-0 scope note clarifying that the 9-arm payload union + 10-kind link vocabulary + walker are contract-freeze work, not Phase-0 done-when work.

**Minors landed in session (Groups A + B):**

- Broken `chunk-01-extension-scaffold.md` links in CHUNK-02 + CHUNK-03 → `chunk-01-scaffold.md`.
- `PersistedProjectRegistry` seam ambiguity resolved (direct rebind chosen).
- sql.js wasm copy strategy under `--no-dependencies` packaging clarified in CHUNK-03 § 2.12.
- `stages/` → `tree/` directory rename signposted at CHUNK-02 § 3.5 header.
- CHUNK-03 § 11.1 step 4 vocabulary aligned with CHUNK-01 (project name vs. idea text).
- CHUNK-04 § 11.1 step 6 "reopen the same workspace folder"; § 11.5 "in parallel" rewrite.

**~26 verification-framing minors deferred** to build with rationale, documented in `audits/phase-0-audit.md` § "Group C". Examples: per-editor install stdout capture conventions, README troubleshooting placeholder for "Cursor refused install", verbose-mode smoke addition, vite manifest recovery line.

**11 files modified + 1 new audit doc.** PRD / BUILD-PLAN / architecture/* / ADR-0001 untouched (no Phase 0 drift surfaced for them in this audit). `docs/build/BUILD_STATUS.md` not edited (Track R's territory; the citation typo there is documented in the audit as a Track R hygiene item). *(DOS:O5 followed up with a standalone PRD audit — see top of PLANNING_STATUS.md.)*

### Gotchas the next session should know *(historical — see PLANNING_STATUS.md for the post-DOS:O5 state)*

- **`LINK_KINDS` is now 10 entries, not 13.** Any reference to "13 canonical link kinds" in fresh writing is wrong. The retirement list in CHUNK-03 § 5.5 "Explicitly removed" has the rationale for each of the three drops.
- **The new audit doc `docs/planning/audits/phase-0-audit.md` is the post-DOS:O4 source of truth for Phase 0 cohesion.** `validation-report.md` is iteration-2 final with iteration-3 appended at the bottom; the appended section explicitly supersedes the earlier 13-link claim.
- **Track R has already started.** DOS:R1 is wrapped (CHUNK-01 steps 1–3 done). Track R's BUILD_STATUS.md says steps 4–6 are next at DOS:R2. The DOS:O4 audit fixes apply to specs Track R hasn't built against yet — meaning the iteration-3 corrections are in place *before* Track R reaches the affected chunks.
- **The Phase 0 rehearsal checklist now lives in CHUNK-04 § 11.5** — a future "is Phase 0 done?" check walks one list, not four chunks' separate done-whens.
- **No worktree residue.** Both audit subagent batches in DOS:O4 ran read-only (no `isolation: worktree`); `.claude/worktrees/` is empty.
- **DOS:O4 wrap commit was the 13th on main** (`c907cd9`). HEAD just before the wrap was `88b95b1` (the audit-landing commit).

---

## DOS:O3  (2026-05-21)

Phase A planning loop completed. Track R is unblocked. The output is `docs/planning/READY.md` plus the full evidence chain that produced it.

**Substantive deliverables (single landing commit `bee77f2`, building on `97d00cc` from the same session):**

1. **16 chunk specs in `docs/planning/chunks/`** (~11,300 lines total). Each spec covers: restated goal, file-by-file breakdown, key interfaces and types, data-model touches, VS Code APIs, step-by-step implementation outline, test plan, risks, explicit dependencies. Plus `chunks/README.md` — the cross-chunk contract index.
2. **`docs/planning/validation-report.md`** — final state: zero blockers, zero majors, ~22 justified residual minors with rationale.
3. **`docs/planning/READY.md`** — the green-light document for Track R. Names the canonical contracts, the final ordered chunk list, the phase boundaries, the verified-folded research changes.
4. **Source-of-truth docs updated**: PRD (handoff path consistency, sql.js, Radix UI, workspace-trust caps, PreToolUse Risk 3 mitigation, Memory Workspace deferral); BUILD-PLAN Week 2; ADR-0001 Consequences; all 4 `architecture/*.md` files.

**How it was produced (the loop runs on itself).**

- **Prompt 2** — 16 worktree-isolated parallel subagents (`isolation: worktree`), one per chunk. Each subagent owned a single `chunk-NN-*.md` spec file, committed it on its isolation branch, and reported back. After all 16 returned, I copied the files into main, committed them as `97d00cc`, removed all 16 worktrees + their branches.
- **Prompt 3** — 4 parallel cohesion-audit subagents (no worktree, read-only): coverage + scope drift, structure + dependencies, contracts + interface consistency, verification / "Done when" checkability. Each audit returned ≤25 findings with severity + recommended fix. Initial findings: 5 blockers, 18 majors, 16 minors.
- **Prompt 4 iteration 1** — ~10 parallel fix subagents, one per chunk file with the biggest fix lists (CHUNK-03, 09, 10, 12, 13, 14, 15) plus one batched subagent for 9 smaller chunks, one subagent for `chunks/README.md`, one subagent for the 6 source-of-truth docs. Each got the validation report + a focused fix list. No worktrees — each subagent edited a unique file in-place.
- **Prompt 3 iteration 2** — same 4-audit shape, scoped to verify iteration 1's fixes. Surfaced 1 blocker (CHUNK-12 tree-provider regression), 5 majors (parallel tree contribution file, VERIFY-vs-EXECUTE placement, missed PRD path replaces, missing edge-table rows, stale `projectTree.ts` reference), 26 minors.
- **Prompt 4 iteration 2** — applied surgical edits directly (no subagents — small focused changes). Cleared the blocker + all 5 majors + 10 high-value minors. Documented the ~22 remaining minors as justified residue in `validation-report.md`.

**Canonical contracts the loop established (each owned by exactly one chunk, imported elsewhere):**

- **Memory types** (CHUNK-03): 9 canonical entries — `intent`, `requirement`, `design`, `codebase`, `execution`, `result`, `verification`, `release`, `test-spec`. Discovery lives at `IntentPayload.discovery`; PRD is `requirement` with `payload.kind === 'prd'`; bypasses are at `VerificationPayload.bypasses[]`.
- **Link kinds** (CHUNK-03 via `contracts/src/links.ts`): 13 canonical kinds; `LINK_KIND_EDGES` table specifies every legal from-type → to-type edge. *(Superseded in DOS:O4 iteration-3 audit — kinds reduced to 10.)*
- **Webview message contracts** (CHUNK-02 via `contracts/`).
- **Execution Brief markdown schema** (CHUNK-09 via `extension/src/brief/briefMarkdown.ts`): 10 H2 sections, `BRIEF_SCHEMA_VERSION = 1`, `RESULT_MD_SECTION_NAMES` shared with CHUNK-12.
- **Harness Profile schema** (CHUNK-10): with `command_template?` and `harness_version_pin?`.
- **Managed delimiter block syntax** (CHUNK-10 via `extension/src/profiles/managedBlock.ts`): three formats — `'md'`, `'json'` (sentinel key `"deliveryos.managed"`), `'gitignore'`.
- **Handoff directory layout** (CHUNK-11 via `extension/src/handoff/paths.ts`): `.deliveryos-handoff/` dotfile root; flat `current-*` + `history/<timestamp>-*` audit trail.

**Commits this session.** Three: `97d00cc` (Prompt 2 chunk specs), `bee77f2` (Prompts 3+4 validation + iteration + READY), and the wrap `90ec72f`. Three-commit pattern reflects the multi-step nature of the planning loop.

### Gotchas the next session should know *(historical — see PLANNING_STATUS.md for the post-DOS:O4 state)*

- **DOS:O3 produced `READY.md` — Track R is unblocked.** Track R can now run `/start-fresh R` to open DOS:R1 and start at CHUNK-01.
- **`READY.md` § "Justified minor residue" is canonical.** Don't try to fix the documented minors as a separate planning pass — they were deliberately deferred. Track R should address them during the corresponding chunk's build (e.g. command-ID naming convention is for CHUNK-01's `package.json` integration sweep).
- **`validation-report.md` is iteration-2 final.** Two iterations ran in DOS:O3; the file reflects the post-iteration-2 state with full iteration history at the top. Don't overwrite it without a third validation run. *(DOS:O4 ran the third validation pass; report appended.)*
- **The `LINK_KIND_EDGES` table in CHUNK-03 is the type-checker for memory writes.** If Track R adds a new edge during build (e.g. CHUNK-09 actually writing `targets` or `references-codebase`), the corresponding row must already exist in the table — otherwise the planning corpus drifts again. *(Resolved in DOS:O4 by retiring those kinds.)*
- **HEAD in this table points at the wrap commit this session (`bee77f2`)**, not the substantive Prompt-2 commit (`97d00cc`). Two substantive commits + this wrap makes three; the wrap commit was 9th on main.
- **No worktree residue.** All 16 Prompt-2 worktrees were removed in DOS:O3 itself; `.claude/worktrees/` is empty.
- **PRD/architecture doc updates land as part of the planning corpus, not separately.** They were folded in during Prompt 4 iteration. Don't try to re-fold the 12 research-driven changes — they're already in.

---

## DOS:O2  (2026-05-21)

Phase A Prompt 1 — chunk plan for the trimmed MVP. The big move of this session: turning the 14-week BUILD-PLAN + the v0.3 PRD into a validated chunk break-down that Prompt 2 can fan out on.

**Substantive deliverable.** `docs/planning/part-1-plan.md` (~870 lines, commit `0cee6f7`):

- **16 chunks** spanning BUILD-PLAN Phases 0–4, each 1–5 session-days, mapped 1:1 onto the 14-week schedule.
- **Ordered build sequence** (week-by-week table) with CHUNK-02/03 flagged as the only parallelisable pair; everything from CHUNK-05 onward is strictly sequential.
- **Dependency map** (ASCII) with CHUNK-13 (Allowed/Forbidden diff + Claude Code PreToolUse hook) starred as the headline / unique feature.
- **Shared cross-chunk contracts** sketched (memory schema, brief schema, profile schema, handoff layout, managed-block delimiter syntax) for Prompt 2 to formalise without duplication.
- **Phase-boundary fallback** noted: if the timeline slips, Phase 3 end (after CHUNK-14) is the minimum acceptable ship — the SDLC loop is closed and the diff feature works.

**How it was produced.** Six research subagents in parallel: VS Code extension architecture, webview panels (React + Tailwind + CSP), VSIX packaging + cross-editor sideload, persistence (SQLite options), terminal integration + harness CLI shapes, harness conventions (CLAUDE.md / AGENTS.md / MCP / hooks). Findings synthesised into chunks + a 12-item list of source-doc updates.

**Research-driven changes flagged for Prompt 4** (consolidated list in [part-1-plan.md § "Research-driven changes"](part-1-plan.md)):

- **HIGH #1.** Ship **`sql.js`** (WASM), not `better-sqlite3` — native modules break across editor forks' Electron ABIs. PRD § 25.2 to update.
- **HIGH #4.** Codex CLI has **`-o/--output-last-message <file>`** — maps directly onto `result.md` and reshapes the Codex profile. `architecture/harness-profiles.md` to update.
- **HIGH #5.** Claude Code's **`PreToolUse` hooks** can hard-block Forbidden paths in real time (cannot be bypassed by `--dangerously-skip-permissions`). Upgrades the headline diff feature on the Claude profile; Codex stays diff-only. PRD § 27 Risk 3 mitigation to strengthen; CHUNK-13 incorporates this.
- **HIGH #3.** **Sideloaded VSIX bypasses signature verification by design** across all 5 target editors — *resolves* the ADR-0001 concern (the risk is years-out tightening, not present-day breakage). ADR-0001 Consequences to tighten.
- **MEDIUM #2.** **`@vscode/webview-ui-toolkit` was deprecated 2025-01-01** — use Radix UI + Tailwind + Lucide React inside Vite-built React webviews with hybrid theming. PRD § 25.2 to update.
- **LOW items:** handoff directory naming standardised on `.deliveryos-handoff/` (dotfile, PRD § 18.Y); `current-*` vs committed `history/` split; trusted-workspace capability declaration; modern `onStartupFinished` activation; `onDidWriteTerminalData` is permanently proposed, do not rely on it; AGENTS.md now a Linux Foundation open standard (Dec 2025); MCP momentum stronger than PRD wording suggests, both Claude Code AND Codex support it.

**Commits this session.** Two: substantive (`0cee6f7`) + wrap (`7b693fa`). Two-commit pattern matches DOS:O1.

### Gotchas the next session should know (as captured at the time)

- **The 12 research-driven changes are tracked in `part-1-plan.md`, not in the source docs yet.** Prompt 4 (DOS:O3) is the canonical place to fold them back in. Don't pre-emptively edit PRD/BUILD-PLAN/ADR — let Prompt 4 do it as part of the validation loop so the audit trail is clean.
- **Prompt 2 spawns 16 subagents in parallel** (one per chunk). Each writes a single `docs/planning/chunks/chunk-NN-*.md` spec. Worktree-isolated subagents will leave residue under `.claude/worktrees/agent-*/`; `/handover O` cleans them per the skill.
- **`current-*` vs `history/` split for `.deliveryos-handoff/`** is a decision the planning loop made but Track R hasn't implemented yet. CHUNK-11 lands the implementation.
- **HEAD in this table points at the substantive commit (`0cee6f7`), not the wrap commit.** Convention inherited from DOS:O1.

---

## DOS:O1  (2026-05-21)

Bootstrap session. Two parallel things happened:

1. **`/session-setup` ran first** and wrote `.claude/session-config.yml` from defaults. It used `HANDOVER_O.md` / `HANDOVER_R.md` as the handover paths because I hadn't yet seen the in-flight doc edits that specified otherwise.
2. **`/start-fresh O` immediately found the in-flight doc edits** to `docs/CHANGELOG.md` and `docs/MULTI_AGENT_BUILD_PROCESS.md` § 12, which intentionally name `docs/planning/PLANNING_STATUS.md` and `docs/build/BUILD_STATUS.md` as the handover docs (AMI single-doc-per-track convention). The doc and the just-written config disagreed.

The session work was reconciling the two. The doc won — it captures intentional design and the AMI convention the project is explicitly mirroring (§ 13 calls `BUILD_STATUS.md` "the single source of truth"). Concretely:

- `.claude/session-config.yml` rewritten: track O `handover_path` → `docs/planning/PLANNING_STATUS.md`, history → `docs/planning/PLANNING_HISTORY.md`, `project_plan_path` omitted (the handover doc absorbs the backlog in this model). Track R `handover_path` → `docs/build/BUILD_STATUS.md`, history → `docs/build/BUILD_HISTORY.md`, `project_plan_path` kept as `docs/BUILD-PLAN.md` (the 14-week static roadmap is genuinely a separate doc from the rolling status).
- `docs/MULTI_AGENT_BUILD_PROCESS.md` § 12 picked up the two-track description and the per-track handover paths (this was the user's in-flight edit; just landed it intact).
- `docs/CHANGELOG.md` entry added recording the model + the `Eval/DeliveryOS` → drive-root + git-init promotion.

All three landed as one wrap commit: **`5cca542`**.

This file (`docs/planning/PLANNING_STATUS.md`) was created on the second wrap of this session — `/handover O` is its canonical author, this is the first instance.

### Gotchas the next session should know

- **`/remote-control` and `/rename` are not Skill targets in the VSCode extension environment.** `/start-fresh` and `/handover` skip them silently; rename the chapter manually from FleetView if you want session tags on chapters.
- **Track R has no rolling status doc yet either** — `docs/build/BUILD_STATUS.md` will be created by `/handover R` on the first development session, the same way this file was created today. Until then, `/start-fresh R` will surface that the file doesn't exist (alongside the three sanity checks, which are pre-build-friendly and only the lint check will print the "not yet wired" message).
- **The bug-list block in config is enabled for Track R** even though `bugs.json` is currently empty. That's fine — `/start-fresh R` will report 0 open bugs until the build starts producing them.
- **`docs/build/**` is in `scan_excludes`.** That means consistency scans skip `BUILD_STATUS.md`, `BUILD_HISTORY.md`, and the build artefact subdirs. Intentional: rolling status narratives shouldn't trigger scan flags. Just be aware that scans run from Track O will not catch stale refs *inside* Track R's handover doc — that's Track R's wrap's job.
