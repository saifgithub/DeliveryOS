# CHUNK-11 — File handoff (`.deliveryos-handoff/`) + terminal integration + result watcher

**Phase.** Phase 2, Week 9 (2026-07-20). **Closes Phase 2.**
**Effort.** 4–5 session-days.
**Status when done.** Phase 2 demoable state: *"Generate a brief, click a button, Claude Code runs in the same window against the brief."*

This chunk is the **defining chunk for the `.deliveryos-handoff/` directory layout.** Every chunk that reads or writes the handoff directory (CHUNK-12 Result Capture, CHUNK-13 Diff feature, CHUNK-14 Memory Update, CHUNK-15 Release Evidence) imports the path constants from this chunk's `paths.ts`. No other module is allowed to hard-code these strings.

---

## Restated goal and scope

### Goal

Wire the EXECUTE moment of the SDLC loop. When the user clicks **Run with Claude Code** or **Run with Codex** on a saved Execution Brief (CHUNK-09 + CHUNK-10), DeliveryOS:

1. Writes the `.deliveryos-handoff/` directory into the workspace, populated from the brief and Memory.
2. Opens an integrated terminal with the harness command **pre-typed but not executed** (audit point).
3. Watches `.deliveryos-handoff/result.md` for the harness's output and emits a `ResultWatchEvent` that CHUNK-12 consumes.
4. Logs terminal close events for crash/abort telemetry.

### In scope

- The canonical `.deliveryos-handoff/` directory schema (paths + `current-*` vs `history/` split).
- `extension/src/handoff/paths.ts` — the **single source of truth** for handoff paths.
- `extension/src/handoff/writer.ts` — serialises a `HandoffSnapshot` into the directory atomically.
- `extension/src/handoff/terminalLauncher.ts` — opens the terminal with `shouldExecute=false`.
- `extension/src/handoff/resultWatcher.ts` — `FileSystemWatcher` on `result.md`, debounced 250ms, emits typed events.
- `extension/src/handoff/gitignoreTemplate.ts` — opt-in `.gitignore` snippet writer.
- `contracts/src/handoff.ts` — typed messages flowing between the webview (CHUNK-09 brief composer) and the extension host.
- Webview ↔ extension messages: `handoff.runWithClaudeCode`, `handoff.runWithCodex`, `handoff.applyGitignoreTemplate`, `handoff.resultObserved` (host → webview).
- `onDidCloseTerminal` instrumentation (telemetry, no UI yet).
- A `.gitignore` opt-in **prompt** the first time the handoff directory is written.

### Out of scope (explicit non-goals — guard against drift)

- **Parsing `result.md`.** That is CHUNK-12.
- **Diff against Allowed / Forbidden Changes.** That is CHUNK-13.
- **Result Capture tree-view node and webview.** That is CHUNK-12.
- **Tree-view changes inside the DeliveryOS sidebar.** None in this chunk.
- **Claude Code `.claude/settings.json` PreToolUse hook script.** That is CHUNK-13.
- **`Terminal.shellIntegration` exit-code capture.** Nice-to-have; deferred. FileSystemWatcher is the load-bearing signal.
- **`onDidWriteTerminalData`.** Rejected — research finding #12 (proposed API, cannot ship to Marketplace/OpenVSX).
- **Cursor / Generic / Replit profiles.** CHUNK-10 ships Claude Code + Codex only; this chunk follows.
- **Auto-applying the `.gitignore` template.** Always opt-in via a notification + button.

---

## Handoff directory schema (canonical)

`.deliveryos-handoff/` is rooted at the **workspace folder**. There is exactly one workspace folder for the MVP — multi-root is out of scope (declared via the existing `untrustedWorkspaces.supported: false` + `virtualWorkspaces.supported: false` capabilities from CHUNK-01).

```text
<workspace>/.deliveryos-handoff/
  current-execution-brief.md          ← regenerated every handoff; gitignorable
  current-context-package.md          ← regenerated every handoff; gitignorable
  current-test-specification.md       ← regenerated every handoff; gitignorable
  current-verification-checklist.md   ← regenerated every handoff; gitignorable
  memory-summary.md                   ← regenerated every handoff; gitignorable
  result.md                           ← NOT written upfront; harness or user writes this
  history/
    <iso-timestamp>-execution-brief.md   ← committed audit trail
    <iso-timestamp>-result.md            ← committed audit trail (CHUNK-12 will append)
    .gitkeep                              ← so empty history/ commits cleanly
```

### Rationale (per research findings)

- **Finding #6 (LOW).** Use the **dotfile** form `.deliveryos-handoff/`. PRD § 18.Y has an inconsistency (`/deliveryos-handoff/` appears alongside `.deliveryos-handoff/`); this chunk standardises on the dotfile. Prompt 4 will fold the PRD edit.
- **Finding #8 (MEDIUM).** Split into `current-*` (regenerated pointers, gitignorable) and `history/<timestamp>-*` (committed audit trail). Resolves the tension between PRD § 24's "auditability" criterion and the diff-noise cost.

### Timestamp format

`history/` filenames use **`YYYYMMDDTHHmmssZ`** (basic-form ISO-8601 UTC, no separators). Reasoning:

- Sortable lexicographically.
- Filesystem-safe on Windows (no `:`).
- Round-trippable to `Date` via a 30-line parser.

Example: `20260720T143022Z-execution-brief.md`.

### "Atomic" writes

`current-*.md` files are written via the **write-to-temp-then-rename** pattern using `vscode.workspace.fs`:

1. Write to `.deliveryos-handoff/.tmp-<filename>` via `workspace.fs.writeFile`.
2. Rename to the target name via `workspace.fs.rename`.

This avoids the `FileSystemWatcher` firing on a half-written file (which matters most for `result.md` written by external harnesses — see watcher section).

---

## File-by-file breakdown

### `extension/src/handoff/paths.ts` — **canonical, every chunk imports**

The single source of truth for handoff paths. Exports both raw relative strings (for use in pre-typed harness commands, where the literal `.deliveryos-handoff/...` must appear in the terminal) and `vscode.Uri` factories (for filesystem operations).

