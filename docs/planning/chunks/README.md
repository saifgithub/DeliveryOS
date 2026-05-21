# Chunk specs — Phase A, Prompt 2

This directory holds one detailed implementation spec per chunk from
`docs/planning/part-1-plan.md`. The 16 specs together cover the whole
trimmed MVP — BUILD-PLAN Phases 0 through 4. They were produced by 16
parallel subagents, each in its own git worktree, then folded back into
`main`.

**Status:** Prompt 2 complete. Prompt 3 (cohesion audit) is next.
Until `validation-report.md` (Prompt 3) and `READY.md` (Prompt 4) land,
these specs are **draft** — expected to drift during iteration.

---

## Chunk index

| ID | Spec | Title | Phase | Effort (session-days) | Direct deps |
|---|---|---|---|---|---|
| 01 | [chunk-01-scaffold.md](chunk-01-scaffold.md) | Extension scaffold + activity-bar + static stage tree | 0 / Wk 1 | 4–6 | — |
| 02 | [chunk-02-webview-foundation.md](chunk-02-webview-foundation.md) | Webview foundation: Vite + React + Tailwind + CSP + messenger | 0 / Wk 2a | 3–5 | 01 |
| 03 | [chunk-03-memory-store.md](chunk-03-memory-store.md) | Memory store: `sql.js` + workspace `.deliveryos/` + schema | 0 / Wk 2b | 3–4 | 01, 02 |
| 04 | [chunk-04-multi-editor-verify.md](chunk-04-multi-editor-verify.md) | Multi-editor sideload + install script + GitHub Release | 0 / Wk 2 polish | 1–2 | 01, 02, 03 |
| 05 | [chunk-05-discover-capture.md](chunk-05-discover-capture.md) | Raw idea + Discovery interview | 1 / Wk 3 | 4–5 | 02, 03 |
| 06 | [chunk-06-prd-editor.md](chunk-06-prd-editor.md) | Draft PRD + PRD editor | 1 / Wk 4 | 4–5 | 02, 03, 05 |
| 07 | [chunk-07-requirements-catalogue.md](chunk-07-requirements-catalogue.md) | Requirements catalogue | 1 / Wk 5 | 4–5 | 02, 03, 06 |
| 08 | [chunk-08-test-designer.md](chunk-08-test-designer.md) | Test Designer specialist | 1 / Wk 6 | 3–4 | 02, 03, 07 |
| 09 | [chunk-09-execution-brief-composer.md](chunk-09-execution-brief-composer.md) | Execution Brief composer (10-section schema) | 2 / Wk 7 | 4–5 | 02, 03, 07, 08 |
| 10 | [chunk-10-harness-profiles.md](chunk-10-harness-profiles.md) | Harness profiles (Claude Code + Codex) + CLAUDE/AGENTS update | 2 / Wk 8 | 4 | 02, 03, 09 |
| 11 | [chunk-11-file-handoff-watcher.md](chunk-11-file-handoff-watcher.md) | File handoff + terminal integration + result watcher | 2 / Wk 9 | 4–5 | 02, 03, 09, 10 |
| 12 | [chunk-12-result-capture.md](chunk-12-result-capture.md) | Result capture (parse `result.md` + paste fallback) | 3 / Wk 10 | 3–4 | 02, 03, 09, 11 |
| 13 | [chunk-13-allowed-forbidden-diff.md](chunk-13-allowed-forbidden-diff.md) | **Allowed/Forbidden diff + Claude Code PreToolUse hook ⭐** | 3 / Wk 11 | 4–5 | 02, 03, 09, 10, 11, 12 |
| 14 | [chunk-14-verification-release.md](chunk-14-verification-release.md) | Verification + memory update + release evidence | 3 / Wk 12 | 5 | 02, 03, 08, 12, 13 |
| 15 | [chunk-15-bug-triage-demo.md](chunk-15-bug-triage-demo.md) | Bug Triage demo end-to-end | 4 / Wk 13 | 4–5 | all prior |
| 16 | [chunk-16-demo-recording.md](chunk-16-demo-recording.md) | Demo recording + README + essay + GitHub Release `v0.1.0` | 4 / Wk 14 | 4–5 | 15, 04 |

⭐ = headline / unique feature.

Phase boundaries (demoable states):

- **End of Phase 0** (after CHUNK-04): "Installed in VS Code and Cursor from the same file."
- **End of Phase 1** (after CHUNK-08): "Type an idea → PRD → requirements → test specs."
- **End of Phase 2** (after CHUNK-11): "Click a button → Claude Code runs against the brief."
- **End of Phase 3** (after CHUNK-14): "Full loop, idea to verified release, diff feature catches a violation live." ← **minimum acceptable ship** if timeline slips.
- **End of Phase 4** (after CHUNK-16): Shipped — public proof of work.

