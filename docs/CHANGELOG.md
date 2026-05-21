# Changelog

## Process setup (2026-05-21)

Added the build process, separate from the product spec.

- Added `docs/planning/claude-code-build-prompts.md`: a four-prompt planning loop (break into chunks, expand, validate, iterate) for Claude Code, using subagents.
- Added `docs/MULTI_AGENT_BUILD_PROCESS.md`: the 3-role, chunk-based, incremental build process, adapted from the AMI multi-agent build process for the VS Code extension stack (SQLite, no PostgreSQL).
- Added the `docs/build/` Phase B working area (invocations, builder_reports, qa_invocations, qa_reports, fix_prompts, blockers).
- Added `docs/commands/fix-bugs.md`: the DeliveryOS bug-fix command, adapted from the AMI version. Bug tracking is a version-controlled JSON file (`docs/build/bugs.json`) instead of a remote PostgreSQL `bug_reports` table, since DeliveryOS is a solo build with no distributed testers. Copy command sources from `docs/commands/` into `.claude/commands/` for Claude Code to use.
- Added `docs/build/bugs.json` (empty bug list).
- Fixed `.gitignore`: the `build/` rule was root-anchored to `/build/` so the tracked `docs/build/` folder is not silently ignored; added `*.vsix` and `.claude/worktrees/` plus `.claude/active-track`.
- Session model: two tracks, O (Docs, runs Phase A planning) and R (Development, runs Phase B build), wrapped by `/start-fresh` and `/handover`. Recorded in `MULTI_AGENT_BUILD_PROCESS.md` section 12.
- Project promoted from `Eval/DeliveryOS` to the drive root at `/Volumes/Extreme Pro/DeliveryOS`, and initialised as a git repo (first commit on `main`).

## v0.3 (2026-05-20, delivery decisions added 2026-05-21)

Configurable lifecycle. The 14-stage v0.2 lifecycle is collapsed to four default stages (DISCOVER, DEFINE, EXECUTE, VERIFY) plus a library of opt-in mid-stages. The discovery interview asks trigger questions that suggest the right mid-stages for each project. A solo internal tool runs the four-stage default with no extras. A regulated product runs the same four stages with Security, Privacy, Compliance, and Legal mid-stages slotted in, each with its own gate.

Changes:

- Added section 9 lifecycle revision (4 default + configurable mid-stages).
- Added section 10.X Stage Configuration with the mid-stage library and trigger table.
- Added FR26 (Configurable Stage Library), FR27 (Discovery-driven stage suggestion), FR28 (Add/remove stages mid-project), FR29 (Stage profiles).
- Added `docs/architecture/stage-configuration.md` covering the full library, gates, profiles, and mid-project re-routing.
- Updated MVP scope to include the stage library and discovery-driven suggestion.
- Updated MVP user journey with example trigger flows for an internal tool vs a healthtech product.

This addresses the "lifecycle too long" concern from CRITIQUE-v2.md. The product is now lean by default and earns its weight only when the project requires it.

Delivery decisions (added 2026-05-21):

- Decided: DeliveryOS ships as a sideloadable `.vsix` VS Code extension, not a fork and not a standalone app. Recorded in ADR-0001 (`docs/decisions/0001-vsix-extension-not-fork.md`). One `.vsix` runs in VS Code, Cursor, Windsurf, Antigravity, and VSCodium.
- Rewrote PRD section 25 as "Delivery Mechanism and Technical Stack" reflecting the extension architecture (webview UI, extension-host backend, no separate server).
- Rewrote PRD section 26 MVP Build Phases for the trimmed ship-well scope.
- Added `docs/BUILD-PLAN.md`: a 14-week phased build plan sized for a light pace of 5 to 10 hours per week, targeting demo-ready by the week of 2026-08-24.
- First build scope confirmed as the trimmed ship-well MVP: four stages, one specialist (Test Designer), two harness profiles (Claude Code, Codex), one demo (Bug Triage).

## v0.2 (2026-05-20)

Architectural correction. DeliveryOS is repositioned as a meta-harness around external AI coding harnesses (Claude Code, Codex, Cursor, Replit, Lovable, etc.) rather than a self-contained SDLC tool.

Changes:

- Added section 0 (Architectural Correction) framing the layered Model → Harness → Meta-Harness model.
- Replaced "AI-Assisted Implementation" with "Harness-Based Execution".
- Replaced "Implementation Prompt" with **Execution Brief** (formal 10-section schema).
- Added **Execution Harness Profiles** (Claude Code, Codex, Cursor, Generic).
- Added the eight-type **memory graph** (Intent, Requirement, Design, Codebase, Execution, Result, Verification, Release) as first-class product objects.
- Added file-based handoff via `/deliveryos-handoff/`.
- Added MCP server mode as a future-phase capability.
- Added new functional requirements FR21–FR25.
- Added NFR8 (Harness Neutrality) and NFR9 (Memory Durability).
- Extended lifecycle from 12 to 14 stages (Codebase Memory Preparation, Result Capture, Memory Update split out).
- Refined risks and mitigations for the new architecture.
- Added architecture references in `docs/architecture/` for Execution Briefs, Harness Profiles, Memory Layers.

Critique added: `docs/CRITIQUE-v2.md`. v0.1 PRD superseded (now at `docs/deprecated/PRD-v0.1.md`).

## v0.1 (2026-05-20)

Initial PRD. Positioned DeliveryOS as an AI-native SDLC workbench that guides software work from raw idea to verified release. 12-stage lifecycle, 11 specialist AI roles, manual copy-paste handoff to external coding tools.

Superseded by v0.2.
