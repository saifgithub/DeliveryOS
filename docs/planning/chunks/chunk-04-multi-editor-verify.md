# CHUNK-04 — Multi-editor sideload verification + install script + GitHub Release scaffold

**Status:** Phase A planning spec (Prompt 2 of the planning loop).
**Parent plan:** [`docs/planning/part-1-plan.md`](../part-1-plan.md) — section `### CHUNK-04`.
**BUILD-PLAN phase:** Phase 0, Week 2 polish day (`docs/BUILD-PLAN.md` weeks 1–2).
**Effort estimate:** 1–2 session-days (~3 hr each).
**Owner:** Saiful (solo build).

> This spec is the plan. Implementation lands in the build prompt that consumes it. No source code is written here.

---

## 1. Restated goal and scope

### Goal

Prove that the DeliveryOS `.vsix` produced by CHUNK-01 (with the webview from CHUNK-02 and the memory store from CHUNK-03 already wired in) installs and runs cleanly on **VS Code AND Cursor (both REQUIRED) plus at least one of {Windsurf, VSCodium, Antigravity}**. Ship a cross-platform install script that detects installed editors and installs into each. Set up GitHub Releases so that `git tag vX.Y.Z && git push --tags` produces a downloadable `.vsix` with a published SHA-256 hash. Wire an in-extension version check that notifies the user when a newer release exists.

### In scope

- Manual sideload smoke-test of the existing `.vsix` into **VS Code AND Cursor (both REQUIRED) plus at least one of {Windsurf, VSCodium, Antigravity}** on the developer's primary OS (macOS — Linux/Windows are nice-to-haves), confirming:
  - The DeliveryOS activity-bar icon appears.
  - The "Hello DeliveryOS" webview from CHUNK-02 renders without CSP errors.
  - The memory store from CHUNK-03 writes `.deliveryos/memory.sqlite` and persists a project record across editor restarts.
- `scripts/install.sh` (POSIX shell, macOS + Linux): detects `code` / `cursor` / `windsurf` / `codium` / `antigravity` on `PATH` and installs `<repo>/deliveryos-*.vsix` into each detected editor. Idempotent.
- `scripts/install.ps1` (PowerShell 5+ / 7+, Windows): equivalent behaviour.
- `.github/workflows/release.yml`: on push of a `v*` tag, runs `vsce package`, computes SHA-256, creates a GitHub Release with the `.vsix` attached, and embeds the SHA-256 hash in the release notes.
- In-extension version check (`extension/src/updater/`): one fire-and-forget HTTPS GET to `https://api.github.com/repos/<owner>/<repo>/releases/latest` on activation; if the latest tag's semver is greater than `context.extension.packageJSON.version`, show a `vscode.window.showInformationMessage` with two actions ("Open release page", "Don't show again").
- New `deliveryos.checkForUpdates` setting (`boolean`, default `true`) in `extension/package.json`'s `contributes.configuration`.
- README install section (under `## Install`) with: GitHub Releases link, per-editor install command, SHA-256 verification step, troubleshooting block.

### Out of scope

