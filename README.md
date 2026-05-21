# DeliveryOS

A meta-harness for AI-assisted software delivery. A harness around your harness.

**Status:** Build in progress. Phase A planning complete (PRD v0.3, 14-week BUILD-PLAN, 16 chunk specs, `docs/planning/READY.md` green-light). CHUNK-01 + CHUNK-02 complete as of 2026-05-21 — `npm run package` produces a `deliveryos-0.0.2.vsix` (~65 KB) that installs into VS Code, contributes the activity-bar rocket icon, renders the four-stage tree behind a `Create a project` welcome flow, and exposes a `DeliveryOS: Open Hello (dev smoke test)` command that opens a React + Tailwind webview panel with a CSP-locked round trip to the extension host via `vscode-messenger`. Memory persistence + multi-editor verification land next ([CHUNK-03](docs/planning/chunks/chunk-03-memory-store.md) + [CHUNK-04](docs/planning/chunks/chunk-04-multi-editor-verify.md)).

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

```text
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
├── extension/                  VS Code extension host package (name: "deliveryos")
│   ├── src/
│   │   ├── extension.ts        activate() / deactivate() — wires registry, tree, host messenger, serializer
│   │   ├── contextKeys.ts      deliveryos.* context-key constants
│   │   ├── projectRegistry.ts  InMemoryProjectRegistry (CHUNK-03 swaps in persistence)
│   │   ├── commands/           {projectCreate, stagesRefresh, openHello}.ts
│   │   ├── tree/               {stageDefinitions, stageTreeNodes, stageTreeProvider}.ts
│   │   ├── webview/            {nonce, htmlFactory, messenger, panelManager, helloPanel}.ts
│   │   └── serializers/        helloPanelSerializer.ts
│   ├── media/                  icon-rocket.svg + deliveryos-logo.png
│   ├── package.json            Extension manifest (engines, contributes, activationEvents)
│   ├── tsconfig.json
│   ├── esbuild.mjs             Bundle src/ + vscode-messenger → dist/extension.js
│   └── .vscodeignore
├── webview/                    React + Tailwind webview app (private: @deliveryos/webview)
│   ├── src/
│   │   ├── shared/             {vscode, messenger, styles/tailwind.css}
│   │   └── panels/hello/       {index.html, main.tsx, HelloApp.tsx}
│   ├── vite.config.ts          Multi-entry build, per-panel Rollup input, manifest.json
│   ├── tailwind.config.ts      Hybrid theming: dos.* palette + vscode.* CSS-var anchors
│   ├── postcss.config.js
│   ├── package.json            (name: @deliveryos/webview)
│   └── tsconfig.json
├── contracts/                  Type-only shared contracts (name: @deliveryos/contracts)
│   └── src/
│       ├── messages.ts         Base RequestType / NotificationType helpers
│       ├── panels/hello.ts     GetHelloText RequestType
│       └── index.ts            Namespaced barrel (export * as Hello)
├── scripts/build.mjs           Orchestrator: contracts → webview → extension, then copy webview/dist → extension/dist/webview
├── tsconfig.base.json          Shared strict TS options
├── package.json                Root workspaces manifest
└── .github/workflows/
```

## Getting started

```bash
npm install
npm run package
code --install-extension extension/deliveryos-0.0.2.vsix
```

After install, click the rocket icon in the activity bar. A welcome panel offers **Create a project**; submitting a name renders the four stage rows (DISCOVER, DEFINE, EXECUTE, VERIFY). Each row is empty — artefacts arrive in later chunks. The Extension Host output shows `DeliveryOS activated` on startup.

Smoke-test the webview round trip via the command palette: **DeliveryOS: Open Hello (dev smoke test)** opens a React + Tailwind panel that calls `Hello.GetHelloText` against the extension host and renders the reply + a server-side ISO timestamp. Use **Developer: Open Webview Developer Tools** to confirm zero CSP violations.

### Known limitations (CHUNK-01 + CHUNK-02)

- **Project state is in-memory only.** Closing VS Code forgets the project — the welcome view returns on next launch. Persistence lands in [CHUNK-03](docs/planning/chunks/chunk-03-memory-store.md).
- **Workspace trust required.** DeliveryOS declines to activate in restricted or virtual workspaces, by design (see `capabilities.{untrustedWorkspaces,virtualWorkspaces}.description`).
- **`deliveryos.openHello` is a dev smoke test.** It will be hidden behind a `deliveryos.devMode` `when` clause in CHUNK-04 so it doesn't appear in the user-facing palette.

## What's next

Week-by-week build steps are in [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md). The week-2 milestone is a `.vsix` that installs into both VS Code and Cursor — the Phase 0 demoable state after [CHUNK-03](docs/planning/chunks/chunk-03-memory-store.md) (memory store) and [CHUNK-04](docs/planning/chunks/chunk-04-multi-editor-verify.md) (multi-editor verify) land.
