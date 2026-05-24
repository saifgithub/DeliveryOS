# DeliveryOS

A meta-harness for AI-assisted software delivery. A harness around your harness.

**Status:** Build in progress — **Phase 2 closed (Week 9 complete)** (CHUNK-11 File handoff + terminal integration shipped, ~8 weeks ahead of plan). `npm run package` produces a `deliveryos-0.0.2.vsix` that installs into VS Code, Cursor, Windsurf, VSCodium, and Antigravity. The extension persists project memory in a local SQLite database, renders a four-stage tree with DISCOVER + DEFINE + EXECUTE children (Draft PRD + Requirements group in DEFINE; per-requirement brief lists in EXECUTE), and walks an end-to-end manual-mode loop: raw idea → discovery → PRD → requirements → test specs → Execution Briefs → **harness-aware rendering with one-click `CLAUDE.md` / `AGENTS.md` / `.claude/settings.json` updates** → **"Run with Claude Code / Codex" writes `.deliveryos-handoff/` and opens an integrated terminal with the harness command pre-typed**. The Brief composer opens from any requirement, pre-fills 10 canonical sections (with the locked Section 9 `result.md` template), validates Allowed/Forbidden glob lists with picomatch, persists immutable briefs to `.deliveryos/memory/execution/` with `derives-from`/`supersedes` graph edges, supports a revision flow that chains versioned briefs, renders each brief through Claude Code or Codex profiles with a unified-diff suggested-updates panel for harness instruction files (canonical `<!-- DELIVERYOS:BEGIN -->` markdown + `deliveryos.managed` JSON sentinel + `# DELIVERYOS:BEGIN` gitignore markers, idempotent applier, host-confirmed overwrite on hand-edits), **and on click of `Run with Claude Code` / `Run with Codex` atomically writes the 5 `current-*.md` handoff files + a `history/<timestamp>-execution-brief.md` audit snapshot, opens the integrated terminal with the harness command pre-typed (shouldExecute=false — user presses Enter as the audit consent), and observes `.deliveryos-handoff/result.md` via a debounced + SHA-256-deduped FileSystemWatcher**. Result Capture (CHUNK-12) and Allowed/Forbidden diff (CHUNK-13) land next.

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

## Install

DeliveryOS ships as a sideloadable `.vsix`. It runs in VS Code, Cursor, Windsurf, VSCodium, and Antigravity.

### Quick install (macOS / Linux)

```sh
curl -fsSL https://github.com/saifgithub/DeliveryOS/releases/latest/download/install.sh | sh
```

### Quick install (Windows, PowerShell)

```powershell
iwr -useb https://github.com/saifgithub/DeliveryOS/releases/latest/download/install.ps1 | iex
```

The install script detects every supported editor on your `PATH` and installs DeliveryOS into each.

### Manual install