```ts
import * as vscode from 'vscode';

// Directory root, relative to workspace folder. Dotfile form per finding #6.
export const HANDOFF_DIR = '.deliveryos-handoff';
export const HANDOFF_HISTORY_DIR = `${HANDOFF_DIR}/history`;

// current-*.md — regenerated each handoff
export const CURRENT_EXECUTION_BRIEF = `${HANDOFF_DIR}/current-execution-brief.md`;
export const CURRENT_CONTEXT_PACKAGE = `${HANDOFF_DIR}/current-context-package.md`;
export const CURRENT_TEST_SPECIFICATION = `${HANDOFF_DIR}/current-test-specification.md`;
export const CURRENT_VERIFICATION_CHECKLIST = `${HANDOFF_DIR}/current-verification-checklist.md`;
export const MEMORY_SUMMARY = `${HANDOFF_DIR}/memory-summary.md`;
export const RESULT = `${HANDOFF_DIR}/result.md`;

// Uri factories — pass the workspace folder.
export function handoffDirUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, HANDOFF_DIR);
}
export function historyDirUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, HANDOFF_HISTORY_DIR);
}
export function currentExecutionBriefUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, CURRENT_EXECUTION_BRIEF);
}
// ...one factory per CURRENT_* path.

export function resultUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, RESULT);
}

// Timestamp helpers for history/ filenames.
export function historyTimestamp(d: Date = new Date()): string {
  // YYYYMMDDTHHmmssZ — see "Timestamp format" above.
  // Implementation: pad each field, no separators.
  return ...;
}
export function historyBriefUri(workspace: vscode.WorkspaceFolder, ts: string): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, HANDOFF_HISTORY_DIR, `${ts}-execution-brief.md`);
}
export function historyResultUri(workspace: vscode.WorkspaceFolder, ts: string): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, HANDOFF_HISTORY_DIR, `${ts}-result.md`);
}

// Relative-pattern helper for FileSystemWatcher.
export function resultRelativePattern(workspace: vscode.WorkspaceFolder): vscode.RelativePattern {
  return new vscode.RelativePattern(workspace, RESULT);
}
```

**Contract for downstream chunks:** never hard-code `.deliveryos-handoff/...` outside this file. Import the constant or the URI factory.

---

### `extension/src/handoff/writer.ts`

Serialises a `HandoffSnapshot` (see Key Interfaces below) into the directory.

Responsibilities:

