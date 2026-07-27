<!--
CHUNK_LEDGER.md — replaces docs/build/BUILD_STATUS.md (retired 2026-07-27 along with the
  /sm-handover session-wrap ritual it was named for). This file is NOT a session-handover doc —
  session-boundary continuity is /sm-checkpoint SAVE/RESTORE (docs/MULTI_AGENT_BUILD_PROCESS.md §12).
  It is Architect-owned build state for the MABP chunk cycle: what's shipped, what's on disk, what's
  in flight. Not derived from the orchestration/ dispatch protocol — DeliveryOS's chunk-by-chunk MABP
  loop is not wired to dispatch lanes (orchestration/dispatch/BINDINGS.md: "no lanes dispatched yet"),
  so this table is legitimate single-owner state, not a second copy of something the protocol derives.
  If that changes — chunks start running through orchestration/dispatch/lanes/ — this table should be
  replaced by `sh orchestration/dispatch/dispatch.sh state`, not kept alongside it.
  Structural debt and cohesion-check findings are NOT recorded here — see
  docs/build/STRUCTURAL_DEBT.md and docs/build/COHESION_LOG.md.
-->

# Chunk ledger — Development (DOS:R)

> ⚠️ **CURRENT-STATE CORRECTION (updated 2026-06-25).** This banner is the live current-state;
> the table below is frozen at end-of-DOS:R16 (CHUNK-11) and is historical.
>
> **v0.1.0 — complete & committed.** CHUNK-12→16 all landed (commits `25a78ae` result-capture ·
> `e15b061` diff+hook · `d147b81` verification+release · `787d936` bug-triage demo ·
> `e1cf862` README/essay/release-prep); all 16 chunks done, `extension/deliveryos-0.1.0.vsix`
> packaged, `npm run gate` GREEN at the v0.1.0 commit. Lifecycle shipped **5** stages
> (DISCOVER · DEFINE · EXECUTE · VERIFY · ITERATE).
>
> **v0.2.0 — in flight (uncommitted working tree).** UAT + DEPLOY added as first-class stages
> → **7 stages** (DISCOVER · DEFINE · EXECUTE · VERIFY · **UAT** · **DEPLOY** · ITERATE): contracts
> (`contracts/src/{uat,deployment}.ts`), webview panels, serializers, and MemoryStore CRUD are wired,
> with **473 tests passing** (`npm test`, 124 suites). Not yet committed or `npm run gate`-verified.
>
> **Before a clean v0.1.0 GitHub Release:** finish cross-editor UAT (b002 Cursor, b003 version-check —
> see [chunk-04-test-results.md](../planning/chunks/chunk-04-test-results.md)) and decide
> **repo visibility** (still PRIVATE → updater 404s + install one-liner 404s for end users).

**Last updated:** 2026-05-24 (end of DOS:R16 — CHUNK-11 complete · Phase 2 Week 9 closed · Phase 2 complete; file handoff + terminal integration + result watcher shipped end-to-end across Days 1–4; +48 tests, 292 total; 4 substantive commits). Narrative in [`history/DOS_R0016.md`](history/DOS_R0016.md).

---

## What's on disk + what's running

