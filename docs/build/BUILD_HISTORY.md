# History — track R (Development)

Older "what just landed" sections from docs/build/BUILD_STATUS.md, newest on top.

---

## DOS:R3  (2026-05-22)

DOS:R3 landed **CHUNK-03 (memory store) in full** plus a tiny housekeeping commit and one Track-O doc reconciliation that was in flight when the session opened. 7 substantive commits + 1 Track-O carry-forward commit + this wrap commit. Phase 0 / Week 2 second half is now done — running ~10 days ahead of the BUILD-PLAN's 2026-06-01 nominal start. The trimmed-MVP critical path now has CHUNK-04 as the only outstanding Phase 0 work.

**Housekeeping (1 commit):**

- `3df8ce8 chore(session-config): add P track + fix R sanity check post-monorepo (DOS:R3)`
  - Lands the in-flight `.claude/session-config.yml` addition: a third track `P:` (Project Management) with `handover_path: docs/pm/PM_STATUS.md`, `history_path: docs/pm/PM_HISTORY.md`. No sanity_checks / bug_list (mirrors O track). Project-plan path omitted — `PM_STATUS.md` absorbs the backlog in the same model the O track uses.
  - Bumps the `project_prefix` comment to mention `DOS:P<N>` alongside `DOS:O<N>` / `DOS:R<N>`.
  - Closes the DOS:R2 carry-over "Update `.claude/session-config.yml` R-track sanity checks": replaces the stale `ls src/ && ls package.json 2>&1` with the post-monorepo `ls extension/src/ && ls extension/package.json webview/package.json contracts/package.json package.json 2>&1`.

**CHUNK-03 (6 substantive commits, in the chunk-spec § 10 order):**

