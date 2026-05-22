# Handover — Development (DOS:R)

**Last updated:** 2026-05-22 (end of DOS:R5 — **CHUNK-04 substantively done; not formally closed**. Phase A: GH owner locked `deliveryos/deliveryos` → **`saifgithub/DeliveryOS`** across 7 occurrences in 4 files (1 more than DOS:R4 named). Phase B: **Cursor installed** via `brew install --cask cursor` (3.5.17 at `/Applications/Cursor.app`, CLI symlinked at `/opt/homebrew/bin/cursor`). Phase C: § 11.5 smoke 8/8 ✅ in **VS Code + Antigravity** (Cursor walk deferred — user not signed up = bug b002). Phase D: **`v0.0.1` retagged** after fixing 3 release-pipeline bugs (`vsce package` bypass of npm `prepackage` → LICENSE/README missing; `SHA256SUMS.txt` paths using `scripts/install.sh` not basenames → user `shasum -c` failed; `extension/package.json#version` still 0.0.4 → would have broken Phase E's `isNewer` check). v0.0.1 release now: 4 assets, all `shasum -c` OK, LICENSE.txt + readme.md present, internal version 0.0.1. Phase E: **`v0.0.2` tagged + released** to set up upgrade-notification e2e; repo flipped public for unauthenticated API access; `checkForUpdates.ts` code-reviewed (handlers wired correctly); **live UI walk deferred** — user stepped away = bug b003. 4 bugs filed in `docs/build/bugs.json` (b001 Antigravity 2.x CLI removed, b002 Cursor smoke deferred, b003 Phase E walk deferred, b004 Node 20 deprecation). Bug-fix worktree `claude/bug-fix-20260522-142757` has **b001 + b004 pending_review** (5 commits, unmerged into main). Repo currently **PUBLIC**; needs flipping back to private after the user completes Phase E walk.)

Read this file **first** when starting a new Development session (`/start-fresh R`).

---

## What's on disk + what's running

| Field | Value |
| --- | --- |
| Commits on `main` | 44 (will be 45 after this wrap commit lands). DOS:R5 added 4 substantive commits on `main` + this wrap. **Plus 5 commits on the unmerged bug-fix branch** (see Bugs row). |
| HEAD | _will be_ the DOS:R5 wrap commit on top of `df62205 chore(bugs): file 4 bugs discovered during DOS:R5 CHUNK-04 close-out`. The DOS:R5 substantive landings on `main` are `218b5a4` (lock GH owner to `saifgithub/DeliveryOS`, 7 occurrences in 4 files) → `b641d0d` (fix 3 release-pipeline bugs surfaced verifying first v0.0.1: `vsce` bypass of `prepackage` LICENSE/README copy, SHA256SUMS path mismatch with download layout, `package.json` version 0.0.4 → 0.0.1 alignment with tag) → `1e54cdf` (0.0.1 → 0.0.2 version bump for the upgrade-notification e2e) → `df62205` (4 bugs filed). |
| Tags | **`v0.0.1` + `v0.0.2`** (both pushed to `origin`; both releases live on https://github.com/saifgithub/DeliveryOS/releases). The first `v0.0.1` tag was deleted + retagged after the 3 release-pipeline bug fixes. v0.0.1 hash: `b641d0d`; v0.0.2 hash: `1e54cdf`. Next planned tag: `v0.1.0` at CHUNK-16. |
| Tests | **38 passing** (extension/test/{memory,nonce,htmlFactory,updater}.test.ts — 10 suites: ids · migration runner · MemoryStore CRUD · MemoryStore links · payload JSON · renderPanelHtml · nonce · parseOwnerRepo · isNewer · payload-JSON edge cases). `npm test` from `extension/` runs `tsx --tsconfig test/tsconfig.json --test test/*.test.ts` in ~190 ms. `npm run typecheck` green. |
| Bugs ([docs/build/bugs.json](bugs.json)) | **4 filed this session** (was 0). b001 Antigravity 2.x CLI removed (status `pending_review` on bug-fix branch — diagnostic SKIP-reason fix landed), b002 Cursor § 11.5 smoke deferred (status `open`), b003 Phase E live walk deferred (status `open`), b004 Node 20 deprecation (status `pending_review` on bug-fix branch — actions @v4 → @v5 + node-version 20 → 22). Two `open` bugs both require user UI interaction; two `pending_review` await user merge. |
| Bug-fix branch (unmerged) | **`claude/bug-fix-20260522-142757`** (worktree at `.claude/worktrees/bug-fix-20260522-142757/`). 5 commits: claim → b004 fix → b004 pending_review → b001 fix → b001 pending_review. Merge with `git merge --no-ff claude/bug-fix-20260522-142757; git worktree remove .claude/worktrees/bug-fix-20260522-142757; git branch -d claude/bug-fix-20260522-142757`. |
| Open chunk | CHUNK-04 🟡 **substantively done; not formally closed**. Of 3 verification deliverables: (a) § 11.5 cross-editor smoke — VS Code ✅ + Antigravity ✅; **Cursor still pending** (= b002); (b) § 11.3 release-flow verification — **closed** (v0.0.1 retagged, workflow green, all assets present, SHA verifies); (c) § 11.4 upgrade-notification e2e — release side complete; **live VS Code walk still pending** (= b003). Both remaining pending items require user UI interaction. Once b002 + b003 walks complete, CHUNK-04 formally closes and CHUNK-05 is unblocked. |
| Phase | Phase 0 / Week 2 second half (BUILD-PLAN week of 2026-06-01 — still running ~10 days ahead). DOS:R5 was 2026-05-22. |
| Build artefact | `extension/deliveryos-0.0.2.vsix` (~415 KB; 14 files including LICENSE.txt + readme.md restored via npm `prepackage` lifecycle — these were missing from the first v0.0.1 release because the workflow's earlier `npx vsce package` bypassed the lifecycle). Release-side artefacts published on GitHub for both v0.0.1 + v0.0.2: `.vsix` + `install.sh` + `install.ps1` + `SHA256SUMS.txt` (basenames now match download layout). |
| GH repository | **`https://github.com/saifgithub/DeliveryOS`** (created this session via `gh repo create --source=. --remote=origin`). Currently **PUBLIC** (was created private; flipped to public for Phase E's unauthenticated API access on `releases/latest`; **user explicitly stated they want it private "until first real release"** — needs `gh repo edit saifgithub/DeliveryOS --visibility=private` after the Phase E walk completes). `origin` remote configured. Both `main` and tags pushed. |
| Install state | **v0.0.1** installed locally in **VS Code + Cursor** via `scripts/install.sh /tmp/release-verify-v2/deliveryos-0.0.1.vsix` (downloaded from the v0.0.1 release page). **Antigravity stuck at v0.0.4** (the 1.107.0-era install from DOS:R4) — Antigravity auto-updated to 2.0.1 mid-session and the bundle restructure removed the `antigravity` CLI binary, so re-install via `scripts/install.sh` skips it. The 0.0.4 extension files are still at `~/.antigravity/extensions/deliveryos.deliveryos-0.0.4/` from the earlier install. |
| Activation | ✅ extension loads in v0.0.1 form. The updater check on activation now hits a real GitHub Releases endpoint (`api.github.com/repos/saifgithub/DeliveryOS/releases/latest`); unauthenticated request returns 200 with `tag_name: v0.0.2` (confirmed via curl). The notification firing + action-button handlers are code-reviewed (handlers wire `Open release page` → `openExternal`, `Don't show again` → `getConfiguration.update(false, Global)`, both branches set `lastSeenReleaseTag`) but the live UI walk = b003 pending. |
| Sanity checks (config) | working-tree-clean ✅ · scaffold-state ✅ · lint (soft) ⚠ "Missing script" — expected; ESLint/Prettier still not wired. |
| Toolchain | Node v25.2.1 · npm 11.6.2 · `@vscode/vsce` ^3 · `typescript` ^5.5 · `@types/vscode` ^1.85 · `vite` ^5.4 · `tailwindcss` ^3.4 · `react` ^18.3 · `esbuild` ^0.24 · `vscode-messenger` ^0.4.5 · `sql.js` ^1.10.3 · `@types/sql.js` ^1.4.9 · `tsx` ^4.22.3 (test runner). Release workflow uses Node 22 + `actions/checkout@v5` + `actions/setup-node@v5` after b004 fix (pending merge). |
| Repo layout | npm workspaces: `extension/` (the published deliveryos extension; `src/memory/` + `src/updater/` + `src/webview/` + `test/`) + `webview/` (`@deliveryos/webview`, Vite + React + Tailwind) + `contracts/` (`@deliveryos/contracts`, type-only). Root `tsconfig.base.json` + `scripts/build.mjs` orchestrator + `scripts/install.sh` + `scripts/install.ps1` (cross-platform sideload) + `.github/workflows/release.yml` (tag-driven release pipeline; b004 fix bumps actions/node) + `RELEASE_NOTES.md` (release-body source). |
| VS Code CLI | `/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code` (no `code` on `$PATH`; use full path or alias). |
| Cursor CLI | `/opt/homebrew/bin/cursor` (brew-installed; symlinks into `/Applications/Cursor.app/Contents/Resources/app/bin/cursor`). |
| Antigravity CLI | **GONE** — 1.x had it at `/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity` but 2.0.1 dropped the entire CLI binary in a bundle restructure. New `/Contents/Resources/bin/` contains only `language_server` + `webm_encoder`. `install.sh` now surfaces this with `SKIP (Antigravity 2.x — CLI removed; install manually via app UI)` after the b001 fix merges. Sideload into Antigravity 2.x is now GUI-only. |
| Tracks configured | O (Documentation) · R (Development) · P (Project Management). |
| Smoke workspaces on disk | `/tmp/deliveryos-smoke-r5/` (VS Code smoke; project "BUG TRIAGR ASSISTANT" persisted) + `/tmp/deliveryos-smoke-r5-cursor/` (Cursor — empty, walk deferred) + `/tmp/deliveryos-smoke-r5-antigravity/` (Antigravity smoke; project "BUG TEST TRIAGE" persisted) + `/tmp/release-verify-v2/` (downloaded v0.0.1 release assets for SHA verification) + `/tmp/v002-verify/` (v0.0.2 download). User may want these preserved for Phase E walk (= b003). |

---

## What just landed (this session — DOS:R5)

DOS:R5 carried CHUNK-04 from "code-complete" toward "formally closed" by walking the verification carry-overs DOS:R4 deferred. 4 substantive commits on `main` + this wrap commit. CHUNK-04 done-when is now **substantively met** — 2 of 3 verification deliverables fully closed and the third blocked only on user UI walk-throughs (filed as bugs b002 + b003). Also surfaced + filed 2 unrelated bugs (b001 Antigravity 2.x CLI removed mid-session, b004 Node 20 deprecation) which are fixed `pending_review` on an unmerged bug-fix branch.

The session had an unusual shape compared to typical R sessions: more verification than coding, and more "surface a new bug and route it" than "implement a chunk". The user stepped away mid-Phase E (after explicitly telling me to keep moving rather than wait), so the live UI walk for the upgrade-notification e2e becomes the next session's first task.

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
- **Walk Phase E live UI checks (= bug b003).** VS Code at `/tmp/deliveryos-smoke-r5/` has v0.0.1 installed and the v0.0.2 release is published. Reload VS Code window → observe `"DeliveryOS v0.0.2 is available (you're on v0.0.1)."` notification → click `Open release page` → verify browser opens `https://github.com/saifgithub/DeliveryOS/releases/tag/v0.0.2` → reload again to confirm `lastSeenReleaseTag` suppression. Then `code --uninstall-extension deliveryos.deliveryos` + `code --install-extension /tmp/release-verify-v2/deliveryos-0.0.1.vsix --force` to reset globalState → reload → click `Don't show again` → verify `deliveryos.checkForUpdates` setting flips false → reload → no notification.
- **Walk Cursor § 11.5 smoke (= bug b002).** Cursor is installed and has v0.0.1 sideloaded. Sign in to Cursor, open `/tmp/deliveryos-smoke-r5-cursor/`, walk the 8 sub-checks. If all pass, b002 → resolved at merge time.
- **Flip repo back to private.** `gh repo edit saifgithub/DeliveryOS --visibility=private` once b003 walk completes (the API access only needs to be public during the walk).
- **Mark CHUNK-04 formally closed** in the BUILD-PLAN ✅ and the open-chunk row in this table. Then start CHUNK-05.
- **Two CHUNK-03 / CHUNK-04 tripwires unchanged from DOS:R3/R4:**
  - **Multi-root workspace support.** MVP picks `workspaceFolders[0]` (CHUNK-03 § 13.6). Revisit if dogfooding hits it.
  - **`SqlJsHost.flush()` debounce.** Current strategy: flush-per-mutation. Tripwire: if `MemoryStore.create()` ever exceeds 100 ms in dogfooding, drop in a debounced `scheduleFlush(250 ms)`.
- **Track-O open questions (CHUNK-03 § 13.9).** Runtime Zod validation on `payload_json` read; whether to default `memory.sqlite` to gitignored; whether the rebuild-from-markdown command earns a chunk slot. None blocking — defer to a Track-O session.

**Not done this session (deferred):**

- CHUNK-04 formal closure (depends on b002 + b003).
- CHUNK-05 onwards (sequential after CHUNK-04 formally closes).
- ESLint / Prettier wiring.

---

## How to start the next session

`/start-fresh R`

Session name to use: **DOS:R6**

DOS:R6's first job is to **finish closing CHUNK-04** by walking the two remaining user-UI verifications (= bugs b002 + b003) and merging the unmerged bug-fix branch. Effort estimate: 30-45 min of focused user time + a quick code review of the bug-fix branch. Then CHUNK-05 (raw idea capture + discovery interview workspace) is unblocked.

**Pre-flight reminder for DOS:R6:**

- The `.claude/session-config.yml` R-track sanity check passes cleanly.
- `npm run build` (from repo root) produces `extension/deliveryos-0.0.2.vsix` (~415 KB) — re-run if the working tree changed since DOS:R5.
- `npm test` (from `extension/`) runs the 38-test suite via `tsx + node:test` in ~190 ms.
- `npm run typecheck` is green.
- **Local install state from DOS:R5:** `deliveryos.deliveryos@0.0.1` is installed in VS Code + Cursor (for the upgrade-notification e2e). Antigravity has v0.0.4 stuck from the DOS:R4-era install (the 2.0.1 update removed the CLI; new installs are GUI-only — see b001).
- **Bug-fix branch `claude/bug-fix-20260522-142757` is UNMERGED.** 5 commits, b001 + b004 fixes. Review and merge with `git merge --no-ff` before doing CHUNK-05 work, so the next release run picks up the Node 22 + actions @v5 bumps.
- **Repo is PUBLIC right now.** Flipped during Phase E for unauthenticated API access. Flip back via `gh repo edit saifgithub/DeliveryOS --visibility=private` once the Phase E walk (= b003) completes.
- **Smoke workspaces persist under `/tmp/`** for the deferred Phase E + Cursor walks: `/tmp/deliveryos-smoke-r5/` (VS Code), `/tmp/deliveryos-smoke-r5-cursor/`, `/tmp/release-verify-v2/` (downloaded v0.0.1 assets).
- The GitHub coordinate is **`saifgithub/DeliveryOS`** (locked DOS:R5). The updater + install scripts derive owner/repo from `extension/package.json#repository.url`.
- The cross-chunk contracts table in [docs/planning/chunks/README.md § "Cross-chunk contracts"](../planning/chunks/README.md) is the canonical owners reference — CHUNK-04 doesn't redefine memory or webview surfaces.
- For the live UI walks (b002 + b003), the spec source is [docs/planning/chunks/chunk-04-multi-editor-verify.md § 11.4 + § 11.5](../planning/chunks/chunk-04-multi-editor-verify.md).
- After CHUNK-04 fully closes, **tick CHUNK-04 ✅** in [docs/BUILD-PLAN.md](../BUILD-PLAN.md) (Phase 0 Week 2 row).