| Field | Value |
| --- | --- |
| Commits on `main` | **95** (94 substantive + 1 wrap — this wrap commit will be commit 96). DOS:R16 added 4 substantive commits on `main`. |
| HEAD | `32ef269 docs(handoff): CHUNK-11 Day 4 — polish + status bumps (DOS:R16)` — will be superseded by the DOS:R16 wrap commit. |
| Tags | **`v0.0.1` + `v0.0.2`** (both pushed to `origin`; both releases live on the now-private <https://github.com/saifgithub/DeliveryOS/releases>). v0.0.1 hash: `b641d0d`; v0.0.2 hash: `1e54cdf`. Next planned tag: `v0.1.0` at CHUNK-16. |
| Tests | **292 passing** (extension/test/{memory,nonce,htmlFactory,updater,promptBuilder,answersParser,prd,requirements,testDesigner,briefMarkdown,briefValidator,briefBuilder,handoffSiblings,managedBlock,profilesRender,profilesSuggestedUpdates,handoffPaths,handoffGitignore,handoffWriter,handoffTerminalLauncher,handoffResultWatcher}.test.ts — 85 suites). `npm test` from `extension/` runs `tsx --tsconfig test/tsconfig.json --test test/*.test.ts` in ~500 ms. `npm run typecheck` green for both `extension/` and `webview/`. DOS:R16 added 48 new tests across 5 new test files: `handoffPaths.test.ts` (14 — HANDOFF_DIR dotfile form + CURRENT_* nesting + URI factories joining + history brief/result URIs include timestamp + historyTimestamp YYYYMMDDTHHmmssZ shape + padding + Windows-safe (no colons / hyphens / spaces) + lexical sort matches chronology + parseHistoryTimestamp round-trip + malformed-input returns null), `handoffGitignore.test.ts` (11 — buildGitignoreBlock determinism + canonical 5+2 rules + gitignoreState absent/append-block/matching/differs verdicts + applyGitignoreBlock creates fresh / appends with blank-line separator / idempotent / replaces on hand-edit / preserves outside-block content), `handoffWriter.test.ts` (7 — creates all 5 current-* files at canonical paths + history snapshot byte-matches current brief + .gitkeep on first run only + .deliveryos.tmp not left behind + does NOT create result.md upfront + subsequent writes overwrite current-* / refresh history + dirs created idempotently), `handoffTerminalLauncher.test.ts` (9 — shellQuote leaves safe paths unquoted / wraps spaces in single quotes / escapes embedded `'` via POSIX `'\''` trick + buildCommand for Claude Code substitutes ${BRIEF_PATH}/${RESULT_PATH} + quotes paths with spaces + Codex `exec -o ...` shape + per-profile loop asserts no unsubstituted placeholders), `handoffResultWatcher.test.ts` (7 — debounce collapses two events within 250ms + emits twice outside debounce window + content-hash dedup suppresses identical-content emits + emits when bytes change + registerExpectedHandoff carries metadata + falls back to most-recent history brief by lexical sort + stops emitting after dispose). |
| Bugs ([docs/build/bugs.json](bugs.json)) | **4 bugs** (unchanged this session). b001 + b004 → `pending_review` on `main`. b002 (Cursor smoke) + b003 (Phase E live walk) still `open` — accepted by user fiat at start of DOS:R6. None block scheduling. |
| Open chunk | **CHUNK-12** (next — Result Capture; Phase 3 Week 10). **CHUNK-11 fully closed DOS:R16**: Day 1 ✅ `47cd507` + Day 2 ✅ `03a3bce` + Day 3 ✅ `502546c` + Day 4 ✅ `32ef269`. Manual smoke (CHUNK-11 spec § 8 end-to-end against real `claude` + `codex` binaries) is a carry-over — user-driven, non-blocking CHUNK-12. |
| Phase | **Phase 2 closed (Week 9 complete · Phase 2 complete).** Phase 1 closed DOS:R13; CHUNK-09 (Phase 2 Week 7) closed DOS:R14; CHUNK-10 (Phase 2 Week 8) closed DOS:R15; CHUNK-11 (Phase 2 Week 9) closes DOS:R16. Running ahead of BUILD-PLAN's 2026-07-20 Week 9 nominal start — now ahead by **~8 weeks**. DOS:R16 ran 2026-05-24. **Phase 2 demoable state achieved**: "Generate a brief, click a button, Claude Code runs in the same window against the brief." |
| Build artefact | `extension/deliveryos-0.0.2.vsix` (~415 KB; unchanged — no version bump this session). `npm run build` from repo root produces `dist/extension.js` (**367.8 KB** — up from 342.7 KB; CHUNK-11 handoff host modules + crypto/path imports bundled) + `webview/dist/assets/brief-composer-*.js` (**34.26 KB** / **11.50 KB gzip** — up from 31.74 KB / 10.82 KB; +2.5 KB / +0.7 KB for RunHarnessButtons + 4 handoff notification subscriptions) + `requirements-*.js` (~17 KB / ~4.2 KB gzip) + `test-designer-*.js` (~11.2 KB / ~3.6 KB gzip) + `requirements-decompose-*.js` (~8.7 KB / ~2.8 KB gzip) + `prd-editor-*.js` (~10.4 KB / ~3.4 KB gzip) + `discover-*.js` (~15.8 KB / ~4.8 KB gzip) + `hello-*.js` (~1.1 KB) + shared `messenger-*.js` (~148.4 KB / ~47.6 KB gzip). All within 200 KB gzip spec target. |
| GH repository | **`https://github.com/saifgithub/DeliveryOS`** — **PRIVATE (flipped DOS:R7).** Updater fails closed silently against the unauth API call. |
| Install state | **v0.0.1** still installed locally in **VS Code + Cursor** (unchanged from DOS:R5). Antigravity stuck at v0.0.4. |
| Activation | ✅ extension loads in v0.0.1 form (unchanged since DOS:R5 — no version bump this session). DOS:R16's handoff UI changes are in the dev build (F5) but won't appear in installed v0.0.1 until next package + sideload. |
| Sanity checks (config) | working-tree-clean ✅ · scaffold-state ✅ (DOS:R16 added `extension/src/handoff/` (5 source files + index barrel + README) + `webview/src/panels/brief-composer/RunHarnessButtons.tsx` + `contracts/src/handoff.ts` + 5 new test files) · lint (soft) ⚠ "not yet wired" — expected; ESLint/Prettier still deferred. |
| Toolchain | Node v25.2.1 · npm 11.6.2 · `@vscode/vsce` ^3 · `typescript` ^5.5 · `@types/vscode` ^1.85 · `vite` ^5.4 · `tailwindcss` ^3.4 · `react` ^18.3 · `esbuild` ^0.24 · `vscode-messenger` ^0.4.5 · `sql.js` ^1.10.3 · `@types/sql.js` ^1.4.9 · `picomatch` ^2.3.2 · `@types/picomatch` ^2.3.4 · `tsx` ^4.22.3 · `@radix-ui/react-{tabs,accordion,toast,scroll-area,collapsible,radio-group}` ^1.1–1.2 + `lucide-react` ^0.460 (webview) · `markdown-it` ^14 + `@types/markdown-it` ^14 (webview) · `diff` ^5.2.0 + `@types/diff` ^5.2.0 (webview unified-diff renderer) · `@radix-ui/react-radio-group` ^1.2.0 (profile picker). **No new deps DOS:R16** — handoff modules use node's built-in `crypto` + `path` + the existing `vscode` surface only. Release workflow uses Node 22 + `actions/checkout@v5` + `actions/setup-node@v5` post-b004. |
| Repo layout | npm workspaces: `extension/` (`src/memory/` + `src/updater/` + `src/webview/` + `src/discovery/` + `src/prd/` + `src/requirements/` + `src/specialists/testDesigner/` + `src/brief/` + `src/profiles/` + **`src/handoff/`** (new DOS:R16: `paths.ts` + `writer.ts` + `terminalLauncher.ts` + `resultWatcher.ts` + `gitignoreTemplate.ts` + `README.md` code-level cross-chunk consumer note) + `src/serializers/` + `src/commands/` + `src/tree/` + `test/` (**`test/handoff{Paths,Gitignore,Writer,TerminalLauncher,ResultWatcher}.test.ts`** new)) + `webview/` (`src/panels/hello/` + `src/panels/discover/` + `src/panels/prd-editor/` + `src/panels/requirements/` + `src/panels/requirements-decompose/` + `src/panels/test-designer/` + `src/panels/brief-composer/` (**+1 new file DOS:R16: `RunHarnessButtons.tsx`**)) + `contracts/` (**`src/handoff.ts`** new DOS:R16 — 3 RequestTypes + 4 NotificationTypes + HANDOFF_PATHS string mirror + HandoffSnapshot + TerminalCloseReason union). Root `tsconfig.base.json` + `scripts/build.mjs` + `scripts/install.sh` + `scripts/install.ps1` + `.github/workflows/release.yml` + `RELEASE_NOTES.md`. |
| VS Code CLI | `/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code` (no `code` on `$PATH`; use full path or alias). |
| Cursor CLI | `/opt/homebrew/bin/cursor` (brew-installed). |
| Antigravity CLI | **GONE** — 2.0.1 dropped the CLI binary. Sideload into Antigravity 2.x is GUI-only. |
| Smoke workspaces on disk | `/tmp/deliveryos-smoke-r5/` + `/tmp/deliveryos-smoke-r5-cursor/` + `/tmp/deliveryos-smoke-r5-antigravity/` + `/tmp/release-verify-v2/` + `/tmp/v002-verify/`. Can be deleted now (b002 + b003 accepted by fiat). |
| Tracks configured | O (Documentation) · R (Development) · P (Project Management). |
