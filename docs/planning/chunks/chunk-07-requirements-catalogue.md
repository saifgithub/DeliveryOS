# CHUNK-07 — Requirements catalogue

**Phase:** 1 (DISCOVER + DEFINE). **Week:** 5 — 2026-06-22. **Effort:** 4–5 session-days.
**Depends on:** CHUNK-06 (PRD exists), CHUNK-03 (Memory store + schema), CHUNK-02 (webview foundation).
**Exposes:** Requirement Memory entries — consumed by CHUNK-08 (Test Designer specialist) and CHUNK-09 (Execution Brief composer).

---

## 1. Restated goal and scope

### Goal

Take the approved PRD produced by CHUNK-06 and decompose it — in manual prompt mode, like every other AI step in MVP — into a structured **requirements catalogue**. Each requirement is its own Requirement Memory entry, linked back to the PRD section it was derived from. The user sees a sortable, filterable table of requirements; clicking a row opens a detail editor where they can correct anything the AI got wrong.

### In scope

- A `deliveryos.decomposePrd` command that opens a **Decompose Prompt Panel**:
  - Reads the canonical PRD entry from Requirement Memory (the one CHUNK-06 wrote).
  - Renders the decomposition prompt template (markdown) with the PRD embedded.
  - "Copy prompt" button; user runs it in their AI tool of choice.
