# History — track R (Development)

Older "what just landed" sections from docs/build/BUILD_STATUS.md, newest on top.

---

## DOS:R6  (2026-05-22)

DOS:R6 was a back-to-back same-day session opened immediately after DOS:R5's wrap, when the user asked "what's blocking CHUNK-04 from being completely done?" — saw the two remaining items were user-UI verification walks (b002 Cursor smoke + b003 Phase E live walk), then said "assume that they are fine and it has been tested for VSC and Antigravity. So let's move with chunk 5." That call closed CHUNK-04 by fiat (both bugs stay `open` in `docs/build/bugs.json` for the record but no longer block scheduling) and unlocked CHUNK-05 work.

2 substantive commits on `main` + this wrap. The session's shape was unusual in the opposite direction from DOS:R5: less verification, more building. CHUNK-05 is a 4-5-session-day chunk per the spec; this session landed Day 1 (pure-module foundation) cleanly, leaving Day 2-5 as the natural next slices.

**Commits on `main` (2 substantive + 1 wrap):**

- `296f156 docs(chunks): mark CHUNK-04 formally closed (DOS:R6)` — BUILD-PLAN.md Week 2 row → ✅; BUILD_STATUS.md "open chunk" row → CHUNK-05. Documents the user's "accept b002 + b003 as passing-by-assumption" call inline.
- `e2d481f feat(discover): CHUNK-05 Day 1 — contracts + question library + prompt builder + answers parser (DOS:R6)` — the pure-module foundation for the Discovery interview workspace. 5 new modules + 2 new test files; +568 insertions. Tests went 38 → 54 passing.

**CHUNK-05 Day 1 deliverables (file-by-file):**

