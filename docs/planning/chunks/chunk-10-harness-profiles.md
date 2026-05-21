# CHUNK-10 — Harness profiles (Claude Code + Codex) + suggested CLAUDE.md / AGENTS.md update

**Status:** Phase A planning spec (Prompt 2).
**BUILD-PLAN slot:** Phase 2, Week 8 (2026-07-13).
**Effort:** ~4 session-days.
**Defines (canonical, consumed by other chunks):**
1. **Harness Profile schema** — exact YAML/TS shape per `docs/architecture/harness-profiles.md`. Consumed by CHUNK-11 (file handoff) and CHUNK-13 (PreToolUse hook installer).
2. **Managed delimiter block syntax** — `<!-- DELIVERYOS:BEGIN --> ... <!-- DELIVERYOS:END -->` for markdown, and a `"deliveryos.managed"` sentinel-key convention for JSON. Reused by CHUNK-13 to install Claude Code's `.claude/settings.json` PreToolUse hook.

This spec is grounded in the trimmed MVP scope: **two profiles only — Claude Code and Codex.** Cursor, Generic, Replit/Lovable and other profiles are explicitly deferred.

---

## 1. Restated goal and scope

### Goal

Implement the two MVP harness profiles. Each profile takes the Execution Brief produced by CHUNK-09 (the immutable 10-section markdown document) and:

1. **Renders** it for the target harness's conventions, producing a per-profile rendered brief.
2. **Computes a suggested update** to the harness's repo-root instruction file (`CLAUDE.md` for Claude Code, `AGENTS.md` for Codex) — wrapped in a managed delimiter block, never destructive.
3. **Surfaces the suggested update as a diff** in the brief composer's "Suggested updates" tab, with an Apply button that writes the file. Never silent.

CHUNK-10 also **defines the schema and managed-block syntax** that CHUNK-11 and CHUNK-13 import. This is the canonical chunk for both.

### In scope

- `HarnessProfile` schema (TypeScript types + `contracts/` export).
- Two static profile records (Claude Code, Codex). MVP profiles are hard-coded; user-customisable profiles are deferred.
- A profile-aware brief renderer (`render.ts`) that takes the CHUNK-09 brief object and emits a rendered markdown string per profile. (The render is mostly a pass-through of the 10 sections plus a profile-specific header preamble; the section content itself is harness-neutral by design.)
- Managed delimiter block reader/writer/applier (`managedBlock.ts`) — idempotent, atomic, never silently rewrites outside the block.
- Suggested-updates computation (`suggestedUpdates.ts`) — produces the `SuggestedUpdate` objects (one per managed file) for the active profile. For Claude Code this is `CLAUDE.md` + a `.claude/settings.json` **stub** (registration only; the hook script lands in CHUNK-13). For Codex this is `AGENTS.md`.
- Webview UI in the brief composer: profile picker, render preview, suggested-updates tab with diff view, Apply buttons.
- Contracts package additions: `profiles.ts` with the `HarnessProfile`, `RenderedBrief`, `SuggestedUpdate`, `ManagedBlock` types and the `profile.*` message types.

### Out of scope

- Other profiles (Cursor, Generic, Replit/Lovable, Devin, Aider). Deferred — schema is forward-compatible.
- Auto-applying updates (no implicit writes; user always clicks Apply).
- The full PreToolUse hook **script** — CHUNK-10 registers the file path in the managed-block stub; CHUNK-13 owns hook generation.
- File handoff (writing `.deliveryos-handoff/current-execution-brief.md` into the workspace, terminal integration, result watcher) — CHUNK-11.
- Result parsing — CHUNK-12.
- Allowed/Forbidden diff against actual git changes — CHUNK-13.
- User-saved custom profiles in cross-project store — deferred; seam noted under § Data model.
- Monaco diff editor — explicitly avoided; we use the `diff` package and a tiny renderer (per part-1-plan.md Risks).
- Schema validation via JSON Schema / Ajv for profile records — profiles are hard-coded TS literals for MVP; runtime schema validation is not needed yet.

---

## 2. Harness Profile schema

The canonical YAML shape (transliterated to TypeScript in `extension/src/profiles/types.ts`) is taken **directly** from `docs/architecture/harness-profiles.md` § "Profile schema":

```yaml
name: claude-code                 # unique id, kebab-case
display_name: Claude Code         # user-visible label
instruction_file: CLAUDE.md       # repo-root file the harness reads for project instructions
handoff_dir: .deliveryos-handoff  # relative to workspace root (per research finding #6, dotfile form)
brief_style: structured-full      # how the renderer formats the brief
include_test_commands: true       # render the test command list in the brief preamble
include_lint_commands: true       # render the lint command list in the brief preamble
include_forbidden_changes: true   # always true for both MVP profiles; reserved for future Cursor (concise) profile
output_format: markdown           # the rendered brief mime; markdown for both MVP profiles
mcp_capable: true                 # whether the harness supports MCP servers (informational; MCP is post-MVP)
```

### Field-by-field semantics