- A **Paste-decomposed** flow:
  - Long-text input where the user pastes the AI's response.
  - Parser tries JSON first; falls back to markdown-table; if both fail, surfaces the raw text in an "Add manually" editor.
  - On successful parse, creates one Requirement Memory entry per row, each linked to the PRD via `memory_links(kind: "derives-from")` (canonical per CHUNK-03's `LINK_KINDS`; M02). The PRD entry is a `type='requirement'` row with `payload.kind === 'prd'` (canonical per B05; not a separate `'prd'` memory type).
- A **Requirements catalogue webview** (`deliveryos.openRequirements`):
  - Table with columns: ID, Title, Type, Priority, Source PRD section, Verification status.
  - Filter by Type / Priority / Verification status. Sort by any column.
  - Click a row → opens detail editor (inline panel or split view).
- A **Requirement detail editor**:
  - Editable fields: title, description (markdown textarea), type, priority, source PRD section (dropdown of detected PRD sections).
  - **Verification criteria field is read-only and shows "not yet authored" — CHUNK-08 fills it.**
  - "Save" persists via `requirements.update`.
- Tree-view change: the DEFINE node gains a "Requirements" child group; each requirement is a per-id child item beneath it.

### Out of scope (deferred to other chunks)

- **Verification-criteria authoring** — CHUNK-08 owns this.
- **Test specification generation** — CHUNK-08 owns this.
- **Bulk-edit / multi-select operations** on the table — not in MVP.
- **AI re-decomposition of a single requirement** — if the user wants to redo, they re-run the whole decompose command.
- **Direct model-API calls** — manual prompt mode only (MVP-wide constraint).
- **Cross-PRD requirements** — there is exactly one PRD per project in the trimmed MVP.

---

## 2. File-by-file breakdown

All paths are relative to the repo root. Conventions follow CHUNK-02 (monorepo with `extension/`, `webview/`, `contracts/`).

### `contracts/src/requirements.ts`

New file. Owns:

- The `Requirement` discriminated-union payload type that fits inside CHUNK-03's polymorphic `payload_json`.
- The `RequirementsCatalogue` aggregate (used by the webview).
- The `DecomposedRequirements` shape the parser produces.
- All webview ↔ extension message types for this panel.

Re-exported from `contracts/src/index.ts` alongside CHUNK-03's memory schema and CHUNK-02's messenger types — never redeclare those.

### `extension/src/requirements/decompositionPrompt.ts`

New file. Pure function `renderDecompositionPrompt(prd: PrdMemoryEntry): string`.

- Loads the PRD markdown body from `<workspace>/.deliveryos/memory/requirement/<prd-id>.md`.
- Returns the rendered prompt template (see §7).
- No I/O beyond the file read; deterministic given the PRD content.

### `extension/src/requirements/parser.ts`

New file. Single export: `parseDecomposed(text: string): ParseResult`.

```text
ParseResult =
  | { ok: true; mode: "json" | "markdown-table"; requirements: DecomposedRequirements }
  | { ok: false; reason: string; raw: string }
```

Algorithm:

1. **Strip code fences.** Detect a single ```json … ``` or ```yaml … ``` block; if present, treat its inner body as the candidate. Otherwise use the whole input.
2. **JSON attempt.** `JSON.parse` the candidate. If it's an array of objects with at least `title` and `type`, normalise and return `{ ok: true, mode: "json", … }`.
3. **Markdown-table attempt.** Look for a GitHub-flavoured markdown table (header row with `|`, separator row of `---`, then data rows). Parse cell-by-cell against the canonical column order (see §7). Return `{ ok: true, mode: "markdown-table", … }` on success.
4. **Failure.** Return `{ ok: false, reason, raw: text }` so the host can show the raw paste in a manual-edit fallback editor.

Normalisation rules during parse:

- `type` is case-insensitively coerced into `"Functional" | "Non-Functional"`; anything that doesn't match defaults to `"Functional"` and triggers a parse warning.
- `priority` is coerced into `"Must" | "Should" | "Could"`; unrecognised values default to `"Should"` plus warning.
- `id` is **ignored** if present — the host always assigns IDs to avoid duplicates from AI output (see §10 risk).
- Whitespace trimmed; empty `title` rows are dropped.

### `extension/src/panels/requirements/requirementsHost.ts`

New file. Owns the host-side wiring for the Requirements catalogue webview and the Decompose prompt panel.

Responsibilities:

- Register `deliveryos.openRequirements` and `deliveryos.decomposePrd` commands.
- Construct and serialise the two panels (via the `WebviewPanelSerializer` base from CHUNK-02).
- Provide the panel HTML via the CHUNK-02 HTML factory (Vite manifest + CSP + nonce).
- Handle all webview ↔ host messages (see §3 message table) by delegating to:
  - `MemoryStore` (CHUNK-03) for CRUD on Requirement entries and Memory Links.
  - `parseDecomposed` for the paste flow.
  - `renderDecompositionPrompt` for the prompt panel.
  - `vscode.env.clipboard.writeText` for the "Copy prompt" action.
- On successful create/update/delete, fire the tree-data-provider's `onDidChangeTreeData` so the DEFINE → Requirements branch refreshes (see §5).

### `webview/src/panels/requirements/main.tsx`

New file. The Vite entry point for the requirements panel. Imports `RequirementsApp`, the Tailwind stylesheet, and the messenger client from CHUNK-02. Mounts to `#root`.

### `webview/src/panels/requirements/RequirementsApp.tsx`

New file. The top-level React component for the catalogue view.

- Subscribes via `vscode-messenger` to push events (`requirements.list`).
- Holds the filter/sort state in component state (not persisted — fresh on every open).
- Renders the `<RequirementsTable />` and, when a row is selected, the `<RequirementDetail />` in a split layout (table top, detail bottom; resizable later, fixed split for MVP).
- Renders the toolbar: "Decompose PRD" button (sends `requirements.openDecomposePanel`), filter dropdowns, search input.

### `webview/src/panels/requirements/RequirementsTable.tsx`

New file. Stateless table component.

- Props: `requirements: Requirement[]`, `filter: FilterState`, `sort: SortState`, `selectedId: string | null`, callbacks `onSelect`, `onSortChange`, `onFilterChange`.
- Renders columns in the order specified in §1: ID, Title, Type, Priority, Source PRD section, Verification status.
- Applies the filter/sort before render — pure derived state.
- Uses Tailwind utility classes anchored to `var(--vscode-*)` tokens per the hybrid-theming rule from CHUNK-02.
- Empty state: "No requirements yet. Run **Decompose PRD** to populate." with a button that dispatches `requirements.openDecomposePanel`.

### `webview/src/panels/requirements/RequirementDetail.tsx`

New file. Stateless detail editor.

- Props: `requirement: Requirement`, `prdSections: string[]`, callbacks `onSave`, `onCancel`, `onDelete`.
- Form fields per §1 in-scope list.
- Verification-criteria area is rendered as a muted read-only block: "Awaiting Test Designer (CHUNK-08)".
- Save button is disabled until something has changed (dirty-flag check).

### `webview/src/panels/requirements/DecomposePromptPanel.tsx`

New file. A standalone panel — opened as its own webview instance, not embedded in `RequirementsApp` — that walks the user through the manual decomposition flow.

- Two-step UI:
  1. **Prompt step.** Shows the rendered prompt (read-only `<pre>` block, syntax-highlighted via a lightweight client-side highlighter or none). "Copy prompt" button.
  2. **Paste-back step.** Long-text `<textarea>` for the AI's response. "Parse and create" button calls `requirements.pasteDecomposed`. On parse failure, the panel shows the failure reason and switches to a manual-add form (one row at a time) so the user is never stuck.
- On success, posts `requirements.created` count to the host, the host disposes the panel, focus returns to the catalogue.

### Tree-view changes (no new file)

Owned by `extension/src/tree/stageTreeProvider.ts` (the canonical single tree-provider file declared by CHUNK-02 — renamed from CHUNK-01's pre-monorepo `src/stages/stageTreeProvider.ts`). This chunk extends it:

- The DEFINE node gains two children: existing "Draft PRD" (CHUNK-06) plus the new "Requirements" group.
- The "Requirements" group lazy-loads children by calling `memoryStore.list("requirement")` and filtering to entries whose `payload_json.kind === "requirement-item"` (the parent PRD has `kind === "prd"` — see §4).
- Each requirement child item:
  - `label`: `${req.id} — ${req.title}` truncated to 60 chars.
  - `description`: `req.priority` (shown in muted text by VS Code).
  - `command`: opens the requirements catalogue with that row pre-selected (passes the id via the panel's open arguments).
- `onDidChangeTreeData` fires after every create/update/delete from `requirementsHost`.

---

## 3. Key interfaces and types

All types live in `contracts/src/requirements.ts`.

### Domain types

```ts
export type RequirementType = "Functional" | "Non-Functional";
export type RequirementPriority = "Must" | "Should" | "Could";
export type VerificationStatus = "empty" | "draft" | "approved";

/**
 * The payload-side type that gets serialised into
 * memory_entries.payload_json (CHUNK-03's polymorphic table).
 * The wrapping MemoryEntry<T> shape, id, timestamps, and links
 * are CHUNK-03's concern and are NOT redefined here.
 */
export interface Requirement {
  /** Stable ID assigned by the host. Format: "REQ-NNN" (3-digit zero-padded). */
  id: string;
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
  /** Heading text of the PRD section this was derived from, e.g. "Goals". */
  sourcePrdSection: string;
  /**
   * "empty" until CHUNK-08 runs. CHUNK-07 NEVER writes "draft" or "approved" —
   * those transitions are owned by CHUNK-08.
   */
  verificationStatus: VerificationStatus;
}

/**
 * Catalogue is a read-only projection. It is computed from
 * memory_entries (type='requirement', kind='requirement-item')
 * plus the resolved source-PRD link. Not persisted on its own.
 */
export interface RequirementsCatalogue {
  prdId: string;
  prdTitle: string;
  prdSections: string[];
  requirements: Requirement[];
}

/**
 * Output of parser.ts. IDs deliberately omitted — host assigns them.
 */
export type DecomposedRequirements = Array<
  Omit<Requirement, "id" | "verificationStatus"> & {
    /** Optional warnings the parser raised while normalising this row. */
    warnings?: string[];
  }
>;
```

### Memory-payload kind tagging

CHUNK-03's `memory_entries.type` for both the PRD and the requirements is `"requirement"` (Requirement Memory layer per `architecture/memory-layers.md`). To distinguish:

- PRD entry (CHUNK-06's output): `payload_json.kind === "prd"`.
- Requirement entry (this chunk's output): `payload_json.kind === "requirement-item"`.

CHUNK-07 reads `kind === "prd"` to find its parent and writes `kind === "requirement-item"` for its own entries. The `kind` discriminator lives inside the polymorphic payload, not in a new column — honouring CHUNK-03's schema contract.

### Webview ↔ extension messages

All under the `requirements.*` namespace, registered with `vscode-messenger` per CHUNK-02.

| Direction | Name | Payload | Response |
|---|---|---|---|
| webview → host | `requirements.list` | `{}` | `RequirementsCatalogue` |
| webview → host | `requirements.filter` | `{ type?: RequirementType; priority?: RequirementPriority; verificationStatus?: VerificationStatus; search?: string }` | `RequirementsCatalogue` (filtered server-side for >50 items; otherwise the webview filters client-side) |
| webview → host | `requirements.update` | `{ id: string; patch: Partial<Omit<Requirement, "id" \| "verificationStatus">> }` | `Requirement` (the updated entry) |
| webview → host | `requirements.delete` | `{ id: string }` | `{ ok: true }` |
| webview → host | `requirements.openDecomposePanel` | `{}` | `{ ok: true }` (host opens the panel) |
| webview → host | `requirements.generateDecomposePrompt` | `{}` | `{ prompt: string }` |
| webview → host | `requirements.pasteDecomposed` | `{ text: string }` | `{ ok: true; createdIds: string[] } \| { ok: false; reason: string; raw: string }` |
| host → webview | `requirements.changed` | `{ source: "create" \| "update" \| "delete"; ids: string[] }` | — (push) |

Notes:

- `requirements.filter` is provided as a host-side endpoint so very-long catalogues (>50 items, see §10) can stay performant; for small catalogues the webview just filters its in-memory list and never calls it. The endpoint exists so we can swap behaviours later without changing the message contract.
- `requirements.changed` is the push channel that lets the table refresh when another panel (e.g., the decompose panel) mutates state.

---

## 4. Data model touched

### Tables (all in CHUNK-03's schema — never redeclared here)

- `memory_entries` — one row per requirement (`type = 'requirement'`, `payload_json.kind = 'requirement-item'`).
- `memory_links` — one row per requirement linking it to its parent PRD.

### Concrete row shape (illustrative)

```jsonc
// memory_entries
{
  "id": "req-7c1f…",            // CHUNK-03 UUID, internal
  "type": "requirement",
  "title": "REQ-001 — User can create a project",
  "payload_json": {
    "kind": "requirement-item",
    "id": "REQ-001",            // user-visible ID (Requirement.id)
    "title": "User can create a project",
    "description": "…",
    "type": "Functional",
    "priority": "Must",
    "sourcePrdSection": "Goals",
    "verificationStatus": "empty"
  },
  "created_at": 1782345678,
  "updated_at": 1782345678
}

// memory_links
{ "from_id": "req-7c1f…", "to_id": "prd-9a02…", "kind": "derives-from" }
```

The `"derives-from"` link kind is **canonical per CHUNK-03's `LINK_KINDS`** (hyphenated, present tense — M02). CHUNK-07 uses it verbatim; earlier drafts of this spec referred to `'derived-from'` (past tense). One spelling project-wide: **`derives-from`**. The PRD endpoint of this link is the `type='requirement'` row whose `payload.kind === 'prd'` (B05; there is no separate `'prd'` memory type).

### Markdown body

Each requirement also gets a markdown body at `<workspace>/.deliveryos/memory/requirement/<entry-id>.md`. Per CHUNK-03's storage layout the file holds the long-form description, and `payload_json.description` mirrors it for index-friendliness. The host writes both atomically: SQL row first, then markdown file, then `db.export()` flush. On any I/O error the SQL transaction is rolled back so the two stores never drift.

### ID assignment policy

- The host scans existing `memory_entries WHERE type='requirement' AND payload_json LIKE '%"kind":"requirement-item"%'` for the highest existing `REQ-NNN`, then increments. Padded to three digits up to `REQ-999`; widens to four digits at 1000+ (defensive — MVP catalogues will never approach this).
- The parser's incoming `id` field is **ignored** to prevent collisions when the user re-decomposes or pastes a partial output.

---

## 5. VS Code APIs used

- `vscode.commands.registerCommand` — for `deliveryos.openRequirements` and `deliveryos.decomposePrd`.
- `vscode.window.createWebviewPanel` (via CHUNK-02's factory) — for both panels.
- `WebviewPanelSerializer` (CHUNK-02's base class) — so both panels survive reload.
- `vscode.env.clipboard.writeText` — for the "Copy prompt" button.
- `TreeDataProvider.onDidChangeTreeData` — emitter fired after every requirement mutation, refreshing the DEFINE → Requirements branch (the provider itself was registered in CHUNK-01).
- `vscode.workspace.fs.writeFile` / `readFile` — for the markdown bodies (via the existing helper in CHUNK-03).
- `vscode.window.showInformationMessage` and `showWarningMessage` — surfacing parse failures and "N requirements created" toasts.

No new `package.json` activation events are needed beyond the two new commands; CHUNK-01's activation event covers the rest.

---

## 6. Decomposition prompt template

Lives as a TypeScript string literal in `decompositionPrompt.ts`. Markdown so the user can read it before copying.

```md
You are a senior business analyst. Your job is to decompose the PRD below into
a structured requirements catalogue.

## PRD

<!-- BEGIN_PRD -->
{{PRD_MARKDOWN}}
<!-- END_PRD -->

## Output format

**Preferred:** return a single fenced JSON code block whose body is an array of
objects. Each object must have exactly these fields and types:

```json
[
  {
    "title": "string — short imperative phrase, 5–10 words",
    "description": "string — one paragraph, plain text or markdown",
    "type": "Functional" | "Non-Functional",
    "priority": "Must" | "Should" | "Could",
    "sourcePrdSection": "string — the heading text of the PRD section this came from"
  }
]
```

**Fallback:** if you cannot produce JSON, return a single GitHub-flavoured
markdown table with exactly these columns, in this order:

```md
| Title | Description | Type | Priority | Source PRD section |
| ----- | ----------- | ---- | -------- | ------------------ |
```

## Rules

- Do NOT include an `id` field. DeliveryOS assigns IDs.
- Every requirement must trace to a section in the PRD above.
- Functional and Non-Functional are the only allowed values for `type`.
- Use MoSCoW priorities only: `Must`, `Should`, `Could`.
- Aim for 15–40 requirements. If the PRD is small, fewer is fine.
- Do NOT propose verification criteria or test specs — that is a later stage.
- Return only the code block (JSON or markdown table). No prose around it.
```

`{{PRD_MARKDOWN}}` is the raw PRD body — bounded by `<!-- BEGIN_PRD -->` and `<!-- END_PRD -->` so the parser can later strip them if the user accidentally pastes them back along with the response.

### Parser fallback behaviour

- JSON parse succeeds → use it (`mode: "json"`).
- JSON parse fails → try the table parser (`mode: "markdown-table"`).
- Both fail → the paste-back panel switches to a **manual-add editor** seeded with the raw text in a scratch field. The user can:
  - Click "Add row" to insert one requirement at a time, OR
  - Click "Paste again" to retry parsing after they clean up the response.

No silent failure — the user always sees what went wrong and has a non-blocking path forward.

---

## 7. Step-by-step implementation outline

Estimated 4–5 session-days. Day boundaries are guidance, not contracts.

**Day 1 — Contracts and parser.**

1. Add `contracts/src/requirements.ts` with the types in §3. Re-export from `contracts/src/index.ts`.
2. Build `extension/src/requirements/parser.ts` with unit-test-style fixtures (a few JSON shapes, a few markdown tables, a few broken inputs). Run them via a small `ts-node` script — full Vitest setup is optional for MVP but recommended if CHUNK-02 already wired it.
3. Build `extension/src/requirements/decompositionPrompt.ts` as a pure function.

**Day 2 — Host wiring and Memory Store integration.**

4. Create `extension/src/panels/requirements/requirementsHost.ts`. Register both commands.
5. Implement the message handlers calling `MemoryStore` (CHUNK-03). Use `MemoryStore.create`, `update`, `list`, `link`.
6. Implement ID assignment (scan, increment, pad).
7. Extend the tree data provider: add the "Requirements" group node under DEFINE; lazy-load children; wire `onDidChangeTreeData`.

**Day 3 — Decompose panel webview.**

8. Add the Vite entry `webview/src/panels/requirements/main.tsx` (decompose variant or one shared entry that branches on a `panel` query param — pick one and document in the Vite config from CHUNK-02).
9. Build `DecomposePromptPanel.tsx` with the two-step UI.
10. End-to-end smoke test: paste a sample JSON response, confirm rows appear in SQLite + on disk, confirm tree refreshes.

**Day 4 — Catalogue webview.**

11. Build `RequirementsApp.tsx`, `RequirementsTable.tsx`, `RequirementDetail.tsx`.
12. Wire filter + sort. Implement empty state.
13. Wire `requirements.update` and `requirements.delete` round-trips.
14. Hook the `requirements.changed` push so opening the catalogue immediately after the decompose panel closes shows the new rows.

**Day 5 — Polish and verification.**

15. Run the full end-to-end manual test from §8.
16. Cosmetic Tailwind pass anchored to VS Code tokens (per CHUNK-02 hybrid theming).
17. Handle the parser-failure UX (manual-add fallback editor) — last because it's the long-tail path.
18. Confirm CSP-violation count remains zero in the webview devtools.

---

## 8. Test plan (manual, end-to-end)

Pre-condition: a project from CHUNK-01 exists with a PRD persisted by CHUNK-06.

1. Open the project in VS Code. Verify the DEFINE tree node already shows "Draft PRD".
2. Run command palette: `DeliveryOS: Decompose PRD into requirements`.
3. The Decompose Prompt panel opens. The PRD body is visible inside the prompt's `<!-- BEGIN_PRD -->` block.
4. Click "Copy prompt". Paste it into Claude.ai or ChatGPT in a separate window. Run it.
5. Copy the AI's response (a JSON code block).
6. Paste into the panel's "Paste AI response" textarea. Click "Parse and create".
7. Toast: "Created N requirements". Panel closes.
8. The DEFINE tree node now shows a "Requirements" group with N child items.
9. Open the catalogue (auto-opens after parse, or via `DeliveryOS: Open requirements catalogue`).
10. All N rows render. IDs are `REQ-001`…`REQ-NNN` in creation order.
11. Sort by Priority — Must rows float to the top.
12. Filter to Type=Non-Functional — only non-functional rows remain.
13. Click a row — detail editor opens. Edit the title. Save.
14. Tree refreshes; the renamed requirement shows in the tree.
15. Close VS Code. Reopen. Catalogue still shows N rows; the renamed one persisted.
16. Repeat step 6 with a deliberately broken paste (random text). Confirm the parse-failure manual-add editor appears and lets the user add a row by hand.
17. Repeat step 6 with a markdown-table response instead of JSON. Confirm it parses.
18. Open `.deliveryos/memory.sqlite` with the `sqlite3` CLI. Confirm N rows with `type='requirement'` and `payload_json` containing `"kind":"requirement-item"`. Confirm N `memory_links` rows with `kind='derives-from'` (canonical hyphenation per M02).
19. Inspect `.deliveryos/memory/requirement/` — N new markdown files exist plus the PRD's existing one.
20. Open the webview devtools (`Developer: Open Webview Developer Tools`) — confirm zero CSP violations.

**Phase-1 demoable contribution.** This chunk's outputs become the input to CHUNK-08 next week: the Test Designer specialist will iterate over these requirements one at a time.

---

## 9. Risks, edge cases, open questions

### Parsing fragility (the main risk)

**Mitigation strategy, layered:**

1. Prompt asks for JSON first (well-defined, machine-readable).
2. Markdown-table fallback (well-defined, human-friendly).
3. Manual-add fallback editor — never a dead end.
4. Parse warnings are surfaced per-row (the table can show a small warning glyph next to coerced fields).
5. The user can always edit any field after the fact, so a parse that produces "wrong but recoverable" data is acceptable.

### Duplicate IDs

The AI sometimes invents IDs (`REQ-1`, `R1`, `FR-001`). Resolution: parser drops the incoming `id`; host assigns canonical `REQ-NNN`. The host's scan-and-increment is the single source of truth. No race condition possible — the decompose flow is sequential and the panel disables its action button while the create batch runs.

### Very long catalogues (50+ requirements)

- Table virtualisation is **not** in MVP. Tailwind + native `<table>` handles 100–200 rows in a webview without noticeable lag — confirm with a stress test of 100 generated rows.
- If the test reveals lag: add `react-window` (or equivalent) in a follow-up; the message contract already supports server-side filter, so the swap is local to the webview.
- The decomposition prompt caps at "15–40 requirements" precisely to keep us in the comfortable range for MVP.

### Edge cases to verify in the manual test

- AI returns 0 requirements. Host treats `[]` as a no-op with a warning toast — does not delete existing requirements.
- AI returns a JSON object instead of an array (`{ requirements: [...] }`). Parser accepts both shapes — small special case in step 2.
- User runs Decompose twice. Default behaviour: **append** with continuing IDs. The catalogue toolbar has a "Clear all requirements" button (with a confirm) for the rare case the user wants to start over. Not destructive by default — re-running discovery / PRD / decompose is normal for a real project.
- PRD body contains markdown code fences that look like JSON. The PRD is wrapped in `<!-- BEGIN_PRD --> … <!-- END_PRD -->` sentinels in the prompt, and the parser only looks at the top-level outermost code fence in the user's pasted *response*, not inside the PRD comment. Verified by fixture.
- Source PRD section the AI invented isn't in the actual PRD. The detail editor's section dropdown shows actual headings; if the imported value doesn't match, it shows as `(unrecognised)` and the user can pick the right one.

### Open questions (flag for Prompt 3 audit)

- **Is `payload_json.kind` the right discriminator** for separating PRD vs requirement entries inside the same `type='requirement'` bucket, or should CHUNK-03 introduce a sub-type column? Recommendation: keep it in payload for now (zero schema change required) and revisit in Prompt 3 if the cohesion check shows other chunks need the same pattern.
- **~~`derived-from` link kind naming~~** — RESOLVED in Phase A Prompt 4: the canonical spelling is **`derives-from`** (CHUNK-03 `LINK_KINDS`). Every consumer uses this spelling; no `derived-from` literal remains anywhere.
- **PRD section list** — the detail dropdown needs a list of section headings. Best source is CHUNK-06's section-based PRD editor, which already knows them. Confirm with CHUNK-06 spec in Prompt 3 that the section list is exposed (e.g., `payload_json.sections: string[]`).

---

## 10. Explicit dependencies

### Inbound (this chunk consumes)

- **CHUNK-06** — provides the PRD Memory entry the decompose command reads. Specifically expects: `memory_entries` row with `type='requirement'`, `payload_json.kind='prd'`, plus a markdown body at `<workspace>/.deliveryos/memory/requirement/<prd-id>.md`. Section list from CHUNK-06 is needed for the detail editor dropdown.
- **CHUNK-03** — provides `MemoryStore` (CRUD + `link` + `walk`), the polymorphic `memory_entries` table, the `memory_links` table, and the on-disk layout under `.deliveryos/`. The Requirement payload sits inside `payload_json` per CHUNK-03's schema; no schema modification is needed.
- **CHUNK-02** — provides the webview HTML factory, CSP boilerplate, `vscode-messenger` wiring, `WebviewPanelSerializer` base, Tailwind hybrid theming, Vite multi-entry build.
- **CHUNK-01** — provides the static stage tree under which the new "Requirements" group attaches.

### Outbound (this chunk produces, consumed by later chunks)

- **CHUNK-08 (Test Designer)** — reads the requirement entries this chunk writes; mutates `verificationStatus` from `"empty"` to `"draft"` or `"approved"`; creates linked Test Spec entries with `kind = "has-test-spec"` (the canonical Requirement → TestSpec edge per CHUNK-08 / M02). The `'verifies'` kind is reserved for Verification → Requirement (per CHUNK-03 `LINK_KINDS`) and is NOT written here.
- **CHUNK-09 (Execution Brief composer)** — iterates over approved requirements; pulls their text, source PRD section, and the test specs CHUNK-08 attached.

### Shared-contract obligations honoured

- **Memory schema** — imported from CHUNK-03; never redeclared. Requirement payload fits inside `payload_json`.
- **Webview message contracts** — added as a new namespace `requirements.*` in `contracts/`; no collision with CHUNK-02's existing `hello` namespace or CHUNK-06's `prd.*`.
- **`.deliveryos/` directory layout** — uses the paths CHUNK-03 owns; introduces no new directories.
- **Manual prompt mode** — honoured strictly; zero outbound network calls.

---

## 11. Definition of done (this chunk)

- All files in §2 exist, compile, and ship inside `npm run build`'s `.vsix`.
- The end-to-end manual test in §8 passes on VS Code.
- `.deliveryos/memory.sqlite` shows the expected rows; markdown bodies exist on disk; SQL rows and files are consistent.
- The DEFINE tree node refreshes after every create/update/delete.
- Webview CSP-violation count is zero.
- The parser handles all three input modes (JSON, markdown-table, garbage-with-fallback-to-manual-edit) per the fixtures committed alongside `parser.ts`.
- No verification-criteria authoring exists yet in any UI surface — that scope is preserved for CHUNK-08.
