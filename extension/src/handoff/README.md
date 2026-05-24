# `extension/src/handoff/` — CHUNK-11 file handoff layer

This directory owns the **canonical `.deliveryos-handoff/` directory
layout** + the EXECUTE moment of the SDLC loop (write snapshot → open
terminal → watch `result.md`). Every downstream chunk that touches the
handoff directory **must import the path constants and URI factories
from `paths.ts`** — never hard-code the literal `.deliveryos-handoff/...`
string.

## Module map

- [`paths.ts`](paths.ts) — `HANDOFF_DIR` + `CURRENT_*` constants + URI
  factories (`handoffDirUri`, `currentExecutionBriefUri`, …, `resultUri`,
  `historyBriefUri`, `historyResultUri`) + `historyTimestamp()`
  (YYYYMMDDTHHmmssZ; Windows-safe; lexically sortable) + `parseHistoryTimestamp()`
  + `resultRelativePattern()`.
- [`writer.ts`](writer.ts) — `HandoffWriter.write(snapshot)` writes the
  5 `current-*.md` files atomically (tmp + rename per file), copies the
  brief into `history/<timestamp>-execution-brief.md`, ensures
  `history/.gitkeep` once. Does **not** create `result.md` upfront.
- [`terminalLauncher.ts`](terminalLauncher.ts) — `TerminalLauncher.launch({...})`
  opens the integrated terminal with the harness command pre-typed
  (`shouldExecute=false` — user presses Enter as the audit consent).
  Owns one `onDidCloseTerminal` subscription for close-event telemetry.
  Exposes `onClose: vscode.Event<TerminalClosedEvent>` for the host to
  forward as `HandoffTerminalClosed` notification.
- [`resultWatcher.ts`](resultWatcher.ts) — `ResultWatcher` subscribes to
  BOTH `onDidCreate` AND `onDidChange` on `.deliveryos-handoff/result.md`,
  trailing-edge debounces 250ms, SHA-256-dedup re-emit on identical
  content. Exposes `onResult: vscode.Event<ResultWatchEvent>`.
- [`gitignoreTemplate.ts`](gitignoreTemplate.ts) — `buildGitignoreBlock()`
  + `gitignoreState(workspace)` + `applyGitignoreBlock(workspace)`. All
  managed-block logic delegates to **CHUNK-10's `applyManagedBlock` in
  `'gitignore'` format** (no parallel implementation here).

## Cross-chunk consumers (forward seams)

| Chunk | What it imports | Why |
| --- | --- | --- |
| **CHUNK-12** Result Capture | `ResultWatcher.onResult`, `historyResultUri(ws, ts)`, `resultUri(ws)` | Parse `result.md` bytes + persist Result Memory + write `history/<ts>-result.md` audit snapshot |
| **CHUNK-13** Allowed/Forbidden diff | `historyBriefUri(ws, ts)`, `HANDOFF_DIR` | Read the audit-trail brief paired with a captured result + the PreToolUse hook script's handoff target |
| **CHUNK-14** Memory Update | `CURRENT_CONTEXT_PACKAGE`, `CURRENT_TEST_SPECIFICATION`, `CURRENT_VERIFICATION_CHECKLIST` | Cross-reference the current handoff bodies during the memory update step |
| **CHUNK-15** Release Evidence | `historyDirUri(ws)`, `historyTimestamp` | Bundle the `history/` directory into the release evidence export |

## Wire contracts (for webview consumers)

See [`contracts/src/handoff.ts`](../../../contracts/src/handoff.ts) for
the webview-facing API: `HANDOFF_PATHS` (string mirror),
`HandoffSnapshot`, `HandoffRunWithClaudeCode`, `HandoffRunWithCodex`,
`HandoffApplyGitignoreTemplate`, `HandoffWritten`,
`HandoffResultObserved`, `HandoffTerminalClosed`, `HandoffError`.

## Spec source

[`docs/planning/chunks/chunk-11-file-handoff-watcher.md`](../../../docs/planning/chunks/chunk-11-file-handoff-watcher.md).
