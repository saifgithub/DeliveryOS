# Handover — Development (DOS:R)

**Last updated:** 2026-05-22 (end of DOS:R4 — CHUNK-04 code complete: `scripts/install.sh` + `scripts/install.ps1` + `.github/workflows/release.yml` + `RELEASE_NOTES.md` stub + `extension/src/updater/` (`types.ts` + `helpers.ts` + `checkForUpdates.ts`) + `deliveryos.checkForUpdates` setting + `void checkForUpdates(context)` wired into `activate()` + `## Install` README section + 0.0.3 → 0.0.4 version bump. Also CHUNK-02 § 10.2: `nonce.test.ts` + `htmlFactory.test.ts` landed via `__resetManifestCache` testability seam + `Webview` stub. 38 tests passing. Manual cross-editor smoke (§ 11.5) and `v0.0.1` tag push (§ 11.3 + § 11.4) deferred to DOS:R5 alongside GH owner finalisation.)

Read this file **first** when starting a new Development session (`/start-fresh R`).

---

## What's on disk + what's running

| Field | Value |
| --- | --- |
| Commits on `main` | 37 (will be 38 after this wrap commit lands) |
| HEAD | _will be_ the DOS:R4 wrap commit on top of `577b577 docs(readme): install section — CHUNK-04 § 3.8 / § 9 (DOS:R4)`. The DOS:R4 substantive landings are `a358c72` (CHUNK-02 § 10.2 webview tests + test/tsconfig rootDir fix) → `32e17dd` (install.sh + install.ps1) → `57e6872` (release.yml + RELEASE_NOTES.md) → `e7ff6c4` (updater module + setting + wire-in + 10 helper tests, v0.0.4) → `577b577` (README ## Install section). |
| Tags | none yet (planned: `v0.0.1` in DOS:R5; `v0.1.0` at CHUNK-16) |
| Tests | **38 passing** (extension/test/{memory,nonce,htmlFactory,updater}.test.ts — 10 suites: ids · migration runner · MemoryStore CRUD · MemoryStore links · payload JSON · renderPanelHtml · nonce · parseOwnerRepo · isNewer · payload-JSON edge cases). `npm test` from `extension/` runs `tsx --tsconfig test/tsconfig.json --test test/*.test.ts` in ~190 ms. `npm run typecheck` green (DOS:R4 widened `test/tsconfig.json#rootDir` from `..` to `../..` so contracts source files typecheck cleanly — was failing on DOS:R3's HEAD with TS6059, fixed in the same commit as the new tests). |
| Bugs ([docs/build/bugs.json](bugs.json)) | 0 |
| Open chunk | CHUNK-04 🟡 **code complete; verification carries to DOS:R5.** What remains: (a) manual cross-editor smoke across VS Code + Cursor + Antigravity (DOS:R4 only installed locally into the two editors that were on this machine — Cursor isn't installed at `/Applications/Cursor.app`); (b) push `v0.0.1` tag to verify the release workflow + `SHA256SUMS.txt` generation; (c) tag `v0.0.2` (version-bump-only) to verify the upgrade-notification e2e fires against the v0.0.1 install. CHUNK-05 onwards is sequential after CHUNK-04 closes. |
| Phase | Phase 0 / Week 2 second half (BUILD-PLAN week of 2026-06-01 — running ~10 days ahead) |
| Build artefact | `extension/deliveryos-0.0.4.vsix` (404.42 KB; 14 files including `dist/extension.js` (esbuild-bundled, 131 KB, includes `vscode-messenger` + `sql.js` JS glue + new `src/updater/` modules), `dist/sql-wasm.wasm` (644 KB), `dist/webview/{assets/hello-*.{js,css}, .vite/manifest.json, src/panels/hello/index.html}`, `LICENSE.txt`, `readme.md`, `media/*`, `test/tsconfig.json` (0.38 KB leak from `.vscodeignore` — not excluding `test/` — left alone since under budget)). |
| Install state | `deliveryos.deliveryos@0.0.4` installed locally into VS Code AND Antigravity via `scripts/install.sh extension/deliveryos-0.0.4.vsix` (with `code` + `antigravity` transiently added to PATH). Cursor NOT installed on this dev box — needs to be installed before DOS:R5's § 11.5 cross-editor smoke can pass the chunk-04 done-when bar. |
| Activation | ✅ extension loads in 0.0.4 form — the new `void checkForUpdates(context)` line in `activate()` was typecheck-verified; not exercised live yet because no GitHub release exists at the `deliveryos/deliveryos` coordinate. DOS:R5's § 11.4 walk verifies the notification end-to-end. |
| Sanity checks (config) | working-tree-clean ✅ · scaffold-state ✅ · lint (soft) ⚠ "Missing script" — expected; ESLint/Prettier still not wired. |
| Toolchain | Node v25.2.1 · npm 11.6.2 · `@vscode/vsce` ^3 · `typescript` ^5.5 · `@types/vscode` ^1.85 · `vite` ^5.4 · `tailwindcss` ^3.4 · `react` ^18.3 · `esbuild` ^0.24 · `vscode-messenger` ^0.4.5 · `sql.js` ^1.10.3 · `@types/sql.js` ^1.4.9 · `tsx` ^4.22.3 (test runner) |
| Repo layout | npm workspaces: `extension/` (the published deliveryos extension; now includes `src/memory/` + `src/updater/` + `src/webview/` + `test/`) + `webview/` (`@deliveryos/webview`, Vite + React + Tailwind) + `contracts/` (`@deliveryos/contracts`, type-only). Root `tsconfig.base.json` + `scripts/build.mjs` orchestrator + **new `scripts/install.sh` + `scripts/install.ps1`** (cross-platform sideload scripts) + **new `.github/workflows/release.yml`** (tag-driven release pipeline) + **new `RELEASE_NOTES.md`** (release-body source). |
| VS Code CLI | `/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code` (no `code` on `$PATH`; use full path or alias) |
| Antigravity CLI | `/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity` (DOS:R4 surprise data point — chunk-04 § 12.1 worried this path was unknown; it's the standard Code-OSS layout). Cursor still not on PATH because not installed at `/Applications/Cursor.app`. |
| Tracks configured | O (Documentation) · R (Development) · P (Project Management). |

---

## What just landed (this session — DOS:R4)

DOS:R4 landed **CHUNK-04 code-complete** plus the two pending **CHUNK-02 § 10.2 webview unit tests**. 5 substantive commits + this wrap commit. CHUNK-04 done-when is partially met — code-side checkboxes are ticked but the manual cross-editor smoke and the release-tagging verification (§ 11.3 + § 11.4) defer to DOS:R5 per the session-entry user call.

**CHUNK-02 § 10.2 webview tests (1 commit):**

- `a358c72 test(webview): nonce.test.ts + htmlFactory.test.ts — CHUNK-02 § 10.2 (DOS:R4)`
  - `extension/test/nonce.test.ts` — 2 tests: 32-char base64url shape + 100-call uniqueness.
  - `extension/test/htmlFactory.test.ts` — 3 tests: full HTML render (title + css link + script tag with 32-char nonce + CSP meta with `script-src 'nonce-...'` + `default-src 'none'` + configurable cspSource); two-call different-nonce assertion; missing-entry path throws the expected vite-manifest error message.
  - `extension/src/webview/htmlFactory.ts` — added a tiny `__resetManifestCache()` test-only helper (5 lines, no runtime cost; `__` prefix discourages accidental call from production code). Lets successive test calls each exercise a fresh manifest load + fresh nonce.
  - `extension/test/vscode-stub.ts` — extended with a `Webview` interface + `__makeStubWebview()` factory (mirrors the existing `__resetVscodeStub` helper pattern).
  - `extension/test/htmlFactory.test.ts` materialises a real `dist/webview/.vite/manifest.json` under `os.tmpdir()` because `renderPanelHtml` reads the manifest via `node:fs/promises.readFile(manifestUri.fsPath)`, not via the vscode workspace.fs surface that the stub covers.
  - **Spec deviation** flagged in commit: instead of widening `test/tsconfig.json#include` to add `../src/webview/**` as the chunk-03 carry-over note suggested, the new test files' imports drag in the webview source naturally — keeps the stub surface minimal (no ViewColumn / window / WebviewPanel needed).
  - **Pre-existing typecheck regression fixed in the same edit:** `test/tsconfig.json#rootDir` was `..` (extension/) which excluded `contracts/src/*` and made `npm run typecheck` fail with TS6059 on DOS:R3's HEAD. Widened to `../..` (monorepo root). `npm test` was unaffected (tsx ignores rootDir for execution).

**CHUNK-04 (4 commits, in spec § 3 order):**

- `32e17dd feat(install): cross-platform install scripts — CHUNK-04 § 3.1-3.2 (DOS:R4)`
  - `scripts/install.sh` (POSIX shell, `set -eu`, ShellCheck-friendly) + `scripts/install.ps1` (PowerShell 5.1+ / 7+) sideload the highest-versioned `deliveryos-*.vsix` into every detected editor CLI in `{code, cursor, windsurf, codium, antigravity}`. Both always pass `--force` so re-runs are idempotent; both support `--verbose`; both fall back to looking inside `extension/` for the .vsix when the repo root doesn't have one (dev layout).
  - Exit codes per § 4.3: 0 = at least one OK (or zero detected: warning only); 1 = every detected editor failed; 2 = bad `<path-to-vsix>` arg.
  - Summary block per § 4.5 — one row per editor with status + version.
  - **Local verification on macOS:** bad-path arg → exit 2; no editors on PATH → exit 0 + warning; `code` + `antigravity` on PATH (transient PATH extension) → both install successfully; idempotent re-run reports identical OK/OK rows; unknown flag → exit 2 + usage; `--help` → usage + exit 0.
  - **Surprising data point for CHUNK-04 § 12.1:** Antigravity's CLI is at the standard `/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity` path (not unknown as the spec worried).

- `57e6872 ci(release): GitHub Actions release workflow — CHUNK-04 § 3.3 (DOS:R4)`
  - `.github/workflows/release.yml` triggers on `v*` tag push: checkout → setup-node@v4 (Node 20, npm cache) → `npm ci` → `npm run build` → `vsce package --no-dependencies --out ../deliveryos-<version>.vsix` from `extension/` → `sha256sum` over `{vsix, install.sh, install.ps1, demo.mp4?}` → pre-flight RELEASE_NOTES.md check (generates a one-line default if missing) → `gh release create $TAG <all assets> --notes-file RELEASE_NOTES.md` (permissions: `contents: write`).
  - `RELEASE_NOTES.md` lands as a Phase-0 stub per § 15 done-when fallback (v0.0.1 paragraph + curl one-liner + `shasum -a 256 -c SHA256SUMS.txt`). CHUNK-16 expands for v0.1.0.
  - Workflow is **NOT exercised this session** — its acceptance test (§ 11.3) is the v0.0.1 tag push deferred to DOS:R5.

- `e7ff6c4 feat(updater): GitHub Releases version check — CHUNK-04 § 3.4-3.7 (DOS:R4)`
  - `extension/src/updater/types.ts` — `LatestReleaseResponse`, `UpdateCheckResult`, `UpdateAction`. Types-only.
  - `extension/src/updater/helpers.ts` — `parseOwnerRepo(url)`, `isNewer(latest, current)`, + internal `parseSemver`. Pure functions; **extracted from `checkForUpdates.ts` so unit tests don't drag the full vscode-using module into the test typecheck graph** (the test-time stub doesn't cover `window`, `env`, `ConfigurationTarget`, `Uri.parse`, `globalState`, `extension.packageJSON`; keeping the helpers separate dodges the stub expansion).
  - `extension/src/updater/checkForUpdates.ts` — single fire-and-forget `Promise<void>` call from `activate()`. Reads `deliveryos.checkForUpdates` (early-return if false), parses `repository.url`, fetches `api.github.com/repos/<owner>/<repo>/releases/latest` with Accept + X-GitHub-Api-Version + User-Agent headers, `redirect: 'follow'`, 5-second `AbortController` timeout. Any non-200, parse failure, or thrown error is silent no-op per § 6.6. On a newer tag: `showInformationMessage` with two actions; "Open release page" → `env.openExternal`; "Don't show again" → `getConfiguration.update(..., Global)`. Persists `globalState['deliveryos.lastSeenReleaseTag']` so the same upgrade doesn't re-prompt across activations until a yet-newer release exists.
  - `extension/package.json` — version `0.0.3 → 0.0.4` (new user-facing setting + new fire-and-forget network call on activation). Adds `contributes.configuration.deliveryos.checkForUpdates` (boolean, default true).
  - `extension/src/extension.ts` — imports `checkForUpdates` and calls `void checkForUpdates(context)` as the last line of `activate()`, after all registrations + the `onDidChangeWorkspaceFolders` listener. Never awaited.
  - `extension/test/updater.test.ts` — 10 unit tests across two suites (parseOwnerRepo: 4 cases; isNewer: 6 cases — patch/minor/major/equal/pre-release/missing-parts). **38 tests passing now**, up from 28 after CHUNK-02 § 10.2.

- `577b577 docs(readme): install section — CHUNK-04 § 3.8 / § 9 (DOS:R4)`
  - `README.md` — new top-level `## Install` section between `## Delivery` and `## Repo layout` per chunk-04 § 9 (verbatim). Includes: curl-pipe-to-sh + iwr-pipe-to-iex one-liners; manual `--install-extension --force` matrix for all five editors; SHA-256 verification block; "Why SHA-256?" framing (research finding #3); updates subsection pointing at `deliveryos.checkForUpdates`; troubleshooting block (CLI not on PATH, activity-bar reload, Antigravity standard path, GitHub rate-limit).
  - GH coordinate hardcoded as `deliveryos/deliveryos` to match `extension/package.json#repository.url`. **DOS:R5 confirms or rewrites mechanically** once the GitHub owner is locked in — three files would need the same rename: this `## Install` section, `RELEASE_NOTES.md`, and `extension/package.json#repository.url`.
  - Two adjacent doc-hygiene fixes in the same commit: bumped the "Getting started" example from `deliveryos-0.0.2.vsix` → `deliveryos-0.0.4.vsix`; rewrote the stale "Known limitations" note that promised `deliveryos.openHello` would be hidden behind `deliveryos.devMode` in CHUNK-04 — the chunk spec doesn't include that change, so the note now correctly says the deferral lands after Phase 0.

**Spec deviations from the chunk-04 spec that DOS:R4 ships but didn't:**

- **No `scripts/check-vsix-size.js`.** The DOS:R3 BUILD_STATUS carry-over note suggested this as a CI tripwire ("fail if `.vsix > 5 MB`"). The chunk-04 spec itself doesn't include it — and the 0.0.4 vsix lands at 404 KB, well under budget. Defer until a chunk genuinely needs it.
- **No `deliveryos.openHello` `when`-clause hide.** Same situation: DOS:R3 BUILD_STATUS promised it, chunk-04 spec doesn't. The command stays visible. Hiding it deserves its own chunk slot once it actually matters.

**Local pre-flight done for DOS:R5's manual smoke:**

DOS:R4 installed `deliveryos-0.0.4.vsix` into VS Code AND Antigravity locally via `scripts/install.sh`. Both report `deliveryos.deliveryos@0.0.4` in `--list-extensions --show-versions`. Cursor is NOT installed at `/Applications/Cursor.app` on this dev box — **DOS:R5's first task is to install Cursor (or locate where it lives on this machine) before walking the chunk-04 § 11.5 rehearsal checklist**.

**Carry-overs for DOS:R5 (next session):**

- **CHUNK-04 § 11.5 manual cross-editor smoke.** Walk the 8-sub-check Phase 0 rehearsal checklist in VS Code (REQUIRED) + Cursor (REQUIRED) + Antigravity. Activity-bar icon · stage tree order · `deliveryos.project.create` · welcome-view disappears · `deliveryos.openHello` zero CSP errors · `.deliveryos/memory.sqlite` + intent body materialise · close-reopen restores · sig-warn observation row. Use a fresh `/tmp/deliveryos-smoke-r4-final/` workspace.
- **CHUNK-04 § 11.3 release-flow verification.** `git tag v0.0.1 && git push origin v0.0.1`. Watch `.github/workflows/release.yml` run in the Actions tab. Verify the release page has the `.vsix` + install scripts + `SHA256SUMS.txt`. `shasum -a 256 -c SHA256SUMS.txt` locally to confirm.
- **CHUNK-04 § 11.4 in-extension version-check e2e.** After v0.0.1 ships, tag `v0.0.2` (version bump only, no code changes) → push → wait for workflow. The v0.0.1 install in any of the smoked editors should fire the notification on next activation. Click "Open release page" — opens the right URL. "Don't show again" → setting flips to false. Reload window → no notification. Reset setting back to true → no notification for same version.
- **GitHub owner finalisation.** Lock in `deliveryos/deliveryos` vs swap to `saifulmazli/deliveryos` (or other). If owner changes, three files need a mechanical rewrite: `README.md` `## Install` section, `RELEASE_NOTES.md`, `extension/package.json#repository.url`. The updater + install scripts derive automatically from `package.json#repository.url`.
- **Cursor install.** Install Cursor before § 11.5 smoke. Confirm CLI path matches `/Applications/Cursor.app/Contents/Resources/app/bin/cursor` so the install script's `command -v cursor` probe works.
- **Two CHUNK-03 / CHUNK-04 tripwires unchanged from DOS:R3:**
  - **Multi-root workspace support.** MVP picks `workspaceFolders[0]` (CHUNK-03 § 13.6). Revisit if dogfooding hits it.
  - **`SqlJsHost.flush()` debounce.** Current strategy: flush-per-mutation. Tripwire: if `MemoryStore.create()` ever exceeds 100 ms in dogfooding, drop in a debounced `scheduleFlush(250 ms)`.
- **Track-O open questions (CHUNK-03 § 13.9).** Runtime Zod validation on `payload_json` read; whether to default `memory.sqlite` to gitignored; whether the rebuild-from-markdown command earns a chunk slot. None blocking — defer to a Track-O session.

**Not done this session (deferred to later R sessions or chunks):**

- The three carry-overs above that constitute "CHUNK-04 done".
- Specialist roles, PRD editor, Discovery panel, Brief composer, etc. (CHUNK-05+).
- ESLint / Prettier wiring.

---

## How to start the next session

`/start-fresh R`

Session name to use: **DOS:R5**

DOS:R5 is **CHUNK-04 close-out** — three carry-overs (§ 11.3 + § 11.4 + § 11.5) plus the GH owner finalisation. None require new TS code unless the smoke uncovers a regression; the work is verification + git tagging + a mechanical README/RELEASE_NOTES rewrite if the owner changes. Effort estimate: 1 short session-day.

**Pre-flight reminder for DOS:R5:**

- The `.claude/session-config.yml` R-track sanity check passes cleanly.
- `npm run build` (from repo root) produces `extension/deliveryos-0.0.4.vsix` (~404 KB) — re-run if the working tree changed since DOS:R4.
- `npm test` (from `extension/`) runs the 38-test suite via `tsx + node:test` in ~190 ms.
- `npm run typecheck` is green as of DOS:R4 (the rootDir widening fix). If it goes red, the test/tsconfig.json `rootDir: "../.."` or `paths` block is the first place to look.
- DOS:R4 left `deliveryos.deliveryos@0.0.4` installed in VS Code + Antigravity locally. Cursor needs to be installed before § 11.5 smoke.
- The cross-chunk contracts table in [docs/planning/chunks/README.md § "Cross-chunk contracts"](../planning/chunks/README.md) is the canonical owners reference — CHUNK-04 doesn't redefine memory or webview surfaces.
- The GitHub coordinate is currently `deliveryos/deliveryos` in `README.md`, `RELEASE_NOTES.md`, and `extension/package.json`. Lock the owner before pushing the v0.0.1 tag.
