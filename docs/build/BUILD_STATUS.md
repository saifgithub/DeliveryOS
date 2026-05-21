# Handover — Development (DOS:R)

**Last updated:** 2026-05-21 (end of DOS:R1 — CHUNK-01 steps 1–3 scaffold landed; first `.vsix` produced and verified activating)

Read this file **first** when starting a new Development session (`/start-fresh R`).

---

## What's on disk + what's running

| Field | Value |
|---|---|
| Commits on `main` | 10 |
| HEAD | `e83940d feat(scaffold): scaffold DeliveryOS extension v0.0.1 — CHUNK-01 steps 1–3 (DOS:R1)` |
| Tags | none yet (planned: `v0.1.0` at CHUNK-16) |
| Tests | none yet (per CHUNK-01 spec § 8 — manual smoke only at this layer) |
| Bugs ([docs/build/bugs.json](docs/build/bugs.json)) | 0 |
| Open chunk | **CHUNK-01** — partial: steps 1–3 of 13 landed; steps 4–13 remain |
| Phase | Phase 0 / Week 1 (BUILD-PLAN week of 2026-05-25 — started 4 days early) |
| Build artefact | `deliveryos-0.0.1.vsix` (3.79 KB; `dist/extension.js` + `package.json` + `readme.md` only) |
| Install state | Installed locally as `deliveryos.deliveryos@0.0.1` (verified `~/.vscode/extensions/deliveryos.deliveryos-0.0.1`) |
| Activation | ✅ `ExtensionService#_doActivateExtension deliveryos.deliveryos, activationEvent: 'onStartupFinished'` (no errors in `exthost.log`) |
| Sanity checks (config) | working-tree-clean ✅ · scaffold-state (`src/`, `package.json`) ✅ · lint (soft) ⚠ "not yet wired" — expected pre-CHUNK-04 |
| Toolchain | Node v25.2.1 · npm 11.6.2 · `@vscode/vsce` ^3 · `typescript` ^5.4 · `@types/vscode` ^1.85 |
| VS Code CLI | `/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code` (no `code` on `$PATH`; use full path or alias) |

---

## What just landed (this session — DOS:R1)

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

---

## How to start the next session

`/start-fresh R`

Session name to use: **DOS:R2**

DOS:R2 picks up CHUNK-01 at step 4 (activity-bar icon + empty tree view) and ideally lands through step 6 (static stages + capabilities block). The full chunk spec — file paths, exact `package.json` contributions, code sketches — lives at [docs/planning/chunks/chunk-01-scaffold.md](../planning/chunks/chunk-01-scaffold.md). Per-chunk implementation order: `media/icon-rocket.svg` → `package.json` contributes block (`viewsContainers.activitybar`, `views`) → `src/stages/stageDefinitions.ts` + `src/stages/stageTreeNodes.ts` + `src/stages/stageTreeProvider.ts` → wire `vscode.window.createTreeView` in `src/extension.ts`'s `activate()` → repackage → reinstall → confirm rocket icon + four stage rows render.

The cross-chunk contracts table in [docs/planning/chunks/README.md § "Cross-chunk contracts"](../planning/chunks/README.md) is the canonical reference for owners — no chunk redefines another's surface. CHUNK-01 owns the `IProjectRegistry` / `ProjectRecord` / `StageTreeNode` triplet (chunk spec § 3) and the build pipeline; CHUNK-02 owns the monorepo split (`extension/`, `webview/`, `contracts/`) — DOS:R2 stays in the flat layout.

**Pre-flight reminder for DOS:R2:** running `npm run package` after editing only `package.json` (no TS source changes) still re-runs `tsc` because the `package` script chains through `compile`. That's intended — keep the script chain as-is.