- **OpenVSX publishing.** Deferred (BUILD-PLAN Phase 4 polish or post-MVP).
- **Code signing.** Sideloaded VSIX bypasses signature verification by design (research finding #3); SHA-256 hash publication is the user-facing supply-chain mitigation.
- **Auto-install of the new VSIX.** The version check notifies only; the user reinstalls manually. No background download, no silent reinstall.
- **Marketplace listing.** Microsoft's marketplace is restricted to first-party VS Code; explicitly rejected in ADR-0001.
- **Windows-first install testing.** Windows install script is shipped but verified opportunistically; macOS is the primary verification path for v0.0.1.
- **Antigravity-required.** Antigravity counts as a bonus editor if its CLI is locatable; the canonical bar is **VS Code + Cursor REQUIRED, plus one of {Windsurf, VSCodium, Antigravity}** — typically Windsurf OR VSCodium.
- **New cross-chunk schemas.** This chunk consumes CHUNK-01/-02/-03 outputs and introduces no shared contracts of its own.

---

## 2. Target editors

All five editors share the VS Code extension API surface (per ADR-0001) and accept the same `.vsix` artefact. Each ships a CLI binary intended to be on `PATH`; the actual install command shape is identical to `code` because they all inherit the Code-OSS CLI.

| Editor       | CLI binary       | Install command                                          | macOS app bundle path (fallback probe)                         | Notes                                                                |
| ------------ | ---------------- | -------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| VS Code      | `code`           | `code --install-extension <path-to-vsix> --force`         | `/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code` | Primary verification target.                                          |
| Cursor       | `cursor`         | `cursor --install-extension <path-to-vsix> --force`       | `/Applications/Cursor.app/Contents/Resources/app/bin/cursor`   | Primary verification target.                                          |
| Windsurf     | `windsurf`       | `windsurf --install-extension <path-to-vsix> --force`     | `/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf` | Likely third verification target.                                     |
| VSCodium     | `codium`         | `codium --install-extension <path-to-vsix> --force`       | `/Applications/VSCodium.app/Contents/Resources/app/bin/codium` | Open-source build of Code-OSS; useful for signature-verification baseline. |
| Antigravity  | `antigravity`    | `antigravity --install-extension <path-to-vsix> --force`  | unknown (may need binary-path probing)                          | If CLI not locatable, document manual "Install from VSIX" GUI flow.   |

**Done bar:** **VS Code AND Cursor are both REQUIRED.** In addition, at least one of {Windsurf, VSCodium, Antigravity} must install + activate + render the webview + persist memory. This canonicalises the Phase 0 boundary state per BUILD-PLAN / `part-1-plan.md` ("Installed in VS Code AND Cursor from the same file") — a smoke run that covers VS Code + Windsurf + VSCodium but skips Cursor does NOT pass. Cover both the Microsoft-distributed and open-source-rebuild lineages by picking Windsurf or VSCodium as the third editor.

---

## 3. File-by-file breakdown

### 3.1 `scripts/install.sh` (new, POSIX shell)

- Shebang: `#!/usr/bin/env sh`.
- Strict mode: `set -eu`.
- Arguments: optional positional `<path-to-vsix>`; defaults to the highest-versioned `deliveryos-*.vsix` in the script's parent directory (resolved via `dirname` + `ls -1`).
- For each editor in `code cursor windsurf codium antigravity`:
  - Use `command -v <cli>` to probe `PATH`.
  - If found: log `→ Installing into <editor>…` and exec `"$cli" --install-extension "$vsix" --force`, capturing exit code.
  - If not found: log `… <editor> not detected, skipping`.
- Final summary: count of installed / skipped / failed editors. Exit 0 if at least one editor succeeded; exit non-zero only if every detected editor failed (an empty PATH set is treated as a warning, exit 0).
- No interactive prompts.
- ShellCheck-clean.

### 3.2 `scripts/install.ps1` (new, PowerShell)

- Compatible with Windows PowerShell 5.1 and PowerShell Core 7+.
- `Set-StrictMode -Version Latest; $ErrorActionPreference = 'Continue'` (continue across editor failures, but capture them).
- Param block: `[string]$VsixPath`. Default: highest-versioned `deliveryos-*.vsix` in the script's parent directory (`Get-ChildItem … | Sort-Object Name -Descending | Select -First 1`).
- For each editor `'code','cursor','windsurf','codium','antigravity'`:
  - Use `Get-Command <cli> -ErrorAction SilentlyContinue` to probe.
  - If present: invoke `& <cli> --install-extension $VsixPath --force` and capture `$LASTEXITCODE`.
  - If absent: write a yellow `Write-Host` warning.
- Path handling: quote `$VsixPath` to survive spaces; resolve to absolute via `Resolve-Path`.
- Final summary equivalent to `install.sh`.
- Exit codes match the POSIX version.

### 3.3 `.github/workflows/release.yml` (new, GitHub Actions)

- Trigger: `on: push: tags: ['v*']`.
- Single job `release`, runs-on `ubuntu-latest`, permissions `contents: write` (needed for `gh release create`).
- Steps:
  1. `actions/checkout@v4`.
  2. `actions/setup-node@v4` with `node-version: '20'` and `cache: 'npm'`.
  3. `npm ci` (workspace install — picks up `extension/`, `webview/`, `contracts/` per CHUNK-02's monorepo).
  4. `npm run build` (transitive build of all workspaces).
  5. `npx @vscode/vsce package --no-yarn --out deliveryos-${GITHUB_REF_NAME#v}.vsix` (run from `extension/` workspace).
  6. Compute `SHA256SUMS.txt` covering **every** binary asset that will be attached to the release: the `.vsix`, `scripts/install.sh`, `scripts/install.ps1`, and `demo.mp4` if present at the repo root. Use `sha256sum deliveryos-*.vsix scripts/install.sh scripts/install.ps1 $(test -f demo.mp4 && echo demo.mp4) > SHA256SUMS.txt`.
  7. `gh release create "$GITHUB_REF_NAME" deliveryos-*.vsix scripts/install.sh scripts/install.ps1 SHA256SUMS.txt $(test -f demo.mp4 && echo demo.mp4) --title "DeliveryOS $GITHUB_REF_NAME" --notes-file RELEASE_NOTES.md` (uses the `GITHUB_TOKEN` provided by `permissions: contents: write`).
- **Release-notes contract.** The workflow consumes `RELEASE_NOTES.md` from the repo root via `--notes-file`. This file is **authored and committed BEFORE tagging** — CHUNK-16 owns the file's content (see CHUNK-16's outline step "Author RELEASE_NOTES.md → commit → then tag v0.1.0"). Earlier `v0.0.X` tags may either commit a minimal `RELEASE_NOTES.md` (one paragraph) or the workflow can fall back to a small inline default if the file is missing — CHUNK-16 sets the canonical pattern.
- **Attached assets contract.** Every release attaches: (a) `deliveryos-<version>.vsix`, (b) `scripts/install.sh`, (c) `scripts/install.ps1`, (d) `SHA256SUMS.txt` (covering all binary assets including the `.vsix` and install scripts; plus `demo.mp4` when present), and (e) `demo.mp4` if it exists at the repo root (CHUNK-16 owns this file from the v0.1.0 release onward).
- No matrix; single Linux runner is sufficient (the `.vsix` is platform-neutral).
- No publish to Marketplace / OpenVSX (explicitly out of scope per ADR-0001).

### 3.4 `extension/src/updater/checkForUpdates.ts` (new)

- Exports `checkForUpdates(context: vscode.ExtensionContext): Promise<void>`.
- Reads `vscode.workspace.getConfiguration('deliveryos').get<boolean>('checkForUpdates', true)`. If `false`, returns immediately.
- Reads `context.extension.packageJSON.version` as the current version.
- Reads `context.extension.packageJSON.repository.url` (or a constant `OWNER_REPO = 'saiful/deliveryos'` if the repo URL isn't yet finalised at scaffold time — document the seam).
- Issues `GET https://api.github.com/repos/<owner>/<repo>/releases/latest` with header `User-Agent: DeliveryOS-Updater/<currentVersion>` using `globalThis.fetch` (Node 18+ runtime in modern VS Code; fall back to a small `https` wrapper if VS Code's bundled Node version doesn't provide global fetch — verify in CHUNK-01's scaffold).
- Treats any response status other than 200 as a silent no-op (handles 403 rate-limit, 404 first-ever release, network failure). **Never throws into the activation path.**
- Parses `response.json()` → expects `{ tag_name: string; html_url: string; name: string }`.
- Compares semver via a tiny inline comparator (no `semver` dependency for one-shot use — pseudocode in §5.4). Strips leading `v`.
- If `latest > current`, calls `vscode.window.showInformationMessage(...)` with two actions: `"Open release page"` and `"Don't show again"`. On `"Open release page"`, calls `vscode.env.openExternal(vscode.Uri.parse(latest.html_url))`. On `"Don't show again"`, writes `deliveryos.checkForUpdates = false` via `getConfiguration().update(..., ConfigurationTarget.Global)`.
- Stores a debounce key in `context.globalState` keyed by latest tag so the same upgrade prompt doesn't appear twice per session: `globalState.get('deliveryos.lastSeenReleaseTag')`. If equal to the new tag, skip the prompt.
- Reference pattern: [`jan-dolejsi/vscode-extension-updater`](https://github.com/jan-dolejsi/vscode-extension-updater) — used as a pattern reference only, not vendored as a dependency for the MVP (keep the dep tree small; the GitHub-release variant is ~50 lines).

### 3.5 `extension/src/updater/types.ts` (new)

- Exports `interface LatestReleaseResponse { tag_name: string; html_url: string; name: string; }` — the subset of the GitHub Releases API response used by the updater.
- Exports `interface UpdateCheckResult { kind: 'no-update' | 'update-available' | 'skipped' | 'error'; current: string; latest?: string; htmlUrl?: string; errorReason?: 'disabled' | 'rate-limited' | 'network' | 'parse'; }`.
- Exports `type UpdateAction = 'open-release' | 'silence';` for the notification action choices.
- No runtime exports; types-only module. Imported by `checkForUpdates.ts`. Lives under `extension/src/updater/` so future updater work (e.g. an OpenVSX-based check post-MVP) has a natural home.

### 3.6 `extension/package.json` additions (existing file — edit)

- Add to `contributes.configuration.properties`:
  - `"deliveryos.checkForUpdates": { "type": "boolean", "default": true, "description": "Check GitHub Releases for a newer DeliveryOS version on startup and notify when one is available." }`.
- Add to `repository`: `{ "type": "git", "url": "https://github.com/<owner>/deliveryos.git" }` if not already present from CHUNK-01. The updater reads this.

### 3.7 `extension/src/extension.ts` (existing file — edit)

- In the `activate(context)` body, **after** the activity-bar and memory-store registration from CHUNK-01/CHUNK-03, add: `void checkForUpdates(context);` — fire-and-forget, never awaited (don't block activation).

### 3.8 `README.md` (existing file — edit)

- Add a top-level `## Install` section with the per-editor commands, the install-script one-liner, and the SHA-256 verification block. Content drafted in §8.

### 3.9 `.github/workflows/` (new directory)

- Created implicitly by `release.yml`. No other workflow files in scope for this chunk (CI/lint workflow is deferred — CHUNK-01 can land a minimal CI workflow, but it is not a CHUNK-04 deliverable).

---

## 4. `install.sh` / `install.ps1` design

### 4.1 Detection logic

- **Primary probe.** `command -v <cli>` (POSIX) / `Get-Command <cli>` (PowerShell). This is the canonical PATH-probe and matches the documented install pattern for all five editors.
- **No fallback to absolute paths in v0.0.1.** Rationale: every supported editor ships a "Install 'foo' command in PATH" entry in its command palette; users who haven't run that step will see a warning, not a silent failure. Falling back to hard-coded `/Applications/<Editor>.app/...` paths is appealing but pulls in macOS-only assumptions and complicates the cross-platform story. **Defer to v0.1+ if user feedback shows the PATH probe misses too many users.**
- **Antigravity.** If `command -v antigravity` returns nothing, the script logs a `… antigravity not detected (CLI may not be on PATH — see README for manual install). Skipping.` line and continues. No special-casing.

### 4.2 Idempotent reinstall

- Always passes `--force` to the editor CLI. The Code-OSS `--install-extension --force` flag means "uninstall any previous version of the same extension ID before installing this VSIX". Safe to run repeatedly.
- The script itself has no state; running it twice on the same machine is equivalent to running it once.

### 4.3 Exit codes

| Code | Meaning                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------ |
| 0    | At least one editor was detected and installed successfully (or zero editors detected — warning only). |
| 1    | At least one editor was detected, and **every** detected editor failed to install.                   |
| 2    | The `.vsix` argument was given but the file does not exist or is not readable.                       |

The PowerShell script mirrors these exit codes via `$LASTEXITCODE` / `exit <n>`.

### 4.4 Verbose mode

- Both scripts accept a `--verbose` / `-v` flag that surfaces the underlying CLI's stdout/stderr instead of swallowing it. Default is quiet-with-summary; `--verbose` is for debugging install failures in the wild.

### 4.5 Manifest output

- Both scripts print a final summary table:

  ```
  DeliveryOS install summary:
    code        OK     (1.86.2)
    cursor      OK     (0.45.1)
    windsurf    SKIP   (not on PATH)
    codium      OK     (1.96.0)
    antigravity SKIP   (not on PATH)
  ```

- The version after the editor name is the result of `<cli> --version | head -n1` and is informational only — failing to read it does not affect the exit code.

---

## 5. GitHub Actions workflow

### 5.1 Trigger semantics

- The workflow triggers **only** on tags matching `v*`. Branch pushes do not trigger it.
- Tagging convention: `v0.0.1`, `v0.0.2`, … `v0.1.0` (per CHUNK-16's `v0.1.0` first public version). The `release.yml` workflow makes no assumption about which tag is "first public" — every `v*` tag produces a release.

### 5.2 Package step

- Run from the `extension/` workspace: `cd extension && npx --no-install @vscode/vsce package --out ../deliveryos-${GITHUB_REF_NAME#v}.vsix`.
- `--no-yarn` is implicit since CHUNK-02 uses npm workspaces.
- Output filename includes the version without the `v` prefix (matches `vsce`'s native convention).

### 5.3 SHA-256 publication

- `sha256sum deliveryos-*.vsix scripts/install.sh scripts/install.ps1 $(test -f demo.mp4 && echo demo.mp4) > SHA256SUMS.txt`. A single `SHA256SUMS.txt` covers every binary asset attached to the release. Users verify with `shasum -a 256 -c SHA256SUMS.txt` on the downloaded set.
- `SHA256SUMS.txt` is uploaded as a release asset alongside the binary attachments. The release notes body comes from `RELEASE_NOTES.md` (M14) and may also include the digest line for the `.vsix` for convenience — but the canonical machine-verifiable artefact is `SHA256SUMS.txt`.

### 5.4 Release creation

- Uses the `gh` CLI (pre-installed on `ubuntu-latest`) authenticated via the workflow's `GITHUB_TOKEN`.
- Release notes body is read **from `RELEASE_NOTES.md` at the repo root** via `gh release create --notes-file RELEASE_NOTES.md`. The file is authored and committed before the tag is pushed; CHUNK-16 owns the v0.1.0 content. Sample skeleton for any release (CHUNK-16 expands for v0.1.0):

  ```markdown
  ## DeliveryOS v{VERSION}

  Sideloadable VS Code extension. Compatible with VS Code, Cursor, Windsurf, VSCodium, and Antigravity.

  ### Install

  ```sh
  curl -fsSL https://github.com/<owner>/deliveryos/releases/download/v{VERSION}/install.sh | sh
  ```

  Or download the `.vsix` and install manually:

  ```sh
  code --install-extension deliveryos-{VERSION}.vsix --force
  ```

  ### Verify

  ```sh
  shasum -a 256 -c SHA256SUMS.txt
  ```
  ```

  The workflow does NOT substitute tokens into the notes file (the notes-file flow is verbatim). The README's static install section duplicates the verify pattern (§8).

### 5.5 Failure modes

- If `vsce package` fails (most often: invalid `package.json`), the workflow fails and **no release is created**. The tag remains; rerunning the workflow after a fix is sufficient (no destructive cleanup needed).
- If `gh release create` fails because a release with that tag already exists (rare — only on tag re-push, which is itself unusual), the workflow fails. Manual cleanup: `gh release delete v0.0.X` then re-run.

---

## 6. In-extension version check

### 6.1 Lifecycle

- Called fire-and-forget from `activate(context)`, **after** all other activation steps. Wrapped in `void` to make the no-await intent explicit.
- Runs at most once per activation. There is no polling. Re-checking happens only when the user reloads the window or restarts the editor.

### 6.2 Configuration

- New setting `deliveryos.checkForUpdates` (boolean, default `true`).
- Read via `vscode.workspace.getConfiguration('deliveryos').get<boolean>('checkForUpdates', true)`.
- Written (when user clicks "Don't show again") via `getConfiguration('deliveryos').update('checkForUpdates', false, vscode.ConfigurationTarget.Global)`.

### 6.3 Network call

- Endpoint: `https://api.github.com/repos/<owner>/<repo>/releases/latest`.
- Method: `GET`.
- Headers:
  - `Accept: application/vnd.github+json`
  - `X-GitHub-Api-Version: 2022-11-28`
  - `User-Agent: DeliveryOS-Updater/<current-version>` (GitHub rejects requests without a `User-Agent`).
- Timeout: 5 seconds via `AbortController` (defensive — GitHub is fast, but slow networks shouldn't delay any future foreground work).
- **Unauthenticated.** No GitHub token is bundled. The 60-requests-per-hour-per-IP rate limit is more than enough for a once-per-activation check.

### 6.4 Semver comparison (inline, no dependency)

Pseudocode (the spec — actual TS lives in `checkForUpdates.ts`):

```
parse(v): strip leading 'v', split on '.', map Number, treat NaN as 0
compare(a, b): pad shorter array to length 3 with 0, lexicographic numeric compare
isNewer(latest, current): compare(parse(latest), parse(current)) > 0
```

Rationale for no `semver` npm dep: the comparison is ~10 lines, the runtime cost of an extra dependency in a VSIX is meaningful for activation time, and the tag format is fully controlled by our own release process.

### 6.5 Notification UX

- Single `vscode.window.showInformationMessage(message, ...actions)` call.
- Message: `"DeliveryOS v<latest> is available (you're on v<current>)."`
- Actions: `["Open release page", "Don't show again"]`.
- On `"Open release page"`: `vscode.env.openExternal(vscode.Uri.parse(latest.html_url))`.
- On `"Don't show again"`: persist `deliveryos.checkForUpdates = false` globally.
- On dismissal (user clicks the `x`): record the tag in `context.globalState` so the same prompt doesn't fire on the next activation. Future activations only re-prompt when a yet-newer release exists.

### 6.6 Error handling — silent

Per the parent plan's risk note: **all failure modes are silent.** Specifically:

- HTTP 403 (rate limit) → log to `OutputChannel` (debug) only, no user-facing notification.
- HTTP 404 (no releases yet) → silent.
- Network error / DNS failure → silent.
- JSON parse failure → silent.
- The setting being disabled → silent (early return).

The user never sees a "could not check for updates" toast. The update check is a courtesy, not a feature.

---

## 7. Key interfaces and types

(Reproduced from §3.5 for prominence.)

```ts
// extension/src/updater/types.ts

export interface LatestReleaseResponse {
  tag_name: string;       // e.g. "v0.0.2"
  html_url: string;       // e.g. "https://github.com/.../releases/tag/v0.0.2"
  name: string;           // human-readable release name
}

export interface UpdateCheckResult {
  kind: 'no-update' | 'update-available' | 'skipped' | 'error';
  current: string;
  latest?: string;
  htmlUrl?: string;
  errorReason?: 'disabled' | 'rate-limited' | 'network' | 'parse';
}

export type UpdateAction = 'open-release' | 'silence';
```

These types are local to the `updater/` module and are NOT exported across chunk boundaries. No shared-contract impact.

---

## 8. VS Code APIs used

| API                                                         | Where                                               | Purpose                                                       |
| ----------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| `vscode.ExtensionContext.extension.packageJSON`             | `checkForUpdates.ts`                                | Read current `version` and `repository.url`.                  |
| `vscode.ExtensionContext.globalState`                       | `checkForUpdates.ts`                                | Persist last-seen tag to avoid re-prompting in same session.  |
| `vscode.workspace.getConfiguration('deliveryos')`           | `checkForUpdates.ts`                                | Read `checkForUpdates` setting.                               |
| `.update('checkForUpdates', false, ConfigurationTarget.Global)` | `checkForUpdates.ts` (silence action)            | Persist user's "Don't show again" choice.                     |
| `vscode.window.showInformationMessage(message, ...items)`   | `checkForUpdates.ts`                                | Surface the upgrade notification.                             |
| `vscode.env.openExternal(uri)`                              | `checkForUpdates.ts` (open-release action)          | Open the release HTML page in the user's browser.             |
| `vscode.Uri.parse(...)`                                     | `checkForUpdates.ts`                                | Build the URI from `html_url`.                                |

No new contributions, commands, or activation events are added in this chunk. The version-check piggy-backs on the `onStartupFinished` activation already declared in CHUNK-01.

---

## 9. README install section

The README addition (verbatim — markdown drafted here, lands in `README.md` under the new `## Install` heading):

```markdown
## Install

DeliveryOS ships as a sideloadable `.vsix`. It runs in VS Code, Cursor, Windsurf, VSCodium, and Antigravity.

### Quick install (macOS / Linux)

```sh
curl -fsSL https://github.com/<owner>/deliveryos/releases/latest/download/install.sh | sh
```

### Quick install (Windows, PowerShell)

```powershell
iwr -useb https://github.com/<owner>/deliveryos/releases/latest/download/install.ps1 | iex
```

The install script detects every supported editor on your `PATH` and installs DeliveryOS into each.

### Manual install

1. Download `deliveryos-X.Y.Z.vsix` from the [latest release](https://github.com/<owner>/deliveryos/releases/latest).
2. Verify the SHA-256:

    ```sh
    shasum -a 256 deliveryos-X.Y.Z.vsix
    # compare against the SHA-256 published in the release notes
    ```

3. Install into whichever editors you use:

    ```sh
    code        --install-extension deliveryos-X.Y.Z.vsix --force   # VS Code
    cursor      --install-extension deliveryos-X.Y.Z.vsix --force   # Cursor
    windsurf    --install-extension deliveryos-X.Y.Z.vsix --force   # Windsurf
    codium      --install-extension deliveryos-X.Y.Z.vsix --force   # VSCodium
    antigravity --install-extension deliveryos-X.Y.Z.vsix --force   # Antigravity
    ```

   Or use each editor's "Install from VSIX" command from the command palette (Cmd/Ctrl+Shift+P).

### Why SHA-256?

Sideloaded VSIX files bypass the editor's Microsoft-signed extension verification by design (Microsoft signature verification only applies to Marketplace-installed extensions — `code --install-extension foo.vsix` and "Install from VSIX" both treat sideload as a developer flow). DeliveryOS publishes a SHA-256 hash on every release so you can confirm the `.vsix` you downloaded matches what was built by our GitHub Actions workflow.

### Updates

DeliveryOS checks GitHub Releases on startup and notifies you when a newer version is available. To disable: set `deliveryos.checkForUpdates` to `false` in your editor settings.

### Troubleshooting

- **"command not found: code" (or cursor / windsurf / codium / antigravity).** Open the editor, hit `Cmd/Ctrl+Shift+P`, search for "Shell Command: Install 'code' command in PATH" (the wording matches the editor — e.g. "Install 'cursor' command"). Re-run the install script.
- **Extension installs but the activity-bar icon doesn't appear.** Reload the window (`Cmd/Ctrl+Shift+P → Developer: Reload Window`). On first install some editors need a reload before custom activity-bar contributions render.
- **Antigravity not detected.** Antigravity's CLI may not be on `PATH`. Use "Install from VSIX" from the command palette as a manual fallback. File an issue with the absolute path to the binary on your system so we can document it.
- **GitHub rate limit on update check.** Harmless. The check fails silently and you'll never see the notification. To suppress entirely, set `deliveryos.checkForUpdates` to `false`.
```

---

## 10. Step-by-step implementation outline

1. **Pre-flight (no-code).** Confirm CHUNK-01's `.vsix` builds, CHUNK-02's hello webview renders in VS Code, and CHUNK-03's memory store persists across restarts. CHUNK-04 starts from this known-good baseline.
2. **Local install script first (smallest unit).** Write `scripts/install.sh`. Run it against the locally built `.vsix` with only VS Code on PATH. Expect: one OK, four SKIP. Add Cursor to PATH (via the editor's "Install command in PATH" action). Re-run. Expect: two OK, three SKIP.
3. **Mirror to PowerShell.** Write `scripts/install.ps1` on Windows-or-WSL-PowerShell. Smoke-test if a Windows box is available; otherwise eyeball-review.
4. **Manual cross-editor smoke test.** Install the `.vsix` into VS Code, Cursor, and (Windsurf OR VSCodium) on the dev box. For each: open, click activity-bar icon, run `deliveryos.openHello`, confirm the webview renders, confirm `<workspace>/.deliveryos/memory.sqlite` materialises after creating a project. Note any signature-verification warnings (per research finding #3, expect none).
5. **In-extension version check.** Create `extension/src/updater/types.ts`, then `extension/src/updater/checkForUpdates.ts`. Add the `deliveryos.checkForUpdates` setting to `extension/package.json`. Wire `void checkForUpdates(context)` into `activate()`.
6. **Local version-check smoke test.** Temporarily edit `extension/package.json` to `"version": "0.0.0"` and reload the extension; the notification should fire pointing at the real "latest release" once one exists. Restore version before committing.
7. **GitHub Actions workflow.** Write `.github/workflows/release.yml`. Commit. Tag `v0.0.1`. Push the tag. Watch the workflow run in the Actions tab. Verify the resulting release page has the `.vsix`, the `.sha256` sidecar, and the SHA-256 in the release notes body.
8. **End-to-end notification test.** With v0.0.1 released, tag v0.0.2 (no code changes — just a bump in `package.json` + tag push). The previous-installation extension (still on v0.0.1) should fire the upgrade notification on next activation.
9. **README install section.** Write the `## Install` section drafted in §9. Replace `<owner>` placeholders with the real GitHub owner.
10. **Commit and merge.** All deliverables stage cleanly; nothing in this chunk has runtime cross-coupling with later chunks beyond the smoke test it performs.

---

## 11. Test plan

All tests are **manual** for this chunk. No automated unit/integration suite is added — the value is in the cross-editor verification, which is inherently manual.

### 11.1 Multi-editor sideload (the "done" bar)

For **each of at least three** editors in {VS Code, Cursor, Windsurf, VSCodium, Antigravity}:

1. From a fresh editor state (no DeliveryOS installed), run the install script OR the manual `<cli> --install-extension` command.
2. Open the editor. The DeliveryOS activity-bar icon must be visible (may need one window reload — note if so).
3. Click the icon. The sidebar tree from CHUNK-01 must render with the four stages.
4. Run `deliveryos.openHello`. The CHUNK-02 webview must render without CSP errors (`Developer: Open Webview Developer Tools` to inspect).
5. Run `deliveryos.project.create`, give a project name. The Intent Memory entry from CHUNK-03 must be written. Confirm `<workspace>/.deliveryos/memory.sqlite` exists and `<workspace>/.deliveryos/memory/intent/<id>.md` exists with the raw idea text.
6. Close the editor. Reopen it. Tree view must show the project.

7. **Signature-verification observation.** Record, per editor, whether any signature-verification warning surfaced during install (per PRD § 25.1; research finding #3 expects none, but the canary lives here). One line in the test log per editor, e.g. `code: no warning`, `cursor: no warning`, `windsurf: warning — "publisher not verified" dialog, dismissed`. This row is mandatory output of the smoke test even when no warnings appear.

**Pass condition.** All six functional steps pass in **VS Code, Cursor, and at least one of {Windsurf, VSCodium, Antigravity}**. VS Code + Cursor are REQUIRED (B04). Record which three (or more) editors were tested AND a single-line signature-verification observation per editor in the test log (commit message or a `docs/planning/chunks/chunk-04-test-results.md` if useful, but not required as a deliverable).

### 11.2 Install script behaviour

- **POSIX path probe.** Run `scripts/install.sh` with `code` on PATH, others removed. Expect summary: `code OK, cursor SKIP, …`.
- **Idempotency.** Run twice consecutively. Both invocations succeed. The second is a no-op uninstall+install per `--force`.
- **Missing VSIX argument.** Run `scripts/install.sh /tmp/does-not-exist.vsix`. Expect exit code 2, clear error message.
- **No editors on PATH.** Temporarily clear PATH of editor CLIs. Run script. Expect exit code 0 + warning summary.
- **PowerShell parity.** Same scenarios, Windows or PowerShell Core. Document any divergence in the README troubleshooting section.

### 11.3 GitHub Action release flow

1. `git tag v0.0.1 && git push origin v0.0.1`.
2. Watch the workflow run in the Actions tab. Expect green within ~3 minutes.
3. Visit the release page. Verify:
   - `.vsix` attached.
   - `.vsix.sha256` attached.
   - Release notes contain the SHA-256 hash.
   - Release notes contain the curl-pipe-to-sh install one-liner.
4. Download the `.vsix`, run `shasum -a 256` locally, confirm it matches.

### 11.4 In-extension version check

- **Happy path: a newer version exists.** Install v0.0.1, then tag v0.0.2 (no code changes — only a `package.json` version bump and tag push). Open a window with the v0.0.1 install. The notification fires on activation. Click "Open release page" — opens the right URL in browser.
- **Silence.** Click "Don't show again". Reload the window. No notification fires. Setting now reads `deliveryos.checkForUpdates: false`.
- **No update.** Reset setting to `true`, install the same version as latest. No notification fires.
- **Rate limit.** Temporarily point the endpoint at a 403 (mock by editing the URL locally to a known-403 endpoint). No notification fires; no error toast. (This test is the only one that requires temporary code edit; revert before committing.)
- **Disabled setting.** Set `deliveryos.checkForUpdates` to `false` in user settings. Reload. No network call observed (confirm via `OutputChannel` debug log if added, or by network panel in webview devtools).

### 11.5 Combined sanity check

- After everything is in place, run `scripts/install.sh` against three editors in parallel. Open each. Confirm activity bar + webview + memory in all three. This is the demoable end of Phase 0: *"Here is DeliveryOS installed in VS Code and Cursor (and Windsurf) from the same file."*

---

## 12. Risks, edge cases, and open questions

### 12.1 Risks

- **Antigravity CLI path unknown.** The exact binary name and PATH location for Antigravity's CLI is not yet verified by hands-on test. Mitigation: degrade gracefully — `command -v antigravity` returns nothing → SKIP with a doc link. Antigravity is not on the critical-path "at least three" set. Once a confirmed binary path emerges (likely after the first user reports), update both install scripts and README. **Open question** for the build session: does Antigravity ship a CLI or only a "Install from VSIX" GUI on first release?
- **Windows path quirks.** PowerShell's `& <cli> --install-extension $VsixPath --force` can mis-parse spaces in `$VsixPath` if not double-quoted at the call site. The script handles this with `Resolve-Path` + explicit quoting. Untested on actual Windows in v0.0.1; flagged for opportunistic verification. Worst case: README troubleshooting entry telling Windows users to use absolute paths without spaces.
- **GitHub API rate limit on version check.** 60 requests/hour/IP unauthenticated. For a single-user solo build, hitting the limit is effectively impossible. For a public release with many users behind a shared IP (CI runners, large company NATs), 403s will become common. **Mitigation:** silent failure — the user never sees an error. If 403s become a pattern, a future chunk can add ETag caching or an authenticated check.
- **Signature verification warnings.** Research finding #3 says sideload bypasses Microsoft's signature check by design and this has not changed in 2026. **But** Cursor / Windsurf / Antigravity may add their own warning UI on top. If a warning blocks install on any editor, document the workaround in the README troubleshooting block. **Smoke test is the canary.**
- **Pre-monorepo packaging.** CHUNK-02 establishes the monorepo. The `vsce package` command must run from the `extension/` workspace and must include the `webview/dist/` build output. If CHUNK-02's packaging story has issues, this chunk inherits them. **Dependency on CHUNK-02 being correctly packageable.**
- **Release notes truncation.** GitHub release notes have a 125,000-character limit. Not a real concern at this scale, but worth noting in case future automation balloons the body.

### 12.2 Edge cases

- **First-ever release: no `releases/latest` exists.** GitHub returns 404. The updater treats this as silent / no-op. Self-cures on first tag push.
- **User edits `package.json` version to a string semver doesn't like** (e.g. `"0.0.1-alpha"`). The inline comparator strips leading `v` and parses dotted numerics only. Pre-release suffixes are treated as the base version (e.g. `0.0.1-alpha` == `0.0.1`). Acceptable for v0.0.1; revisit if pre-release tags become common.
- **User has two GitHub accounts / private fork.** The updater reads `repository.url` from `package.json`. If a user forks DeliveryOS and re-builds, the updater points at *their* fork, not the upstream. Considered correct behaviour for an open-source build.
- **Repo rename.** If `<owner>/deliveryos` is later renamed, the API redirects (GitHub returns 301 with `Location:`). `fetch` does not auto-follow by default unless `redirect: 'follow'` is set. Set it explicitly.

### 12.3 Open questions for Prompt 3 / Prompt 4

- Should the install script support a `--editor <name>` flag for users who want to install into only one editor? (Verdict: defer — `<cli> --install-extension <vsix> --force` is already that flag.)
- Should we ship a Homebrew tap as a parallel install path? (Verdict: defer to post-MVP. GitHub Releases + install script covers the proof-of-work surface.)
- Should we surface the changelog in the upgrade notification? (Verdict: defer. The "Open release page" action lands the user on the GitHub-rendered changelog already.)

---

## 13. Explicit dependencies

| Depends on  | Why                                                                                                                                                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CHUNK-01** | The `.vsix` artefact, the activity-bar contribution, the static stage tree, and `package.json`'s `contributes.configuration` infrastructure (we add a new property here, but the scaffold must already exist).                                                                  |
| **CHUNK-02** | The `deliveryos.openHello` command and its CSP-clean webview render are part of the smoke test. CHUNK-04 verifies that the webview works on three editors — it does not build the webview.                                                                                       |
| **CHUNK-03** | The memory-persistence smoke test (creating a project and reopening the editor) verifies that `sql.js` + `.deliveryos/memory.sqlite` works across editor restarts. CHUNK-04 does not extend the memory store.                                                                  |

### Shared cross-chunk contracts honoured

Per part-1-plan.md's "Shared cross-chunk contracts" section, this chunk consumes but does not define:

- **Memory schema** (CHUNK-03) — only smoke-tested.
- **Webview message contracts** (CHUNK-02) — only smoke-tested.
- **Execution Brief markdown schema** (CHUNK-09) — not yet in scope.
- **Harness Profile schema** (CHUNK-10) — not yet in scope.
- **Handoff directory layout** (CHUNK-11) — not yet in scope.
- **Managed delimiter block syntax** (CHUNK-10) — not yet in scope.

This chunk introduces **no new shared contracts**.

---

## 14. Research findings honoured

- **Research finding #3 (HIGH — RESOLVED risk).** Sideloaded `.vsix` bypasses Microsoft signature verification by design. ADR-0001's "tightening signature verification" risk is therefore not a present-day blocker. **Mitigation chosen:** SHA-256 hash publication on every GitHub Release + verification step documented in the README. This is the *user-facing supply-chain* mitigation. We do **not** pursue Microsoft signing (would require Marketplace publishing — explicitly out of scope) and we do **not** pursue OpenVSX publishing in this chunk.
- **Research finding #11 (LOW).** CHUNK-01 already uses `activationEvents: ["onStartupFinished"]`. The version check piggy-backs on this activation event — no new activation event is contributed.

---

## 15. Done-when (the contract restated)

This chunk is done when **all** of the following are true:

- [ ] The `.vsix` installs and runs (activity bar visible, hello webview renders, memory persists) in **VS Code AND Cursor (both REQUIRED) plus at least one of {Windsurf, VSCodium, Antigravity}**. A run that covers three editors but skips Cursor does NOT pass (per B04).
- [ ] The signature-verification observation row is recorded per tested editor in the smoke-test log (per m04 / PRD § 25.1), regardless of whether a warning surfaced.
- [ ] `scripts/install.sh` installs into every detected editor on macOS, returning the documented exit codes. (Linux verified opportunistically.)
- [ ] `scripts/install.ps1` exists with parity behaviour; Windows verification opportunistic.
- [ ] `.github/workflows/release.yml` triggers on `v*` tag push, runs `vsce package`, reads release notes from `RELEASE_NOTES.md` at the repo root via `gh release create --notes-file`, and creates a GitHub Release with the following attached: `deliveryos-<version>.vsix`, `scripts/install.sh`, `scripts/install.ps1`, `SHA256SUMS.txt` (covering all binary assets), and `demo.mp4` if present at the repo root. (CHUNK-16 owns the v0.1.0 `RELEASE_NOTES.md` content and `demo.mp4`.)
- [ ] `git tag v0.0.1 && git push --tags` produces a working public release artefact.
- [ ] The in-extension version check fires a notification when run against a newer release (verified by tagging v0.0.2 with a previous v0.0.1 install).
- [ ] The `deliveryos.checkForUpdates` setting is contributed and respected.
- [ ] README has an `## Install` section with the per-editor commands, install-script one-liner, SHA-256 verification step, and troubleshooting block.
- [ ] All version-check failure modes (rate limit, network error, no-release, disabled setting) are silent.

---

## 16. Hand-off

This spec is consumed by Prompt 3 (cohesion audit) and Prompt 4 (clean-up / READY). The build prompt that implements CHUNK-04 reads this file plus CHUNK-01/-02/-03 specs and the parent plan, and writes the actual TS/sh/ps1/yaml files. **No source code is committed in this Phase A planning step.**
