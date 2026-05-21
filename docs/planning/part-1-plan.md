# DeliveryOS Part 1 — Trimmed MVP Chunk Plan

**Scope:** The whole trimmed MVP (BUILD-PLAN Phases 0–4). 4 default stages (DISCOVER, DEFINE, EXECUTE, VERIFY), 1 specialist (Test Designer), 2 harness profiles (Claude Code, Codex), 1 demo (Bug Triage Assistant).
**Out of scope (this build):** remaining specialists, full configurable stage library, all 8 memory types as rich linked objects, MCP server mode, API-based AI orchestration, OpenVSX publishing for auto-update.
**Pace:** 5–10 hrs/week. Duration 14 weeks. Start 2026-05-25. Demo 2026-08-24.
**Source-of-truth docs:** [PRD v0.3](../PRD.md), [BUILD-PLAN](../BUILD-PLAN.md), [ADR-0001](../decisions/0001-vsix-extension-not-fork.md), [architecture/](../architecture/).
**Produced by:** Phase A planning loop — Prompt 1 (chunk break-down). Spawned 6 parallel research subagents (VS Code extension architecture, webviews, packaging, persistence, terminal integration, harness conventions).

This file is the output of Prompt 1. Prompt 2 will expand every chunk into a `chunks/chunk-NN-*.md` spec. Prompt 3 audits cohesion. Prompt 4 iterates to clean. `READY.md` is the final output.

---

## Research-driven changes to PRD / BUILD-PLAN assumptions

These are the load-bearing findings from the 6 research subagents. They do NOT change the strategic shape of the build, but they reshape several technical decisions that the PRD and BUILD-PLAN left open or got wrong. Each is annotated with the doc location that should be updated when Prompt 4 iterates the plan, and whether the change is incorporated into the chunks below.

### 1. **SQLite native module is the wrong choice for a sideloaded cross-editor VSIX.** [HIGH]

PRD § 25.2 says "Memory store: SQLite file (typed tables per memory type) plus a markdown documents directory." BUILD-PLAN week 2 says "Wire a SQLite (or simple JSON) store." The default reading of this is `better-sqlite3`, which is the standard Node SQLite binding.

The problem: `better-sqlite3` is a **native module** compiled against a specific Electron-Node ABI. VS Code, Cursor, Windsurf, Antigravity, and VSCodium each ship slightly different Electron versions. A sideloaded `.vsix` cannot rebuild on the user's machine (no C++ toolchain), so the matrix of prebuilt binaries explodes. Historically the single biggest cause of extension breakage on editor upgrades.

**Decision:** ship **`sql.js` (SQLite-compiled-to-WASM)** for the MVP. One `.wasm` blob, zero ABI concerns, ~1MB bundle, 3–10× slower than native but more than fast enough for thousands of memory rows. Revisit `better-sqlite3` (or Node 22.5+ `node:sqlite`) only if profiling shows write latency hurting UX.

**Doc updates needed (Prompt 4):** PRD § 25.2 to specify `sql.js`. ADR worth writing.

### 2. **`@vscode/webview-ui-toolkit` is deprecated.** [MEDIUM]

Microsoft sunset the toolkit on 2025-01-01 (repo archived 2025-01-06). PRD and the architecture docs don't mention it, but any default scaffold tutorial will reach for it. **Use Radix UI primitives + Tailwind, with Lucide React for icons.** This aligns with the PRD's "full visual control independent of host theme" principle. For light VS Code-native integration, anchor a small set of chrome-level tokens (focus rings, panel borders, body background) to VS Code CSS variables (`--vscode-editor-background`, etc.) — hybrid theming.

**Doc updates needed:** PRD § 25.2 to specify "Radix + Tailwind + Lucide React inside Vite-built React webviews." A short architecture doc on the webview pattern would help.

### 3. **Sideloaded VSIX bypasses signature verification by design.** [HIGH — but RESOLVES a risk, not creates one]

ADR-0001 flagged tightening signature verification as a key risk. Research confirms: **Microsoft signature verification only applies to Marketplace-installed extensions.** `code --install-extension foo.vsix` and "Install from VSIX" both treat sideload as a developer flow and bypass `IExtensionSignatureVerificationService`. This is documented as "by design" and has not been signalled for change in 2025/early 2026. All five target editors (VS Code, Cursor, Windsurf, Antigravity, VSCodium) inherit this behaviour.

**Caveat for users (not the build):** sideloading inherently bypasses the supply-chain guarantee. DeliveryOS should publish SHA-256 hashes on every GitHub Release and document the verification step in the install README.

**Doc updates needed:** ADR-0001 "Consequences" section could be tightened — the risk is *future* tightening (years out), not present-day breakage.

### 4. **Codex CLI has a native result-file output flag.** [HIGH — simplifies the EXECUTE→VERIFY loop]

Codex CLI (`codex` binary, 2026) supports `-o/--output-last-message <file>`: writes the final assistant message to a file. This **directly maps onto DeliveryOS's `result.md`** mechanism. The Codex profile's command shape becomes:

```
codex exec -o .deliveryos-handoff/result.md "Run the brief at .deliveryos-handoff/current-execution-brief.md"
```

For Claude Code, the equivalent is via instruction in `CLAUDE.md`: "Write your result summary to `.deliveryos-handoff/result.md` on completion." Claude Code does not have a native `-o` flag in 2026.

**Doc updates needed:** PRD § 23 (Execution Brief for Claude Code example) and `architecture/harness-profiles.md` (Codex section). Incorporated into CHUNK-10 and CHUNK-11.

### 5. **Claude Code has native PreToolUse hooks that can enforce Forbidden Changes in real time.** [HIGH — upgrades the headline feature]

Claude Code's `.claude/settings.json` supports `PreToolUse` hooks — scripts that run before any Edit/Write and can block via exit code 2. **Critically, PreToolUse fires before permission-mode checks; it cannot be bypassed by `--dangerously-skip-permissions`.** This means DeliveryOS can generate a hook that hard-blocks Forbidden paths in real time, not just diff after the fact. Codex has no equivalent in 2026, so the after-the-fact diff remains the universal backstop.

**Decision:** keep the diff feature (CHUNK-13) as the universal headline. Additionally, for the Claude Code profile, generate a `PreToolUse` hook inside a managed block in `.claude/settings.json`. This gives DeliveryOS a meaningfully stronger Claude Code story while keeping a consistent contract on Codex.

**Doc updates needed:** PRD § 27 Risk 3 ("File-based handoff is leaky") mitigation can be strengthened. `architecture/harness-profiles.md` Claude Code section needs the hook detail. Incorporated into CHUNK-13.

### 6. **Handoff directory naming inconsistency in the PRD.** [LOW]

PRD § 18.Y refers to `/deliveryos-handoff/` (root-absolute slash). PRD § 25.2 says `.deliveryos-handoff/` (hidden dotfile). The dotfile convention is the right one — matches `.vscode/`, `.claude/`, `.codex/`, the conventional shape for tool sidecars. Standardise on **`.deliveryos-handoff/`** (relative to workspace root).

