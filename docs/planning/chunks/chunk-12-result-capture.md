# CHUNK-12 — Result capture (parse `result.md`, paste mode fallback)

**Phase.** 3, Week 10 (2026-07-27).
**Effort.** 3–4 session-days.
**Status.** Spec only. No implementation here.

---

## 1. Restated goal and scope

**Goal.** When CHUNK-11's `FileSystemWatcher` fires on `.deliveryos-handoff/result.md`, parse it, reconcile its "files changed" claim against `git diff --name-only HEAD` (ground truth), and persist the outcome as a **Result Memory** entry linked to the originating Execution Memory entry (the brief). When the watcher does not fire — because the user ran the harness in a separate window, on another machine, or used a non-CLI harness — surface a webview **Paste-mode fallback** that funnels manual paste through the same parser and the same persistence path.

This chunk closes the loop on the EXECUTE moment that CHUNK-11 opened. It produces the canonical input that CHUNK-13 (Allowed/Forbidden diff) and CHUNK-14 (verification + release evidence) consume.

### In scope

- A lenient markdown section-header-based parser for `result.md`.
- A persistence layer that writes a Result Memory entry through CHUNK-03's memory store.
- A git ground-truth probe — `git diff --name-only HEAD` — to capture the authoritative "files actually changed" list.
- A webview Paste-mode fallback panel that accepts arbitrary harness output, runs it through the same parser, and writes the same Result Memory shape.
- A Result Detail webview that renders the parsed result (sections, files-changed reconciliation, raw text, parse-confidence flag).
- Tree-view extension: EXECUTE → briefs → results (a result hangs under the brief it relates to).
- Wiring to consume CHUNK-11's `onResultMdReady` event.

### Out of scope (deferred)

- Allowed/Forbidden glob diff and pass/fail verdict — **CHUNK-13**.
- Verification against the Test Specification — **CHUNK-14**.
- Memory updates that promote Design Memory / Codebase Memory from harness output — **CHUNK-14**.
- Release evidence assembly — **CHUNK-14**.
- Auto-detecting non-CLI harnesses (Cursor, Replit, Lovable). Paste fallback covers them all in MVP.
- Rich diff rendering against the brief's Allowed list (only the raw `git diff --name-only HEAD` list lands in Result Memory here; CHUNK-13 does the matching).

---

## 2. `result.md` expected shape

The brief's Section 9 ("Expected Output", frozen by CHUNK-09; defined in `docs/architecture/execution-briefs.md` line 38 and `docs/PRD.md` § 18.X line 649) asks the harness for six things. We freeze them here as **canonical section headers** in `result.md` so the parser has a deterministic structure to target:

```md
# DeliveryOS Result

## 1. Summary of Changes
A short prose paragraph describing what the harness did.

## 2. Files Changed
- path/to/file-a.ts (new | modified | deleted)
- path/to/file-b.ts (new | modified | deleted)
- ...

## 3. Tests Added or Updated
- tests/integration/test_foo.py — new
- tests/unit/test_bar.py — updated
- ...

## 4. Tests Run
- pytest -q tests/integration/ — passed (12/12)
- ruff check . — passed
- mypy . — 2 errors (see Risks)
- ...

## 5. Risks
- Brief prose list of risks, regressions, or things the human should look at.

## 6. Unresolved Questions
- Open questions the harness could not resolve.
```

