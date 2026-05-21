# Handover — Documentation (DOS:O)

**Last updated:** 2026-05-21 (end of DOS:O2 — Phase A Prompt 1: chunk plan)

Read this file **first** when starting a new Documentation session (`/start-fresh O`). It is the single rolling source of truth for track O: state, narrative, and carry-overs all in one doc. Older "what just landed" sections rotate out to `docs/planning/PLANNING_HISTORY.md` newest-on-top.

---

## What's on disk + what's running

| Thing | State |
|---|---|
| Repo HEAD | `0cee6f7` — `docs(planning): land Phase A Prompt 1 — chunk plan (DOS:O2)` |
| Commit count | 5 |
| Tags | none yet |
| Session model definition | `docs/MULTI_AGENT_BUILD_PROCESS.md` § 12 |
| Session config | `.claude/session-config.yml` (prefix `DOS`, tracks O + R) |
| PRD | `docs/PRD.md` v0.3 (2026-05-20, delivery decisions added 2026-05-21) |
| Build plan | `docs/BUILD-PLAN.md` — 14 weeks, week 1 starts 2026-05-25, demo target 2026-08-24 |
| Phase A planning state | **Prompt 1 complete** — `docs/planning/part-1-plan.md` (16 chunks across BUILD-PLAN Phases 0–4, ordered build sequence, dependency map, 12 research-driven changes flagged for Prompt 4). Prompts 2–4 pending: no chunk specs under `docs/planning/chunks/` yet, no `validation-report.md`, no `READY.md`. |
| Phase B build state | not started (week 1 of BUILD-PLAN has not begun) |
| Open bugs | 0 — `docs/build/bugs.json` is `{"bugs": []}` |

---

## What just landed (this session — DOS:O2)

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

**Commits this session.** Two: substantive (`0cee6f7`) + this wrap (next commit on top). Two-commit pattern matches DOS:O1.

### Gotchas the next session should know

- **The 12 research-driven changes are tracked in `part-1-plan.md`, not in the source docs yet.** Prompt 4 (DOS:O3) is the canonical place to fold them back in. Don't pre-emptively edit PRD/BUILD-PLAN/ADR — let Prompt 4 do it as part of the validation loop so the audit trail is clean.
- **Prompt 2 spawns 16 subagents in parallel** (one per chunk). Each writes a single `docs/planning/chunks/chunk-NN-*.md` spec. Worktree-isolated subagents will leave residue under `.claude/worktrees/agent-*/`; `/handover O` cleans them per the skill. Plain Agent calls (no `isolation: worktree`) leave nothing. Pick the right mode per chunk — for parallel-write chunks, worktree isolation is safer.
- **`current-*` vs `history/` split for `.deliveryos-handoff/`** is a decision the planning loop made but Track R hasn't implemented yet. CHUNK-11 lands the implementation. If Track R picks up CHUNK-01 → 04 (Phase 0) before CHUNK-11, the handoff directory pattern can be deferred without blocking.
- **HEAD in this table points at the substantive commit (`0cee6f7`), not the wrap commit.** Convention inherited from DOS:O1.

---

## How to start the next session

```
/start-fresh O
```

Session name to use: **DOS:O3**

Substantive work for DOS:O3 is **Prompts 2–4 of the Phase A planning loop**:

- **Prompt 2** — expand each of the 16 chunks into `docs/planning/chunks/chunk-NN-*.md` specs in parallel (16-way fan-out). Each spec includes file-by-file breakdown, key interfaces and types, data model touches, VS Code APIs used, step-by-step implementation outline, test plan, risks, explicit dependencies. Plus `docs/planning/chunks/README.md` listing cross-chunk types and contracts.
- **Prompt 3** — cohesion audit. Parallel audit subagents check for gaps, overlaps, interface mismatches, dependency problems, shared-contract drift, verification gaps, scope drift. Writes `docs/planning/validation-report.md`.
- **Prompt 4** — iterate until clean. Resolves blockers + majors. During iteration, fold the 12 research-driven changes from `part-1-plan.md` into PRD / BUILD-PLAN / ADR / architecture docs. Writes `docs/planning/READY.md` when zero blockers + zero majors remain.

Once `READY.md` exists, Track R can open its first session (`/start-fresh R` → DOS:R1) and pick a chunk to build.

### Carry-overs for DOS:O3

- **Run Prompt 2** — 16-way parallel chunk-spec expansion. Decide whether to use `isolation: worktree` for each subagent (safer for parallel writes to separate files; do clean them up on wrap).
- **Run Prompt 3** — cohesion audit → `validation-report.md`.
- **Run Prompt 4** — iterate until clean → `READY.md`. During this prompt, fold the 12 research-driven changes from `part-1-plan.md` § "Research-driven changes" into PRD / BUILD-PLAN / ADR / architecture. Don't pre-emptively edit them in DOS:O3 — let Prompt 4 do it so the audit trail is one coherent edit pass.
- **Reconcile `docs/BUILD-PLAN.md` chunk-order framing** once `READY.md` exists (inherited carry-over from DOS:O1; still applies). Possibly just a one-liner in BUILD-PLAN pointing at READY.md as the canonical execution order.
- **`current-*` vs `history/` split for `.deliveryos-handoff/`** — implementation lives in CHUNK-11 but the decision can land earlier if Track R wants it before then.
- **Worktree hygiene.** Prompt 2 fans out 16 subagents; if any use `isolation: worktree`, `/handover O` cleans them on wrap.