| Field | Type | Purpose |
| --- | --- | --- |
| `name` | string (kebab-case) | Stable id used in messages, persisted brief metadata, telemetry. **Never rename without a migration.** Values for MVP: `claude-code`, `codex`. |
| `display_name` | string | Human label shown in profile picker, suggested-updates tab title, etc. |
| `instruction_file` | string (repo-relative path) | Repo-root file the harness reads for project instructions. Managed-block writes target this file. `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex. **Resolved against the workspace root, NOT against arbitrary user paths** — anti-traversal: path must not contain `..` segments after `path.normalize`. |
| `handoff_dir` | string (repo-relative path) | Where the brief and result files live. **Both MVP profiles use `.deliveryos-handoff/`** (research finding #6 standardises on the dotfile form). Stored on the profile so CHUNK-11 can read the constant from the profile, not hard-code it. |
| `brief_style` | `'structured-full' \| 'concise'` | Renderer style. **MVP only uses `structured-full`** — both profiles render all 10 sections. `concise` reserved for the future Cursor profile. |
| `include_test_commands` | boolean | If true, the renderer pulls test commands from the brief's Section 5 (Existing Codebase Context) into a top-of-brief command summary block. True for both MVP profiles. |
| `include_lint_commands` | boolean | As above for lint commands. True for both MVP profiles. |
| `include_forbidden_changes` | boolean | If true, render Section 8 (Forbidden Changes) verbatim. True for both MVP profiles. The flag exists so a future concise profile can omit it. |
| `output_format` | `'markdown'` | Output mime. Markdown for both MVP profiles. Reserved for future profiles that might emit JSON. |
| `mcp_capable` | boolean | Whether the harness natively supports MCP. **Informational only in MVP** — neither profile uses MCP yet (per PRD § 18.Y Mode 3, post-MVP). Recorded so the UI can later toggle an MCP server entry. |

> Versioning: per `docs/architecture/harness-profiles.md` final paragraph — profiles are version-pinned. For MVP we hard-code two profiles and pin them in code comments to the harness versions they were authored against ("Claude Code CLI 1.x as of 2026-Q2", "Codex CLI as of 2026-Q2"). No runtime version negotiation; if a future Claude Code release breaks the contract we ship a new extension version.

### The two MVP profiles (concrete)

**Claude Code:**

```yaml
name: claude-code
display_name: Claude Code
instruction_file: CLAUDE.md
handoff_dir: .deliveryos-handoff
brief_style: structured-full
include_test_commands: true
include_lint_commands: true
include_forbidden_changes: true
output_format: markdown
mcp_capable: true
```

**Codex:**

```yaml
name: codex
display_name: Codex
instruction_file: AGENTS.md
handoff_dir: .deliveryos-handoff
brief_style: structured-full
include_test_commands: true
include_lint_commands: true
include_forbidden_changes: true
output_format: markdown
mcp_capable: true
```

Both profiles share the same `handoff_dir` and `brief_style`. The differences live in (a) the `instruction_file` and (b) the **content of the suggested managed block** (Codex documents the `-o` flag, Claude documents the instruction-driven `result.md`, plus the `.claude/settings.json` stub).

---

## 3. File-by-file breakdown

### Extension host (`extension/src/profiles/`)

#### `extension/src/profiles/types.ts`

The canonical TypeScript shape of the Profile schema. Mirrors the YAML above 1:1.

- `export type ProfileName = 'claude-code' | 'codex';` — MVP-only union. Adding a profile means widening this union (forces a compile error at every switch point).
- `export type BriefStyle = 'structured-full' | 'concise';`
- `export type OutputFormat = 'markdown';` (single-member union for now; reserved for forward compatibility).
- `export interface HarnessProfile { … all 10 fields … }`
- `export interface RenderedBrief { profileName: ProfileName; briefId: string; markdown: string; renderedAt: string; }` — output of `render.ts`.
- `export interface ManagedBlock { file: string; begin: string; end: string; body: string; }` — output of `managedBlock.ts` reader.
- `export interface SuggestedUpdate { file: string; existingContent: string \| null; nextContent: string; managedBlock: ManagedBlock; action: 'create' \| 'append-block' \| 'replace-block' \| 'noop'; }` — output of `suggestedUpdates.ts`.

Re-exported from `contracts/` (see § 3.4) so the webview can import the same types.

#### `extension/src/profiles/registry.ts`

Hard-coded MVP profile records. Exports:

- `export const PROFILES: Record<ProfileName, HarnessProfile>` — keyed by `name`, value is the full `HarnessProfile`.
- `export function getProfile(name: ProfileName): HarnessProfile` — lookup helper; throws on unknown name.
- `export const PROFILE_LIST: HarnessProfile[]` — array form for the picker UI.

Profile literals are pinned with leading comments noting the harness CLI version. No runtime config; no I/O.

#### `extension/src/profiles/render.ts`

Takes a `ExecutionBrief` (CHUNK-09's parsed object) and a `HarnessProfile`, returns a `RenderedBrief`.

- `export function renderBrief(brief: ExecutionBrief, profile: HarnessProfile): RenderedBrief`
- The render is markdown-only for MVP. Output shape:

  ```
  # DeliveryOS Execution Brief
  ## Profile: {profile.display_name}
  ## Project: {brief.projectName}
  ## Requirement: {brief.requirementId} — {brief.requirementTitle}

  {if profile.include_test_commands or include_lint_commands: a small "## Commands" preamble block summarising test/lint commands pulled from Section 5}

  ## 1. Objective
  …
  ## 2. Approved Requirement
  …
  …
  ## 10. Completion Criteria
  …
  ```

- The 10 sections come straight from the CHUNK-09 brief; this chunk does **not** re-derive them. The renderer only adds the profile-specific header preamble and the optional `## Commands` block.
- `include_forbidden_changes: false` would drop Section 8 from the output. (Not exercised by MVP profiles; tested for the future-proofing case.)
- `brief_style: 'concise'` would drop Sections 3, 4, 5 (kept for the future Cursor profile; not exercised in MVP).

This file is **the only place** that knows how the profile flags translate into rendered output. CHUNK-11 and CHUNK-13 never re-render — they consume `RenderedBrief.markdown` or read the brief object directly.

#### `extension/src/profiles/managedBlock.ts` — **CANONICAL**

The reader/writer/applier for the managed delimiter block. **This file is the single source of truth for the delimiter syntax.** CHUNK-13's hook installer imports from here.

