# DeliveryOS

A meta-harness for AI-assisted software delivery. A harness around your harness.

**Status:** Build in progress. Phase A planning complete (PRD v0.3, 14-week BUILD-PLAN, 16 chunk specs, `docs/planning/READY.md` green-light). CHUNK-01 complete as of 2026-05-21 — `npm run package` produces a `deliveryos-0.0.1.vsix` that installs into VS Code, contributes the activity-bar rocket icon, renders four static stages (DISCOVER → DEFINE → EXECUTE → VERIFY) behind a `Create a project` welcome flow. Webview + memory persistence land next ([CHUNK-02](docs/planning/chunks/chunk-02-webview-foundation.md) + [CHUNK-03](docs/planning/chunks/chunk-03-memory-store.md)).

## What this is

DeliveryOS is a structured SDLC memory and orchestration harness around AI coding harnesses such as Claude Code, Codex, Cursor, Replit, Lovable, and local coding agents.

It does not write code. It produces Execution Briefs, hands them off to the coding harness of your choice, captures the result, verifies it against the test specification, and updates project memory.

The thesis: the winning products are not raw models, they are harnesses. DeliveryOS is the SDLC-level harness above the coding harnesses.

## Documents

Current:

- [docs/PRD.md](docs/PRD.md) — current spec (v0.3)
- [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md) — 14-week phased build plan
- [docs/MULTI_AGENT_BUILD_PROCESS.md](docs/MULTI_AGENT_BUILD_PROCESS.md) — how the project ships code via coordinated AI agents
- [docs/planning/claude-code-build-prompts.md](docs/planning/claude-code-build-prompts.md) — the four-prompt planning loop
- [docs/CRITIQUE-v2.md](docs/CRITIQUE-v2.md) — current critique (the v0.2 pivot, with v0.3 addendum)
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — version history
- [docs/decisions/0001-vsix-extension-not-fork.md](docs/decisions/0001-vsix-extension-not-fork.md) — delivery mechanism decision
- [docs/architecture/execution-briefs.md](docs/architecture/execution-briefs.md) — the core handoff artefact
- [docs/architecture/harness-profiles.md](docs/architecture/harness-profiles.md) — how DeliveryOS renders briefs for Claude Code, Codex, Cursor, etc.
- [docs/architecture/memory-layers.md](docs/architecture/memory-layers.md) — the eight typed memory layers
- [docs/architecture/stage-configuration.md](docs/architecture/stage-configuration.md) — 4 default stages + configurable mid-stage library (v0.3)

Deprecated (kept for history, see [docs/deprecated/README.md](docs/deprecated/README.md)):

- [docs/deprecated/PRD-v0.1.md](docs/deprecated/PRD-v0.1.md) — superseded original PRD
- [docs/deprecated/CRITIQUE-v1.md](docs/deprecated/CRITIQUE-v1.md) — superseded critique of v0.1

## Delivery

DeliveryOS ships as a sideloadable `.vsix` VS Code extension. One file runs in VS Code, Cursor, Windsurf, Antigravity, and VSCodium. Not a fork, not a standalone app. See ADR-0001.

## Repo layout

```
DeliveryOS/
├── docs/
│   ├── PRD.md                  Current spec (v0.3)
│   ├── BUILD-PLAN.md           14-week phased build plan
│   ├── CRITIQUE-v2.md          Current critique
│   ├── CHANGELOG.md            Version history
│   ├── MULTI_AGENT_BUILD_PROCESS.md  How the project ships code
│   ├── architecture/           System design notes
│   ├── decisions/              ADRs
│   ├── planning/               Phase A: chunk specs + planning loop
│   ├── build/                  Phase B: build-cycle working area + bugs.json
│   ├── commands/               Claude Code command sources (copy to .claude/commands/)
│   ├── prompts/                Prompt templates for SDLC specialist roles
│   ├── specialists/            Specialist role definitions
│   ├── research/               Competitive notes, harness research
│   └── deprecated/             Superseded specs and critiques
├── src/
│   ├── extension.ts            VS Code extension entry (CHUNK-01 scaffold)
│   ├── contextKeys.ts          deliveryos.* context-key constants
│   ├── projectRegistry.ts      InMemoryProjectRegistry (CHUNK-03 swaps in persistence)
│   ├── commands/
│   │   ├── projectCreate.ts    deliveryos.project.create
│   │   └── stagesRefresh.ts    deliveryos.stages.refresh
│   └── stages/
│       ├── stageDefinitions.ts STAGE_DEFS (4 frozen entries)
│       ├── stageTreeNodes.ts   StageNode | ArtefactNode + toTreeItem
│       └── stageTreeProvider.ts TreeDataProvider, gated on active project
├── media/
│   ├── icon-rocket.svg         Activity-bar icon (Lucide rocket, monochrome)
│   └── deliveryos-logo.png     Extension icon (Extensions sidebar)
├── package.json                Extension manifest
├── tsconfig.json
├── .vscodeignore
└── .github/workflows/
```

## Getting started

```bash
npm install
npm run package
code --install-extension deliveryos-0.0.1.vsix
```

After install, click the rocket icon in the activity bar. A welcome panel offers **Create a project**; submitting a name renders the four stage rows (DISCOVER, DEFINE, EXECUTE, VERIFY). Each row is empty — artefacts arrive in later chunks. The Extension Host output shows `DeliveryOS activated` on startup.

### Known limitations (CHUNK-01)

- **Project state is in-memory only.** Closing VS Code forgets the project — the welcome view returns on next launch. Persistence lands in [CHUNK-03](docs/planning/chunks/chunk-03-memory-store.md).
- **Workspace trust required.** DeliveryOS declines to activate in restricted or virtual workspaces, by design (see `capabilities.{untrustedWorkspaces,virtualWorkspaces}.description`).

## What's next

Week-by-week build steps are in [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md). The week-2 milestone is a `.vsix` that installs into both VS Code and Cursor — the Phase 0 demoable state after [CHUNK-02](docs/planning/chunks/chunk-02-webview-foundation.md) (webview foundation), [CHUNK-03](docs/planning/chunks/chunk-03-memory-store.md) (memory store), and [CHUNK-04](docs/planning/chunks/chunk-04-multi-editor-verify.md) (multi-editor verify) land.
