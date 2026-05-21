# History — track R (Development)

Older "what just landed" sections from docs/build/BUILD_STATUS.md, newest on top.

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