1. Download `deliveryos-X.Y.Z.vsix` from the [latest release](https://github.com/saifgithub/DeliveryOS/releases/latest).
2. Verify the SHA-256:

    ```sh
    shasum -a 256 -c SHA256SUMS.txt
    ```

3. Install into whichever editors you use:

    ```sh
    code        --install-extension deliveryos-X.Y.Z.vsix --force   # VS Code
    cursor      --install-extension deliveryos-X.Y.Z.vsix --force   # Cursor
    windsurf    --install-extension deliveryos-X.Y.Z.vsix --force   # Windsurf
    codium      --install-extension deliveryos-X.Y.Z.vsix --force   # VSCodium
    antigravity --install-extension deliveryos-X.Y.Z.vsix --force   # Antigravity
    ```

   Or use each editor's "Install from VSIX" command from the command palette (`Cmd/Ctrl+Shift+P`).

### Why SHA-256?

Sideloaded VSIX files bypass the editor's Microsoft-signed extension verification by design — that path only applies to Marketplace-installed extensions. DeliveryOS publishes a SHA-256 hash on every release so you can confirm the `.vsix` you downloaded matches what was built by the [release workflow](.github/workflows/release.yml).

### Updates

DeliveryOS checks GitHub Releases on startup and notifies you when a newer version is available. To disable: set `deliveryos.checkForUpdates` to `false` in your editor settings.

### Troubleshooting

- **`command not found: code` (or `cursor` / `windsurf` / `codium` / `antigravity`).** Open the editor, hit `Cmd/Ctrl+Shift+P`, search for `Shell Command: Install '<editor>' command in PATH` (the wording matches the editor). Re-run the install script.
- **Extension installs but the activity-bar icon doesn't appear.** Reload the window (`Cmd/Ctrl+Shift+P → Developer: Reload Window`). Some editors need a reload before custom activity-bar contributions render.
- **Antigravity not detected.** Antigravity 1.x ships a CLI at `/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity` (macOS); add that directory to `PATH` if needed. **Antigravity 2.x dropped the CLI entirely** — the install script now surfaces a specific SKIP reason (`Antigravity 2.x — CLI removed; install manually via app UI`) when the `Antigravity.app` bundle is present without a CLI on `PATH`. To sideload into Antigravity 2.x, open the app → Extensions → `…` menu → "Install from VSIX" and pick the `.vsix` you downloaded.
- **GitHub rate limit on update check.** Harmless — the check fails silently and you won't see the notification. To suppress entirely, set `deliveryos.checkForUpdates` to `false`.

## Quick Start — manual-mode loop

1. Install the extension and open a workspace.
2. Click the DeliveryOS rocket icon in the activity bar and create a project.
3. In the tree, expand **DISCOVER** and click **Raw idea** — or run `DeliveryOS: Open Discover` from the command palette.
4. Type your raw idea and save. Switch to the **Prompt** tab and click **Generate prompt**.
5. Copy the prompt and paste it into Claude, ChatGPT, or your AI tool of choice.
6. Paste the AI's response into the **Answers** tab, click **Parse answers**, then **Save answers**.
7. The **Summary** tab shows your structured discovery record — ready for PRD generation (CHUNK-06).

<!-- screenshot: docs/assets/discover-panel.png -->

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
│   │   ├── projectRegistry.ts  IProjectRegistry seam — InMemory + Persisted impls (Persisted backed by MemoryStore)
│   │   ├── memory/             {MemoryStore, sqlJsHost, schema, migrations, paths, ids, markdown, readmeTemplate}.ts
│   │   ├── commands/           {projectCreate, stagesRefresh, openHello}.ts
│   │   ├── tree/               {stageDefinitions, stageTreeNodes, stageTreeProvider}.ts
│   │   ├── webview/            {nonce, htmlFactory, messenger, panelManager, helloPanel}.ts
│   │   └── serializers/        helloPanelSerializer.ts
│   ├── test/                   memory.test.ts + vscode-stub.ts (tsx + node:test)
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
code --install-extension extension/deliveryos-0.0.4.vsix
```

After install, click the rocket icon in the activity bar. A welcome panel offers **Create a project**; submitting a name renders the four stage rows (DISCOVER, DEFINE, EXECUTE, VERIFY). Each row is empty — artefacts arrive in later chunks. The Extension Host output shows `DeliveryOS activated` on startup.

Smoke-test the webview round trip via the command palette: **DeliveryOS: Open Hello (dev smoke test)** opens a React + Tailwind panel that calls `Hello.GetHelloText` against the extension host and renders the reply + a server-side ISO timestamp. Use **Developer: Open Webview Developer Tools** to confirm zero CSP violations.

### Known limitations (CHUNK-01 + CHUNK-02)

- **Project state is in-memory only.** Closing VS Code forgets the project — the welcome view returns on next launch. Persistence lands in [CHUNK-03](docs/planning/chunks/chunk-03-memory-store.md).
- **Workspace trust required.** DeliveryOS declines to activate in restricted or virtual workspaces, by design (see `capabilities.{untrustedWorkspaces,virtualWorkspaces}.description`).
- **`deliveryos.openHello` is a dev smoke test.** It remains user-visible in the command palette through CHUNK-04 — hiding it behind a `deliveryos.devMode` `when` clause is deferred until after Phase 0.

## What's next

Week-by-week build steps are in [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md). The week-2 milestone is a `.vsix` that installs into both VS Code and Cursor — the Phase 0 demoable state after [CHUNK-03](docs/planning/chunks/chunk-03-memory-store.md) (memory store) and [CHUNK-04](docs/planning/chunks/chunk-04-multi-editor-verify.md) (multi-editor verify) land.
