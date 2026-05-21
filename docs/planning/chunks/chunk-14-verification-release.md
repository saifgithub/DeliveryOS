# CHUNK-14 — Verification against test spec + memory update + release evidence export

> **Phase 3 closer.** This chunk closes the SDLC loop: it consumes the diff outcome from CHUNK-13, the parsed result from CHUNK-12, the test spec from CHUNK-08, and the immutable brief from CHUNK-09; it forces a mandatory Memory Update step (PRD § 27 Risk 4); and it emits a single Release Evidence markdown document plus an optional zip. After this chunk, "idea → verified release with the diff catching a violation live" is demoable end-to-end. Per BUILD-PLAN, Phase 3 is the **minimum acceptable ship** if the timeline slips, so CHUNK-14 must be self-contained and demoable on its own.

---

## 1. Restated goal and scope

### Goal

Close the SDLC loop. Given a captured Result (CHUNK-12) and a diff outcome (CHUNK-13), let the user manually approve verification, force a Memory Update pass, and export a Release Evidence document that walks the typed memory graph backwards from Verification to Intent and shows every link.

### In scope

- Verification workflow webview that reads Test Spec, Result Memory, and the Diff Outcome side-by-side.
- A single "Approve" / "Reject" decision recorded as a `VerificationMemory` entry. **No auto-evaluation of test outcomes** — the user makes the call.
- A mandatory Memory Update form (Design, Codebase, Requirement memories) shown before Release Evidence can be exported. "Skip" is allowed but recorded as a `BypassRecord` per `architecture/stage-configuration.md` § Stage gates. Bypasses are stored **inline in `VerificationMemory.payload.bypasses[]`** — not as a separate memory type.
- Release Evidence walker: traverses Memory Links backwards from the `VerificationMemory` entry and assembles a single `<workspace>/.deliveryos/releases/<release-id>.md` document. Halts on cycles. Surfaces missing-link gaps as inline warnings.
- A `ReleaseMemory` entry persisted at the same time as the markdown export, with links back through the chain.
- Optional zip export of all referenced markdown files (the "Release Evidence Package") via `vscode.window.showSaveDialog`.
- VERIFY tree node now shows verifications + a "Release Evidence" leaf per release.

### Out of scope

- **Auto-evaluation of test outcomes.** Manual approval only for MVP. (Inferring pass/fail from test logs is deferred.)
- **MCP-based memory exposure.** Deferred — file/SQLite only.
- **Multi-release evidence.** One requirement → one release for MVP. (The walker is structured so it can later aggregate, but the UI is single-release.)
- Codex parallel hook enforcement, retries, or post-deploy validation — those live in later chunks / never-in-MVP.
- Any reformatting of the chain markdown beyond a single readable document.
- API-driven AI calls (manual mode preserved across the whole flow).

### Phase-3 demoable state

> "The full loop, idea to verified release, with the diff feature catching a violation live."

When this chunk lands, the end-to-end happy path through CHUNK-05 → CHUNK-14 must run cleanly in a single VS Code session.

---

## 2. Verification workflow

### 2.1 Inputs

The Verification panel reads three memory entries via the `MemoryStore` (CHUNK-03):

1. **Test Spec** — `MemoryEntry` of canonical `type='test-spec'` (CHUNK-08 output), linked to the Requirement via Memory Links of kind `has-test-spec`.
2. **Result Memory** — the most recent `MemoryEntry` of `type='result'` linked to the current Execution entry (CHUNK-12) via `produced`.
3. **Diff Outcome** — `Result.payload.diffOutcome` populated by CHUNK-13: `pass | fail`, `allowed-and-touched[]`, `allowed-but-not-touched[]`, `forbidden-but-touched[]`.

### 2.2 Manual approval UX