- `e6ba57d chore(deps): add sql.js + WASM copy step — CHUNK-03 Step 1 (DOS:R3)`
  - `extension/package.json` + `dependencies.sql.js ^1.10.3` + `devDependencies.@types/sql.js ^1.4.9` (per PRD § 25.2 + research finding #1: WASM-backed SQLite to avoid the native-module Electron-ABI matrix across editor forks).
  - `scripts/build.mjs` + copy `node_modules/sql.js/dist/sql-wasm.wasm → extension/dist/sql-wasm.wasm` (vsce `--no-dependencies` would otherwise omit it). `dist/extension.js` jumped 37 KB → 131 KB because esbuild bundles the sql.js JS glue inline; the standalone WASM lands at 644 KB. Total .vsix budget impact stays well under the § 13.1 5 MB limit.
  - `.vscodeignore` unchanged — `dist/*.wasm` is included by default; no rule excludes it.

- `c87c108 feat(contracts): memory + links slices — CHUNK-03 Step 2 (DOS:R3)`
  - `contracts/src/memory.ts` — `MEMORY_TYPES` const tuple of 9 (intent, requirement, design, codebase, execution, result, verification, release, test-spec) + `MemoryEntryBase` envelope + the 9 typed payloads (Intent w/ `RawIdea` + `DiscoveryRecord`; Requirement; Design; Codebase; Execution; Result w/ opaque `diffOutcome?: unknown` slot for CHUNK-13; Verification w/ `bypasses[]`; Release; TestSpec w/ `TestScenario`) + discriminated `MemoryEntry` union + `MemoryEntryOfType` / `MemoryPayloadOfType` helpers + per-type aliases (`IntentMemory`...`TestSpecMemory`).
  - `contracts/src/links.ts` — `LINK_KINDS` const tuple of 10 (derives-from, verifies, evaluates, produced, supersedes, includes, reworks, has-test-spec, derived-from-verification, releases) + `LinkKind` type + `MemoryLink` interface. Promoted to its own file (rather than nested inside memory.ts) so a single rename refactor moves the vocabulary and downstream consumers inventing a new kind get a TS error.
  - `contracts/src/index.ts` re-exports both slices via the barrel. `contracts/package.json` adds `./memory` and `./links` subpath exports for consumers that resolve via `package.json#exports` (the webview uses `moduleResolution: "Bundler"`; the extension uses legacy `"Node"` and imports from the barrel — both paths work).

- `f53fefb feat(memory): module foundation — CHUNK-03 Steps 3-7 (DOS:R3)`
  - **`extension/src/memory/paths.ts`** — `DELIVERYOS_DIR` / `MEMORY_SQLITE_FILENAME` / `MEMORY_BODY_DIR` / `README_FILENAME` / `HARNESS_SQLITE_FILENAME` constants + `deliveryosDir` / `memorySqlite` / `memoryBodyDir` / `readmePath` / `globalStoragePath` Uri helpers. `HARNESS_SQLITE_FILENAME` is defined but the cross-project DB is NOT opened in CHUNK-03 (§ 3.2 — stub path only).
  - **`extension/src/memory/schema.ts`** — `CURRENT_SCHEMA_VERSION = 1`, the v0 bootstrap `CREATE TABLE _schema_version IF NOT EXISTS`, and `SCHEMA_V1` (the canonical DDL from § 4.1: `memory_entries` + `memory_links` with FK + CASCADE + three indexes on type / from_id+kind / to_id+kind). `MIGRATIONS` map keyed by version for forward-only walks.
  - **`extension/src/memory/migrations.ts`** — 8-line forward-only `runMigrations(db)`. Idempotent: re-open is a no-op. v2+ migrations should wrap in `BEGIN/COMMIT` (v1 is initial DDL so wrapping is moot).
  - **`extension/src/memory/sqlJsTypes.ts`** — derives `SqlJsStatic` + `SqlJsDatabase` via `Awaited<ReturnType<typeof initSqlJs>>` + `InstanceType<...>`. Needed because `@types/sql.js` uses `export = initSqlJs` so `Database` / `SqlJsStatic` aren't importable as named types.
  - **`extension/src/memory/sqlJsHost.ts`** — owns `initSqlJs` (wasmBinary loaded from `extensionUri/dist/sql-wasm.wasm` — no network fetch), `open` / `openInMemory` factories, explicit `flush()` per § 12.2 (snapshot via `db.export → workspace.fs.writeFile`), and `close()`. `toArrayBuffer` helper converts the `Uint8Array` returned by vscode FS into the `ArrayBuffer` that sql.js's typings require.
  - **`extension/src/memory/ids.ts`** — `generateMemoryId(type)` returns `<type>-<8-hex>` using `crypto.randomUUID()`. ~4 billion collision space per project is fine; the typed prefix makes IDs self-describing on disk.
  - **`extension/src/memory/markdown.ts`** — `bodyPath` / `writeBody` / `readBody` / `deleteBody` (best-effort silent) + `renderFrontmatter` (the 4-line YAML block prefixed to every body file). UTF-8 via `TextEncoder`/`TextDecoder`.
  - **`extension/src/memory/types.ts`** — re-exports everything from the contracts barrel + adds `MemoryEntryRow` (the raw SQL row shape) which stays extension-only.

- `3d3c152 feat(memory): MemoryStore class — CHUNK-03 Step 8 (DOS:R3)`
  - `extension/src/memory/MemoryStore.ts` — the single public class consumed by every later chunk. Surface frozen here.
  - **Lifecycle:** `open(context, workspaceFolder)` (async factory; calls `SqlJsHost.open` + `runMigrations` + `flush()` so a fresh `.deliveryos/memory.sqlite` exists immediately) · `openInMemoryForTests(wasmBytes, workspaceUri)` (test-only) · `close()` (best-effort final flush, idempotent).
  - **CRUD:** `create(input)` (generates id, BEGIN → INSERT → writeBody → COMMIT → flush; ROLLBACK + best-effort `deleteBody` on any throw so we don't leak orphan body files per § 13.5) · `read(id)` (SELECT + readBody + strip frontmatter; returns `null` on miss, not throws) · `update(id, patch)` (parses id prefix and verifies stored type matches — throws `MemoryStoreError('type-immutable')` if not; shallow-merges payload patch; snapshots previous body to restore on rollback) · `list(type)` (prepared statement; `ORDER BY created_at DESC`; bodies NOT loaded — callers use `read(id)` for bodies).
  - **Graph:** `link(from, to, kind)` (INSERT OR IGNORE — idempotent) · `unlink` (DELETE — idempotent) · `walk(from, kind)` (JOIN memory_links → memory_entries; one-hop) · `backlinks(to, kind?)` (incoming-link rows; `kind` optional so CHUNK-14's release-evidence walker can enumerate everything pointing at an entry).
  - **Convenience:** `createIntent(rawIdea, projectTitle)` — builds the `IntentPayload` (RawIdea + null discovery) and delegates to `create()`. The single helper that lets CHUNK-01's `project.create` command persist via the store without leaking SQL knowledge into the command.
  - **Errors:** `MemoryStoreError` with typed `code` field (`not-found | invalid-id | type-immutable | flush-failed | migration-failed`). The store never shows notifications — callers handle.

- `bc4775a feat(extension): wire MemoryStore + persist project intent — CHUNK-03 Steps 10-11 (DOS:R3)`
  - `extension/src/memory/readmeTemplate.ts` — `renderDeliveryosReadme(projectName)` emits the `.deliveryos/README.md` content per § 8.
  - `extension/src/projectRegistry.ts` — adds `PersistedProjectRegistry implements IProjectRegistry` (backed by `MemoryStore`; `loadActive()` reads the most-recent Intent on bootstrap). `IProjectRegistry` now extends `vscode.Disposable` so both impls type-fit `context.subscriptions.push()`. `intentToRecord` helper for the IntentMemory → ProjectRecord projection.
  - `extension/src/commands/projectCreate.ts` — `ProjectCreateDeps` now takes `{ registry, memoryStore?, workspaceUri? }`. When the store is available the command calls `memoryStore.createIntent(trimmedName, trimmedName)` — the user-typed name becomes both the project title AND the raw idea text (CHUNK-05 will properly split these). On first create, writes `.deliveryos/README.md` if absent (`ensureReadme` — stat-then-write, swallows FileNotFound). Without a store (no workspace folder) the command keeps the CHUNK-01 in-memory path.
  - `extension/src/extension.ts` — `activate()` is now async. Picks `workspaceFolders[0]` per § 9 (multi-root is a known follow-up, § 13.6). Opens `MemoryStore` + `PersistedProjectRegistry`; on failure `showErrorMessage` + falls back to `InMemoryProjectRegistry` so the extension still activates. Pushes a dispose hook for `memoryStore.close()`. Initial `hasProject` context reflects whether `loadActive()` found an Intent on disk. `onDidChangeWorkspaceFolders` prompts "Reload" (vs. a full live-rebuild — punted for MVP).
  - `extension/package.json` — version `0.0.2` → `0.0.3` (memory persistence is a user-visible surface change).

- `e12ae45 test(memory): unit tests + tsx test runner — CHUNK-03 Step 9 (DOS:R3)`
  - **23 tests across 6 suites** — `npm test` (from `extension/`) runs in ~170ms.
  - `extension/test/vscode-stub.ts` — in-memory `vscode` shim covering `Uri.joinPath`, `workspace.fs.{readFile,writeFile,createDirectory,delete,stat}`, `FileSystemError`, `ExtensionContext`, `WorkspaceFolder`. Aliased into the `vscode` import slot via `extension/test/tsconfig.json`'s `compilerOptions.paths` so MemoryStore's body file writes land in a Map.
  - `extension/test/tsconfig.json` — extends `../tsconfig.json` with three path aliases: `vscode` → `./vscode-stub.ts`, `@deliveryos/contracts` + `/*` → `../../contracts/src/*.ts` (source). The contracts alias bypasses the package.json#exports map (which only declares `import` for ESM consumers; `tsx` resolves through CJS). Aliasing to source means tests run with zero build steps.
  - `extension/test/memory.test.ts` — 6 suites: **ids** (typed prefix + parseback + 100-unique-call entropy), **migration runner** (bootstrap from scratch + idempotent re-run + three indexes), **MemoryStore CRUD** (parameterised round-trip for all 9 MEMORY_TYPES + null-on-miss read + shallow-merge update + not-found rejection + list ordering), **MemoryStore links** (link/walk/backlinks round-trip + INSERT OR IGNORE idempotency + `LINK_KINDS` vocabulary integrity), **payload JSON edge cases** (fully-populated `RequirementPayload` round-trip).
  - `extension/package.json` + `test` script `tsx --tsconfig test/tsconfig.json --test test/*.test.ts`; `typecheck` script extended to typecheck the test tsconfig too. + `tsx ^4.22.3` devDep.

**Track-O carry-forward (1 commit, not a DOS:R3 commit):**

- `ee44636 docs(planning): fold DOS:R2 path-resolution decision into CHUNK-02 spec`
  - User-authored between-sessions inline edit to `docs/planning/chunks/chunk-02-webview-foundation.md` that landed the DOS:R2 carry-over "consider folding the resolution into the CHUNK-02 spec as a follow-up Track-O edit". Self-attributes inside the file as a DOS:O6 inline edit; landed without a formal Track-O session wrap so the DOS:R3 wrap could proceed against a clean tree.
  - Substance: path lookups now use `extension/dist/webview/...` directly (no `..` walk back to a sibling); added § 8 "Path resolution: extension/dist/webview" explaining why the `..`-walk only worked in F5 dev mode; updated § 11 edge-case note + § 14 acknowledged deviations.
  - No code change; aligns chunk-02 text with what already shipped in DOS:R2 commits.

**Manual smoke (CHUNK-03 § 11.1) — verified end-to-end:**

DOS:R3 opened `/tmp/deliveryos-smoke/` as a fresh workspace, installed `deliveryos-0.0.3.vsix`, and the user ran `deliveryos.project.create` with the input "Bug Triage Assistant". All 8 § 11.1 steps + the close-reopen persistence check passed:

- `.deliveryos/memory.sqlite` (36 KB) created on activation. `sqlite3 .schema` returned the three expected tables (`_schema_version`, `memory_entries`, `memory_links`) and three indexes (`idx_memory_entries_type`, `idx_memory_links_from`, `idx_memory_links_to`) exactly matching the schema.ts DDL. `_schema_version.v = 1`.
- `.deliveryos/memory/intent/intent-0fb46838.md` created with the 4-line frontmatter + body "Bug Triage Assistant".
- `.deliveryos/README.md` rendered with the project name.
- `memory_entries` row: `intent-0fb46838 | intent | Bug Triage Assistant | 2026-05-22 03:17:06`.
- `payload_json` deserialises to `{ rawIdea: { text: "Bug Triage Assistant", capturedAt: 1779419826869 }, discovery: null }` — a valid `IntentPayload`.
- Close + reopen `/tmp/deliveryos-smoke` → project loaded from disk via `PersistedProjectRegistry.loadActive`. No welcome view shown (because `loadActive()` set `hasProject` true during activation). User-confirmed.

**Deviation from the chunk spec to flag for next session:**

- **Contracts subpath imports.** The chunk spec describes `import { MemoryEntry } from '@deliveryos/contracts/memory'` as the canonical path. The webview workspace (with `moduleResolution: "Bundler"`) can use that subpath. The extension workspace (with legacy `moduleResolution: "Node"`) cannot — `Node` ignores `package.json#exports` and the bare-specifier subpath resolves through `node_modules/@deliveryos/contracts/memory.ts` which doesn't exist. Resolution: the extension imports from the bare `@deliveryos/contracts` barrel; the contracts package re-exports `memory` + `links` slices via its `src/index.ts`. Both consumers ultimately get the same types; the import-path constraint ("import from contracts, not from a local string" — § 5.5 walker note) is honoured either way. If a later chunk wants to switch the extension to `moduleResolution: "Bundler"` or `"Node16"`, the subpath imports become available transparently.

**Doc-hygiene + housekeeping in DOS:R3:**

- `README.md` repo-layout block updated: `projectRegistry.ts` caption now says "IProjectRegistry seam — InMemory + Persisted impls"; new `memory/` entry; new `test/` entry.
- `docs/BUILD-PLAN.md` Week 2 status: CHUNK-03 ticked done; CHUNK-04 deferred to DOS:R4.

**Carry-overs for DOS:R4 (next session):**

- **CHUNK-04 — Multi-editor sideload + GitHub Release scaffold.** Sideload smoke into Cursor / Windsurf / VSCodium / Antigravity, install scripts, GitHub Actions wiring, version-check notification, plus a `scripts/check-vsix-size.js` that fails the build if `.vsix > 5 MB` (suggested in CHUNK-03 § 11.3 — "nice-to-have CI assertion, defer to CHUNK-04"). Also folds the `deliveryos.openHello` command behind a `deliveryos.devMode` `when` clause so it's not user-facing. Phase 0 demoable state lands here: "installed in VS Code AND Cursor from the same file." Effort: 1–2 session-days. Spec: [docs/planning/chunks/chunk-04-multi-editor-verify.md](../planning/chunks/chunk-04-multi-editor-verify.md).
- **Two CHUNK-02 § 10.2 unit tests still pending:** `htmlFactory.test.ts` (nonces differ across two calls + CSP directives + asset URI rewrite) + `nonce.test.ts` (24-byte base64url + 100 unique calls). DOS:R3 set up the `tsx + node:test` runner so these are now plug-and-play — should land alongside CHUNK-04. The current runner is wired only against `src/memory/**` in `test/tsconfig.json`'s `include`; when these CHUNK-02 tests land, widen the `include` to cover `src/webview/**` too.
- **Multi-root workspace support.** MVP picks `workspaceFolders[0]` (CHUNK-03 § 13.6). `onDidChangeWorkspaceFolders` currently prompts "Reload" rather than rebuilding the store live. Revisit if dogfooding hits it.
- **Future tuning seam — `SqlJsHost.flush()` (CHUNK-03 § 12.3).** Current strategy: flush-per-mutation. Tripwire: if `MemoryStore.create()` ever exceeds 100 ms in dogfooding, drop in a debounced `scheduleFlush(250ms)`. Not blocking; just a tripwire to remember.
- **CHUNK-03 open questions for next planning pass (§ 13.9):** runtime Zod validation on `payload_json` read; whether to default `memory.sqlite` to gitignored; whether the rebuild-from-markdown command earns a chunk slot. None are blockers — defer to a Track-O session when the question becomes pressing.

**Not done this session (deferred to later R sessions or chunks):**

- CHUNK-04 (multi-editor sideload + GitHub Release scaffold).
- Specialist roles, PRD editor, Discovery panel, Brief composer, etc. (CHUNK-05+).
- ESLint / Prettier wiring (still deferred; not in CHUNK-04).
- Manual webview round-trip verification carried from DOS:R2 (user needs to reload VS Code post-wrap and run **DeliveryOS: Open Hello** + open Webview DevTools to confirm zero CSP errors per CHUNK-02 § 10.1).

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
