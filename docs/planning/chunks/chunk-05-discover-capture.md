# CHUNK-05 — Raw idea capture + Discovery interview workspace

**Status:** Phase A planning, Prompt 2 expansion.
**Source row:** `docs/planning/part-1-plan.md` → "CHUNK-05 — Raw idea capture + Discovery interview workspace".
**Phase / week:** Phase 1 / Week 3 (2026-06-08).
**Effort:** 4–5 session-days.
**Depends on:** CHUNK-02 (webview foundation), CHUNK-03 (memory store + Intent type).
**Exposes:** Discovery Record schema consumed by CHUNK-06 (PRD generation).

---

## 1. Restated goal and scope

### Goal

Build the first end-user surface of DeliveryOS: capture a raw idea, generate a discovery-interview prompt the user runs in their AI tool of choice (Claude.ai, ChatGPT, etc.), then capture the answers back and render a Discovery Record. Everything in **manual prompt mode** — DeliveryOS makes no API calls to any model provider.

### In scope

- One new webview panel mounted by command `deliveryos.openDiscover`. Three working views inside it (selected via a small in-panel mode switcher), each backed by a single shared state in the host:
  1. **Raw idea input** — long-text capture, save to Intent Memory.
  2. **Discovery prompt preview + copy** — renders the discovery interview prompt from the curated MVP question library + the raw idea; clipboard button.
  3. **Discovery answers input** — paste-back of the AI's answers, parsed into per-question buckets where possible, raw-fallback otherwise.
  4. **Discovery summary** — read-only formatted Q&A view (same panel, read-only mode).