- The webview shows three read-only panes (Test Spec markdown, Result summary, Diff verdict) and one action region:
  - **Approve** — sets verdict `pass`, opens the Memory Update form.
  - **Reject** — sets verdict `fail`, prompts for `failedCriteria[]` (multi-select against the Test Spec's verification criteria list) and `defects[]` (free-text, one per entry), then opens the Memory Update form (still mandatory — rejection also counts as a "release-grade decision" worth preserving).
  - **Request rework** — sets verdict `rework`, prompts for `reworkNotes` (markdown), and exits the Verification flow without writing a Release Evidence document. (Rework cycles produce a new Result → new Verification per `memory-layers.md` § 7.)
- The Diff verdict (CHUNK-13, read from `Result.payload.diffOutcome`) is **surfaced** for the user but **not enforced**. The user can override a `fail` diff verdict and still approve — but the override is logged in the `VerificationMemory` entry as `diffOverride: true` and surfaced in the Release Evidence document.

### 2.3 Persistence

On any of the three button clicks, the panel writes a `MemoryEntry` of `type='verification'`:

```ts
{
  id: uuid(),
  type: 'verification',
  title: `Verification of ${result.id}`,
  payload: {
    verdict: 'pass' | 'fail' | 'rework',
    failedCriteria: string[],
    defects: { id, summary, criteriaRef? }[],
    reworkNotes?: string,
    diffOverride: boolean,
    approvedBy: 'user',                       // MVP — only user
    approvedAt: number,                       // epoch ms
    testSpecRef: MemoryRef,
    resultRef: MemoryRef,
    diffSummary: { pass: boolean, forbiddenTouched: string[] },
    bypasses: BypassRecord[],                 // inline; no separate memory type
  },
}
```

And links (`memory_links` rows, using only canonical kinds from `contracts/src/links.ts`):

- `verification` ──`evaluates`──▶ `result`
- `verification` ──`evaluates`──▶ `test-spec`
- `verification` ──`verifies`──▶ `requirement` (covers both the active-verdict scope and the "we made a verdict here" history edge — the previously separate `subject-of-decision` was collapsed in DOS:O4 iteration-3 audit)

### 2.4 Tree view side-effects

The VERIFY tree node, contributed by CHUNK-01 and progressively populated by CHUNK-08/12/13, now expands to:

```
VERIFY
├── Verifications
│   ├── ✅ Verification of result-<short>  (pass)
│   └── ❌ Verification of result-<short>  (fail)
└── Release Evidence
    └── release-<short> — <requirement title>
```

Click handlers open the verification panel (read-only mode for past entries) or the Release Evidence document.

---

## 3. Mandatory memory update step

PRD § 27 Risk 4 says memory must not become write-only. This chunk is where that rule is enforced.

### 3.1 Gate behaviour

After a verdict is recorded, the panel transitions to the Memory Update form. The "Export Release Evidence" button is **disabled** until one of:

- The form is submitted (any number of fields may be empty — empty is fine, "I had nothing to add" is a valid answer).
- The user explicitly clicks "Skip — record bypass" and provides a justification.

Both paths produce an audit record. There is **no third option** that lets the user proceed silently.

### 3.2 Form fields

```
┌──────────────────────────────────────────────────────────────┐
│ Memory Update (mandatory before Release Evidence)            │
├──────────────────────────────────────────────────────────────┤
│ Did the harness make any design decisions worth preserving?  │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [markdown text area — appends to Design Memory]          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Are there new files / conventions to record in Codebase?     │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [markdown text area — appends to Codebase Memory]        │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Did any requirement assumption change?                       │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [markdown text area — appends to Requirement Memory]     │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│   [Save & continue]    [Skip — record bypass]                │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 What "Save & continue" does

For each non-empty field:

- **Design** → append a new `MemoryEntry` of `type='design'`, linked back to the Verification via `derived-from-verification`. (Append-only — never edits the existing Design entry, so the chain stays audit-clean.)
- **Codebase** → append a new `MemoryEntry` of `type='codebase'` with title `Update after <requirement title>`, linked via `derived-from-verification`.
- **Requirement** → emit a new `MemoryEntry` of `type='requirement'` "assumption update" entry, linked via `derived-from-verification` (new entry, not an edit of the source requirement — keeps the original requirement immutable in the chain).

Empty fields are recorded as `{ field: 'design', note: 'nothing-to-add' }` in the `VerificationMemory.payload.memoryUpdateForm` so the audit trail is explicit about "I considered this and had nothing to say".

### 3.4 What "Skip — record bypass" does

Per `architecture/stage-configuration.md` § Stage gates:

> Gates can be bypassed (with a recorded justification) for prototype or research work. Bypasses are visible in Release Evidence.

The Verification panel appends a `BypassRecord` to `VerificationMemory.payload.bypasses[]`:

```ts
{
  id: uuid(),
  gate: 'memory-update',
  stage: 'VERIFY',
  justification: string,           // required, min 10 chars
  bypassedAt: number,
  bypassedBy: 'user',
  parentVerificationId: string,
}
```

Bypasses live **inline on the Verification entry** (per B05 resolution — no separate `'bypass'` memory type, no `has-bypass` link). The Release Evidence document surfaces them in a dedicated "Bypasses & gaps" section by reading `verification.payload.bypasses`.

---

## 4. Release Evidence export

### 4.1 Walker behaviour

The walker is a recursive backwards traversal over `memory_links`, starting from the just-written `verification` entry and following the canonical chain using only canonical link kinds from `contracts/src/links.ts`:

```
Verification ─evaluates──▶ Result                            derives-from──▶ Requirement(kind='prd')
              evaluates──▶ Test Spec                         has-test-spec──▶ Test Spec
                           Result                                            derives-from──▶ Intent
                           Result ◀──produced── Execution ─derives-from──▶ Requirement
```

In plain terms: from Verification we hop to Result and Test Spec; from Result we hop to Execution (reverse `produced`), and from Execution to Requirement (via `derives-from`); from Requirement we hop to its PRD-tagged sibling (`derives-from`, a `requirement` row whose `payload.kind === 'prd'`); from Requirement we also collect any `derived-from-verification` entries from prior runs. **Discovery is not a hop** — it is read from `intent.payload.discovery`. **PRD is not a separate type** — it is a `requirement` row discriminated by `payload.kind === 'prd'`. **Codebase Memory is deferred** — no writer chunk exists in v1; the slot stays for future expansion.

Walker rules:

- Uses `MemoryStore.walk(fromId, kind)` (CHUNK-03) — never reaches into SQLite directly.
- Reads ONLY canonical link kinds from `contracts/src/links.ts`: `derives-from`, `verifies`, `evaluates`, `produced`, `supersedes`, `includes`, `reworks`, `has-test-spec`, `derived-from-verification`, `releases` (10 canonical kinds; `targets`/`references-codebase`/`subject-of-decision` retired in DOS:O4 iteration-3 audit). Every kind the walker reads has a writer in CHUNK-03 / CHUNK-05–CHUNK-13.
- **Cycle detection.** Maintains a `visited: Set<MemoryId>`; if the next node is already in `visited`, skip and emit a warning `"cycle detected at <id> via <kind>"` into the document's "Bypasses & gaps" section.
- **Missing-link tolerance.** If a `walk` returns nothing for an expected `kind`, emit a warning `"missing link: <fromType> ──<kind>──▶ <expectedToType>"` and continue. The document is generated even when the chain is incomplete; the gaps are explicit.
- **Bypass surfacing.** Bypasses are read from `verification.payload.bypasses[]` (inline). No `has-bypass` link, no `'bypass'` memory type.
- **Discovery surfacing.** Discovery is read from `intent.payload.discovery` (CHUNK-05's `IntentPayload`). No `'discovery'` memory type, no hop.
- **PRD surfacing.** The PRD node is found by walking `requirement ──derives-from──▶ requirement` and filtering for `payload.kind === 'prd'`. Its body lives at `.deliveryos/memory/requirement/<prd-id>.md`.

### 4.2 Output document

Path: `<workspace>/.deliveryos/releases/<release-id>.md` where `<release-id>` is a short slug `release-YYYYMMDD-<shortuuid>`.

Document shape:

```markdown
# Release Evidence — <Requirement title>

- **Release ID:** release-20260810-ab12cd
- **Released:** 2026-08-10
- **Verdict:** pass | fail | rework
- **Diff verdict:** pass | fail (overridden by user: yes/no)
- **Harness:** Claude Code | Codex
- **Bypasses recorded:** N (see § Bypasses & gaps)

## 1. Intent
> One paragraph, lifted from Intent Memory.
- Link: `.deliveryos/memory/intent/<id>.md`

## 2. Discovery
> Discovery summary, read from `intent.payload.discovery` (no separate file — the on-disk body for Intent contains the discovery record).
- Source: `.deliveryos/memory/intent/<id>.md` (Discovery section)

## 3. PRD section
> PRD section that backs this requirement. The PRD is a `requirement` row whose `payload.kind === 'prd'`.
- Link: `.deliveryos/memory/requirement/<prd-id>.md#section-N`

## 4. Requirement
> The requirement statement + verification criteria.
- Link: `.deliveryos/memory/requirement/<id>.md`

## 5. Design context
> Design Memory state at time of brief generation + any updates from this run.
- Link: `.deliveryos/memory/design/<id>.md`
- Updated this release: yes/no

## 6. Test Specification
> The verification criteria + tests, lifted from the Test Spec.
- Link: `.deliveryos/memory/test-spec/<id>.md`

## 7. Execution Brief (immutable)
> Brief markdown — frozen at execution time per architecture/execution-briefs.md § Versioning.
- Link: `.deliveryos/memory/execution/<brief-id>.md`
- Harness: Claude Code | Codex
- Generated: 2026-08-10T...

## 8. Result
> Parsed summary of what the harness actually did.
- Link: `.deliveryos/memory/result/<id>.md`
- Files changed: <list>
- Tests added: <list>
- Diff verdict: pass | fail (read from `result.payload.diffOutcome.verdict`)

## 9. Verification
> Verdict + failed criteria + defects + rework notes.
- Approved by user at: <timestamp>
- Diff override: yes/no
- Link: `.deliveryos/memory/verification/<id>.md`

## 10. Release
> This document. Linked back as the canonical `release` Memory entry.

## Bypasses & gaps
- BYPASS: memory-update gate skipped — "<justification>" (recorded at <timestamp>)
- WARNING: missing link Requirement ──derives-from──▶ Requirement(kind='prd') (chain incomplete)
- WARNING: cycle detected at <id> via <kind>
```

If the chain is fully intact and no bypass was recorded, the "Bypasses & gaps" section reads simply `None.` — that's a deliberate "clean release" signal.

### 4.3 ReleaseMemory entry

Written at the same time as the markdown file:

```ts
{
  id: 'release-20260810-ab12cd',
  type: 'release',
  title: '<Requirement title>',
  payload: {
    requirementRef: MemoryRef,
    verificationRef: MemoryRef,
    documentPath: '.deliveryos/releases/release-20260810-ab12cd.md',
    chainComplete: boolean,
    warnings: string[],
    bypassRefs: MemoryRef[],
    finalSignOff: { by: 'user', at: number },
    deferredItems: string[],          // optional, surfaced from rework notes
    knownLimitations: string[],       // optional, free-text
  },
}
```

Links (canonical kinds only):

- `release` ──`releases`──▶ `verification`
- `release` ──`includes`──▶ `requirement` (the requirement this release ships)

(Bypasses are inline on the Verification — no separate link kind. Earlier drafts used `has-bypass`; that's been dropped per B05.)

### 4.4 Optional zip export

A "Export package (zip)" button on the Release Evidence preview opens `vscode.window.showSaveDialog({ defaultUri, filters: { 'Zip archive': ['zip'] } })` and writes:

```
release-<id>.zip
├── release-<id>.md
└── referenced/
    ├── intent-<id>.md          # includes the embedded Discovery record
    ├── requirement-<prd-id>.md # the PRD-tagged requirement row (payload.kind === 'prd')
    ├── requirement-<id>.md     # the requirement under release
    ├── design-<id>.md
    ├── test-spec-<id>.md
    ├── codebase-<id>.md
    ├── execution-<id>.md
    ├── result-<id>.md
    └── verification-<id>.md    # bypasses inline in payload, no separate file
```

Zipping uses a small dependency (`adm-zip` or `archiver`); decision deferred to implementation but `archiver` is preferred (stream-friendly, smaller surface). The zip itself is **not** stored in memory — it's a one-shot user export.

---

## 5. File-by-file breakdown

> Paths assume the repo layout established by CHUNK-01 (extension shell), CHUNK-02 (webview), CHUNK-03 (memory store).

### Extension host

| Path | Purpose |
|---|---|
| `extension/src/verification/verificationWorkflow.ts` | Orchestrates the Verification panel lifecycle: load Test Spec + Result + Diff, accept verdict messages from the webview, write the `VerificationMemory` entry, transition to Memory Update. |
| `extension/src/verification/types.ts` | Discriminated union for the three verdicts, `VerificationMemoryPayload`, `MemoryUpdateForm` shape (mirrors `contracts/`). |
| `extension/src/memory/update.ts` | Mandatory Memory Update flow. Takes the `MemoryUpdateForm` payload, appends Design/Codebase/Requirement entries, or writes a `BypassRecord`. Exposes `applyUpdate(verificationId, form)` and `recordBypass(verificationId, justification)`. |
| `extension/src/release/releaseEvidenceExport.ts` | Top-level coordinator: invokes the walker, renders the markdown, writes the file, persists `ReleaseMemory`, optionally calls `zipPackage()`. |
| `extension/src/release/memoryGraphWalker.ts` | Pure recursive walker over `MemoryStore.walk(fromId, kind)`. Returns a `ChainGraph` (typed nodes + warnings list). Cycle-safe via visited set. |
| `extension/src/release/markdownRenderer.ts` | Renders a `ChainGraph` into the document shape from § 4.2. Pure function; trivially unit-testable. |
| `extension/src/release/zipPackage.ts` | Wraps `archiver` to bundle the release markdown + referenced files. Uses `vscode.window.showSaveDialog` for target path. |
| `extension/src/panels/verification/verificationHost.ts` | The webview host: creates the panel, wires up the `Messenger` (CHUNK-02), routes messages to `verificationWorkflow` and `memory/update` and `releaseEvidenceExport`. |

### Webview

| Path | Purpose |
|---|---|
| `webview/src/panels/verification/main.tsx` | Entry point — mounts React, hooks up the contracts messenger from CHUNK-02. |
| `webview/src/panels/verification/VerificationApp.tsx` | Top-level component. Three-step state machine: `verify` → `memoryUpdate` → `releaseEvidence`. |
| `webview/src/panels/verification/ApproveButton.tsx` | Approve / Reject / Request rework actions. Renders the failed-criteria multi-select for `fail` verdict. |
| `webview/src/panels/verification/MemoryUpdateForm.tsx` | Three textareas + "Save & continue" + "Skip — record bypass". The Skip button opens a justification modal (min 10 chars enforced client-side and re-enforced server-side). |
| `webview/src/panels/verification/ReleaseEvidencePreview.tsx` | Renders the assembled markdown (via a tiny markdown renderer — `react-markdown` with no plugins) and exposes the "Open document" + "Export package (zip)" buttons. |
| `webview/src/panels/verification/DiffSummaryPane.tsx` | Read-only display of CHUNK-13's diff verdict, including a "Override diff" toggle that flips `diffOverride: true` in the outgoing approval message. |

### Contracts

| Path | Purpose |
|---|---|
| `contracts/src/verification.ts` | `VerificationMemoryPayload`, `MemoryUpdateForm`, message types `verification.approve`, `verification.reject`, `verification.requestRework`, `verification.recordBypass`, `memory.applyUpdate`. |
| `contracts/src/release.ts` | `ReleaseMemoryPayload`, `ReleaseEvidence`, `ChainGraph`, `BypassRecord`, message types `release.export`, `release.zipPackage`. |

### Tree view

| Path | Purpose |
|---|---|
| `extension/src/tree/stageTreeProvider.ts` (existing, extended) | New VERIFY children: a `Verifications` folder enumerating `VerificationMemory` entries and a `Release Evidence` folder enumerating `ReleaseMemory` entries. |

### Tests

| Path | Purpose |
|---|---|
| `extension/src/verification/__tests__/verificationWorkflow.test.ts` | Verdict persistence, diff override flag. |
| `extension/src/memory/__tests__/update.test.ts` | Empty-field handling, bypass record shape, justification min-length. |
| `extension/src/release/__tests__/memoryGraphWalker.test.ts` | Cycle detection, missing-link warnings, complete-chain happy path. |
| `extension/src/release/__tests__/markdownRenderer.test.ts` | Snapshot test against a canned `ChainGraph`. |
| `extension/src/release/__tests__/releaseEvidenceExport.test.ts` | End-to-end fixture: pre-seeded memory store → walker → markdown → file write → ReleaseMemory persisted. |

No new files in `webview/` beyond the panel listed above. No new files in `scripts/`.

---

## 6. Key interfaces and types

All types live in `contracts/` so both extension host and webview consume them. The Memory types extend the `MemoryEntry<T>` discriminated union defined by CHUNK-03 — this chunk **adds payload shapes**, it does not redefine the entry envelope.

```ts
// contracts/src/verification.ts

export type VerificationVerdict = 'pass' | 'fail' | 'rework';

export interface VerificationMemoryPayload {
  verdict: VerificationVerdict;
  failedCriteria: string[];         // criteria IDs from the Test Spec
  defects: Defect[];
  reworkNotes?: string;
  diffOverride: boolean;            // user overrode a diff `fail` verdict
  approvedBy: 'user';               // MVP only
  approvedAt: number;
  testSpecRef: MemoryRef;
  resultRef: MemoryRef;
  diffSummary: {
    verdict: 'pass' | 'fail';
    forbiddenTouched: string[];
    allowedNotTouched: string[];
  };
  memoryUpdateForm: MemoryUpdateFormRecord;
  bypasses: BypassRecord[];         // inline; no separate memory type, no `has-bypass` link
}

export interface Defect {
  id: string;
  summary: string;
  criteriaRef?: string;
}

export interface MemoryUpdateForm {
  designUpdate: string;             // markdown, may be empty
  codebaseUpdate: string;
  requirementAssumptionUpdate: string;
}

export interface MemoryUpdateFormRecord {
  submitted: boolean;               // true if Save & continue, false if Skip
  fields: MemoryUpdateForm;
  emptyFieldsRecorded: Array<'design' | 'codebase' | 'requirement'>;
  bypassRef?: MemoryRef;
}

export interface BypassRecord {
  id: string;
  gate: 'memory-update';            // extensible per stage-configuration.md
  stage: 'VERIFY';
  justification: string;
  bypassedAt: number;
  bypassedBy: 'user';
  parentVerificationId: string;
}
```

```ts
// contracts/src/release.ts

export interface ReleaseMemoryPayload {
  requirementRef: MemoryRef;
  verificationRef: MemoryRef;
  documentPath: string;             // workspace-relative
  chainComplete: boolean;
  warnings: string[];               // walker warnings
  bypassRefs: MemoryRef[];
  finalSignOff: { by: 'user'; at: number };
  deferredItems: string[];
  knownLimitations: string[];
}

export interface ChainGraph {
  intent?: MemoryNode;               // discovery is inline at intent.payload.discovery
  prd?: MemoryNode;                  // a `requirement` row whose payload.kind === 'prd'
  requirement?: MemoryNode;          // payload.kind === 'requirement'
  design?: MemoryNode;
  testSpec?: MemoryNode;
  codebase?: MemoryNode;
  execution?: MemoryNode;
  result?: MemoryNode;
  verification: MemoryNode;          // required — the walker anchor
  bypasses: BypassRecord[];          // sourced from verification.payload.bypasses
  warnings: string[];
}

export interface ReleaseEvidence {
  releaseId: string;
  markdown: string;
  filesReferenced: string[];         // absolute or workspace-relative
  chain: ChainGraph;
}
```

### Webview ↔ extension messages

| Message | Direction | Payload |
|---|---|---|
| `verification.approve` | webview → ext | `{ verificationId?, diffOverride, defects?, failedCriteria? }` |
| `verification.reject` | webview → ext | `{ failedCriteria, defects, diffOverride }` |
| `verification.requestRework` | webview → ext | `{ reworkNotes }` |
| `verification.recordBypass` | webview → ext | `{ verificationId, justification }` |
| `memory.applyUpdate` | webview → ext | `{ verificationId, form: MemoryUpdateForm }` |
| `release.export` | webview → ext | `{ verificationId }` → ext returns `ReleaseEvidence` |
| `release.zipPackage` | webview → ext | `{ releaseId }` → triggers `showSaveDialog` |
| `verification.loaded` | ext → webview | `{ testSpec, result, diff, prior?: VerificationMemoryPayload }` |
| `release.preview` | ext → webview | `{ evidence: ReleaseEvidence }` |
| `error` | ext → webview | `{ code, message }` |

All messages flow through the `Messenger` runtime from CHUNK-02. No new transport infrastructure.

---

## 7. Data model touched

This chunk lands new payload shapes on the **existing** polymorphic schema from CHUNK-03 — no new tables, no new migrations, **no new memory types**.

- **`verification` entries** — new payload shape per § 6. Bypasses live inline in `payload.bypasses[]`.
- **`release` entries** — new payload shape per § 6.
- **`design` / `codebase` / `requirement` entries** — append-only new entries written by the Memory Update form, never edits in place. Linked back to the originating Verification via `derived-from-verification`.
- **`memory_links` rows** — uses ONLY canonical kinds defined in `contracts/src/links.ts` (owned by CHUNK-03 per M02 resolution). The kinds this chunk writes: `evaluates`, `verifies`, `derived-from-verification`, `releases`, `includes`. The kinds the walker reads include the writes above plus `derives-from`, `produced`, `has-test-spec` (all written by earlier chunks). Post-DOS:O4 iteration-3 audit: `subject-of-decision` (collapsed into `verifies`), `targets` and `references-codebase` (retired) no longer appear.

The link kinds are not enforced by the schema (the table is `(from_id, to_id, kind)` open-ended per CHUNK-03 § "Polymorphic schema") but are constants in `contracts/src/links.ts` — owned and exported by CHUNK-03, consumed here. **This chunk does not invent kinds.**

---

## 8. VS Code APIs used

- `vscode.window.createWebviewPanel` — verification + release evidence panel(s). (Existing pattern from CHUNK-02; reuse the panel factory.)
- `vscode.workspace.fs.writeFile` — write the release markdown under `<workspace>/.deliveryos/releases/<release-id>.md`. Use `Uri.joinPath` for path construction; never string-concat workspace paths.
- `vscode.workspace.fs.createDirectory` — ensure `<workspace>/.deliveryos/releases/` exists before write.
- `vscode.window.showSaveDialog` — zip export target path. Suggest `release-<id>.zip` as the default name.
- `vscode.window.showInformationMessage` — "Release Evidence exported to .deliveryos/releases/<id>.md" with `"Open"` action that opens the markdown in a new editor tab via `vscode.window.showTextDocument`.
- `vscode.window.showWarningMessage` — used when bypass is recorded ("Memory Update gate bypassed — visible in Release Evidence.").
- `vscode.commands.registerCommand` — `deliveryos.verify.open`, `deliveryos.release.export`, `deliveryos.release.openLatest`.
- `vscode.window.showTextDocument(Uri, { preview: false })` — open the generated release markdown for the user.
- No file watcher, no terminal, no proposed APIs. (Deliberately avoiding `Terminal.shellIntegration` etc. — those belong to CHUNK-11.)
- No webview retention beyond the panel's own lifecycle; this is a purely on-demand surface.

---

## 9. Memory graph walker

The walker is the load-bearing piece of the export. It must be (a) cycle-safe, (b) tolerant of missing links, (c) testable in isolation.

### 9.1 Algorithm

```ts
import { LINK_KINDS } from '@deliveryos/contracts/links';

function walkChain(verificationId: string, store: MemoryStore): ChainGraph {
  const visited = new Set<string>();
  const warnings: string[] = [];

  function follow(
    fromId: string,
    kind: typeof LINK_KINDS[number],
    expectedToType: string,
    filter?: (node: MemoryNode) => boolean,
  ): MemoryNode | undefined {
    const nexts = store.walk(fromId, kind);
    const candidates = filter ? nexts.filter(filter) : nexts;
    if (candidates.length === 0) {
      warnings.push(`missing link: ${fromId} ──${kind}──▶ ${expectedToType}`);
      return undefined;
    }
    if (candidates.length > 1) {
      warnings.push(`multiple-results: ${candidates.length} via ${kind} from ${fromId}`);
    }
    const node = candidates[0];               // MVP: first match wins
    if (visited.has(node.id)) {
      warnings.push(`cycle detected at ${node.id} via ${kind}`);
      return undefined;
    }
    visited.add(node.id);
    return node;
  }

  const verification = store.read(verificationId)!;
  visited.add(verification.id);

  // Walker uses ONLY canonical kinds from contracts/src/links.ts.
  const result      = follow(verification.id, 'evaluates',           'result',
                              n => n.type === 'result');
  const testSpec    = follow(verification.id, 'evaluates',           'test-spec',
                              n => n.type === 'test-spec');
  // Reverse hop: Execution ──produced──▶ Result. Find the Execution that produced this Result.
  const execution   = result      && (store.walkReverse(result.id, 'produced')[0]);
  if (result && !execution) warnings.push(`missing link: execution ──produced──▶ ${result.id}`);
  else if (execution) visited.add(execution.id);

  // Codebase Memory is deferred — no writer chunk exists in v1; the slot stays for future expansion.
  const codebase    = undefined;
  // Execution → Requirement is reached via the brief's `derives-from` edge
  // (the retired `targets` kind was redundant — DOS:O4 iteration-3 audit).
  const requirement = execution   && follow(execution.id,   'derives-from',        'requirement',
                                             n => n.type === 'requirement' && n.payload?.kind !== 'prd');
  const design      = requirement && follow(requirement.id, 'derives-from',        'design',
                                             n => n.type === 'design');
  // PRD is a `requirement` row whose payload.kind === 'prd' (per CHUNK-06/07).
  const prd         = requirement && follow(requirement.id, 'derives-from',        'requirement(kind=prd)',
                                             n => n.type === 'requirement' && n.payload?.kind === 'prd');
  // Intent is reached from the PRD-tagged requirement.
  const intent      = prd         && follow(prd.id,         'derives-from',        'intent',
                                             n => n.type === 'intent');

  // Bypasses are inline on the Verification — no traversal needed.
  const bypasses: BypassRecord[] = verification.payload.bypasses ?? [];

  // Discovery is inline on Intent — surfaced from intent.payload.discovery, not a separate node.
  return { verification, result, testSpec, execution, codebase, requirement,
           design, prd, intent, bypasses, warnings };
}
```

Notes:

- The walker depends **only** on `MemoryStore.walk(fromId, kind)`, `MemoryStore.walkReverse(toId, kind)` (incoming edges), and `read(id)` (CHUNK-03 surface). No raw SQL.
- The link-kind constants are exported from `contracts/src/links.ts` (owned by CHUNK-03 post-M02) and used here directly — no string literals in production code; the snippet above is for spec clarity.
- Every kind the walker reads (`evaluates`, `produced`, `derives-from`, `has-test-spec`) is in CHUNK-03's canonical `LINK_KINDS` tuple AND is written by an earlier chunk. No reads against undeclared kinds.
- For PRD discrimination, the walker filters `requirement` rows by `payload.kind === 'prd'` vs `'requirement'`. Both PRD and Requirement live under `.deliveryos/memory/requirement/<id>.md`.
- For Discovery, the walker reads `intent.payload.discovery` (CHUNK-05's `IntentPayload`) when rendering — there is no `discovery` node in the `ChainGraph`.
- For each canonical `kind`, `walk()` may return multiple — the walker takes the first match satisfying the type/payload filter and warns on `multiple-results` so multi-edge cases are visible.

### 9.2 Performance budget

A typical chain has 9 nodes + maybe 1–3 bypasses. Each `walk()` is an indexed lookup on `memory_links(from_id, kind)`. End-to-end walk should be < 50 ms even on a cold SQLite open. No need to memoise.

---

## 10. Step-by-step implementation outline

> Sequenced for one solo builder at 7–8 hrs/week; expected to span Week 12 (2026-08-10) of BUILD-PLAN. Effort estimate: **5 session-days** matching the chunk plan.

### Day 1 — Contracts + walker (no UI yet)

1. Land `contracts/src/verification.ts` and `contracts/src/release.ts` with the types from § 6.
2. Land `contracts/src/links.ts` with the link-kind string constants.
3. Implement `extension/src/release/memoryGraphWalker.ts` against the algorithm in § 9.1.
4. Unit tests for the walker: complete chain, cycle, missing link, multiple-results warning.
5. Commit: `feat(chunk-14): memory graph walker + contracts`.

### Day 2 — Markdown renderer + writer

1. Implement `extension/src/release/markdownRenderer.ts` — pure function `(ChainGraph, ReleaseId) -> string`.
2. Snapshot tests against a canned `ChainGraph` fixture.
3. Implement `extension/src/release/releaseEvidenceExport.ts` — orchestrates walker + renderer + `vscode.workspace.fs.writeFile` + `ReleaseMemory` persistence.
4. Wire the `deliveryos.release.openLatest` command.
5. Commit: `feat(chunk-14): release evidence markdown + writer`.

### Day 3 — Verification webview (read-only first)

1. Scaffold `extension/src/panels/verification/verificationHost.ts` (reuse CHUNK-02 panel factory).
2. Scaffold `webview/src/panels/verification/main.tsx` + `VerificationApp.tsx` + `DiffSummaryPane.tsx`. Render the three input panes; no actions yet.
3. Wire `verification.loaded` round-trip so the panel pulls Test Spec + Result + Diff from the extension host.
4. Manual smoke test: open the panel against fixture memory, see three panes.
5. Commit: `feat(chunk-14): verification panel scaffold`.

### Day 4 — Approve flow + Memory Update form

1. Add `ApproveButton.tsx` (Approve / Reject / Request rework + failed-criteria multi-select).
2. Wire `verification.approve` / `verification.reject` / `verification.requestRework` messages → `verificationWorkflow.ts` writes `VerificationMemory`.
3. Add `MemoryUpdateForm.tsx` and wire `memory.applyUpdate` / `verification.recordBypass` → `extension/src/memory/update.ts`.
4. Enforce the gate: the "Export Release Evidence" button is disabled until Save or Skip happens.
5. Unit tests for `memory/update.ts` (empty fields, justification min-length, bypass record shape).
6. Commit: `feat(chunk-14): verification approval + mandatory memory update`.

### Day 5 — Release Evidence preview + zip + tree view + e2e

1. Add `ReleaseEvidencePreview.tsx` with `release.export` and `release.zipPackage` actions.
2. Implement `extension/src/release/zipPackage.ts` (archiver + `showSaveDialog`).
3. Extend `stageTreeProvider.ts` with the new VERIFY children.
4. End-to-end manual run: seed Phase 1–3 memory (or run the full CHUNK-05 → CHUNK-14 flow once) → approve → fill memory update → export → open markdown → export zip.
5. Light docs touch: add a `docs/architecture/release-evidence.md` cross-link to `memory-layers.md` — **wait, this is doc work; do not write it in this chunk. Mention as a Prompt-4 follow-up.**
6. Commit: `feat(chunk-14): release evidence preview + zip + tree view + e2e`.

If Day 5 overflows, the zip export is the cut line — it's an "optional" feature per the chunk plan. Ship without zip and add it post-Phase-3 if necessary.

---

## 11. Test plan

### 11.1 Unit tests

- **Walker** (`memoryGraphWalker.test.ts`): happy path, cycle, missing link, multiple-results warning, bypass collection. Use an in-memory `MemoryStore` fake.
- **Renderer** (`markdownRenderer.test.ts`): snapshot tests for {complete chain, chain with warnings, chain with bypasses, all three combined}.
- **Memory update** (`update.test.ts`): all-empty form → empty-fields recorded; full form → three appends; bypass → BypassRecord written; justification < 10 chars → throws.
- **Verification workflow** (`verificationWorkflow.test.ts`): each verdict produces correct payload + correct links; diff override flag plumbs through.
- **Export** (`releaseEvidenceExport.test.ts`): given a seeded store, produces a file at the right path, persists a `ReleaseMemory` row, and the markdown round-trips through `markdownRenderer`.

### 11.2 Manual end-to-end (the Phase 3 demoable)

Execute the full chain in one VS Code session, with the **Bug Triage Assistant** target (from CHUNK-15's demo target, but doable with any toy requirement during CHUNK-14 dev):

1. **CHUNK-05** — Type raw idea "I want a bug triage assistant".
2. **CHUNK-05** — Generate discovery interview prompt, paste back discovery answers.
3. **CHUNK-06** — Generate draft PRD; save.
4. **CHUNK-07** — Decompose into one requirement: REQ-001 Bug submission API.
5. **CHUNK-08** — Run Test Designer on REQ-001; attach test spec.
6. **CHUNK-09** — Generate Execution Brief; mark `migrations/` and `src/frontend/` as Forbidden.
7. **CHUNK-10** — Pick Claude Code profile; render.
8. **CHUNK-11** — Click "Run with Claude Code"; press Enter in terminal; let it write `result.md`. (Deliberately ask the harness to also touch `migrations/` for the demo moment.)
9. **CHUNK-12** — Result captured.
10. **CHUNK-13** — Diff panel flags `forbidden-but-touched: migrations/`.
11. **CHUNK-14 (this chunk)** — Open Verification panel. Inspect the three panes. Click **Reject**, select the failed criterion, list one defect.
12. **CHUNK-14** — Fill in Memory Update form: nothing under Design, "Decided to gate forbidden file via PreToolUse hook" under Codebase, nothing under Requirement assumptions. Click Save.
13. **CHUNK-14** — Click "Export Release Evidence". Open the resulting markdown. Verify the chain shows every link including the rejected verdict + the defect.
14. **CHUNK-14** — Click "Export package (zip)". Save somewhere outside the workspace. Open the zip; confirm `release-*.md` + `referenced/*.md` are present.

### 11.3 Bypass path

Run the same flow but click **Skip — record bypass** on the Memory Update form with justification "prototype run, not for release". Confirm:

- A `BypassRecord` entry exists in memory.
- The Release Evidence document's "Bypasses & gaps" section names the bypass.
- The export still produces a document (skip ≠ block).

### 11.4 Cycle / missing-link path

Hand-edit `memory_links` to introduce a cycle and a deletion. Re-run the export. Confirm:

- The walker doesn't loop forever (timeout safety: walker has no `while(true)` — it's recursion-with-visited).
- The document's "Bypasses & gaps" section enumerates each cycle and missing link.

### 11.5 Diff-override path

Approve a verification whose diff verdict is `fail`. Confirm:

- The `VerificationMemory` payload has `diffOverride: true`.
- The Release Evidence document's header line "Diff verdict: fail (overridden by user: yes)" is present.

---

## 12. Risks, edge cases, and open questions

### 12.1 Ceremony fatigue (PRD § 27 Risk 1, Risk 4 tension)

The Memory Update form is mandatory because Risk 4 demands it. But over-asking kills momentum — Risk 1.

**Mitigations baked into this spec:**

- All three fields are **optional content**; only the *form interaction* is mandatory. An all-empty submission is fine.
- "Skip — record bypass" exists as an explicit escape hatch. Bypasses are visible in Release Evidence, so the audit cost is real — the user pays in transparency, not in time.
- The form is two-and-a-half clicks (open → maybe type → submit). No required fields. No nested forms.
- The "empty field" path is captured as `nothing-to-add` in the audit trail, so "I had nothing to say" is a first-class answer rather than an evasion.

### 12.2 Memory-graph cycles

The polymorphic schema doesn't enforce DAG-ness. Defensive coding in the walker (visited set) is the only safety net. Document this in `release-evidence.md` so future contributors don't accidentally break it.

### 12.3 Missing-link gaps in the chain

Users will sometimes export Release Evidence before completing the full chain (e.g., no Design Memory entry was ever created for a one-shot brief). The spec deliberately treats missing links as warnings, not errors — the document still produces. A future hardening could escalate "missing Verification" to an error, but that's already structurally impossible (the walker starts at Verification).

### 12.4 Diff override visibility

The user can rubber-stamp `fail` diffs into `pass` verifications. The release document loudly says so. This is intentional — the meta-harness records human decisions, it doesn't override them.

### 12.5 Resolved-in-Prompt-4 questions (audit residue)

These were flagged as open during Prompt 2 and resolved by the Prompt 3 cohesion audit + Prompt 4 fixes:

1. **Link-kind taxonomy** — RESOLVED. `contracts/src/links.ts` is owned by CHUNK-03. CHUNK-14's walker reads ONLY canonical kinds: `evaluates`, `produced` (reverse), `derives-from`, `has-test-spec`. CHUNK-14 writes ONLY: `evaluates`, `verifies`, `derived-from-verification`, `releases`, `includes`. Old kinds (`produced-by`, `fulfills`, `designed-by`, `refines-from`, `snapshot-of`, `has-bypass`, and — post-DOS:O4 iteration-3 audit — `targets`, `references-codebase`, `subject-of-decision`) are eliminated.
2. **Test-Spec memory type** — RESOLVED. `test-spec` is added to CHUNK-03's canonical `MEMORY_TYPES` (9 types total).
3. **Discovery memory type** — RESOLVED. Discovery is folded into `IntentPayload.discovery` (CHUNK-05's model). No `discovery` memory type. Walker reads `intent.payload.discovery` directly.
4. **PRD memory type** — RESOLVED. PRD is a `requirement` row with `payload.kind === 'prd'`. No `prd` memory type. PRD body lives at `.deliveryos/memory/requirement/<prd-id>.md`.
5. **Bypass memory type** — RESOLVED. Bypasses are inline at `VerificationMemory.payload.bypasses[]`. No `bypass` memory type, no `has-bypass` link.
6. **Release ID format** — `release-YYYYMMDD-<shortuuid>` is human-readable but loses chronological precision intra-day. Acceptable for MVP; revisit if multi-release-per-day becomes common. CHUNK-15 adopts this same path/ID format (per M13).
7. **Zip dependency** — `archiver` or `adm-zip`. Defer to implementation, but lock the choice on Day 5 to keep the dependency footprint small.

### 12.6 Defensive coding notes

- Always go through `MemoryStore`; never reach into SQLite directly from the walker, renderer, or update flow.
- Always write the markdown file *and* the `ReleaseMemory` row in the same try/catch. If file write fails, do not persist `ReleaseMemory` (atomic intent).
- The webview enforces the gate; the extension host re-enforces it (no client-trust). If `release.export` arrives without a prior `memory.applyUpdate` or `verification.recordBypass` for the verificationId, respond with `error: { code: 'gate-not-met' }`.

---

## 13. Explicit dependencies

### Depends on

- **CHUNK-13** — diff outcome on `Result.payload.diffOutcome` (canonical field name per M05). Read-only consumer.
- **CHUNK-12** — `ResultMemory` parsed from `result.md`. Read-only consumer.
- **CHUNK-11** — handoff layout (only indirectly, because Result is keyed to handoff).
- **CHUNK-09** — immutable Execution Brief markdown referenced in the release document.
- **CHUNK-08** — Test Spec entries (`type='test-spec'`).
- **CHUNK-07** — Requirement Memory.
- **CHUNK-06** — PRD Memory.
- **CHUNK-05** — Intent + Discovery Memory.
- **CHUNK-03** — `MemoryStore` (read, list, walk, link, create). Polymorphic schema. **Do not redefine.**
- **CHUNK-02** — Webview foundation (Vite + React + Tailwind + CSP + Messenger). **Do not duplicate transport.**
- **CHUNK-01** — Tree view; extension activation; commands.

### Exposes (consumed downstream)

- **CHUNK-15 (Bug Triage demo)** — the Release Evidence document is the demo's closing screen. The zip is optional.
- **CHUNK-16 (README + essay + release)** — README screenshots include the Release Evidence document; the essay references the audit chain as the project's punchline.

### Honoured shared contracts (from part-1-plan.md § Shared cross-chunk contracts)

- Memory schema → CHUNK-03 (imported, not redeclared).
- Webview message contracts → `contracts/` package, this chunk adds `contracts/src/verification.ts` + `contracts/src/release.ts` + `contracts/src/links.ts`.
- Execution Brief schema → CHUNK-09 (read-only; markdown is treated as a referenced artefact, not re-parsed).
- Harness Profile schema → CHUNK-10 (read-only; only used to label "Harness: Claude Code | Codex" in the release doc).
- Handoff directory layout → CHUNK-11 (not touched directly; result is consumed via Result Memory).
- `.deliveryos/` memory directory layout → CHUNK-03; this chunk adds `<workspace>/.deliveryos/releases/` as a sibling of `<workspace>/.deliveryos/memory/`.
- Managed delimiter block syntax → not touched in this chunk (no CLAUDE.md/AGENTS.md edits here).

---

## 14. Phase 3 demoable-state note

This chunk **closes Phase 3** of BUILD-PLAN. The Phase 3 boundary statement is:

> "The full loop, idea to verified release, with the diff feature catching a violation live."

When CHUNK-14 lands, that statement becomes literally true:

- Idea → CHUNK-05.
- Discovery → CHUNK-05.
- PRD → CHUNK-06.
- Requirements → CHUNK-07.
- Test spec → CHUNK-08.
- Brief → CHUNK-09.
- Profile + suggested CLAUDE.md → CHUNK-10.
- Handoff + terminal → CHUNK-11.
- Result captured → CHUNK-12.
- Diff catches a violation → CHUNK-13. *(live, headline)*
- Verified release → **CHUNK-14**.

If the 14-week schedule slips, **Phase 3 is the minimum acceptable ship** (per part-1-plan.md § Phase-boundary fallback + BUILD-PLAN § Schedule risks: Momentum). The SDLC loop is closed, the diff feature works, and there is a release-evidence artefact to point at. CHUNK-15 (Bug Triage demo) and CHUNK-16 (recording + README + essay) become polish-on-top, not load-bearing.

Implication for this chunk: it must be demoable **on its own**, without depending on the Bug Triage scaffold from CHUNK-15. The end-to-end test in § 11.2 uses a toy requirement, not the Bug Triage Assistant; CHUNK-14 stands up its own narrative.

---

*End of CHUNK-14 spec.*
