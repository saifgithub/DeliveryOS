# History — track R (Development)

Older "what just landed" sections from docs/build/BUILD_STATUS.md, newest on top.

---

## DOS:R2  (2026-05-21)

DOS:R2 finished the unfinished business of CHUNK-01 (steps 4–13) and then landed **all of CHUNK-02** end-to-end. Six substantive commits across two chunks. CHUNK-01 closed at v0.0.1; CHUNK-02 bumped to v0.0.2 because the surface meaningfully grew (webview + bundled deps + monorepo). Phase 0 Week 2 first half is done — ~4 days ahead of the BUILD-PLAN's 2026-06-01 nominal start.

**CHUNK-01 completion (3 commits):**

- `278d79f feat(scaffold): activity-bar + static stage tree — CHUNK-01 steps 4-6 (DOS:R2)`
  - Added `media/icon-rocket.svg` (Lucide rocket, `stroke-width=2`, 24×24) + `media/deliveryos-logo.png` (128×128 placeholder generated via Python stdlib).
  - `package.json`: `icon`, `capabilities.{untrustedWorkspaces,virtualWorkspaces}: false`, `contributes.viewsContainers.activitybar[deliveryos]`, `contributes.views.deliveryos[deliveryos.stages]`.
  - `src/stages/{stageDefinitions,stageTreeNodes,stageTreeProvider}.ts`: frozen `STAGE_DEFS` (4 entries), `StageNode | ArtefactNode` discriminated union, `contextValue: 'deliveryos.stage.<id>'` set per spec § 9 OQ#4 for downstream CHUNK-05+ menu wiring.
  - `src/extension.ts`: `vscode.window.createTreeView('deliveryos.stages', { showCollapseAll: true })`.

- `6523214 feat(scaffold): project registry + create command + welcome + refresh — CHUNK-01 steps 7-11 (DOS:R2)`
  - `src/contextKeys.ts`: `CONTEXT_KEYS.hasProject = 'deliveryos.hasProject'`.
  - `src/projectRegistry.ts`: `InMemoryProjectRegistry implements IProjectRegistry`. `EventEmitter<void>` wakes the tree. `ProjectRecord` stub (id, name, description?, createdAt). `generateProjectId()` uses `node:crypto.randomUUID()` — CHUNK-03 can swap to ULID/UUIDv7 without touching call sites.
  - `src/commands/projectCreate.ts`: `deliveryos.project.create` handler — `showInputBox` with `validateInput`, sets `deliveryos.hasProject` context key, returns discriminated `ProjectCreateResult`.
  - `src/commands/stagesRefresh.ts`: `deliveryos.stages.refresh`.
  - `src/stages/stageTreeProvider.ts`: constructor takes `IProjectRegistry`, subscribes to `onDidChange`, gates `getChildren` on `getActive()` (empty → welcome; populated → four stages).
  - `package.json`: `viewsWelcome` (gated on `!deliveryos.hasProject`), `commands`, `menus.view/title` for refresh icon.

- `813a56f docs(scaffold): README expansion + LICENSE — CHUNK-01 step 12 (DOS:R2)`
  - MIT `LICENSE`.
  - `README.md` updates: status line + repo layout + post-install click path + known limitations + "what's next".

**CHUNK-02 (3 commits — Sessions 1, 2, 3+4+5):**

- `2f648fa refactor(monorepo): restructure as npm workspaces — CHUNK-02 Session 1 (DOS:R2)`
  - `tsconfig.base.json` at root.
  - Root `package.json` → workspaces `["contracts", "extension"]` (webview added in Session 2). Build/clean/package orchestrator scripts.
  - **All CHUNK-01 source moved** into `extension/`: `extension/src/{extension,contextKeys,projectRegistry}.ts`, `extension/src/commands/`, `extension/src/tree/` (renamed from `src/stages/`), `extension/media/`. `extension/package.json` is the actual extension manifest (`name: "deliveryos"`, v0.0.2). Owns its own `tsconfig.json`, `.vscodeignore`, scripts.
  - `contracts/` workspace: `@deliveryos/contracts` (private, composite TS). `src/messages.ts` (base helpers), `src/panels/hello.ts` (`GetHelloText` RequestType), `src/index.ts` (namespaced barrel: `export * as Hello`).
  - Strict-compiler fixes: spread `description` only when defined in `projectCreate.ts`; update `stages/` → `tree/` import paths.

