# CHUNK-06 — Draft PRD generation + PRD editor webview

**Phase / Week.** Phase 1, Week 4 (2026-06-15) per [BUILD-PLAN.md](../../BUILD-PLAN.md) § Phase 1.
**Effort.** 4–5 session-days.
**Depends on.** CHUNK-02 (webview foundation), CHUNK-03 (memory store + schema), CHUNK-05 (Discovery Record exists).
**Exposes.** A canonical PRD parent (Requirement Memory entry) and 8 section bodies consumed by CHUNK-07 (Requirements catalogue) and downstream chunks.

---

## 1. Restated goal and scope

### Goal
From the Discovery Record produced in CHUNK-05, produce a draft PRD via the manual-prompt loop (DeliveryOS renders a markdown prompt, the user pastes it into their AI tool of choice, the user pastes the AI's PRD markdown back), and provide an editable section-by-section webview to refine the PRD. The PRD lands as the **parent Requirement Memory entry** for the project. All subsequent Requirement Memory entries (CHUNK-07) link back to it.

### In scope
- `deliveryos.prd.generate` command — renders a whole-PRD generation prompt that wraps the Discovery Record, copies to clipboard.
- `deliveryos.prd.open` command — opens the PRD editor webview for the active project.
- A "Paste draft PRD" mode in the editor — the user pastes the AI tool's markdown PRD back; DeliveryOS parses (leniently) into the 8 template sections and writes them into the parent Requirement Memory entry's `payload_json` and the markdown body file on disk.
- PRD editor webview — section-by-section editing of the 8 fixed template sections (Problem, Users, Goals, Non-Goals, Constraints, Assumptions, Risks, Success Criteria).
- Per-section "Revise this section with AI" button — renders a per-section revision prompt that includes (a) the current section body, (b) the PRD context, (c) a free-text user instruction (e.g. "tighten this", "add a non-goal about Marketplace"), and copies to clipboard. The user pastes the AI's revised section back into the same section editor.
- Persistence: PRD `payload_json` lives in the SQLite `memory_entries` row (CHUNK-03 schema); the human-readable markdown body lives at `<workspace>/.deliveryos/memory/requirement/<prd-id>.md`. Both are kept in sync on save.
- Tree-view contribution: DEFINE stage node gains a "Draft PRD" child item once a PRD parent exists for the project; clicking it opens the editor.

### Out of scope
- Specialist expansion (BA, Architect, Security, etc.). Only the Test Designer is in the trimmed MVP and lands in CHUNK-08.
- Direct API calls to model providers. **Manual prompt mode only.**
- Decomposing the PRD into individual Requirement Memory child entries — that is CHUNK-07.
- Versioning / version history of the PRD beyond simple `updated_at`. (PRD is mutable in the MVP; immutability rules only kick in for Execution Briefs from CHUNK-09 onwards.)
- Live AI streaming inside the webview. Live diff of the AI's revised section against the current section. (Future polish; the MVP just replaces the text.)
- Mid-stage configuration UI driven by Discovery answers (referenced in [stage-configuration.md](../../architecture/stage-configuration.md) but explicitly out of trimmed MVP — only the four default stages are visible).

---

## 2. File-by-file breakdown

All paths relative to the monorepo root established in CHUNK-02 (`extension/`, `webview/`, `contracts/`).

### Webview side (`webview/`)

#### `webview/src/panels/prd-editor/main.tsx`
Entry-point bundled by Vite into `dist/webview/prd-editor/index-[hash].js`. Calls `acquireVsCodeApi()`, mounts `<PrdEditorApp />` into `#root`, sets up the `vscode-messenger` client (singleton imported from CHUNK-02's shared webview runtime).

#### `webview/src/panels/prd-editor/PrdEditorApp.tsx`
Top-level component. Holds the `DraftPrd` state object. On mount, requests the current PRD via the `prd.load` message (host returns the persisted PRD or `null` if no draft yet). Renders one of three states:

1. **Empty state** — no PRD yet. Shows `<PrdGenerationPrompt />` (generate prompt + paste-draft textarea).
2. **Parsing state** — user just pasted a draft; show parse summary (which sections were found, which were missing or empty) with an "Accept and edit" CTA.
3. **Editing state** — full PRD exists. Renders the project title at the top, then maps over the 8 sections rendering one `<SectionEditor />` per section. Each section has an inline `<ReviseSectionButton />`.

Side effects: dispatches `prd.saveSection` on debounced section change (500ms); dispatches `prd.pasteDraft` when the user accepts a freshly pasted draft; dispatches `prd.generateDraftPrompt` when the user clicks "Copy generate-PRD prompt".

Uses Radix UI primitives (per research finding #2 from part-1-plan.md) for the section disclosure, dialogs, and tooltips. Tailwind for layout; hybrid theming hooks (`var(--vscode-editor-background)` etc.) inherited from CHUNK-02.

#### `webview/src/panels/prd-editor/SectionEditor.tsx`
Single-section editor. Props: `{ section: PrdSection; onChange(body: string): void; onRevise(): void }`. Renders an `<h2>` with the section title, a textarea (auto-growing — `react-textarea-autosize` is the only acceptable dep; otherwise use a plain `<textarea>` with `rows` computed from line count), a small "Markdown" badge, and the `<ReviseSectionButton />`. The textarea content is plain markdown text — no rich-text editor in the MVP.

A render-preview tab (optional, behind a tab switcher) shows the rendered markdown using a sanitizer-wrapped renderer (see § Risks: Markdown XSS).

#### `webview/src/panels/prd-editor/ReviseSectionButton.tsx`
Small button that opens a Radix `Dialog`. The dialog asks for a free-text "revision instruction" (e.g. "tighten this", "add specifics about offline support"). On submit, dispatches `prd.reviseSectionPrompt` to the host with `{ sectionId, currentBody, instruction }`. The host returns a rendered markdown prompt that the webview copies to clipboard via `vscode.env.clipboard.writeText` (proxied through a host message — webviews cannot access `vscode.env` directly).

Closes the dialog and shows a toast: "Prompt copied. Paste into your AI tool, then paste the result back into the section editor above."

#### `webview/src/panels/prd-editor/PrdGenerationPrompt.tsx`
Shown only in the empty state. Two CTAs:

1. **Generate draft PRD prompt** — dispatches `prd.generateDraftPrompt`; host renders the prompt and copies it to clipboard; webview shows toast.
2. **Paste draft PRD** — a `<textarea>` for the user to paste the AI tool's full PRD markdown, plus an "Import" button. On import, dispatches `prd.pasteDraft` with the raw markdown; host parses and persists, then sends back the parsed `DraftPrd` so the editor flips to the editing state.

### Extension side (`extension/`)

#### `extension/src/panels/prd-editor/prdEditorHost.ts`
Hosts the PRD editor webview panel. Responsibilities:

- Owns the singleton `vscode.WebviewPanel` (one per project). `createOrShow(projectId)` creates the panel if absent or reveals it if it already exists.
- Sets `viewType = 'deliveryos.prdEditor'`, `viewColumn = ViewColumn.Active`, `iconPath`, `webviewOptions = { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri/dist/webview/prd-editor] }`.
- Builds the HTML via CHUNK-02's shared `buildWebviewHtml(manifest, panelName, nonce)` helper.
- Registers a `WebviewPanelSerializer` (CHUNK-02 base class) so the panel survives reload.
- Wires up the `vscode-messenger` host side. Registers handlers for the four messages defined in [§ 5 Key interfaces](#5-key-interfaces-and-types):
  - `prd.load` — reads the parent Requirement Memory entry for the project; returns `DraftPrd | null`.
  - `prd.generateDraftPrompt` — calls `promptBuilder.buildGenerateDraftPrompt(discoveryRecord)`; writes the result to clipboard via `vscode.env.clipboard.writeText`; returns `{ ok: true }`.
  - `prd.pasteDraft` — calls `parsePrdMarkdown(raw)` from `sectionSchema.ts`; persists via `MemoryStore.upsert(...)` (parent Requirement Memory entry with `payload_json` containing the 8 sections) AND writes the markdown body to `<workspace>/.deliveryos/memory/requirement/<prd-id>.md`; returns the parsed `DraftPrd` plus a `parseReport` showing which sections were found.
  - `prd.saveSection` — updates one section in the `payload_json`, regenerates the on-disk markdown body, updates `updated_at`.
  - `prd.reviseSectionPrompt` — calls `promptBuilder.buildReviseSectionPrompt(section, instruction, prdContext)`; copies to clipboard; returns `{ ok: true }`.
- Fires a `PrdChanged` event on the extension-host event bus on any persisted change so the tree-data provider can refresh the DEFINE → Draft PRD node.

#### `extension/src/prd/promptBuilder.ts`
Pure functions, no side effects. Exports:

```ts
export function buildGenerateDraftPrompt(input: {
  projectTitle: string;
  rawIdea: string;
  discoveryRecord: DiscoveryRecord; // from CHUNK-05
}): string;

export function buildReviseSectionPrompt(input: {
  section: PrdSection;
  instruction: string;
  prdContext: { projectTitle: string; otherSectionSummaries: Record<PrdSectionId, string> };
}): string;
```

Each function returns markdown — the exact text the user will paste into their AI tool. See [§ 6 Generation + revision prompt templates](#6-generation--revision-prompt-templates) for the templates.

Unit-testable in isolation (no VS Code API, no fs).

#### `extension/src/prd/sectionSchema.ts`
The canonical 8-section schema and the lenient parser. Exports:

```ts
export const PRD_SECTION_IDS = [
  'problem',
  'users',
  'goals',
  'non-goals',
  'constraints',
  'assumptions',
  'risks',
  'success-criteria',
] as const;

export type PrdSectionId = typeof PRD_SECTION_IDS[number];

export const PRD_SECTION_DEFINITIONS: Record<PrdSectionId, {
  id: PrdSectionId;
  title: string;       // human-readable, e.g. "Problem"
  order: number;       // 1..8
  promptHint: string;  // 1-2 sentence guidance for the AI prompt template
}> = { ... };

export interface PrdSection {
  id: PrdSectionId;
  title: string;
  body: string; // markdown
}

export interface DraftPrd {
  prdId: string;          // UUID, matches the Requirement Memory entry id
  projectId: string;
  projectTitle: string;
  sections: PrdSection[]; // length 8, in canonical order
  createdAt: number;
  updatedAt: number;
}

export interface PrdParseReport {
  sectionsFound: PrdSectionId[];
  sectionsMissing: PrdSectionId[];
  unmatchedHeadings: string[]; // headings the AI emitted that don't map to our 8
  rawByteLength: number;
}

export function parsePrdMarkdown(raw: string, projectTitle: string): {
  sections: PrdSection[]; // length 8, missing ones get empty body
  report: PrdParseReport;
};

export function renderPrdMarkdown(prd: DraftPrd): string;
```

The parser must be **lenient** (see § Risks): it walks `##` headings, normalises titles (lowercase, strip punctuation, collapse whitespace), and matches against a small alias map (e.g. `"non-goals"` ↔ `"out of scope"`, `"success criteria"` ↔ `"acceptance criteria"`). Missing sections become empty-body sections; the report flags them so the UI can prompt the user to fill them in or run a section revision.

#### `contracts/src/prd.ts`
Shared types for webview ↔ extension messages. Re-exports `DraftPrd`, `PrdSection`, `PrdSectionId` from a `@contracts/prd` barrel. Defines the wire messages:

```ts
export interface PrdMessages {
  'prd.load': {
    request: { projectId: string };
    response: { prd: DraftPrd | null };
  };
  'prd.generateDraftPrompt': {
    request: { projectId: string };
    response: { ok: true; bytesCopied: number };
  };
  'prd.pasteDraft': {
    request: { projectId: string; rawMarkdown: string };
    response: { prd: DraftPrd; report: PrdParseReport };
  };
  'prd.saveSection': {
    request: { prdId: string; sectionId: PrdSectionId; body: string };
    response: { ok: true; updatedAt: number };
  };
  'prd.reviseSectionPrompt': {
    request: {
      prdId: string;
      sectionId: PrdSectionId;
      instruction: string;
    };
    response: { ok: true; bytesCopied: number };
  };
}

export interface RevisePrompt {
  sectionId: PrdSectionId;
  instruction: string;
  renderedPrompt: string;
}
```

### Tree-view contribution (extension)

The static-stage tree from CHUNK-01 already shows DISCOVER / DEFINE / EXECUTE / VERIFY as fixed parents. CHUNK-06 adds:

- DEFINE node gains a single child `"Draft PRD"` (with the Lucide `file-text` icon) when a PRD parent Requirement Memory entry exists for the project.
- Clicking the child runs `deliveryos.prd.open` → `PrdEditorHost.createOrShow(projectId)`.
- Right-click context-menu entry: `"Re-generate PRD prompt"` → runs `deliveryos.prd.generate`.
- The tree node is provided by extending CHUNK-01's `TreeDataProvider`; nothing in the tree-view contract changes. The provider listens to the `PrdChanged` event and calls `_onDidChangeTreeData.fire()` on the DEFINE node.

The DISCOVER → "Discovery interview" child (from CHUNK-05) is unchanged; CHUNK-06 only writes to DEFINE.

---

## 3. PRD section schema

Concrete TypeScript shape — 8 fixed sections, in canonical order. The titles mirror the section headings of `docs/PRD.md` (the project's own PRD) for dogfooding consistency.

```ts
export const PRD_SECTION_DEFINITIONS = {
  problem: {
    id: 'problem',
    title: 'Problem',
    order: 1,
    promptHint:
      'What user or business problem does this product solve? Be specific about who hurts and how.',
  },
  users: {
    id: 'users',
    title: 'Users',
    order: 2,
    promptHint:
      'Primary and secondary users. For each, list role, context, and pain points being addressed.',
  },
  goals: {
    id: 'goals',
    title: 'Goals',
    order: 3,
    promptHint:
      'Product goals (3–8 bullets). Each goal should be outcome-focused, not feature-focused.',
  },
  'non-goals': {
    id: 'non-goals',
    title: 'Non-Goals',
    order: 4,
    promptHint:
      'What this product is explicitly NOT trying to be. List comparable tools we are not replacing.',
  },
  constraints: {
    id: 'constraints',
    title: 'Constraints',
    order: 5,
    promptHint:
      'Hard constraints (technical, regulatory, time, budget) the build must respect.',
  },
  assumptions: {
    id: 'assumptions',
    title: 'Assumptions',
    order: 6,
    promptHint:
      'What we are taking as given. If any of these prove false, the PRD must be revisited.',
  },
  risks: {
    id: 'risks',
    title: 'Risks',
    order: 7,
    promptHint:
      'Key risks with a 1-line mitigation each. Cover technical, market, dependency, and execution risk.',
  },
  'success-criteria': {
    id: 'success-criteria',
    title: 'Success Criteria',
    order: 8,
    promptHint:
      'Observable, measurable outcomes that mean the product has succeeded. Tie back to Goals.',
  },
} as const;
```

The on-disk markdown body uses `## <Title>` for each section in the canonical order, with the body verbatim underneath. Example:

```markdown
# <Project Title>

## Problem
…body…

## Users
…body…

## Goals
…body…

## Non-Goals
…body…

## Constraints
…body…

## Assumptions
…body…

## Risks
…body…

## Success Criteria
…body…
```

This is the format `renderPrdMarkdown` emits and `parsePrdMarkdown` accepts (leniently — see § Risks).

---

## 4. Key interfaces and types

(Already defined in [§ 2 sectionSchema.ts](#extensionsrcprdsectionschemats) and [§ 2 contracts/src/prd.ts](#contractssrcprdts); summarised here for reviewers.)

### `DraftPrd`
The full PRD object handed across the webview boundary and serialised into `memory_entries.payload_json` (per CHUNK-03 schema). Fields: `prdId`, `projectId`, `projectTitle`, `sections: PrdSection[8]`, `createdAt`, `updatedAt`.

### `PrdSection`
`{ id: PrdSectionId; title: string; body: string }`. The `body` is plain markdown text. `id` is one of the 8 canonical IDs (kebab-case for `'non-goals'` and `'success-criteria'`, single-word for the rest).

### `RevisePrompt`
The output of `buildReviseSectionPrompt`. Used internally by the host; not crossed the wire as a typed object (only the rendered markdown string crosses the wire, on its way to the clipboard).

### Webview ↔ extension messages
Four typed messages (defined in `contracts/src/prd.ts`):

| Message | Direction | Purpose |
|---|---|---|
| `prd.load` | webview → host → response | Fetch the persisted PRD for the project (or `null`). |
| `prd.generateDraftPrompt` | webview → host → response | Render the whole-PRD generation prompt; copy to clipboard. |
| `prd.pasteDraft` | webview → host → response | Parse pasted markdown, persist, return parsed `DraftPrd` + report. |
| `prd.saveSection` | webview → host → response | Persist a single edited section. |
| `prd.reviseSectionPrompt` | webview → host → response | Render a per-section revision prompt; copy to clipboard. |

All five use the request/response pattern from CHUNK-02's `vscode-messenger` wiring. There are **no push events from host to webview** in CHUNK-06 — every state change is initiated by the webview, and the host's response is the source of truth.

---

## 5. Data model touched

CHUNK-06 introduces **exactly one new memory entry shape**: the PRD parent Requirement Memory entry. It re-uses CHUNK-03's polymorphic schema; nothing in the schema itself changes.

### SQLite row (CHUNK-03 schema)

| Column | Value |
|---|---|
| `id` | `<prd-uuid>` — used as `prdId` everywhere. |
| `type` | `'requirement'` |
| `title` | Same as `projectTitle`, e.g. `"DeliveryOS"`. |
| `payload_json` | JSON-encoded `DraftPrd` (the 8 sections, project title, timestamps). |
| `created_at` | ms epoch on first paste. |
| `updated_at` | ms epoch on every save. |

A "PRD parent" entry is distinguished from a "child requirement" entry (CHUNK-07) by a `payload_json.kind: 'prd-parent' | 'requirement-child'` tag. CHUNK-07's catalogue queries on that tag.

### Memory link (CHUNK-03 schema)

One link is written when the PRD is first persisted:

| Column | Value |
|---|---|
| `from_id` | `<prd-uuid>` (Requirement Memory parent) |
| `to_id` | `<intent-uuid>` (Intent Memory entry created in CHUNK-03 + filled in CHUNK-05) |
| `kind` | `'derives-from'` |

CHUNK-07 will later write `from_id: <child-requirement-uuid>, to_id: <prd-uuid>, kind: 'belongs-to'` links — out of scope here.

### Markdown body on disk

Written by `vscode.workspace.fs.writeFile` to:

```
<workspace>/.deliveryos/memory/requirement/<prd-uuid>.md
```

The body is the `renderPrdMarkdown(draftPrd)` output (see § 3). The file is **kept in sync with `payload_json` on every save** — `payload_json` is authoritative for queries; the markdown file exists for human inspection, git diffing, and the eventual Release Evidence export (CHUNK-14).

Directory `.deliveryos/memory/requirement/` is created (recursive) on first PRD persist if missing.

---

## 6. VS Code APIs used

- `vscode.window.createWebviewPanel(viewType, title, viewColumn, options)` — the PRD editor panel. Per CHUNK-02 conventions: nonce-based CSP, `localResourceRoots` limited to `extensionUri/dist/webview/prd-editor`.
- `vscode.window.registerWebviewPanelSerializer(viewType, serializer)` — so the panel restores on workspace reload (re-uses CHUNK-02 base class).
- `vscode.workspace.fs.writeFile(uri, Uint8Array)` — writes the PRD markdown body to disk. Preferred over `node:fs` to support virtual filesystems if ever enabled (not in MVP but free correctness).
- `vscode.workspace.fs.createDirectory(uri)` — ensures `.deliveryos/memory/requirement/` exists before the first write.
- `vscode.workspace.fs.readFile(uri)` — used by `prd.load` if (and only if) the SQLite row is missing but the markdown file exists (recovery path; out of scope to wire fully, but the seam is open).
- `vscode.workspace.workspaceFolders[0].uri` — to anchor `.deliveryos/` paths. The extension already requires a workspace (CHUNK-01 capabilities declaration), so an empty array is a fatal precondition we re-check with a clear error message.
- `vscode.env.clipboard.writeText(text)` — used by `prd.generateDraftPrompt` and `prd.reviseSectionPrompt` to write the rendered prompt to the system clipboard. (The webview cannot call this directly — it's an extension-host-only API; the message handler does it on the webview's behalf.)
- `vscode.window.showInformationMessage(...)` — small "Prompt copied" toast when the clipboard is written (fallback if the webview's own toast is not visible).
- `vscode.commands.registerCommand('deliveryos.prd.generate' | 'deliveryos.prd.open', handler)` — two new commands, contributed in `package.json`.
- `EventEmitter<void>` on the extension's existing tree-data event bus — to refresh the DEFINE node when the PRD is created or updated.

No new VS Code API surface beyond what CHUNK-01 and CHUNK-02 already permit.

---

## 7. Generation + revision prompt templates

The user runs these prompts inside their external AI tool (Claude.ai, ChatGPT, a local LLM via a chat UI, etc.) — DeliveryOS itself does not call any model. The output of `buildGenerateDraftPrompt` and `buildReviseSectionPrompt` is plain markdown, designed to be copy-pasted directly into a chat box.

### 7.1 Whole-PRD generation prompt

Output of `buildGenerateDraftPrompt({ projectTitle, rawIdea, discoveryRecord })`:

```markdown
You are helping draft a Product Requirements Document (PRD) for a product called
**<projectTitle>**. The PRD will be used inside DeliveryOS, a structured SDLC tool
that decomposes the PRD into requirements, generates execution briefs for AI
coding harnesses, and tracks traceability end to end.

## Your task

Produce a draft PRD with the following 8 sections, in this order. Each section is
a level-2 markdown heading (`## <Title>`) followed by the body. Output **only**
the PRD markdown — no preamble, no closing remarks.

1. **Problem** — <promptHint for problem>
2. **Users** — <promptHint for users>
3. **Goals** — <promptHint for goals>
4. **Non-Goals** — <promptHint for non-goals>
5. **Constraints** — <promptHint for constraints>
6. **Assumptions** — <promptHint for assumptions>
7. **Risks** — <promptHint for risks>
8. **Success Criteria** — <promptHint for success-criteria>

## Inputs

### Raw idea

> <rawIdea>

### Discovery answers

<for each Q/A in discoveryRecord:>
**Q: <question>**
<answer>

## Output format

Start with `# <projectTitle>` as the document title, then each `## <Title>` section.
Use bullets where natural. Prefer concrete over abstract. If you don't know an
answer, write `*(unknown — flag for the user)*` rather than inventing.

Do not output anything other than the PRD markdown.
```

### 7.2 Per-section revision prompt

Output of `buildReviseSectionPrompt({ section, instruction, prdContext })`:

```markdown
You are helping refine **one section** of a Product Requirements Document for
**<projectTitle>**.

## Section to revise: <section.title>

### Current content

<section.body>

### Revision instruction

<instruction>

## Context (other sections, summarised)

<for each other section:>
**<Title>:** <first ~200 chars of body>...

## Your task

Rewrite the **<section.title>** section based on the revision instruction. Output
**only** the new section body — no `## <Title>` heading, no preamble, no commentary.
The user will paste the result directly back into the section editor.
```

Both templates are intentionally minimal: the user pastes the markdown into their AI tool of choice, and the AI returns a clean markdown body that pastes cleanly back into DeliveryOS. The discovery answer set, raw idea, and `promptHint` values are interpolated by `promptBuilder.ts` at render time.

---

## 8. Step-by-step implementation outline

A working order that lets each step be exercised before the next is built.

1. **Add the contracts.** Create `contracts/src/prd.ts` with `DraftPrd`, `PrdSection`, `PrdSectionId`, `PrdParseReport`, the `PrdMessages` map, and `RevisePrompt`. Re-export from the `contracts` package barrel.
2. **Add the section schema.** Create `extension/src/prd/sectionSchema.ts` with `PRD_SECTION_IDS`, `PRD_SECTION_DEFINITIONS`, `parsePrdMarkdown`, `renderPrdMarkdown`. Cover the lenient-parser logic (heading-normalisation alias map, missing-section handling). Unit-test against three hand-crafted markdown inputs: well-formed, missing two sections, sections in a wrong order.
3. **Add the prompt builder.** Create `extension/src/prd/promptBuilder.ts` with the two template functions. Unit-test that the output is deterministic given fixed inputs.
4. **Wire the memory layer.** Add a `MemoryStore.upsertPrdParent(projectId, draft)` helper (thin wrapper over CHUNK-03's `create`/`update`) that handles the row insert plus the `requirement/<id>.md` file write atomically (write the file first, then commit the SQLite row — or vice versa with a try/catch that backs the file out on failure). Add a `MemoryStore.loadPrdParent(projectId)` companion.
5. **Register the commands.** Add `deliveryos.prd.generate` and `deliveryos.prd.open` to `package.json` contributes. Hook each to a handler in `extension/src/panels/prd-editor/prdEditorHost.ts` (or a sibling `commands.ts` file).
6. **Build the webview shell.** Create `webview/src/panels/prd-editor/{main.tsx, PrdEditorApp.tsx}`. Wire Vite to emit a new bundle under `dist/webview/prd-editor/`. Verify it builds cleanly and the panel opens with the empty state visible.
7. **Wire the message round-trip.** Implement `prd.load` end to end — webview asks, host returns `null`, empty state renders. Verify in dev tools (no CSP errors).
8. **Build the empty state.** Create `PrdGenerationPrompt.tsx`. Wire the "Copy generate-PRD prompt" button → `prd.generateDraftPrompt` → clipboard. Verify by pasting into a chat tool manually.
9. **Build the paste-import path.** Wire `prd.pasteDraft` → parser → memory persist → response with the parsed `DraftPrd`. The webview flips to the editing state. Verify with a sample markdown blob.
10. **Build the section editor.** Create `SectionEditor.tsx`. Wire debounced `prd.saveSection` on edit. Verify by reopening the panel and confirming the body persists.
11. **Build the revision button.** Create `ReviseSectionButton.tsx`. Wire the dialog and `prd.reviseSectionPrompt` message. Verify clipboard contents.
12. **Wire the tree view.** Extend CHUNK-01's `TreeDataProvider` to surface "Draft PRD" under DEFINE when a parent Requirement Memory entry exists. Hook click → `deliveryos.prd.open`. Wire the `PrdChanged` event so the tree refreshes on first paste and on every save.
13. **Add the WebviewPanelSerializer entry.** Register the PRD editor with VS Code so the panel restores on workspace reload.
14. **End-to-end manual test.** Walk the full test plan in § 10. Capture screenshots for the eventual CHUNK-16 demo.
15. **Bug-bash pass.** Check at minimum: very long PRD body (>50KB), pasted PRD with code fences inside section bodies, PRD with emoji or RTL characters, unicode-NFC vs NFD normalisation in headings, repeated paste-import (must not duplicate the parent entry).

---

## 9. Test plan

All manual; no automated tests for this chunk beyond the parser and prompt-builder unit tests called out in § 8. End-to-end manual run:

1. **Pre-condition.** A project exists (CHUNK-01) with a Discovery Record persisted (CHUNK-05).
2. **Open the PRD editor.** Click DEFINE → "Draft PRD" in the tree (or run `deliveryos.prd.open`). Empty state renders.
3. **Generate the prompt.** Click "Copy generate-PRD prompt". Expect a toast "Prompt copied". Paste into a scratch buffer — verify the prompt includes the raw idea, all discovery Q/A pairs, and the 8 section instructions.
4. **Run the AI tool.** Paste the prompt into Claude.ai / ChatGPT / etc. Receive a markdown PRD response.
5. **Paste the draft.** Paste the response into the "Paste draft PRD" textarea. Click "Import". Expect: parsing summary shows all 8 sections found (or flags which were missing). Click "Accept and edit". The editor flips to editing state with 8 sections rendered.
6. **Edit a section.** Edit the Problem section body. Wait 500ms for the debounced save. Expect a small "Saved" indicator.
7. **Revise via AI.** Click "Revise with AI" on the Goals section. Type "tighten this to 5 bullets". Submit. Clipboard now holds the revision prompt. Paste into the AI tool. Paste the response back into the Goals textarea. Confirm it persists on debounce.
8. **Restart VS Code.** Close the workspace. Reopen. Click DEFINE → "Draft PRD". Expect every edit to be there, exactly as left.
9. **Inspect on disk.** Open `<workspace>/.deliveryos/memory/requirement/<prd-id>.md`. Expect well-formed markdown with all 8 sections in canonical order. Open `<workspace>/.deliveryos/memory.sqlite` with the `sqlite3` CLI; expect a row in `memory_entries` with `type = 'requirement'` and a `payload_json` matching the on-disk markdown.
10. **Edge cases to spot-check.**
    - Re-paste a different PRD draft — must replace the existing one in place (same `prdId`), not create a duplicate parent.
    - Paste a malformed markdown (missing several headings) — parser report flags missing sections; editor still opens; empty sections render with a placeholder.
    - Paste a PRD with `## non-goals` heading lower-cased and hyphenated — parser still matches via the alias table.
    - Paste a 100-line PRD with deep nested bullets in one section — section editor renders without breaking layout.

Success: every step above completes without an error in the dev console, without a CSP violation, and without losing data on restart.

---

## 10. Risks, edge cases and open questions

### Risks

1. **Lenient parser is the soft underbelly.** AI tools format PRDs inconsistently — sometimes `## Goal` (singular), sometimes `### Goals` (level 3), sometimes a numbered list `## 3. Goals`. The parser MUST normalise (lowercase, strip leading numbers, strip punctuation) and use an alias table for known variants. Where ambiguity remains, surface it in `PrdParseReport.unmatchedHeadings` rather than silently swallowing content.
2. **Markdown XSS in the section renderer.** If we add a render-preview tab (currently optional in § 2 SectionEditor), the renderer MUST sanitize. Use `marked` + `DOMPurify` or `micromark` with a strict allow-list. **Do not** dangerously-set-innerHTML untrusted markdown. The plain-text textarea editor is XSS-safe by construction; only the optional preview tab is the attack surface. If timeline is tight, defer the preview tab entirely — the markdown source is fine to look at directly.
3. **Very long PRDs.** Worst-case observed: a 50KB PRD with deeply nested bullets in one section. The webview renders fine, but the debounced `prd.saveSection` round-trip can lag on slow disks (sql.js flush + markdown file write). Mitigation: debounce to 500ms; show a "saving…" state in the UI; do NOT block subsequent edits. If profiling shows a real problem, batch saves across sections — but this is unlikely at MVP scale.
4. **Markdown body and `payload_json` drift.** If the user manually edits `.deliveryos/memory/requirement/<id>.md` outside of DeliveryOS, the on-disk markdown can drift from the SQLite `payload_json`. MVP rule: **`payload_json` is authoritative on read**; the markdown file is regenerated from it on every save. Document this in `.deliveryos/README.md` (which CHUNK-03 wrote). A future "import external edits" command can be a polish item — not in scope.
5. **Clipboard copy can fail silently** on some Linux setups without an X clipboard daemon, or on remote SSH sessions without clipboard forwarding. Surface the rendered prompt as a copy-able preview in the dialog/toast so the user can fall back to selecting and copying manually if `env.clipboard.writeText` reports a write but the system clipboard is empty.

### Edge cases

- **Paste-import called twice in a row.** Second call replaces the first; the `prdId` is stable (looked up by `projectId`, not recreated). The on-disk markdown is overwritten.
- **Section reordering by the AI.** The AI sometimes returns sections in a different order than we asked for. The parser must reorder them into the canonical order before persisting; the editor only ever shows canonical order.
- **A section's body contains a literal `## ` heading inside a code fence.** The parser must skip fenced regions (track triple-backtick state). Failing this would split one section into two.
- **Empty `rawIdea` or `discoveryRecord`.** Should not happen given the CHUNK-05 precondition, but the prompt builder should handle gracefully (omit the empty subsection) rather than emitting `> ` with no content.
- **Project with no workspace folder open.** Refuse to open the editor; surface a clear error. (Workspace Trust is already declared off-able in CHUNK-01.)

### Open questions

- **Should the PRD have a free-text "scratch notes" section in addition to the 8 canonical sections?** Resolved: **no** for MVP. If users want unstructured notes, they can put them in the Assumptions section. Revisit if friction shows up in dogfooding.
- **Should the section-revision dialog show a live preview of the rendered prompt before copy?** Trade-off: more reassuring UX, more code. Resolved: **show a collapsible "Preview prompt" disclosure under the instruction textarea**, plain-text, no scary rendering. Cheap and meaningful.
- **What's the right `PrdParseReport.unmatchedHeadings` action?** Just surface them. The user can copy them and re-run the section-revise flow if they want to incorporate that content. We do NOT auto-merge unmatched headings — too easy to corrupt the PRD silently.

---

## 11. Explicit dependencies and exposed contracts

### Depends on

- **CHUNK-02** — webview foundation (Vite build, CSP HTML factory, `vscode-messenger` host + webview wiring, hybrid Tailwind theme, `WebviewPanelSerializer` base class).
- **CHUNK-03** — `MemoryStore` API (`create`/`update`/`read`/`link`), the polymorphic `memory_entries` table, `memory_links` table, and the `<workspace>/.deliveryos/memory/<type>/<id>.md` on-disk convention. Re-uses the schema verbatim with `type = 'requirement'` and `payload_json.kind = 'prd-parent'`.
- **CHUNK-05** — Discovery Record exists (stored as an extension of the Intent Memory entry per CHUNK-05's spec). `buildGenerateDraftPrompt` reads it directly via `MemoryStore.loadDiscoveryRecord(projectId)`.

### Exposes (consumed by later chunks)

- **CHUNK-07 (Requirements catalogue)** reads the PRD parent Requirement Memory entry's `payload_json.sections` to render the "source PRD section" filter and to seed the decomposition prompt with the right slice of PRD text per requirement.
- **CHUNK-09 (Execution Brief composer)** indirectly consumes the PRD through CHUNK-07's child Requirement Memory entries, which link back to the PRD parent via the `'belongs-to'` memory link.
- **CHUNK-14 (Release Evidence)** walks the memory graph backwards from Verification → … → Requirement (child) → Requirement (PRD parent) → Intent. The PRD parent's on-disk markdown body is included verbatim in the exported Release Evidence document.

### Honoured shared contracts (per [part-1-plan.md § Shared cross-chunk contracts](../part-1-plan.md))

- **Memory schema** — CHUNK-03. PRD parent is a regular `memory_entries` row; no new tables.
- **Webview message contracts** — `contracts/src/prd.ts` adds the PRD slice; does not redeclare existing message types.
- **`.deliveryos/` memory directory layout** — CHUNK-03. PRD body goes to `.deliveryos/memory/requirement/<id>.md`.
- **Managed delimiter block syntax** — not used here (no `CLAUDE.md` / `AGENTS.md` updates). Defined in CHUNK-10, untouched.
- **Execution Brief markdown schema, Harness Profile schema, Handoff directory layout** — not touched by this chunk.