The brief instructs the harness (via the Section 9 text rendered by CHUNK-09's composer) to follow this exact header schema. The parser is **lenient** about missing sections, missing list items, and minor heading variations (see § 4 Parser design), and records both parsed fields and raw text so that no information is ever lost.

> Coordination note. CHUNK-09 must include the canonical schema above in its Section 9 rendering. The brief is the contract. If CHUNK-09 ships with different wording, CHUNK-12 follows CHUNK-09 (CHUNK-09 owns the contract).

---

## 3. File-by-file breakdown

All paths relative to repo root.

### Extension host

- **`extension/src/result/resultParser.ts`** (new)
  - Pure function. Input: raw markdown string + a `harnessIdentity` hint. Output: `ParsedResult`.
  - Section-header-based markdown parser. Lenient. See § 4.
  - No I/O, no VS Code APIs. Unit-testable in isolation.

- **`extension/src/result/resultStore.ts`** (new)
  - Bridge to CHUNK-03's memory store. Writes a `ResultMemoryEntry` linked (via `kind: "result-of"`) to its source Execution Memory entry.
  - Atomic-ish: parser first → git probe → single SQL insert + raw-text blob on disk under `.deliveryos/results/<uuid>.md`.

- **`extension/src/result/gitChanges.ts`** (new)
  - Probes `git diff --name-only HEAD` in the workspace root via `child_process.execFile` (NOT `exec` — no shell, no injection surface).
  - Returns `FilesChangedList` (a `{ path, status }[]` plus a top-level `gitAvailable: boolean` flag).
  - Also runs `git status --porcelain=v1 -z` to catch untracked files the harness created (untracked files do not show in `diff --name-only HEAD`).
  - If `git` is not on PATH or the workspace is not a git repo, returns `{ gitAvailable: false, files: [] }`. Result capture proceeds with a warning surfaced in the Result Detail panel.

- **`extension/src/panels/result/resultHost.ts`** (new)
  - Owns the Result Detail webview panel (one panel per result; reuses existing panels on re-show).
  - Owns the Paste-fallback webview panel (singleton; reopened on demand).
  - Handles webview ↔ extension messages: `result.show`, `result.pasteFallback`, `result.acknowledge`.
  - Subscribes to CHUNK-11's `onResultMdReady` event (an `EventEmitter<ResultMdReadyEvent>` exported from the handoff watcher). On fire, runs `extension/src/result/captureFlow.ts`.

- **`extension/src/result/captureFlow.ts`** (new)
  - The end-to-end capture pipeline (read file → parse → git probe → persist → reveal in tree → open Result Detail panel).
  - Exposed as `captureFromHandoff(briefId, resultMdUri)` and `captureFromPaste(briefId, rawText, harnessIdentityHint)`.
  - Reads `result.md` via `vscode.workspace.fs.readFile` (NOT `fs.promises.readFile` — workspace.fs handles virtual workspaces and remote dev).
  - The same function path handles paste — so the paste fallback is genuinely identical, not a near-duplicate.

- **`extension/src/tree/executeTreeProvider.ts`** (extended, owned by CHUNK-11)
  - **Coordination ask:** CHUNK-11's tree provider must accept child-node contributions from CHUNK-12. CHUNK-12 registers a `ResultTreeContributor` that, when expanded under a brief node, queries Result Memory entries linked to that brief and yields one tree item per result. Sort: newest first. Icon: `pass` / `partial` / `fail-parse` (the last for low-confidence parses; CHUNK-13 will repaint these once the diff verdict exists).

### Webview

- **`webview/src/panels/result/main.tsx`** (new)
  - Entry point. Reads `panelKind` (`"detail" | "paste"`) from initial state injected by the extension. Mounts `ResultApp` with the appropriate sub-component.

- **`webview/src/panels/result/ResultApp.tsx`** (new)
  - Router-of-one. Switches between `<ResultDetail/>` and `<PasteFallback/>` based on `panelKind`.

- **`webview/src/panels/result/ResultDetail.tsx`** (new)
  - Renders a `ParsedResult` + git-changes list.
  - Sections rendered: Summary / Files Changed (parsed) / Files Changed (git ground truth) / Tests Added / Tests Run / Risks / Unresolved Questions / Raw text (collapsible).
  - When parse confidence is `low`, banner: "Parser could not detect expected sections — showing raw output. Review and consider re-running with the canonical result schema."
  - When `gitAvailable === false`, banner: "git not available — file changes shown reflect harness self-report only."
  - "Acknowledge result" button — sends `result.acknowledge` to the extension. (In CHUNK-12 this only flips an `acknowledgedAt` field on the Result Memory entry; CHUNK-13 will gate the diff feature on this.)

- **`webview/src/panels/result/PasteFallback.tsx`** (new)
  - Textarea + brief selector (defaults to the most recent unhandled brief from Execution Memory) + harness-identity radio (Claude Code / Codex / Other).
  - "Parse and store" button — sends `result.pasteFallback` with the raw text. The extension routes the same text through `captureFromPaste`, which uses the same parser path.

### Contracts

- **`contracts/src/result.ts`** (new)
  - Defines all wire types and the three message names shared between extension and webview (see § 5).
  - Re-exports `ResultMemoryEntry` from `contracts/src/memory.ts` (which CHUNK-03 owns; CHUNK-12 does not redefine memory schemas).

---

## 4. Parser design

### Goals

1. Extract sections defined in the brief's Section 9 schema (above) when the harness obeys.
2. Never lose data — always preserve raw text.
3. Never throw — even a single malformed regex match must not crash the capture pipeline.
4. Emit a `confidence: "high" | "medium" | "low"` so the UI can hint the user.

### Confidence rubric

- **`high`** — all six canonical headers found, in expected order, each with at least one line of content under it.
- **`medium`** — at least 3 of 6 canonical headers found, OR all six found but some empty.
- **`low`** — fewer than 3 canonical headers found. UI shows raw text prominently; CHUNK-13 still consumes the git-ground-truth files list but should annotate its verdict as "advisory" when parse confidence is `low`.

### Section-header regex

The parser walks the markdown line by line and groups by detected H1/H2 boundaries. The matching is generous on whitespace, ordinal numbers, and the canonical noun:

```ts
// Match "## 1. Summary of Changes", "## Summary of Changes",
// "## Summary", "## 1.  Summary  of  changes", etc.
const SECTION_HEADER = /^#{1,3}\s+(?:\d+\.\s+)?(?<title>.+?)\s*$/;

// Each canonical section maps to a set of fuzzy title patterns
// (lowercased, whitespace-normalised, accent-stripped before comparison).
const CANONICAL_SECTIONS = [
  { id: "summary",     patterns: [/^summary(\s+of\s+changes)?$/] },
  { id: "filesChanged", patterns: [/^files\s+changed$/, /^files$/, /^changed\s+files$/] },
  { id: "testsAdded",  patterns: [/^tests?\s+added(\s+or\s+updated)?$/, /^new\s+tests?$/] },
  { id: "testsRun",    patterns: [/^tests?\s+run$/, /^test\s+results?$/] },
  { id: "risks",       patterns: [/^risks?$/, /^known\s+risks?$/] },
  { id: "questions",   patterns: [/^unresolved\s+questions?$/, /^open\s+questions?$/, /^questions?$/] },
];
```

The parser never *requires* H2 specifically — `# Summary` and `### Summary` both work. The brief tells the harness to use H2; the parser is forgiving so a single off-by-one in the harness's output does not blow up capture.

### Files-Changed list parsing

Under the "Files Changed" section, the parser accepts:

- Markdown list items: `- src/foo.ts`, `* src/foo.ts`, `1. src/foo.ts`
- Optional trailing status tag: `- src/foo.ts (new)`, `- src/foo.ts — modified`, `- src/foo.ts: deleted`
- Bare paths on their own lines

Each entry is normalised to `{ path: string, claimedStatus: "new" | "modified" | "deleted" | "unknown" }`. The list is **stored in the Result Memory entry separately from the git ground-truth list** — never silently merged. § 5's `FilesChangedList` type captures both.

### Output

```ts
ParsedResult {
  confidence: "high" | "medium" | "low";
  sections: {
    summary?: string;            // prose paragraph
    filesChangedClaimed?: { path: string; claimedStatus: string }[];
    testsAdded?: string[];       // raw bullet lines
    testsRun?: string[];         // raw bullet lines, parser does NOT try to extract pass/fail counts in MVP
    risks?: string[];
    questions?: string[];
  };
  missingSections: string[];     // e.g. ["testsRun", "risks"]
  rawText: string;               // the unmodified input
}
```

Note: `testsRun` parsing is intentionally shallow in MVP. Extracting structured pass/fail counts is deferred to CHUNK-14.

---

## 5. Key interfaces and types

All types live in `contracts/src/result.ts` (or its memory-schema imports from CHUNK-03).

```ts
// contracts/src/result.ts

import type { ResultMemoryEntry } from "./memory"; // owned by CHUNK-03

export type ParseConfidence = "high" | "medium" | "low";

export interface ParsedResult {
  confidence: ParseConfidence;
  sections: {
    summary?: string;
    filesChangedClaimed?: ClaimedFileChange[];
    testsAdded?: string[];
    testsRun?: string[];
    risks?: string[];
    questions?: string[];
  };
  missingSections: string[];
  rawText: string;
}

export interface ClaimedFileChange {
  path: string;
  claimedStatus: "new" | "modified" | "deleted" | "unknown";
}

export interface GitFileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "untracked";
}

export interface FilesChangedList {
  gitAvailable: boolean;       // false if git is missing or not a repo
  fromGit: GitFileChange[];    // authoritative — CHUNK-13 consumes this
  fromHarness: ClaimedFileChange[]; // for cross-check + UI display
}

export type HarnessIdentity = "claude-code" | "codex" | "other";

// Persisted shape (extends CHUNK-03's ResultMemoryEntry)
export interface ResultMemoryRecord extends ResultMemoryEntry {
  briefId: string;                  // FK → Execution Memory entry
  harnessIdentity: HarnessIdentity;
  capturedAt: string;               // ISO-8601
  source: "watcher" | "paste";
  parsed: ParsedResult;
  filesChanged: FilesChangedList;
  rawTextPath: string;              // .deliveryos/results/<uuid>.md
  acknowledgedAt?: string;
}

// Webview ↔ extension messages (extends contracts/src/messages.ts from CHUNK-02)
export type ResultMessage =
  | { type: "result.show"; resultId: string }                              // ext → webview
  | { type: "result.pasteFallback"; briefId: string;
      rawText: string; harnessIdentity: HarnessIdentity }                  // webview → ext
  | { type: "result.acknowledge"; resultId: string };                      // webview → ext
```

These three message names are the **only** new contracts CHUNK-12 introduces. CHUNK-13 will add `diff.*` messages later; CHUNK-12 does not pre-emptively define them.

---

## 6. Data model touched

- **Result Memory** (CHUNK-03 schema). One new row per capture. Linked to its **Execution Memory** entry via `links: [{ kind: "result-of", targetId: briefId }]` — the link type CHUNK-03 reserves for this edge.
- **Execution Memory** (CHUNK-03 schema). Read-only here. The capture flow looks up the brief by `briefId` to confirm it exists; CHUNK-12 never mutates Execution Memory.
- **No new tables.** CHUNK-12 reuses CHUNK-03's `result_memory` table and the shared `links` edge table.
- **On-disk artefact.** Raw harness text persisted at `.deliveryos/results/<uuid>.md` (under the workspace memory directory CHUNK-03 owns). `ResultMemoryRecord.rawTextPath` points to it. This keeps SQL rows small.

> Coordination ask. CHUNK-03 must reserve `.deliveryos/results/` as part of the memory directory layout it owns. If CHUNK-03's spec lands without this subdirectory, CHUNK-12's Prompt 3 audit must flag it.

---

## 7. VS Code APIs used

- `vscode.workspace.fs.readFile(uri)` — read `result.md` content. Preferred over `node:fs` for virtual / remote workspaces.
- `vscode.workspace.workspaceFolders[0].uri` — to locate the workspace root for the git probe and for resolving `.deliveryos/results/`.
- `child_process.execFile("git", ["diff", "--name-only", "HEAD"], { cwd })` — git ground truth. **`execFile`, not `exec`** — no shell interposed, no quoting bugs.
- `child_process.execFile("git", ["status", "--porcelain=v1", "-z"], { cwd })` — pick up untracked files.
- `vscode.window.createWebviewPanel(...)` — both Result Detail and Paste-fallback panels. Reuses the CSP + messenger plumbing from CHUNK-02.
- `vscode.EventEmitter<ResultMdReadyEvent>` — consumes the event CHUNK-11 fires from its `FileSystemWatcher`. CHUNK-12 does not own a watcher.
- `vscode.commands.registerCommand("deliveryos.result.openPasteFallback", ...)` — surfaces the paste panel from the command palette and from a button on the brief node's context menu.
- `vscode.window.showWarningMessage(...)` — surfaces "git not available" warnings.
- No use of `vscode.tasks` — we want stdout, not task lifecycle.
- No use of `Terminal.shellIntegration` — CHUNK-11 already declared this nice-to-have; CHUNK-12 does not depend on it.

---

## 8. Step-by-step implementation outline

1. **Contract types first.** Add `contracts/src/result.ts` with `ParsedResult`, `FilesChangedList`, `ResultMemoryRecord`, the three message types, and `HarnessIdentity`. Export from `contracts/src/index.ts`.
2. **Parser.** Implement `extension/src/result/resultParser.ts`. Unit tests against:
   - The canonical example (a generated `result.md` matching the schema in § 2).
   - A real Claude Code output captured during CHUNK-11 dogfooding.
   - A real Codex output captured during CHUNK-11 dogfooding.
   - A degenerate output (single paragraph, no headers) — must return `confidence: "low"` and a non-empty `rawText`.
3. **Git probe.** Implement `extension/src/result/gitChanges.ts`. Unit tests using a fixture repo (jest's `tmp` dir + `git init` + a couple of synthetic commits and an unstaged change).
4. **Result store.** Implement `extension/src/result/resultStore.ts`. Writes one row via CHUNK-03's memory store API + writes the raw text blob under `.deliveryos/results/`.
5. **Capture flow.** Implement `extension/src/result/captureFlow.ts` — orchestrates parser → git probe → store → fire `onResultCaptured` event for the tree provider.
6. **Wire the watcher.** Subscribe `captureFlow.captureFromHandoff` to CHUNK-11's `onResultMdReady` event during extension activation.
7. **Result Detail webview.** Build `webview/src/panels/result/{main.tsx,ResultApp.tsx,ResultDetail.tsx}`. Render the parsed sections + the two file lists + a collapsible raw-text view. Use the CSP and messenger from CHUNK-02.
8. **Paste-fallback webview.** Build `PasteFallback.tsx`. Add a command-palette command and a context-menu action on brief nodes. Wire `result.pasteFallback` to `captureFlow.captureFromPaste`.
9. **Host panel.** Implement `extension/src/panels/result/resultHost.ts` — singleton paste panel, per-result detail panel, message routing.
10. **Tree integration.** Register a Result child contributor with CHUNK-11's `executeTreeProvider`. On `onResultCaptured`, call `treeProvider.refresh(briefNode)` so the new result appears under its brief without a window reload.
11. **End-to-end smoke test.**
    - Run the Bug Triage demo project's brief through `claude` in the integrated terminal.
    - Watch for the result to appear in the tree.
    - Open the Result Detail panel; confirm Summary, Files Changed (claimed), Files Changed (git), Risks all render.
    - Repeat with `codex`.
    - Repeat with the paste fallback by pasting the same output into a fresh session.
12. **Doc updates** — none in this chunk; the doc updates for PRD/BUILD-PLAN/architecture land in Prompt 4.

---

## 9. Test plan

### Unit

- `resultParser.test.ts` — 6+ cases:
  - Canonical-schema input → `confidence: "high"`, all six sections populated.
  - Missing "Tests Run" + "Risks" → `confidence: "medium"`, `missingSections` populated.
  - One H3-only heading variant → still detected, `confidence: "high"`.
  - Pure prose (no headers) → `confidence: "low"`, `rawText` preserved.
  - Files-Changed list with mixed bullet styles (`-`, `*`, `1.`) → all parsed.
  - Files-Changed list with status tags in three styles (`(new)`, `— modified`, `: deleted`) → all parsed with `claimedStatus` correct.
- `gitChanges.test.ts` — 4+ cases against a tmp repo:
  - Clean repo → empty list.
  - One modified tracked file → `status: "modified"`.
  - One new untracked file → `status: "untracked"`.
  - Outside a git repo → `gitAvailable: false`, no throw.

### Integration

- `resultStore.test.ts` — round-trip: parse → persist → re-read; verify link edge exists in CHUNK-03's `links` table with `kind: "result-of"`.
- `captureFlow.test.ts` — full pipeline with a fake `result.md` URI; asserts that the tree refresh event fires.

### End-to-end (manual)

- Real `claude` binary in the integrated terminal against a synthetic brief — verify Result Memory entry created within 2 seconds of `result.md` write.
- Real `codex` binary, same.
- Paste fallback path with the same raw text — verify identical Result Memory shape (modulo `source: "paste"`).
- Validate parser against **3+ real harness outputs** — the canonical mitigation for parser fragility called out in Risks. Capture these outputs and check them into `extension/src/result/__fixtures__/` for regression.

### Verification (the chunk's "Done when")

- A harness run writing `result.md` produces a stored, parsed Result Memory entry linked to its brief.
- The paste-mode fallback writes the same shape.
- The "files actually changed" list is sourced from `git diff --name-only HEAD` (plus `git status --porcelain` for untracked) — NOT from the harness's self-report alone.

---

## 10. Risks, edge cases and open questions

### Risks

- **Parser fragility.** Harnesses are non-deterministic and will sometimes ignore the Section 9 schema, especially if their internal system prompt overrides DeliveryOS's instruction. **Mitigations:**
  1. CHUNK-09 must explicitly enumerate the canonical header schema in the brief's Section 9 text (this is the contract).
  2. The parser is lenient and never throws.
  3. The `confidence` flag surfaces low-quality parses to the user.
  4. Raw text is always preserved on disk so nothing is lost.
  5. Validate against 3+ real outputs before merging.

- **`git` not present on the user's machine.** Rare on a developer machine but not impossible (e.g. sandboxed dev container, Windows without Git for Windows). **Mitigation:** `gitAvailable: false` flag propagates to UI and to the persisted record; CHUNK-13 will mark its verdict "advisory" when this is the case.

- **`result.md` written to disk before all sections are complete** (the harness is still streaming). CHUNK-11's 250 ms debounce on the watcher covers most cases. If it doesn't, the parser sees a partial file and emits `confidence: "low"`. **No re-parse on subsequent `onDidChange`** — re-parsing would create duplicate Result Memory entries. Instead, the FIRST settled `onDidChange` after debounce wins; later writes are ignored unless they happen >30 s later (treated as a separate run; new entry).

- **Atomic-rename writes** (the harness writes to `result.md.tmp` then renames). On macOS / Linux this fires `onDidCreate` then nothing further; on Windows it may fire `onDidChange` only. CHUNK-11 handles both. CHUNK-12 inherits whichever single event survives the debounce.

- **Workspace with no open folder.** The `Run with Claude Code` button in CHUNK-11 is already disabled without a workspace folder, so this is a CHUNK-11 concern, but CHUNK-12 defensively bails if `workspaceFolders` is empty.

- **Multi-root workspaces.** MVP: capture against the FIRST workspace folder (same convention as CHUNK-11). Open question carried forward (see below).

### Edge cases

- **`result.md` is empty.** Parser returns `confidence: "low"`, `rawText: ""`, `missingSections` contains all six. Still persisted (so the user sees that the harness produced nothing).
- **`result.md` contains `# DeliveryOS Result` then nothing.** Same as above.
- **Brief with no preceding Execution Memory entry** (the user manually dropped a `result.md` in a folder that DeliveryOS never executed against). Capture flow detects no matching brief, opens the Paste-fallback panel with a notice: "Which brief is this result for?".
- **Multiple results for the same brief** (re-runs). Allowed — Result Memory is append-only per CHUNK-03's schema. Tree shows newest first.
- **Very large `result.md`** (>1 MB). Parser is line-based and streams; no full-document regex. Webview lazy-renders raw text inside a collapsible. Hard cap: 10 MB; above that, store the file on disk and surface a "result truncated for display" notice.

### Open questions (defer to Prompt 3 audit)

- **Multi-root workspaces.** Should the result watcher cover all roots? MVP says no. Re-visit when a user actually hits it.
- **Brief ↔ result matching by file name.** Today CHUNK-11 emits the brief ID alongside the watcher event. If a user manually drops in a `result.md` for a brief never executed, we can't match it. Acceptable for MVP; the paste fallback covers it.
- **Acknowledge semantics.** In CHUNK-12 "acknowledge" just sets a timestamp. CHUNK-13 will decide whether "acknowledge" gates the diff feature. Spec note for CHUNK-13: do not require an acknowledge before computing the diff; require it before exporting release evidence (CHUNK-14).

---

## 11. Explicit dependencies

### Inbound (depends on)

- **CHUNK-11** — emits the `onResultMdReady` event from the `FileSystemWatcher`. Provides `.deliveryos-handoff/result.md` path constants. Owns the EXECUTE tree provider that CHUNK-12 extends.
- **CHUNK-09** — defines the Execution Brief markdown schema, including Section 9's instruction to the harness that fixes the canonical result.md headers. CHUNK-12's parser targets exactly this schema.
- **CHUNK-03** — Memory store, Result Memory table, `links` edge table with `kind: "result-of"`. CHUNK-12 imports the schema; never redefines it. Reserves `.deliveryos/results/` subdirectory.
- **CHUNK-02** — Webview foundation: Vite + React + Tailwind + CSP + messenger. CHUNK-12's two webviews (Result Detail + Paste fallback) are plain consumers of this foundation. `contracts/` package conventions for message types.

### Outbound (exposes)

- **`ResultMemoryRecord`** with parsed sections, raw text, harness identity, timestamp, and a `FilesChangedList` whose `fromGit` is the canonical "files actually changed" list. **CHUNK-13** consumes this for the Allowed/Forbidden diff.
- **`onResultCaptured`** event — fired after persistence; CHUNK-13's diff engine listens and computes its verdict; CHUNK-14's verification engine listens for its own check.
- **Paste-fallback panel** — also reachable from CHUNK-13/14 if those chunks need to surface "can't find a result, paste one" prompts.

### Shared contracts honoured

- **Memory schema** — CHUNK-03's. No redefinition.
- **Webview message contracts** — added as a slice in `contracts/src/result.ts`. Three new message types only.
- **Execution Brief markdown schema** — CHUNK-09's; CHUNK-12 reads Section 9's text via the persisted brief but does not parse it (the brief's parser is CHUNK-09's; CHUNK-12 parses only `result.md`).
- **Handoff directory layout** — CHUNK-11's. CHUNK-12 reads `.deliveryos-handoff/result.md` only.
- **`.deliveryos/` memory directory layout** — CHUNK-03's. CHUNK-12 writes only inside `.deliveryos/results/`.
- **Managed delimiter block syntax** — not used in CHUNK-12 (no CLAUDE.md/AGENTS.md edits here).

---

## 12. Trimmed MVP scope reminder

CHUNK-12 stops at "result is parsed, files actually changed are known, Result Memory entry exists, link to brief exists, user can see all of it in a panel." It does **not** judge whether the harness obeyed the brief — that is **CHUNK-13**'s diff. It does **not** judge whether the tests passed against the test specification — that is **CHUNK-14**'s verification. It does **not** promote any harness-suggested design or codebase decisions into Design / Codebase Memory — that is also **CHUNK-14**.

The single load-bearing output of CHUNK-12 for downstream chunks is the **`FilesChangedList.fromGit`** field. Get that right and CHUNK-13 has what it needs.