**Doc updates needed:** PRD § 18.Y to use the dotfile form. Incorporated throughout the chunks.

### 7. **DeliveryOS needs a "trusted workspace" capability declaration.** [LOW but missed]

PRD does not mention VS Code's Workspace Trust feature. DeliveryOS reads and writes `.deliveryos-handoff/`, runs terminals against the workspace, and reads source files for Codebase Memory. It cannot safely run on untrusted code. The `package.json` must declare:

```json
"capabilities": {
  "untrustedWorkspaces": { "supported": false, "description": "..." },
  "virtualWorkspaces": { "supported": false, "description": "..." }
}
```

**Doc updates needed:** PRD § 25.2 should add this capability requirement. Incorporated into CHUNK-01.

### 8. **`current-*` vs `history/` split in `.deliveryos-handoff/`.** [MEDIUM]

PRD § 18.Y lists `current-execution-brief.md`, `current-context-package.md`, etc. as the handoff directory contents. Research recommends splitting:

- **`.deliveryos-handoff/current-*.md`** — pointer/working files, regenerated each session, gitignorable (or commit with the expectation of churn).
- **`.deliveryos-handoff/history/<timestamp>-execution-brief.md`** — committed audit trail. Each handoff produces a timestamped snapshot.

This resolves the tension between "auditability" (PRD § 24 success criterion) and "diff noise" (a real cost). Mirrors how Claude Code itself splits `CLAUDE.md` (shared) from `CLAUDE.local.md` (user-only).

**Doc updates needed:** PRD § 18.Y schema should include `history/`. Incorporated into CHUNK-11.

### 9. **AGENTS.md is now a Linux Foundation open standard (Dec 2025).** [LOW — nice context]

Codex's AGENTS.md convention was donated to the Linux Foundation's Agentic AI Foundation in December 2025 alongside MCP. 60,000+ OSS projects adopted it by mid-2026. Strengthens the harness-neutrality thesis: DeliveryOS isn't betting on a proprietary OpenAI convention. No build implication.

### 10. **MCP server mode is well-positioned for v2.** [LOW — informs PRD wording on FR25/Mode 3]

MCP (Model Context Protocol) has ~9,400+ public servers, ~97M SDK downloads as of H1 2026, donated to LF alongside AGENTS.md, supported natively by Claude Code, Codex CLI, Cursor, Windsurf, Zed, JetBrains AI Assistant, ChatGPT, Gemini/Vertex. **Both** target harnesses (Claude Code AND Codex) support MCP. PRD § 12 FR25 calling it "Future phase" remains correct for this build, but the upside is now stronger than the PRD suggests. No build implication for the trimmed MVP.

### 11. **Activation events: use `onStartupFinished`.** [LOW]

PRD does not specify, but the modern (post VS Code 1.74) recommendation is `activationEvents: ["onStartupFinished"]` combined with implicit activation from contributed commands/views. Avoid the legacy `*` wildcard. Incorporated into CHUNK-01.

### 12. **`onDidWriteTerminalData` is permanently proposed — do not rely on it.** [LOW]