Exports:

- `export const BEGIN_MARKER_MD = '<!-- DELIVERYOS:BEGIN -->';`
- `export const END_MARKER_MD = '<!-- DELIVERYOS:END -->';`
- `export const SENTINEL_KEY_JSON = 'deliveryos.managed';` — for JSON files (see § 4 "JSON variant").
- `export function readManagedBlock(content: string, format: 'md' \| 'json'): ManagedBlock | null` — returns the existing block, or `null` if none found. Throws if multiple `BEGIN` markers found (the user broke our invariant).
- `export function buildManagedBlock(body: string, format: 'md' \| 'json'): string` — produces the delimited block (with a leading blank line if appending to existing content).
- `export function applyManagedBlock(existing: string \| null, body: string, format: 'md' \| 'json'): { next: string; action: SuggestedUpdate['action'] }` — idempotent applier:
  - If `existing` is `null` (file does not exist) → `action: 'create'`, `next` = managed block with a one-line file header comment ("This file is read by Claude Code at session start. The DeliveryOS-managed block below tells Claude Code how to coordinate with DeliveryOS.").
  - If `existing` contains no `BEGIN` marker → `action: 'append-block'`, `next` = `existing` + `\n\n` + managed block.
  - If `existing` contains a `BEGIN` marker with the same `body` (byte-equal after trimming trailing whitespace) → `action: 'noop'`, `next` = `existing` (idempotency).
  - If `existing` contains a `BEGIN` marker with a different `body` → `action: 'replace-block'`, `next` = `existing` with the block rewritten in place. Content outside the block is **byte-preserved**.
- Atomic-write helper: `export async function writeFileAtomic(uri: vscode.Uri, content: string): Promise<void>` — write to `<file>.deliveryos.tmp`, then `vscode.workspace.fs.rename` (or `vscode.workspace.fs.writeFile` followed by rename — `rename` is atomic on POSIX; on Windows we fall back to write-then-replace with the caveat documented under § Risks).

The reader uses a strict regex: `/<!-- DELIVERYOS:BEGIN -->([\s\S]*?)<!-- DELIVERYOS:END -->/`. Non-greedy, single match. Multi-match → throw.

#### `extension/src/profiles/suggestedUpdates.ts`

Composes the per-profile suggested updates list. Pure function over the active profile and the workspace file contents.

- `export async function computeSuggestedUpdates(profile: HarnessProfile, ws: WorkspaceContext): Promise<SuggestedUpdate[]>`
- For Claude Code: returns **two** `SuggestedUpdate` entries:
  1. `CLAUDE.md` — content from § 5 below.
  2. `.claude/settings.json` — **stub registration only**, content from § 5 below. The hook script path is referenced; the script file itself is not created in CHUNK-10 (deferred to CHUNK-13).
- For Codex: returns **one** entry — `AGENTS.md` — content from § 5 below.
- Each entry runs through `managedBlock.applyManagedBlock` to compute `action` and `nextContent`.
- The function reads the existing files via `vscode.workspace.fs.readFile` and gracefully treats `FileNotFound` as `existingContent: null`.

#### `extension/src/profiles/index.ts` (barrel)

Re-exports the public surface: `PROFILES`, `getProfile`, `renderBrief`, `computeSuggestedUpdates`, `applyManagedBlock`, plus the types from `types.ts`.

### Contracts package (`contracts/src/`)

#### `contracts/src/profiles.ts`

The webview imports types from here, not from `extension/src/profiles/types.ts` directly. Re-exports:

- The schema types (`HarnessProfile`, `ProfileName`, `BriefStyle`, `OutputFormat`, `RenderedBrief`, `SuggestedUpdate`, `ManagedBlock`).
- The webview ↔ extension message contracts (see § 7 "Key interfaces and types"):
  - `profile.select` (webview → extension)
  - `profile.preview` (request: webview → extension; response with `RenderedBrief`)
  - `profile.computeSuggestedUpdates` (request → response with `SuggestedUpdate[]`)
  - `profile.applyUpdate` (request → response with success/error)

Per the shared cross-chunk contract (part-1-plan.md § "Webview message contracts"), this slice **must not** redeclare any message type that already exists. Profile messages are new and additive.

### Webview (`webview/src/panels/brief-composer/`)

The brief composer panel itself is owned by CHUNK-09; CHUNK-10 only adds the following four sub-components and wires them in.

#### `webview/src/panels/brief-composer/ProfilePicker.tsx`

- Renders the profile list from `PROFILE_LIST` (delivered via initial state message).
- Radio-group UI (Radix RadioGroup), one entry per profile.
- Emits `profile.select` on change.
- Default selection: `claude-code` for first-time use, persisted last-used choice for return visits (stored in CHUNK-03 cross-project store; lookup is best-effort, falls back to default).

#### `webview/src/panels/brief-composer/RenderPreview.tsx`

