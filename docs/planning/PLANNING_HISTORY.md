# History — track O (Documentation)

Older "what just landed" sections from `PLANNING_STATUS.md`, newest on top.

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