- Hardcoded ~12-question MVP discovery library (see §4).
- Intent Memory record (from CHUNK-03) extended with a full raw idea body and a `discovery` field in `payload_json` holding the Discovery Record.
- Tree view (CHUNK-01's `deliveryos.stages` `TreeDataProvider`) gains two child nodes under DISCOVER once each exists:
  - `Raw idea` — opens the panel in raw-idea mode.
  - `Discovery interview` — opens the panel in discovery summary mode (or answers-paste mode if no answers yet).
- **First real use of Radix UI** primitives in the webview, per CHUNK-02's deferred decision (Tailwind already wired; Lucide React for icons).
- Persistence across restart (verified by closing the editor mid-flow and reopening).

### Out of scope

- AI-suggested mid-stages — the "trigger question" mechanic in PRD § 10.8. Trimmed MVP runs the four-stage default only. We capture the answer text, but we do NOT infer stages from it. (Out-of-scope per CHUNK-05 row in part-1-plan.md and per the trimmed MVP statement.)
- Configurable stage library wiring beyond surfacing as static config — not relevant in this chunk at all.
- Specialist expansion (BAs, Architects, etc.) — only the Test Designer specialist is in scope, and that lands in CHUNK-08.
- Direct API calls to Claude / OpenAI / etc. — every prompt is copy-out, paste-in.
- AI parsing of pasted answers (no inference / no LLM call). Parsing is a deterministic split-by-heuristic in the host with a raw-text fallback.
- PRD generation — that is CHUNK-06.
- Multi-project switching UX — assume the single active project from CHUNK-01.

---

## 2. File-by-file breakdown

All paths relative to the monorepo root established in CHUNK-02 (`extension/`, `webview/`, `contracts/`).

### 2.1 Webview side (`webview/src/panels/discover/`)

```text
webview/src/panels/discover/
  main.tsx
  DiscoverApp.tsx
  RawIdeaInput.tsx
  DiscoveryPromptPreview.tsx
  DiscoveryAnswersInput.tsx
  DiscoverySummary.tsx
  index.html       # Vite entry HTML for this panel
  styles.css       # panel-local tailwind layer (if needed beyond globals)
```

**`webview/src/panels/discover/main.tsx`**
Vite entry. Mounts `<DiscoverApp />` into `#root`. Initialises `vscode-messenger` client from CHUNK-02 (`createWebviewMessenger()` or equivalent) and exposes it via React context. Initialises Radix UI's `Theme` provider wrapper. Calls `discover.requestInitialState` once on mount to hydrate.

**`webview/src/panels/discover/DiscoverApp.tsx`**
Top-level component. Holds local React state mirroring the latest `DiscoveryPanelState` from the host (see §5 message types). Renders a Radix `Tabs.Root` with four tabs: `Raw idea`, `Prompt`, `Answers`, `Summary`. Each tab gates on prerequisite state (Prompt tab disabled until raw idea exists; Answers tab disabled until prompt has been generated at least once; Summary tab disabled until at least one answer block has been saved).
Subscribes to `discover.stateChanged` notifications so the panel updates if the host changes state out of band (e.g. tree-view click navigates to a different mode).
Uses Radix `Toast` for "Saved", "Prompt copied to clipboard", "Answers parsed".

**`webview/src/panels/discover/RawIdeaInput.tsx`**
Radix `Form` + a large `<textarea>` (autosized; min ~12 rows). Optional one-line title. "Save raw idea" button (Radix `Button`-styled) sends `discover.saveRawIdea`. Local autosave-on-blur with a 1s debounce. Word/char counter. Shows last-saved timestamp from `state.rawIdea.savedAt`. Empty state when no raw idea yet.

**`webview/src/panels/discover/DiscoveryPromptPreview.tsx`**
Renders the generated prompt markdown read-only inside a scrollable code-styled panel (Radix `ScrollArea`). A primary action button "Copy prompt" sends `discover.copyPrompt` (host writes to clipboard via `vscode.env.clipboard.writeText`). Secondary action "Regenerate" — triggers `discover.generatePrompt` again (useful if the user edits the raw idea).
A small expandable Radix `Collapsible` titled "What the user will get the AI to do" — explains the manual-mode loop in plain English (one short paragraph).
Question count badge ("Generated from 12 questions").

**`webview/src/panels/discover/DiscoveryAnswersInput.tsx`**
A large `<textarea>` for pasting the AI's reply. Below it, a "Parse answers" button. Parsing is host-side (deterministic — see §5 `parseAnswers`). On parse, the component swaps into per-question editable cards (Radix `Accordion` with one item per question). Each card shows the question prompt, an editable textarea pre-filled with the parsed answer (or empty if not matched), and a "Mark as N/A" toggle.
A "Raw answers" toggle keeps the un-parsed paste accessible (stored alongside the parsed answers).
"Save answers" sends `discover.saveAnswers` with the full `DiscoveryRecord` payload.

**`webview/src/panels/discover/DiscoverySummary.tsx`**
Read-only render of the saved Discovery Record. One section per question. Markdown rendering of answer text (use a tiny markdown lib already in the webview bundle — e.g. `marked` or `markdown-it`; pick whichever CHUNK-02 settled on, no new dep here). Header shows project name + saved-at timestamp. "Edit answers" button switches back to the Answers tab.

### 2.2 Extension host side

**`extension/src/panels/discover/discoverHost.ts`**
Owns the webview panel lifecycle. Exports:

- `registerDiscover(context: vscode.ExtensionContext, deps: DiscoverDeps): vscode.Disposable` — registers the `deliveryos.openDiscover` command and a `WebviewPanelSerializer` for restore-on-reload.
- Internal: `DiscoverPanel` class encapsulating one open panel (singleton per project — reopening focuses the existing panel).
- Wires the messenger handlers for every message in `contracts/src/discover.ts` (see §5).
- Reads/writes Intent Memory via the `MemoryStore` injected through `deps`.
- Owns the `currentMode` state ("rawIdea" | "prompt" | "answers" | "summary") and accepts navigation requests from the tree view (`focusDiscover(mode)`).

`DiscoverDeps` (constructor injection, supplied from `extension/src/extension.ts`):

```ts
interface DiscoverDeps {
  memoryStore: MemoryStore;                  // from CHUNK-03
  promptBuilder: DiscoveryPromptBuilder;     // see 2.3
  questionLibrary: DiscoveryQuestion[];      // see 2.4
  htmlFactory: WebviewHtmlFactory;           // from CHUNK-02
  messenger: HostMessenger;                  // from CHUNK-02
  logger: Logger;
}
```

**`extension/src/discovery/promptBuilder.ts`**
Pure module. No VS Code dependency. Exports:

```ts
export interface DiscoveryPromptInput {
  projectTitle: string;
  rawIdea: string;
  questions: DiscoveryQuestion[];
}

export function buildDiscoveryPrompt(input: DiscoveryPromptInput): string;
```

Returns the markdown shape described in §6. Trivial template — string interpolation only, no AI calls. Pure-function makes it trivially unit-testable (no Vitest setup needed at this layer — defer test infra to a later chunk; the manual end-to-end test is sufficient verification for the MVP).

**`extension/src/discovery/questionLibrary.ts`**
Exports the hardcoded ~12-question library as a `const` array (see §4). Frozen at build time. Each entry has an `id`, `prompt`, `topic`, and optional `helperText`.

**`extension/src/discovery/answersParser.ts`**
Best-effort parser that maps a pasted answer blob to `DiscoveryAnswer[]`. Heuristic:

1. Try to split on question headings (look for the question text or an `### Q<n>` / `Q<n>.` / `**Q<n>**` marker matching `questions[n].id`).
2. Trim whitespace per block; preserve markdown within.
3. Whatever cannot be matched goes into the record's `unmatched` raw-text field for the user to manually allocate or leave as-is.

Pure module. Failure mode is "best effort" — the user can always hand-edit in the accordion cards.

**`extension/src/panels/discover/treeContribution.ts`** (or extend the existing TreeDataProvider in CHUNK-01)
Adds the two DISCOVER children. Imports the memory store and watches Intent Memory updates (CHUNK-03's `MemoryStore.onDidChange` event — if not present, this chunk adds it as a minimal `EventEmitter<MemoryChange>` in `MemoryStore`).

- `Raw idea` — shown when the project's Intent Memory entry has a non-empty raw idea body. `command: deliveryos.openDiscover`, `arguments: ['rawIdea']`.
- `Discovery interview` — shown when the same Intent entry has a non-empty `payload_json.discovery.answers` array. `command: deliveryos.openDiscover`, `arguments: ['summary']` (falls back to `'answers'` if not answered yet but prompt generated).

### 2.3 Contracts

**`contracts/src/discover.ts`** — new file. See §5 for the full type set. Re-exported from `contracts/src/index.ts`. NO redeclaration of `IntentMemory` — imported from `contracts/src/memory.ts` (CHUNK-03's module).

### 2.4 Build wiring

- `webview/vite.config.ts` (from CHUNK-02) gets a new entry: `'panels/discover': 'src/panels/discover/main.tsx'`. Produces `dist/webview/panels/discover/{index-[hash].js, index-[hash].css}` + manifest entry.
- `extension/src/extension.ts` adds one call: `subscriptions.push(registerDiscover(context, deps));` next to the existing `registerHello`.
- `package.json` `contributes.commands` adds:
  ```json
  { "command": "deliveryos.openDiscover", "title": "DeliveryOS: Open Discover" }
  ```
- `contributes.menus."view/item/context"` (existing tree view from CHUNK-01) — no new entries here, the tree items invoke the command via their `command` field.

---

## 3. Tree view changes

Extending the `StageNode | ArtefactNode` tree from CHUNK-01:

```text
DeliveryOS (sidebar view: deliveryos.stages)
└── DISCOVER                       (StageNode, static)
    ├── Raw idea                   (ArtefactNode — shown iff rawIdea.body !== '')
    └── Discovery interview        (ArtefactNode — shown iff discovery.answers.length > 0
                                                  OR discovery.promptGeneratedAt !== null)
└── DEFINE                          (untouched in this chunk)
└── EXECUTE                         (untouched)
└── VERIFY                          (untouched)
```

`TreeDataProvider.getChildren(StageNode 'DISCOVER')` queries the memory store for the active project's Intent Memory entry and returns 0–2 artefact nodes.

When the user clicks an artefact node, `command: deliveryos.openDiscover` runs with the desired mode passed as the first argument. `discoverHost` reads it, focuses or creates the panel, and sends `discover.setMode` to the webview.

`TreeDataProvider` fires `_onDidChangeTreeData.fire(undefined)` whenever `MemoryStore` emits a change relevant to the active project's Intent entry.

---

## 4. The ~12 discovery questions (MVP hardcoded library)

Trimmed aggressively from PRD § 10.8 mid-stage triggers and from the v0.1 discovery interview prompt. Each entry below is `id`, `topic`, `prompt`, optional `helperText`. The selection prioritises questions whose answers most usefully shape a PRD downstream; trigger-question signals for mid-stage suggestion are NOT used in the trimmed MVP, but the answer text is preserved so a future build can mine them.

```ts
// extension/src/discovery/questionLibrary.ts
export const DISCOVERY_QUESTIONS_MVP: DiscoveryQuestion[] = [
  {
    id: 'Q1',
    topic: 'problem',
    prompt: 'What problem does this solve, and for whom? Be concrete — a one-paragraph problem statement and the primary user or buyer.',
  },
  {
    id: 'Q2',
    topic: 'scope',
    prompt: 'What is in scope for the first usable version, and what is explicitly out of scope?',
    helperText: 'List the minimum behaviours that make this useful, and the things that look related but you are deliberately not building.',
  },
  {
    id: 'Q3',
    topic: 'users',
    prompt: 'Who are the users? How many user types are there, and what does each one do with the system?',
  },
  {
    id: 'Q4',
    topic: 'data',
    prompt: 'What data does the system store, read, or write? Does any of it count as personal, sensitive, or regulated (PII, PHI, payment, credentials)?',
  },
  {
    id: 'Q5',
    topic: 'regulated-industry',
    prompt: 'Does this operate in a regulated industry (health, finance, government, education)? Any compliance regimes that apply (HIPAA, GDPR, SOC 2, PCI, ADA, WCAG)?',
  },
  {
    id: 'Q6',
    topic: 'surface',
    prompt: 'Is this customer-facing, internal-only, or somewhere in between? Is there a user interface, an API, both?',
  },
  {
    id: 'Q7',
    topic: 'integrations',
    prompt: 'What external systems does it integrate with? Auth providers, payment gateways, third-party APIs, internal services, AI models?',
  },
  {
    id: 'Q8',
    topic: 'performance-scale',
    prompt: 'What scale and performance does it need at launch? Request rates, data volumes, response-time expectations, concurrent users.',
  },
  {
    id: 'Q9',
    topic: 'success-criteria',
    prompt: 'How will you know it works? Three to five concrete success criteria — outcomes you could test or measure against.',
  },
  {
    id: 'Q10',
    topic: 'constraints',
    prompt: 'What constraints does the work have? Deadline, budget, headcount, stack you must use, stack you must avoid, deployment target.',
  },
  {
    id: 'Q11',
    topic: 'risks-unknowns',
    prompt: 'What are the biggest unknowns or risks? Things you do not know yet that could change the shape of the build.',
  },
  {
    id: 'Q12',
    topic: 'release-shape',
    prompt: 'What does a first release look like? Internal demo, customer beta, public launch. Who needs to sign off before it ships?',
  },
];
```

12 questions — fits "the hardcoded ~12-question MVP set" exactly. Topics map to PRD § 10.8 triggers (Q4→Privacy, Q5→Compliance/Legal/Accessibility, Q6→UX, Q7→Architecture, Q8→Cost/Ops, Q12→Pre-release Sign-off) so the future "auto-suggest mid-stages" feature is a pure read of these answers — no question library change required when that lands.

The library is intentionally hand-curated. Future iterations can add questions or split them; the MVP keeps the list short to keep the AI tool's response manageable (typically 600–1500 words back).

---

## 5. Key interfaces and types

All TypeScript. Schemas live in `contracts/` so both sides of the boundary share them.

### 5.1 Domain types

**Memory schema reused from CHUNK-03.** `IntentMemory` is the existing discriminated-union variant in `contracts/src/memory.ts`. **CHUNK-03 (NOT CHUNK-05) owns the canonical `IntentPayload` shape.** CHUNK-05 imports it and does NOT redeclare. Per the shared-contract rule in part-1-plan.md §"Shared cross-chunk contracts", and per M15 in the Phase A validation report, the canonical type lives next to the Intent entry in CHUNK-03's contracts module.

**Canonical `IntentPayload` shape (lives in `contracts/src/memory.ts`, owned by CHUNK-03):**

```ts
// in contracts/src/memory.ts (CHUNK-03 owns this file)
export interface IntentPayload {
  /** The user's raw idea text, captured before the discovery interview. */
  rawIdea: {
    text: string;
    capturedAt: number;     // unix ms
  };
  /** Discovery interview result; null until the user completes the interview. */
  discovery: {
    promptSnapshot: string;       // exact prompt that was sent to the AI tool, for audit
    answers: DiscoveryAnswer[];   // one per question, possibly with markedNA
    completedAt: number;          // unix ms when the user saved the answers
  } | null;
}
```

CHUNK-05 imports `IntentPayload` and the canonical `RawIdea` / `DiscoveryRecord` / `DiscoveryAnswer` shapes from CHUNK-03's `contracts/src/memory.ts` — these are the persisted shapes and CHUNK-05 must NOT redeclare them. The CHUNK-05 webview state types in §5.2 are **panel-local view models** named distinctly (`RawIdeaView`, `DiscoveryDraft`, `DiscoveryAnswerInput`) so there is **no identifier collision** with the canonical types. Conversion happens at the host adapter (request/response handlers). The persisted shape is always the canonical one above.

If CHUNK-03 has already shipped without these fields, the migration runner in CHUNK-03's memory store (the "8-line migration runner" mentioned in CHUNK-03 spec) bumps `_schema_version` and adds the columns / defaults. This chunk does not own the migration mechanism but does own the migration step required to introduce these fields.

**Panel-local view models — defined in `contracts/src/discover.ts`** (named distinctly to avoid colliding with CHUNK-03's canonical `RawIdea`/`DiscoveryRecord`/`DiscoveryAnswer`):

```ts
export interface RawIdeaView {
  body: string;            // === canonical RawIdea.text after adapt
  title?: string;          // optional short title; auto-derived if omitted
  savedAt: number;         // unix ms; === canonical RawIdea.capturedAt
  updatedAt: number;       // unix ms; panel-only
}

export interface DiscoveryQuestion {
  id: string;              // 'Q1' .. 'Q12'
  topic: string;           // 'problem' | 'scope' | ... (kept as string for forward-compat)
  prompt: string;
  helperText?: string;
}

export interface DiscoveryAnswerInput {
  questionId: string;      // FK to DiscoveryQuestion.id
  body: string;            // markdown allowed; sanitised before render (see §10)
  markedNA: boolean;
}

export interface DiscoveryDraft {
  promptGeneratedAt: number | null;   // when buildDiscoveryPrompt last ran
  promptSnapshot: string | null;      // the exact prompt the user copied (for audit)
  questionsSnapshotIds: string[];     // ids of the question library at prompt time
  rawAnswersPaste: string;            // the unparsed paste (audit / fallback)
  answers: DiscoveryAnswerInput[];    // one per question, possibly with markedNA
  unmatchedText: string;              // anything the parser could not place
  answeredAt: number | null;          // when saveAnswers last ran
}
```

The host adapter projects between these panel-local view models and the canonical persisted shapes:

```text
panel: RawIdeaView { body, savedAt, updatedAt, title? }
        ↓ host adapter (drops updatedAt + title; renames body→text, savedAt→capturedAt)
canon:  RawIdea { text, capturedAt }

panel: DiscoveryDraft (rich; with promptGeneratedAt, questionsSnapshotIds, rawAnswersPaste, unmatchedText)
        ↓ host adapter (keeps promptSnapshot, answers, derives completedAt from answeredAt)
canon:  DiscoveryRecord { promptSnapshot, answers, completedAt }

panel: DiscoveryAnswerInput { questionId, body, markedNA }
        ↓ host adapter (resolves question text by id; drops markedNA when N/A)
canon:  DiscoveryAnswer { question, answer }
```

`questionsSnapshotIds` preserves which questions were asked, so a future library change doesn't invalidate stored records.

### 5.2 Webview ↔ extension messages (`contracts/src/discover.ts`)

Uses `vscode-messenger` typed channels as wired in CHUNK-02. Naming convention: `discover.<verb>`.

```ts
// Notifications + requests are typed via vscode-messenger's MessageType / RequestType.

// === Initial hydration ===
// Webview → host: "give me the current state for this project"
export interface DiscoverGetInitialStateRequest { /* empty */ }
export interface DiscoverGetInitialStateResponse {
  projectTitle: string;
  rawIdea: RawIdea | null;
  discovery: DiscoveryRecord | null;
  questions: DiscoveryQuestion[];     // the active library snapshot
  mode: DiscoverMode;
}
export type DiscoverMode = 'rawIdea' | 'prompt' | 'answers' | 'summary';

// === Save raw idea ===
export interface DiscoverSaveRawIdeaRequest {
  body: string;
  title?: string;
}
export interface DiscoverSaveRawIdeaResponse {
  rawIdea: RawIdea;        // canonical, host-stamped timestamps
}

// === Generate prompt (host-side template) ===
export interface DiscoverGeneratePromptRequest { /* empty — uses current raw idea */ }
export interface DiscoverGeneratePromptResponse {
  prompt: string;          // the rendered markdown
  generatedAt: number;
  questionsSnapshotIds: string[];
}

// === Copy prompt to system clipboard (host privilege) ===
export interface DiscoverCopyPromptRequest {
  prompt: string;          // exactly the string to copy (avoids race)
}
export interface DiscoverCopyPromptResponse {
  ok: true;
}

// === Parse a paste blob (no save yet) ===
export interface DiscoverParseAnswersRequest {
  rawPaste: string;
}
export interface DiscoverParseAnswersResponse {
  answers: DiscoveryAnswer[];
  unmatchedText: string;
}

// === Save answers (final form, post-edit) ===
export interface DiscoverSaveAnswersRequest {
  rawAnswersPaste: string;
  answers: DiscoveryAnswer[];
  unmatchedText: string;
}
export interface DiscoverSaveAnswersResponse {
  discovery: DiscoveryRecord;   // canonical, host-stamped
}

// === Mode change driven from tree view (host → webview) ===
export interface DiscoverSetModeNotification {
  mode: DiscoverMode;
}

// === Generic state-changed broadcast (host → webview) ===
export interface DiscoverStateChangedNotification {
  rawIdea: RawIdea | null;
  discovery: DiscoveryRecord | null;
}
```

Concrete channel constants (request types) live in the same file:

```ts
import { RequestType, NotificationType } from 'vscode-messenger-common';

export const DiscoverGetInitialState =
  new RequestType<DiscoverGetInitialStateRequest, DiscoverGetInitialStateResponse>('discover.getInitialState');
export const DiscoverSaveRawIdea =
  new RequestType<DiscoverSaveRawIdeaRequest, DiscoverSaveRawIdeaResponse>('discover.saveRawIdea');
export const DiscoverGeneratePrompt =
  new RequestType<DiscoverGeneratePromptRequest, DiscoverGeneratePromptResponse>('discover.generatePrompt');
export const DiscoverCopyPrompt =
  new RequestType<DiscoverCopyPromptRequest, DiscoverCopyPromptResponse>('discover.copyPrompt');
export const DiscoverParseAnswers =
  new RequestType<DiscoverParseAnswersRequest, DiscoverParseAnswersResponse>('discover.parseAnswers');
export const DiscoverSaveAnswers =
  new RequestType<DiscoverSaveAnswersRequest, DiscoverSaveAnswersResponse>('discover.saveAnswers');
export const DiscoverSetMode =
  new NotificationType<DiscoverSetModeNotification>('discover.setMode');
export const DiscoverStateChanged =
  new NotificationType<DiscoverStateChangedNotification>('discover.stateChanged');
```

Naming matches the assignment list: `discover.saveRawIdea`, `discover.generatePrompt`, `discover.copyPrompt`, `discover.saveAnswers`. Plus three supporting messages (`getInitialState`, `parseAnswers`, `setMode`/`stateChanged`) needed for the loop to actually work — these are uncontroversial extensions, not new product surface.

### 5.3 Radix UI primitives used

First chunk to actually pull Radix in. Specific primitives this panel uses (install once into `webview/package.json`, then any subsequent chunk reuses):

- `@radix-ui/react-tabs` — top-level tab switcher.
- `@radix-ui/react-accordion` — per-question answer cards.
- `@radix-ui/react-toast` — save / copy confirmations.
- `@radix-ui/react-scroll-area` — prompt preview scroll.
- `@radix-ui/react-collapsible` — "what this does" explanation.
- `@radix-ui/react-form` (or just native form + Radix `Label`) — raw idea form.

Lucide React icons used: `Lightbulb` (raw idea tab), `Sparkles` (prompt tab), `MessageSquare` (answers tab), `BookOpen` (summary tab), `Copy` (copy button), `Save` (save button), `RotateCw` (regenerate).

These are conservative choices — Radix primitives are unstyled and the existing Tailwind config from CHUNK-02 provides the styling layer. No theme system overhaul required.

---

## 6. Discovery prompt template

Rendered as markdown. The user copies this verbatim into Claude.ai / ChatGPT / etc. and pastes the AI's response back. The shape is borrowed from PRD § 22's generic specialist prompt format (Role, Objective, Project Context, Approved Inputs, Your Task, Output Format, Rules).

```md
# Discovery Interview — DeliveryOS

## Role
You are a senior product discovery interviewer for a small software project.
Your job is to interrogate a raw product idea and produce a structured discovery record.

## Objective
Read the raw idea below. Then answer each of the twelve questions in order, using
the project's own context. Your answers will be pasted back into DeliveryOS and
will drive the rest of the product definition.

## Project Context
**Project title:** ${projectTitle}

**Raw idea:**
${rawIdea}

## Your Task
Answer each question below in markdown. Be concrete and specific. Where the
project does not have a clear answer, write "Unknown — needs decision" and
state what would be needed to decide.

${questions.map((q, i) => `### Q${i + 1}. ${q.prompt}${q.helperText ? `\n\n_${q.helperText}_` : ''}`).join('\n\n')}

## Output Format
Return a single markdown document. Use the exact heading shape `### Q1.`, `### Q2.`, ... `### Q12.`
for each answer. Keep each answer to roughly 80–200 words.
Do not add new questions. Do not skip questions — write "Unknown — needs decision"
if you cannot answer.

## Rules
- Do not invent constraints the user did not state.
- Do not propose implementation details.
- Where regulated industry, PII, customer-facing surface, or third-party data
  applies, say so clearly — it changes downstream stage configuration.
- Keep the tone neutral and analytical.
```

`promptBuilder.buildDiscoveryPrompt` interpolates `${projectTitle}`, `${rawIdea}`, and the question list. The exact rendered string is stored in `DiscoveryRecord.promptSnapshot` for audit (so we can always reconstruct what the AI was asked, even if the question library changes later).

Heading shape `### Q1.` ... `### Q12.` is the hook the parser keys on (§2.4 `answersParser.ts`).

---

## 7. Data model touched

Single memory type touched: **Intent Memory** (CHUNK-03's schema).

### Before this chunk (CHUNK-03 stub)

```text
memory_entries row, type='intent':
  id: 'intent-<projectId>'
  title: '<projectTitle>'
  payload_json: { /* shape defined in CHUNK-03; minimal at that point */ }

<workspace>/.deliveryos/memory/intent/<intent-id>.md:
  # <project title>
  (stub body — possibly just project name)
```

### After this chunk

```text
memory_entries row, type='intent' (same row, updated_at bumped):
  id: 'intent-<projectId>'
  title: '<projectTitle>'                                    -- unchanged
  payload_json: {
    rawIdea: { body, title?, savedAt, updatedAt },
    discovery: DiscoveryRecord | null
  }

<workspace>/.deliveryos/memory/intent/<intent-id>.md:
  # <project title>

  ## Raw idea
  <RawIdea.body>

  ## Discovery interview
  <if DiscoveryRecord.answers.length > 0, render Q&A>
```

The Intent Memory entry stays as a single row (matches PRD § 12.X / memory-layers.md §1 — "created once per project, immutable except by explicit user edit"). The on-disk markdown is regenerated from the SQLite payload on every save so the disk file is always a faithful projection.

Memory links: none added in this chunk. The Discovery Record is a property of the Intent entry, not a separate node. (CHUNK-06 will create a Requirement Memory entry that links back to this Intent entry.)

Migration: CHUNK-03's roll-your-own migration runner bumps `_schema_version` once if `IntentMemoryPayload` shape is extended after CHUNK-03 shipped. Otherwise nothing structural changes — `payload_json` is opaque to SQLite.

---

## 8. VS Code APIs used

Direct calls from `extension/src/panels/discover/discoverHost.ts`:

- `vscode.commands.registerCommand('deliveryos.openDiscover', (mode?: DiscoverMode) => …)` — entry point. Accepts an optional mode (used by tree-view clicks).
- `vscode.window.createWebviewPanel('deliveryosDiscover', 'DeliveryOS — Discover', ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [...] })` — the panel itself. The `WebviewPanelOptions` are filled by CHUNK-02's `htmlFactory`.
- `vscode.window.registerWebviewPanelSerializer('deliveryosDiscover', { deserializeWebviewPanel })` — restore-on-reload.
- `vscode.env.clipboard.writeText(prompt)` — invoked by the `discover.copyPrompt` handler. Followed by a `discover.copyConfirmed` toast on the webview side.
- `vscode.workspace.fs.writeFile(uri, Buffer.from(markdown))` — through CHUNK-03's `MemoryStore` to write the per-entry markdown projection. Not called directly here; routed through `MemoryStore`.
- (Indirectly via tree provider) `vscode.window.registerTreeDataProvider` / `vscode.window.createTreeView` — already done in CHUNK-01, this chunk only emits the change event.

No new VS Code API surface beyond what CHUNK-01/02/03 already opened. No proposed APIs. No native modules.

Capabilities (CHUNK-01 already set): `untrustedWorkspaces.supported: false`, `virtualWorkspaces.supported: false` — both honoured (this chunk reads workspace files via the memory store, which is fine because the workspace is trusted).

---

## 9. Step-by-step implementation outline

Ordered as a checklist for the build session. Roughly one item per ~30–45 minutes; ~4 session-days total.

### Day 1 — contracts + question library + prompt builder

1. Create `contracts/src/discover.ts` with the types and message constants from §5. Re-export from `contracts/src/index.ts`.
2. If `IntentMemoryPayload` in `contracts/src/memory.ts` does not yet have `rawIdea` + `discovery` fields, add them. Bump CHUNK-03's `_schema_version` if needed (it is currently safe because payload_json is opaque to the table layout — likely no schema bump required, only a code-level type extension).
3. Create `extension/src/discovery/questionLibrary.ts` with the 12 questions from §4. Add a single Vitest-style smoke test or just inline `assert(DISCOVERY_QUESTIONS_MVP.length === 12)` at module load if no test infra exists yet.
4. Create `extension/src/discovery/promptBuilder.ts` with `buildDiscoveryPrompt`. Render the template from §6.
5. Create `extension/src/discovery/answersParser.ts` with the heuristic parser. Inputs: `rawPaste`, `questions[]`. Output: `{ answers, unmatchedText }`.

### Day 2 — host wiring

6. Create `extension/src/panels/discover/discoverHost.ts`. Implement `registerDiscover` and the `DiscoverPanel` class (open / focus singleton).
7. Wire every messenger handler in §5 (request and notification kinds).
8. Wire `vscode.env.clipboard.writeText` inside the `discover.copyPrompt` handler.
9. Wire `MemoryStore.update(intentId, payload)` calls inside `saveRawIdea` and `saveAnswers` handlers. Ensure timestamps are host-stamped, not webview-stamped.
10. Register `WebviewPanelSerializer` so the panel survives reload (uses CHUNK-02's base class).
11. Register `deliveryos.openDiscover` command in `extension/src/extension.ts` and `package.json` `contributes.commands`.

### Day 3 — webview build

12. Create `webview/src/panels/discover/main.tsx` + `DiscoverApp.tsx`. Mount, hydrate from `DiscoverGetInitialState`, render the Radix `Tabs.Root` with four tabs.
13. Install Radix UI deps into `webview/package.json` (`@radix-ui/react-tabs`, `@radix-ui/react-accordion`, `@radix-ui/react-toast`, `@radix-ui/react-scroll-area`, `@radix-ui/react-collapsible`). Install `lucide-react`. Run `npm install` at workspace root.
14. Build `RawIdeaInput.tsx`. Wire `discover.saveRawIdea` round-trip.
15. Build `DiscoveryPromptPreview.tsx`. Wire `discover.generatePrompt` + `discover.copyPrompt`. Show a toast on copy success.
16. Build `DiscoveryAnswersInput.tsx`. Wire `discover.parseAnswers` (no-save preview) + `discover.saveAnswers`.
17. Build `DiscoverySummary.tsx`. Render the saved Discovery Record read-only with markdown.
18. Add the `panels/discover` entry to `webview/vite.config.ts`. Run `npm run build` and confirm both bundles produce.

### Day 4 — tree integration + persistence + smoke

19. Extend the TreeDataProvider from CHUNK-01 with the two DISCOVER children. Wire `MemoryStore.onDidChange` to `_onDidChangeTreeData.fire`.
20. Make tree-item clicks pass a `mode` argument to `deliveryos.openDiscover`.
21. Hand-test the full loop: type idea → save → generate prompt → copy → paste into Claude.ai → paste reply back → save → see summary.
22. Restart VS Code; reopen; confirm both tree items still appear and clicking either opens the panel in the right mode.
23. Inspect `<workspace>/.deliveryos/memory.sqlite` and the per-entry markdown to confirm both stores stayed in sync.

### Day 5 — polish

24. Empty states: no project → "Create a project" link in the panel (reuses CHUNK-01 command).
25. Long-input handling: textarea autosize cap at ~80 rows + scroll; show a "Body is large (N chars) — saving on blur" hint above ~50KB. See §11 risks.
26. Markdown sanitisation pass: wherever pasted answers are rendered (`DiscoverySummary`), sanitise — see §11 risk #2.
27. README touch-up: one screenshot of the discover panel; one paragraph in the Quick Start about the manual-mode loop.

---

## 10. Test plan

Manual only — no automated test infrastructure required at this chunk. The Test Designer specialist (CHUNK-08) is what unlocks structured automated testing later; for this chunk the manual end-to-end suffices, matching CHUNK-05's "Verified by" line.

### 10.1 End-to-end manual run

**Setup.** Fresh VS Code launch. DeliveryOS installed from local `.vsix` (per CHUNK-04 scaffold). No prior project.

**Steps.**

1. Run `DeliveryOS: Create a project` (from CHUNK-01). Title: "Bug Triage Assistant".
2. Verify the tree view shows DISCOVER with no children yet.
3. Run `DeliveryOS: Open Discover`. Confirm the panel opens on the `Raw idea` tab.
4. Paste a ~200-word raw idea (e.g. the bug-triage example from PRD § 23). Click "Save raw idea". Confirm a toast appears and the tree gains a `Raw idea` child.
5. Switch to the `Prompt` tab. Click "Regenerate" (or accept the auto-generated). Confirm the rendered markdown contains the raw idea body, the project title, and all 12 question headings.
6. Click "Copy prompt". Confirm clipboard contains the prompt (paste into a scratch file or Claude.ai input field).
7. Paste the prompt into Claude.ai (or ChatGPT). Wait for the AI's response.
8. Copy the AI's response. Return to DeliveryOS, switch to the `Answers` tab. Paste into the raw paste textarea. Click "Parse answers".
9. Confirm at least 8 of 12 questions show parsed content. Edit any that look wrong. Click "Save answers".
10. Switch to the `Summary` tab. Confirm all 12 Q&A render correctly. Tree view now shows `Discovery interview` child.

**Pass criteria.** All steps complete without error. The Discovery Record reads correctly after save.

### 10.2 Persistence-across-restart check

1. After 10.1, close VS Code completely.
2. Reopen the workspace.
3. Verify the tree view shows both `Raw idea` and `Discovery interview` immediately on activation (within the `onStartupFinished` budget — should be <1s after the activity bar appears).
4. Click `Discovery interview`. Confirm the panel opens directly into Summary mode with all answers intact.
5. Inspect `<workspace>/.deliveryos/memory.sqlite` with the `sqlite3` CLI:
   ```sh
   sqlite3 .deliveryos/memory.sqlite "SELECT id, type, json_extract(payload_json, '$.rawIdea.body') FROM memory_entries WHERE type='intent';"
   ```
   Confirm one row exists with the raw idea body.
6. Inspect `<workspace>/.deliveryos/memory/intent/<id>.md`. Confirm both sections (Raw idea, Discovery interview) are rendered.

### 10.3 Negative / edge runs

- Type a raw idea, save, switch to Prompt tab — confirm Prompt tab activates correctly.
- Click "Generate prompt" before typing any raw idea — confirm the button is disabled or the host returns a clean error toast.
- Paste an empty string into the answers textarea and click "Parse" — confirm graceful empty state.
- Paste a single block of free-form text with no Q-heading markers — confirm everything lands in `unmatchedText` and the user can hand-allocate via the accordion cards.
- Paste a ~5MB blob into raw idea body — confirm the save completes (may be slow) without crashing the host. See §11 risk #3.
- Reopen the panel via tree click while it's already open — confirm focus (not duplicate).

### 10.4 Tree behaviour

- Delete the Intent row from SQLite manually (sanity test only). Reload window. Confirm both tree children disappear and Discover panel shows empty state on next open.

---

## 11. Risks, edge cases and open questions

### Risk 1 — keeping the question library curated

PRD § 10.8 lists 10 mid-stage triggers, each potentially mapping to its own discovery prompt. The full v0.1 discovery interview was longer. The MVP must NOT bloat to 30 questions or the AI's response becomes unmanageable for the user to paste back. **Mitigation:** the 12-question MVP set is frozen at this chunk; future additions require an ADR or a feature ticket, not a casual append. Question additions in CHUNK-06+ are out of scope.

**Open question for Prompt 3 (audit):** does the audit confirm 12 is the right number, given downstream CHUNK-06 (PRD generation) and CHUNK-07 (requirements decomposition) need? If yes, freeze. If they want a question about "test commands" or "deployment target" earlier in the funnel, add it now rather than in CHUNK-09.

### Risk 2 — Markdown sanitisation for the discovery answers paste

The user pastes AI-generated text directly into a webview that renders it as markdown. The markdown will then be projected to disk in `.deliveryos/memory/intent/<id>.md`. Risks:

- The pasted text could contain `<script>` (AI tools usually don't generate this, but a hostile user pasting hostile content into their own workspace is the threat model).
- The pasted text could contain code blocks with `]]>` or `<!--…-->` that breaks downstream parsers.
- The pasted text rendered in the webview could break the CSP if it tries to inline-style or inline-script.

**Mitigation:**

- The webview's CSP (from CHUNK-02) already blocks inline scripts. Markdown library must use a safe renderer with HTML escape on by default (e.g. `marked` with `mangle: false, breaks: true` and **`gfm: true`** plus a DOMPurify pass — or `markdown-it` with `html: false`). No raw HTML allowed.
- On the disk projection, the markdown is stored verbatim (the .md file is a record, not a renderable surface — readers are the user, the future PRD generator, and grep).
- Document the threat model briefly in the file header of `discoverHost.ts`.

**Open question for Prompt 3:** do we want to pull in DOMPurify as a webview dep, or rely on the markdown lib's safe mode? Recommendation: rely on the markdown lib's `html: false` mode. DOMPurify only if the audit flags it.

### Risk 3 — very long inputs (multi-MB)

A user pasting a giant raw idea or a giant AI response could:

- Slow down React render (textarea reflow).
- Slow down JSON.stringify on save (the entire `payload_json` is one blob).
- Inflate the SQLite row past sensible limits (SQLite handles MBs fine, but the per-entry .md projection becomes unwieldy).

**Mitigation:**

- Soft warn at >50KB raw idea, hard cap at 2MB raw idea or AI response (configurable via `deliveryos.discover.maxInputBytes` setting; default 2_000_000). User can override but gets a confirm dialog.
- Debounce autosave (1s) to avoid hammering SQLite on every keystroke.
- Save raw answers paste separately from parsed answers so re-parsing later doesn't require re-pasting.

**Open question for Prompt 3:** should the warning be advisory or blocking? Recommendation: advisory.

### Risk 4 — manual-mode loop is leaky

The user could paste an answer for the wrong project (e.g. they have two DeliveryOS workspaces open). This chunk's design routes everything through the active project, so cross-workspace leak is contained to the workspace the panel was opened in. Worth a one-line check in the host: `panel.workspaceFolderUri === activeProjectWorkspaceFolderUri` on every save.

### Risk 5 — Radix UI bundle size

First chunk to introduce Radix. Each primitive is ~5–15KB minified+gzipped. Six primitives ≈ 60KB additional bundle for this panel. Total panel bundle target: <200KB gzipped. **Mitigation:** Vite tree-shakes per-entry, so other panels won't import these unless they use them. Validate panel bundle size after Day 3 build.

### Risk 6 — parser brittleness

`answersParser.ts` looks for `### Q1.` headings. If the AI deviates (some models emit `**Q1**` or `## Q1` or no heading at all), the parser misses. **Mitigation:** try four heading variants in order (`### Q\d+\.?`, `## Q\d+\.?`, `**Q\d+**`, `Q\d+\.`). Anything left over goes into `unmatchedText`. The accordion UI lets the user hand-allocate. **Open question:** do we want to ask the user to re-run the AI with a stricter format hint if matching fails for >50% of questions? Recommendation: show a non-blocking notice ("Parsed N of 12 — edit below").

### Open question — schema version bump

Whether CHUNK-03's `_schema_version` needs to tick from `1` to `2` for the `IntentMemoryPayload` extension. Likely no (since `payload_json` is opaque text), but confirm during build. If yes, the migration adds default `null` for `discovery` on existing rows.

### Open question — title in raw idea

Should the project's title (set during `deliveryos.project.create` in CHUNK-01) be editable from the Raw Idea form, or only at project creation? Recommendation: editable here (saves a roundtrip), persisted back to the project record and the Intent Memory `title` column.

---

## 12. Explicit dependencies

### Consumed from prior chunks (do NOT redefine)

- **CHUNK-01.** Activity bar + tree view + `deliveryos.stages` TreeDataProvider + the project record. This chunk extends the TreeDataProvider but does not reinvent it. Project record provides `projectTitle` and the singleton "active project" concept.
- **CHUNK-02.** Vite + React + Tailwind + CSP'd HTML factory + `vscode-messenger` wiring + `WebviewPanelSerializer` base + the hybrid theming Tailwind config. This chunk adds one new Vite entry point and one new panel; it does not modify the foundation.
- **CHUNK-03.** `MemoryStore` (sql.js + `.deliveryos/memory.sqlite` + per-entry markdown projection) + `IntentMemory` type + the `_schema_version` migration runner + the Intent stub written during project create. This chunk extends `IntentMemoryPayload` (in the contracts module owned by CHUNK-03) with `rawIdea` and `discovery` fields, and writes through `MemoryStore.update`.

### Newly imported deps (added to `webview/package.json`)

- `@radix-ui/react-tabs`
- `@radix-ui/react-accordion`
- `@radix-ui/react-toast`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-collapsible`
- `lucide-react`
- One markdown renderer (`marked` or `markdown-it` — whichever CHUNK-02 selected; if none yet, pick `markdown-it` with `html: false`).

No new extension-side deps. No native modules.

### Exposes to later chunks (the contract this chunk promises)

- **`DiscoveryRecord` schema** (in `contracts/src/discover.ts`) — CHUNK-06 (PRD generation) consumes this verbatim to drive the PRD prompt. CHUNK-06 must NOT redefine `DiscoveryRecord`.
- **Intent Memory payload shape** with `rawIdea` and `discovery` — CHUNK-06 reads `IntentMemoryPayload` from `MemoryStore.read('intent-<projectId>')` and uses it as the source-of-truth project context.
- **`deliveryos.openDiscover` command** — CHUNK-14 (Release Evidence) walks the memory graph backwards and may surface a link "open discovery for this project"; that link uses this command.
- **DISCOVER tree children pattern** — CHUNK-06 will add a `Draft PRD` child to DEFINE following the same artefact-node convention established here.

### Contracts NOT touched

- Webview message types from any other panel — this chunk's messages live in their own `discover.ts` slice; no edits to the existing `contracts/src/index.ts` beyond a single re-export line.
- Memory store interface — `MemoryStore.update` is used as-is.
- HTML factory / CSP / nonce wiring — used as-is from CHUNK-02.

---

## 13. Done-when checklist (mirrors part-1-plan.md, expanded)

- [ ] `deliveryos.openDiscover` command registered and shows in the command palette.
- [ ] Panel opens via command or via tree-item click.
- [ ] Raw idea capture: type, save, persists, tree shows `Raw idea` child.
- [ ] Discovery prompt: render contains project title, raw idea body, and all 12 question headings.
- [ ] Clipboard copy: `vscode.env.clipboard.writeText` writes the prompt; toast confirms.
- [ ] Paste-back: parser splits at least 8 of 12 questions on a normal Claude.ai output; user can hand-edit any answer.
- [ ] Save answers: persists; tree shows `Discovery interview` child; Summary tab renders the Q&A.
- [ ] Close + reopen VS Code: both tree children appear; both views hydrate correctly.
- [ ] No CSP violations in webview dev tools.
- [ ] No new native module deps; no new VS Code proposed-API usage.
- [ ] One screenshot in README, one paragraph describing the manual-mode loop.

**Done state matches CHUNK-05's row in part-1-plan.md verbatim.**
