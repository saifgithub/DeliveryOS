# CHUNK-08 — Test Designer specialist + verification criteria attachment

**Status:** Spec (Phase A planning loop, Prompt 2).
**Parent plan:** [`docs/planning/part-1-plan.md`](../part-1-plan.md) §CHUNK-08.
**Source-of-truth refs:** PRD v0.3 §22 (specialist prompt shape), §23 (Bug Triage example for shape of the Test-First Specification section), architecture/memory-layers.md §2 + §7, architecture/stage-configuration.md (VERIFY stage shape), [`architecture/execution-briefs.md`](../../architecture/execution-briefs.md) §6 (Test-First Specification — downstream consumer).
**BUILD-PLAN target:** Phase 1, Week 6 (2026-06-29). This chunk **closes Phase 1**.
**Effort:** 3–4 session-days.

---

## 1. Restated goal and scope

### Goal

Build the only MVP specialist: **Test Designer**. Given an approved Requirement Memory entry, the user runs a manual-prompt flow that:

1. Generates a Test Designer specialist prompt (conforming to PRD §22's generic shape: Role, Objective, Project Context, Approved Inputs, Your Task, Output Format, Rules) and copies it to the clipboard.
2. The user runs that prompt in their AI tool of choice (Claude.ai, ChatGPT, etc.) and copies the AI's response back.
3. The user pastes the response into DeliveryOS; DeliveryOS parses it into (a) **verification criteria** (bulleted statements attached to the Requirement Memory entry) and (b) a **Test Specification** (a typed memory entry plus a markdown body on disk).

After this chunk, the requirement detail tree node shows two new children: "Verification criteria" and "Test spec". Phase 1 is demoable: raw idea → discovery → PRD → requirements → verification criteria + test specs, all inside the editor.

### In scope

- Test Designer webview panel (new) and the host that owns it.
- Test Designer prompt builder (manual-mode markdown rendering only; no API calls).
- Test Designer result parser (lenient markdown parser; raw-text fallback).
- A new memory type, `test-spec` (see §6 for the decision record). Markdown body on disk at `<workspace>/.deliveryos/memory/test-spec/<id>.md`.
- Updates to Requirement Memory: a `verificationCriteria: string[]` field populated by this chunk; a link of kind `has-test-spec` to the new Test Specification entry.
- Tree view changes: requirement detail node now has two child rows ("Verification criteria — N" and "Test spec — \<id>"). Activation reveals the existing requirement detail editor scrolled to the relevant section.
- Contracts package additions for the new webview ↔ host messages.
- One command (`deliveryos.requirements.runTestDesigner`) and a button on the existing requirement detail panel from CHUNK-07.

### Out of scope

- All other specialists (BA, Architect, Security, Privacy, …). The whole point of the trimmed MVP is that Test Designer is the **only** specialist.
- Direct API calls to model providers (Anthropic, OpenAI, etc.). Manual prompt mode only.
- Auto-execution of the generated test cases. Tests are author-time artefacts; CHUNK-14 handles the run-time verification loop.
- Gherkin (Given/When/Then) AST-level parsing. We standardise on **markdown bullets** as the test-case form for MVP (see §10).
- Modifications to the Execution Brief composer (CHUNK-09 consumes this chunk's output but is its own chunk).
- Tightening Verification Memory's schema. CHUNK-08 introduces a sibling memory type (`test-spec`); Verification Memory remains as defined in `architecture/memory-layers.md` §7 and is populated in CHUNK-14.

---

## 2. File-by-file breakdown

Paths are workspace-relative inside the DeliveryOS monorepo (established in CHUNK-02).

### `webview/src/panels/test-designer/main.tsx` (NEW)

- Vite entry point for the Test Designer webview, mirroring CHUNK-02's "hello" entry.
- Mounts `<TestDesignerApp />` into `#root`, instantiates the `vscode-messenger` client.
- Reads `window.__INITIAL_STATE__` (injected by the host's HTML factory) for the bootstrap `requirementId`.

### `webview/src/panels/test-designer/TestDesignerApp.tsx` (NEW)

- Top-level React component. Stateful with three modes: `idle` (prompt not generated), `prompt-ready` (prompt rendered, awaiting user to run externally), `awaiting-paste` (the user clicked "I've run this elsewhere"), `parsed` (paste-back parsed and shown for confirmation).
- Layout: two-pane (Radix `Tabs` or simple split): left = "Prompt", right = "Result". A header strip shows the parent requirement (id, title) fetched from the host on mount.
- Wires up host messages: `testDesigner.bootstrap`, `testDesigner.generatePrompt`, `testDesigner.copyPrompt`, `testDesigner.pasteResult`, `testDesigner.commit`, `testDesigner.cancel`.
- On `commit`, the host persists and the panel shows a success banner + auto-closes after 2s.

### `webview/src/panels/test-designer/PromptPreview.tsx` (NEW)

- Left-pane component. Renders the generated Test Designer prompt as a read-only markdown block (use a tiny renderer; reuse whatever PRD editor used in CHUNK-06 if it landed, otherwise display monospaced pre).
- "Copy prompt" button calls `navigator.clipboard.writeText(prompt)` and shows a transient toast. Falls back to a host-side clipboard message if the webview's clipboard API is restricted (see §8).
- "Regenerate" button: useful if the user edited the requirement after generating; re-asks the host for a fresh prompt.

### `webview/src/panels/test-designer/PasteResultInput.tsx` (NEW)

- Right-pane component. A `<textarea>` for the user to paste the AI's response.
- Two action buttons: "Parse" (validates + previews the parsed shape inline) and "Save" (commits via `testDesigner.commit`).
- Shows a parse-confidence banner: "high" (both sections found), "low" (one section missing or empty), "raw" (couldn't find either header — stored as raw markdown with a warning).
- A preview block underneath shows the parsed result: a bulleted list of verification criteria + a Test Spec preview (title + test-case bullets).

### `extension/src/panels/test-designer/testDesignerHost.ts` (NEW)

- `class TestDesignerHost` owning a `vscode.WebviewPanel`.
- Static `TestDesignerHost.open(context, requirementId)` factory: lazy-creates the panel (singleton per requirement; if open, reveals it).
- Implements `WebviewPanelSerializer` so the panel survives reloads (state shape: `{ requirementId, draftPasteText? }`).
- Hooks all the messenger handlers, delegates to `promptBuilder.ts` and `resultParser.ts`, persists via the `MemoryStore` from CHUNK-03.
- Owns the HTML factory call that injects nonce + manifest paths.

### `extension/src/specialists/testDesigner/promptBuilder.ts` (NEW)

- Pure function `buildTestDesignerPrompt(input: TestDesignerPromptInput): string`.
- `TestDesignerPromptInput` = `{ requirement: RequirementMemory; prd: { title: string; summary: string }; designContext?: string; existingTestSpec?: TestSpec }`. Design context is `undefined` in the MVP (no Design Memory yet); shape is reserved.
- Output: a markdown string that strictly follows PRD §22's 7-section shape. Concrete content in §3 below.
- Deterministic (no time-stamps, no IDs in the prompt body) so two calls with the same input produce byte-identical output — useful for snapshot tests.

### `extension/src/specialists/testDesigner/resultParser.ts` (NEW)

- `parseTestDesignerResult(raw: string): ParseResult` where `ParseResult = { confidence: 'high'|'low'|'raw'; verificationCriteria: string[]; testSpec: TestSpec; raw: string }`.
- Strategy (lenient, header-driven):
  1. Split the input on level-2 markdown headers (`^## `).
  2. Find the section whose heading contains "verification criteria" (case-insensitive); collect its top-level bullet lines (lines matching `/^\s*[-*]\s+/`) as `verificationCriteria`.
  3. Find the section whose heading contains "test specification" or "test spec"; parse its sub-sections (level-3 `^### ` headers) as individual test cases. Each test case = `{ id, title, bullets: string[] }`. Bullets are flat; we don't enforce Given/When/Then structure but suggest the labels in the prompt (see §3).
  4. If only one section is found, set confidence to `low`. If neither is found, set `raw` and store the whole text under `testSpec.raw`.
- Returns `confidence` for the UI banner.
- ID generation for test cases: `T-<requirementId>-<index>` (e.g. `T-REQ-002-01`).

### `contracts/src/testDesigner.ts` (NEW)

- Adds the new message slice to the contracts package (established in CHUNK-02).
- See §5 for the full message + type list.

### Existing files touched

#### `extension/src/extension.ts` (EDIT)

- Register the new command `deliveryos.requirements.runTestDesigner` (delegates to `TestDesignerHost.open`).
- Register the `TestDesignerHost`'s `WebviewPanelSerializer` for `viewType = 'deliveryos.testDesigner'`.

#### `extension/src/tree/stageTreeProvider.ts` (EDIT — from CHUNK-01/07)

- The existing Requirement child-builder now emits, for each Requirement that has populated `verificationCriteria` or a linked `test-spec`, two extra child nodes:
  - `VerificationCriteriaNode` — label `"Verification criteria — <n>"`; on click, opens the requirement detail panel scrolled to the criteria section.
  - `TestSpecNode` — label `"Test spec — <testSpecId>"`; on click, opens the test-spec markdown file via `vscode.commands.executeCommand('vscode.open', uri)`.

#### `webview/src/panels/requirement-detail/RequirementDetailApp.tsx` (EDIT — from CHUNK-07)

- Add a "Run Test Designer" button in the toolbar. On click, send `requirements.openTestDesigner` to the host with the current requirement id; the host opens the Test Designer panel.
- Add a new "Verification criteria" section to the detail layout. Read-only display of `verificationCriteria` bullets when present; empty-state message when missing.
- Add a "Test specification" section showing the linked test-spec (title + test-case titles + an "Open file" button that triggers `vscode.open` on the markdown body).

#### `contracts/src/index.ts` (EDIT)

- Re-export the new `testDesigner` namespace.

#### `extension/src/memory/types.ts` (EDIT — from CHUNK-03)

- Add `TestSpec` to the discriminated union of memory types (`type: 'test-spec'`). See §6 for the type-system decision.

#### `extension/src/memory/store.ts` (EDIT — from CHUNK-03)

- No schema migration needed — CHUNK-03's polymorphic `memory_entries` table is type-agnostic. Increment `_schema_version` only if we add an index hint; for MVP, skip.
- The existing helpers (`create`, `read`, `update`, `list(type)`, `link`) absorb the new type without further changes.

#### `extension/src/memory/markdownBodies.ts` (EDIT — from CHUNK-03)

- The path helper learns the new subfolder name: `test-spec` → `<workspace>/.deliveryos/memory/test-spec/<id>.md`. Trivial single-line change to the type→folder map.

---

## 3. Specialist prompt schema (Test Designer)

The Test Designer prompt is a markdown string emitted by `promptBuilder.ts`. It mirrors PRD §22's seven-section generic shape **section-for-section, header-for-header**, so future specialists slot into the same scaffold.

### Concrete content for each section

```md
# Specialist: Test Designer

## Role
You are a Test Designer for the project "<projectTitle>".
You produce verification criteria and a test specification for a single
approved requirement.

## Objective
Take the approved requirement below and produce:
1. A bulleted list of **verification criteria** — observable, falsifiable
   statements that, taken together, define what "this requirement is met"
   means.
2. A **test specification** — a set of named test cases, each expressed
   as markdown bullets. Cover happy-path and edge cases. Do not propose
   implementation; only describe what the tests must check.

## Project Context
- Project title: <projectTitle>
- PRD summary: <prdSummary>
- Design context: <designContext OR "None recorded yet.">

## Approved Inputs
You may rely **only** on the following inputs. Do not invent requirements
that are not stated here.

- Requirement ID: <requirement.id>
- Title: <requirement.title>
- Type: <requirement.type>            (Functional | Non-Functional)
- Priority: <requirement.priority>    (Must | Should | Could)
- Source PRD section: <requirement.sourcePrdSection>
- Description:
  <requirement.description>
- Existing assumptions / constraints (if any):
  <requirement.assumptions>

## Your Task
1. Write the verification criteria as a bulleted list under a level-2
   heading exactly named "## Verification Criteria".
2. Write the test specification under a level-2 heading exactly named
   "## Test Specification". Inside, each test case is a level-3 heading
   ("### T-<n> <test case title>") followed by bullets.
3. For each test case, include bullets labelled:
   - "- Given: <preconditions>"
   - "- When: <action>"
   - "- Then: <observable outcome>"
   (Use markdown bullets, not a Gherkin code block. Plain prose inside the
   labels is fine.)
4. Aim for 3–8 test cases per requirement.

## Output Format
Respond with **only** the markdown body — no preamble, no closing remarks,
no code-fence wrapper around the whole thing. The very first line of your
response must be "## Verification Criteria".

## Rules
- Test-first thinking: every criterion must be checkable from the outside
  (an observer of the running system can decide pass/fail).
- No implementation suggestions. Do not name files, classes, or libraries.
- Cover happy-path AND at least one edge / failure case.
- Do not introduce requirements that aren't in the Approved Inputs above.
  If something is unclear, list it under a final level-2 heading
  "## Open Questions" instead of guessing.
- If you must reference external systems, use the names that appear in
  the Project Context or Approved Inputs only.
```

### Template variables

| Token | Source |
| --- | --- |
| `<projectTitle>` | `intent.title` from Intent Memory |
| `<prdSummary>` | First paragraph of the canonical PRD markdown body (CHUNK-06 stored this in `requirement.payload.prdSummary` for convenience, or the prompt builder reads it on the fly) |
| `<designContext>` | Reserved — `"None recorded yet."` literal in MVP |
| `<requirement.*>` | Direct read from the Requirement Memory entry |

### Notes on the schema decision

- The `## Verification Criteria` and `## Test Specification` literal headers are **load-bearing** — `resultParser.ts` keys off them. If we change them in the prompt, we change them in the parser in the same commit.
- We instruct the model to begin with `## Verification Criteria` and to omit prose preamble. This survives ~95% of model variations in practice; the parser is lenient about extra leading whitespace and stray "Sure, here is…" lines (it strips lines until the first `^## `).

---

## 4. Key interfaces and types

These live in `contracts/src/testDesigner.ts` (shared) and `extension/src/memory/types.ts` (host-only memory types).

### Memory + value types (`contracts/src/testDesigner.ts`)

```ts
export interface VerificationCriterion {
  /** Stable id, unique within the requirement. e.g. "VC-REQ-002-01". */
  id: string;
  /** Plain text criterion, one bullet's worth. */
  text: string;
}

export interface TestCase {
  /** e.g. "T-REQ-002-01" */
  id: string;
  /** Short title (the level-3 heading without the id prefix). */
  title: string;
  /** Flat list of bullet lines. May contain "Given:"/"When:"/"Then:" labels
   *  as prose; we do NOT parse them out for MVP. */
  bullets: string[];
}

export interface TestSpec {
  /** Memory entry id; matches the row in memory_entries. */
  id: string;
  /** UUID of the Requirement this spec verifies. */
  requirementId: string;
  /** Human title — defaults to "Test spec for <requirement.title>". */
  title: string;
  /** Ordered list of test cases. */
  cases: TestCase[];
  /** Open questions returned by the AI (parsed from "## Open Questions"). */
  openQuestions: string[];
  /** The raw markdown body the AI returned, stored verbatim for audit. */
  raw: string;
  /** Parser confidence at the moment of save. */
  confidence: 'high' | 'low' | 'raw';
  createdAt: number;
  updatedAt: number;
}

export interface RequirementVerificationFields {
  /** New on Requirement Memory in CHUNK-08. */
  verificationCriteria: VerificationCriterion[];
  /** Convenience pointer; the canonical link is in memory_links. */
  testSpecId?: string;
}
```

### Webview ↔ extension messages

All messages use `vscode-messenger`'s typed contracts.

```ts
// requests (webview → extension, expect a response)
export type TestDesignerBootstrapReq = { requirementId: string };
export type TestDesignerBootstrapRes = {
  requirement: RequirementSummary;     // id, title, type, priority, description
  projectTitle: string;
  prdSummary: string;
};

export type TestDesignerGeneratePromptReq = { requirementId: string };
export type TestDesignerGeneratePromptRes = { prompt: string };

export type TestDesignerCopyPromptReq = { prompt: string };
export type TestDesignerCopyPromptRes = { ok: true };

export type TestDesignerPasteResultReq = {
  requirementId: string;
  raw: string;
};
export type TestDesignerPasteResultRes = {
  confidence: 'high' | 'low' | 'raw';
  preview: {
    verificationCriteria: string[];
    cases: { id: string; title: string; bullets: string[] }[];
    openQuestions: string[];
  };
};

export type TestDesignerCommitReq = {
  requirementId: string;
  raw: string;             // re-parsed host-side; webview cannot be trusted
};
export type TestDesignerCommitRes = {
  testSpecId: string;
  verificationCriteriaCount: number;
};

// notifications (one-way)
export type TestDesignerCancel = void;
```

The message constants are namespaced with a `testDesigner.` prefix to avoid collisions:

```
testDesigner.bootstrap          (request)
testDesigner.generatePrompt     (request)
testDesigner.copyPrompt         (request)   // host-side clipboard fallback
testDesigner.pasteResult        (request)
testDesigner.commit             (request)
testDesigner.cancel             (notification)
```

The parent panel (Requirement Detail from CHUNK-07) also gains:

```
requirements.openTestDesigner   (request)   // host opens the Test Designer panel
```

---

## 5. Data model touched

### Requirement Memory (extended)

`payload_json` for type `requirement` gains the field:

```jsonc
{
  // existing fields from CHUNK-07:
  "id": "REQ-002",
  "title": "Bug submission API",
  "type": "Functional",
  "priority": "Must",
  "description": "...",
  "sourcePrdSection": "5.2",

  // new in CHUNK-08:
  "verificationCriteria": [
    { "id": "VC-REQ-002-01", "text": "..." },
    { "id": "VC-REQ-002-02", "text": "..." }
  ],
  "testSpecId": "TS-REQ-002"   // convenience pointer; canonical link via memory_links
}
```

Storage: re-use CHUNK-03's polymorphic `memory_entries` table. No schema migration; just write the new payload on update.

### Test Specification Memory (new type)

A new row in `memory_entries` with `type = 'test-spec'`:

```jsonc
{
  "id": "TS-REQ-002",
  "type": "test-spec",
  "title": "Test spec for REQ-002 — Bug submission API",
  "payload_json": "{ ...TestSpec...}",
  "created_at": 1751212800000,
  "updated_at": 1751212800000
}
```

And a row in `memory_links`:

```
from_id="REQ-002", to_id="TS-REQ-002", kind="has-test-spec"
```

### Markdown body location

```
<workspace>/.deliveryos/memory/test-spec/<id>.md
```

The body is the AI's raw markdown response (the same string stored in `TestSpec.raw`). This is the file that gets opened when the user clicks the tree-view "Test spec" child. It is also the file CHUNK-09 (Execution Brief composer) reads to fill the brief's Section 6 ("Test-First Specification").

---

## 6. Decision: Test Specification is its **own memory type**, not a subtype of Verification Memory

Part-1-plan defers this call to CHUNK-08. The recommended path in the parent plan is **own type**, and this spec adopts it.

### Decision

`test-spec` is the **ninth** memory type. Verification Memory remains as defined in `architecture/memory-layers.md` §7 and is populated in CHUNK-14 (the post-execution verification verdict).

### Rationale

1. **Lifecycle mismatch.** A Test Specification is created at **design time** (before any harness has run). Verification Memory entries are created at **verify time** (after a Result Memory exists). Forcing them into one type forces awkward optional fields and an ambiguous "this verification is actually a test plan" state.
2. **Cardinality mismatch.** One requirement → one test spec (versioned). One result → many verifications (rework cycles, per `memory-layers.md` §7). Two different cardinality patterns argue for two types.
3. **Polymorphic table accommodates 9 types as easily as 8.** CHUNK-03's `memory_entries(id, type, title, payload_json, …)` is type-agnostic by design. Adding `'test-spec'` to the discriminated union is a one-line change.
4. **Downstream consumers are cleaner.** CHUNK-09 (Execution Brief Section 6) reads a `TestSpec`; CHUNK-14 (Verification) reads a `VerificationMemory`. Each consumer has a sharp single-purpose type and doesn't have to discriminate on a `phase` field.
5. **Auditability.** The Release Evidence chain (`Intent → Requirement → Design → TestSpec → ExecutionBrief → Result → Verification → Release`) reads as a clean chain when TestSpec is its own node. Subtyping under Verification collapses two nodes into one and obscures the order.

### Cost

- One more entry in the type→folder map (`'test-spec' → 'test-spec'`).
- One more arm in any future "iterate over all memory types" loop (none exist yet outside the type union).
- `architecture/memory-layers.md` should be updated in **Prompt 4** to mention the ninth type — **not in this chunk**. The architecture doc is out of scope for Prompt 2 per the orchestrator's constraints.

### Alternative considered (and rejected)

Treating `TestSpec` as `VerificationMemory` with `payload.subtype = 'plan'` vs `'verdict'`. Rejected because the union discriminator on payload is fragile (every consumer would need a guard), and the two halves don't share enough fields to justify the structural cost.

---

## 7. VS Code APIs used

- `vscode.window.createWebviewPanel` — Test Designer panel. `enableScripts: true`, `retainContextWhenHidden: true`, `localResourceRoots` set to the `webview/dist/` path.
- `vscode.WebviewPanelSerializer` — restore the panel across reloads (state: `{ requirementId, draftPasteText? }`).
- `vscode.commands.registerCommand` — `deliveryos.requirements.runTestDesigner`.
- `vscode.env.clipboard.writeText` — host-side clipboard write fallback (the in-webview `navigator.clipboard` works in modern VS Code but the host fallback is safer; CHUNK-08 wires both).
- `vscode.commands.executeCommand('vscode.open', uri)` — open the on-disk markdown body when the user clicks the tree-view "Test spec" child.
- `vscode.Uri.joinPath` — build the test-spec markdown body path.
- `vscode.workspace.fs.writeFile` — write the markdown body via the workspace fs API (handles remote workspaces correctly; do **not** use `fs.writeFileSync` here).
- `vscode.window.showInformationMessage` — confirmation toasts ("Test spec saved").
- `TreeDataProvider.onDidChangeTreeData` event firing — refresh the stage tree after commit so the new children appear immediately.

The Test Designer panel does **not** need terminal APIs, file system watchers, or workspace trust escalations beyond what the extension already declares in CHUNK-01.

---

## 8. Step-by-step implementation outline

A suggested order across 3–4 session-days. Each step ends with a runnable state.

1. **Contracts.** Add `contracts/src/testDesigner.ts` with the value types and message types from §4. Wire it into the contracts barrel (`contracts/src/index.ts`). No host or webview code yet — just the shared package compiles green. *(half day)*

2. **Memory type.** In `extension/src/memory/types.ts`, add `'test-spec'` to the type discriminator and the `TestSpec` payload type. In `extension/src/memory/markdownBodies.ts`, extend the type→folder map. Write a tiny unit test (`memory.create('test-spec', …)` round-trips). *(quarter day)*

3. **Prompt builder.** Implement `promptBuilder.ts` against the §3 schema. Add a snapshot test fed by a fixture Requirement to lock the output shape. Make the function pure and deterministic. *(half day)*

4. **Result parser.** Implement `resultParser.ts` with the lenient header-driven strategy from §2. Add 4–6 fixture inputs (high-confidence, low-confidence, raw, malformed, lots-of-prose-before-the-first-header) and assert the right `confidence` + extracted fields. *(half day)*

5. **Host panel.** Implement `testDesignerHost.ts`. Stub all the messenger handlers with synchronous logic that calls into the builder, parser, and memory store. Wire the HTML factory from CHUNK-02. Register the `viewType` and the serializer in `extension.ts`. *(half day)*

6. **Webview UI.** Build `TestDesignerApp.tsx`, `PromptPreview.tsx`, `PasteResultInput.tsx`. Keep styling minimal (Tailwind + VS Code CSS variables for chrome). Confirm round-trip end-to-end against the real `MemoryStore`. *(one session-day)*

7. **Tree view + requirement detail wiring.** Edit `stageTreeProvider.ts` to emit the two new child nodes. Edit `RequirementDetailApp.tsx` to add the "Run Test Designer" button and the new read-only sections. Fire `onDidChangeTreeData` after commit. *(half day)*

8. **End-to-end demo run.** Start from a requirement created in CHUNK-07's flow, run Test Designer against it using Claude.ai (or ChatGPT) as the external AI tool. Confirm the test-spec markdown lands on disk and the tree updates. Iterate on the prompt wording if the AI's output is consistently off-shape. *(half day, including possible prompt-wording bug fixes)*

---

## 9. Test plan

The chunk is verified by a single end-to-end run, plus targeted unit tests.

### Unit tests

- `promptBuilder.snapshot.test.ts` — feeds a fixture requirement and asserts the prompt string equals the committed snapshot. Catches accidental drift in the headers the parser depends on.
- `resultParser.test.ts` — five fixture inputs:
  - **High-confidence**: both `## Verification Criteria` and `## Test Specification` present with well-formed bullets. Expect `confidence: 'high'`, 3+ criteria, 3+ test cases.
  - **Missing test spec**: only criteria section. Expect `confidence: 'low'`, criteria parsed, empty `cases`.
  - **Missing criteria**: only test spec section. Expect `confidence: 'low'`, empty criteria, cases parsed.
  - **Raw**: neither header. Expect `confidence: 'raw'`, `testSpec.raw` set, empty arrays.
  - **Noisy preamble**: "Sure, here are the tests…" before the first header. Expect parser to skip the preamble and start at the first `^## `.

### Integration test (host-side)

- Open a `TestDesignerHost` in a test extension-development host. Send `testDesigner.bootstrap` → assert it returns the requirement summary. Send `testDesigner.generatePrompt` → assert it returns the deterministic prompt string. Send `testDesigner.commit` with a fixture raw input → assert (a) `memory_entries` has a new `test-spec` row, (b) `memory_links` has a `has-test-spec` row, (c) `Requirement.payload.verificationCriteria` is populated, (d) `.deliveryos/memory/test-spec/<id>.md` exists on disk and contains the raw input.

### End-to-end manual test (Phase-1 demo flow)

Starting from an empty workspace:

1. Run CHUNK-05 → CHUNK-07 flow: capture an idea (e.g. "I want a bug triage assistant"), run discovery, generate a PRD, decompose into 3+ requirements.
2. Click on REQ-002 (or any requirement). Open the requirement detail panel.
3. Click "Run Test Designer". Confirm the Test Designer panel opens, populated with the requirement summary.
4. Click "Generate prompt". Confirm the rendered prompt matches §3's shape — 7 sections, the requirement plugged in.
5. Click "Copy prompt". Paste into Claude.ai. Get the response. Copy it.
6. Paste into DeliveryOS's right pane. Click "Parse". Confirm the banner reads "high confidence" and the preview shows 3+ criteria + 3+ test cases.
7. Click "Save". Confirm the panel auto-closes; the tree view now shows two new children under the requirement: "Verification criteria — N" and "Test spec — TS-REQ-002".
8. Click "Test spec — TS-REQ-002". Confirm VS Code opens `<workspace>/.deliveryos/memory/test-spec/TS-REQ-002.md` and the markdown matches the AI's output.
9. Reopen the requirement detail panel. Confirm the "Verification criteria" and "Test specification" sections are populated.
10. Close VS Code, reopen. Confirm everything persists (memory store roundtrip).

**Demoable state after step 10:** "Type an idea, walk through discovery, get a PRD, get requirements, get test specs. All inside the editor." This is the Phase 1 demo line from BUILD-PLAN.

---

## 10. Risks, edge cases, open questions

### Risk 1: Test spec format trade-off (markdown bullets vs Gherkin vs tables)

**Context.** CHUNK-13 ("Allowed/Forbidden diff") and CHUNK-14 ("Verification") both consume the test spec. The richer the structure, the easier downstream parsing; the looser the structure, the more robust to model variation.

**Decision (this chunk).** **Markdown bullets** for MVP. Bullets are universally produced by every modern AI tool, easy to eyeball, and Lenient parsing keeps the manual flow forgiving. We instruct the model (in §3, "Your Task" step 3) to label bullets with "Given:", "When:", "Then:" inline — gives us most of Gherkin's clarity without its parser rigidity.

**Revisit point.** **Start of CHUNK-13.** If the diff feature genuinely needs to reason about test-case structure (e.g. "did the harness add tests covering the same Given:/When:/Then: shape as the spec?"), upgrade the parser then to extract Given/When/Then atoms. Cost of deferral: a few hours of parser work in CHUNK-13, much smaller than the cost of locking ourselves into Gherkin now.

### Risk 2: AI doesn't follow the prompt shape

**Context.** Manual-prompt mode means the AI may return "Sure! Here are some great tests for you:" preambles, mis-named headers ("# Tests" vs "## Test Specification"), or test cases inside code fences.

**Mitigation.** Lenient parser per §2. Confidence banner in the UI. If the user can see "low confidence — only criteria parsed", they can edit the textarea and re-parse. As a final fallback, they can hand-edit the saved markdown body (`.deliveryos/memory/test-spec/<id>.md`) directly — DeliveryOS re-reads the markdown body on next open.

### Risk 3: Clipboard write fails in webview

**Context.** Some VS Code variants (older Cursor, Windsurf in restricted-trust mode, web VS Code) restrict `navigator.clipboard.writeText` in webviews.

**Mitigation.** Two-path clipboard: try webview-side first; on failure, send `testDesigner.copyPrompt` to the host, which calls `vscode.env.clipboard.writeText`. Toast either way. Already accounted for in §2 (PromptPreview) and §7 (VS Code APIs).

### Risk 4: Singleton-per-requirement panel logic

**Context.** If the user opens Test Designer for REQ-002, then for REQ-003, what happens to the REQ-002 panel?

**Decision.** Keep them as independent panels (multiple panels open is fine). Singleton is **per (requirementId)** — opening Test Designer for the same requirement twice just reveals the existing panel. Avoids the user accidentally clobbering an unsaved paste-back from a parallel session.

### Open question 1: Versioning test specs

If the user re-runs Test Designer on a requirement that already has a test spec, do we (a) overwrite, (b) create a new versioned spec linked to the previous one, or (c) append?

**Recommendation (this chunk):** **overwrite** with a confirmation dialog. The user is in manual mode and is the source of truth for what they paste; rework cycles are explicit. Versioning of test specs adds complexity that doesn't pay off until CHUNK-14's verification-with-rework story. Revisit if needed in CHUNK-14.

### Open question 2: What if the AI returns "## Open Questions"?

The §3 prompt explicitly invites the model to use `## Open Questions` if requirements are unclear. We parse and store these but don't surface them in the requirement detail editor in this chunk — they end up in `TestSpec.openQuestions` and are visible in the saved markdown body.

**Recommendation:** add a "needs-attention" badge to the tree-view "Test spec" child if `openQuestions.length > 0`. Tiny UX add; deferrable. Listed as a Prompt-4 doc-update candidate.

---

## 11. Explicit dependencies

### Depends on

- **CHUNK-01** — extension scaffold, command registration, tree view (`stageTreeProvider`).
- **CHUNK-02** — webview foundation (Vite, CSP HTML factory, `vscode-messenger`, contracts package).
- **CHUNK-03** — `MemoryStore`, polymorphic `memory_entries` schema, `memory_links`, markdown-body path helper, on-disk `.deliveryos/memory/<type>/` layout.
- **CHUNK-06** — PRD exists with a summary the prompt builder can quote.
- **CHUNK-07** — Requirement Memory exists, requirement detail panel exists (this chunk adds buttons + sections to it).

### Exposes / consumed by

- **CHUNK-09 (Execution Brief composer)** — reads the linked `TestSpec` to fill the brief's Section 6 ("Test-First Specification"). The brief composer treats the test-spec markdown body as a quotable artefact; it does not need to re-parse the AST.
- **CHUNK-13 (Allowed/Forbidden diff)** — may upgrade the parser to extract Given/When/Then atoms (see §10 Risk 1).
- **CHUNK-14 (Verification)** — reads the `TestSpec` cases + `Requirement.verificationCriteria` and builds the verification checklist; the user manually approves pass/fail per criterion.

### Shared cross-chunk contracts honoured

- **Memory schema** (defined in CHUNK-03). This chunk adds a new value type to the discriminated union; no schema migration.
- **Webview message contracts** (`contracts/` package). This chunk adds a `testDesigner` slice; no existing message renamed or removed.
- **`.deliveryos/` memory directory layout** (defined in CHUNK-03). This chunk adds the `test-spec/` subfolder per the existing `<type>` → `<folder>` rule.
- **Tree view contract** (CHUNK-01). This chunk emits two new child node kinds under the existing Requirement parent; no parent kind changed.

---

## 12. Phase 1 demoable-state note

This chunk **closes Phase 1**. After it lands, the BUILD-PLAN line stands up:

> **Phase 1 demo line.** "Type an idea, walk through discovery, get a PRD, get requirements, get test specs. All inside the editor."

Concretely, a viewer of the recorded demo (or anyone who installs the `.vsix` at this point) can:

1. Open DeliveryOS.
2. Run "Create a project", type a one-line idea.
3. Walk DISCOVER → DEFINE end-to-end using only manual-prompt mode against their AI tool of choice.
4. End up with: an Intent Memory entry with discovery answers, a PRD markdown document, a Requirements catalogue, and for at least one requirement, a verification-criteria list + a test-spec markdown body.
5. Close VS Code, reopen, and find all of it persisted in `<workspace>/.deliveryos/`.

What's **not yet** demoable after this chunk: no Execution Brief (CHUNK-09), no harness handoff (CHUNK-10/11), no diff feature (CHUNK-13), no verification + release evidence (CHUNK-14). Those land across Phases 2 and 3.

---

## 13. Out-of-scope doc updates (defer to Prompt 4)

These notes are flagged for the Prompt-4 iteration; do **not** touch in this chunk:

- `architecture/memory-layers.md` — add the ninth memory type, `Test Specification Memory`, between sections 2 (Requirement) and 7 (Verification). One paragraph.
- `architecture/execution-briefs.md` §6 — clarify that "Test-First Specification" content is sourced from the linked Test Specification Memory entry written in CHUNK-08.
- PRD v0.4 (post-MVP) — record the manual-mode Test Designer flow as a worked example alongside §22/§23.

(End of CHUNK-08 spec.)
