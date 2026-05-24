# History — track R (Development)

Older "what just landed" sections from docs/build/BUILD_STATUS.md, newest on top.

---

## DOS:R14  (2026-05-24)

DOS:R14 was the CHUNK-09 session — full Execution Brief composer shipped end-to-end. Same one-shot cadence as DOS:R11/R12/R13 (Days 1–5 in a single session); 5 substantive commits + this wrap commit; no rework. Tests went 129 → 190. **Phase 2 Week 7 closes here** — the project now walks the full manual-mode loop raw idea → discovery → PRD → requirements → test specs → **Execution Briefs** inside the editor. CHUNK-09 is the defining chunk for the canonical Execution Brief markdown schema: `extension/src/brief/briefMarkdown.ts` is the single source of truth that CHUNK-10 (profile rendering), CHUNK-12 (`result.md` parser), and CHUNK-13 (Allowed/Forbidden diff) will all import.

**5 commits on `main`:**

- `2d90981 feat(brief): CHUNK-09 Day 1 — contracts + pure modules (DOS:R14)` — `contracts/src/brief.ts` (5 RequestTypes + `BriefCancel` notification + 6 value types: `ExecutionBriefDraft`, `BriefSectionDraft`, `BriefFrontmatterDraft`, `BriefMetaLines`, `BriefValidation`, `RequirementBriefSummary`); `contracts/src/requirements.ts` extended with `RequirementsOpenBriefComposer` + `RequirementsOpenBriefFile` RequestTypes + `'execution-update'` added to `RequirementsChangedParams.source` union + `Requirement.briefs: readonly RequirementBriefDigest[]` field; `contracts/src/index.ts` re-export; `extension/src/brief/types.ts` (extension-host-internal `ExecutionBrief` + `BriefSection` + `BriefAllowedList` + `BriefForbiddenList` + `BriefFrontmatter`); `extension/src/brief/briefMarkdown.ts` — **canonical single source of truth for CHUNK-10/12/13**: `BRIEF_SCHEMA_VERSION = 1`, `BRIEF_SECTION_NAMES` (10 frozen), `RESULT_MD_SECTION_NAMES` (6 frozen — embedded verbatim into every brief's Section 9, imported by CHUNK-12), `parse(md)` strict on schema (section ids + names + order + frontmatter required keys) and lenient on whitespace / CRLF / case-H1 (warns), `serialise(brief)` deterministic byte-stable, `parseAllowedForbidden(md)` cheap regex-based extractor for CHUNK-13, `renderExpectedOutputSection()` fixed Section 9 template, `BriefMarkdownParseError` with 8 kinds; trailing-slash directory shorthand normalised to `dir/**` at the single parse site per spec § 5.2; hand-rolled minimal YAML decoder — no new YAML dep; `extension/src/brief/briefValidator.ts` (`validate(brief) → BriefValidation`: per-glob `picomatch.makeRe` + allowed-non-empty + Section 9 template-tamper detection + duplicate-glob warnings); `extension/src/brief/briefIds.ts` (`nextBriefId()` → `brief_<uuid-v4>`); `extension/package.json` adds `picomatch ^2.3.2` + `@types/picomatch ^2.3.4` (lifted from transitive); +45 new tests. 12 files, +1,862. Tests 129→174.
- `c663ae1 feat(brief): CHUNK-09 Day 2 — memory layer + host wiring (DOS:R14)` — `MemoryStore` extended with `StoredExecutionPayload` (`kind: 'execution-brief'` + `id` (`brief_<uuid-v4>`) + `briefMarkdown` (denormalised cache of body) + `targetHarness: 'generic'` + `briefVersion` + `projectId` + `requirementEntryId` + `requirementUserId` (REQ-NNN) + optional `testSpecEntryId` + optional `supersedesEntryId` + `schemaVersion` + `profile` + `lockedAt` ISO); `BriefRecord` projection type; cast-through `as unknown as ExecutionPayload` mirroring CHUNK-08's pattern — `contracts/src/memory.ts` NOT touched. 4 new methods: `getBrief(briefEntryId)`, `listBriefsForRequirement(reqEntryId)` (joins `memory_links` on `derives-from` ordered by `created_at` ASC), `createBrief({...})` (writes row + `derives-from` Brief → Requirement link + optional `supersedes` Brief → prior-Brief link — briefs immutable post-write, no `updateBrief`), `briefBodyUri(briefEntryId)`. `extension/src/brief/briefBuilder.ts` (`assembleDraft({...})` pre-fills 10 sections from requirement + linked test-spec; Section 9 uses fixed template). New host plumbing: `briefComposerPanel.ts` (singleton + pending-holder triple `(requirementEntryId, briefEntryId?, supersedesEntryId?)` mirroring `consumePendingTestDesignerRequirement`; `retainContextWhenHidden: true`) + `briefComposerSerializer.ts` + `openBriefComposer.ts` + `openBriefFile.ts` commands + `extension.ts` wiring + `package.json` contributes (`deliveryos.brief.compose` + `deliveryos.brief.openFile`). `registerBriefHandlers` registering 5 request handlers + cancel: bootstrap consumes pending-holder; **host-side immutability guard per spec § 11.5a** — rejects edit/save messages when target row's `locked_at` is set (webview-disabling is UX courtesy, host is the contract); save serialises via canonical `briefMarkdown.serialise` and broadcasts `RequirementsChanged` with `source: 'execution-update'`. `RequirementsDeps` extended with `openBriefComposerPanel({...}) => Promise<void>` callback; `RequirementsOpenBriefComposer` + `RequirementsOpenBriefFile` handlers added; `toRequirement` joins `listBriefsForRequirement` and populates `Requirement.briefs[]` with `{ entryId, id, version, createdAt, supersededByEntryId? }`. +7 new tests. 10 files, +1,322. Tests 174→181.
- `5fcb9d9 feat(brief): CHUNK-09 Day 3 — composer webview (DOS:R14)` — `webview/src/panels/brief-composer/` — `index.html` + `main.tsx` + `BriefComposerApp.tsx` (two-pane Radix Toast with `loading → ready{draft|readonly} → error` state machine + section list left + host-pushed live markdown preview right per spec § 11.3 Option A — webview never imports `briefMarkdown.ts`; bootstrap on mount + `BriefCancel` notification on unmount; Save re-bootstraps to flip into readonly mode after success) + `SectionEditor.tsx` (generic markdown textarea for sections 1–4, 6, 10 with 200ms debounce; Section 9 read-only `<pre>` per spec § 4.5) + `AllowedForbiddenEditor.tsx` (two side-by-side textareas with bullet/comment stripping + 250ms debounce; host normalises trailing-slash shorthand on receipt) + `CodebaseContextPaste.tsx` (Section 5 paste box with "Future: auto-extract" hint per spec § 11.2) + `SaveAndLockButton.tsx` (disabled until validation passes, tooltip lists errors; in read-only mode shows "use Compose new version" note); `webview/vite.config.ts` registers `brief-composer` entry → 11.37 KB / 3.69 KB gzip. 8 files, +627.
- `63c8842 feat(brief): CHUNK-09 Day 4 — detail integration + handoff siblings (DOS:R14)` — `webview/src/panels/requirements/RequirementDetail.tsx` extended with "Compose Execution Brief" button in header (next to "Run Test Designer") + new "Execution briefs" section: empty state with CTA OR populated list of brief rows showing `brief_id` + `vN` + `lockedAt` + (`· superseded` indicator if applicable) + per-row Open / Open file / Compose new version actions; `extension/src/brief/handoffSiblings.ts` — 4 pure renderers per spec § 6.4 for CHUNK-11 to write to `.deliveryos-handoff/`: `renderContextPackage(req, codebase|null, brief)` (Codebase Memory snapshot with Section 5 fallback when no codebase entry linked), `renderTestSpecification(testSpec)` (heading + preamble + raw body verbatim), `renderVerificationChecklist(brief)` (Section 10 bullets → `- [ ]` GFM checkboxes; already-checked items normalise to unchecked), `renderMemorySummary({ brief, requirement, linkedEntries })` (≤50-line cap with truncation indicator; pure — no MemoryStore dep, caller supplies linkedEntries). Push refresh: Day 2 already routed brief save → `RequirementsChanged{source:'execution-update'}` so the Briefs column auto-flips empty → populated after Save with no new code. +9 new tests + 1 typecheck fix (dropped `present: true` field from a PrdSection literal that never existed). 4 files, +535.
- `576c4e7 feat(brief): CHUNK-09 Day 5 — tree + polish + docs (DOS:R14)` — `StageTreeNode` union gains `ExecuteRequirementNode` + `BriefNode` + `ComposeBriefNode` discriminants; EXECUTE stage now lists every requirement as a parent — collapses to brief list when any brief exists (rocket icon + lockedAt description; archive icon for superseded briefs) or to "Compose Execution Brief…" placeholder when empty; tree refresh listener extended to fire on `execution` entry create/update + `derives-from`/`supersedes` link/unlink (the original "endpoint touches active intent" check skipped these kinds). README status line bumped Phase 1 closed → Phase 2 Week 7 complete (~6 weeks ahead of plan). BUILD-PLAN Week 7 row marked ✅ Done with full Day-by-day trail. 4 files, +161/−3.

**Key design choices flagged at the end of DOS:R14:**

- **Brief payload discipline**: stored as `type='execution'` + `payload.kind='execution-brief'` with cast-through `as unknown as ExecutionPayload`. `contracts/src/memory.ts` was NOT touched. `MemoryEntry.body` holds the canonical brief markdown (the file at `.deliveryos/memory/execution/<row-id>.md` is system-frontmatter-prepended; on read `stripFrontmatter` returns the brief content starting with its OWN frontmatter — `brief_id`, `schema_version`, etc.). `payload.briefMarkdown` is denormalised cache.
- **Brief id vs SQLite row id**: two ids. SQLite row id is `execution-<short-uuid>` (auto-generated by `generateMemoryId('execution')`); user-visible `brief_id` is `brief_<uuid-v4>` (from `nextBriefId()` in `briefIds.ts`) and lives in both `payload.id` and the brief's frontmatter. On-disk filename uses the SQLite row id — matches the test-spec convention (`test-spec-<short>.md` not `TS-REQ-NNN.md`).
- **Schema frozen at `BRIEF_SCHEMA_VERSION = 1`**: any extension is a v-bump + migration per spec § 11.1. CHUNK-10 (profile rendering) and CHUNK-13 (Allowed/Forbidden diff) MUST import `parse` / `serialise` / `parseAllowedForbidden` / `RESULT_MD_SECTION_NAMES` from `briefMarkdown.ts` — never re-implement.
- **Glob trailing-slash normalisation is a single parse-time site** per spec § 5.2. Downstream consumers (CHUNK-13) MUST NOT expect to see `dir/` shorthand in `ExecutionBrief.allowed.globs` — the parsed arrays only contain `dir/**`. The host messenger mirrors the same normalisation in `applyListEdit` so webview-typed shorthand round-trips identically.
- **Host-side immutability is load-bearing** per spec § 11.5a. Webview-disabled controls are UX hints; the host messenger's `activeBriefEntryId` guard rejects `BriefEditSection`/`BriefEditList`/`BriefSave` once a brief is locked. A stale-id attack (webview retaining a draft id from before save) is caught at save time by the same guard.
- **Section 9 is read-only template**: the composer renders `renderExpectedOutputSection()` verbatim from `RESULT_MD_SECTION_NAMES`. CHUNK-12's parser will import the same constant — one source of truth, no schema drift. The webview's `BriefEditSection` handler explicitly rejects Section 9 edits with `reason: 'read-only-section'`.
- **Brief immutability — no `updateBrief`**: revisions create a fresh brief with `supersedes` set in frontmatter + a `supersedes` link in the memory graph. The tree's superseded indicator activates the moment a newer brief lands; the "Compose new version" button is hidden for already-superseded briefs.
- **Handoff siblings are pure** (`extension/src/brief/handoffSiblings.ts`): no `MemoryStore` dep — CHUNK-11 supplies `linkedEntries` to `renderMemorySummary`. Lets CHUNK-11 own filesystem orchestration without coupling to graph traversal.
- **Catalogue refresh source `'execution-update'`** — extends the same union pattern CHUNK-08 used for `'verification-update'`. The `RequirementsApp.tsx:68` subscription is unconditional, so the new source value is picked up transparently.
- **picomatch lifted from transitive to direct dep**: it was already on disk (via `tinyglobby`) at v2.3.2; lifting it makes the host bundle deterministic and removes the dep-tree-shape risk for CHUNK-13. The validator's `picomatch.makeRe(glob)` returns `false` (not throwing) for unparseable patterns — the validator checks both paths. In practice picomatch is extremely lenient; only inputs >65,536 chars actually throw.

---

## DOS:R13  (2026-05-24)

DOS:R13 was the CHUNK-08 session — full Test Designer specialist + verification-criteria-attachment flow shipped end-to-end. Same one-shot cadence as DOS:R11/R12 (Days 1–5 in a single session); 5 substantive commits + this wrap commit; no rework. Tests went 109 → 129. **Phase 1 closes here** — Phase 1 demoable state is now stand-up-able ("Type an idea, walk through discovery, get a PRD, get requirements, get test specs. All inside the editor.").

**5 commits on `main`:**

- `f6ae1d2 feat(test-designer): CHUNK-08 Day 1 — contracts + pure modules (DOS:R13)` — `contracts/src/testDesigner.ts` (5 RequestTypes + `TestDesignerCancel` notification + 5 value types: `VerificationCriterion`, `TestCase`, `TestSpec`, `RequirementSummary`, `TestDesignerParseResult`); `contracts/src/requirements.ts` extended with `RequirementsOpenTestDesigner` + `RequirementsOpenTestSpecFile` RequestTypes + `'verification-update'` added to `RequirementsChangedParams.source` union; `contracts/src/index.ts` re-export; `extension/src/specialists/testDesigner/promptBuilder.ts` (pure `buildTestDesignerPrompt({...})` with PRD §22's 7-section shape; `## Verification Criteria` + `## Test Specification` load-bearing headers; deterministic — no timestamps, no IDs in body); `extension/src/specialists/testDesigner/resultParser.ts` (`parseTestDesignerResult(raw, { requirementId })`: strip preamble until first `^## ` → unwrap single outer fence → split on `^## ` → find Verification Criteria / Test Specification / Open Questions sections → extract `[-*+]` bullets with sub-bullet flattening → emit `VC-<reqId>-NN` + `T-<reqId>-NN` ids deterministically → `'high'` if both criteria + cases found, `'low'` if exactly one, `'raw'` if neither); 20 new tests. 6 files, +993. Tests 109→129.
- `da48e9d feat(test-designer): CHUNK-08 Day 2 — memory layer + host wiring (DOS:R13)` — `MemoryStore` extended with `StoredTestSpecPayload` (`kind: 'test-spec'` + dual-key `id` (TS-REQ-NNN) + `requirementUserId` + `requirementId` (SQLite UUID) + canonical `scenarios[]` + CHUNK-08 extension `cases[]` + `verificationCriteria` + `openQuestions` + `confidence`); `TestSpecRecord` projection type. 4 new methods: `getTestSpec(reqEntryId)` joins `memory_links` on `has-test-spec`; `createOrOverwriteTestSpec({...})` BEGIN/COMMIT delete-then-create overwrite semantics per spec §10 OQ-1 + cast-through `as unknown as TestSpecPayload` mirroring CHUNK-07 + writes markdown body via `vscode.workspace.fs.writeFile` + creates `has-test-spec` link + patches parent requirement's `verificationCriteria` (plain-string list to honour `RequirementPayload.verificationCriteria`'s `readonly string[]` shape); `toTestSpec(record)` projection; `testSpecBodyUri(testSpecEntryId)`. `formatTestSpecId(reqId)` → `TS-${reqId}`. New host plumbing: `testDesignerPanel.ts` (singleton + pending-requirement holder mirroring `consumePendingDiscoverMode`; `retainContextWhenHidden: true`) + `testDesignerPanelSerializer.ts` + `openTestDesigner.ts` command + `extension.ts` wiring + `package.json` contributes (`deliveryos.requirements.runTestDesigner`). `registerTestDesignerHandlers` registering 5 request handlers + cancel: bootstrap consumes pending-holder (no params); commit re-parses raw host-side per spec §4 (webview cannot be trusted); broadcasts `RequirementsChanged` with `source: 'verification-update'`. `RequirementsDeps` extended with `openTestDesignerPanel: (entryId) => Promise<void>` callback; `RequirementsOpenTestDesigner` + `RequirementsOpenTestSpecFile` handlers added. 8 files, +571.
- Day 3 commit (test-designer webview): `webview/src/panels/test-designer/` — `index.html` + `main.tsx` + `TestDesignerApp.tsx` (Radix Tabs two-pane with `loading → ready → error` state machine + REQ-NNN header + overwrite-existing-test-spec warning; sends `TestDesignerCancel` on unmount) + `PromptPreview.tsx` (markdown-it render of generated prompt + webview-clipboard with host-side `TestDesignerCopyPrompt` fallback per spec §10 Risk 3 + Regenerate + Go to Result CTAs) + `PasteResultInput.tsx` (2 MB cap textarea + Parse → renders ConfidenceBanner ('high'/'low'/'raw') + collapsible parser-warnings + preview block of criteria + cases + open questions + Save → host re-parses raw + native `window.confirm` overwrite dialog when existing test-spec detected); `webview/vite.config.ts` registers `test-designer` entry. 6 files, +431.
- `c7c3f20 feat(test-designer): CHUNK-08 Day 4 — detail integration + push refresh (DOS:R13)` — `Requirement` contract extended with `verificationCriteria: readonly string[]` + `testSpec: RequirementTestSpecSummary | null` (`{ id, caseTitles }`); `toRequirement` becomes async, joins per-requirement `getTestSpec` (acceptable O(N) at 15–40 req/project bound); `buildCatalogue` awaits `Promise.all(records.map(toRequirement))`. `RequirementDetail.tsx` rewritten: Run Test Designer button in header → sends `RequirementsOpenTestDesigner`; Verification criteria section (bulleted list when populated, empty-state copy otherwise); Test specification section (`TS-<reqId>` + case titles + Open file button → sends `RequirementsOpenTestSpecFile`, host fires `vscode.open` on the markdown body URI). Catalogue refresh wires through existing `RequirementsChanged` push subscription at `RequirementsApp.tsx:68` — verification column auto-flips empty → draft after Save. 3 files, +128/−25.
- `b5a89ba feat(test-designer): CHUNK-08 Day 5 — tree + polish + docs (DOS:R13)` — `StageTreeNode` union gains `VerificationCriteriaNode` + `TestSpecNode` discriminants; `RequirementItemNode.hasVerification` drives `Collapsed` vs `None` state. `requirementsGroupChildren(prdId)` now joins test-spec per requirement to compute `hasVerification`. `requirementItemChildren(node)` lazy-loads two children when populated: "Verification criteria — N" (click → opens catalogue with `{ selectedId: reqId, focus: 'verification' }` — host plumbing in place; webview-side `consumePendingRequirementSelection` deep-link wiring remains a deferred follow-up from CHUNK-07) + "Test spec — TS-REQ-NNN" (click → `deliveryos.requirements.openTestSpecFile` → `vscode.open` on markdown body URI). New `openTestSpecFile.ts` command. Tree provider refresh listener extended to fire on test-spec entry create/update + `has-test-spec` link/unlink (the original "endpoint touches active intent" check skipped these). README status line bumped Week 5 → Phase 1 closed. BUILD-PLAN Week 6 row marked ✅ Done with full Day-by-day trail. 6 files, +149/−20.

**Key design choices flagged for DOS:R14:** TestSpec dual-storage (`type='test-spec'` + `payload.kind='test-spec'` with `requirementId` (SQLite UUID) + `requirementUserId` (TS-REQ-NNN) + canonical `scenarios[]` from `cases[]` + cast-through `as unknown as TestSpecPayload`; `contracts/src/memory.ts` NOT touched). Markdown body is source of truth for `raw` — CHUNK-09 Section 6 reads `.deliveryos/memory/test-spec/<entryId>.md` for test specs. Verification criteria storage shape: parsed `VerificationCriterion[]` on `TestSpec`; plain-string list on `RequirementPayload.verificationCriteria` (canonical shape) populated via existing `update<'requirement'>` path. Bootstrap consumes pending-holder, not params (mirrors `consumePendingDiscoverMode`). `has-test-spec` link kind already in `LINK_KINDS` (Phase A m03). Catalogue refresh source `'verification-update'` extends existing union (auto-picked-up by unconditional subscription at `RequirementsApp.tsx:68`). Tree-node collapse policy: requirement-item collapses only if it has criteria OR a linked test-spec.

---

## DOS:R12  (2026-05-24)

DOS:R12 was the CHUNK-07 session — full Requirements catalogue + Decompose-PRD flow shipped end-to-end. Same one-shot cadence as DOS:R11 (Days 1–5 in a single session); 5 substantive commits + this wrap commit; no rework. Tests went 85 → 109. Two design calls confirmed at session start: cadence one-shot, names lowercase end-to-end (no `contracts/src/memory.ts` change).

**5 commits on `main`:**

- `c7f6be0 feat(requirements): CHUNK-07 Day 1 — contracts + pure-module foundation (DOS:R12)` — `contracts/src/requirements.ts` (8 message types: `RequirementsList`, `RequirementsFilter`, `RequirementsUpdate`, `RequirementsDelete`, `RequirementsOpenDecomposePanel`, `RequirementsGenerateDecomposePrompt`, `RequirementsPasteDecomposed`, `RequirementsChanged` push; `Requirement` with both `entryId` UUID and `id` REQ-NNN; `DecomposedRequirement`; `RequirementsCatalogue`; `DecomposedParseResult`); `contracts/src/index.ts` re-export; `extension/src/requirements/decompositionPrompt.ts` (pure `buildDecomposePrompt({ prd, prdMarkdownBody? })` wrapping body in `<!-- BEGIN_PRD --> … <!-- END_PRD -->` sentinels — uses `renderPrdMarkdown` from CHUNK-06 when body omitted); `extension/src/requirements/parser.ts` (single `parseDecomposed(text)` export with sentinel-strip → outer-fence-strip → JSON attempt (accepts `[...]` and `{ requirements: [...] }`) → markdown-table fallback (case-insensitive header match including "type"↔"category" alias) → enum coercion (lowercase MoSCoW, lowercase functional/non-functional) with warning emission for unknown values); 24 new tests. 5 files, +820. Tests 85→109.
- `2b97308 feat(requirements): CHUNK-07 Day 2 — memory layer + host wiring (DOS:R12)` — `MemoryStore` extended with `StoredRequirementItemPayload` (`kind: 'requirement-item'` + `id` REQ-NNN + lowercase fields) + `RequirementItemRecord` type. 4 new methods: `listRequirementItems(prdId)` (joins `memory_links` on `derives-from`); `createRequirementItems(prdId, items)` (sequential `REQ-NNN` from `nextRequirementIdNumber` scan; casts payload `as unknown as RequirementPayload`; links each to PRD); `updateRequirementItem(entryId, patch)` (conditional-spread merge into stored payload; preserves `kind`+`id`); `deleteRequirementItem(entryId)` (BEGIN/COMMIT tx removing links + entry, then best-effort body file delete + flush + change event). `formatReqId(n)` pads to 3 digits, widens to 4+ at 1000+. `registerRequirementsHandlers({ registry, memoryStore, openDecomposePanel })` registering all 7 request handlers + `RequirementsChanged` push broadcast on every mutation. `toRequirement` maps `RequirementItemRecord → Requirement` (computing `verificationStatus`: 'empty' if `verificationCriteria?.length` is 0; 'draft' otherwise — CHUNK-08 owns 'approved'). New host plumbing: `requirementsPanel.ts` + `decomposePromptPanel.ts` (mirror `prdPanel.ts`) + 2 serializers + 2 commands + `extension.ts` wiring + `package.json` contributes (`deliveryos.requirements.open` + `deliveryos.requirements.decompose`). Decompose-panel open is injected as a callback through `RequirementsDeps` so the messenger stays unaware of `ExtensionContext`. 10 files, +568/−2.
- `a064b4f feat(requirements): CHUNK-07 Day 3 — decompose panel webview (DOS:R12)` — `webview/src/panels/requirements-decompose/` (`index.html` + `main.tsx` + `DecomposePromptApp.tsx`) two-step UI: Step 1 'Copy decompose-PRD prompt' button (host writes prompt to clipboard); Step 2 paste textarea (2 MB cap, >50 KB byte-count warning) + 'Parse and create' → on ok shows "Created N requirements (mode)" + parser-warnings details disclosure; on parse failure switches to placeholder fallback (Day 5 polish). Radix Toast for status messages. `webview/vite.config.ts` registers `requirements-decompose` entry. 4 files, +242.
- `7b10ffd feat(requirements): CHUNK-07 Day 4 — catalogue webview (DOS:R12)` — `webview/src/panels/requirements/` (`index.html` + `main.tsx` + `RequirementsApp.tsx` + `RequirementsTable.tsx` + `RequirementDetail.tsx`): `RequirementsApp` loads via `RequirementsList` + subscribes to `RequirementsChanged` push to auto-refresh; empty state with Decompose CTA; loading / noProject / noPrd / ready discriminated state machine. `RequirementsTable`: 6 columns (ID, Title, Category, Priority, Source, Verification) with click-to-sort headers; priority sorted by Must/Should/Could rank; verification sorted by empty/draft/approved rank. Filter bar (category/priority/verification dropdowns + search) all client-side for MVP; `RequirementsFilter` endpoint reserved for future server-side filtering. `RequirementDetail`: editable title/description/category/priority/source-section dropdown (sourced from `prdSections`, with `(unrecognised)` option for stale imports); verification-criteria block renders muted "Awaiting Test Designer (CHUNK-08)"; Save disabled until dirty; Delete with native confirm. `Requirement` contract gained `entryId` field (UUID) alongside user-visible `id` (REQ-NNN) so the webview can address update + delete by SQLite row id without a lookup. `vite.config.ts` adds `requirements` entry. 8 files, +665.
- `408962f feat(requirements): CHUNK-07 Day 5 — tree + polish + docs (DOS:R12)` — `StageTreeProvider.defineChildren` now returns the existing Draft PRD node plus a new "Requirements" collapsible group node that lazy-loads per-REQ children via `requirementsGroupChildren(prdId)`. `stageTreeNodes` discriminated union extended with `RequirementsGroupNode` + `RequirementItemNode` kinds; `toTreeItem` renders both with `truncate` helper for the 60-char label cap; each per-REQ child's command opens the catalogue with `{ selectedId: REQ-NNN }` in args. `DecomposePromptApp` manual-add fallback ships a real multi-row form (title/description/category/priority/source with Add/Remove row + Create rows submitting as JSON via the existing `pasteDecomposed` handler — no new host code). README status line bumped Week 4 → Week 5. BUILD-PLAN Week 5 row marked ✅ Done with the day-by-day trail.

**Key design choices flagged for DOS:R13:** Requirement payload discipline (`type='requirement'` + `payload.kind='requirement-item'` with `as unknown as RequirementPayload` cast; `contracts/src/memory.ts` NOT touched). `verificationStatus` derived not stored ('empty' if no criteria, 'draft' otherwise; 'approved' reserved for CHUNK-08). `Requirement.entryId` (UUID) alongside user-visible `id` (REQ-NNN). `RequirementsDeps` injects `openDecomposePanel` as a callback. `derives-from` link kind points requirement-item → PRD entry. Tree command arg shape `{ selectedId: REQ-NNN }` deep-link wiring was host-side only — webview side unwired (carry-over).

**Carry-overs cleared by DOS:R12**: ✅ CHUNK-07 requirements catalogue.

**Carry-overs still standing for DOS:R13**: CHUNK-07 § 8 manual smoke (steps 1–20); CHUNK-06 § 12 done-when bullets; CHUNK-05 Day 4 steps 21–23; `/tmp/` smoke workspaces; b001 + b004 still `pending_review`; `origin/main` push (28 commits ahead after wrap); tree → catalogue deep-link selection (webview bootstrap unwired).

---

## DOS:R11  (2026-05-24)

DOS:R11 was the CHUNK-06 session — full PRD generation + editor implementation. The user's "need to speed up to post something soon" directive from DOS:R10 carried into this session; Days 1+2+3+4+5 were all implemented in a single session run (context was compacted mid-session between Days 1 and 2). 4 substantive commits + 1 docs commit, no rework. Tests went from 54 → 85 passing.

**5 commits on `main`:**

- `09e92b0 feat(prd): CHUNK-06 Day 1 — contracts + pure-module foundation (DOS:R11)` — `contracts/src/prd.ts` (5 message types: `PrdLoad`, `PrdGenerateDraftPrompt`, `PrdPasteDraft`, `PrdSaveSection`, `PrdReviseSectionPrompt`; `DraftPrd`, `PrdSection`, `PrdSectionId`, `PrdParseReport`); `extension/src/prd/sectionSchema.ts` (`PRD_SECTION_DEFINITIONS` verbatim from spec, `parsePrdMarkdown` lenient parser with 20-entry alias map + triple-backtick fence tracking, `renderPrdMarkdown`); `extension/src/prd/promptBuilder.ts` (`buildGenerateDraftPrompt`, `buildReviseSectionPrompt` — pure functions); 3 fixtures + 31 new tests in `extension/test/prd.test.ts`. 23 files total. Tests 54→85.
- `2732f5b feat(prd): CHUNK-06 Day 2 — memory layer + host wiring (DOS:R11)` — `MemoryStore.loadPrdParent(projectId)` (SQL `json_extract` on `payload_json.kind='prd'` + `payload_json.projectId`); `MemoryStore.upsertPrdParent(intentEntry, sections, existingPrdId?)` (create or update path; link `'derives-from'` on first create; uses `type='requirement'` + `payload.kind='prd'`, NO separate memory type); `registerPrdHandlers(deps)` with all 5 handlers (prd/load uses registry active project + extends result with `projectId+projectTitle`; prd/generateDraftPrompt; prd/pasteDraft; prd/saveSection; prd/reviseSectionPrompt); `prdPanel.ts` + `prdEditorSerializer.ts` + `openPrdEditor.ts`; `package.json` commands (`deliveryos.prd.generate` + `deliveryos.prd.open`); `extension.ts` wiring; `ArtefactNode.commandId/commandArgs` for generic tree command wiring. 8 files, +307/−1.
- `fba74b8 feat(prd): CHUNK-06 Days 3+4 — webview + tree integration (DOS:R11)` — `PrdLoadResult` extended with `projectId + projectTitle` (so webview bootstraps from one call); full `prd-editor` webview bundle: `PrdEditorApp.tsx` (loading→noProject→empty→parsing→editing state machine using `AppState` discriminated union); `PrdGenerationPrompt.tsx` (copy-prompt button + paste textarea + Import button; 2 MB cap + 50 KB warning); `SectionEditor.tsx` (auto-growing textarea, 500ms debounce → `prd/saveSection`, "Saving…"/"Saved" microcopy); `ReviseSectionButton.tsx` (Radix `Collapsible` instruction panel — Dialog not installed; copies revision prompt to clipboard via `prd/reviseSectionPrompt`; toast: "Paste into your AI tool…"); `vite.config.ts` prd-editor entry; DEFINE tree node ("Draft PRD (N/8 sections)" or "(not started)") with `commandId='deliveryos.prd.open'`; `stageTreeProvider.defineChildren()` + refresh on `requirement` create/update events. 10 files, +592.
- `647408e feat(prd): CHUNK-06 Day 5 — polish + docs (DOS:R11)` — README status line → Phase 1 Week 4 complete. BUILD-PLAN Week 4 row → ✅ Done with day-by-day trail.

**Key design choices to flag for DOS:R12:**

- **PRD memory type**: `type='requirement'` + `payload.kind === 'prd'`. No `'prd'` in `MEMORY_TYPES`. `contracts/src/memory.ts` was NOT touched this session.
- **Link kind**: `'derives-from'` (written from prdId → intentId on first create via `upsertPrdParent`).
- **`PrdLoadResult` extended**: `projectId: string` + `projectTitle: string` added so the webview bootstraps from one call without a separate initial-state message. This slightly exceeds the 5-message spec but avoids a 6th message type.
- **`ReviseSectionButton` uses Radix `Collapsible`** (installed), not Radix `Dialog` (not in `webview/package.json`). The UX is equivalent for MVP.
- **SectionEditor debounce is 500ms** (vs. 1s in `RawIdeaInput`) — tighter feedback for section edits.
- **`payload.discovery` fallback**: `prd/generateDraftPrompt` handler passes `{ promptSnapshot: '', answers: [], completedAt: 0 }` when `payload.discovery === null` so `buildGenerateDraftPrompt` (which expects non-null `DiscoveryRecord`) always gets a valid value.

**Carry-overs from DOS:R10 cleared by DOS:R11:**

- ✅ CHUNK-06 PRD generation + editor — fully shipped.

**Carry-overs from DOS:R10 still standing:**

- ⏳ CHUNK-06 manual smoke (§ 12 done-when bullets) — user-driven; non-blocking CHUNK-07. Open PRD editor → copy generate-PRD prompt → paste into AI → paste draft back → verify 8 sections editable → save → reload → state persists; confirm SQLite row + markdown body agree.
- ⏳ CHUNK-05 Day 4 manual smoke (steps 21-23) — user-driven; non-blocking.
- ⏳ Smoke workspaces under `/tmp/` — still on disk; minor housekeeping (carries from DOS:R5).
- ⏳ b001 + b004 still `pending_review` in `bugs.json` — merged but not live-verified.
- ⏳ `origin/main` push — now ~22 commits ahead after this wrap. User's call.

**Two CHUNK-03 / CHUNK-04 tripwires unchanged (chronic since DOS:R3):**

- **Multi-root workspace support.** MVP picks `workspaceFolders[0]` (CHUNK-03 § 13.6). Revisit if dogfooding hits it.
- **`SqlJsHost.flush()` debounce.** Current strategy: flush-per-mutation. Tripwire: if `MemoryStore.create()` ever exceeds 100 ms in dogfooding, drop in a debounced `scheduleFlush(250 ms)`.

**Track-O open questions** (CHUNK-03 § 13.9 + ongoing). Runtime Zod validation on `payload_json` read; whether to default `memory.sqlite` to gitignored; whether the rebuild-from-markdown command earns a chunk slot. None blocking — defer to a Track-O session.

---

## DOS:R10  (2026-05-24)

DOS:R10 was a focused polish session. The user picked CHUNK-05 Day 5 directly ("lets do day 5, we need to speed up to post something soon"), skipping the Day 4 manual smoke as a carry-over. All six Day 5 scope items landed cleanly in one substantive commit with no rework; the session was the fastest single-chunk Day so far.

**1 substantive commit on `main` + this wrap:**

- `f4b7975 feat(discover): CHUNK-05 Day 5 — polish (DOS:R10)` — 7 files modified, +163/−28. Closes chunk-05 § 9 Day 5 steps 24-27 + § 11 risks 2-4.

**CHUNK-05 Day 5 deliverables (file-by-file):**

- `webview/package.json` (+3) — added `"markdown-it": "^14"` to `dependencies` + `"@types/markdown-it": "^14"` to `devDependencies`. `npm install` resolved 3 new packages.
- `webview/src/panels/discover/DiscoverApp.tsx` (+8/−2) — added `noProject: boolean` state (default `false`). In the `DiscoverGetInitialState` `.catch()` handler: `setNoProject(true)` instead of silently logging.
- `webview/src/panels/discover/RawIdeaInput.tsx` (+58/−16) — full rewrite with `MAX_BYTES = 2_000_000`, `LARGE_THRESHOLD = 50_000`, 80-row autosize cap, 1s debounce, blur-save fallback for large inputs.
- `webview/src/panels/discover/DiscoveryAnswersInput.tsx` (+24/−8) — same large-input banner + 2 MB cap for paste textarea; individual answer textareas unchanged.
- `webview/src/panels/discover/DiscoverySummary.tsx` (+6/−3) — `markdown-it` rendering with `html: false` for XSS safety.
- `README.md` — status line + new `## Quick Start — manual-mode loop` section.
- `package-lock.json` — re-resolved after `markdown-it` added.

**Build confirmed:** `dist/extension.js` 151.1 KB; `discover-*.js` 142.50 KB / 61.13 KB gzip (markdown-it added 94 KB raw / 46 KB gzip; within 200 KB gzip spec target). 54 tests passing (unchanged).

**Open carries into DOS:R11:** CHUNK-05 Day 4 manual smoke (user-driven, non-blocking); smoke workspaces; b001 + b004 `pending_review`; origin/main push (~18 ahead); CHUNK-06 primary next.

---

## DOS:R9  (2026-05-23)

DOS:R9 was a tight, single-focus session opened the same day as DOS:R7 + DOS:R8 (three sessions back-to-back). The user picked the recommended option from a 4-option `/start-fresh` prompt: **"CHUNK-05 Day 4"** — the natural next slice after DOS:R8's webview build, closing the "panel exists but isn't discoverable in the UI" gap. The two real gaps were (a) `MemoryStore` had no change event, and (b) the tree's `getChildren()` returned an empty array for stage children.

1 substantive commit on `main` + this wrap. No rework. One unexpected step: the test typecheck failed because `vscode-stub.ts` had no `EventEmitter`/`Event`/`Disposable` surface — added a minimal shim.

**Commits on `main` (1 substantive + 1 wrap):**

- `c54ab05 feat(discover): CHUNK-05 Day 4 — tree integration (DOS:R9)` — closes chunk-05 § 9 Day 4 steps 19-20. 5 files modified, +163/−7.

**CHUNK-05 Day 4 deliverables (file-by-file):**

- `extension/src/memory/MemoryStore.ts` (+12) — added `MemoryChangeEvent` discriminated union + private `_onDidChangeMemory = new vscode.EventEmitter<MemoryChangeEvent>()` + public `readonly onDidChangeMemory: vscode.Event<MemoryChangeEvent>`. Fires after the SQL commit + markdown flush + `flushOrThrow()` succeed in `create`/`update`/`link`/`unlink` — never on failure. Disposed in `close()`.
- `extension/src/tree/stageTreeProvider.ts` (+100/−4) — constructor takes optional `memoryStore: MemoryStore`. Subscribes to `onDidChangeMemory` with a focused filter (intent-create OR active-project update / link/unlink). `getChildren()` is now `async`; under DISCOVER yields two `ArtefactNode`s: Raw idea (description = 60-char snippet or "(not yet captured)", `discoverMode: 'rawIdea'`) and Discovery interview (description = `N/12 answered` or "not started", `discoverMode: 'summary'` if any answer else `'answers'`). Provider is `Disposable`.
- `extension/src/tree/stageTreeNodes.ts` (+21) — `ArtefactNode` gained optional `description`/`iconId`/`tooltip`/`discoverMode`; `toTreeItem()` attaches `deliveryos.openDiscover` command with mode arg when `discoverMode` is set.
- `extension/src/extension.ts` (+2/−2) — passes `memoryStore` into `new StageTreeProvider(registry, memoryStore)` and pushes the provider into `context.subscriptions`.
- `extension/test/vscode-stub.ts` (+29) — minimal `EventEmitter<T>` (Set-backed; spread snapshot during fire) + `Event<T>` + `Disposable` shim.

**Spec deviation:** `onDidChangeMemory` (not `onDidChange` as chunk-05 § 9 step 19 calls it) — avoids name collision with `IProjectRegistry.onDidChange`.

**Open carries into DOS:R10:** CHUNK-05 Day 5 polish + Day 4 manual smoke (user-driven) + b001/b004 pending_review + `/tmp/` workspace cleanup + origin/main push (16 ahead after wrap).

---

## DOS:R8  (2026-05-23)

DOS:R8 was a single-focus session opened the same day as DOS:R7's wrap (back-to-back). The user picked the recommended option from a 3-option `/start-fresh` prompt: **"CHUNK-05 Day 3 (webview build)"** — the natural next slice after DOS:R7's host wiring, closing the "throws on open" gap that Day 2 left ("vite manifest missing entry"). The session ran the implementation in the order the plan called for: deps + vite config first (so `npm install` covers the new packages), then entry-point scaffold, then the four React panel components, then build + typecheck + tests.

1 substantive commit on `main` + this wrap. The session's shape was the cleanest yet: no rework, two minor type-fix iterations during the build, tests stayed at 54 passing throughout.

**Commits on `main` (1 substantive + 1 wrap):**

- `fadbb68 feat(discover): CHUNK-05 Day 3 — webview build (DOS:R8)` — the full Day 3 deliverable. 10 files: 7 new under `webview/src/panels/discover/` + `webview/vite.config.ts` updated + `webview/package.json` + `package-lock.json` for the 25 added packages. +1173/−5.

**CHUNK-05 Day 3 deliverables (file-by-file):**

- `webview/src/panels/discover/index.html` (new, 11 lines) — entry HTML mirroring `panels/hello/index.html`. Title "DeliveryOS — Discover", `#root` div, `./main.tsx` module script.
- `webview/src/panels/discover/main.tsx` (new, 9 lines) — mounts `DiscoverApp` into `#root` with the shared Tailwind import (`../../shared/styles/tailwind.css`). Throws if `#root` is missing. Mirrors `panels/hello/main.tsx`.
- `webview/src/panels/discover/DiscoverApp.tsx` (new, 169 lines) — root component. Hydrates from `messenger.sendRequest(DiscoverGetInitialState, HOST_EXTENSION, {})`, holds `{ projectTitle, rawIdea, discovery, questions, mode }` in `useState`, renders Radix `Tabs.Root` with 4 tabs (Raw Idea / Prompt / Answers / Summary). Tab gating: prompt disabled until `rawIdea?.text`; answers disabled until `promptGeneratedThisSession || discovery !== null`; summary disabled until `discovery?.answers.length > 0`. Subscribes to two notifications via `messenger.onNotification`: `DiscoverStateChanged` (merges new `rawIdea`/`discovery` into state for out-of-band updates) and `DiscoverSetMode` (switches active tab). Radix Toast provider for save/copy confirmations. Inline `TabTrigger` helper for consistent styling.
- `webview/src/panels/discover/RawIdeaInput.tsx` (new, 77 lines) — Tab 1. Project-name input + raw-idea textarea (10 rows). Save button wires `DiscoverSaveRawIdea` with `{ body, title? }`; `title` is conditionally spread (`...(trimmedTitle ? { title: trimmedTitle } : {})`) to satisfy `exactOptionalPropertyTypes: true`. Shows last-saved timestamp on success.
- `webview/src/panels/discover/DiscoveryPromptPreview.tsx` (new, 108 lines) — Tab 2. "Generate prompt" button calls `DiscoverGeneratePrompt` (passing `{}` for the `_empty?: never` params shape), shows the prompt in a `<pre>` block with `max-h-[28rem] overflow-y-auto`. Copy button calls `DiscoverCopyPrompt`; on success the parent `DiscoverApp` shows a Radix Toast. lucide-react icons (`Copy`, `RefreshCw` with spin animation while generating). `projectTitle` prop was originally on this component per the design but removed during the type-error fix pass — the host owns project context; the webview doesn't need it at this layer.
- `webview/src/panels/discover/DiscoveryAnswersInput.tsx` (new, 169 lines) — Tab 3, most complex component. Paste textarea (6 rows) + "Parse answers" button → `DiscoverParseAnswers` (no-save preview) → updates per-card state by matching parsed `answer.question` (full prompt text) to `card.question`, with a `findIndex` fallback to array position. Radix `Accordion.Root type="multiple"` renders one card per `DISCOVERY_QUESTIONS_MVP` entry (`q.id` as key, `q.topic` in trigger, `q.prompt` + `q.helperText` in content, editable textarea for the answer). Save button wires `DiscoverSaveAnswers` with `{ rawAnswersPaste, answers, unmatchedText }` — filters out blank answers before sending. lucide-react `ChevronDown` rotates via `data-[state=open]:rotate-180`.
- `webview/src/panels/discover/DiscoverySummary.tsx` (new, 57 lines) — Tab 4. Read-only render of saved `DiscoveryRecord`. Each answer shown as a card (`q.id` + `q.topic` header, full prompt as muted helper, answer as `whitespace-pre-wrap`). Empty-state placeholder when `discovery === null` or has no answers. Surfaces `unmatchedText` from the paste in a warning box if present.
- `webview/vite.config.ts` (+1 line) — added `discover: resolve(__dirname, 'src/panels/discover/index.html')` to `rollupOptions.input` alongside the existing `hello` entry. Manifest now contains both entries; `renderPanelHtml({ entry: 'discover' })` resolves cleanly post-build.
- `webview/package.json` (+6 lines) — added `@radix-ui/react-tabs` ^1.1.0 + `@radix-ui/react-accordion` ^1.2.0 + `@radix-ui/react-toast` ^1.2.0 + `@radix-ui/react-scroll-area` ^1.2.0 + `@radix-ui/react-collapsible` ^1.1.0 + `lucide-react` ^0.460.0 to `dependencies`. `package-lock.json` re-resolved at workspace root; `npm install` added 25 packages total (transitive deps included). 2 moderate severity vulnerabilities reported — pre-existing, not in any new dep, no action this session.

**Spec deviations DOS:R8 carries (flagged in commit body for the audit trail):**

- **`@radix-ui/react-form` omitted** — chunk-05 § 9 step 13 mentions it but notes "(or just native form + Radix Label)". Used native `<form>` elements / direct labels instead. No user-facing surface affected.
- **`projectTitle` prop removed from `DiscoveryPromptPreview`** — the spec sketch passes it through but the host already owns project context (the prompt is generated server-side). Removing it cleared an `unused declared variable` typecheck error without losing function.

**Type-fix iterations during the session (worth noting for next time):**

- `DiscoverSaveRawIdeaParams` field is `body`, not `text` — first attempt failed typecheck; fixed before commit.
- `DiscoverGetInitialState` and `DiscoverGeneratePrompt` params take `{}` not `undefined` (their declared type is `{ _empty?: never }`) — same fix pattern. Worth remembering for Day 4 if any new request types follow the same convention.
- `exactOptionalPropertyTypes: true` in the webview tsconfig forbids passing `string | undefined` to an optional `title?: string` field — must use conditional spread (`...(title ? { title } : {})`).

**Build artefacts confirmed:**

- `webview/dist/.vite/manifest.json` lists both `src/panels/discover/index.html` (→ `assets/discover-*.js` ~49 KB / 15 KB gzip) and `src/panels/hello/index.html` (→ `assets/hello-*.js` ~1.1 KB). Shared `messenger-*.js` chunk + CSS bundle.
- `extension/dist/extension.js` still ~147 KB (extension-side untouched).
- `extension/dist/webview/` copied from `webview/dist/` via `scripts/build.mjs`.

**Open carries-over from DOS:R7 that DOS:R8 cleared:**

- ✅ CHUNK-05 Day 3 (webview build) — landed in `fadbb68`.

**Open carries-over from DOS:R7 still standing:**

- ⏳ Smoke workspaces under `/tmp/` — still on disk; minor housekeeping (carries from DOS:R5).
- ⏳ b001 + b004 still `pending_review` in `bugs.json` — merged but not live-verified.
- ⏳ `origin/main` push — now 13 commits ahead (12 from DOS:R7 + 1 substantive from DOS:R8; will be 14 after this wrap).

**Carry-overs for DOS:R9 (next session) — ordered by what unblocks what:**

- **CHUNK-05 Day 4 — tree integration + full-loop smoke** — primary work. Extend `extension/src/tree/` (TreeDataProvider) with DISCOVER children that surface raw idea / discovery state; wire `MemoryStore.onDidChange` → `_onDidChangeTreeData.fire` so the tree refreshes when the webview saves. Tree-item clicks pass a `mode: DiscoverMode` arg to `deliveryos.openDiscover` (the command already accepts the arg per DOS:R7 wiring). Then the full loop hand-test: idea → save → generate prompt → copy → paste into Claude.ai (or any AI tool) → paste reply back → parse → save → see summary. Spec: `docs/planning/chunks/chunk-05-discover-capture.md § 9 Day 4` steps 19-22.
- **CHUNK-05 Day 5 — polish**: empty states, long-input autosize cap, markdown sanitisation in `DiscoverySummary`, README touch-up with a screenshot. § 11 risks list applies.
- **Optional**: live-verify b001 + b004 fixes by re-running `scripts/install.sh` against Antigravity 2.x + tagging a no-op release to confirm the workflow has no Node 20 deprecation annotation. If both pass, flip both bug statuses `pending_review → resolved` in `docs/build/bugs.json`.
- **`/tmp/deliveryos-smoke-r5*/` + `/tmp/release-verify-v2/` + `/tmp/v002-verify/`** cleanup — minor housekeeping; no longer needed.
- **Push commits to `origin/main`** — 13 ahead (14 after this wrap). User's call.

**Two CHUNK-03 / CHUNK-04 tripwires unchanged (chronic since DOS:R3):**

- **Multi-root workspace support.** MVP picks `workspaceFolders[0]` (CHUNK-03 § 13.6). Revisit if dogfooding hits it.
- **`SqlJsHost.flush()` debounce.** Current strategy: flush-per-mutation. Tripwire: if `MemoryStore.create()` ever exceeds 100 ms in dogfooding, drop in a debounced `scheduleFlush(250 ms)`.

**Track-O open questions** (CHUNK-03 § 13.9 + CHUNK-05's own §11 risks list). Runtime Zod validation on `payload_json` read; whether to default `memory.sqlite` to gitignored; whether the rebuild-from-markdown command earns a chunk slot. None blocking — defer to a Track-O session.

**Not done this session (deferred):**

- CHUNK-05 Day 4 + Day 5 (tree integration + smoke + polish). Sequential; Day 4 is the natural next slice.
- ESLint / Prettier wiring (chronic carry-over).
- Smoke workspaces cleanup under `/tmp/` (minor; carries from DOS:R5).
- Push to `origin/main` (carries from DOS:R7 — now 13 commits ahead).
- Live-verify b001 + b004 (optional; sequence-independent).

---

## DOS:R7  (2026-05-23)

DOS:R7 was a clean three-phase session opened the day after DOS:R6's wrap. The user picked from a 3-option `/start-fresh` prompt: **"Merge bug-fix branch + flip repo private, then CHUNK-05 Day 2"** — the recommended order, because the b004 fix in the bug-fix branch bumps `actions/checkout` + `actions/setup-node` v4 → v5 and should be on `main` before the next release tag. The session executed all three phases without rework; tests stayed at 54 passing throughout.

2 substantive commits on `main` + this wrap. The session's shape was a contrast to DOS:R5 (verification-heavy) and DOS:R6 (one-commit feature push): three discrete phases each in its own scope.

**Commits on `main` (2 substantive + 1 wrap):**

- `f41a697 Merge branch 'claude/bug-fix-20260522-142757' — b001 + b004 fixes (DOS:R7)` — no-ff merge of the 5-commit bug-fix branch carried from DOS:R5. Files touched on the merge: `.github/workflows/release.yml` (Node 22 + actions/*@v5 — b004), `README.md` (small touch-up that rode along), `docs/build/bugs.json` (b001 + b004 → `pending_review`), `scripts/install.sh` + `scripts/install.ps1` (clearer SKIP reason for Antigravity 2.x — b001). +40/−14. After merge: `git worktree remove .claude/worktrees/bug-fix-20260522-142757` + `git branch -d claude/bug-fix-20260522-142757`.
- `e9add16 feat(discover): CHUNK-05 Day 2 — host wiring + command + serializer (DOS:R7)` — the CHUNK-05 host stack on top of Day 1's pure modules. 6 files (3 new + 3 modified), +286/−1.

**Phase B — repo flipped private** (no commit; remote state change). Single `gh repo edit saifgithub/DeliveryOS --visibility=private --accept-visibility-change-consequences` call. Confirmed via `gh repo view ... --json visibility -q .visibility` returning `PRIVATE`. Side effect: the updater's unauth API call to `api.github.com/repos/saifgithub/DeliveryOS/releases/latest` now returns 404; the activation-path updater fails closed (no user-facing notification). This was code-reviewed during DOS:R5 § E and is acceptable until the repo gets a first real release. The flip was carried over from DOS:R5; DOS:R6 left it gated on b003, which had been accepted by fiat — so DOS:R7 had it unblocked from the start.

**CHUNK-05 Day 2 deliverables (file-by-file):**

- `extension/src/webview/discoverPanel.ts` (new, 59 lines) — `DISCOVER_VIEW_TYPE = 'deliveryos.discover'` + `DISCOVER_TITLE` + `openDiscoverPanel(context, host, mode?)` singleton open/focus. Module-level `pendingMode` slot: set by the open path, consumed once by `consumePendingDiscoverMode()` on the next `DiscoverGetInitialState` handler call. When an already-open panel is reopened with a mode arg, `host.broadcastDiscoverMode(mode)` fires a `discover/setMode` notification to the live webview. Mirrors `helloPanel.ts` line-for-line in structure.
- `extension/src/webview/messenger.ts` (extended, +166 LOC) — `HostMessenger.registerDiscoverHandlers(deps: DiscoverDeps)` binds the full message surface. Inline `DiscoverDeps` interface (`registry: IProjectRegistry; memoryStore: MemoryStore`). Handlers:
  - `discover/getInitialState` — reads the active intent via `MemoryStore.read`, returns `{ projectTitle, rawIdea, discovery, questions: DISCOVERY_QUESTIONS_MVP, mode }`. Falls back to an empty `{ projectTitle: '', rawIdea: null, discovery: null, ... }` shape if no active project so Day 3's webview can render an empty state.
  - `discover/saveRawIdea` — `MemoryStore.update<'intent'>(intentId, { payload: { rawIdea: { text: body, capturedAt: now } } as Partial<IntentPayload>, body, title? })`. Timestamps host-stamped (`Date.now()`) per § 9 step 9. Broadcasts `discover/stateChanged` after commit.
  - `discover/generatePrompt` — calls `buildDiscoveryPrompt({ projectTitle, rawIdea: intent.payload.rawIdea.text, questions: DISCOVERY_QUESTIONS_MVP })`, returns `{ prompt, generatedAt, questionsSnapshotIds }`.
  - `discover/copyPrompt` — `vscode.env.clipboard.writeText(params.prompt)` then `{ ok: true as const }`.
  - `discover/parseAnswers` — pure preview, no write; calls Day 1's `parseAnswers(rawPaste, DISCOVERY_QUESTIONS_MVP)`.
  - `discover/saveAnswers` — `MemoryStore.update<'intent'>(intentId, { payload: { discovery } as Partial<IntentPayload> })`. `promptSnapshot` is regenerated host-side from the current intent at save time (the save params don't carry it; keeps the snapshot canonical and host-stamped). Broadcasts `discover/stateChanged` after commit.
  - `discover/setMode` (inbound notification handler) — currently a no-op slot for the webview's tab-switch broadcasts. Future restore-after-reload flows may key off it.
  - `broadcastDiscoverMode(mode)` — sends `discover/setMode` to `BROADCAST` from `vscode-messenger-common` so any attached webview gets the new mode.
- `extension/src/serializers/discoverPanelSerializer.ts` (new, 32 lines) — `WebviewPanelSerializer` for restore-on-reload. Mirrors `helloPanelSerializer.ts`. Re-attaches host messenger and re-tracks the panel.
- `extension/src/commands/openDiscover.ts` (new, 14 lines) — registers `deliveryos.openDiscover` with an optional `mode?: DiscoverMode` arg (used later in chunk-05 § 9 step 20 by tree-item clicks).
- `extension/src/extension.ts` (+11 lines) — imports + registers the new command + serializer alongside the Hello pair. `registerDiscoverHandlers` is only called when `memoryStore` is available (no-workspace fallback leaves the command registered but handlers absent; Day 3 webview surfaces empty state).
- `extension/package.json` (+5 lines) — adds `deliveryos.openDiscover` (`title: "DeliveryOS: Open Discover"`, `category: "DeliveryOS"`) to `contributes.commands` mirroring the existing `openHello` entry.

**Spec deviations DOS:R7 carries (flagged in commit body for the audit trail):**

- **File-layout**: chunk-05 § 9 calls the host file `extension/src/panels/discover/discoverHost.ts`. Codebase puts panels under `extension/src/webview/` (`helloPanel.ts`), serializers under `extension/src/serializers/`, and commands under `extension/src/commands/`. Followed codebase convention. Public entry-point names: `openDiscoverPanel` + `registerOpenDiscover` to mirror `openHelloPanel` + `registerOpenHello`. Spec said `registerDiscover`; codebase says `registerOpen<X>`. No user-facing surface affected.
- **`DiscoveryRecord.promptSnapshot` source**: `DiscoverSaveAnswers` message params don't include `promptSnapshot`. Host regenerates it deterministically from the current intent's `rawIdea.text` + the static `DISCOVERY_QUESTIONS_MVP` at save time. Matches the "host-stamped" principle for timestamps. Alternative was to add `promptSnapshot` to `DiscoverSaveAnswersParams` — would have required a contracts change post-Day-1.
- **`renderPanelHtml({ entry: 'discover' })` throws until Day 3**: the host calls `renderPanelHtml` faithfully per spec, but no vite manifest entry exists for `discover` yet (that's Day 3 step 18). So opening the panel from the command palette currently throws "vite manifest missing entry". Day 2 verification is therefore typecheck + tests + build green + command/serializer registered — not a live UI smoke. Day 3 will close the loop by adding the manifest entry.

**Notable behavioural changes from this session (not commits):**

- Repo visibility is now **PRIVATE** for the first time since DOS:R5 Phase E. Knock-on: the updater's `api.github.com/repos/saifgithub/DeliveryOS/releases/latest` call returns 404 to unauth clients; the activation-path updater fails closed silently. This is the intended behaviour and was code-reviewed during DOS:R5 § E.

**Open carries-over from DOS:R5/R6 that DOS:R7 cleared:**

- ✅ Bug-fix branch merged (`f41a697`); worktree + branch deleted.
- ✅ Repo flipped private (`gh repo edit ...`).
- ⏳ Smoke workspaces under `/tmp/` — still on disk; minor housekeeping.
- ⏳ Antigravity sideload — still GUI-only on 2.x; b001 fix is now on `main` so `install.sh` surfaces the clearer SKIP message but doesn't change the underlying constraint.

**Carry-overs for DOS:R8 (next session) — ordered by what unblocks what:**

- **CHUNK-05 Day 3 — webview build** — primary work. Add `webview/src/panels/discover/{index.html,main.tsx,DiscoverApp.tsx}` mounting a Radix `Tabs.Root` with four tabs; install `@radix-ui/react-{tabs,accordion,toast,scroll-area,collapsible}` + `lucide-react` into `webview/package.json` and run `npm install` at workspace root. Build `RawIdeaInput.tsx` + `DiscoveryPromptPreview.tsx` + `DiscoveryAnswersInput.tsx` + `DiscoverySummary.tsx`. Add the `panels/discover` entry to `webview/vite.config.ts` so the manifest contains it. Day 3 spec: `docs/planning/chunks/chunk-05-discover-capture.md § 9 Day 3` steps 12-18.
- **CHUNK-05 Day 4 — tree integration + smoke**: extend the TreeDataProvider with DISCOVER children; wire `MemoryStore.onDidChange` → `_onDidChangeTreeData.fire`; tree-item clicks pass a `mode` arg to `deliveryos.openDiscover`. Hand-test the full loop (idea → save → generate prompt → copy → paste into Claude.ai → paste reply back → save → see summary).
- **CHUNK-05 Day 5 — polish**: empty states, long-input autosize cap, markdown sanitisation in `DiscoverySummary`, README touch-up with a screenshot.
- **`/tmp/deliveryos-smoke-r5*/` + `/tmp/release-verify-v2/` + `/tmp/v002-verify/`** cleanup — minor housekeeping; no longer needed.
- **Optional**: live-verify b001 + b004 fixes (now merged on `main`) by re-running the install script against Antigravity 2.x and tagging a no-op release to confirm the workflow has no Node 20 annotation. If both pass, flip the two bug statuses `pending_review → resolved` in `bugs.json`.
- **Push commits to `origin/main`** — currently 11 commits ahead (will be 12 after this wrap). User's call whether to push during DOS:R7 wrap or leave for DOS:R8 open.

**Two CHUNK-03 / CHUNK-04 tripwires unchanged (chronic since DOS:R3):**

- **Multi-root workspace support.** MVP picks `workspaceFolders[0]` (CHUNK-03 § 13.6). Revisit if dogfooding hits it.
- **`SqlJsHost.flush()` debounce.** Current strategy: flush-per-mutation. Tripwire: if `MemoryStore.create()` ever exceeds 100 ms in dogfooding, drop in a debounced `scheduleFlush(250 ms)`.

**Track-O open questions** (CHUNK-03 § 13.9 + CHUNK-05's own §11 risks list). Runtime Zod validation on `payload_json` read; whether to default `memory.sqlite` to gitignored; whether the rebuild-from-markdown command earns a chunk slot. None blocking — defer to a Track-O session.

**Not done this session (deferred):**

- CHUNK-05 Day 3-5 (webview build, tree integration, polish). Sequential; Day 3 is the natural next slice.
- ESLint / Prettier wiring (chronic carry-over).
- Smoke workspaces cleanup under `/tmp/` (minor; carries from DOS:R5).
- Push to `origin/main` (carries to DOS:R8 unless the user pushes between sessions).

---

## DOS:R6  (2026-05-22)

DOS:R6 was a back-to-back same-day session opened immediately after DOS:R5's wrap, when the user asked "what's blocking CHUNK-04 from being completely done?" — saw the two remaining items were user-UI verification walks (b002 Cursor smoke + b003 Phase E live walk), then said "assume that they are fine and it has been tested for VSC and Antigravity. So let's move with chunk 5." That call closed CHUNK-04 by fiat (both bugs stay `open` in `docs/build/bugs.json` for the record but no longer block scheduling) and unlocked CHUNK-05 work.

2 substantive commits on `main` + this wrap. The session's shape was unusual in the opposite direction from DOS:R5: less verification, more building. CHUNK-05 is a 4-5-session-day chunk per the spec; this session landed Day 1 (pure-module foundation) cleanly, leaving Day 2-5 as the natural next slices.

**Commits on `main` (2 substantive + 1 wrap):**

- `296f156 docs(chunks): mark CHUNK-04 formally closed (DOS:R6)` — BUILD-PLAN.md Week 2 row → ✅; BUILD_STATUS.md "open chunk" row → CHUNK-05. Documents the user's "accept b002 + b003 as passing-by-assumption" call inline.
- `e2d481f feat(discover): CHUNK-05 Day 1 — contracts + question library + prompt builder + answers parser (DOS:R6)` — the pure-module foundation for the Discovery interview workspace. 5 new modules + 2 new test files; +568 insertions. Tests went 38 → 54 passing.

**CHUNK-05 Day 1 deliverables (file-by-file):**

- `contracts/src/discover.ts` (new, 139 lines) — panel-local view models (`RawIdeaView`, `DiscoveryAnswerInput`, `DiscoveryDraft`, `DiscoveryQuestion`, `DiscoverMode`) + 8 message constants (6 `RequestType` + 2 `NotificationType`). Imports the canonical persisted shapes (`RawIdea`, `DiscoveryRecord`, `DiscoveryAnswer`) from `./memory` — does NOT redeclare them per the cross-chunk-contract rule (CHUNK-03 owns those, M15 validation report).
- `contracts/src/index.ts` — re-export `./discover` from the barrel (flat, not namespaced, per the chunk-05 spec's directive). Existing `panels/hello` stays namespaced; `discover.ts` lives at the contracts root level.
- `extension/src/discovery/questionLibrary.ts` (new, 78 lines) — `DISCOVERY_QUESTIONS_MVP` const array of 12 hand-curated questions: Q1 problem, Q2 scope, Q3 users, Q4 data, Q5 regulated-industry, Q6 surface, Q7 integrations, Q8 performance-scale, Q9 success-criteria, Q10 constraints, Q11 risks-unknowns, Q12 release-shape (chunk-05 § 4 verbatim). Each entry: `id`, `topic`, `prompt`, optional `helperText`.
- `extension/src/discovery/promptBuilder.ts` (new, 55 lines) — `buildDiscoveryPrompt({ projectTitle, rawIdea, questions })` returns the markdown template (chunk-05 § 6 verbatim) with the Role / Objective / Project Context / Your Task / Output Format / Rules shape. Pure function; no vscode dependency. Question headings use `### Q<n>.` so the parser keys on the same shape.
- `extension/src/discovery/answersParser.ts` (new, 79 lines) — `parseAnswers(rawPaste, questions): { answers, unmatchedText }`. Heuristic 3-pattern matcher: `### Q<n>.` (preferred), `**Q<n>**` (bold fallback), `Q<n>.` (plain fallback). Patterns consume the full heading line so captured body excludes the question prompt. Preamble before the first heading + any unknown-id `Q<n>` markers route to `unmatchedText` for hand-allocation. Pure function.
- `extension/test/promptBuilder.test.ts` (new, 86 lines) — 7 tests across 2 suites: `buildDiscoveryPrompt` (interpolation; all-12-headings + ordering; helper-text italics; empty raw-idea; output-format count adapts to questions array length) + `DISCOVERY_QUESTIONS_MVP` shape (exactly 12 entries; unique ids Q1-Q12).
- `extension/test/answersParser.test.ts` (new, 130 lines) — 9 tests across 3 suites: happy path (`### Q<n>.` parses, all 12 captured) + fallback markers (`**Q<n>**`, plain `Q<n>.`) + edge cases (empty paste, no markers → full paste to unmatched, preamble capture, unknown id Q99 routed to unmatched, markdown preservation in bodies). One regex bug caught + fixed in-flight: original pattern only matched `### Q1. ` (the prefix), leaving the question text inside the captured body — extended pattern to consume the full heading line.

**Spec deviations DOS:R6 carries (flagged in the commit body, documented here for the audit trail):**

- **Message-constant form**: spec sketched `new RequestType<P, R>('discover.getInitialState')`, but `vscode-messenger-common`'s `RequestType<P, R>` is a TYPE ALIAS `{ method: string }`, not a class. Used the object-literal form matching the existing `panels/hello.ts` convention.
- **Method-string format**: spec consistently said `discover.<verb>` (dot), but the existing codebase uses `<panel>/<verb>` (slash, e.g. `hello/getHelloText`). Picked the codebase convention. Internal channel ID only; no user-facing impact.
- **No `IntentPayload` migration**: CHUNK-03 (DOS:R3) already added `rawIdea: RawIdea` and `discovery: DiscoveryRecord | null` to `IntentPayload` in anticipation of CHUNK-05. No schema bump, no migration runner change. Day 1 step 2 of the chunk-05 outline was a no-op.

**Open carries-over from DOS:R5 (UNCHANGED in DOS:R6 — none of these were touched):**

- **Bug-fix branch `claude/bug-fix-20260522-142757` STILL UNMERGED.** 5 commits with b001 + b004 fixes `pending_review`. User explicitly asked to "move forward" with CHUNK-05 rather than reviewing the branch first.
- **Repo STILL PUBLIC.** Was flipped from private during DOS:R5 Phase E for the unauthenticated API access. User wants private "until first real release"; the flip-back is gated on whether the Phase E live walk (b003) ever actually happens. Since b003 is now accepted as passing-by-assumption, the user could in principle flip private immediately.
- **Antigravity stuck at v0.0.4** (the 1.107.0-era install). Antigravity 2.x dropped the CLI so `install.sh` can't replace it — install.ps1/install.sh now surface the clearer SKIP reason after b001 merges (the diagnostic is on the unmerged bug-fix branch).
- **Smoke workspaces still on disk** at `/tmp/deliveryos-smoke-r5/` + `/tmp/deliveryos-smoke-r5-cursor/` + `/tmp/release-verify-v2/`. Can be deleted now (b002 + b003 were accepted by user fiat so the smoke workspaces aren't needed for follow-up walks).

**Carry-overs for DOS:R7 (next session) — ordered by what unblocks what:**

- **Merge the bug-fix branch** (UNCHANGED from DOS:R5's carry-over list). `git merge --no-ff claude/bug-fix-20260522-142757 && git worktree remove .claude/worktrees/bug-fix-20260522-142757 && git branch -d claude/bug-fix-20260522-142757`. Fixes b001 + b004. Small commits; review-easy.
- **Flip repo back to private** (carries from DOS:R5). `gh repo edit saifgithub/DeliveryOS --visibility=private`. No longer gated on anything — b003 was accepted as passing-by-assumption.
- **CHUNK-05 Day 2 (host wiring)** — primary next-session work. `extension/src/panels/discover/discoverHost.ts`: `registerDiscover(context, deps)` exporting a `vscode.Disposable`, internal `DiscoverPanel` singleton class, every messenger handler from `contracts/src/discover.ts` wired, `vscode.env.clipboard.writeText` for `DiscoverCopyPrompt`, `MemoryStore.update(intentId, payload)` calls in `DiscoverSaveRawIdea` + `DiscoverSaveAnswers` (host-stamped timestamps), `WebviewPanelSerializer` for restore-on-reload, `deliveryos.openDiscover` command registered in both `extension/src/extension.ts` and `extension/package.json#contributes.commands`. Day 2 spec is in `docs/planning/chunks/chunk-05-discover-capture.md § 9 Day 2`.
- **CHUNK-05 Day 3-5** sequential after Day 2: webview build (5 React components + Radix dep install + vite config entry); tree integration + end-to-end smoke; polish (empty states, long-input handling, markdown sanitisation, README touch-up).

**Two CHUNK-03 / CHUNK-04 tripwires unchanged (5th carry from DOS:R3):**

- **Multi-root workspace support.** MVP picks `workspaceFolders[0]` (CHUNK-03 § 13.6). Revisit if dogfooding hits it.
- **`SqlJsHost.flush()` debounce.** Current strategy: flush-per-mutation. Tripwire: if `MemoryStore.create()` ever exceeds 100 ms in dogfooding, drop in a debounced `scheduleFlush(250 ms)`.

**Track-O open questions** (CHUNK-03 § 13.9 + CHUNK-05's own §11 risks list now). Runtime Zod validation on `payload_json` read; whether to default `memory.sqlite` to gitignored; whether the rebuild-from-markdown command earns a chunk slot. None blocking — defer to a Track-O session.

**Not done this session (deferred):**

- CHUNK-05 Day 2-5 (host wiring, webview build, tree integration, polish). Sequential; Day 2 is the natural next slice.
- ESLint / Prettier wiring (chronic carry-over).
- Bug-fix branch merge (chronic carry-over from DOS:R5).
- Repo private flip (chronic carry-over from DOS:R5).

---

## DOS:R5  (2026-05-22)

DOS:R5 carried CHUNK-04 from "code-complete" toward "formally closed" by walking the verification carry-overs DOS:R4 deferred. 4 substantive commits on `main` + this wrap commit. CHUNK-04 done-when is now **substantively met** — 2 of 3 verification deliverables fully closed and the third blocked only on user UI walk-throughs (filed as bugs b002 + b003). Also surfaced + filed 2 unrelated bugs (b001 Antigravity 2.x CLI removed mid-session, b004 Node 20 deprecation) which are fixed `pending_review` on an unmerged bug-fix branch.

The session had an unusual shape compared to typical R sessions: more verification than coding, and more "surface a new bug and route it" than "implement a chunk". The user stepped away mid-Phase E (after explicitly telling me to keep moving rather than wait), so the live UI walk for the upgrade-notification e2e becomes the next session's first task. *[2026-05-22 DOS:R6 update: CHUNK-04 marked formally closed at start of R6 by user call; b002 + b003 accepted as passing-by-assumption.]*

**Plan-mode phases (the 5 alphabetised steps the entry plan organised the work around):**

- **Phase A** — GitHub owner locked to **`saifgithub/DeliveryOS`**. Found 7 occurrences across **4 files** (DOS:R4's handover named only 3): `README.md` × 3 (curl one-liner + iwr one-liner + manual-install latest-release link), `RELEASE_NOTES.md` × 1 (curl one-liner), `extension/package.json` × 2 (`repository.url` AND the walkthrough welcome message that links to `/readme`), `docs/planning/chunks/chunk-01-scaffold.md` × 1 (spec source for the walkthrough — updated so a future re-implementation doesn't reintroduce the old coordinate). Casing follows what the user typed (`saifgithub/DeliveryOS` with capital D/O/S). GitHub URL path resolution is case-insensitive so the actual canonical display follows whatever the repo is created with. The `gh repo create` + push happened mid-Phase D below.
- **Phase B** — **Cursor installed** via `brew install --cask cursor` (3.5.17). App lands at `/Applications/Cursor.app`; binary symlink at `/opt/homebrew/bin/cursor` (brew's standard cask layout). `install.sh` probe finds it.
- **Phase C** — § 11.5 cross-editor smoke. Walked the 8-sub-check Phase 0 rehearsal in **VS Code + Antigravity** (both fresh `/tmp/deliveryos-smoke-r5-*/` workspaces): activity-bar icon ✅ · stage tree order ✅ · `deliveryos.project.create` ✅ · welcome view disappears ✅ · `deliveryos.openHello` zero CSP errors ✅ · `.deliveryos/memory.sqlite` + `intent-<8hex>.md` materialise ✅ · close-reopen restores ✅ · sig-warn observation: no warning on either editor. Cursor was deferred at the user's call — they hadn't signed up for Cursor and didn't want to do it mid-session = bug b002 (status `open`).
- **Phase D** — § 11.3 release-flow verification. First `v0.0.1` tag push exposed **three bugs** in the release pipeline, all fixed and verified before re-tagging:
  - The workflow ran `npx --no-install @vscode/vsce package` directly, bypassing the npm `prepackage` lifecycle that copies `LICENSE` + `README.md` into the extension/ workspace before vsce packs. Result: the v0.0.1 .vsix was missing `extension/LICENSE.txt` + `extension/readme.md`, and the workflow emitted the `LICENSE, LICENSE.md, or LICENSE.txt not found` annotation. **Fix: call `npm -w deliveryos run package` so the prepackage hook fires.**
  - The `sha256sum` step in the workflow wrote SHA256SUMS.txt with paths `scripts/install.sh` and `scripts/install.ps1` (the relative paths the workflow saw at the repo root). But the release page uploads them as bare `install.sh` / `install.ps1` at the same level as SHA256SUMS.txt. Result: `shasum -a 256 -c SHA256SUMS.txt` from the user's downloads dir failed for both scripts ("No such file or directory"). **Fix: compute the script hashes from inside `scripts/` (subshell `cd scripts && sha256sum install.sh install.ps1 >> ...`) so the recorded paths are basenames.**
  - `extension/package.json#version` was still `0.0.4` from DOS:R4 (the bump for the new `checkForUpdates` setting). vsce uses package.json's version for the internal manifest, not the `--out` filename. So the first v0.0.1 release's .vsix internally claimed version 0.0.4. This would have broken Phase E's e2e entirely: `isNewer("0.0.2", "0.0.4") = false`, no notification fires. **Fix: align `extension/package.json#version` to `0.0.1` before tagging.** (Then bumped to 0.0.2 in Phase E for the upgrade test.)
  - First v0.0.1 release was deleted (`gh release delete v0.0.1` + tag delete) and retagged after the fixes. Second workflow run green in 37s. Release page now has all 4 assets (`.vsix` 415 KB + `install.sh` + `install.ps1` + `SHA256SUMS.txt` 243 bytes); local `shasum -c` returns OK for all three; internal version 0.0.1 matches the tag.
- **Phase E** — § 11.4 upgrade-notification e2e. Bumped to v0.0.2, committed, tagged, pushed. Workflow ✅ in 34s; release verified clean. **Repo was flipped public** (`gh repo edit --visibility=public --accept-visibility-change-consequences`) because the updater hits `api.github.com/repos/.../releases/latest` unauthenticated and private repos return 404. The flip happened only after explicit user authorisation in chat — the auto-mode classifier blocked the action when invoked from an AskUserQuestion response. Code-reviewed `extension/src/updater/checkForUpdates.ts`: `Open release page` action calls `vscode.env.openExternal(vscode.Uri.parse(latest.html_url))`; `Don't show again` calls `getConfiguration('deliveryos').update('checkForUpdates', false, Global)`; both branches update `lastSeenReleaseTag` even if the user dismisses without clicking (so any reset for Walk 2 requires uninstall + reinstall to clear globalState). The actual live walkthrough (reload window → observe notification → click Open release page → reload again to confirm suppression → reset state → reload → click Don't show again → verify setting flips) was deferred when the user stepped away = bug b003 (status `open`).

**Commits on `main` (4 substantive + 1 wrap):**

- `218b5a4 chore(release): lock GH owner to saifgithub/DeliveryOS — § A (DOS:R5)` — the 7-occurrence rewrite across the 4 files described in Phase A above. Tests 38 ✅, typecheck ✅, vsix rebuilt to 405 KB (was 404 KB — string-length diff).
- `b641d0d fix(release): repair v0.0.1 — version + LICENSE + SHA256SUMS paths — § D (DOS:R5)` — the three Phase D bug fixes bundled. `.github/workflows/release.yml` + `extension/package.json#version` 0.0.4 → 0.0.1.
- `1e54cdf chore(release): bump to 0.0.2 for upgrade-notification e2e — § E (DOS:R5)` — version-only bump for the Phase E e2e setup. `extension/package.json#version` 0.0.1 → 0.0.2.
- `df62205 chore(bugs): file 4 bugs discovered during DOS:R5 CHUNK-04 close-out` — bugs b001-b004 written to `docs/build/bugs.json`. Was empty (0 bugs) before.

**Bug-fix worktree on `claude/bug-fix-20260522-142757` (UNMERGED, 5 commits):**

- `de44ceb chore(bugs): claim b001, b004 for claude/bug-fix-20260522-142757` — pre-fix claim per the bug-fix protocol.
- `554239e fix(bug:b004): bump release workflow to Node 22 + actions/*@v5` — `.github/workflows/release.yml`: `actions/checkout` + `actions/setup-node` @v4 → @v5; `node-version` 20 → 22 (LTS). Clears the Node 20 deprecation annotation that's been on every workflow run.
- `15ba3d0 chore(bugs): b004 pending_review` — bugs.json status flip + `fixed_commit` set.
- `a34a5a7 fix(bug:b001): surface clearer SKIP reason when Antigravity 2.x is installed without a CLI` — `scripts/install.sh` + `scripts/install.ps1` + `README.md`. When the `command -v antigravity` probe fails AND `/Applications/Antigravity.app` exists (or `%LOCALAPPDATA%\Programs\Antigravity\Antigravity.exe` on Windows), surfaces `SKIP (Antigravity 2.x — CLI removed; install manually via app UI)` instead of the generic `not on PATH`. README troubleshooting block updated with the GUI sideload path. Live-verified — the new reason fires on this machine. A programmatic fallback (unzip vsix into `~/.antigravity/extensions/`) was considered but deferred — introduces a design call about CLI-less editor support that's out of scope for a diagnostic fix.
- `ae44641 chore(bugs): b001 pending_review` — status flip + `fixed_commit` set.

Merge command (when reviewing): `git merge --no-ff claude/bug-fix-20260522-142757 && git worktree remove .claude/worktrees/bug-fix-20260522-142757 && git branch -d claude/bug-fix-20260522-142757`.

**Surprising data points worth flagging for the next session:**

- **Antigravity auto-updated mid-session** from 1.107.0 → 2.0.1. The 2.0 bundle restructure removed the `antigravity` CLI binary entirely. The path `/Contents/Resources/app/bin/` no longer exists; new `/Contents/Resources/bin/` contains only `language_server` + `webm_encoder`. The 0.0.4 extension files from DOS:R4's CLI-installed version are still on disk at `~/.antigravity/extensions/deliveryos.deliveryos-0.0.4/`, but `install.sh` can't replace them anymore — Antigravity 2.x is now GUI-sideload-only. DOS:R4's handover noted Antigravity as "the standard Code-OSS layout" data point, which was true for 1.x but no longer.
- **`.claude/active-track` was reset to `P`** between this session's start and end. `/start-fresh R` at the top of the session wrote `R`; by `/handover` time the file contained `P` again. The wrap script protocol resolved the right track from the session's commit messages (all tagged DOS:R5) rather than the file. Possibly a macOS file-system quirk or the file was reverted by a parallel process. **Not blocking, but worth watching:** if it happens again, the wrap script will need to surface the resolution earlier.
- **Repo is PUBLIC right now.** User wanted private "until first real release"; flipped public mid-session for Phase E's unauthenticated API access. Needs `gh repo edit saifgithub/DeliveryOS --visibility=private` after the user completes the Phase E walk.

**Spec deviations DOS:R5 carries:**

- **No "Antigravity GUI sideload" fallback in `install.sh`.** b001 fix is diagnostic (clearer SKIP reason); the proper fix would unzip the .vsix into `~/.antigravity/extensions/<id>-<version>/`. Deferred because it introduces a design call about whether to add CLI-less fallback for all editors. Revisit if Antigravity becomes a dogfooding target.
- **No `scripts/check-vsix-size.js` tripwire.** Unchanged from DOS:R3/R4. vsix lands at 415 KB now (was 404 KB) — still well under 5 MB budget.
- **No `deliveryos.openHello` `when`-clause hide.** Unchanged from DOS:R3/R4. Command stays visible.

**Carry-overs for DOS:R6 (next session) — ordered by what unblocks what:**

- **Merge the bug-fix branch.** `git merge --no-ff claude/bug-fix-20260522-142757`. Two fixes: b001 (better Antigravity diagnostic) + b004 (Node 22 + actions @v5). Review the 5 commits; they're small. Cleanup: `git worktree remove .claude/worktrees/bug-fix-20260522-142757 && git branch -d claude/bug-fix-20260522-142757`.
- **Walk Phase E live UI checks (= bug b003).** *[DOS:R6 status: accepted as passing-by-assumption at user call. b003 remains `open` in bugs.json but no longer blocks scheduling.]*
- **Walk Cursor § 11.5 smoke (= bug b002).** *[DOS:R6 status: accepted as passing-by-assumption at user call. b002 remains `open` in bugs.json but no longer blocks scheduling.]*
- **Flip repo back to private.** `gh repo edit saifgithub/DeliveryOS --visibility=private` once b003 walk completes (the API access only needs to be public during the walk).
- **Mark CHUNK-04 formally closed** in the BUILD-PLAN ✅ and the open-chunk row in this table. Then start CHUNK-05.  *[DOS:R6 status: DONE — commit 296f156.]*
- **Two CHUNK-03 / CHUNK-04 tripwires unchanged from DOS:R3/R4:**
  - **Multi-root workspace support.** MVP picks `workspaceFolders[0]` (CHUNK-03 § 13.6). Revisit if dogfooding hits it.
  - **`SqlJsHost.flush()` debounce.** Current strategy: flush-per-mutation. Tripwire: if `MemoryStore.create()` ever exceeds 100 ms in dogfooding, drop in a debounced `scheduleFlush(250 ms)`.
- **Track-O open questions (CHUNK-03 § 13.9).** Runtime Zod validation on `payload_json` read; whether to default `memory.sqlite` to gitignored; whether the rebuild-from-markdown command earns a chunk slot. None blocking — defer to a Track-O session.

**Not done this session (deferred):**

- CHUNK-04 formal closure (depends on b002 + b003).  *[DOS:R6: closed by user fiat.]*
- CHUNK-05 onwards (sequential after CHUNK-04 formally closes).  *[DOS:R6: Day 1 landed.]*
- ESLint / Prettier wiring.

---

## DOS:R4  (2026-05-22)

DOS:R4 landed **CHUNK-04 code-complete** plus the two pending **CHUNK-02 § 10.2 webview unit tests**. 5 substantive commits + this wrap commit. CHUNK-04 done-when is partially met — code-side checkboxes are ticked but the manual cross-editor smoke and the release-tagging verification (§ 11.3 + § 11.4) defer to DOS:R5 per the session-entry user call.

**CHUNK-02 § 10.2 webview tests (1 commit):**

- `a358c72 test(webview): nonce.test.ts + htmlFactory.test.ts — CHUNK-02 § 10.2 (DOS:R4)`
  - `extension/test/nonce.test.ts` — 2 tests: 32-char base64url shape + 100-call uniqueness.
  - `extension/test/htmlFactory.test.ts` — 3 tests: full HTML render (title + css link + script tag with 32-char nonce + CSP meta with `script-src 'nonce-...'` + `default-src 'none'` + configurable cspSource); two-call different-nonce assertion; missing-entry path throws the expected vite-manifest error message.
  - `extension/src/webview/htmlFactory.ts` — added a tiny `__resetManifestCache()` test-only helper (5 lines, no runtime cost; `__` prefix discourages accidental call from production code). Lets successive test calls each exercise a fresh manifest load + fresh nonce.
  - `extension/test/vscode-stub.ts` — extended with a `Webview` interface + `__makeStubWebview()` factory (mirrors the existing `__resetVscodeStub` helper pattern).
  - `extension/test/htmlFactory.test.ts` materialises a real `dist/webview/.vite/manifest.json` under `os.tmpdir()` because `renderPanelHtml` reads the manifest via `node:fs/promises.readFile(manifestUri.fsPath)`, not via the vscode workspace.fs surface that the stub covers.
  - **Spec deviation** flagged in commit: instead of widening `test/tsconfig.json#include` to add `../src/webview/**` as the chunk-03 carry-over note suggested, the new test files' imports drag in the webview source naturally — keeps the stub surface minimal (no ViewColumn / window / WebviewPanel needed).
  - **Pre-existing typecheck regression fixed in the same edit:** `test/tsconfig.json#rootDir` was `..` (extension/) which excluded `contracts/src/*` and made `npm run typecheck` fail with TS6059 on DOS:R3's HEAD. Widened to `../..` (monorepo root). `npm test` was unaffected (tsx ignores rootDir for execution).

**CHUNK-04 (4 commits, in spec § 3 order):**

- `32e17dd feat(install): cross-platform install scripts — CHUNK-04 § 3.1-3.2 (DOS:R4)`
  - `scripts/install.sh` (POSIX shell, `set -eu`, ShellCheck-friendly) + `scripts/install.ps1` (PowerShell 5.1+ / 7+) sideload the highest-versioned `deliveryos-*.vsix` into every detected editor CLI in `{code, cursor, windsurf, codium, antigravity}`. Both always pass `--force` so re-runs are idempotent; both support `--verbose`; both fall back to looking inside `extension/` for the .vsix when the repo root doesn't have one (dev layout).
  - Exit codes per § 4.3: 0 = at least one OK (or zero detected: warning only); 1 = every detected editor failed; 2 = bad `<path-to-vsix>` arg.
  - Summary block per § 4.5 — one row per editor with status + version.
  - **Local verification on macOS:** bad-path arg → exit 2; no editors on PATH → exit 0 + warning; `code` + `antigravity` on PATH (transient PATH extension) → both install successfully; idempotent re-run reports identical OK/OK rows; unknown flag → exit 2 + usage; `--help` → usage + exit 0.
  - **Surprising data point for CHUNK-04 § 12.1:** Antigravity's CLI is at the standard `/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity` path (not unknown as the spec worried). *[2026-05-22 DOS:R5 update: this was true for Antigravity 1.107.0 but the 2.0.1 bundle restructure removed the CLI entirely — see bug b001.]*

- `57e6872 ci(release): GitHub Actions release workflow — CHUNK-04 § 3.3 (DOS:R4)`
  - `.github/workflows/release.yml` triggers on `v*` tag push: checkout → setup-node@v4 (Node 20, npm cache) → `npm ci` → `npm run build` → `vsce package --no-dependencies --out ../deliveryos-<version>.vsix` from `extension/` → `sha256sum` over `{vsix, install.sh, install.ps1, demo.mp4?}` → pre-flight RELEASE_NOTES.md check (generates a one-line default if missing) → `gh release create $TAG <all assets> --notes-file RELEASE_NOTES.md` (permissions: `contents: write`).
  - `RELEASE_NOTES.md` lands as a Phase-0 stub per § 15 done-when fallback (v0.0.1 paragraph + curl one-liner + `shasum -a 256 -c SHA256SUMS.txt`). CHUNK-16 expands for v0.1.0.
  - Workflow is **NOT exercised this session** — its acceptance test (§ 11.3) is the v0.0.1 tag push deferred to DOS:R5.

- `e7ff6c4 feat(updater): GitHub Releases version check — CHUNK-04 § 3.4-3.7 (DOS:R4)`
  - `extension/src/updater/types.ts` — `LatestReleaseResponse`, `UpdateCheckResult`, `UpdateAction`. Types-only.
  - `extension/src/updater/helpers.ts` — `parseOwnerRepo(url)`, `isNewer(latest, current)`, + internal `parseSemver`. Pure functions; **extracted from `checkForUpdates.ts` so unit tests don't drag the full vscode-using module into the test typecheck graph** (the test-time stub doesn't cover `window`, `env`, `ConfigurationTarget`, `Uri.parse`, `globalState`, `extension.packageJSON`; keeping the helpers separate dodges the stub expansion).
  - `extension/src/updater/checkForUpdates.ts` — single fire-and-forget `Promise<void>` call from `activate()`. Reads `deliveryos.checkForUpdates` (early-return if false), parses `repository.url`, fetches `api.github.com/repos/<owner>/<repo>/releases/latest` with Accept + X-GitHub-Api-Version + User-Agent headers, `redirect: 'follow'`, 5-second `AbortController` timeout. Any non-200, parse failure, or thrown error is silent no-op per § 6.6. On a newer tag: `showInformationMessage` with two actions; "Open release page" → `env.openExternal`; "Don't show again" → `getConfiguration.update(..., Global)`. Persists `globalState['deliveryos.lastSeenReleaseTag']` so the same upgrade doesn't re-prompt across activations until a yet-newer release exists.
  - `extension/package.json` — version `0.0.3 → 0.0.4` (new user-facing setting + new fire-and-forget network call on activation). Adds `contributes.configuration.deliveryos.checkForUpdates` (boolean, default true).
  - `extension/src/extension.ts` — imports `checkForUpdates` and calls `void checkForUpdates(context)` as the last line of `activate()`, after all registrations + the `onDidChangeWorkspaceFolders` listener. Never awaited.
  - `extension/test/updater.test.ts` — 10 unit tests across two suites (parseOwnerRepo: 4 cases; isNewer: 6 cases — patch/minor/major/equal/pre-release/missing-parts). **38 tests passing now**, up from 28 after CHUNK-02 § 10.2.

- `577b577 docs(readme): install section — CHUNK-04 § 3.8 / § 9 (DOS:R4)`
  - `README.md` — new top-level `## Install` section between `## Delivery` and `## Repo layout` per chunk-04 § 9 (verbatim). Includes: curl-pipe-to-sh + iwr-pipe-to-iex one-liners; manual `--install-extension --force` matrix for all five editors; SHA-256 verification block; "Why SHA-256?" framing (research finding #3); updates subsection pointing at `deliveryos.checkForUpdates`; troubleshooting block (CLI not on PATH, activity-bar reload, Antigravity standard path, GitHub rate-limit).
  - GH coordinate hardcoded as `deliveryos/deliveryos` to match `extension/package.json#repository.url`. **DOS:R5 confirms or rewrites mechanically** once the GitHub owner is locked in — three files would need the same rename: this `## Install` section, `RELEASE_NOTES.md`, and `extension/package.json#repository.url`. *[2026-05-22 DOS:R5 update: locked to `saifgithub/DeliveryOS`; 7 occurrences updated across 4 files (the 4th was the walkthrough welcome message in `extension/package.json` line 64 + the spec source at `docs/planning/chunks/chunk-01-scaffold.md` line 328 — DOS:R4 named only 3 files).]*
  - Two adjacent doc-hygiene fixes in the same commit: bumped the "Getting started" example from `deliveryos-0.0.2.vsix` → `deliveryos-0.0.4.vsix`; rewrote the stale "Known limitations" note that promised `deliveryos.openHello` would be hidden behind `deliveryos.devMode` in CHUNK-04 — the chunk spec doesn't include that change, so the note now correctly says the deferral lands after Phase 0.

**Spec deviations from the chunk-04 spec that DOS:R4 ships but didn't:**

- **No `scripts/check-vsix-size.js`.** The DOS:R3 BUILD_STATUS carry-over note suggested this as a CI tripwire ("fail if `.vsix > 5 MB`"). The chunk-04 spec itself doesn't include it — and the 0.0.4 vsix lands at 404 KB, well under budget. Defer until a chunk genuinely needs it.
- **No `deliveryos.openHello` `when`-clause hide.** Same situation: DOS:R3 BUILD_STATUS promised it, chunk-04 spec doesn't. The command stays visible. Hiding it deserves its own chunk slot once it actually matters.

**Local pre-flight done for DOS:R5's manual smoke:**

DOS:R4 installed `deliveryos-0.0.4.vsix` into VS Code AND Antigravity locally via `scripts/install.sh`. Both report `deliveryos.deliveryos@0.0.4` in `--list-extensions --show-versions`. Cursor is NOT installed at `/Applications/Cursor.app` on this dev box — **DOS:R5's first task is to install Cursor (or locate where it lives on this machine) before walking the chunk-04 § 11.5 rehearsal checklist**.

**Carry-overs for DOS:R5 (next session):**

- **CHUNK-04 § 11.5 manual cross-editor smoke.** Walk the 8-sub-check Phase 0 rehearsal checklist in VS Code (REQUIRED) + Cursor (REQUIRED) + Antigravity. Activity-bar icon · stage tree order · `deliveryos.project.create` · welcome-view disappears · `deliveryos.openHello` zero CSP errors · `.deliveryos/memory.sqlite` + intent body materialise · close-reopen restores · sig-warn observation row. Use a fresh `/tmp/deliveryos-smoke-r4-final/` workspace.
- **CHUNK-04 § 11.3 release-flow verification.** `git tag v0.0.1 && git push origin v0.0.1`. Watch `.github/workflows/release.yml` run in the Actions tab. Verify the release page has the `.vsix` + install scripts + `SHA256SUMS.txt`. `shasum -a 256 -c SHA256SUMS.txt` locally to confirm.
- **CHUNK-04 § 11.4 in-extension version-check e2e.** After v0.0.1 ships, tag `v0.0.2` (version bump only, no code changes) → push → wait for workflow. The v0.0.1 install in any of the smoked editors should fire the notification on next activation. Click "Open release page" — opens the right URL. "Don't show again" → setting flips to false. Reload window → no notification. Reset setting back to true → no notification for same version.
- **GitHub owner finalisation.** Lock in `deliveryos/deliveryos` vs swap to `saifulmazli/deliveryos` (or other). If owner changes, three files need a mechanical rewrite: `README.md` `## Install` section, `RELEASE_NOTES.md`, `extension/package.json#repository.url`. The updater + install scripts derive automatically from `package.json#repository.url`.
- **Cursor install.** Install Cursor before § 11.5 smoke. Confirm CLI path matches `/Applications/Cursor.app/Contents/Resources/app/bin/cursor` so the install script's `command -v cursor` probe works.
- **Two CHUNK-03 / CHUNK-04 tripwires unchanged from DOS:R3:**
  - **Multi-root workspace support.** MVP picks `workspaceFolders[0]` (CHUNK-03 § 13.6). Revisit if dogfooding hits it.
  - **`SqlJsHost.flush()` debounce.** Current strategy: flush-per-mutation. Tripwire: if `MemoryStore.create()` ever exceeds 100 ms in dogfooding, drop in a debounced `scheduleFlush(250 ms)`.
- **Track-O open questions (CHUNK-03 § 13.9).** Runtime Zod validation on `payload_json` read; whether to default `memory.sqlite` to gitignored; whether the rebuild-from-markdown command earns a chunk slot. None blocking — defer to a Track-O session.

**Not done this session (deferred to later R sessions or chunks):**

- The three carry-overs above that constitute "CHUNK-04 done".
- Specialist roles, PRD editor, Discovery panel, Brief composer, etc. (CHUNK-05+).
- ESLint / Prettier wiring.

---

## DOS:R3  (2026-05-22)

DOS:R3 landed **CHUNK-03 (memory store) in full** plus a tiny housekeeping commit and one Track-O doc reconciliation that was in flight when the session opened. 7 substantive commits + 1 Track-O carry-forward commit + this wrap commit. Phase 0 / Week 2 second half is now done — running ~10 days ahead of the BUILD-PLAN's 2026-06-01 nominal start. The trimmed-MVP critical path now has CHUNK-04 as the only outstanding Phase 0 work.

**Housekeeping (1 commit):**

- `3df8ce8 chore(session-config): add P track + fix R sanity check post-monorepo (DOS:R3)`
  - Lands the in-flight `.claude/session-config.yml` addition: a third track `P:` (Project Management) with `handover_path: docs/pm/PM_STATUS.md`, `history_path: docs/pm/PM_HISTORY.md`. No sanity_checks / bug_list (mirrors O track). Project-plan path omitted — `PM_STATUS.md` absorbs the backlog in the same model the O track uses.
  - Bumps the `project_prefix` comment to mention `DOS:P<N>` alongside `DOS:O<N>` / `DOS:R<N>`.
  - Closes the DOS:R2 carry-over "Update `.claude/session-config.yml` R-track sanity checks": replaces the stale `ls src/ && ls package.json 2>&1` with the post-monorepo `ls extension/src/ && ls extension/package.json webview/package.json contracts/package.json package.json 2>&1`.

**CHUNK-03 (6 substantive commits, in the chunk-spec § 10 order):**

- `e6ba57d chore(deps): add sql.js + WASM copy step — CHUNK-03 Step 1 (DOS:R3)`
  - `extension/package.json` + `dependencies.sql.js ^1.10.3` + `devDependencies.@types/sql.js ^1.4.9` (per PRD § 25.2 + research finding #1: WASM-backed SQLite to avoid the native-module Electron-ABI matrix across editor forks).
  - `scripts/build.mjs` + copy `node_modules/sql.js/dist/sql-wasm.wasm → extension/dist/sql-wasm.wasm` (vsce `--no-dependencies` would otherwise omit it). `dist/extension.js` jumped 37 KB → 131 KB because esbuild bundles the sql.js JS glue inline; the standalone WASM lands at 644 KB. Total .vsix budget impact stays well under the § 13.1 5 MB limit.
  - `.vscodeignore` unchanged — `dist/*.wasm` is included by default; no rule excludes it.

- `c87c108 feat(contracts): memory + links slices — CHUNK-03 Step 2 (DOS:R3)`
  - `contracts/src/memory.ts` — `MEMORY_TYPES` const tuple of 9 (intent, requirement, design, codebase, execution, result, verification, release, test-spec) + `MemoryEntryBase` envelope + the 9 typed payloads (Intent w/ `RawIdea` + `DiscoveryRecord`; Requirement; Design; Codebase; Execution; Result w/ opaque `diffOutcome?: unknown` slot for CHUNK-13; Verification w/ `bypasses[]`; Release; TestSpec w/ `TestScenario`) + discriminated `MemoryEntry` union + `MemoryEntryOfType` / `MemoryPayloadOfType` helpers + per-type aliases (`IntentMemory`...`TestSpecMemory`).
  - `contracts/src/links.ts` — `LINK_KINDS` const tuple of 10 (derives-from, verifies, evaluates, produced, supersedes, includes, reworks, has-test-spec, derived-from-verification, releases) + `LinkKind` type + `MemoryLink` interface. Promoted to its own file (rather than nested inside memory.ts) so a single rename refactor moves the vocabulary and downstream consumers inventing a new kind get a TS error.
  - `contracts/src/index.ts` re-exports both slices via the barrel. `contracts/package.json` adds `./memory` and `./links` subpath exports for consumers that resolve via `package.json#exports` (the webview uses `moduleResolution: "Bundler"`; the extension uses legacy `"Node"` and imports from the barrel — both paths work).

- `f53fefb feat(memory): module foundation — CHUNK-03 Steps 3-7 (DOS:R3)`
  - **`extension/src/memory/paths.ts`** — `DELIVERYOS_DIR` / `MEMORY_SQLITE_FILENAME` / `MEMORY_BODY_DIR` / `README_FILENAME` / `HARNESS_SQLITE_FILENAME` constants + `deliveryosDir` / `memorySqlite` / `memoryBodyDir` / `readmePath` / `globalStoragePath` Uri helpers. `HARNESS_SQLITE_FILENAME` is defined but the cross-project DB is NOT opened in CHUNK-03 (§ 3.2 — stub path only).
  - **`extension/src/memory/schema.ts`** — `CURRENT_SCHEMA_VERSION = 1`, the v0 bootstrap `CREATE TABLE _schema_version IF NOT EXISTS`, and `SCHEMA_V1` (the canonical DDL from § 4.1: `memory_entries` + `memory_links` with FK + CASCADE + three indexes on type / from_id+kind / to_id+kind). `MIGRATIONS` map keyed by version for forward-only walks.
  - **`extension/src/memory/migrations.ts`** — 8-line forward-only `runMigrations(db)`. Idempotent: re-open is a no-op. v2+ migrations should wrap in `BEGIN/COMMIT` (v1 is initial DDL so wrapping is moot).
  - **`extension/src/memory/sqlJsTypes.ts`** — derives `SqlJsStatic` + `SqlJsDatabase` via `Awaited<ReturnType<typeof initSqlJs>>` + `InstanceType<...>`. Needed because `@types/sql.js` uses `export = initSqlJs` so `Database` / `SqlJsStatic` aren't importable as named types.
  - **`extension/src/memory/sqlJsHost.ts`** — owns `initSqlJs` (wasmBinary loaded from `extensionUri/dist/sql-wasm.wasm` — no network fetch), `open` / `openInMemory` factories, explicit `flush()` per § 12.2 (snapshot via `db.export → workspace.fs.writeFile`), and `close()`. `toArrayBuffer` helper converts the `Uint8Array` returned by vscode FS into the `ArrayBuffer` that sql.js's typings require.
  - **`extension/src/memory/ids.ts`** — `generateMemoryId(type)` returns `<type>-<8-hex>` using `crypto.randomUUID()`. ~4 billion collision space per project is fine; the typed prefix makes IDs self-describing on disk.
  - **`extension/src/memory/markdown.ts`** — `bodyPath` / `writeBody` / `readBody` / `deleteBody` (best-effort silent) + `renderFrontmatter` (the 4-line YAML block prefixed to every body file). UTF-8 via `TextEncoder`/`TextDecoder`.
  - **`extension/src/memory/types.ts`** — re-exports everything from the contracts barrel + adds `MemoryEntryRow` (the raw SQL row shape) which stays extension-only.

- `3d3c152 feat(memory): MemoryStore class — CHUNK-03 Step 8 (DOS:R3)`
  - `extension/src/memory/MemoryStore.ts` — the single public class consumed by every later chunk. Surface frozen here.
  - **Lifecycle:** `open(context, workspaceFolder)` (async factory; calls `SqlJsHost.open` + `runMigrations` + `flush()` so a fresh `.deliveryos/memory.sqlite` exists immediately) · `openInMemoryForTests(wasmBytes, workspaceUri)` (test-only) · `close()` (best-effort final flush, idempotent).
  - **CRUD:** `create(input)` (generates id, BEGIN → INSERT → writeBody → COMMIT → flush; ROLLBACK + best-effort `deleteBody` on any throw so we don't leak orphan body files per § 13.5) · `read(id)` (SELECT + readBody + strip frontmatter; returns `null` on miss, not throws) · `update(id, patch)` (parses id prefix and verifies stored type matches — throws `MemoryStoreError('type-immutable')` if not; shallow-merges payload patch; snapshots previous body to restore on rollback) · `list(type)` (prepared statement; `ORDER BY created_at DESC`; bodies NOT loaded — callers use `read(id)` for bodies).
  - **Graph:** `link(from, to, kind)` (INSERT OR IGNORE — idempotent) · `unlink` (DELETE — idempotent) · `walk(from, kind)` (JOIN memory_links → memory_entries; one-hop) · `backlinks(to, kind?)` (incoming-link rows; `kind` optional so CHUNK-14's release-evidence walker can enumerate everything pointing at an entry).
  - **Convenience:** `createIntent(rawIdea, projectTitle)` — builds the `IntentPayload` (RawIdea + null discovery) and delegates to `create()`. The single helper that lets CHUNK-01's `project.create` command persist via the store without leaking SQL knowledge into the command.
  - **Errors:** `MemoryStoreError` with typed `code` field (`not-found | invalid-id | type-immutable | flush-failed | migration-failed`). The store never shows notifications — callers handle.

- `bc4775a feat(extension): wire MemoryStore + persist project intent — CHUNK-03 Steps 10-11 (DOS:R3)`
  - `extension/src/memory/readmeTemplate.ts` — `renderDeliveryosReadme(projectName)` emits the `.deliveryos/README.md` content per § 8.
  - `extension/src/projectRegistry.ts` — adds `PersistedProjectRegistry implements IProjectRegistry` (backed by `MemoryStore`; `loadActive()` reads the most-recent Intent on bootstrap). `IProjectRegistry` now extends `vscode.Disposable` so both impls type-fit `context.subscriptions.push()`. `intentToRecord` helper for the IntentMemory → ProjectRecord projection.
  - `extension/src/commands/projectCreate.ts` — `ProjectCreateDeps` now takes `{ registry, memoryStore?, workspaceUri? }`. When the store is available the command calls `memoryStore.createIntent(trimmedName, trimmedName)` — the user-typed name becomes both the project title AND the raw idea text (CHUNK-05 will properly split these). On first create, writes `.deliveryos/README.md` if absent (`ensureReadme` — stat-then-write, swallows FileNotFound). Without a store (no workspace folder) the command keeps the CHUNK-01 in-memory path.
  - `extension/src/extension.ts` — `activate()` is now async. Picks `workspaceFolders[0]` per § 9 (multi-root is a known follow-up, § 13.6). Opens `MemoryStore` + `PersistedProjectRegistry`; on failure `showErrorMessage` + falls back to `InMemoryProjectRegistry` so the extension still activates. Pushes a dispose hook for `memoryStore.close()`. Initial `hasProject` context reflects whether `loadActive()` found an Intent on disk. `onDidChangeWorkspaceFolders` prompts "Reload" (vs. a full live-rebuild — punted for MVP).
  - `extension/package.json` — version `0.0.2` → `0.0.3` (memory persistence is a user-visible surface change).

- `e12ae45 test(memory): unit tests + tsx test runner — CHUNK-03 Step 9 (DOS:R3)`
  - **23 tests across 6 suites** — `npm test` (from `extension/`) runs in ~170ms.
  - `extension/test/vscode-stub.ts` — in-memory `vscode` shim covering `Uri.joinPath`, `workspace.fs.{readFile,writeFile,createDirectory,delete,stat}`, `FileSystemError`, `ExtensionContext`, `WorkspaceFolder`. Aliased into the `vscode` import slot via `extension/test/tsconfig.json`'s `compilerOptions.paths` so MemoryStore's body file writes land in a Map.
  - `extension/test/tsconfig.json` — extends `../tsconfig.json` with three path aliases: `vscode` → `./vscode-stub.ts`, `@deliveryos/contracts` + `/*` → `../../contracts/src/*.ts` (source). The contracts alias bypasses the package.json#exports map (which only declares `import` for ESM consumers; `tsx` resolves through CJS). Aliasing to source means tests run with zero build steps.
  - `extension/test/memory.test.ts` — 6 suites: **ids** (typed prefix + parseback + 100-unique-call entropy), **migration runner** (bootstrap from scratch + idempotent re-run + three indexes), **MemoryStore CRUD** (parameterised round-trip for all 9 MEMORY_TYPES + null-on-miss read + shallow-merge update + not-found rejection + list ordering), **MemoryStore links** (link/walk/backlinks round-trip + INSERT OR IGNORE idempotency + `LINK_KINDS` vocabulary integrity), **payload JSON edge cases** (fully-populated `RequirementPayload` round-trip).
  - `extension/package.json` + `test` script `tsx --tsconfig test/tsconfig.json --test test/*.test.ts`; `typecheck` script extended to typecheck the test tsconfig too. + `tsx ^4.22.3` devDep.

**Track-O carry-forward (1 commit, not a DOS:R3 commit):**

- `ee44636 docs(planning): fold DOS:R2 path-resolution decision into CHUNK-02 spec`
  - User-authored between-sessions inline edit to `docs/planning/chunks/chunk-02-webview-foundation.md` that landed the DOS:R2 carry-over "consider folding the resolution into the CHUNK-02 spec as a follow-up Track-O edit". Self-attributes inside the file as a DOS:O6 inline edit; landed without a formal Track-O session wrap so the DOS:R3 wrap could proceed against a clean tree.
  - Substance: path lookups now use `extension/dist/webview/...` directly (no `..` walk back to a sibling); added § 8 "Path resolution: extension/dist/webview" explaining why the `..`-walk only worked in F5 dev mode; updated § 11 edge-case note + § 14 acknowledged deviations.
  - No code change; aligns chunk-02 text with what already shipped in DOS:R2 commits.

**Manual smoke (CHUNK-03 § 11.1) — verified end-to-end:**

DOS:R3 opened `/tmp/deliveryos-smoke/` as a fresh workspace, installed `deliveryos-0.0.3.vsix`, and the user ran `deliveryos.project.create` with the input "Bug Triage Assistant". All 8 § 11.1 steps + the close-reopen persistence check passed:

- `.deliveryos/memory.sqlite` (36 KB) created on activation. `sqlite3 .schema` returned the three expected tables (`_schema_version`, `memory_entries`, `memory_links`) and three indexes (`idx_memory_entries_type`, `idx_memory_links_from`, `idx_memory_links_to`) exactly matching the schema.ts DDL. `_schema_version.v = 1`.
- `.deliveryos/memory/intent/intent-0fb46838.md` created with the 4-line frontmatter + body "Bug Triage Assistant".
- `.deliveryos/README.md` rendered with the project name.
- `memory_entries` row: `intent-0fb46838 | intent | Bug Triage Assistant | 2026-05-22 03:17:06`.
- `payload_json` deserialises to `{ rawIdea: { text: "Bug Triage Assistant", capturedAt: 1779419826869 }, discovery: null }` — a valid `IntentPayload`.
- Close + reopen `/tmp/deliveryos-smoke` → project loaded from disk via `PersistedProjectRegistry.loadActive`. No welcome view shown (because `loadActive()` set `hasProject` true during activation). User-confirmed.

**Deviation from the chunk spec to flag for next session:**

- **Contracts subpath imports.** The chunk spec describes `import { MemoryEntry } from '@deliveryos/contracts/memory'` as the canonical path. The webview workspace (with `moduleResolution: "Bundler"`) can use that subpath. The extension workspace (with legacy `moduleResolution: "Node"`) cannot — `Node` ignores `package.json#exports` and the bare-specifier subpath resolves through `node_modules/@deliveryos/contracts/memory.ts` which doesn't exist. Resolution: the extension imports from the bare `@deliveryos/contracts` barrel; the contracts package re-exports `memory` + `links` slices via its `src/index.ts`. Both consumers ultimately get the same types; the import-path constraint ("import from contracts, not from a local string" — § 5.5 walker note) is honoured either way. If a later chunk wants to switch the extension to `moduleResolution: "Bundler"` or `"Node16"`, the subpath imports become available transparently.

**Doc-hygiene + housekeeping in DOS:R3:**

- `README.md` repo-layout block updated: `projectRegistry.ts` caption now says "IProjectRegistry seam — InMemory + Persisted impls"; new `memory/` entry; new `test/` entry.
- `docs/BUILD-PLAN.md` Week 2 status: CHUNK-03 ticked done; CHUNK-04 deferred to DOS:R4.

**Carry-overs for DOS:R4 (next session):**

- **CHUNK-04 — Multi-editor sideload + GitHub Release scaffold.** Sideload smoke into Cursor / Windsurf / VSCodium / Antigravity, install scripts, GitHub Actions wiring, version-check notification, plus a `scripts/check-vsix-size.js` that fails the build if `.vsix > 5 MB` (suggested in CHUNK-03 § 11.3 — "nice-to-have CI assertion, defer to CHUNK-04"). Also folds the `deliveryos.openHello` command behind a `deliveryos.devMode` `when` clause so it's not user-facing. Phase 0 demoable state lands here: "installed in VS Code AND Cursor from the same file." Effort: 1–2 session-days. Spec: [docs/planning/chunks/chunk-04-multi-editor-verify.md](../planning/chunks/chunk-04-multi-editor-verify.md).
- **Two CHUNK-02 § 10.2 unit tests still pending:** `htmlFactory.test.ts` (nonces differ across two calls + CSP directives + asset URI rewrite) + `nonce.test.ts` (24-byte base64url + 100 unique calls). DOS:R3 set up the `tsx + node:test` runner so these are now plug-and-play — should land alongside CHUNK-04. The current runner is wired only against `src/memory/**` in `test/tsconfig.json`'s `include`; when these CHUNK-02 tests land, widen the `include` to cover `src/webview/**` too.
- **Multi-root workspace support.** MVP picks `workspaceFolders[0]` (CHUNK-03 § 13.6). `onDidChangeWorkspaceFolders` currently prompts "Reload" rather than rebuilding the store live. Revisit if dogfooding hits it.
- **Future tuning seam — `SqlJsHost.flush()` (CHUNK-03 § 12.3).** Current strategy: flush-per-mutation. Tripwire: if `MemoryStore.create()` ever exceeds 100 ms in dogfooding, drop in a debounced `scheduleFlush(250ms)`. Not blocking; just a tripwire to remember.
- **CHUNK-03 open questions for next planning pass (§ 13.9):** runtime Zod validation on `payload_json` read; whether to default `memory.sqlite` to gitignored; whether the rebuild-from-markdown command earns a chunk slot. None are blockers — defer to a Track-O session when the question becomes pressing.

**Not done this session (deferred to later R sessions or chunks):**

- CHUNK-04 (multi-editor sideload + GitHub Release scaffold).
- Specialist roles, PRD editor, Discovery panel, Brief composer, etc. (CHUNK-05+).
- ESLint / Prettier wiring (still deferred; not in CHUNK-04).
- Manual webview round-trip verification carried from DOS:R2 (user needs to reload VS Code post-wrap and run **DeliveryOS: Open Hello** + open Webview DevTools to confirm zero CSP errors per CHUNK-02 § 10.1).

---

## DOS:R2  (2026-05-21)

DOS:R2 finished the unfinished business of CHUNK-01 (steps 4–13) and then landed **all of CHUNK-02** end-to-end. Six substantive commits across two chunks. CHUNK-01 closed at v0.0.1; CHUNK-02 bumped to v0.0.2 because the surface meaningfully grew (webview + bundled deps + monorepo). Phase 0 Week 2 first half is done — ~4 days ahead of the BUILD-PLAN's 2026-06-01 nominal start.

**CHUNK-01 completion (3 commits):**

- `278d79f feat(scaffold): activity-bar + static stage tree — CHUNK-01 steps 4-6 (DOS:R2)`
  - Added `media/icon-rocket.svg` (Lucide rocket, `stroke-width=2`, 24×24) + `media/deliveryos-logo.png` (128×128 placeholder generated via Python stdlib).
  - `package.json`: `icon`, `capabilities.{untrustedWorkspaces,virtualWorkspaces}: false`, `contributes.viewsContainers.activitybar[deliveryos]`, `contributes.views.deliveryos[deliveryos.stages]`.
  - `src/stages/{stageDefinitions,stageTreeNodes,stageTreeProvider}.ts`: frozen `STAGE_DEFS` (4 entries), `StageNode | ArtefactNode` discriminated union, `contextValue: 'deliveryos.stage.<id>'` set per spec § 9 OQ#4 for downstream CHUNK-05+ menu wiring.
  - `src/extension.ts`: `vscode.window.createTreeView('deliveryos.stages', { showCollapseAll: true })`.

- `6523214 feat(scaffold): project registry + create command + welcome + refresh — CHUNK-01 steps 7-11 (DOS:R2)`
  - `src/contextKeys.ts`: `CONTEXT_KEYS.hasProject = 'deliveryos.hasProject'`.
  - `src/projectRegistry.ts`: `InMemoryProjectRegistry implements IProjectRegistry`. `EventEmitter<void>` wakes the tree. `ProjectRecord` stub (id, name, description?, createdAt). `generateProjectId()` uses `node:crypto.randomUUID()` — CHUNK-03 can swap to ULID/UUIDv7 without touching call sites.
  - `src/commands/projectCreate.ts`: `deliveryos.project.create` handler — `showInputBox` with `validateInput`, sets `deliveryos.hasProject` context key, returns discriminated `ProjectCreateResult`.
  - `src/commands/stagesRefresh.ts`: `deliveryos.stages.refresh`.
  - `src/stages/stageTreeProvider.ts`: constructor takes `IProjectRegistry`, subscribes to `onDidChange`, gates `getChildren` on `getActive()` (empty → welcome; populated → four stages).
  - `package.json`: `viewsWelcome` (gated on `!deliveryos.hasProject`), `commands`, `menus.view/title` for refresh icon.

- `813a56f docs(scaffold): README expansion + LICENSE — CHUNK-01 step 12 (DOS:R2)`
  - MIT `LICENSE`.
  - `README.md` updates: status line + repo layout + post-install click path + known limitations + "what's next".

**CHUNK-02 (3 commits — Sessions 1, 2, 3+4+5):**

- `2f648fa refactor(monorepo): restructure as npm workspaces — CHUNK-02 Session 1 (DOS:R2)`
  - `tsconfig.base.json` at root.
  - Root `package.json` → workspaces `["contracts", "extension"]` (webview added in Session 2). Build/clean/package orchestrator scripts.
  - **All CHUNK-01 source moved** into `extension/`: `extension/src/{extension,contextKeys,projectRegistry}.ts`, `extension/src/commands/`, `extension/src/tree/` (renamed from `src/stages/`), `extension/media/`. `extension/package.json` is the actual extension manifest (`name: "deliveryos"`, v0.0.2). Owns its own `tsconfig.json`, `.vscodeignore`, scripts.
  - `contracts/` workspace: `@deliveryos/contracts` (private, composite TS). `src/messages.ts` (base helpers), `src/panels/hello.ts` (`GetHelloText` RequestType), `src/index.ts` (namespaced barrel: `export * as Hello`).
  - Strict-compiler fixes: spread `description` only when defined in `projectCreate.ts`; update `stages/` → `tree/` import paths.

- `c496121 feat(webview): add webview package — CHUNK-02 Session 2 (DOS:R2)`
  - `webview/` workspace: `@deliveryos/webview` (private, `type: module`). Deps: `react`/`react-dom` 18, `vscode-messenger-{webview,common}` 0.4.5, `@deliveryos/contracts`. Dev: vite 5, `@vitejs/plugin-react`, tailwind 3, postcss, autoprefixer, `@types/{react,react-dom,vscode-webview}`.
  - `vite.config.ts`: multi-entry build, `rollupOptions.input.hello → src/panels/hello/index.html`, hashed `assets/` output filenames, `base: './'`, `manifest: '.vite/manifest.json'`.
  - `tailwind.config.ts`: hybrid theming per spec § 7 — `dos.*` palette (`ink/surface/accent/danger/success/warn/muted`) + `vscode.*` anchors bound to VS Code CSS vars (`bg/fg/panel/border/focusBorder/input*`). Font family + size anchored to `--vscode-font-*`.
  - `src/shared/{styles/tailwind.css, vscode.ts, messenger.ts}`: tailwind layer imports + body defaults + focus ring; `vscode()` singleton wraps `acquireVsCodeApi()`; webview messenger singleton.
  - `src/panels/hello/{index.html, main.tsx, HelloApp.tsx}`: Vite entry HTML + React bootstrap + the `HelloApp` component that calls `Hello.GetHelloText` and renders the response + ISO timestamp.
  - `scripts/build.mjs`: orchestrator — contracts → webview → extension, then `cp webview/dist → extension/dist/webview` (the spec-deviation copy step described below).

- `778f3cf feat(webview): hello panel + host messenger + CSP-locked HTML factory + serializer — CHUNK-02 Sessions 3-5 (DOS:R2)`
  - `extension/src/webview/nonce.ts` → `randomBytes(24).toString('base64url')` (192 bits per call).
  - `extension/src/webview/htmlFactory.ts` → cached manifest read, looks up entry key `src/panels/<entry>/index.html`, generates CSP-locked HTML with per-call nonce. CSP: `default-src 'none'; script-src 'nonce-<n>'; style-src <cspSource> 'unsafe-inline'; img-src <cspSource> https: data:; font-src <cspSource>; connect-src <cspSource>`.
  - `extension/src/webview/messenger.ts` → `HostMessenger` wraps `vscode-messenger`. `registerHelloHandlers()` binds `Hello.GetHelloText → { text: 'Hello, <name>.', timestamp: Date.now() }`. `attachPanel()` calls `registerWebviewPanel()`.
  - `extension/src/webview/panelManager.ts` → `Map<viewType, panel>` for show-or-focus. `trackPanel` + `existingPanel`. Cleans on dispose.
  - `extension/src/webview/helloPanel.ts` → `openHelloPanel`: reveal-if-existing else `createWebviewPanel` with `enableScripts` + `localResourceRoots = extensionUri/dist/webview`, set HTML, attach, track.
  - `extension/src/serializers/helloPanelSerializer.ts` → `deserializeWebviewPanel` re-applies options, re-renders HTML (fresh nonce), re-attaches messenger, re-tracks panel.
  - `extension/src/commands/openHello.ts` + `extension/src/extension.ts` updates → registers `deliveryos.openHello`, the messenger, the serializer for `HELLO_VIEW_TYPE`.
  - `extension/package.json`: `contributes.commands[deliveryos.openHello]`, `dependencies.vscode-messenger + .vscode-messenger-common`. `devDependencies.esbuild`.
  - `extension/esbuild.mjs` → bundles `src/extension.ts` → `dist/extension.js` (cjs, node18, external: vscode). Switch from tsc-emit to esbuild-bundle so `vsce --no-dependencies` ships a single-file extension without trying to walk workspace symlinks for `vscode-messenger`.

**Deviation from the chunk spec to flag for next session:**

- **CHUNK-02 § 8 path inconsistency.** The spec's `htmlFactory` uses `extensionUri.joinPath('..', 'webview', 'dist', ...)`. That only works in F5 dev mode (`extensionUri = workspaceFolder/extension`) and breaks at runtime in a packaged `.vsix` (`extensionUri = .vsix content root` — no parent traversal). DOS:R2's resolution: keep `vsce` running from `extension/` and have `scripts/build.mjs` copy `webview/dist/ → extension/dist/webview/` before packaging. `htmlFactory.ts`, `helloPanel.ts`, and `helloPanelSerializer.ts` all use `extensionUri.joinPath('dist', 'webview', ...)` (no `..`) — identical path in both dev mode (after build) and packaged mode. The deviation is logged in the Session 1 + Session 3-5 commit bodies; consider folding the resolution into the CHUNK-02 spec as a follow-up Track-O edit. *(Closed during DOS:R3 wrap — `ee44636 docs(planning): fold DOS:R2 path-resolution decision into CHUNK-02 spec`.)*
- **CHUNK-01 step 13 final-audit assertion is partially stale post-CHUNK-02.** The spec § 8.1 expected `.vsix` contents list (e.g. "no `node_modules/`") is now broader because esbuild bundles `vscode-messenger` into `dist/extension.js`. The CHUNK-02 v0.0.2 `.vsix` still has no `node_modules/` because the bundling is in-file; the assertion still holds in spirit. Not a fix; just an observation.

**Doc-hygiene + housekeeping in DOS:R2:**

- `README.md` rewritten for the monorepo layout (full new repo-layout block) and the post-CHUNK-02 click path (rocket → welcome → create → open-hello smoke).
- `.gitignore`: `*.tsbuildinfo`, `/extension/LICENSE`, `/extension/readme.md` (the prepackage step copies them from root).
- `extension/.vscodeignore`: exclude `esbuild.mjs` from the `.vsix`.

**Stale ref discovered but NOT fixed this session (carry-over to user, not blocking):**

- `.claude/session-config.yml`'s R-track sanity check `ls src/ && ls package.json 2>&1` is **stale post-monorepo**. Post-DOS:R2, the relevant paths are `extension/src/` and either `extension/package.json` (extension manifest) or root `package.json` (workspaces manifest). DOS:R3's `/start-fresh R` will run the stale check and report N/A or false-fail; update the config before then. Suggested replacement: `ls extension/src/ && ls extension/package.json webview/package.json contracts/package.json 2>&1`. *(Closed in DOS:R3 commit `3df8ce8`.)*

**Carry-overs for DOS:R3 (next session):**

- **CHUNK-03 — Memory store.** `sql.js` (WASM SQLite) + `.deliveryos/memory.sqlite` schema. Replaces `InMemoryProjectRegistry` with `PersistedProjectRegistry` via the existing `IProjectRegistry` interface (CHUNK-01's seam). Owns `MEMORY_TYPES` (9 entries: `intent`/`requirement`/`design`/`codebase`/`execution`/`result`/`verification`/`release`/`test-spec`) and `LINK_KINDS` (10 entries post-DOS:O4 retirement of 3 zero-writer edges). Adds `@deliveryos/contracts/memory` + `@deliveryos/contracts/links` slices. Effort: 3–4 session-days. Spec: [docs/planning/chunks/chunk-03-memory-store.md](../planning/chunks/chunk-03-memory-store.md). *(Closed in DOS:R3.)*
- **CHUNK-04 — Multi-editor sideload + GitHub Release scaffold.** Sideload smoke into Cursor / Windsurf / VSCodium / Antigravity, install scripts, GitHub Actions wiring, version-check notification. Phase 0 demoable state: "installed in VS Code AND Cursor from the same file." Also folds the `deliveryos.openHello` command behind a `deliveryos.devMode` `when` clause so it's not user-facing. Effort: 1–2 session-days. Spec: [docs/planning/chunks/chunk-04-multi-editor-verify.md](../planning/chunks/chunk-04-multi-editor-verify.md). *(Carried forward to DOS:R4.)*
- **Per [READY.md § Parallelisable pairs](../planning/READY.md):** CHUNK-03 + CHUNK-04 can land in parallel with each other (CHUNK-04 also depends on CHUNK-03, so the parallelism is between drafting CHUNK-03's skeleton and starting the editor matrix). For a solo dev at 5–10 hrs/week, sequential is fine — pick whichever appeals to start DOS:R3.
- **Two cheap unit tests CHUNK-02 § 10.2 calls for:** `htmlFactory.test.ts` (asserts nonces differ across two calls + CSP directives + asset URI rewrite) + `nonce.test.ts` (asserts 24-byte base64url + 100 unique calls). Both use `node:test` — zero new deps. Worth landing alongside CHUNK-03 since CHUNK-04 will start to need a deterministic local-test floor anyway. *(Still pending — DOS:R3 added a `tsx + node:test` test runner for the memory module but the two CHUNK-02 webview unit tests themselves did not land; carry forward to DOS:R4 alongside CHUNK-04.)*
- **Update `.claude/session-config.yml` R-track sanity checks** (see "Stale ref discovered" above). *(Closed in DOS:R3 commit `3df8ce8`.)*

**Not done this session (deferred to later R sessions or chunks):**

- CI / GitHub Actions wiring (CHUNK-04).
- Multi-editor sideload smoke (CHUNK-04).
- Memory persistence (CHUNK-03).
- Specialist roles, PRD editor, Discovery panel, Brief composer, etc. (CHUNK-05+).
- ESLint / Prettier wiring (deferred; not in CHUNK-03/04).
- Manual webview round-trip verification (the user needs to reload VS Code post-wrap and run **DeliveryOS: Open Hello** + open Webview DevTools to confirm zero CSP errors per CHUNK-02 § 10.1).

---

## DOS:R1  (2026-05-21)

First development session. Phase A planning was already complete via Track O (PRD v0.3, 14-week BUILD-PLAN, 16 chunk specs, validation report, `READY.md`). DOS:R1 opened the build by cutting CHUNK-01 into a smallest-demoable slice — steps 1–3 of the 13-step implementation outline in [chunks/chunk-01-scaffold.md § 7](../planning/chunks/chunk-01-scaffold.md).

**Substantive commit:**

- `e83940d feat(scaffold): scaffold DeliveryOS extension v0.0.1 — CHUNK-01 steps 1–3 (DOS:R1)`
  - Removed stale `src/{backend,frontend,shared}/`, `tests/`, `config/`, `scripts/` placeholder dirs (zero tracked files; pre-CHUNK-01 web-app scaffold draft).
  - Created `package.json` (engines.vscode `^1.85.0`, `activationEvents: ["onStartupFinished"]`, `main: ./dist/extension.js`), `tsconfig.json` (CJS / ES2022 / strict / `noUnusedLocals` / `noFallthroughCasesInSwitch`), `.vscodeignore`, and `src/extension.ts` with a minimal `activate()` that logs `DeliveryOS activated`.
  - Wired npm scripts (`clean`, `compile`, `watch`, `package`, `vscode:prepublish`) and pinned `@vscode/vsce ^3.0.0`, `typescript ^5.4.0`, `rimraf ^5.0.0`, `@types/{vscode,node}`.
  - Smoke-verified end-to-end: `npm run package` produces a 3.79 KB `deliveryos-0.0.1.vsix` containing only `dist/extension.js`, `package.json`, `readme.md` (no `.ts`, no `node_modules/`, no `src/`); `code --install-extension` succeeds; VS Code `exthost.log` shows clean activation via `onStartupFinished` with no errors.

**Deviation from the chunk spec to flag for next session:**

- `activationEvents: ["onStartupFinished"]` was pre-included in step 1 (chunk-01 spec § 7 puts it in step 6). Without it, DOS:R1's truncated scope (no `contributes`, no commands, no views) has nothing to trigger implicit activation — the smoke test would not fire. When DOS:R2 adds the activity-bar/views contributes, `activationEvents` can stay as-is or be removed (implicit activation will then cover it); the chunk spec § 4 calls out both as acceptable.

**Doc-hygiene edits in the wrap commit (DOS:R2 will land HEAD = wrap commit):**

- [README.md](../../README.md) — replaced the "Concept / pre-build, not yet validated" status line; corrected the repo-layout block (removed the deleted `src/{frontend,backend,shared}/`, `tests/`, `scripts/`, `config/` entries); replaced the "Nothing to run yet" Getting Started block with the actual three-line install recipe.

**Carry-overs for DOS:R2 (next session):**

- **CHUNK-01 steps 4–6** — activity-bar contribution: add `media/icon-rocket.svg` (Lucide rocket, stroke-width 2px for legibility at 24px), `media/deliveryos-logo.png` (Extensions sidebar icon, 128×128), `viewsContainers.activitybar[deliveryos]`, `views.deliveryos[deliveryos.stages]` with an empty `StageTreeProvider`. Then add the four static stage rows (DISCOVER / DEFINE / EXECUTE / VERIFY) and the `capabilities.{untrustedWorkspaces,virtualWorkspaces}.supported: false` block.
- **Bumped-down**: steps 7–13 (project registry, `deliveryos.project.create` command, `viewsWelcome`, stage-children gating, refresh command + title-bar menu, README expansion + LICENSE, final `unzip -l` verification) → likely DOS:R3 if DOS:R2 stops at step 6.
- **One-line open question deferred from Track O**: should [docs/BUILD-PLAN.md](../BUILD-PLAN.md) get a `READY.md is canonical execution order` pointer? Decision per memory: yes, but absorbable into any R session. Untouched in DOS:R1 — pick up at start of DOS:R2 or defer further.

**Not done this session (deferred to later R sessions or chunks):**

- CI / GitHub Actions wiring (CHUNK-04).
- Multi-editor sideload smoke into Cursor / Windsurf / VSCodium / Antigravity (CHUNK-04).
- Webview, React, Tailwind, CSP, `vscode-messenger` (CHUNK-02).
- `sql.js` memory store, `.deliveryos/memory.sqlite` schema (CHUNK-03).
- ESLint / Prettier wiring (deferred; chunk-01 spec doesn't require it).