- `contracts/src/discover.ts` (new, 139 lines) — panel-local view models (`RawIdeaView`, `DiscoveryAnswerInput`, `DiscoveryDraft`, `DiscoveryQuestion`, `DiscoverMode`) + 8 message constants (6 `RequestType` + 2 `NotificationType`). Imports the canonical persisted shapes (`RawIdea`, `DiscoveryRecord`, `DiscoveryAnswer`) from `./memory` — does NOT redeclare them per the cross-chunk-contract rule (CHUNK-03 owns those, M15 validation report).
- `contracts/src/index.ts` — re-export `./discover` from the barrel (flat, not namespaced, per the chunk-05 spec's directive). Existing `panels/hello` stays namespaced; `discover.ts` lives at the contracts root level.
- `extension/src/discovery/questionLibrary.ts` (new, 78 lines) — `DISCOVERY_QUESTIONS_MVP` const array of 12 hand-curated questions: Q1 problem, Q2 scope, Q3 users, Q4 data, Q5 regulated-industry, Q6 surface, Q7 integrations, Q8 performance-scale, Q9 success-criteria, Q10 constraints, Q11 risks-unknowns, Q12 release-shape (chunk-05 § 4 verbatim). Each entry: `id`, `topic`, `prompt`, optional `helperText`.
- `extension/src/discovery/promptBuilder.ts` (new, 55 lines) — `buildDiscoveryPrompt({ projectTitle, rawIdea, questions })` returns the markdown template (chunk-05 § 6 verbatim) with the Role / Objective / Project Context / Your Task / Output Format / Rules shape. Pure function; no vscode dependency. Question headings use `### Q<n>.` so the parser keys on the same shape.
- `extension/src/discovery/answersParser.ts` (new, 79 lines) — `parseAnswers(rawPaste, questions): { answers, unmatchedText }`. Heuristic 3-pattern matcher: `### Q<n>.` (preferred), `**Q<n>**` (bold fallback), `Q<n>.` (plain fallback). Patterns consume the full heading line so captured body excludes the question prompt. Preamble before the first heading + any unknown-id `Q<n>` markers route to `unmatchedText` for hand-allocation. Pure function.
- `extension/test/promptBuilder.test.ts` (new, 86 lines) — 7 tests across 2 suites: `buildDiscoveryPrompt` (interpolation; all-12-headings + ordering; helper-text italics; empty raw-idea; output-format count adapts to questions array length) + `DISCOVERY_QUESTIONS_MVP` shape (exactly 12 entries; unique ids Q1-Q12).
- `extension/test/answersParser.test.ts` (new, 130 lines) — 9 tests across 3 suites: happy path (`### Q<n>.` parses, all 12 captured) + fallback markers (`**Q<n>**`, plain `Q<n>.`) + edge cases (empty paste, no markers → full paste to unmatched, preamble capture, unknown id Q99 routed to unmatched, markdown preservation in bodies). One regex bug caught + fixed in-flight: original pattern only matched `### Q1. ` (the prefix), leaving the question text inside the captured body — extended pattern to consume the full heading line.

**Spec deviations DOS:R6 carries (flagged in the commit body, documented here for the audit trail):**

- **Message-constant form**: spec sketched `new RequestType<P, R>('discover.getInitialState')`, but `vscode-messenger-common`'s `RequestType<P, R>` is a TYPE ALIAS `{ method: string }`, not a class. Used the object-literal form matching the existing `panels/hello.ts` convention.
- **Method-string format**: spec consistently said `discover.<verb>` (dot), but the existing codebase uses `<panel>/<verb>` (slash, e.g. `hello/getHelloText`). Picked the codebase convention. Internal channel ID only; no user-facing impact.
- **No `IntentPayload` migration**: CHUNK-03 (DOS:R3) already added `rawIdea: RawIdea` and `discovery: DiscoveryRecord | null` to `IntentPayload` in anticipation of CHUNK-05. No schema bump, no migration runner change. Day 1 step 2 of the chunk-05 outline was a no-op.

**Open carries-over from DOS:R5 (UNCHANGED in DOS:R6 — none of these were touched):**

- **Bug-fix branch `claude/bug-fix-20260522-142757` STILL UNMERGED.** 5 commits with b001 + b004 fixes `pending_review`. User explicitly asked to "move forward" with CHUNK-05 rather than reviewing the branch first.
- **Repo STILL PUBLIC.** Was flipped from private during DOS:R5 Phase E for the unauthenticated API access. User wants private "until first real release"; the flip-back is gated on whether the Phase E live walk (b003) ever actually happens. Since b003 is now accepted as passing-by-assumption, the user could in principle flip private immediately.
- **Antigravity stuck at v0.0.4** (the 1.107.0-era install). Antigravity 2.x dropped the CLI so `install.sh` can't replace it — install.ps1/install.sh now surface the clearer SKIP reason after b001 merges (the diagnostic is on the unmerged bug-fix branch).
- **Smoke workspaces still on disk** at `/tmp/deliveryos-smoke-r5/` + `/tmp/deliveryos-smoke-r5-cursor/` + `/tmp/release-verify-v2/`. Can be deleted now (b002 + b003 were accepted by user fiat so the smoke workspaces aren't needed for follow-up walks).

**Carry-overs for DOS:R7 (next session) — ordered by what unblocks what:**

- **Merge the bug-fix branch** (UNCHANGED from DOS:R5's carry-over list). `git merge --no-ff claude/bug-fix-20260522-142757 && git worktree remove .claude/worktrees/bug-fix-20260522-142757 && git branch -d claude/bug-fix-20260522-142757`. Fixes b001 + b004. Small commits; review-easy.
- **Flip repo back to private** (carries from DOS:R5). `gh repo edit saifgithub/DeliveryOS --visibility=private`. No longer gated on anything — b003 was accepted as passing-by-assumption.
- **CHUNK-05 Day 2 (host wiring)** — primary next-session work. `extension/src/panels/discover/discoverHost.ts`: `registerDiscover(context, deps)` exporting a `vscode.Disposable`, internal `DiscoverPanel` singleton class, every messenger handler from `contracts/src/discover.ts` wired, `vscode.env.clipboard.writeText` for `DiscoverCopyPrompt`, `MemoryStore.update(intentId, payload)` calls in `DiscoverSaveRawIdea` + `DiscoverSaveAnswers` (host-stamped timestamps), `WebviewPanelSerializer` for restore-on-reload, `deliveryos.openDiscover` command registered in both `extension/src/extension.ts` and `extension/package.json#contributes.commands`. Day 2 spec is in `docs/planning/chunks/chunk-05-discover-capture.md § 9 Day 2`.
- **CHUNK-05 Day 3-5** sequential after Day 2: webview build (5 React components + Radix dep install + vite config entry); tree integration + end-to-end smoke; polish (empty states, long-input handling, markdown sanitisation, README touch-up).

**Two CHUNK-03 / CHUNK-04 tripwires unchanged (5th carry from DOS:R3):**

- **Multi-root workspace support.** MVP picks `workspaceFolders[0]` (CHUNK-03 § 13.6). Revisit if dogfooding hits it.
- **`SqlJsHost.flush()` debounce.** Current strategy: flush-per-mutation. Tripwire: if `MemoryStore.create()` ever exceeds 100 ms in dogfooding, drop in a debounced `scheduleFlush(250 ms)`.

**Track-O open questions** (CHUNK-03 § 13.9 + CHUNK-05's own §11 risks list now). Runtime Zod validation on `payload_json` read; whether to default `memory.sqlite` to gitignored; whether the rebuild-from-markdown command earns a chunk slot. None blocking — defer to a Track-O session.

**Not done this session (deferred):**

- CHUNK-05 Day 2-5 (host wiring, webview build, tree integration, polish). Sequential; Day 2 is the natural next slice.
- ESLint / Prettier wiring (chronic carry-over).
- Bug-fix branch merge (chronic carry-over from DOS:R5).
- Repo private flip (chronic carry-over from DOS:R5).

---

## DOS:R5  (2026-05-22)

DOS:R5 carried CHUNK-04 from "code-complete" toward "formally closed" by walking the verification carry-overs DOS:R4 deferred. 4 substantive commits on `main` + this wrap commit. CHUNK-04 done-when is now **substantively met** — 2 of 3 verification deliverables fully closed and the third blocked only on user UI walk-throughs (filed as bugs b002 + b003). Also surfaced + filed 2 unrelated bugs (b001 Antigravity 2.x CLI removed mid-session, b004 Node 20 deprecation) which are fixed `pending_review` on an unmerged bug-fix branch.

The session had an unusual shape compared to typical R sessions: more verification than coding, and more "surface a new bug and route it" than "implement a chunk". The user stepped away mid-Phase E (after explicitly telling me to keep moving rather than wait), so the live UI walk for the upgrade-notification e2e becomes the next session's first task. *[2026-05-22 DOS:R6 update: CHUNK-04 marked formally closed at start of R6 by user call; b002 + b003 accepted as passing-by-assumption.]*

**Plan-mode phases (the 5 alphabetised steps the entry plan organised the work around):**

- **Phase A** — GitHub owner locked to **`saifgithub/DeliveryOS`**. Found 7 occurrences across **4 files** (DOS:R4's handover named only 3): `README.md` × 3 (curl one-liner + iwr one-liner + manual-install latest-release link), `RELEASE_NOTES.md` × 1 (curl one-liner), `extension/package.json` × 2 (`repository.url` AND the walkthrough welcome message that links to `/readme`), `docs/planning/chunks/chunk-01-scaffold.md` × 1 (spec source for the walkthrough — updated so a future re-implementation doesn't reintroduce the old coordinate). Casing follows what the user typed (`saifgithub/DeliveryOS` with capital D/O/S). GitHub URL path resolution is case-insensitive so the actual canonical display follows whatever the repo is created with. The `gh repo create` + push happened mid-Phase D below.
- **Phase B** — **Cursor installed** via `brew install --cask cursor` (3.5.17). App lands at `/Applications/Cursor.app`; binary symlink at `/opt/homebrew/bin/cursor` (brew's standard cask layout). `install.sh` probe finds it.
- **Phase C** — § 11.5 cross-editor smoke. Walked the 8-sub-check Phase 0 rehearsal in **VS Code + Antigravity** (both fresh `/tmp/deliveryos-smoke-r5-*/` workspaces): activity-bar icon ✅ · stage tree order ✅ · `deliveryos.project.create` ✅ · welcome view disappears ✅ · `deliveryos.openHello` zero CSP errors ✅ · `.deliveryos/memory.sqlite` + `intent-<8hex>.md` materialise ✅ · close-reopen restores ✅ · sig-warn observation: no warning on either editor. Cursor was deferred at the user's call — they hadn't signed up for Cursor and didn't want to do it mid-session = bug b002 (status `open`).
- **Phase D** — § 11.3 release-flow verification. First `v0.0.1` tag push exposed **three bugs** in the release pipeline, all fixed and verified before re-tagging:
  - The workflow ran `npx --no-install @vscode/vsce package` directly, bypassing the npm `prepackage` lifecycle that copies `LICENSE` + `README.md` into the extension/ workspace before vsce packs. Result: the v0.0.1 .vsix was missing `extension/LICENSE.txt` + `extension/readme.md`, and the workflow emitted the `LICENSE, LICENSE.md, or LICENSE.txt not found` annotation. **Fix: call `npm -w deliveryos run package` so the prepackage hook fires.**
  - The `sha256sum` step in the workflow wrote SHA256SUMS.txt with paths `scripts/install.sh` and `scripts/install.ps1` (the relative paths the workflow saw at the repo root). But the release page uploads them as bare `install.sh` / `install.ps1` at the same level as SHA256SUMS.txt. Result: `shasum -a 256 -c SHA256SUMS.txt` from the user's downloads dir failed for both scripts ("No such file or directory"). **Fix: compute the script hashes from inside `scripts/` (subshell `cd scripts && sha256sum install.sh install.ps1 >> ...`) so the recorded paths are basenames.**
  - `extension/package.json#version` was still `0.0.4` from DOS:R4 (the bump for the new `checkForUpdates` setting). vsce uses package.json's version for the internal manifest, not the `--out` filename. So the first v0.0.1 release's .vsix internally claimed version 0.0.4. This would have broken Phase E's e2e entirely: `isNewer("0.0.2", "0.0.4") = false`, no notification fires. **Fix: align `extension/package.json#version` to `0.0.1` before tagging.** (Then bumped to 0.0.2 in Phase E for the upgrade test.)
  - First v0.0.1 release was deleted (`gh release delete v0.0.1` + tag delete) and retagged after the fixes. Second workflow run green in 37s. Release page now has all 4 assets (`.vsix` 415 KB + `install.sh` + `install.ps1` + `SHA256SUMS.txt` 243 bytes); local `shasum -c` returns OK for all three; internal version 0.0.1 matches the tag.
- **Phase E** — § 11.4 upgrade-notification e2e. Bumped to v0.0.2, committed, tagged, pushed. Workflow ✅ in 34s; release verified clean. **Repo was flipped public** (`gh repo edit --visibility=public --accept-visibility-change-consequences`) because the updater hits `api.github.com/repos/.../releases/latest` unauthenticated and private repos return 404. The flip happened only after explicit user authorisation in chat — the auto-mode classifier blocked the action when invoked from an AskUserQuestion response. Code-reviewed `extension/src/updater/checkForUpdates.ts`: `Open release page` action calls `vscode.env.openExternal(vscode.Uri.parse(latest.html_url))`; `Don't show again` calls `getConfiguration('deliveryos').update('checkForUpdates', false, Global)`; both branches update `lastSeenReleaseTag` even if the user dismisses without clicking (so any reset for Walk 2 requires uninstall + reinstall to clear globalState). The actual live walkthrough (reload window → observe notification → click Open release page → reload again to confirm suppression → reset state → reload → click Don't show again → verify setting flips) was deferred when the user stepped away = bug b003 (status `open`).

**Commits on `main` (4 substantive + 1 wrap):**

- `218b5a4 chore(release): lock GH owner to saifgithub/DeliveryOS — § A (DOS:R5)` — the 7-occurrence rewrite across the 4 files described in Phase A above. Tests 38 ✅, typecheck ✅, vsix rebuilt to 405 KB (was 404 KB — string-length diff).
- `b641d0d fix(release): repair v0.0.1 — version + LICENSE + SHA256SUMS paths — § D (DOS:R5)` — the three Phase D bug fixes bundled. `.github/workflows/release.yml` + `extension/package.json#version` 0.0.4 → 0.0.1.
- `1e54cdf chore(release): bump to 0.0.2 for upgrade-notification e2e — § E (DOS:R5)` — version-only bump for the Phase E e2e setup. `extension/package.json#version` 0.0.1 → 0.0.2.
- `df62205 chore(bugs): file 4 bugs discovered during DOS:R5 CHUNK-04 close-out` — bugs b001-b004 written to `docs/build/bugs.json`. Was empty (0 bugs) before.

**Bug-fix worktree on `claude/bug-fix-20260522-142757` (UNMERGED, 5 commits):**

- `de44ceb chore(bugs): claim b001, b004 for claude/bug-fix-20260522-142757` — pre-fix claim per the bug-fix protocol.
- `554239e fix(bug:b004): bump release workflow to Node 22 + actions/*@v5` — `.github/workflows/release.yml`: `actions/checkout` + `actions/setup-node` @v4 → @v5; `node-version` 20 → 22 (LTS). Clears the Node 20 deprecation annotation that's been on every workflow run.
- `15ba3d0 chore(bugs): b004 pending_review` — bugs.json status flip + `fixed_commit` set.
- `a34a5a7 fix(bug:b001): surface clearer SKIP reason when Antigravity 2.x is installed without a CLI` — `scripts/install.sh` + `scripts/install.ps1` + `README.md`. When the `command -v antigravity` probe fails AND `/Applications/Antigravity.app` exists (or `%LOCALAPPDATA%\Programs\Antigravity\Antigravity.exe` on Windows), surfaces `SKIP (Antigravity 2.x — CLI removed; install manually via app UI)` instead of the generic `not on PATH`. README troubleshooting block updated with the GUI sideload path. Live-verified — the new reason fires on this machine. A programmatic fallback (unzip vsix into `~/.antigravity/extensions/`) was considered but deferred — introduces a design call about CLI-less editor support that's out of scope for a diagnostic fix.
- `ae44641 chore(bugs): b001 pending_review` — status flip + `fixed_commit` set.

Merge command (when reviewing): `git merge --no-ff claude/bug-fix-20260522-142757 && git worktree remove .claude/worktrees/bug-fix-20260522-142757 && git branch -d claude/bug-fix-20260522-142757`.

**Surprising data points worth flagging for the next session:**

- **Antigravity auto-updated mid-session** from 1.107.0 → 2.0.1. The 2.0 bundle restructure removed the `antigravity` CLI binary entirely. The path `/Contents/Resources/app/bin/` no longer exists; new `/Contents/Resources/bin/` contains only `language_server` + `webm_encoder`. The 0.0.4 extension files from DOS:R4's CLI-installed version are still on disk at `~/.antigravity/extensions/deliveryos.deliveryos-0.0.4/`, but `install.sh` can't replace them anymore — Antigravity 2.x is now GUI-sideload-only. DOS:R4's handover noted Antigravity as "the standard Code-OSS layout" data point, which was true for 1.x but no longer.
- **`.claude/active-track` was reset to `P`** between this session's start and end. `/start-fresh R` at the top of the session wrote `R`; by `/handover` time the file contained `P` again. The wrap script protocol resolved the right track from the session's commit messages (all tagged DOS:R5) rather than the file. Possibly a macOS file-system quirk or the file was reverted by a parallel process. **Not blocking, but worth watching:** if it happens again, the wrap script will need to surface the resolution earlier.
- **Repo is PUBLIC right now.** User wanted private "until first real release"; flipped public mid-session for Phase E's unauthenticated API access. Needs `gh repo edit saifgithub/DeliveryOS --visibility=private` after the user completes the Phase E walk.

**Spec deviations DOS:R5 carries:**

- **No "Antigravity GUI sideload" fallback in `install.sh`.** b001 fix is diagnostic (clearer SKIP reason); the proper fix would unzip the .vsix into `~/.antigravity/extensions/<id>-<version>/`. Deferred because it introduces a design call about whether to add CLI-less fallback for all editors. Revisit if Antigravity becomes a dogfooding target.
- **No `scripts/check-vsix-size.js` tripwire.** Unchanged from DOS:R3/R4. vsix lands at 415 KB now (was 404 KB) — still well under 5 MB budget.
- **No `deliveryos.openHello` `when`-clause hide.** Unchanged from DOS:R3/R4. Command stays visible.

**Carry-overs for DOS:R6 (next session) — ordered by what unblocks what:**

- **Merge the bug-fix branch.** `git merge --no-ff claude/bug-fix-20260522-142757`. Two fixes: b001 (better Antigravity diagnostic) + b004 (Node 22 + actions @v5). Review the 5 commits; they're small. Cleanup: `git worktree remove .claude/worktrees/bug-fix-20260522-142757 && git branch -d claude/bug-fix-20260522-142757`.
- **Walk Phase E live UI checks (= bug b003).** *[DOS:R6 status: accepted as passing-by-assumption at user call. b003 remains `open` in bugs.json but no longer blocks scheduling.]*
- **Walk Cursor § 11.5 smoke (= bug b002).** *[DOS:R6 status: accepted as passing-by-assumption at user call. b002 remains `open` in bugs.json but no longer blocks scheduling.]*
- **Flip repo back to private.** `gh repo edit saifgithub/DeliveryOS --visibility=private` once b003 walk completes (the API access only needs to be public during the walk).
- **Mark CHUNK-04 formally closed** in the BUILD-PLAN ✅ and the open-chunk row in this table. Then start CHUNK-05.  *[DOS:R6 status: DONE — commit 296f156.]*
- **Two CHUNK-03 / CHUNK-04 tripwires unchanged from DOS:R3/R4:**
  - **Multi-root workspace support.** MVP picks `workspaceFolders[0]` (CHUNK-03 § 13.6). Revisit if dogfooding hits it.
  - **`SqlJsHost.flush()` debounce.** Current strategy: flush-per-mutation. Tripwire: if `MemoryStore.create()` ever exceeds 100 ms in dogfooding, drop in a debounced `scheduleFlush(250 ms)`.
- **Track-O open questions (CHUNK-03 § 13.9).** Runtime Zod validation on `payload_json` read; whether to default `memory.sqlite` to gitignored; whether the rebuild-from-markdown command earns a chunk slot. None blocking — defer to a Track-O session.

**Not done this session (deferred):**

- CHUNK-04 formal closure (depends on b002 + b003).  *[DOS:R6: closed by user fiat.]*
- CHUNK-05 onwards (sequential after CHUNK-04 formally closes).  *[DOS:R6: Day 1 landed.]*
- ESLint / Prettier wiring.

---

## DOS:R4  (2026-05-22)

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
  - **Surprising data point for CHUNK-04 § 12.1:** Antigravity's CLI is at the standard `/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity` path (not unknown as the spec worried). *[2026-05-22 DOS:R5 update: this was true for Antigravity 1.107.0 but the 2.0.1 bundle restructure removed the CLI entirely — see bug b001.]*

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
  - GH coordinate hardcoded as `deliveryos/deliveryos` to match `extension/package.json#repository.url`. **DOS:R5 confirms or rewrites mechanically** once the GitHub owner is locked in — three files would need the same rename: this `## Install` section, `RELEASE_NOTES.md`, and `extension/package.json#repository.url`. *[2026-05-22 DOS:R5 update: locked to `saifgithub/DeliveryOS`; 7 occurrences updated across 4 files (the 4th was the walkthrough welcome message in `extension/package.json` line 64 + the spec source at `docs/planning/chunks/chunk-01-scaffold.md` line 328 — DOS:R4 named only 3 files).]*
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