- `c496121 feat(webview): add webview package — CHUNK-02 Session 2 (DOS:R2)`
  - `webview/` workspace: `@deliveryos/webview` (private, `type: module`). Deps: `react`/`react-dom` 18, `vscode-messenger-{webview,common}` 0.4.5, `@deliveryos/contracts`. Dev: vite 5, `@vitejs/plugin-react`, tailwind 3, postcss, autoprefixer, `@types/{react,react-dom,vscode-webview}`.
  - `vite.config.ts`: multi-entry build, `rollupOptions.input.hello → src/panels/hello/index.html`, hashed `assets/` output filenames, `base: './'`, `manifest: '.vite/manifest.json'`.
  - `tailwind.config.ts`: hybrid theming per spec § 7 — `dos.*` palette (`ink/surface/accent/danger/success/warn/muted`) + `vscode.*` anchors bound to VS Code CSS vars (`bg/fg/panel/border/focusBorder/input*`). Font family + size anchored to `--vscode-font-*`.
  - `src/shared/{styles/tailwind.css, vscode.ts, messenger.ts}`: tailwind layer imports + body defaults + focus ring; `vscode()` singleton wraps `acquireVsCodeApi()`; webview messenger singleton.
  - `src/panels/hello/{index.html, main.tsx, HelloApp.tsx}`: Vite entry HTML + React bootstrap + the `HelloApp` component that calls `Hello.GetHelloText` and renders the response + ISO timestamp.
  - `scripts/build.mjs`: orchestrator — contracts → webview → extension, then `cp webview/dist → extension/dist/webview` (the spec-deviation copy step described below).

- `778f3cf feat(webview): hello panel + host messenger + CSP-locked HTML factory + serializer — CHUNK-02 Sessions 3-5 (DOS:R2)`
  - `extension/src/webview/nonce.ts` → `randomBytes(24).toString('base64url')` (192 bits per call).
  - `extension/src/webview/htmlFactory.ts` → cached manifest read, looks up entry key `src/panels/<entry>/index.html`, generates CSP-locked HTML with per-call nonce. CSP: `default-src 'none'; script-src 'nonce-<n>'; style-src <cspSource> 'unsafe-inline'; img-src <cspSource> https: data:; font-src <cspSource>; connect-src <cspSource>`.
  - `extension/src/webview/messenger.ts` → `HostMessenger` wraps `vscode-messenger`. `registerHelloHandlers()` binds `Hello.GetHelloText → { text: 'Hello, <name>.', timestamp: Date.now() }`. `attachPanel()` calls `registerWebviewPanel()`.
  - `extension/src/webview/panelManager.ts` → `Map<viewType, panel>` for show-or-focus. `trackPanel` + `existingPanel`. Cleans on dispose.
  - `extension/src/webview/helloPanel.ts` → `openHelloPanel`: reveal-if-existing else `createWebviewPanel` with `enableScripts` + `localResourceRoots = extensionUri/dist/webview`, set HTML, attach, track.
  - `extension/src/serializers/helloPanelSerializer.ts` → `deserializeWebviewPanel` re-applies options, re-renders HTML (fresh nonce), re-attaches messenger, re-tracks panel.
  - `extension/src/commands/openHello.ts` + `extension/src/extension.ts` updates → registers `deliveryos.openHello`, the messenger, the serializer for `HELLO_VIEW_TYPE`.
  - `extension/package.json`: `contributes.commands[deliveryos.openHello]`, `dependencies.vscode-messenger + .vscode-messenger-common`. `devDependencies.esbuild`.
  - `extension/esbuild.mjs` → bundles `src/extension.ts` → `dist/extension.js` (cjs, node18, external: vscode). Switch from tsc-emit to esbuild-bundle so `vsce --no-dependencies` ships a single-file extension without trying to walk workspace symlinks for `vscode-messenger`.

**Deviation from the chunk spec to flag for next session:**

- **CHUNK-02 § 8 path inconsistency.** The spec's `htmlFactory` uses `extensionUri.joinPath('..', 'webview', 'dist', ...)`. That only works in F5 dev mode (`extensionUri = workspaceFolder/extension`) and breaks at runtime in a packaged `.vsix` (`extensionUri = .vsix content root` — no parent traversal). DOS:R2's resolution: keep `vsce` running from `extension/` and have `scripts/build.mjs` copy `webview/dist/ → extension/dist/webview/` before packaging. `htmlFactory.ts`, `helloPanel.ts`, and `helloPanelSerializer.ts` all use `extensionUri.joinPath('dist', 'webview', ...)` (no `..`) — identical path in both dev mode (after build) and packaged mode. The deviation is logged in the Session 1 + Session 3-5 commit bodies; consider folding the resolution into the CHUNK-02 spec as a follow-up Track-O edit. *(Closed during DOS:R3 wrap — `ee44636 docs(planning): fold DOS:R2 path-resolution decision into CHUNK-02 spec`.)*
- **CHUNK-01 step 13 final-audit assertion is partially stale post-CHUNK-02.** The spec § 8.1 expected `.vsix` contents list (e.g. "no `node_modules/`") is now broader because esbuild bundles `vscode-messenger` into `dist/extension.js`. The CHUNK-02 v0.0.2 `.vsix` still has no `node_modules/` because the bundling is in-file; the assertion still holds in spirit. Not a fix; just an observation.