The proposed API for streaming terminal output cannot be used in Marketplace-published or OpenVSX-published extensions (microsoft/vscode#83224, open since 2019, still proposed in 2026). DeliveryOS's completion-detection strategy must rely on (a) `FileSystemWatcher` on `.deliveryos-handoff/result.md` as the primary signal, with (b) `Terminal.shellIntegration` as a nice-to-have for exit-code capture, and (c) `onDidCloseTerminal` for "did the user bail?" telemetry. Incorporated into CHUNK-11.

---

## Chunk decomposition

16 chunks. Each chunk is 1–5 days of work at the 5–10 hr/week pace. Effort is given in "session-days" (one ~3-hr working session).

Each chunk follows this schema:

- **Goal** — 1–2 sentences.
- **In scope** / **Out of scope** — the boundary.
- **Dependencies** — chunk IDs (or "none").
- **BUILD-PLAN phase** — the week / phase mapping.
- **Effort** — session-days.
- **Done when** — concrete, checkable outcome.
- **Verified by** — how we prove it.
- **Risks / unknowns** — open questions.

---

### CHUNK-01 — Extension scaffold + activity-bar + static stage tree

**Goal.** Create a TypeScript VS Code extension project that contributes an activity-bar icon and a sidebar tree view showing the four default stages (DISCOVER, DEFINE, EXECUTE, VERIFY) as static tree items. Get `vsce package` producing a working `.vsix`.

**In scope.**
- `package.json` skeleton with `engines.vscode: "^1.85.0"`, `activationEvents: ["onStartupFinished"]`, `capabilities.untrustedWorkspaces.supported: false`, `capabilities.virtualWorkspaces.supported: false`.
- `contributes.viewsContainers.activitybar` — DeliveryOS rocket/diamond icon in the activity bar.
- `contributes.views` — one tree view (`deliveryos.stages`) under that container.
- `TreeDataProvider<StageNode | ArtefactNode>` implementation; static 4-stage children, lazy artefact children.
- `contributes.viewsWelcome` markdown shown when no project is active — "Create a project" command link.
- Register one `deliveryos.project.create` command (placeholder; opens a `vscode.window.showInputBox` and stores a project record via a stub).
- Build pipeline: `tsc` → `dist/extension.js`; `@vscode/vsce package` produces `.vsix`.
- README skeleton.

**Out of scope.** Webviews, memory store, multi-editor verification, install script, harness profiles, brief generation. Anything that lives in a webview.

**Dependencies.** None — this is the foundation.

**BUILD-PLAN phase.** Phase 0, Week 1 (2026-05-25).

**Effort.** 4–6 session-days.

**Done when.**
- `npm run package` produces a `.vsix` file (e.g. `deliveryos-0.0.1.vsix`) in the project root.
- `code --install-extension deliveryos-0.0.1.vsix` installs cleanly into VS Code.
- The DeliveryOS activity-bar icon appears on first launch after install.
- Clicking it reveals the sidebar with four static stage rows.
- The "viewsWelcome" empty state appears when no project exists; "Create a project" command shows the input box and stores a stub record (in memory only for now).

**Verified by.** Manual install + click-through. No unit tests at this layer; ext-host testing is overkill for the scaffold.

**Risks / unknowns.**
- Cursor/Windsurf install behaviour deferred to CHUNK-04.
- Icon design: defer to a Lucide icon for MVP (`rocket` or `git-branch`).

---

### CHUNK-02 — Webview foundation: Vite + React + Tailwind + CSP + messenger

**Goal.** Set up the monorepo structure (`extension/`, `webview/`, `contracts/`) so React + Tailwind webviews can render inside the extension. Demonstrate end-to-end with a single "hello DeliveryOS" panel that round-trips one message to the host.

**In scope.**
- Monorepo workspace structure (npm workspaces or pnpm).
  - `extension/` — Node-side, tsc-built.
  - `webview/` — Vite-built React + TS + Tailwind app(s). Multiple entry points planned.
  - `contracts/` — shared TS types for webview ↔ extension messages.
- Vite config producing `dist/webview/<panel-name>/{index-[hash].js, index-[hash].css}` + manifest.
- HTML factory in extension that reads the Vite manifest and emits a CSP'd HTML string with nonce, `webview.asWebviewUri()` rewrites, and the `localResourceRoots` set.
- CSP: `default-src 'none'; img-src ${cspSource} https: data:; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; script-src 'nonce-${nonce}'; connect-src ${cspSource};`
- `vscode-messenger` wiring (host side + webview side); typed contract for one round-trip message (e.g. `getHelloText` → `"Hello DeliveryOS"`).
- `WebviewPanelSerializer` base class so a "hello" panel survives reload.
- Tailwind config with **hybrid theming**: DeliveryOS palette in `theme.extend.colors` + body anchored to `var(--vscode-editor-background)` + focus rings using `var(--vscode-focusBorder)`.
- One `deliveryos.openHello` command that opens the hello panel.

**Out of scope.** Any specific product surface (PRD editor, Brief composer, etc.) — those come later. Radix UI (deferred to first real panel). Dev-mode HMR via Vite dev server (deferred; production build is enough for MVP velocity).

**Dependencies.** CHUNK-01 (extension exists).

**BUILD-PLAN phase.** Phase 0, Week 2 (first half).

**Effort.** 3–5 session-days.

**Done when.**
- `npm run build` produces both `extension/dist/` and `webview/dist/`.
- `.vsix` includes both.
- Running `deliveryos.openHello` opens a panel that renders a React app, fetches a string from the host via `vscode-messenger`, and displays it.
- Closing and reopening the panel restores its state (via serializer).
- CSP violations: zero in the developer tools console.

**Verified by.** Manual click + open browser-dev-tools-in-webview (`Developer: Open Webview Developer Tools` command) and confirm no CSP errors. Round-trip a message via the messenger and confirm it appears.

**Risks / unknowns.**
- Vite + nonce-based CSP wiring is fiddly the first time. Reference: `microsoft/vscode-webview-ui-toolkit-samples/hello-world-react-vite`.
- `vscode-messenger`'s API surface should be considered locked-in before later chunks build on top of it — review their API stability commitment.

---

### CHUNK-03 — Memory store foundation: sql.js + workspace `.deliveryos/` + schema

**Goal.** Wire up the typed memory graph storage. SQLite-via-WASM (`sql.js`) lives in extension storage as a single file; the markdown bodies live in the workspace at `.deliveryos/memory/`. Schema is the polymorphic single-table approach plus a links table.

**In scope.**
- `sql.js` integration in the extension host. `.wasm` shipped inside the VSIX.
- Storage layout decision (per research finding #1 + #4):
  - **SQLite file:** `<workspace>/.deliveryos/memory.sqlite` — visible to user, gitignorable, easy to inspect.
  - **Markdown bodies:** `<workspace>/.deliveryos/memory/<type>/<id>.md` — one file per memory entry; payload-in-JSON for indexed fields, body-in-markdown for human-readable content.
  - **Cross-project store:** `globalStorageUri/harness.sqlite` for saved harness profiles, recent projects, user preferences (deferred to a later chunk; just stub the path here).
- Polymorphic schema:
  - `memory_entries(id TEXT PRIMARY KEY, type TEXT, title TEXT, payload_json TEXT, created_at INT, updated_at INT)`.
  - `memory_links(from_id TEXT, to_id TEXT, kind TEXT, PRIMARY KEY (from_id, to_id, kind))`.
  - `_schema_version(v INTEGER)` plus a roll-your-own migration runner (8 lines).
  - Index on `type`.
- TypeScript types for all 8 memory types (Intent, Requirement, Design, Codebase, Execution, Result, Verification, Release) as discriminated unions.
- A `MemoryStore` class with `create`, `read`, `update`, `list(type)`, `link`, `walk(from, kind)`.
- `.deliveryos/README.md` template explaining the on-disk layout.
- "Create project" command (from CHUNK-01) now persists to memory + writes an Intent Memory entry.

**Out of scope.** Read-only memory viewer UI (deferred to a later chunk inside Phase 1). Memory update on result capture (CHUNK-14). Per-project vs cross-project distinction beyond stubbing the path. Full ER-style schema with per-type tables (deliberately deferred — see research finding §3).

**Dependencies.** CHUNK-01 (extension exists), CHUNK-02 (so the project create flow can later send memory data to webviews).

**BUILD-PLAN phase.** Phase 0, Week 2 (second half).

**Effort.** 3–4 session-days.

**Done when.**
- A project record can be created and persists across VS Code restarts.
- An Intent Memory entry is written automatically when the project is created.
- `<workspace>/.deliveryos/memory.sqlite` exists; opening it with the `sqlite3` CLI shows the rows.
- `<workspace>/.deliveryos/memory/intent/<id>.md` exists with the raw idea text.
- The schema migration runner runs cleanly on first init.

**Verified by.** Create project → close VS Code → reopen → tree view should show the project. Inspect SQLite + markdown on disk.

**Risks / unknowns.**
- `sql.js` bundle size (~1MB `.wasm`) — confirm VSIX size stays under ~5MB after this chunk.
- "When does the DB flush to disk?" — `sql.js` is in-memory by default. Need explicit `db.export()` + `fs.writeFileSync()` on every transaction OR on a debounced timer. Decide and document. Recommend: explicit flush per mutation (simpler reasoning), revisit if it shows up in profiling.

---

### CHUNK-04 — Multi-editor sideload verification + install script + GitHub Release scaffold

**Goal.** Prove the `.vsix` installs and runs cleanly in at least three editors (VS Code, Cursor, and one of Windsurf/VSCodium). Ship an `install.sh` + `install.ps1` that detects installed editors and installs into each. Set up GitHub Releases.

**In scope.**
- Manually sideload the existing `.vsix` into VS Code, Cursor, and Windsurf (or VSCodium); confirm the activity-bar icon appears and the hello webview renders in each.
- Document the per-editor CLI command (`code`, `cursor`, `windsurf`, `codium`, `antigravity`) in the README.
- `scripts/install.sh` (POSIX shell, detects `code`/`cursor`/`windsurf`/`codium`/`antigravity` on PATH and installs into each found).
- `scripts/install.ps1` (PowerShell equivalent for Windows).
- GitHub Actions workflow that runs `vsce package` on tag push and creates a GitHub Release with the `.vsix` attached.
- In-extension version check: on activation, fire-and-forget call to `https://api.github.com/repos/<owner>/<repo>/releases/latest`, compare to `context.extension.packageJSON.version`, show `vscode.window.showInformationMessage` if newer (using the pattern from `jan-dolejsi/vscode-extension-updater` — vendor or reference).
- A `deliveryos.checkForUpdates` setting (`boolean`, default `true`).
- README install instructions: GitHub Releases link, SHA-256 hash documentation, per-editor command.

**Out of scope.** OpenVSX publishing (Phase 4 polish or post-MVP). Code signing. Auto-install of the new VSIX (just notify, don't reinstall).

**Dependencies.** CHUNK-01 (we need a `.vsix`), CHUNK-02 (webview render is part of the smoke test), CHUNK-03 (memory write is part of the smoke test).

**BUILD-PLAN phase.** Phase 0, Week 2 (polish day, end of phase).

**Effort.** 1–2 session-days.

**Done when.**
- The `.vsix` installs and runs (activity bar visible, hello webview renders, memory persists) in **at least three** of {VS Code, Cursor, Windsurf, VSCodium, Antigravity}.
- `scripts/install.sh` installs into all detected editors on macOS and Linux.
- `git tag v0.0.1 && git push --tags` triggers the GitHub Action and produces a release with `.vsix` attached.
- README documents the install path with SHA-256.
- An older-version check fires a notification on extension activation when run against a newer release tag.

**Verified by.** Manual install in three editors. Triggering a tagged release. Verifying the version-check notification.

**Risks / unknowns.**
- **Antigravity** may need manual binary-path probing (CLI may not be on PATH). Document the path, don't block.
- **Signature verification** is not expected to bite (research §3) but smoke-test will reveal any unexpected warning behaviour.

---

### CHUNK-05 — Raw idea capture + Discovery interview workspace

**Goal.** Build the first end-user surface: raw idea capture + discovery interview workspace. Manual mode — DeliveryOS generates the discovery interview as a prompt the user copies into their AI tool, then pastes answers back.

**In scope.**
- A "DISCOVER → Capture raw idea" command and a webview panel (`deliveryos.openDiscover`) that:
  - Lets the user type/paste a raw idea (long-text input).
  - Stores it as Intent Memory (extends CHUNK-03's stub Intent entry with full content).
- A "Generate discovery interview prompt" button:
  - Renders a discovery-interview prompt template (markdown) using the raw idea + the discovery-question library (hardcoded MVP set: ~12 questions covering scope, users, data, regulated industry, customer-facing, etc.).
  - Provides a one-click "Copy prompt" button.
- A "Paste discovery answers" mode:
  - Long-text input where the user pastes the AI's responses back.
  - Stores as a Discovery Record (a sub-field of Intent Memory in this trimmed build).
- A "Discovery summary" panel showing the captured Q&A formatted.

**Out of scope.** AI-suggested mid-stages (the "trigger question" mechanic from PRD § 10.8) — the trimmed MVP runs the four-stage default. Configurable stage library wiring beyond surfacing as static config. Specialist expansion (BAs, Architects, etc.) — only the Test Designer is in scope (CHUNK-08).

**Dependencies.** CHUNK-02 (webview foundation), CHUNK-03 (memory store).

**BUILD-PLAN phase.** Phase 1, Week 3 (2026-06-08).

**Effort.** 4–5 session-days.

**Done when.**
- A user can type a raw idea, click "generate discovery prompt", copy it, paste it into their AI tool of choice, copy the AI's answers back, paste them into DeliveryOS, and see the stored Discovery Record.
- Closing and reopening VS Code retains everything.
- The DISCOVER tree node shows a child item "Raw idea" and "Discovery interview" once each exists.

**Verified by.** End-to-end manual run with Claude.ai or ChatGPT as the external tool.

**Risks / unknowns.**
- The discovery question library is hand-curated for MVP. PRD § 10.8 has the full trigger-question set; trim aggressively.

---

### CHUNK-06 — Draft PRD generation + PRD editor webview

**Goal.** From the Discovery Record, produce a draft PRD (manual prompt mode) and provide an editable webview to refine it. Store as Requirement Memory parent / canonical PRD doc.

**In scope.**
- "Generate draft PRD" command that:
  - Renders a PRD-generation prompt (markdown) using the Discovery Record.
  - Copy-to-clipboard for the user to run in their AI tool.
- "Paste draft PRD" mode where the user pastes back the AI's PRD output (markdown).
- PRD editor webview:
  - Section-based editing (template sections: Problem, Users, Goals, Non-Goals, Constraints, Assumptions, Risks, Success Criteria).
  - Live edit + save to markdown on disk (`<workspace>/.deliveryos/memory/requirement/<prd-id>.md`).
  - Section-level "Revise this section with AI" button (renders a per-section prompt; copy/paste flow).
- Stores the PRD as the parent of all subsequent Requirement Memory entries.
- DEFINE tree node shows "Draft PRD" child once it exists.

**Out of scope.** Specialist expansion (BA, Architect, etc.) — only Test Designer is in scope (CHUNK-08). Direct API calls to model providers.

**Dependencies.** CHUNK-05 (Discovery Record exists), CHUNK-02 (webview), CHUNK-03 (memory).

**BUILD-PLAN phase.** Phase 1, Week 4 (2026-06-15).

**Effort.** 4–5 session-days.

**Done when.**
- A user can go: Discovery Record → click "generate PRD prompt" → paste into AI tool → paste result back → see an editable PRD in DeliveryOS → edit a section → save.
- The PRD markdown is persisted to disk and reloads after restart.

**Verified by.** End-to-end manual run.

**Risks / unknowns.**
- PRD template structure should mirror the section headings in DeliveryOS's own PRD ([docs/PRD.md](../PRD.md)) for dogfooding consistency.

---

### CHUNK-07 — Requirements catalogue

**Goal.** Decompose the PRD into a structured requirements catalogue. Each requirement gets type, priority, source PRD section, and an (empty for now) verification-criteria field.

**In scope.**
- "Decompose PRD into requirements" command:
  - Renders a decomposition prompt (markdown) referencing the PRD.
  - User runs in AI tool, pastes back a structured requirements list (JSON or markdown table).
  - DeliveryOS parses and creates one Requirement Memory entry per requirement.
- Requirements catalogue webview:
  - Table view of all requirements with columns: ID, Title, Type (Functional/Non-Functional), Priority (Must/Should/Could), Source PRD section, Verification status (empty / draft / approved).
  - Click a row to open a detail editor.
  - Filter / sort.
- Each requirement is linked back to its source PRD section via Memory Links.
- DEFINE tree node now shows "Requirements" with per-requirement child items.

**Out of scope.** Verification criteria authoring (CHUNK-08). Test specifications (CHUNK-08).

**Dependencies.** CHUNK-06 (PRD exists), CHUNK-02, CHUNK-03.

**BUILD-PLAN phase.** Phase 1, Week 5 (2026-06-22).

**Effort.** 4–5 session-days.

**Done when.**
- An approved PRD produces a structured list of requirements, each editable and persisted.
- The requirements catalogue table renders all requirements and filters work.

**Verified by.** End-to-end manual run starting from the PRD in CHUNK-06.

**Risks / unknowns.**
- Parsing the AI's decomposition output is fragile. Ask the AI to return JSON; fall back to a manual edit if parsing fails.

---

### CHUNK-08 — Test Designer specialist + verification criteria attachment

**Goal.** Build the one MVP specialist — Test Designer. Takes a requirement and produces verification criteria + a test specification (manual prompt mode). Attaches the output to the requirement.

**In scope.**
- "Run Test Designer on this requirement" command + button on the requirement detail panel.
- Test Designer prompt template (using the generic specialist prompt shape from PRD § 22):
  - Role: Test Designer
  - Objective: produce verification criteria + test spec for the given requirement
  - Project Context: PRD summary + linked design context
  - Approved Inputs: the requirement text
  - Your Task: produce verification criteria (bulleted) + test spec (test names + given/when/then or table form)
  - Output Format: structured markdown
  - Rules: test-first; no implementation suggestions; cover happy + edge cases
- Copy-to-clipboard flow; paste-result-back flow.
- Verification-criteria field on Requirement Memory is populated.
- A Test Specification Memory entry (typed as a subtype of Verification Memory or its own type — defer the type-system call to CHUNK-09 schema) is created and linked to the requirement.

**Out of scope.** Other specialists. Inline AI calls (manual mode only).

**Dependencies.** CHUNK-07 (requirements exist), CHUNK-02, CHUNK-03.

**BUILD-PLAN phase.** Phase 1, Week 6 (2026-06-29). End of Phase 1 — first demoable state.

**Effort.** 3–4 session-days.

**Done when.**
- A requirement can be given verification criteria and a test spec via the Test Designer flow.
- The verification criteria appear on the requirement's detail panel.
- A separate test spec markdown file is generated under `.deliveryos/memory/test-spec/`.
- **Phase 1 demoable state achieved:** "Type an idea, walk through discovery, get a PRD, get requirements, get test specs. All inside the editor."

**Verified by.** End-to-end manual run from raw idea → Discovery → PRD → Requirements → Test Spec.

**Risks / unknowns.**
- Test spec format — markdown bullets vs structured tables vs Gherkin. Trade-off between human readability and machine parseability for the Allowed/Forbidden diff later. Recommend: markdown bullets in MVP, revisit when CHUNK-13 starts.

---

### CHUNK-09 — Execution Brief composer (10-section schema)

**Goal.** Assemble the 10-section Execution Brief (per [architecture/execution-briefs.md](../architecture/execution-briefs.md)) from a requirement, its design context, its test spec, and the Codebase Memory snapshot. Render it as a markdown document.

**In scope.**
- "Generate Execution Brief for requirement X" command + button on requirement detail.
- Execution Brief composer webview:
  - Reads the requirement, its linked PRD section, its linked Test Spec, and Codebase Memory.
  - Composes the 10 sections (Objective, Approved Requirement, Business Intent, Approved Design Context, Existing Codebase Context, Test-First Specification, Allowed Changes, Forbidden Changes, Expected Output, Completion Criteria).
  - Allowed Changes / Forbidden Changes sections are EDITABLE — the user finalises them by hand for the MVP (full inference is deferred).
  - Renders preview side-by-side with the editable form.
- A "Save brief" action persists it to Execution Memory + writes `<workspace>/.deliveryos/memory/execution/<brief-id>.md`.
- The brief is **immutable once saved** (per architecture/execution-briefs.md § Versioning) — a new version generates a new brief linked to the previous one.
- EXECUTE tree node now shows briefs.

**Out of scope.** Profile-specific rendering (CHUNK-10). Codebase Memory auto-extraction — for MVP, the user types or pastes the relevant codebase context (folder structure, conventions, test commands). File handoff (CHUNK-11).

**Dependencies.** CHUNK-07, CHUNK-08, CHUNK-02, CHUNK-03.

**BUILD-PLAN phase.** Phase 2, Week 7 (2026-07-06).

**Effort.** 4–5 session-days.

**Done when.**
- A requirement produces a complete, well-formed Execution Brief that conforms to the 10-section schema.
- Allowed / Forbidden sections are explicit and editable.
- The brief is persisted, retrievable, and locked once saved.

**Verified by.** Generate a brief for one of the requirements from CHUNK-08's run. Check the markdown against the schema.

**Risks / unknowns.**
- "Codebase Context" section content — for the MVP, the user pastes; for a future build, auto-extract from the workspace. Document the seam clearly.

---

### CHUNK-10 — Harness profiles (Claude Code + Codex) + suggested CLAUDE.md / AGENTS.md update

**Goal.** Implement the two MVP harness profiles. Each profile renders the brief with the harness's conventions and produces a suggested `CLAUDE.md` or `AGENTS.md` block (delimiter-wrapped, append-only, never silently rewrites the user's file).

**In scope.**
- Profile data structure (matches `architecture/harness-profiles.md` schema):
  ```yaml
  name, display_name, instruction_file, handoff_dir, brief_style,
  include_test_commands, include_lint_commands, include_forbidden_changes,
  output_format, mcp_capable
  ```
- Claude Code profile:
  - Renders the brief as the full 10-section structured markdown.
  - Suggested `CLAUDE.md` update (research finding #5 + #8): a managed block wrapped in `<!-- DELIVERYOS:BEGIN --> ... <!-- DELIVERYOS:END -->` telling Claude Code to read `.deliveryos-handoff/current-execution-brief.md` before any edit and to write the result to `.deliveryos-handoff/result.md`.
  - Suggested `.claude/settings.json` PreToolUse hook stub (full implementation lands in CHUNK-13 with the diff feature).
- Codex profile:
  - Renders the brief as 10-section markdown.
  - Suggested `AGENTS.md` update with the same managed-block delimiter pattern.
  - Records the Codex command shape with `-o .deliveryos-handoff/result.md` (research finding #4).
- Profile selector on the brief composer; "Render for profile" preview.
- A "Suggested CLAUDE.md / AGENTS.md update" tab on the composer that shows the proposed delimiter block with a diff against the user's existing file (if any). User clicks "Apply" to write; never silent.

**Out of scope.** Other profiles (Cursor, Generic, etc.). Auto-applying changes. Hook script generation (CHUNK-13). File handoff writing (CHUNK-11).

**Dependencies.** CHUNK-09 (brief exists), CHUNK-02, CHUNK-03.

**BUILD-PLAN phase.** Phase 2, Week 8 (2026-07-13).

**Effort.** 4 session-days.

**Done when.**
- The same brief from CHUNK-09 renders correctly for both Claude Code and Codex profiles.
- The "Suggested CLAUDE.md update" tab shows the managed-block addition with a diff view.
- Clicking "Apply" writes the block into `CLAUDE.md` (creating the file if missing).

**Verified by.** Manual round-trip: open a brief, switch profile, inspect the rendered output.

**Risks / unknowns.**
- Diff view in webview — pick a small lib (e.g. `diff` + a minimal renderer). Don't pull in Monaco for this.

---

### CHUNK-11 — File handoff (`.deliveryos-handoff/`) + terminal integration + result watcher

**Goal.** Wire the EXECUTE moment. Click "Run with Claude Code" (or Codex) on a saved brief → DeliveryOS writes `.deliveryos-handoff/` into the workspace → opens the integrated terminal with the harness command pre-typed → user presses Enter → DeliveryOS watches for `result.md`.

**In scope.**
- `.deliveryos-handoff/` directory schema (research finding #6, #8):
  - `current-execution-brief.md`
  - `current-context-package.md`
  - `current-test-specification.md`
  - `current-verification-checklist.md`
  - `memory-summary.md`
  - `result.md` (written by the harness or user; NOT created upfront)
  - `history/<timestamp>-execution-brief.md` (timestamped snapshot, committed)
  - `history/<timestamp>-result.md` (timestamped snapshot once captured)
- "Run with Claude Code" command:
  - Writes the handoff directory (current + history snapshot of the brief).
  - Opens an integrated terminal with `name: "DeliveryOS — Claude Code"`, `cwd: workspaceRoot`, `iconPath: new ThemeIcon('rocket')`, `isTransient: true`.
  - Calls `terminal.sendText("claude --add-dir . 'Run the brief at .deliveryos-handoff/current-execution-brief.md and write result to .deliveryos-handoff/result.md'", false)` — `shouldExecute=false` per research finding §2 (pre-type, user presses Enter).
  - Escapes any user-controlled string fragments (prompt-injection-into-shell defence).
- "Run with Codex" command:
  - Same pattern, command: `codex exec -o .deliveryos-handoff/result.md "Run the brief at .deliveryos-handoff/current-execution-brief.md"`.
- `FileSystemWatcher` on `.deliveryos-handoff/result.md`:
  - `new vscode.RelativePattern(workspaceFolder, '.deliveryos-handoff/result.md')`.
  - Subscribe to `onDidCreate` AND `onDidChange` (atomic-rename caveat); debounce 250ms.
  - On fire: emit an event that CHUNK-12's Result Capture listens to.
- `onDidCloseTerminal` instrumentation: log `exitStatus.code` and `reason` when DeliveryOS's terminal closes; surfaces "harness crashed" vs "user bailed" vs "window reloaded" telemetry.
- A `.gitignore` template suggestion that the project can apply (gitignores `current-*.md` and `result.md`, commits `history/`).

**Out of scope.** Parsing `result.md` (CHUNK-12). The diff feature (CHUNK-13). Capturing terminal output via shell integration — defer; FileSystemWatcher is the load-bearing signal.

**Dependencies.** CHUNK-10 (profiles exist), CHUNK-09 (briefs exist), CHUNK-02, CHUNK-03.

**BUILD-PLAN phase.** Phase 2, Week 9 (2026-07-20). End of Phase 2.

**Effort.** 4–5 session-days.

**Done when.**
- Clicking "Run with Claude Code" writes the handoff directory and opens a terminal with the command pre-typed.
- The user presses Enter, Claude Code runs, writes `result.md`, DeliveryOS detects it within 1 second.
- The same flow works for Codex (with `codex` binary installed).
- Closing the terminal mid-flight is logged but does not corrupt state.
- **Phase 2 demoable state achieved:** "Generate a brief, click a button, Claude Code runs in the same window against the brief."

**Verified by.** End-to-end manual run with the real `claude` binary AND the real `codex` binary.

**Risks / unknowns.**
- The `claude` and `codex` CLIs change. Pin known-good versions in the README. Re-test before the demo.
- Brief content may contain shell metacharacters — escape file paths, never inline brief content into the command.

---

### CHUNK-12 — Result capture (parse `result.md`, paste mode fallback)

**Goal.** When `result.md` appears, parse it and store as Result Memory linked to the Execution Brief. Provide a paste-mode fallback for harnesses that don't write the file.

**In scope.**
- `result.md` parser:
  - Expected shape (defined in the brief's Section 9 "Expected Output"): summary of changes, files changed, tests added/run, errors, risks, unresolved questions.
  - Markdown section-header-based parser. Be lenient — accept missing sections, missing files-changed list, etc.
  - Fallback: store the raw text + parsed fields, flag "low-confidence parse" if structure is missing.
- Result Memory entry:
  - Linked to the Execution Memory entry (the brief).
  - Stores: parsed sections, raw text, harness identity (Claude Code / Codex), timestamp.
- Paste-mode fallback panel:
  - Manual paste of harness output if the watcher didn't fire (the user ran the harness elsewhere, or used a non-CLI harness).
  - Same parser.
- "Files actually changed" — DeliveryOS reads git status / `git diff --name-only HEAD` to get the actual changed-files list. This is the canonical source for CHUNK-13's diff feature; don't trust the harness's self-report alone.
- EXECUTE tree node now shows results under each brief.

**Out of scope.** The Allowed/Forbidden diff (CHUNK-13). Verification against test spec (CHUNK-14). Memory updates (CHUNK-14).

**Dependencies.** CHUNK-11 (handoff + watcher).

**BUILD-PLAN phase.** Phase 3, Week 10 (2026-07-27).

**Effort.** 3–4 session-days.

**Done when.**
- A harness run that writes `result.md` produces a stored, parsed Result Memory linked to its brief.
- The paste-mode fallback works for the same purpose.
- The "files actually changed" list comes from `git diff --name-only HEAD`.

**Verified by.** Run Claude Code + Codex end-to-end; inspect the Result Memory.

**Risks / unknowns.**
- Parser fragility. Reduce by asking the harness (via brief Section 9 instruction) to use a specific section schema. Validate parser against 3+ real harness outputs.

---

### CHUNK-13 — Allowed/Forbidden Changes diff (the headline feature) + Claude Code PreToolUse hook

**Goal.** Compare the files the harness actually changed against the brief's Allowed and Forbidden lists. Flag forbidden touches + missing allowed work. Additionally, for the Claude Code profile, generate a `PreToolUse` hook that hard-blocks Forbidden paths in real time (research finding #5).

**In scope.**
- Allowed/Forbidden diff engine:
  - Inputs: the saved Execution Brief (Sections 7 Allowed + 8 Forbidden) and the Result Memory's "files actually changed" (from CHUNK-12's `git diff`).
  - Algorithm: glob-match (use a small lib like `picomatch`) each changed file against Allowed and Forbidden lists.
  - Four classifications per file: `allowed-and-touched` (OK), `allowed-but-not-touched` (OK, possibly under-scoped work), `forbidden-but-touched` (FAIL), `unclassified-but-touched` (WARNING, fail-open — file matched neither Allowed nor Forbidden). Iteration 2 promoted this from 3 → 4 to match CHUNK-13's actual implementation.
  - Plus a top-level `pass | fail` verdict.
- Diff results panel (pass/fail panel with clear OK/FAIL UI per file).
- **Claude Code PreToolUse hook generator** (research finding #5):
  - When the Claude Code profile is in use, generate a small bash/node script under `.claude/hooks/deliveryos-forbidden-paths.sh`.
  - Generate a managed block in `.claude/settings.json` (delimiter-wrapped) that registers the hook against `PreToolUse` for Edit / Write / MultiEdit tools.
  - The script reads `.deliveryos-handoff/current-execution-brief.md`, parses the Forbidden section, exits 2 if the target path matches.
  - Same diff-view-and-apply UX as the suggested CLAUDE.md update from CHUNK-10.
- VERIFY tree node shows diff results per result.

**Out of scope.** Codex enforcement hooks — Codex has no PreToolUse equivalent in 2026 (research finding §5). Post-hoc diff is the universal backstop and remains the headline. Full verification against test spec (CHUNK-14).

**Dependencies.** CHUNK-12 (result capture), CHUNK-09 (brief Sections 7 + 8).

**BUILD-PLAN phase.** Phase 3, Week 11 (2026-08-03). **The headline week.**

**Effort.** 4–5 session-days.

**Done when.**
- A harness run that touches a forbidden file is caught and flagged with a clear FAIL panel.
- A harness run that touches only allowed files passes.
- For Claude Code: the generated PreToolUse hook successfully blocks a real Edit attempt on a forbidden file (real-time enforcement demo).
- For Codex: the post-hoc diff catches a forbidden touch.

**Verified by.** Deliberately craft a brief that forbids `src/legacy/` and ask the harness to "refactor src/legacy/foo.ts". Verify the diff flags it (both profiles) and that the PreToolUse hook blocks (Claude Code only).

**Risks / unknowns.**
- Glob semantics across OSes — `picomatch` handles Windows paths but test on Windows + macOS + Linux.
- Hook escaping — the generated hook script must not be exploitable if the user's brief contains shell metacharacters.

---

### CHUNK-14 — Verification against test spec + memory update + release evidence export

**Goal.** Close the SDLC loop. Verification compares the captured Result against the Test Specification + Verification Criteria. On pass, update Design / Codebase / Requirement memories with anything the harness decided. Export a Release Evidence package showing the full traceability chain.

**In scope.**
- Verification workflow:
  - Read the Test Spec from Verification Memory (CHUNK-08 output).
  - Read the Result Memory (CHUNK-12 output).
  - Cross-check: did the harness run the tests? Did they pass? Were Forbidden Changes respected (CHUNK-13 already answered this)?
  - For the MVP, the user approves verification manually with an "Approve" button (no auto-evaluation of test outcomes — manual mode preserves human-in-the-loop). The system records the user's verdict.
  - Stores Verification Memory with: pass/fail, failed criteria list, defects, rework notes, approval decision.
- Memory update step (mandatory before release evidence — PRD Risk 4):
  - Prompt the user: "Did the harness make any design decisions worth preserving?" — open-text field that goes into Design Memory.
  - "Are there new files / conventions to record in Codebase Memory?" — open-text field.
  - "Did any requirement assumption change?" — open-text update.
- Release Evidence export:
  - Walks the memory graph from the Verification Memory entry backwards.
  - Generates a single markdown document (`<workspace>/.deliveryos/releases/<release-id>.md`) showing the chain: Intent → Discovery → PRD → Requirement → Design → Test Spec → Execution Brief → Result → Verification → Release.
  - Optional zip of all referenced markdown files (the "Release Evidence Package").
- VERIFY tree node shows verifications and the Release Evidence document.

**Out of scope.** Auto-evaluation of test outcomes (manual approval is the MVP). MCP-based memory exposure (future). Multi-release evidence (one requirement → one release in MVP).

**Dependencies.** CHUNK-13 (diff results), CHUNK-12 (results), CHUNK-08 (test specs), all earlier memory chunks.

**BUILD-PLAN phase.** Phase 3, Week 12 (2026-08-10). End of Phase 3.

**Effort.** 5 session-days.

**Done when.**
- A completed requirement produces a Release Evidence document with the full traceability chain.
- Memory Update is a mandatory step (can't reach Release Evidence without it).
- The exported markdown opens cleanly and shows every link.
- **Phase 3 demoable state achieved:** "The full loop, idea to verified release, with the diff feature catching a violation live."

**Verified by.** End-to-end run from idea (CHUNK-05) → release evidence (CHUNK-14). Inspect the chain markdown.

**Risks / unknowns.**
- The "memory update" UX should not feel like ceremony. Two-question form, optional fields, "skip this step" allowed (recorded as a Bypass per stage-configuration.md § Stage gates).

---

### CHUNK-15 — Bug Triage demo build

**Goal.** Run the Bug Triage Assistant project end to end through DeliveryOS, scripted so the demo includes a moment where Claude Code modifies a forbidden file and DeliveryOS catches it live.

**In scope.**
- Define the Bug Triage Assistant target product: a small FastAPI service that accepts bug reports (per PRD § 23 example).
- Script the demo flow:
  1. Open DeliveryOS, type the raw idea "I want a bug triage assistant".
  2. Run discovery interview.
  3. Generate PRD.
  4. Decompose into 3–4 requirements (e.g. REQ-001 Bug submission API, REQ-002 List bugs, REQ-003 AI severity suggestion).
  5. Run Test Designer on REQ-001 (the example from PRD § 23).
  6. Generate Execution Brief for REQ-001 with explicit Allowed (`src/backend/api/bugs.py`, etc.) and Forbidden (`src/backend/api/users.py`, `migrations/`, `src/frontend/`).
  7. Run with Claude Code → demo modifies a forbidden file deliberately → DeliveryOS's diff catches it (and the PreToolUse hook blocks it in real time).
  8. Fix and re-run successfully.
  9. Verify, update memory, export Release Evidence.
- A small target repo (`examples/bug-triage/`) with the initial FastAPI skeleton + Codebase Memory pre-filled.
- Tidy the webview UI for screenshot quality.

**Out of scope.** New features. Anything not on the demo path.

**Dependencies.** All previous chunks.

**BUILD-PLAN phase.** Phase 4, Week 13 (2026-08-17).

**Effort.** 4–5 session-days.

**Done when.**
- The full demo runs cleanly start to finish without manual intervention beyond pressing Enter and pasting AI tool responses.
- The forbidden-file moment fires (both the live block AND the post-hoc diff flag).
- The Release Evidence document is generated and looks presentable.

**Verified by.** Two complete walkthroughs back-to-back. Record one for a sanity check.

**Risks / unknowns.**
- AI tool responses are non-deterministic — the demo may need re-runs to land cleanly. Build a "rehearsal mode" that uses canned responses, but ensure the final demo uses live AI to make the proof of work credible.

---

### CHUNK-16 — Demo recording + README + essay + GitHub release publish

**Goal.** Ship the proof of work. Demo video, README, screenshots, the meta-harness essay, and a published `.vsix` on GitHub Releases.

**In scope.**
- Short demo video (3–5 minutes, screen recording with voiceover).
- README rewrite:
  - The pitch ("A harness around your harness").
  - Install instructions (all 5 editors).
  - Quick-start (raw idea → release evidence in 5 minutes).
  - Screenshots.
  - Link to the demo video.
  - Link to the essay.
- Meta-harness essay (~1500–2000 words, markdown in repo):
  - The thesis (the model is not the product; the harness is; meta-harness is one level up).
  - What's new vs. existing tools (Linear/Jira/Devin/raw harnesses).
  - The dogfooding note: DeliveryOS was built using DeliveryOS.
- Screenshots: activity bar, tree view, PRD editor, brief composer, the diff catching a violation, release evidence.
- GitHub Release with the `.vsix` attached, SHA-256 hash, install script links.
- Tag `v0.1.0` (first public version).

**Out of scope.** OpenVSX publishing. Auto-update beyond the version-check notification from CHUNK-04. Marketplace listing.

**Dependencies.** CHUNK-15 (working demo).

**BUILD-PLAN phase.** Phase 4, Week 14 (2026-08-24). Demo target date.

**Effort.** 4–5 session-days.

**Done when.**
- `git tag v0.1.0 && git push --tags` triggers the GitHub release.
- The release page shows the `.vsix`, SHA-256, install instructions, demo video link, README, essay link.
- A stranger landing on the repo can grok the project in under 2 minutes.

**Verified by.** Hand the link to a non-DeliveryOS friend (or simulate). Watch them install and run the demo.

**Risks / unknowns.**
- Recording quality. Plan for 2–3 takes. Don't perfectionism this — "good enough to be credible" beats "polished but late".

---

## Ordered build sequence

```
Week  Date         Chunk   Title
----  ----------   ------  -----------------------------------------------------
 1    2026-05-25   CHUNK-01  Extension scaffold + activity-bar + static tree view
 2    2026-06-01   CHUNK-02  Webview foundation (Vite + React + Tailwind + CSP)
 2    2026-06-01   CHUNK-03  Memory store (sql.js + workspace .deliveryos/)
 2    2026-06-01   CHUNK-04  Multi-editor verify + install script + release scaffold
─── Phase 0 boundary ── demoable: "Installed in VS Code and Cursor from the same file" ───
 3    2026-06-08   CHUNK-05  Raw idea + Discovery interview
 4    2026-06-15   CHUNK-06  Draft PRD + PRD editor
 5    2026-06-22   CHUNK-07  Requirements catalogue
 6    2026-06-29   CHUNK-08  Test Designer specialist
─── Phase 1 boundary ── demoable: "Type an idea → PRD → requirements → test specs" ───
 7    2026-07-06   CHUNK-09  Execution Brief composer (10-section schema)
 8    2026-07-13   CHUNK-10  Harness profiles (Claude Code + Codex) + CLAUDE/AGENTS update
 9    2026-07-20   CHUNK-11  File handoff + terminal integration + result watcher
─── Phase 2 boundary ── demoable: "Click a button → Claude Code runs against the brief" ───
10    2026-07-27   CHUNK-12  Result capture (parse result.md)
11    2026-08-03   CHUNK-13  Allowed/Forbidden diff + Claude Code PreToolUse hook ⭐
12    2026-08-10   CHUNK-14  Verification + memory update + release evidence export
─── Phase 3 boundary ── demoable: "Full loop, diff feature catches a violation live" ───
13    2026-08-17   CHUNK-15  Bug Triage demo end-to-end
14    2026-08-24   CHUNK-16  Demo recording + README + essay + GitHub release publish
─── Phase 4 boundary ── shipped: public proof of work ───
```

⭐ = headline / unique feature.

---

## Dependency map

```
CHUNK-01 (scaffold)
   │
   ├─→ CHUNK-02 (webview)
   │      │
   ├─→ CHUNK-03 (memory) ─────┐
   │                          │
   └─→ CHUNK-04 (multi-editor verify + release scaffold)
                              │
   ┌──────────────────────────┘
   │
   ▼
CHUNK-05 (Discovery)
   │
   ▼
CHUNK-06 (PRD)
   │
   ▼
CHUNK-07 (Requirements)
   │
   ▼
CHUNK-08 (Test Designer)
   │
   ▼
CHUNK-09 (Execution Brief composer)
   │
   ▼
CHUNK-10 (Harness profiles)
   │
   ▼
CHUNK-11 (File handoff + terminal + result watcher)
   │
   ▼
CHUNK-12 (Result capture)
   │
   ▼
CHUNK-13 (Allowed/Forbidden diff + PreToolUse hook)  ⭐ HEADLINE
   │
   ▼
CHUNK-14 (Verification + memory update + release evidence)
   │
   ▼
CHUNK-15 (Bug Triage demo)
   │
   ▼
CHUNK-16 (Demo recording + README + essay + GitHub release)
```

**Parallelisable pairs.** CHUNK-02 and CHUNK-03 can be done in parallel after CHUNK-01 (both depend only on the scaffold). CHUNK-04 depends on both CHUNK-02 and CHUNK-03 because the smoke test exercises both. Everything from CHUNK-05 onwards is strictly sequential.

**Critical path.** CHUNK-01 → 02 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15 → 16. 14 chunks on the critical path, fits the 14-week schedule when CHUNK-03 and CHUNK-04 land in parallel with CHUNK-02.

**Phase-boundary fallback.** Per BUILD-PLAN § "How to read this plan": each phase ends with a demoable state. If the timeline slips, ship at the nearest phase boundary as a smaller proof of work rather than abandoning. Phase 3 (after CHUNK-14) is the minimum acceptable ship — the SDLC loop is closed and the diff feature works.

---

## Shared cross-chunk contracts (sketched here for Prompt 2 to formalise)

Prompt 2 will produce per-chunk specs; these are the contracts every spec must honour without redefining:

- **Memory schema.** Defined in CHUNK-03. Every chunk that touches memory imports the schema, never re-declares it.
- **Webview message contracts.** Lives in `contracts/` package. Each chunk that adds a new panel adds its slice; never duplicates an existing message type.
- **Execution Brief markdown schema.** Defined in CHUNK-09, frozen at the 10 sections from [architecture/execution-briefs.md](../architecture/execution-briefs.md). CHUNK-10 (profile rendering) and CHUNK-13 (diff parsing) MUST share the same parser.
- **Harness Profile schema.** Defined in CHUNK-10 per [architecture/harness-profiles.md](../architecture/harness-profiles.md). CHUNK-11 (handoff) and CHUNK-13 (Claude PreToolUse hook) read from it.
- **Handoff directory layout.** Defined in CHUNK-11 per research finding #6, #8. Everything that reads or writes `.deliveryos-handoff/` uses the same constants.
- **`.deliveryos/` memory directory layout.** Defined in CHUNK-03 per research finding #4. All memory-related chunks use the same paths.
- **Managed delimiter block syntax** for CLAUDE.md / AGENTS.md / .claude/settings.json. Defined in CHUNK-10 (`<!-- DELIVERYOS:BEGIN --> ... <!-- DELIVERYOS:END -->`). CHUNK-13's hook installer reuses this pattern.

---

## What success looks like at the end of Prompt 1

This document is the chunk break-down. The next prompts will:

- **Prompt 2** — spawn 16 parallel subagents (one per chunk) to write `docs/planning/chunks/chunk-NN-*.md` specs with file-by-file breakdowns, key interfaces and types, data model touches, VS Code APIs used, step-by-step implementation outlines, test plans, risks, and explicit dependencies.
- **Prompt 3** — audit cohesion: gaps, overlaps, interface mismatches, dependency problems, shared contracts, verification gaps, scope drift. Produces `validation-report.md`.
- **Prompt 4** — iterate until clean. Resolves blockers and majors; the doc updates listed under "Research-driven changes" land in the relevant source docs during this iteration. Produces `READY.md`.