- Renders the markdown returned by the most recent `profile.preview` response.
- Markdown rendering via `react-markdown` (already a dependency for CHUNK-09's preview).
- Spinner state while a render is in flight.

#### `webview/src/panels/brief-composer/SuggestedUpdatesTab.tsx`

- Renders an accordion of `SuggestedUpdate` cards, one per file.
- Each card shows: file path, action badge (`Create` / `Append` / `Replace` / `No change`), and a diff view.
- Uses the `diff` npm package + a minimal `<DiffView>` component (about 80 LOC) that renders unified-diff lines with `+`/`-`/context styling. **No Monaco** (per part-1-plan.md § Risks).
- For `action: 'noop'` cards, the diff view is collapsed and shows "Already up to date" — no Apply button.
- For all other actions, an `<ApplyButton>` is rendered.

#### `webview/src/panels/brief-composer/ApplyButton.tsx`

- Single-action button that emits `profile.applyUpdate` with the target file path.
- Disabled while the apply is in flight.
- On success: shows a transient confirmation ("Applied to {file}") and triggers `profile.computeSuggestedUpdates` to refresh (the previously-`replace-block` card flips to `noop`).
- On error: shows the error message inline; never logs silently.
- Triggers a `vscode.window.showWarningMessage` confirmation **only** when `action: 'replace-block'` (i.e. overwriting an existing managed block). `create` and `append-block` do not need confirmation because they cannot lose user data.

---

## 4. Managed delimiter block syntax

This section is the **canonical** definition. CHUNK-13's PreToolUse-hook installer imports the same markers and applier.

### 4.1 Markdown variant (CLAUDE.md, AGENTS.md)

Tokens (exact byte sequences, no surrounding whitespace inside the comment):

```
<!-- DELIVERYOS:BEGIN -->
… DeliveryOS-managed body …
<!-- DELIVERYOS:END -->
```

Rules:

1. **Single block per file.** If a second `BEGIN` is found, `readManagedBlock` throws; the UI surfaces the error and tells the user to resolve manually.
2. **Idempotent.** Applying the same body twice is a noop. The applier compares the existing body to the new body **byte-equal after trimming trailing whitespace on each line and trailing blank lines**. (Trimming avoids spurious noise from editors that strip trailing whitespace on save.)
3. **In-place rewrite.** When the body changes, the rewrite replaces only the bytes between the markers (inclusive). Bytes before `BEGIN` and after `END` are byte-preserved. We never reflow the surrounding markdown.
4. **Append-if-absent.** If no `BEGIN` is found, we append two newlines + the block at end-of-file. No mid-file insertion (avoids surprising the user).
5. **Create-if-missing.** If the file does not exist, we create it with a one-line top-of-file comment explaining what DeliveryOS does, followed by a blank line, followed by the managed block. We never create a parent directory we don't already own (e.g. `.claude/` is created by us; the repo root we obviously already have).
6. **Atomic write.** Write to a sibling temp file then rename. Document the Windows caveat (see § Risks).

### 4.2 JSON variant (`.claude/settings.json`)

JSON doesn't support comments natively. We pick a **sentinel-key convention** rather than line-comment markers — cleaner JSON, parseable by `JSON.parse`, easier round-trip:

```jsonc
{
  "other": "user keys preserved",
  "deliveryos.managed": {
    "version": 1,
    "begin": "DELIVERYOS:BEGIN",
    "end": "DELIVERYOS:END",
    "hooks": { /* … filled in by CHUNK-13 … */ }
  }
}
```

Rules:

1. **One sentinel key per file.** The reader looks up `deliveryos.managed` directly; multi-match is impossible by JSON semantics.
2. **Idempotent.** Deep-equal comparison of the existing `deliveryos.managed` value to the new one → `noop`.
3. **In-place rewrite.** When the value changes, we read the file, mutate the single key, write back with `JSON.stringify(parsed, null, 2)`. **All other keys are preserved.** Key order is preserved by `JSON.parse`/`JSON.stringify` for normal object keys, but we should not rely on it; the test plan covers this.
4. **Create-if-missing.** If `.claude/settings.json` does not exist, we create it with `{ "deliveryos.managed": { … } }` only. We never inject any other key.
5. **Parse failure → bail loudly.** If the existing file isn't valid JSON, the applier returns `action: 'noop'` with an `error` field; the UI shows "Your `.claude/settings.json` is not valid JSON — please fix it before DeliveryOS can install the hook." We never attempt to repair.
6. **CHUNK-10 only registers the stub.** The body of `deliveryos.managed` in CHUNK-10 contains:

   ```jsonc
   {
     "version": 1,
     "begin": "DELIVERYOS:BEGIN",
     "end": "DELIVERYOS:END",
     "hooks": null,
     "note": "DeliveryOS will populate the hooks entry when the Allowed/Forbidden hook ships (CHUNK-13)."
   }
   ```

   This means the action in CHUNK-10 is `create` (if no file) or `append-block`/`replace-block` (if a file exists). The actual `PreToolUse` array lands in CHUNK-13. The stub guarantees CHUNK-13 can find its install target and that the user has already opted in.

### 4.3 Why a sentinel key for JSON (not line comments)

Considered: JSON5-style `// DELIVERYOS:BEGIN` line markers. Rejected because (a) `.claude/settings.json` is parsed by Claude Code as strict JSON in some code paths (we cannot rely on JSON5 tolerance), (b) line markers in JSON arrays would need their own ad-hoc parser, (c) the sentinel-key approach round-trips through `JSON.parse`/`JSON.stringify` losslessly, (d) it generalises cleanly to other JSON configs we might manage later (`.codex/config.json`, etc.). Documented as decision-by-rejection here so we don't relitigate.

---

## 5. Suggested updates content

The exact body that goes into each managed block.

### 5.1 `CLAUDE.md` body (Claude Code profile)

```md
## DeliveryOS coordination

This project uses DeliveryOS to prepare Execution Briefs. When you start a session:

1. **Read** the brief at `.deliveryos-handoff/current-execution-brief.md` before any edit or write. The brief is authoritative — it lists the requirement, the Approved Design Context, the test specification, and the Allowed and Forbidden Changes.
2. **Honour** the Allowed Changes and Forbidden Changes sections strictly. Touching a Forbidden path is a contract violation.
3. **Write** your final result summary to `.deliveryos-handoff/result.md` on completion. Include:
   - Summary of changes
   - Files changed
   - Tests added or updated
   - Tests run and their outcomes
   - Risks
   - Unresolved questions

Claude Code does not have a native flag to redirect its last message to a file (unlike Codex's `-o`), so the `result.md` write is **instruction-driven** — please write it yourself before ending the session.

If a DeliveryOS PreToolUse hook is configured in `.claude/settings.json`, it will block edits to Forbidden paths at the tool-call layer. Do not attempt to bypass it.
```

Rationale: research finding #4 (HIGH) — Claude Code has no `-o`, so the instruction is the load-bearing mechanism. Finding #5 (HIGH) — the PreToolUse hook is mentioned but not generated yet; this paragraph primes the user for CHUNK-13.

### 5.2 `AGENTS.md` body (Codex profile)

```md
## DeliveryOS coordination

This project uses DeliveryOS to prepare Execution Briefs. When you start a session:

1. **Read** the brief at `.deliveryos-handoff/current-execution-brief.md` before any edit or write. The brief is authoritative — it lists the requirement, the Approved Design Context, the test specification, and the Allowed and Forbidden Changes.
2. **Honour** the Allowed Changes and Forbidden Changes sections strictly. Touching a Forbidden path is a contract violation.
3. **Write** your final result summary to `.deliveryos-handoff/result.md` on completion. Include:
   - Summary of changes
   - Files changed
   - Tests added or updated
   - Tests run and their outcomes
   - Risks
   - Unresolved questions

The `codex exec` invocation that DeliveryOS launches uses the `-o .deliveryos-handoff/result.md` flag (Codex CLI's `--output-last-message`), so Codex's final assistant message is written to that file automatically. You can additionally narrate the same information in-message; the file is the source of truth.

AGENTS.md was donated to the Linux Foundation in December 2025 as an open standard, so this file is portable across any compliant agent harness.
```

Rationale: research finding #4 documents the Codex `-o` flag explicitly. Finding #9 — AGENTS.md is an LF standard — included as nice context, not a build implication.

### 5.3 `.claude/settings.json` stub body (Claude Code profile)

The full file shape after first-time apply (no pre-existing file):

```json
{
  "deliveryos.managed": {
    "version": 1,
    "begin": "DELIVERYOS:BEGIN",
    "end": "DELIVERYOS:END",
    "hooks": null,
    "note": "DeliveryOS will populate the hooks entry when the Allowed/Forbidden PreToolUse hook ships in a later release."
  }
}
```

If `.claude/settings.json` already exists, the applier mutates only the `deliveryos.managed` key, preserving all other keys.

CHUNK-13's hook installer will:

- Read the same sentinel key.
- Replace `hooks: null` with a populated `PreToolUse` entry pointing at a hook script (written by CHUNK-13).
- The diff for that change is shown to the user the same way (Apply button); CHUNK-10 establishes the UX pattern, CHUNK-13 reuses it.

---

## 6. Diff view UX

Per part-1-plan.md § Risks: pick a small lib, no Monaco.

**Library choice:** the `diff` package (4kb gzipped, MIT, no deps). Use `Diff.createPatch(filename, oldContent, newContent)` to get a unified-diff string, then render line-by-line in a `<DiffView>` React component.

**Component shape:**

- Two-column or unified — pick **unified** (single column). Simpler, fewer pixels, matches GitHub's PR review default.
- Line-level coloring: `+` lines green tint, `-` lines red tint, context lines neutral. Use Tailwind utility classes; do not anchor to VS Code variables for these (the diff is high-contrast content; user expectation is GitHub-like).
- Truncation: for `create` actions where the diff is the whole file, collapse to a "Show full content" disclosure after 80 lines. For other actions the diff is small.
- Monospace font (`font-mono` Tailwind class).
- No syntax highlighting in MVP. Markdown is readable raw; JSON is readable raw at the stub size.

**Performance:** all four files are < 4 KB. No virtualisation needed.

**Accessibility:** `role="region"` with an `aria-label="Diff for {filename}"`. Apply button is a regular `<button>` with a clear label.

---

## 7. Key interfaces and types

### TypeScript surface

```ts
// types.ts (re-exported from contracts/profiles.ts)

export type ProfileName = 'claude-code' | 'codex';
export type BriefStyle = 'structured-full' | 'concise';
export type OutputFormat = 'markdown';

export interface HarnessProfile {
  name: ProfileName;
  display_name: string;
  instruction_file: string;
  handoff_dir: string;
  brief_style: BriefStyle;
  include_test_commands: boolean;
  include_lint_commands: boolean;
  include_forbidden_changes: boolean;
  output_format: OutputFormat;
  mcp_capable: boolean;
}

export interface RenderedBrief {
  profileName: ProfileName;
  briefId: string;
  markdown: string;
  renderedAt: string; // ISO-8601
}

export interface ManagedBlock {
  file: string;            // workspace-relative
  format: 'md' | 'json';
  begin: string;           // marker literal
  end: string;             // marker literal
  body: string;            // body between markers (md) or JSON value of sentinel key (json)
}

export type UpdateAction = 'create' | 'append-block' | 'replace-block' | 'noop';

export interface SuggestedUpdate {
  file: string;
  existingContent: string | null;
  nextContent: string;
  managedBlock: ManagedBlock;
  action: UpdateAction;
  warning?: string; // e.g. "your file's existing block was hand-edited"
  error?: string;   // e.g. JSON parse failure
}
```

### Webview ↔ extension messages

```ts
// contracts/src/profiles.ts (messages)

export type ProfileSelectMsg = {
  type: 'profile.select';
  profileName: ProfileName;
};

export type ProfilePreviewReqMsg = {
  type: 'profile.preview';
  briefId: string;
  profileName: ProfileName;
};

export type ProfilePreviewResMsg = {
  type: 'profile.preview.result';
  briefId: string;
  rendered: RenderedBrief;
};

export type ProfileComputeUpdatesReqMsg = {
  type: 'profile.computeSuggestedUpdates';
  briefId: string;
  profileName: ProfileName;
};

export type ProfileComputeUpdatesResMsg = {
  type: 'profile.computeSuggestedUpdates.result';
  briefId: string;
  updates: SuggestedUpdate[];
};

export type ProfileApplyUpdateReqMsg = {
  type: 'profile.applyUpdate';
  briefId: string;
  file: string; // must match one of the SuggestedUpdate files
};

export type ProfileApplyUpdateResMsg = {
  type: 'profile.applyUpdate.result';
  briefId: string;
  file: string;
  ok: boolean;
  error?: string;
};
```

All messages namespaced under `profile.*` per the part-1-plan.md "Webview message contracts" shared rule — new slice, no overlap with CHUNK-09's `brief.*` namespace.

---

## 8. Data model touched

**None for the MVP.** Profiles are static, hard-coded in `registry.ts`. No DB tables.

Forward seam (deferred, **not** built in CHUNK-10):

- The CHUNK-03 cross-project store will eventually grow a `profiles` table for user-saved custom profiles (e.g. tweaked CLAUDE.md body templates). The MVP does not write to this table. We do read **one** key from the cross-project store: `lastUsedProfileName` (the picker's default). If CHUNK-03 hasn't exposed that key yet by Week 8, we fall back to a workspace-state key and migrate later — non-blocking either way.

The CHUNK-09 brief record is **not** modified by CHUNK-10. The rendered output is ephemeral; it is recomputed on demand from the immutable brief + the static profile. No persistence of the rendered markdown in CHUNK-10. (CHUNK-11 writes a snapshot under `.deliveryos-handoff/history/`; CHUNK-10 stays out of disk-writing the brief.)

---

## 9. VS Code APIs used

- `vscode.workspace.fs.readFile(uri)` — read existing `CLAUDE.md` / `AGENTS.md` / `.claude/settings.json`. Catches `FileSystemError.FileNotFound`.
- `vscode.workspace.fs.writeFile(uri, Uint8Array)` — write new content. Used inside the atomic-write helper.
- `vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true })` — atomic rename for the temp-file-then-rename pattern.
- `vscode.workspace.fs.createDirectory(uri)` — ensure `.claude/` exists before writing `.claude/settings.json`.
- `vscode.workspace.workspaceFolders[0].uri` — workspace root; profiles paths resolve against this.
- `vscode.window.showWarningMessage(message, 'Apply', 'Cancel')` — confirmation dialog for `replace-block` actions (overwriting an existing managed block). Always before the write.
- `vscode.window.showInformationMessage(message)` — success toast after apply.
- `vscode.window.showErrorMessage(message)` — surface JSON-parse failures or filesystem errors.

No use of:

- Terminals (CHUNK-11).
- FileSystemWatchers (CHUNK-11).
- Status bar items.
- WebviewView (the brief composer is a `WebviewPanel`, owned by CHUNK-09; CHUNK-10 adds sub-components only).

---

## 10. Step-by-step implementation outline

Ordered for the ~4 session-days budget. Each numbered item is a commit-sized unit.

**Day 1 — schema + managedBlock (foundation; CHUNK-11 and CHUNK-13 depend on this).**

1. `extension/src/profiles/types.ts` — TypeScript types per § 7.
2. `extension/src/profiles/registry.ts` — the two MVP profile records per § 2.
3. `extension/src/profiles/managedBlock.ts` — full reader/writer/applier for **both** markdown and JSON formats per § 4. Includes the atomic-write helper.
4. `extension/test/profiles/managedBlock.test.ts` — unit tests for the round-trip and idempotency invariants (see § Test plan).

**Day 2 — render + suggestedUpdates (the per-profile logic).**

5. `extension/src/profiles/render.ts` — `renderBrief` per § 3. Includes the optional `## Commands` preamble.
6. `extension/src/profiles/suggestedUpdates.ts` — `computeSuggestedUpdates` per § 5. Reads workspace files via `vscode.workspace.fs`, returns `SuggestedUpdate[]`.
7. `extension/src/profiles/index.ts` — barrel re-exports.
8. `contracts/src/profiles.ts` — type + message re-exports per § 7.

**Day 3 — webview UI.**

9. `webview/src/panels/brief-composer/ProfilePicker.tsx`.
10. `webview/src/panels/brief-composer/RenderPreview.tsx`.
11. `webview/src/panels/brief-composer/SuggestedUpdatesTab.tsx` including the inline `<DiffView>` subcomponent (about 80 LOC).
12. `webview/src/panels/brief-composer/ApplyButton.tsx`.
13. Wire the four components into the existing brief-composer panel (CHUNK-09 ownership). Add the `profile.*` message handlers in the panel's message bus.

**Day 4 — extension-side message handlers + manual test.**

14. Extension-side message handlers in the brief-composer host (`extension/src/panels/brief-composer/host.ts` or wherever CHUNK-09 lands them): translate the `profile.preview`, `profile.computeSuggestedUpdates`, `profile.applyUpdate` requests into calls on the `profiles/` module, post the response messages back.
15. Manual round-trip per § Test plan: open a brief from CHUNK-09, render for Claude Code, inspect suggested updates, apply, verify file content, switch to Codex, repeat.
16. Polish: spinner states, error toasts, the `replace-block` confirmation dialog.

Day 4 buffer absorbs spillover. If the diff renderer ends up gnarlier than expected, drop the truncation/disclosure feature for now — it's a polish item, not load-bearing.

---

## 11. Test plan

### 11.1 Unit tests (`extension/test/profiles/managedBlock.test.ts`)

Critical invariants — must pass:

- **Round-trip (markdown):** `readManagedBlock(buildManagedBlock(body, 'md'), 'md').body === body` for representative bodies (single line, multi-line, body containing markdown tables, body containing HTML comments — verify the parser doesn't choke on the latter).
- **Round-trip (json):** parsing a generated JSON file and reading the sentinel yields the same value back.
- **Idempotency (markdown):** `applyManagedBlock(applyManagedBlock(null, body, 'md').next, body, 'md').action === 'noop'`.
- **Idempotency (json):** same for the JSON path.
- **Create-if-missing (markdown):** `applyManagedBlock(null, body, 'md').action === 'create'`; result contains the leading file-header comment.
- **Append-if-absent (markdown):** with existing content lacking markers, action is `append-block`, existing content is byte-preserved at the start.
- **In-place rewrite (markdown):** with existing content containing markers + an old body, action is `replace-block`, content outside the markers is byte-preserved.
- **Multi-block rejection (markdown):** content with two `BEGIN` markers throws.
- **JSON parse failure:** invalid existing JSON returns `action: 'noop'` with an `error` field — the file is **not** modified.
- **JSON key preservation:** existing JSON with three other keys + the sentinel preserves all three other keys after a rewrite. Key-order preservation tested but not asserted strictly (JSON spec allows reordering).
- **Whitespace normalisation in idempotency check:** trailing whitespace per line and trailing blank lines don't trigger a spurious `replace-block`.

### 11.2 Manual integration test

Per the Done-when in part-1-plan.md (CHUNK-10 section):

1. Open a saved Execution Brief from CHUNK-09 (e.g. the `REQ-002 — Bug submission API` example from PRD § 23).
2. Profile picker defaults to Claude Code. Render preview shows the 10-section markdown with the Claude Code header preamble.
3. Switch to Codex. Render preview updates within < 200ms; header now says "## Profile: Codex".
4. Open the "Suggested updates" tab while on the Claude Code profile.
   - Expect two cards: `CLAUDE.md` (action: `create` on first run) and `.claude/settings.json` (action: `create`).
   - Diff view for each shows the full new content (highlighted green).
   - Click Apply on `CLAUDE.md`. Confirm file is written. Open `CLAUDE.md` in the editor; verify the managed block content matches § 5.1.
   - Re-open the "Suggested updates" tab. Card now shows `action: 'noop'` ("Already up to date"). **This is the idempotency check.**
   - Apply `.claude/settings.json`. Verify the file is created with the stub per § 5.3.
5. Switch to the Codex profile.
   - Expect one card: `AGENTS.md`, action `create`.
   - Apply. Verify file matches § 5.2.
6. **Hand-edit injection test:** open `CLAUDE.md` and edit the body inside the managed block (e.g. delete a line). Re-open the tab. The card now shows action `replace-block` with a `warning` field surfaced in the UI ("the managed block was hand-edited; Apply will overwrite your changes"). Confirm Apply prompts a `showWarningMessage` confirmation. Cancel → no write. Confirm → block is restored.
7. **External content preservation:** edit `CLAUDE.md` **outside** the managed block (e.g. append a sentence after `<!-- DELIVERYOS:END -->`). Re-trigger Apply via the brief composer after deliberately mutating the in-block body. Verify the outside text is preserved byte-for-byte.
8. **JSON other-keys preservation:** add an unrelated key to `.claude/settings.json` (e.g. `"theme": "dark"`). Re-Apply. Verify the new file contains both `"theme": "dark"` and the `"deliveryos.managed"` sentinel.

### 11.3 What is explicitly NOT tested in CHUNK-10

- Running an actual Claude Code or Codex session against the suggested update — that needs CHUNK-11 (handoff + terminal). CHUNK-10's verification is **file content correctness**.
- The PreToolUse hook firing — CHUNK-13.

---

## 12. Risks, edge cases, open questions

### Risks

- **Hand-edited managed blocks (medium).** Users will edit `CLAUDE.md` between sessions. We detect this by comparing the body to the body we'd generate; if they differ, action is `replace-block` and we surface a warning and a confirmation dialog. Documented in § 11.2 test 6. Not silent.
- **Atomic-write on Windows (low).** `vscode.workspace.fs.rename` with `overwrite: true` is atomic on POSIX but goes through a write-then-replace on Windows. The race window is sub-millisecond; for a developer's CLAUDE.md this is acceptable. We document this so we don't relitigate it in code review.
- **JSON parse failure on `.claude/settings.json` (low).** If the user's existing file isn't valid JSON, we bail loudly (§ 4.2 rule 5). Cost: the user has to fix it. Benefit: we never make a broken file worse.
- **Diff lib size (negligible).** The `diff` package is small but adds a webview dependency. Bundled cost ~4 KB gzipped. Worth it vs. hand-rolling a unified-diff differ.
- **Trailing-newline policy (low).** Markdown files conventionally end with a trailing newline. The applier always emits a single trailing `\n`. This is documented but not surfaced to the user.

### Edge cases

- **Empty body.** `buildManagedBlock('', 'md')` is legal (produces an empty block). Used by no MVP profile but tested for robustness.
- **Path with spaces.** `instruction_file` resolution must handle workspace paths with spaces (use `vscode.Uri.joinPath`, not string concat). Covered by VS Code APIs; no special code.
- **Non-UTF8 existing file.** `vscode.workspace.fs.readFile` returns `Uint8Array`; we `TextDecoder.decode` with `{ fatal: true }`. On decode error we surface "Cannot read your CLAUDE.md — encoding is not UTF-8" and bail. Documented; rare in practice.
- **Symlinked instruction file.** `vscode.workspace.fs.writeFile` resolves the symlink; we write through to the target. Acceptable. Documented.
- **`.claude/` directory permissions.** If `.claude/` exists and is not writable, the apply fails with a clear error. We do not try to chmod.

### Open questions (none blocking CHUNK-10; flag for Prompt 3 cohesion audit)

- **Where does `lastUsedProfileName` actually live?** CHUNK-03 owns the cross-project store; if its schema isn't finalised by Week 8 we fall back to `context.workspaceState`. Either works. Marked as "either" in the spec; Prompt 3 to confirm CHUNK-03 has space for one named key.
- **Should the Codex AGENTS.md body mention `codex exec --profile <name>` if the user has Codex CLI profiles configured?** Decided no for MVP — keeps the body small and harness-version-pinned. Revisit when we add Codex CLI profile selection (post-MVP).
- **Should the suggested block include a version stamp inside the body (e.g. "DeliveryOS profile claude-code v1")?** Decided yes — add as a one-line comment at the top of each managed block body. Lets future versions detect "this user is on the old block content" and prompt a migration. Implemented as part of `buildManagedBlock`; the version is `1` for MVP.

---

## 13. Explicit dependencies

### Depends on

- **CHUNK-09 — Execution Brief composer.** Provides the immutable `ExecutionBrief` object and the 10-section markdown parser. CHUNK-10 imports the brief type and consumes the parsed brief. **Hard dependency.**
- **CHUNK-02 — Webview runtime.** Provides the webview-to-extension message bus, React mount, Tailwind, Radix primitives, the `vscode-webview` postMessage wrapper. CHUNK-10's UI components plug into this. **Hard dependency.**
- **CHUNK-03 — Persistence + cross-project store.** Provides the cross-project store where `lastUsedProfileName` is read. **Soft dependency** — fallback to `workspaceState` if CHUNK-03 hasn't exposed the key by Week 8.

### Exposes (canonical contracts for downstream chunks)

- **`HarnessProfile` schema** (types + `PROFILES` registry). Consumed by:
  - **CHUNK-11** (handoff): reads `profile.handoff_dir` and `profile.instruction_file`, uses `profile.name` to switch on the command to send to the terminal (`claude --add-dir .` vs `codex exec -o …`).
  - **CHUNK-13** (PreToolUse hook installer): reads `profile.instruction_file` and `profile.name === 'claude-code'` to gate hook installation to the Claude Code profile only.
- **Managed delimiter block syntax + applier** (`managedBlock.ts`). Consumed by:
  - **CHUNK-13** for `.claude/settings.json` hook installation — reuses `applyManagedBlock` with format `'json'`, mutates only the `deliveryos.managed.hooks` sub-key.
- **`profile.*` message namespace.** No downstream consumer; the brief composer owns these.

### Does not depend on

- CHUNK-12 (result capture) — CHUNK-10 doesn't touch results.
- CHUNK-13 — CHUNK-10 only stubs the hook registration; CHUNK-13 fills it in later.
- The handoff directory itself — CHUNK-10 references its path (`profile.handoff_dir`) in the suggested-update copy but does not write to it.

---

## 14. Honouring the research findings

Cross-checking against part-1-plan.md § "Research-driven changes":

- **#4 (HIGH — Codex `-o/--output-last-message`).** AGENTS.md body in § 5.2 explicitly documents the `-o` flag and explains that Codex's last message is written to `result.md` automatically. CLAUDE.md body in § 5.1 explicitly notes Claude Code has no equivalent and the write is instruction-driven. **Honoured.**
- **#5 (HIGH — Claude Code PreToolUse hooks).** CHUNK-10 stubs the `.claude/settings.json` managed block with a `deliveryos.managed.hooks: null` placeholder and a `note` pointing at CHUNK-13. CLAUDE.md body mentions the hook will block edits to Forbidden paths if installed. The full hook script lands in CHUNK-13. **Honoured (stub only, as instructed).**
- **#9 (LOW — AGENTS.md as LF standard).** Mentioned as a one-liner in the AGENTS.md body in § 5.2. No build implication. **Honoured.**
- **#6 (LOW — handoff directory naming).** `handoff_dir: .deliveryos-handoff` (dotfile form, per the standardisation). **Honoured.**

Cross-checking against part-1-plan.md § "Shared cross-chunk contracts":

- **Execution Brief markdown schema** — CHUNK-10 does not redefine; consumes CHUNK-09's parser. **Honoured.**
- **Webview message contracts** — new `profile.*` slice, additive. **Honoured.**
- **Managed delimiter block syntax** — defined here (canonical), exported for CHUNK-13. **Honoured.**

---

## 15. Done when

- The two MVP profile records (Claude Code, Codex) are present in `registry.ts` and match the schema in `harness-profiles.md` byte-for-byte.
- The same brief from CHUNK-09 renders correctly for both profiles (header preamble differs, body is identical).
- The "Suggested updates" tab shows the managed-block addition with a unified diff for `CLAUDE.md`, `.claude/settings.json` (Claude Code profile), and `AGENTS.md` (Codex profile).
- Apply button writes the file (with confirmation for `replace-block`); applying twice is a noop.
- `managedBlock` unit tests pass with full round-trip + idempotency coverage.
- A hand-edit to the managed block is detected and surfaced as `replace-block` with a warning, never silently overwritten.
- No file outside `instruction_file` and `.claude/settings.json` is touched by this chunk.

---

## 16. Verified by

Manual: render a CHUNK-09 brief for Claude Code, then Codex; inspect the rendered output; inspect the suggested `CLAUDE.md` / `AGENTS.md` update; apply; verify file content; verify idempotency (apply twice → no duplicate block); verify hand-edit detection. Plus the `managedBlock` unit test suite per § 11.1.