- Ensure `.deliveryos-handoff/` and `.deliveryos-handoff/history/` exist via `workspace.fs.createDirectory` (idempotent — VS Code's API does not error on existing dirs).
- Ensure `history/.gitkeep` exists once so empty `history/` commits cleanly.
- Atomic-write each `current-*.md` file (write-to-temp-then-rename, see "Atomic writes" above).
- Write the history snapshot: `history/<timestamp>-execution-brief.md` — a **copy** of `current-execution-brief.md`.
- Do **not** create `result.md` upfront. It is written by the harness (Codex `-o`) or the user (Claude Code via instruction in `CLAUDE.md`).
- Return the `historyTimestamp` used, so the launcher can pass it to the watcher (CHUNK-12 will later use the same timestamp to write the `history/<timestamp>-result.md` snapshot).
- Fire `handoff.applyGitignoreTemplate` prompt on the **first ever** write (gate via the cross-project store from CHUNK-03 — a `gitignore-prompted-for-<projectId>` flag).

Public API:

```ts
export interface HandoffWriteResult {
  timestamp: string;            // history timestamp, e.g. "20260720T143022Z"
  briefHistoryUri: vscode.Uri;  // path to the committed audit-trail copy
}

export class HandoffWriter {
  constructor(private workspace: vscode.WorkspaceFolder) {}
  async write(snapshot: HandoffSnapshot): Promise<HandoffWriteResult>;
}
```

Error policy: if `workspace.fs.writeFile` rejects (e.g. read-only filesystem, permissions), surface a `vscode.window.showErrorMessage` *and* throw — the launcher must not open a terminal against a half-written handoff.

---

### `extension/src/handoff/terminalLauncher.ts`

Opens the integrated terminal with the harness command pre-typed.

Responsibilities:

- Construct the terminal via `vscode.window.createTerminal({...})` (full options below).
- Build the command string from the selected `HarnessProfile` (CHUNK-10 contract) — Claude Code or Codex shape.
- Shell-escape **path** fragments only. Never inline the brief content into the command — the brief is already on disk; the command references its path.
- Call `terminal.sendText(command, false)` with **`shouldExecute=false`** so the user presses Enter.
- Call `terminal.show(true)` to focus.
- Register `onDidCloseTerminal` once per launcher instance to record close events.

Terminal options:

```ts
vscode.window.createTerminal({
  name: profile === 'claude-code'
    ? 'DeliveryOS — Claude Code'
    : 'DeliveryOS — Codex',
  cwd: workspace.uri,                    // workspaceRoot
  iconPath: new vscode.ThemeIcon('rocket'),
  isTransient: true,                     // do not restore across window reloads
  // env: undefined  — inherit the user's env; do not override PATH
});
```

Public API:

```ts
export type HarnessId = 'claude-code' | 'codex';

export interface LaunchOptions {
  profile: HarnessId;
  workspace: vscode.WorkspaceFolder;
  // The handoff write must complete before the launcher runs.
  // Passed so close-instrumentation can correlate.
  handoffTimestamp: string;
}

export class TerminalLauncher {
  launch(opts: LaunchOptions): vscode.Terminal;
}
```

### Pre-typed commands (canonical)

**Claude Code** (per research finding #2: `shouldExecute=false`):

```
claude --add-dir . "Run the brief at .deliveryos-handoff/current-execution-brief.md and write result to .deliveryos-handoff/result.md"
```

**Codex** (per research finding #4: native `-o` flag):

```
codex exec -o .deliveryos-handoff/result.md "Run the brief at .deliveryos-handoff/current-execution-brief.md"
```

Both commands use **literal relative paths** matching the `paths.ts` constants. The user can see and edit before pressing Enter.

### Shell-escape rules

- The relative paths above are constants — no escaping needed for them.
- The instruction string (`"Run the brief at..."`) is a constant — no escaping needed.
- If a future variant inlines a project name or workspace path, escape with **`shell-quote`** (POSIX) on macOS/Linux and **single-quote with `''` doubling** on Windows PowerShell. For MVP, we never inline user-controlled fragments — the brief lives on disk, the command only references its path constant.
- **Defence-in-depth:** never inline brief *content* (it may contain shell metacharacters). The command references the path; the harness opens the file.

### Why `shouldExecute=false`

Per research finding #2 and the security posture: pressing Enter is the user's **explicit consent** that the brief's `Allowed Changes` / `Forbidden Changes` (PRD § 18.X sections 7+8) are what they intend to ship to the harness. This is the audit point at the EXECUTE moment of the loop.

---

### `extension/src/handoff/resultWatcher.ts`

Watches `result.md` and emits a `ResultWatchEvent` consumed by CHUNK-12.

Responsibilities:

- Create a `vscode.FileSystemWatcher` via `vscode.workspace.createFileSystemWatcher(resultRelativePattern(workspace), false, false, false)` — i.e. listen to **create, change, AND delete** (delete only for hygiene; we do not act on it but we log it).
- Subscribe to **both** `onDidCreate` AND `onDidChange`. The atomic-rename caveat: many editors and CLIs write via `tmp + rename`; the watcher fires `onDidCreate` on the rename. But some harnesses stream and append, firing `onDidChange`. Subscribing to both is mandatory.
- Debounce 250ms via a single trailing-edge timer: collapse a burst of create+change events into one `ResultWatchEvent`.
- On fire, read the file via `workspace.fs.readFile`, hash the content with SHA-256, and only emit if the hash differs from the last emitted hash — defends against the same write firing both events.
- Expose a `vscode.EventEmitter<ResultWatchEvent>` for CHUNK-12 to subscribe via `.onResult`.
- The watcher is owned by the extension host's lifetime; disposed in `deactivate`.

Public API:

```ts
export interface ResultWatchEvent {
  workspace: vscode.WorkspaceFolder;
  resultUri: vscode.Uri;
  briefId: string;                // memory entry id of the brief this result pairs with (M01/M03 contract)
  briefHistoryUri: vscode.Uri;   // the audit-trail brief this result is paired with (from launch)
  handoffTimestamp: string;       // the timestamp used at write-time
  contentBytes: Uint8Array;       // raw bytes, parsing is CHUNK-12's job
  contentSha256: string;
  kind: 'created' | 'changed';
  observedAt: number;             // Date.now()
}

export class ResultWatcher {
  constructor(private workspace: vscode.WorkspaceFolder);
  registerExpectedHandoff(timestamp: string, briefHistoryUri: vscode.Uri, briefId: string): void;
  readonly onResult: vscode.Event<ResultWatchEvent>;
  dispose(): void;
}
```

The launcher calls `registerExpectedHandoff(timestamp, briefHistoryUri)` immediately before opening the terminal, so when `result.md` fires we know which brief it pairs with. If `result.md` fires without a registered handoff (e.g. user wrote it manually with no prior launch in this VS Code session), `briefHistoryUri` falls back to the **most recent** `history/*-execution-brief.md` by lexical sort.

### Why 250ms?

- Fast enough to feel instant ("within 1 second" per CHUNK-11 Done When).
- Slow enough to collapse VS Code's own create+change pair on atomic rename.
- Trailing-edge: we emit *after* the burst settles, not on the first event.

---

### `extension/src/handoff/gitignoreTemplate.ts`

Suggested `.gitignore` snippet, applied via user opt-in. **Never silent.**

Template (markdown comment block + gitignore rules):

```text
# DeliveryOS handoff — auto-managed, regenerated each handoff
# Commit the history/ folder for audit. Ignore the current pointers and result.md.
.deliveryos-handoff/current-*.md
.deliveryos-handoff/memory-summary.md
.deliveryos-handoff/result.md
!.deliveryos-handoff/history/
!.deliveryos-handoff/history/**
```

Responsibilities:

- Read the workspace's `.gitignore` (if it exists; `workspace.fs.readFile` → catch ENOENT → empty string).
- Call `applyManagedBlock(existing, body, 'gitignore')` from CHUNK-10's `extension/src/profiles/managedBlock.ts` — the **canonical** managed-block engine. **CHUNK-11 does NOT implement its own hash-marker logic** (M09). CHUNK-10's `managedBlock.ts` now supports a `'gitignore'` format (third format alongside `'md'` and `'json'`) using hash-prefixed `# DELIVERYOS:BEGIN <id>` / `# DELIVERYOS:END <id>` markers; CHUNK-11 consumes it.
- Action dispatch (from `applyManagedBlock`'s `SuggestedUpdate['action']`):
  - `'noop'` (block present and identical) → no-op.
  - `'replace'` (block present but differs) → show a diff (re-use CHUNK-10's diff renderer) and let the user apply or skip.
  - `'insert'` (block absent) → show a notification prompt: *"DeliveryOS suggests adding 8 lines to your `.gitignore`. \[Apply] \[Skip] \[Show diff]"*.
- Triggered once per project on first handoff write (gated by a flag in cross-project storage, see CHUNK-03).
- Triggered on demand via the `handoff.applyGitignoreTemplate` webview message (from a button on the brief composer).

Public API (thin wrappers over CHUNK-10's `applyManagedBlock`):

```ts
export function buildGitignoreBlock(): string;     // returns the body that gets wrapped by managedBlock
export async function gitignoreState(workspace: vscode.WorkspaceFolder):
  Promise<{ state: 'absent' | 'present-matching' | 'present-differs'; existing?: string }>;
export async function applyGitignoreBlock(workspace: vscode.WorkspaceFolder): Promise<void>;
```

`applyGitignoreBlock` internally is roughly:

```ts
const existing = await readGitignore(workspace);
const body = buildGitignoreBlock();
const { next } = applyManagedBlock(existing, body, 'gitignore');  // CHUNK-10
await writeGitignore(workspace, next);
```

### Delimiter syntax (CHUNK-10 owns this; reproduced here for clarity)

```
# DELIVERYOS:BEGIN deliveryos-handoff
# DeliveryOS handoff — auto-managed, regenerated each handoff
... rules ...
# DELIVERYOS:END deliveryos-handoff
```

The `'gitignore'` format in CHUNK-10's `managedBlock.ts` uses hash-prefixed markers (since `.gitignore` doesn't support HTML comments), but the BEGIN/END/`<id>` shape is identical to the `'md'` format CHUNK-10 establishes for `CLAUDE.md` / `AGENTS.md`. One engine, three formats (`'md'`, `'json'`, `'gitignore'`) — no parallel implementations.

---

### `contracts/src/handoff.ts`

Shared TypeScript types and message contracts. Lives in the `contracts/` package per CHUNK-02. Every webview that triggers a handoff (CHUNK-09 brief composer → CHUNK-10 profile selector → CHUNK-11 run button) imports from here.

```ts
// === HandoffPaths ===
// Mirror of extension/src/handoff/paths.ts constants for webview-side use.
// Webviews must never use vscode.* APIs; they receive these as strings only.
export const HANDOFF_PATHS = {
  dir: '.deliveryos-handoff',
  historyDir: '.deliveryos-handoff/history',
  currentExecutionBrief: '.deliveryos-handoff/current-execution-brief.md',
  currentContextPackage: '.deliveryos-handoff/current-context-package.md',
  currentTestSpecification: '.deliveryos-handoff/current-test-specification.md',
  currentVerificationChecklist: '.deliveryos-handoff/current-verification-checklist.md',
  memorySummary: '.deliveryos-handoff/memory-summary.md',
  result: '.deliveryos-handoff/result.md',
} as const;
export type HandoffPaths = typeof HANDOFF_PATHS;

// === HandoffSnapshot ===
// What the brief composer (CHUNK-09) hands to the writer.
// All fields are full rendered markdown strings; the writer does not transform them.
export interface HandoffSnapshot {
  executionBriefMd: string;          // 10-section brief per architecture/execution-briefs.md
  contextPackageMd: string;          // Codebase Memory snapshot
  testSpecificationMd: string;       // CHUNK-08 output
  verificationChecklistMd: string;   // derived from brief Section 6 + Section 10
  memorySummaryMd: string;           // CHUNK-03 memory rollup
  briefId: string;                   // memory entry id for traceability
  projectId: string;                 // cross-project store key
}

// === Webview → extension messages ===
export type HandoffRequest =
  | { type: 'handoff.runWithClaudeCode'; payload: { briefId: string } }
  | { type: 'handoff.runWithCodex'; payload: { briefId: string } }
  | { type: 'handoff.applyGitignoreTemplate'; payload: { briefId: string } };

// === Extension → webview messages ===
export type HandoffEvent =
  | { type: 'handoff.written';
      payload: {
        briefId: string;
        handoffTimestamp: string;
        briefHistoryUri: string;   // serialised vscode.Uri.toString()
      }; }
  | { type: 'handoff.resultObserved';
      payload: {
        briefId: string;
        handoffTimestamp: string;
        resultUri: string;
        contentSha256: string;
        observedAt: number;
      }; }
  | { type: 'handoff.terminalClosed';
      payload: {
        briefId: string;
        handoffTimestamp: string;
        exitCode: number | undefined;
        reason: 'process' | 'user' | 'extensionHost' | 'unknown';
      }; }
  | { type: 'handoff.error';
      payload: { briefId: string; message: string; }; };
```

### Tree view changes

**None in this chunk.** The DeliveryOS tree view (CHUNK-01 + CHUNK-09) shows briefs under the EXECUTE node. The **Result Capture** node and Result Memory rendering are CHUNK-12's job. This chunk only fires events; CHUNK-12 wires the visible surface.

---

## Key interfaces and types

The three load-bearing types are listed here for cross-chunk reference. They are defined in either `extension/src/handoff/*` (host-only) or `contracts/src/handoff.ts` (shared).

### `HandoffPaths` (contracts)

Frozen, exported constant. Every other chunk that touches `.deliveryos-handoff/` imports the constant — never hard-codes the string.

### `HandoffSnapshot` (contracts)

The payload the brief composer (CHUNK-09) passes to the writer. Pure markdown strings; the writer's only job is to put them at the right paths.

### `ResultWatchEvent` (extension)

```ts
export interface ResultWatchEvent {
  workspace: vscode.WorkspaceFolder;
  resultUri: vscode.Uri;
  briefId: string;                // memory entry id of the paired brief (carries through to CHUNK-12 history snapshot)
  briefHistoryUri: vscode.Uri;
  handoffTimestamp: string;
  contentBytes: Uint8Array;
  contentSha256: string;
  kind: 'created' | 'changed';
  observedAt: number;
}
```

CHUNK-12 subscribes via `ResultWatcher.onResult` and is responsible for parsing the bytes and persisting Result Memory.

### Webview ↔ extension messages

- **`handoff.runWithClaudeCode`** (webview → host) — triggers `HandoffWriter.write(snapshot)` then `TerminalLauncher.launch({ profile: 'claude-code', ... })`.
- **`handoff.runWithCodex`** (webview → host) — same, with `profile: 'codex'`.
- **`handoff.applyGitignoreTemplate`** (webview → host) — triggers the `.gitignore` prompt explicitly (also auto-fires on first write).
- **`handoff.written`** (host → webview) — confirms the directory is on disk.
- **`handoff.resultObserved`** (host → webview) — informational only; CHUNK-12 fully reacts.
- **`handoff.terminalClosed`** (host → webview) — informational; powers the future "harness aborted" UI in CHUNK-12.
- **`handoff.error`** (host → webview) — surfaced as a webview-level toast.

---

## Terminal launcher design (full)

Per research findings #2 and #12, the launcher follows a strict, audit-friendly pattern.

### Step-by-step launch flow

1. The webview sends `handoff.runWithClaudeCode` (or `runWithCodex`) with `{ briefId }`.
2. The host loads the brief from Memory (CHUNK-03 → CHUNK-09).
3. The host builds a `HandoffSnapshot` and calls `HandoffWriter.write(snapshot)`.
   - On error → fire `handoff.error`; bail.
   - On first write per project → fire the `.gitignore` opt-in prompt (non-blocking).
4. The host calls `ResultWatcher.registerExpectedHandoff(timestamp, briefHistoryUri)` so the watcher knows which brief the next `result.md` pairs with.
5. The host calls `TerminalLauncher.launch({ profile, workspace, handoffTimestamp })`.
   - `createTerminal({ name, cwd: workspace.uri, iconPath: new ThemeIcon('rocket'), isTransient: true })`.
   - `terminal.sendText(command, false)` — `shouldExecute=false`.
   - `terminal.show(true)` — focus the terminal panel.
6. The host fires `handoff.written` back to the webview.
7. The user reviews the pre-typed command, presses Enter, the harness runs, `result.md` appears.
8. `ResultWatcher` debounces 250ms, hashes, emits `ResultWatchEvent` to its consumer (CHUNK-12 next chunk) and `handoff.resultObserved` to the webview.

### Command shape (per profile)

The launcher **always** reads `profile.command_template` from the `HarnessProfile` record CHUNK-10 defines (M04). CHUNK-10's canonical schema now declares `command_template: string` as a required field on every profile. CHUNK-11 does NOT hard-code commands per harness id — it substitutes a fixed set of placeholders into the profile's template.

**Allowed substitutions** (canonical contract with CHUNK-10):

- `${BRIEF_PATH}` — absolute path to `.deliveryos-handoff/current-execution-brief.md`.
- `${RESULT_PATH}` — absolute path to `.deliveryos-handoff/result.md` (where the harness is expected to write).
- `${WORKSPACE}` — absolute path to the active workspace folder root.

No other interpolation is permitted (keeps the audit story clean — every command shipped is reproducible from `profile.command_template` + the three substitutions).

```ts
// extension/src/handoff/terminalLauncher.ts
function buildCommand(profile: HarnessProfile, workspace: vscode.WorkspaceFolder): string {
  const briefPath = path.join(workspace.uri.fsPath, '.deliveryos-handoff', 'current-execution-brief.md');
  const resultPath = path.join(workspace.uri.fsPath, '.deliveryos-handoff', 'result.md');
  return profile.command_template
    .replace(/\$\{BRIEF_PATH\}/g, shellQuote(briefPath))
    .replace(/\$\{RESULT_PATH\}/g, shellQuote(resultPath))
    .replace(/\$\{WORKSPACE\}/g, shellQuote(workspace.uri.fsPath));
}
```

The built-in Claude Code and Codex profiles (declared in CHUNK-10) ship with templates like:

```sh
# claude-code profile.command_template:
claude --add-dir ${WORKSPACE} "Run the brief at ${BRIEF_PATH} and write result to ${RESULT_PATH}"

# codex profile.command_template:
codex exec -o ${RESULT_PATH} "Run the brief at ${BRIEF_PATH}"
```

But CHUNK-11 reads them from the profile record at runtime — it never inlines them.

### Why no `Terminal.shellIntegration` for MVP

Shell integration provides exit-code capture and command boundaries, but:

- It requires the user's shell to be one of bash/zsh/fish/pwsh with VS Code's integration installed (not guaranteed).
- It can fail silently with no easy recovery.
- The `FileSystemWatcher` on `result.md` is the **load-bearing signal** of completion; shell-integration would only refine the "did the harness exit cleanly" telemetry.
- Deferred to post-MVP. Re-evaluate after the first real demo.

### `onDidWriteTerminalData` explicitly rejected

Per research finding #12: this API is **permanently proposed** (microsoft/vscode#83224, open since 2019). It cannot be used in a Marketplace-published or OpenVSX-published extension. DeliveryOS does not use it. The FileSystemWatcher is the signal.

---

## Result watcher (full)

### Pattern

```ts
const watcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(workspace, '.deliveryos-handoff/result.md'),
  /* ignoreCreateEvents */ false,
  /* ignoreChangeEvents */ false,
  /* ignoreDeleteEvents */ false,  // we don't act on delete; we log it
);
```

### Why `RelativePattern` and not the bare glob

`RelativePattern` scopes the watcher to a single workspace folder. With multi-root deferred (CHUNK-01's untrusted/virtual capabilities) we still future-proof: each workspace folder gets its own watcher, never crossing.

### Event handling

```ts
const onCreate = watcher.onDidCreate(uri => debouncedFire(uri, 'created'));
const onChange = watcher.onDidChange(uri => debouncedFire(uri, 'changed'));
const onDelete = watcher.onDidDelete(uri => log({ event: 'result-deleted', uri }));
```

`debouncedFire` collapses a 250ms window. The trailing-edge timer reads `result.md`, hashes it, and emits exactly once per "settled" write.

### Atomic-rename caveat

POSIX: `mv` on the same filesystem fires `onDidCreate` (the rename surfaces as a new file in the watched dir).

macOS: same, but FSEvents may coalesce — usually safe.

Windows: `MoveFileEx` fires either `onDidCreate` or `onDidChange` depending on whether VS Code's watcher sees the rename before the original is deleted. Subscribing to **both** events is the only correct stance.

CLI harnesses observed in 2026:
- **Codex `-o`** — writes via `fs.writeFileSync` then optionally rotates (creates on first run, changes on re-run).
- **Claude Code** — instruction-driven, behaviour depends on the model; could be either pattern.

The debounce + content-hash dedup absorbs all observed permutations.

### 1-second latency target

Phase 2 Done When: *"DeliveryOS detects it within 1 second."*
- FileSystemWatcher event latency on a local SSD: typically <50ms.
- Debounce window: 250ms (trailing).
- Hash + emit: <10ms for typical result.md (<200KB).
- **Budget: <350ms typical, <1000ms worst-case** (large `result.md`, slow disk).

Test: see Test Plan below.

---

## Terminal close instrumentation

Register `vscode.window.onDidCloseTerminal` **once per launcher instance**. For each terminal DeliveryOS owns (keyed by its `vscode.Terminal` reference):

```ts
const sub = vscode.window.onDidCloseTerminal(terminal => {
  if (!ourTerminals.has(terminal)) return;
  const { briefId, handoffTimestamp } = ourTerminals.get(terminal)!;
  const exit = terminal.exitStatus;
  // exit?.code: number | undefined
  // exit?.reason: 0=Unknown 1=Shutdown 2=Process 3=User 4=ExtensionHost
  log({ event: 'terminal-closed', briefId, handoffTimestamp,
        exitCode: exit?.code, reason: mapReason(exit?.reason) });
  postToWebview({ type: 'handoff.terminalClosed',
                  payload: { briefId, handoffTimestamp,
                             exitCode: exit?.code,
                             reason: mapReason(exit?.reason) } });
  ourTerminals.delete(terminal);
});
```

`mapReason`:

| `TerminalExitReason` enum | mapped string  | meaning                                            |
|---------------------------|----------------|----------------------------------------------------|
| `Unknown` (0)             | `'unknown'`    | best-effort fallback                               |
| `Shutdown` (1)            | `'extensionHost'` | window reload or extension host restart         |
| `Process` (2)             | `'process'`    | harness exited (clean or crashed; check `exitCode`)|
| `User` (3)                | `'user'`       | user closed the terminal pane                      |
| `Extension` (4)           | `'extensionHost'` | DeliveryOS itself disposed the terminal         |

Telemetry surfaces:
- "Harness crashed" — `reason: 'process'`, `exitCode: non-zero`.
- "User bailed" — `reason: 'user'`.
- "Window reloaded" — `reason: 'extensionHost'`.

No UI in this chunk; just structured logs. CHUNK-12 may surface these in the Result Capture panel.

---

## `.gitignore` template (full)

### Block content

```text
# DELIVERYOS:BEGIN
# DeliveryOS handoff — auto-managed, regenerated each handoff
# Ignore the current pointers and result.md, but COMMIT history/ for audit.
.deliveryos-handoff/current-*.md
.deliveryos-handoff/memory-summary.md
.deliveryos-handoff/result.md
!.deliveryos-handoff/history/
!.deliveryos-handoff/history/**
# DELIVERYOS:END
```

### Prompt UX

First handoff write per project:

> **DeliveryOS** suggests adding 8 lines to your `.gitignore` so the regenerated pointer files don't show up in every commit. The `history/` audit trail will still be committed.
>
> **[Apply]** **[Show diff]** **[Skip]** **[Don't ask again for this project]**

- **Apply** → writes the block, sets `gitignore-prompted-for-<projectId>=true`.
- **Show diff** → opens a diff in a side editor (re-uses CHUNK-10's diff renderer); user can edit before confirming.
- **Skip** → does nothing, but will ask again on the next handoff write.
- **Don't ask again** → sets the flag without writing.

The prompt is also invokable on demand via the `handoff.applyGitignoreTemplate` webview message (button on the brief composer's "Run with..." surface).

### "Apply" behaviour

- Locate `<workspace>/.gitignore`. If absent, create it with the managed block as sole content.
- If present and a `# DELIVERYOS:BEGIN` block already exists, replace it (idempotent).
- If present without the block, **append** the block separated by one blank line.
- Never delete or rewrite anything outside the delimiter block.

---

## VS Code APIs used

| API                                          | Used in                  | Reason                                          |
|----------------------------------------------|--------------------------|-------------------------------------------------|
| `vscode.window.createTerminal`               | `terminalLauncher.ts`    | open the harness terminal                       |
| `Terminal.sendText(text, shouldExecute=false)` | `terminalLauncher.ts`  | pre-type the command, user presses Enter        |
| `Terminal.show(preserveFocus)`               | `terminalLauncher.ts`    | focus the terminal panel                        |
| `Terminal.exitStatus`                        | close instrumentation    | exit code + reason for telemetry                |
| `vscode.window.onDidCloseTerminal`           | close instrumentation    | log crashes/user-bail/host-reload               |
| `vscode.window.createFileSystemWatcher`      | `resultWatcher.ts`       | observe `result.md`                             |
| `vscode.RelativePattern`                     | `resultWatcher.ts`       | scope watch to one workspace folder             |
| `vscode.ThemeIcon`                           | `terminalLauncher.ts`    | terminal icon (`'rocket'`)                      |
| `vscode.Uri.joinPath`                        | `paths.ts`               | build URIs without OS-specific separators       |
| `vscode.workspace.fs.writeFile`              | `writer.ts`              | atomic write of `current-*.md`                  |
| `vscode.workspace.fs.rename`                 | `writer.ts`              | tmp → final swap                                |
| `vscode.workspace.fs.createDirectory`        | `writer.ts`              | ensure `.deliveryos-handoff/history/` exists    |
| `vscode.workspace.fs.readFile`               | `resultWatcher.ts`, `gitignoreTemplate.ts` | read result.md / .gitignore       |
| `vscode.workspace.fs.copy`                   | `writer.ts`              | snapshot brief into `history/`                  |
| `vscode.window.showInformationMessage`       | `gitignoreTemplate.ts`   | opt-in prompt                                   |
| `vscode.window.showErrorMessage`             | `writer.ts`              | surface write failures                          |
| `vscode.EventEmitter` / `vscode.Event`       | `resultWatcher.ts`       | typed event channel for CHUNK-12                |
| `vscode.workspace.workspaceFolders`          | command handler          | resolve the active workspace folder             |

### APIs deliberately not used

- **`onDidWriteTerminalData`** — proposed API, finding #12.
- **`Terminal.shellIntegration`** — deferred (post-MVP).
- **`window.terminals`** for enumeration — we track our own terminals via a `Map<vscode.Terminal, ...>`.

---

## Step-by-step implementation outline

Each step is ~half a session-day. The order keeps the system runnable after each step.

1. **`paths.ts` + unit tests.** Stand up the constants and URI factories. Tests verify `historyTimestamp` round-trips, that `historyBriefUri` joins correctly on POSIX and Windows.

2. **`contracts/src/handoff.ts`.** Add the type definitions. Re-export from `contracts/src/index.ts`. Verify the brief composer (CHUNK-09) and the extension host both compile.

3. **`HandoffWriter.write()` minimal path.** Just create the directory, write `current-execution-brief.md` non-atomically. Manual test: trigger from a debug command, inspect the workspace.

4. **Atomic-write pattern.** Add the `.tmp-*` + rename dance. Verify with a unit test that mid-write the file is never seen by a watcher created during the write.

5. **History snapshot.** `workspace.fs.copy(currentBriefUri, historyBriefUri(ts))`. Verify the history file matches the current file byte-for-byte.

6. **`TerminalLauncher.launch()` — Claude Code path.** Open the terminal, pre-type the command, focus. Manual test: see the command in the terminal, **do not press Enter** — confirm `shouldExecute=false`.

7. **Codex path.** Add the `codex exec -o ...` variant. Switch based on `profile`.

8. **`onDidCloseTerminal` instrumentation.** Log the close event with exit code + reason. Manual test: open the terminal, close it without running anything, confirm the log.

9. **`ResultWatcher` — bare watcher.** No debounce yet. Manually `touch .deliveryos-handoff/result.md`, confirm event fires.

10. **Debounce + content-hash dedup.** Verify two events within 250ms emit once. Verify the same content firing twice (after a forced re-write) emits only once.

11. **Wire `ResultWatcher` into the launcher.** Call `registerExpectedHandoff` before opening the terminal. Verify the event payload carries the brief history URI.

12. **`gitignoreTemplate.ts` + first-write prompt.** Wire to the cross-project storage flag. Manual test: first handoff fires the prompt; second does not.

13. **Webview message wiring.** Hook `handoff.runWithClaudeCode` / `handoff.runWithCodex` / `handoff.applyGitignoreTemplate` into the brief composer (CHUNK-09's webview). End-to-end click test from a saved brief.

14. **End-to-end with real `claude` binary.** Install Claude Code, run a brief through the loop, verify `result.md` appears, watcher fires within 1s, telemetry is clean.

15. **End-to-end with real `codex` binary.** Same with Codex CLI.

16. **Polish + tests.** Round out unit tests for `paths`, `writer`, `gitignoreTemplate`. Document the canonical paths in `extension/src/handoff/README.md` (a code-level README, not user-facing docs).

---

## Test plan

### Unit tests (vitest in `extension/`)

- `paths.test.ts` — `historyTimestamp` format, `historyBriefUri` joins correctly on POSIX and Windows separators.
- `writer.test.ts` — `HandoffWriter.write` creates expected files, history snapshot byte-matches, atomic-write tmp file does not appear in the final listing.
- `gitignoreTemplate.test.ts` — `buildGitignoreBlock` is deterministic, `applyGitignoreBlock` is idempotent, replaces an existing block in place, appends with a leading blank line if `.gitignore` exists without the block.
- `resultWatcher.test.ts` — debounce window collapses bursts; content-hash dedup suppresses redundant emits.

### Integration tests (VS Code Extension Tester or `@vscode/test-electron`)

- Run the extension in a fixture workspace. Programmatically:
  - Invoke `handoff.runWithClaudeCode` with a stub brief.
  - Assert `.deliveryos-handoff/current-execution-brief.md` appears.
  - Write `.deliveryos-handoff/result.md` via `fs`, assert the watcher fires within 1 second.
- Close-mid-flight test: open the terminal, dispose it programmatically, assert the close event logged with the correct `reason`.

### Manual end-to-end (mandatory before declaring done)

1. **Real `claude` binary.** Install Claude Code CLI per the pinned version in the README. Run a brief through the full loop. Confirm:
   - The terminal opens with the command pre-typed.
   - Pressing Enter runs Claude Code.
   - When Claude Code finishes (after writing `result.md` per its CLAUDE.md instruction), the watcher fires within 1 second.
   - `handoff.resultObserved` event reaches the webview.

2. **Real `codex` binary.** Install Codex CLI per the pinned version. Same flow.
   - Verify `codex exec -o .deliveryos-handoff/result.md ...` writes `result.md` directly via the `-o` flag.

3. **Close-mid-flight.** Open the terminal, do not press Enter, then close the terminal pane.
   - Assert `handoff.terminalClosed` fires with `reason: 'user'`, `exitCode: undefined`.

4. **Crash-simulation.** In the terminal, type `exit 1` and press Enter.
   - Assert `handoff.terminalClosed` fires with `reason: 'process'`, `exitCode: 1`.

5. **Window reload.** With the terminal open, run `Developer: Reload Window`.
   - Assert no state corruption: re-opening the brief composer shows the brief; `current-*.md` files are still on disk; the watcher is re-created cleanly. The `isTransient: true` flag means the terminal does not restore — that's intentional.

6. **FileSystemWatcher 1-second latency.** Touch `result.md` via the OS terminal (`echo "hi" > .deliveryos-handoff/result.md`). Wall-clock-time the gap from the write to the `handoff.resultObserved` event.

7. **`.gitignore` opt-in.** Fresh project, first handoff: confirm the prompt fires. Click **Skip**. Trigger another handoff: confirm the prompt fires again. Click **Don't ask again**: confirm it never fires again. Click **Apply**: confirm `.gitignore` contains the managed block, idempotently.

8. **`.gitignore` with existing content.** Add an existing `.gitignore` with `node_modules/`. Apply the block. Confirm the block is appended with a blank line separator, and `node_modules/` is untouched.

9. **Cross-platform.** Run the manual end-to-end on macOS, Linux, and Windows PowerShell (or document the gaps if Windows lags). The `vscode.Uri.joinPath` + `RelativePattern` path should be portable; the `.tmp-*` rename is the most likely platform-sensitive code.

---

## Risks, edge cases, and open questions

### Risks (carry into Prompt 4 for PRD/BUILD-PLAN folding)

- **CLI version drift.** The `claude` and `codex` CLIs change. The command shapes (`--add-dir`, `-o`) could be renamed.
  - **Mitigation:** pin known-good versions in `README.md` (e.g. `claude@1.x`, `codex@2026.07.x`). Re-test before any demo. The `HarnessProfile` schema (CHUNK-10) records the harness version each profile was authored against — surface a warning in CHUNK-10's profile manager if the installed version differs.
- **Codex `-o` argument-handling regression.** Finding #4 is grounded in 2026 behaviour. If Codex changes the flag, switch to instruction-based output (mirror Claude Code).
- **Atomic-rename quirks on macOS APFS.** Confirmed working in practice, but rename across APFS volumes can decay to copy+delete. The `.tmp-*` file is always on the same volume (inside `.deliveryos-handoff/`) so this is mitigated.
- **Windows PowerShell shell escaping.** For MVP we never inline user-controlled fragments, so this is theoretical. If a future variant inlines paths, use `'...'` quoting with `''` doubling on PowerShell, `'...'` with `'\''` doubling on POSIX.
- **Terminal not detected on first launch.** If `createTerminal` returns a terminal that fails to render (extension host startup race), call `terminal.show()` after a 50ms timeout. Watch for this in QA; if it bites, gate on the `onDidOpenTerminal` event.
- **Reading the result while the harness is still writing.** Mitigated by the debounce + content-hash dedup; the trailing-edge fire only happens after 250ms of quiet. If a harness streams over more than 250ms, the watcher may fire mid-stream — acceptable for MVP, CHUNK-12's parser is lenient and the user can re-trigger by saving again.

### Edge cases

- **No workspace folder open.** The "Run with..." buttons are gated; if `workspaceFolders` is empty, show a notification "Open a folder to use DeliveryOS handoff" and bail.
- **`.deliveryos-handoff/` is committed to git.** Acceptable — `current-*.md` will churn but git ignores aren't enforced. The opt-in `.gitignore` template addresses this.
- **`result.md` exists from a previous run.** On a new handoff write, we do **not** delete `result.md`. The user (or harness) overwrites it. The watcher's content-hash dedup prevents re-emitting the stale content; only a new write fires the event.
- **Two briefs handed off in quick succession.** The `registerExpectedHandoff` call replaces the prior registration — the latest brief is paired with the next `result.md` event. Document this; CHUNK-12 can warn if it sees a `briefId` mismatch.
- **Workspace has multiple folders.** Out of scope for MVP (capability gated). If the user adds a second folder later, the handoff targets `workspaceFolders[0]` (the primary). CHUNK-01's capability declaration limits the surface here.

### Open questions (for Prompt 3 audit and Prompt 4 doc updates)

- **PRD § 18.Y inconsistency.** PRD uses both `/deliveryos-handoff/` and `.deliveryos-handoff/` in different sections. This chunk standardises on the dotfile form per finding #6. **Prompt 4 must fold this edit into PRD.**
- **PRD § 18.Y missing `history/`.** PRD's directory listing omits `history/`. Add it per finding #8. **Prompt 4 must fold this edit into PRD.**
- **PRD § 23 example brief content.** The example doesn't mention `result.md` instruction. Add a note in the Claude Code variant that the brief tells the harness to write to `.deliveryos-handoff/result.md`. **Prompt 4 fold.**
- **`harness-profiles.md`** uses `/deliveryos-handoff/` in two places. **Prompt 4 fold to dotfile.**
- **Window-reload terminal restoration.** `isTransient: true` deliberately discards the terminal. Confirm with the user that this is the desired behaviour — the alternative (`isTransient: false` + persistence) keeps the terminal but no longer carries the audit context. Defer; current choice is conservative.

---

## Explicit dependencies

### Upstream (this chunk depends on)

- **CHUNK-01** — Extension scaffold; `package.json` capabilities (`untrustedWorkspaces.supported: false`); activity bar + tree view in which the "Run with..." buttons surface.
- **CHUNK-02** — `contracts/` package + messenger; the webview ↔ host plumbing for `handoff.*` messages.
- **CHUNK-03** — Memory store; the brief composer reads the brief from Memory by `briefId`; cross-project storage for the `gitignore-prompted-for-<projectId>` flag.
- **CHUNK-09** — Execution Brief composer; the brief markdown that fills `current-execution-brief.md`; the **Run with Claude Code / Codex** buttons live in the brief composer's webview.
- **CHUNK-10** — Harness profiles; the launcher reads the active profile to pick the command template; the suggested `CLAUDE.md` / `AGENTS.md` block tells the harness to read `current-execution-brief.md` and write `result.md`.

### Downstream (chunks that depend on this)

- **CHUNK-12** — Result Capture; subscribes to `ResultWatcher.onResult`; reads the bytes; parses; persists Result Memory. CHUNK-12 also adds the Result Capture tree-view node and webview surface.
- **CHUNK-13** — Allowed/Forbidden diff; reads `history/<timestamp>-execution-brief.md` and the captured Result Memory; the Claude PreToolUse hook script also writes to `.deliveryos-handoff/` (via CHUNK-11's path constants).
- **CHUNK-14** — Memory Update; reads `current-context-package.md`, `current-test-specification.md`, and `current-verification-checklist.md` for cross-referencing.
- **CHUNK-15** — Release Evidence; bundles the `history/` directory into the release evidence export.

### Exposed contracts

- **Canonical handoff directory layout** — paths in `extension/src/handoff/paths.ts`, mirrored in `contracts/src/handoff.ts`'s `HANDOFF_PATHS`. Every downstream chunk imports.
- **`ResultWatchEvent`** — consumed by CHUNK-12.
- **`handoff.*` webview messages** — listed in `contracts/src/handoff.ts`.
- **`<timestamp>` format** — `YYYYMMDDTHHmmssZ`, used by every chunk that writes into `history/`.

---

## Phase 2 demoable-state note

This chunk closes Phase 2 per BUILD-PLAN week 9:

> **Phase 2 demoable state:** *"Generate a brief, click a button, Claude Code runs in the same window against the brief."*

When CHUNK-11 ships:

- The user can complete the DISCOVER → DEFINE → EXECUTE arc inside the extension.
- The handoff is **real** — Claude Code or Codex actually runs against a real brief in a real terminal in the same window.
- The result returns to DeliveryOS via the watcher — though parsing into Result Memory is still CHUNK-12.

If the build slips, this is a viable phase-boundary ship (per BUILD-PLAN's "phase-boundary fallback"): the EXECUTE moment works end-to-end, even if VERIFY (CHUNK-12+) is incomplete. The diff feature (CHUNK-13, the headline) is gated on CHUNK-12, so the minimum viable ship is Phase 3 end.

---

## Summary of finding-incorporation

| Finding | Where in this spec                                                                |
|---------|-----------------------------------------------------------------------------------|
| #2      | `terminal.sendText(command, false)` — `shouldExecute=false`; user presses Enter.  |
| #4      | Codex command uses `-o .deliveryos-handoff/result.md`.                            |
| #6      | Standardised on `.deliveryos-handoff/` dotfile naming.                            |
| #8      | `current-*` vs `history/<timestamp>-*` split.                                     |
| #12     | `onDidWriteTerminalData` explicitly rejected; FileSystemWatcher is the signal.    |