---

## Cross-chunk contracts

Every chunk that needs one of these **imports** it from the defining
chunk. No chunk redefines.

### 1. Memory schema (defined by CHUNK-03)

- **Polymorphic SQLite tables**: `memory_entries(id, type, title, payload_json, created_at, updated_at)`, `memory_links(from_id, to_id, kind)`, `_schema_version(v)`.
- **Bundle**: `sql.js` (WASM) shipped inside the VSIX. Not `better-sqlite3` (native ABI breakage across editor forks — research finding #1).
- **Canonical `MEMORY_TYPES`** (9-entry discriminated union, owned by CHUNK-03 via `contracts/src/memory.ts`):
  1. `intent` — also carries Discovery (folded into payload).
  2. `requirement` — also carries the PRD (when `payload.kind === 'prd'`).
  3. `design`
  4. `codebase`
  5. `execution`
  6. `result` — payload includes optional `diffOutcome` slot (populated by CHUNK-13).
  7. `verification` — payload includes `bypasses[]` (no separate `bypass` type).
  8. `release`
  9. `test-spec` (CHUNK-08-defined, declared in CHUNK-03's tuple).

  There are **no** separate `discovery`, `prd`, or `bypass` memory types. CHUNK-14's walker reads `intent` rows for discovery answers and reads `requirement` rows discriminating on `payload.kind` for PRDs.
- **Canonical `MemoryLink.kind` taxonomy** (owned by CHUNK-03 via `contracts/src/links.ts`) — 10 kinds (reduced from 13 in DOS:O4 iteration-3 audit):
  - `derives-from` — present-tense spelling (e.g. Requirement → PRD section; Execution → Requirement, replacing the dropped `targets`). **Not** `derived-from`.
  - `verifies` — Verification → Requirement. Covers both the active-verdict scope and the "we made a verdict here" history edge (the previously separate `subject-of-decision` was collapsed).
  - `evaluates` — Verification → Test Spec; Verification → Result.
  - `produced` — Execution → Result. **Not** `result-of`.
  - `supersedes` — versioned memory → predecessor (e.g. brief versioning).
  - `includes` — Release → Requirement.
  - `reworks` — Result → prior Result.
  - `has-test-spec` — Requirement → Test Spec.
  - `derived-from-verification` — Design/Codebase/Requirement updates → Verification.
  - `releases` — Release → Verification.

  Retired in DOS:O4 iteration-3 audit: `targets` (Execution → Requirement is now a `derives-from` hop), `references-codebase` (no Codebase Memory writer exists in v1), `subject-of-decision` (folded into `verifies`).
- **`MemoryStore` API**: `create`, `read`, `update`, `list(type)`, `link(from, to, kind)`, `walk(from, kind)`.
- **Workspace memory layout**: `<workspace>/.deliveryos/memory.sqlite` + `<workspace>/.deliveryos/memory/<type>/<id>.md` (markdown bodies side-by-side with the indexed SQLite).
- **Cross-project store** (stubbed in CHUNK-03; deferred): `globalStorageUri/harness.sqlite`.

Consumers: every chunk from CHUNK-05 onwards.

### 2. Webview message contracts package (defined by CHUNK-02)

- **`contracts/` workspace package** — one file per panel under `contracts/src/<panel-name>.ts`. Each chunk that adds a panel **adds its slice**; never duplicates an existing message type.
- **Transport**: `vscode-messenger` 0.4.x (pinned with caret). Host-side `HostMessenger` wraps it so a future transport swap is one-file.
- **`RequestType`/`NotificationType` convention**: method strings as `<panel>/<verb>`.
- **CSP**: `default-src 'none'; img-src ${cspSource} https: data:; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; script-src 'nonce-${nonce}'; connect-src ${cspSource};` — fresh nonce on every render (including serializer restore).
- **No HMR / Vite dev server** for MVP. Production build only.
- **UI library**: Radix UI primitives + Tailwind + Lucide React (research finding #2 — `@vscode/webview-ui-toolkit` is deprecated). Radix is deferred to CHUNK-05 (first real panel); CHUNK-02 only stands up Tailwind + the "hello" smoke panel.

Consumers: every UI chunk.

### 3. Execution Brief markdown schema (defined by CHUNK-09)

- **`BRIEF_SCHEMA_VERSION = 1`** + canonical `BRIEF_SECTION_NAMES` exported from `extension/src/brief/briefMarkdown.ts`.
- **10 sections, H2 headings, numeric prefix, frozen**:
  1. Objective
  2. Approved Requirement
  3. Business Intent
  4. Approved Design Context
  5. Existing Codebase Context
  6. Test-First Specification
  7. Allowed Changes
  8. Forbidden Changes
  9. Expected Output
  10. Completion Criteria
- **Parser**: strict on section IDs/order/names + frontmatter required keys; lenient on whitespace, CRLF, H1 case. Typed `BriefMarkdownParseError.kind` for hard-failure modes.
- **Cheap entry-point** `parseAllowedForbidden(md)` for CHUNK-13's diff (skips full validation).
- **Allowed / Forbidden glob syntax**: `picomatch` semantics — `**`, `?`, `[…]`, `{…}`, leading `!` negation, POSIX paths workspace-relative. Empty Forbidden uses the `- (none)` sentinel.
- **Brief is immutable once saved.** New versions = new IDs linked via `memory_links` kind `"supersedes"`.
- **CHUNK-13 diff classifies every touched file into one of four buckets** (owned by CHUNK-13; listed here so consumers know the contract):
  - `allowed-and-touched` — OK.
  - `allowed-but-not-touched` — informational; brief possibly over-scoped (not a failure).
  - `forbidden-but-touched` — FAIL.
  - `unclassified-but-touched` — WARNING; touched file is in neither Allowed nor Forbidden. Fail-open with a visible warning rather than a hard fail.

Consumers: CHUNK-10 (profile rendering), CHUNK-11 (handoff write), CHUNK-13 (diff parsing).

### 4. Harness Profile schema (defined by CHUNK-10)

- YAML/TS shape from `docs/architecture/harness-profiles.md`:
  `name, display_name, instruction_file, handoff_dir, brief_style, include_test_commands, include_lint_commands, include_forbidden_changes, output_format, mcp_capable`.
- **Added in iteration 1** (still owned by CHUNK-10):
  - `command_template?: string` — interpolated launch command with placeholders `${BRIEF_PATH}`, `${RESULT_PATH}`, `${WORKSPACE}`.
  - `harness_version_pin?: string` — optional version pin so a profile can record which CLI version it was validated against.
- **Two MVP profile literals**: `claude-code` (`instruction_file: CLAUDE.md`, `handoff_dir: .deliveryos-handoff/`, `mcp_capable: true`) and `codex` (`instruction_file: AGENTS.md`, `handoff_dir: .deliveryos-handoff/`, `mcp_capable: true`).
- **Codex command shape** uses `-o .deliveryos-handoff/result.md` (research finding #4).
- **Claude Code result.md**: instruction-driven (CLAUDE.md tells Claude Code to write the file; no native `-o` flag exists).

Consumers: CHUNK-11 (handoff), CHUNK-13 (PreToolUse hook installer), CHUNK-15 (demo), CHUNK-16 (README/essay).

### 5. Managed delimiter block syntax (defined by CHUNK-10)

Three formats supported by the idempotent applier:

- **`md`** — Markdown files (`CLAUDE.md` / `AGENTS.md`):
  `<!-- DELIVERYOS:BEGIN --> ... <!-- DELIVERYOS:END -->`
- **`json`** — JSON files (`.claude/settings.json`):
  sentinel key `"deliveryos.managed": { ... }` (rejected line-comment markers; rationale in chunk-10 spec).
- **`gitignore`** — `.gitignore` files:
  `# DELIVERYOS:BEGIN ... # DELIVERYOS:END`
- **Idempotent applier** (`extension/src/profiles/managedBlock.ts`): `create` / `append-block` / `replace-block` / `noop` actions; byte-preservation outside the block; atomic write. Never silently rewrites a hand-edit inside the block — diff + Apply button.

Consumers: CHUNK-11 (CLAUDE.md/AGENTS.md update on first run), CHUNK-13 (`.claude/settings.json` PreToolUse hook registration), CHUNK-11/14 (`.gitignore` updates for `.deliveryos-handoff/current-*` etc.).

### 6. Handoff directory layout (defined by CHUNK-11)

- **Dotfile root**: `.deliveryos-handoff/` (research finding #6 — standardised; PRD § 18.Y reconciled in Prompt 4).
- **Layout is FLAT** — `current-*` and `result.md` are siblings inside `.deliveryos-handoff/`. There is **no** `current/` subdirectory.
- **`current-*` files and siblings** (regenerated each session, gitignorable):
  - `.deliveryos-handoff/current-execution-brief.md`
  - `.deliveryos-handoff/current-context-package.md`
  - `.deliveryos-handoff/current-test-specification.md`
  - `.deliveryos-handoff/current-verification-checklist.md`
  - `.deliveryos-handoff/memory-summary.md`
  - `.deliveryos-handoff/result.md` (NOT created upfront — harness writes it)
- **`history/<timestamp>-*` files** (committed audit trail per finding #8):
  - `.deliveryos-handoff/history/<timestamp>-execution-brief.md`
  - `.deliveryos-handoff/history/<timestamp>-result.md`
- **Constants** live in `extension/src/handoff/paths.ts` — all chunks import.
- **Result-watcher event**: `FileSystemWatcher` on `.deliveryos-handoff/result.md`, `onDidCreate` + `onDidChange`, 250ms debounce.
- **`onDidWriteTerminalData` not used** (research finding #12 — proposed-only API). `FileSystemWatcher` is the load-bearing completion signal.

Consumers: CHUNK-09 (writes brief into `current-*`), CHUNK-12 (consumes watcher event + reads `result.md`), CHUNK-13 (PreToolUse hook reads `current-execution-brief.md`), CHUNK-15 (demo flow).

### 7. Workspace `.deliveryos/` memory directory layout (defined by CHUNK-03)

- `.deliveryos/memory.sqlite`
- `.deliveryos/memory/<type>/<id>.md` — markdown bodies, one per memory entry
- `.deliveryos/releases/<release-id>.md` — Release Evidence (CHUNK-14)
- `.deliveryos/README.md` — user-facing explainer

Consumers: every memory-touching chunk.

### 8. `git diff --name-only HEAD` as ground truth (CHUNK-12 convention)

The **canonical "files actually changed" list** comes from `git diff --name-only HEAD`, **not** the harness's self-report. CHUNK-13's diff feature consumes this. Harness self-report is stored for context but never trusted alone.

---

## Notes from the fan-out

Decisions surfaced during Prompt 2 and how they resolved during the
Prompt 3 audit + Prompt 4 iteration-1 reconciliation:

1. **TestSpec memory type.** **RESOLVED in iteration 1** — `test-spec` is declared as the 9th entry of CHUNK-03's canonical `MEMORY_TYPES` tuple. `docs/architecture/memory-layers.md` reconciled in the Prompt 4 doc-update pass.
2. **Test-case form.** CHUNK-08 picked **markdown bullets with inline `Given:/When:/Then:` labels** for MVP. Carries forward — revisit at CHUNK-13 start if the diff parser needs structured atoms.
3. **`@vscode/webview-ui-toolkit` rejected.** Replaced by Radix UI + Tailwind + Lucide React (CHUNK-02). Radix usage starts at CHUNK-05.
4. **`sql.js` flush strategy.** CHUNK-03 went with explicit flush per mutation (simpler reasoning). Revisit if profiling flags write latency.
5. **JSON sentinel-key over line-comment markers** for `.claude/settings.json` managed block (CHUNK-10). Rationale: cleaner JSON, no JSONC dependency.
6. **PRD § 18.Y handoff-path inconsistency.** **RESOLVED in iteration 1** (Prompt 4 doc-update pass) — PRD now standardised on `.deliveryos-handoff/` matching CHUNK-11.
7. **No Monaco for the diff renderer.** CHUNK-10 and CHUNK-13 use the small `diff` package + a ~80-LOC unified-diff renderer. Reused twice.
8. **Memory updates are append-only** (CHUNK-14). Design / Codebase / Requirement updates create new entries linked via `derived-from-verification`, never edit in place. Keeps the audit chain clean.
9. **Diff-override flag** (CHUNK-14). User can override a FAIL verdict at verification time; the override is recorded inside the Verification payload's `bypasses[]` array (no separate `bypass` memory type) and requires ≥10-char justification.
10. **Link-kind taxonomy.** **RESOLVED in iteration 1; further reduced in DOS:O4 iteration-3 audit.** Canonical set lives in `contracts/src/links.ts` (owned by CHUNK-03). 10 canonical kinds (reduced from 13 — `targets`, `references-codebase`, `subject-of-decision` retired as zero-writer or redundant). The drifted strings (`result-of`, `derived-from`) have been replaced by their canonical equivalents (`produced`, `derives-from`).

### Out of scope, explicitly deferred

- **Memory Workspace UI panel** (PRD § 21) — deferred post-MVP. The canonical Memory store + per-stage tree-view rows are sufficient for the trimmed demo; a dedicated workspace panel is not on the Phase 0–4 path.

---

## Next steps

- **Prompt 3** — cohesion audit. Parallel audit subagents check for gaps, overlaps, interface mismatches, dependency problems, shared-contract drift, verification gaps, scope drift. Writes `docs/planning/validation-report.md`.
- **Prompt 4** — iterate until clean. Resolves blockers + majors. Folds the 12 research-driven changes from `part-1-plan.md` § "Research-driven changes" into PRD / BUILD-PLAN / ADR-0001 / `architecture/*.md`. Writes `docs/planning/READY.md`.
- **After `READY.md`**: Track R opens `DOS:R1` and picks a chunk to build.