**Doc-hygiene + housekeeping in DOS:R2:**

- `README.md` rewritten for the monorepo layout (full new repo-layout block) and the post-CHUNK-02 click path (rocket → welcome → create → open-hello smoke).
- `.gitignore`: `*.tsbuildinfo`, `/extension/LICENSE`, `/extension/readme.md` (the prepackage step copies them from root).
- `extension/.vscodeignore`: exclude `esbuild.mjs` from the `.vsix`.

**Stale ref discovered but NOT fixed this session (carry-over to user, not blocking):**

- `.claude/session-config.yml`'s R-track sanity check `ls src/ && ls package.json 2>&1` is **stale post-monorepo**. Post-DOS:R2, the relevant paths are `extension/src/` and either `extension/package.json` (extension manifest) or root `package.json` (workspaces manifest). DOS:R3's `/start-fresh R` will run the stale check and report N/A or false-fail; update the config before then. Suggested replacement: `ls extension/src/ && ls extension/package.json webview/package.json contracts/package.json 2>&1`. *(Closed in DOS:R3 commit `3df8ce8`.)*

**Carry-overs for DOS:R3 (next session):**

- **CHUNK-03 — Memory store.** `sql.js` (WASM SQLite) + `.deliveryos/memory.sqlite` schema. Replaces `InMemoryProjectRegistry` with `PersistedProjectRegistry` via the existing `IProjectRegistry` interface (CHUNK-01's seam). Owns `MEMORY_TYPES` (9 entries: `intent`/`requirement`/`design`/`codebase`/`execution`/`result`/`verification`/`release`/`test-spec`) and `LINK_KINDS` (10 entries post-DOS:O4 retirement of 3 zero-writer edges). Adds `@deliveryos/contracts/memory` + `@deliveryos/contracts/links` slices. Effort: 3–4 session-days. Spec: [docs/planning/chunks/chunk-03-memory-store.md](../planning/chunks/chunk-03-memory-store.md). *(Closed in DOS:R3.)*
- **CHUNK-04 — Multi-editor sideload + GitHub Release scaffold.** Sideload smoke into Cursor / Windsurf / VSCodium / Antigravity, install scripts, GitHub Actions wiring, version-check notification. Phase 0 demoable state: "installed in VS Code AND Cursor from the same file." Also folds the `deliveryos.openHello` command behind a `deliveryos.devMode` `when` clause so it's not user-facing. Effort: 1–2 session-days. Spec: [docs/planning/chunks/chunk-04-multi-editor-verify.md](../planning/chunks/chunk-04-multi-editor-verify.md). *(Carried forward to DOS:R4.)*
- **Per [READY.md § Parallelisable pairs](../planning/READY.md):** CHUNK-03 + CHUNK-04 can land in parallel with each other (CHUNK-04 also depends on CHUNK-03, so the parallelism is between drafting CHUNK-03's skeleton and starting the editor matrix). For a solo dev at 5–10 hrs/week, sequential is fine — pick whichever appeals to start DOS:R3.
- **Two cheap unit tests CHUNK-02 § 10.2 calls for:** `htmlFactory.test.ts` (asserts nonces differ across two calls + CSP directives + asset URI rewrite) + `nonce.test.ts` (asserts 24-byte base64url + 100 unique calls). Both use `node:test` — zero new deps. Worth landing alongside CHUNK-03 since CHUNK-04 will start to need a deterministic local-test floor anyway. *(Still pending — DOS:R3 added a `tsx + node:test` test runner for the memory module but the two CHUNK-02 webview unit tests themselves did not land; carry forward to DOS:R4 alongside CHUNK-04.)*
- **Update `.claude/session-config.yml` R-track sanity checks** (see "Stale ref discovered" above). *(Closed in DOS:R3 commit `3df8ce8`.)*

**Not done this session (deferred to later R sessions or chunks):**

- CI / GitHub Actions wiring (CHUNK-04).
- Multi-editor sideload smoke (CHUNK-04).
- Memory persistence (CHUNK-03).
- Specialist roles, PRD editor, Discovery panel, Brief composer, etc. (CHUNK-05+).
- ESLint / Prettier wiring (deferred; not in CHUNK-03/04).
- Manual webview round-trip verification (the user needs to reload VS Code post-wrap and run **DeliveryOS: Open Hello** + open Webview DevTools to confirm zero CSP errors per CHUNK-02 § 10.1).

---

## DOS:R1  (2026-05-21)

First development session. Phase A planning was already complete via Track O (PRD v0.3, 14-week BUILD-PLAN, 16 chunk specs, validation report, `READY.md`). DOS:R1 opened the build by cutting CHUNK-01 into a smallest-demoable slice — steps 1–3 of the 13-step implementation outline in [chunks/chunk-01-scaffold.md § 7](../planning/chunks/chunk-01-scaffold.md).

**Substantive commit:**

- `e83940d feat(scaffold): scaffold DeliveryOS extension v0.0.1 — CHUNK-01 steps 1–3 (DOS:R1)`
  - Removed stale `src/{backend,frontend,shared}/`, `tests/`, `config/`, `scripts/` placeholder dirs (zero tracked files; pre-CHUNK-01 web-app scaffold draft).
  - Created `package.json` (engines.vscode `^1.85.0`, `activationEvents: ["onStartupFinished"]`, `main: ./dist/extension.js`), `tsconfig.json` (CJS / ES2022 / strict / `noUnusedLocals` / `noFallthroughCasesInSwitch`), `.vscodeignore`, and `src/extension.ts` with a minimal `activate()` that logs `DeliveryOS activated`.
  - Wired npm scripts (`clean`, `compile`, `watch`, `package`, `vscode:prepublish`) and pinned `@vscode/vsce ^3.0.0`, `typescript ^5.4.0`, `rimraf ^5.0.0`, `@types/{vscode,node}`.
  - Smoke-verified end-to-end: `npm run package` produces a 3.79 KB `deliveryos-0.0.1.vsix` containing only `dist/extension.js`, `package.json`, `readme.md` (no `.ts`, no `node_modules/`, no `src/`); `code --install-extension` succeeds; VS Code `exthost.log` shows clean activation via `onStartupFinished` with no errors.

**Deviation from the chunk spec to flag for next session:**

- `activationEvents: ["onStartupFinished"]` was pre-included in step 1 (chunk-01 spec § 7 puts it in step 6). Without it, DOS:R1's truncated scope (no `contributes`, no commands, no views) has nothing to trigger implicit activation — the smoke test would not fire. When DOS:R2 adds the activity-bar/views contributes, `activationEvents` can stay as-is or be removed (implicit activation will then cover it); the chunk spec § 4 calls out both as acceptable.

**Doc-hygiene edits in the wrap commit (DOS:R2 will land HEAD = wrap commit):**

- [README.md](../../README.md) — replaced the "Concept / pre-build, not yet validated" status line; corrected the repo-layout block (removed the deleted `src/{frontend,backend,shared}/`, `tests/`, `scripts/`, `config/` entries); replaced the "Nothing to run yet" Getting Started block with the actual three-line install recipe.

**Carry-overs for DOS:R2 (next session):**

- **CHUNK-01 steps 4–6** — activity-bar contribution: add `media/icon-rocket.svg` (Lucide rocket, stroke-width 2px for legibility at 24px), `media/deliveryos-logo.png` (Extensions sidebar icon, 128×128), `viewsContainers.activitybar[deliveryos]`, `views.deliveryos[deliveryos.stages]` with an empty `StageTreeProvider`. Then add the four static stage rows (DISCOVER / DEFINE / EXECUTE / VERIFY) and the `capabilities.{untrustedWorkspaces,virtualWorkspaces}.supported: false` block.
- **Bumped-down**: steps 7–13 (project registry, `deliveryos.project.create` command, `viewsWelcome`, stage-children gating, refresh command + title-bar menu, README expansion + LICENSE, final `unzip -l` verification) → likely DOS:R3 if DOS:R2 stops at step 6.
- **One-line open question deferred from Track O**: should [docs/BUILD-PLAN.md](../BUILD-PLAN.md) get a `READY.md is canonical execution order` pointer? Decision per memory: yes, but absorbable into any R session. Untouched in DOS:R1 — pick up at start of DOS:R2 or defer further.

**Not done this session (deferred to later R sessions or chunks):**

- CI / GitHub Actions wiring (CHUNK-04).
- Multi-editor sideload smoke into Cursor / Windsurf / VSCodium / Antigravity (CHUNK-04).
- Webview, React, Tailwind, CSP, `vscode-messenger` (CHUNK-02).
- `sql.js` memory store, `.deliveryos/memory.sqlite` schema (CHUNK-03).
- ESLint / Prettier wiring (deferred; chunk-01 spec doesn't require it).
