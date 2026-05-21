# CHUNK-09 — Execution Brief composer (10-section schema)

**Status:** Phase A planning, Prompt 2 expansion.
**Source plan entry:** [part-1-plan.md § CHUNK-09](../part-1-plan.md).
**Canonical schema source:** [docs/architecture/execution-briefs.md](../../architecture/execution-briefs.md).
**BUILD-PLAN slot:** Phase 2, Week 7 (2026-07-06).
**Effort estimate:** 4–5 session-days (~3 hr each).

---

## 1. Restated goal and scope

### Goal

Assemble the canonical 10-section DeliveryOS Execution Brief — defined in [architecture/execution-briefs.md](../../architecture/execution-briefs.md) — from an approved Requirement (CHUNK-07), its attached Test Specification (CHUNK-08), its linked Design context (carried on the requirement), and a pasted Codebase Context blob. Render it as a markdown document that is **immutable once saved**.

**This is the DEFINING chunk for the Execution Brief markdown schema.** The serialiser/parser written here (`extension/src/brief/briefMarkdown.ts`) is the single source of truth. CHUNK-10 (profile rendering) and CHUNK-13 (Allowed/Forbidden diff) MUST import this module. No other chunk redefines the schema, the heading shape, or the parser.

### In scope

- A "Generate Execution Brief for requirement X" command + button on the requirement detail panel.
- An Execution Brief composer webview panel that:
  - Reads the source Requirement Memory entry (+ its links to PRD section, Test Spec, Design notes).
  - Pre-fills the 10 sections from those sources.
  - Lets the user edit every section, with the Allowed Changes and Forbidden Changes sections getting a dedicated list editor (one glob per line).
  - Provides a Codebase Context paste box (Section 5 is human-supplied in MVP — no auto-extraction).
  - Renders a live markdown preview side-by-side with the editor.
- A "Save and lock" action that:
  - Validates the brief (all 10 sections present, Allowed Changes is non-empty, Forbidden Changes may be empty).
  - Persists an Execution Memory entry via `MemoryStore` (CHUNK-03).
  - Writes the canonical markdown body to `<workspace>/.deliveryos/memory/execution/<brief-id>.md`.
  - Marks the brief immutable; any subsequent edit creates a **new** brief and links it via `kind: "supersedes"` (memory link semantics from CHUNK-03).
- Canonical markdown serialiser **and** parser shared with downstream chunks.
- **Renderers for the four sibling handoff files** (`current-context-package.md`, `current-test-specification.md`, `current-verification-checklist.md`, `memory-summary.md`) that CHUNK-11's `HandoffSnapshot` writes alongside the brief in `.deliveryos-handoff/`. CHUNK-09 owns the derivation; CHUNK-11 owns the filesystem write.
- Tree view changes: under EXECUTE, render a child per requirement that has briefs; under that, render each brief by id + timestamp + version.

### Out of scope

- **Profile-specific rendering** (the brief is rendered in the canonical schema only; Claude Code vs Codex framing is CHUNK-10).
- **Codebase Memory auto-extraction** — user pastes a context blob for MVP. Document the seam.
- **File handoff** to `.deliveryos-handoff/` (CHUNK-11).
- **PreToolUse hook generation** (CHUNK-13).
- **Diff parsing of Sections 7 + 8** against actual changed files (CHUNK-13 consumes this chunk's parser).
- Any AI calls — the composer is manual-mode like every other DeliveryOS surface in MVP.

---

## 2. The 10-section schema

Per [docs/architecture/execution-briefs.md](../../architecture/execution-briefs.md), every Execution Brief contains exactly these ten sections, in this order, with these exact headings:

| #  | Section heading                  | Purpose                                                                     |
|----|----------------------------------|-----------------------------------------------------------------------------|
|  1 | `## 1. Objective`                | What the AI coding harness must accomplish.                                 |
|  2 | `## 2. Approved Requirement`     | Requirement link + the approved requirement text.                           |
|  3 | `## 3. Business Intent`          | Why this requirement exists.                                                |
|  4 | `## 4. Approved Design Context`  | Architecture, API, data model, UX, security notes.                          |
|  5 | `## 5. Existing Codebase Context`| Files, folder structure, conventions, constraints. *(Pasted in MVP.)*       |
|  6 | `## 6. Test-First Specification` | Verification criteria and tests that must be satisfied.                     |
|  7 | `## 7. Allowed Changes`          | Glob patterns the harness may change. **Load-bearing for CHUNK-13.**        |
|  8 | `## 8. Forbidden Changes`        | Glob patterns the harness must not touch. **Load-bearing for CHUNK-13.**    |
|  9 | `## 9. Expected Output`          | What the harness must return: summary, files changed, tests, risks, etc.   |
| 10 | `## 10. Completion Criteria`     | What must be true before the work is complete.                              |

A brief always also carries:

- An H1 title line: `# DeliveryOS Execution Brief`.
- An optional metadata block (H2-less) above Section 1 with `Profile:`, `Project:`, `Requirement:` lines. In CHUNK-09 the `Profile:` line is omitted or set to `(unspecified)` — CHUNK-10 fills it.
- A YAML frontmatter block at the very top with the brief id, source requirement id, schema version, and timestamps (see § 5 Schema below).

The full schema is **frozen** at this list of ten sections. Any extension is a `v` bump in frontmatter `schema_version`.

---

## 3. File-by-file breakdown

### Webview (React + Tailwind, runtime from CHUNK-02)

```
webview/src/panels/brief-composer/
  ├── main.tsx                       # Vite entry; mounts <BriefComposerApp/> + connects vscode-messenger.
  ├── BriefComposerApp.tsx           # Top-level layout: section list + side-by-side preview.
  ├── SectionEditor.tsx              # Generic markdown textarea for sections 1–6, 9, 10.
  ├── SectionPreview.tsx             # Renders the live markdown preview of the assembled brief.
  ├── AllowedForbiddenEditor.tsx     # The Allowed/Forbidden list editor — one glob per line, two panes.
  ├── CodebaseContextPaste.tsx       # The Section 5 paste box with a "future: auto-extract" hint.
  ├── SaveAndLockButton.tsx          # "Save and lock" action — disabled until validation passes.
  └── hooks/
      └── useBriefDraft.ts           # Local draft state + messenger calls for generateDraft/editSection/save.
```

### Extension host

```
extension/src/panels/brief-composer/
  └── briefComposerHost.ts           # Creates/serialises the webview panel; routes messenger requests
                                     #   to briefBuilder + memory store; reuses CHUNK-02 HTML factory.

extension/src/brief/
  ├── briefBuilder.ts                # Reads Requirement + Test Spec + Design notes via MemoryStore,
                                     #   produces an in-memory ExecutionBrief draft (no Codebase Context;
                                     #   that section starts blank for the user to paste).
  ├── briefMarkdown.ts               # ⭐ Canonical serialiser + parser. Single source of truth.
                                     #   Exports: serialise(brief), parse(md), parseSections(md),
                                     #   renderExpectedOutputSection(), VERSION, BRIEF_SECTION_NAMES,
                                     #   RESULT_MD_SECTION_NAMES. Imported by CHUNK-10 (rendering),
                                     #   CHUNK-12 (result.md parsing), and CHUNK-13 (diff parsing).
  ├── briefValidator.ts              # Validates a draft prior to save (10 sections present, Allowed
                                     #   non-empty, frontmatter valid, glob patterns parseable).
  ├── briefIds.ts                    # UUID v4 helper specifically for brief ids (`brief_<uuid>`).
  ├── handoffSiblings.ts             # Renders the four sibling handoff markdown files that
                                     #   accompany the brief in `.deliveryos-handoff/`. CHUNK-11
                                     #   imports these renderers and writes the returned strings
                                     #   verbatim. See § 6.4.
  └── types.ts                       # ExecutionBrief, BriefSection, BriefAllowedList, BriefForbiddenList,
                                     #   BriefFrontmatter. Re-exports nothing from contracts/ — types here
                                     #   are extension-host-internal; webview types live in contracts/.
```

### Shared contracts (consumed by both extension + webview)

```
contracts/src/brief.ts
  # Webview ↔ extension message contract. Lives in the shared `contracts/` package from CHUNK-02.
  # Exports:
  #   - type BriefDraftMessage      = { command: "brief.generateDraft"; requirementId: string }
  #   - type BriefEditSectionMessage = { command: "brief.editSection"; sectionId: BriefSectionId; body: string }
  #   - type BriefEditListMessage   = { command: "brief.editList"; list: "allowed"|"forbidden"; globs: string[] }
  #   - type BriefSaveMessage       = { command: "brief.save"; draft: ExecutionBriefDraft }
  #   - type BriefDraftResponse     = { briefId?: string; draft: ExecutionBriefDraft; validation: BriefValidation }
  #   - type ExecutionBriefDraft    = serialisable form of ExecutionBrief (matches types.ts)
```

### Tree view changes (CHUNK-01's `TreeDataProvider`)

The EXECUTE stage node gains:

```
EXECUTE
└── <requirement-id>: <requirement-title>
    ├── Brief — <brief-id> — <iso-timestamp> — v1     ← clickable, opens composer in read-only mode
    └── Brief — <brief-id> — <iso-timestamp> — v2     ← supersedes link visible
```

If a requirement has no brief yet, a single child item `"Compose Execution Brief…"` appears that opens the composer in draft mode.

### Out-of-scope files (called out so a sibling chunk owns them)

- `extension/src/handoff/*` — CHUNK-11.
- `extension/src/profiles/*` — CHUNK-10.
- `extension/src/diff/*` — CHUNK-13.
- `extension/src/hooks/*` (Claude Code PreToolUse) — CHUNK-13.

---

## 4. Brief markdown schema (frozen)

### 4.1 Document shape

```md
---
brief_id: brief_01HXYZ...
schema_version: 1
project_id: prj_01HX...
requirement_id: req_01HX...
test_spec_id: ts_01HX...           # optional
supersedes: brief_01HX...           # optional; present iff this brief replaces a prior one
profile: (unspecified)              # CHUNK-10 fills this on render; "(unspecified)" until then
created_at: 2026-07-07T10:30:00Z
locked_at: 2026-07-07T11:05:00Z     # set on save; absence ⇒ draft (drafts are not persisted on disk)
---
# DeliveryOS Execution Brief

Profile: (unspecified)
Project: Bug Triage Assistant
Requirement: REQ-002 — Bug submission API

## 1. Objective
<free-form markdown>

## 2. Approved Requirement
<free-form markdown; conventionally the requirement title + body verbatim>

## 3. Business Intent
<free-form markdown>

## 4. Approved Design Context
<free-form markdown; bulleted notes pulled from Design memory>

## 5. Existing Codebase Context
<free-form markdown; pasted by the user in MVP>

## 6. Test-First Specification
<bulleted list or table, sourced from the linked Test Spec>

## 7. Allowed Changes
- src/backend/api/bugs.py
- src/backend/models/bug_report.py
- tests/integration/test_bugs_api.py

## 8. Forbidden Changes
- src/backend/api/users.py
- migrations/**
- src/frontend/**

## 9. Expected Output
<free-form markdown; conventionally a bulleted list of what to return>

## 10. Completion Criteria
<free-form markdown>
```

### 4.2 Heading rules (frozen)

- Each section heading is an H2 (`##`) starting with the section number, a dot, a single space, and the canonical section name. Example: `## 7. Allowed Changes`. Case-sensitive; the parser is **strict** on this.
- The sections appear in numeric order; the parser rejects out-of-order or missing sections during `briefMarkdown.parse`.
- Frontmatter is YAML between two `---` lines at the very top. A brief without frontmatter is rejected.
- The H1 line is always `# DeliveryOS Execution Brief`. The parser tolerates trailing whitespace and case-insensitive `# deliveryos execution brief` (lenient), but the serialiser always emits the canonical form.

### 4.3 Parser contract (lenient on whitespace, strict on section ids)

```ts
// extension/src/brief/briefMarkdown.ts

export const BRIEF_SCHEMA_VERSION = 1;

export interface BriefMarkdownParseResult {
  brief: ExecutionBrief;            // populated iff ok === true
  warnings: string[];               // non-fatal lenience hits (trailing whitespace, case, etc.)
}

export function parse(md: string): BriefMarkdownParseResult;
export function serialise(brief: ExecutionBrief): string;

// Convenience for CHUNK-13 — pulls only sections 7 + 8 without paying for full validation.
export function parseAllowedForbidden(md: string): {
  allowed: string[];
  forbidden: string[];
};
```

**Lenient rules** (parser warns, does not fail):

- Trailing whitespace on heading lines.
- Blank lines between sections.
- Mixed CRLF / LF line endings (normalised to LF on parse).
- Case differences in the H1 title line.
- A trailing newline at end-of-file is optional.

**Strict rules** (parser throws `BriefMarkdownParseError`):

- Missing frontmatter, or frontmatter that fails YAML parse, or missing required frontmatter keys (`brief_id`, `schema_version`, `requirement_id`).
- `schema_version` mismatch with `BRIEF_SCHEMA_VERSION` (callers must handle upgrade explicitly).
- A missing section (`## N. <name>` not found for any N in 1..10).
- Sections out of numeric order.
- A section heading whose numeric prefix exists but whose name does not exactly match the canonical name list.
- Duplicate section headings.

`parseAllowedForbidden(md)` runs a cheap regex-based scan and does **not** require valid frontmatter — CHUNK-13 calls it against `.deliveryos-handoff/current-execution-brief.md`, which may have been edited by the user.

### 4.4 Reserved section names (canonical list)

```ts
export const BRIEF_SECTION_NAMES: readonly string[] = [
  "Objective",                  //  1
  "Approved Requirement",       //  2
  "Business Intent",            //  3
  "Approved Design Context",    //  4
  "Existing Codebase Context",  //  5
  "Test-First Specification",   //  6
  "Allowed Changes",            //  7
  "Forbidden Changes",          //  8
  "Expected Output",            //  9
  "Completion Criteria",        // 10
] as const;
```

This list is exported and **frozen**. CHUNK-10 and CHUNK-13 import the list, never redefine it.

### 4.5 Canonical `result.md` section names (shared with CHUNK-12)

`briefMarkdown.ts` is **also** the canonical home for the section names CHUNK-12's
`result.md` parser expects. CHUNK-09's renderer embeds these names verbatim
into Section 9 of every brief (as instructions to the harness — "your
`result.md` must contain exactly these six sections in this order"). CHUNK-12's
parser imports the same constant and uses it to drive section splitting. One
source of truth, no drift.

```ts
// extension/src/brief/briefMarkdown.ts

export const RESULT_MD_SECTION_NAMES: readonly string[] = [
  "Summary of Changes",         //  1
  "Files Changed",              //  2
  "Tests Added/Updated",        //  3
  "Tests Run",                  //  4
  "Risks",                      //  5
  "Unresolved Questions",       //  6
] as const;
```

The Section 9 ("Expected Output") body of a brief is no longer free-form. The
serialiser emits a fixed template that lists the six `RESULT_MD_SECTION_NAMES`
as required headings the harness must produce, with a one-line instruction per
heading. The brief composer's Section 9 editor is **read-only** in MVP — the
template is rendered verbatim. Users wanting to customise the expected output
shape edit the canonical brief schema (a future migration), not Section 9 per
brief.

CHUNK-12's parser imports the constant:

```ts
// extension/src/result/parseResult.ts (CHUNK-12)
import { RESULT_MD_SECTION_NAMES } from "../brief/briefMarkdown";
```

This locks the brief renderer and the result parser to the same six-section
schema. Adding a seventh section is a schema-version bump in both modules at
the same time.

---

## 5. Allowed / Forbidden lists — the editable form

### 5.1 UI shape

Two side-by-side text areas labelled "Allowed Changes" and "Forbidden Changes". One glob pattern per non-blank line. Comment lines start with `#` and are preserved verbatim in the markdown (they round-trip through `briefMarkdown.parse` → `serialise`).

In the rendered markdown body, each list becomes a bulleted list:

```md
## 7. Allowed Changes
- src/backend/api/bugs.py
- src/backend/models/bug_report.py
- tests/integration/test_bugs_api.py

## 8. Forbidden Changes
- src/backend/api/users.py
- migrations/**
- src/frontend/**
```

The serialiser emits one bullet per glob in insertion order. The parser accepts either bulleted lists (`- foo`, `* foo`, `+ foo`) or one-glob-per-line (without bullet) and normalises to bullets on round-trip.

### 5.2 Glob syntax (the contract CHUNK-13 consumes)

The list contents are **glob patterns matched by `picomatch`** (CHUNK-13's choice). Documented syntax:

- `*` matches any character sequence except `/`.
- `**` matches any character sequence including `/`. Used for recursive directory matching.
- `?` matches a single character except `/`.
- `[abc]` character classes are supported.
- `{a,b}` brace expansion is supported.
- A leading `!` negates a pattern (Allowed: `!src/legacy/**` to exclude legacy). Negation in Forbidden is unusual but legal.
- Paths are **workspace-relative**, POSIX-style (forward slashes), even on Windows. `picomatch` normalises.
- Trailing-slash directory shorthand (`src/legacy/`) is rewritten to `src/legacy/**` **at parse time**. The normalisation happens inside `briefMarkdown.parse` (and inside `parseAllowedForbidden` for the cheap path used by CHUNK-13). The `ExecutionBrief.allowed.globs` and `ExecutionBrief.forbidden.globs` arrays therefore **never** contain a trailing slash; serialise emits whatever is in those arrays verbatim, preserving the normalised form on round-trip.

  **Consumer contract:** CHUNK-13's runtime adapter, hook scripts, and any other consumer of the parsed Allowed/Forbidden lists MUST NOT expect to encounter `dir/` shorthand. The single normalisation site is `briefMarkdown` at parse time. CHUNK-13's hook scripts and diff classifier drop the trailing-slash branch entirely.

  The composer UI accepts either form when the user types (`src/legacy/` or `src/legacy/**`). On every edit, the host re-parses the list, which normalises the typed form to `dir/**` before storing it in the draft. The webview preview then shows the canonical `dir/**` form, making the rewrite visible to the user.

The composer validates each glob with `picomatch.makeRe(pattern)` on save; invalid globs block the save with a per-line error.

### 5.3 Empty-list rules

- `Allowed Changes` **must be non-empty** on save. A brief that allows nothing is not actionable.
- `Forbidden Changes` may be empty. The serialiser writes the heading with a single placeholder bullet `- (none)` to keep the schema regular; the parser treats `- (none)` as the canonical empty marker and yields `forbidden: []`.

---

## 6. Key interfaces and types

### 6.1 Extension-host types (`extension/src/brief/types.ts`)

```ts
export type BriefSectionId =
  | "objective"
  | "approved-requirement"
  | "business-intent"
  | "approved-design-context"
  | "existing-codebase-context"
  | "test-first-specification"
  | "allowed-changes"
  | "forbidden-changes"
  | "expected-output"
  | "completion-criteria";

export interface BriefSection {
  id: BriefSectionId;
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  name: string;          // matches BRIEF_SECTION_NAMES[number-1]
  body: string;          // raw markdown body of the section (sans heading)
}

export interface BriefAllowedList { kind: "allowed";   globs: string[]; }
export interface BriefForbiddenList { kind: "forbidden"; globs: string[]; }

export interface BriefFrontmatter {
  brief_id: string;
  schema_version: number;             // === BRIEF_SCHEMA_VERSION
  project_id: string;
  requirement_id: string;
  test_spec_id?: string;
  supersedes?: string;                // prior brief id
  profile: string;                    // "(unspecified)" until CHUNK-10 renders it
  created_at: string;                 // ISO 8601
  locked_at?: string;                 // ISO 8601; absent on drafts
}

export interface ExecutionBrief {
  frontmatter: BriefFrontmatter;
  title: string;                      // "DeliveryOS Execution Brief"
  metaLines: { profile: string; project: string; requirement: string };
  sections: Record<BriefSectionId, BriefSection>;
  allowed: BriefAllowedList;          // mirror of sections["allowed-changes"], parsed
  forbidden: BriefForbiddenList;      // mirror of sections["forbidden-changes"], parsed
}
```

The `allowed` / `forbidden` mirror fields are populated by `briefMarkdown.parse` and consumed by `briefMarkdown.serialise`. They are the parsed representation; the markdown body in `sections["allowed-changes"]` is the canonical source for round-trip stability.

### 6.2 Shared contract types (`contracts/src/brief.ts`)

```ts
// Subset of ExecutionBrief safe to ship over the postMessage boundary.
export interface ExecutionBriefDraft {
  // Same shape as ExecutionBrief but without runtime-only fields.
  // Used for the webview composer's local draft state and for save messages.
}

export type BriefMessage =
  | { command: "brief.generateDraft"; requirementId: string }
  | { command: "brief.editSection"; sectionId: BriefSectionId; body: string }
  | { command: "brief.editList"; list: "allowed" | "forbidden"; globs: string[] }
  | { command: "brief.save"; draft: ExecutionBriefDraft };

export type BriefResponse =
  | { command: "brief.draftReady"; draft: ExecutionBriefDraft }
  | { command: "brief.saveResult"; ok: true; briefId: string }
  | { command: "brief.saveResult"; ok: false; errors: string[] };

export interface BriefValidation {
  ok: boolean;
  errors: string[];          // blocking; "Section 7 must contain at least one glob", etc.
  warnings: string[];        // non-blocking; "Section 5 looks short"
}
```

### 6.3 Public exports from `briefMarkdown.ts`

```ts
export const BRIEF_SCHEMA_VERSION: number;
export const BRIEF_SECTION_NAMES: readonly string[];
export const RESULT_MD_SECTION_NAMES: readonly string[];   // shared with CHUNK-12

export class BriefMarkdownParseError extends Error {
  readonly kind: "missing-frontmatter" | "schema-mismatch" | "missing-section"
                | "out-of-order" | "bad-section-name" | "duplicate-section"
                | "invalid-yaml";
  readonly detail?: string;
}

export function parse(md: string): { brief: ExecutionBrief; warnings: string[] };
export function serialise(brief: ExecutionBrief): string;
export function parseAllowedForbidden(md: string): { allowed: string[]; forbidden: string[] };

// Renderer for Section 9 of any brief — emitted verbatim by serialise().
// CHUNK-12's parser also imports it to confirm the renderer + parser agree.
export function renderExpectedOutputSection(): string;
```

These are the only entry points CHUNK-10, CHUNK-12, and CHUNK-13 are allowed to call. They MUST NOT re-implement parsing or redefine `RESULT_MD_SECTION_NAMES`.

### 6.4 Handoff sibling renderers (`extension/src/brief/handoffSiblings.ts`)

CHUNK-11's `HandoffSnapshot` requires four sibling markdown files in
`.deliveryos-handoff/` alongside `current-execution-brief.md`:

- `current-context-package.md`
- `current-test-specification.md`
- `current-verification-checklist.md`
- `memory-summary.md`

CHUNK-09 owns deriving these from existing memory; CHUNK-11 only writes the
returned strings to disk. The contract:

```ts
// extension/src/brief/handoffSiblings.ts

// DOS:O4 iteration-3 audit fix: use the canonical per-type aliases
// exported by CHUNK-03's `contracts/src/memory.ts`. Path uses the subpath
// import that CHUNK-02's `exports` map resolves to `dist/memory.{js,d.ts}`.
import type { RequirementMemory, CodebaseMemory, TestSpecMemory } from "@deliveryos/contracts/memory";
import type { MemoryStore } from "../memory/memoryStore";
import type { ExecutionBrief } from "./types";

/**
 * Context Package ← Codebase Memory snapshot for the requirement.
 * Pulls the same Codebase Memory entry CHUNK-09 reads for Section 5, and
 * emits a self-contained markdown file with the folder structure, conventions,
 * and constraints subset. If the requirement has no linked Codebase Memory
 * (MVP-common case: Section 5 was user-pasted), emit the pasted Section 5
 * body verbatim under an `## Existing Codebase Context` heading.
 */
export function renderContextPackage(
  req: RequirementMemory,
  codebase: CodebaseMemory | null,
  brief: ExecutionBrief
): string;

/**
 * Test Specification ← Test Spec memory entry linked to the requirement
 * (CHUNK-08 output). Renders the test spec body verbatim with a short
 * preamble pointing back to the requirement id and brief id.
 */
export function renderTestSpecification(testSpec: TestSpecMemory): string;

/**
 * Verification Checklist ← Brief Section 10 ("Completion Criteria") rendered
 * as a GFM Markdown checklist (`- [ ] <criterion>`). One checkbox per line
 * of Section 10. Section 10 free-form prose is split on lines; bulleted lines
 * become checkboxes verbatim, blank/heading lines pass through.
 */
export function renderVerificationChecklist(brief: ExecutionBrief): string;

/**
 * Memory Summary ← thin rollup of `MemoryStore.list()` scoped to the
 * requirement and its linked entries. Format:
 *
 *   # Memory summary
 *   Requirement: REQ-002 — <title>
 *   Brief: brief_<id> — <iso-timestamp>
 *
 *   ## Linked entries
 *   - intent:<id> — <title>
 *   - design:<id> — <title>
 *   - test-spec:<id> — <title>
 *   …
 *
 * Hard-capped at ≤ 50 lines. If the rollup would exceed 50 lines, the
 * renderer truncates and appends "- … <N> more (truncated)" as the final
 * line. Intent: the handoff package stays scannable, not exhaustive.
 */
export function renderMemorySummary(
  store: MemoryStore,
  brief: ExecutionBrief
): string;
```

These four functions are pure: same inputs → byte-identical output. CHUNK-11
calls all four during `HandoffSnapshot.write` and writes the returned strings
to the four sibling paths. CHUNK-09 owns the rendering contract; CHUNK-11
owns the filesystem orchestration.

The Memory Summary's 50-line cap is **deliberately small** — the goal is a
glanceable rollup, not a complete dump (the canonical store is the source of
truth). Truncation order: requirement first, then brief, then linked entries
sorted by `type` then `created_at`.

---

## 7. Data model touched

### 7.1 Execution Memory (CHUNK-03 schema)

A saved brief writes one row to `memory_entries`:

```
memory_entries:
  id:           brief_<uuid>
  type:         "execution"
  title:        "<requirement-title> — brief"
  payload_json: { schema_version, requirement_id, test_spec_id?, supersedes?, profile, locked_at }
  created_at:   <epoch ms>
  updated_at:   <epoch ms>  (set once on save; not updated after — briefs are immutable)
```

Plus the markdown body at:

```
<workspace>/.deliveryos/memory/execution/<brief-id>.md
```

The body is **the canonical brief** — everything in `payload_json` is denormalised cache. On any read mismatch (e.g. file edited externally), the markdown is authoritative. The store re-parses on load.

### 7.2 Memory links

```
memory_links:
  (brief_id, requirement_id, "derives-from")     Brief → source Requirement
  (brief_id, prior_brief_id, "supersedes")       Brief → prior Brief (if revision)
```

The link-kind set is owned by CHUNK-03 at `contracts/src/links.ts` (the
canonical taxonomy). CHUNK-09 uses **only** kinds that exist in that taxonomy:
`derives-from` and `supersedes`. The earlier draft of this chunk introduced
`sourced-from` and `uses-test-spec` — both have been retired in favour of
`derives-from` (matching CHUNK-03's canonical name).

**Test Spec linkage is reached via the Requirement, not directly.** The earlier
draft also wrote `(brief_id, test_spec_id, "derives-from")` but CHUNK-14's
walker reaches Test Spec via `Requirement ─has-test-spec──▶ Test Spec` (the
canonical Requirement↔Test-Spec hop owned by CHUNK-08). Writing a second edge
from the brief to the test spec was redundant — DOS:O4 iteration-3 audit
dropped it. The brief still embeds the test spec content into Section 6 of the
markdown body; the link removal only affects the SQLite graph.

### 7.3 Immutability rules

- `locked_at` is set during `briefMarkdown.serialise` immediately before write.
- After write, the file on disk is **not** edited by DeliveryOS. The composer panel for a locked brief opens in read-only mode.
- A user who wants to revise: clicks "Compose new version" on the locked brief; the composer pre-fills from the previous brief and sets `supersedes: <previous-id>` in the new draft's frontmatter. On save, this becomes a fresh brief with a fresh id, linked via `kind: "supersedes"`.
- We do **not** delete or version-in-place. Old briefs stay readable for the audit chain.

### 7.4 Codebase Memory (Section 5) — MVP placeholder

The user pastes a free-form blob into the Section 5 editor. There is no Codebase Memory `memory_entries` row written by this chunk. The seam for the future:

```text
FUTURE (post-MVP):
  - extension/src/codebase/codebaseExtractor.ts
      Walks the workspace, picks up README, conventions docs, recent git log,
      test runner scripts; writes one Codebase Memory entry.
  - briefBuilder reads the most recent Codebase Memory entry for the project
    and pre-fills Section 5 instead of leaving it blank.
```

CHUNK-09 leaves a TODO comment in `briefBuilder.ts` pointing at this seam.

---

## 8. VS Code APIs used

- `vscode.commands.registerCommand("deliveryos.brief.compose", …)` — entry point.
- `vscode.window.createWebviewPanel(…)` — composer panel; reuses CHUNK-02's HTML factory + CSP.
- `vscode.workspace.fs.writeFile(uri, Buffer.from(md, "utf8"))` — write the brief markdown.
- `vscode.workspace.fs.readFile(uri)` — re-load for the read-only view.
- `vscode.Uri.joinPath(workspaceFolder.uri, ".deliveryos", "memory", "execution", `${briefId}.md`)` — pathing.
- `vscode.WebviewPanelSerializer` — restore the composer panel after window reload (drafts are lost; only saved briefs reopen — drafts live in webview state only).
- `vscode.window.showInformationMessage(…)` — "Brief saved and locked." with a "Reveal in explorer" action.
- `vscode.commands.executeCommand("revealInExplorer", uri)` — for the success action.
- `vscode.TreeDataProvider.onDidChangeTreeData.fire(undefined)` — refresh the EXECUTE node after save.

**Not used in this chunk:** `FileSystemWatcher` (no file watching at this layer — CHUNK-11 watches `.deliveryos-handoff/`), terminals, tasks, debug APIs.

---

## 9. Step-by-step implementation outline

The order below mirrors how a session-day might unfold. Each numbered step is independently testable.

1. **Frozen schema constants and types** (~0.5 day).
   - Add `extension/src/brief/types.ts` with the full type hierarchy from § 6.1.
   - Add `BRIEF_SECTION_NAMES` and `BRIEF_SCHEMA_VERSION` constants to `briefMarkdown.ts`.
   - Sanity test: `BRIEF_SECTION_NAMES.length === 10`, all unique.

2. **`briefMarkdown.serialise`** (~0.5 day).
   - Implement deterministic markdown generation from an `ExecutionBrief` object.
   - YAML frontmatter via a small handcrafted serialiser (avoid bringing in `js-yaml` if a few fields suffice; if `js-yaml` is already in the extension, use it).
   - Round-trip placeholder for empty Forbidden list (`- (none)`).
   - Unit test: golden-fixture comparison against the PRD § 23 Bug Triage example.

3. **`briefMarkdown.parse`** (~1 day).
   - Frontmatter extraction (between leading `---` markers).
   - YAML parse; validate required keys.
   - Section split: scan for `^## (\d+)\. (.+)$`, build a list of (number, name, body) triples.
   - Validate: numbers are 1..10 in order, names match canonical list.
   - Parse Allowed/Forbidden body into glob arrays (bullets and bare lines accepted).
   - Return `{ brief, warnings }`; throw `BriefMarkdownParseError` with `kind` on hard failures.
   - Unit test: round-trip the serialiser output back to the same object (deep-equal).
   - Unit test: each `BriefMarkdownParseError` kind has a fixture that triggers it.

4. **`parseAllowedForbidden`** (~0.25 day).
   - Cheap implementation: scan for the `## 7.` and `## 8.` headings, extract bullets, return arrays.
   - Does **not** require frontmatter or other sections — CHUNK-13 calls it on files that may be partially user-edited.
   - Unit test: works on a brief stripped of every section except 7 + 8.

5. **`briefBuilder.assembleDraft(requirementId)`** (~0.5 day).
   - Read the Requirement Memory entry via `MemoryStore.read("requirement", id)`.
   - Walk links to find: linked PRD section (Design Memory not yet a thing in MVP — pull from Requirement payload), linked Test Spec.
   - Pre-fill:
     - Section 1 Objective ← `requirement.title` + first sentence of body.
     - Section 2 Approved Requirement ← `requirement.body` verbatim with the requirement id as a leading reference line.
     - Section 3 Business Intent ← `requirement.payload.businessIntent` if present, else empty placeholder.
     - Section 4 Approved Design Context ← `requirement.payload.designNotes` if present, else empty placeholder.
     - Section 5 Existing Codebase Context ← empty with a placeholder comment.
     - Section 6 Test-First Specification ← rendered from the linked Test Spec (CHUNK-08 output).
     - Section 7 Allowed Changes ← empty (user fills).
     - Section 8 Forbidden Changes ← empty (user fills; serialiser inserts `- (none)` if left empty at save would be blocked, see validator).
     - Section 9 Expected Output ← a **fixed template** rendered from `RESULT_MD_SECTION_NAMES` (see § 4.5). Lists the six required `result.md` headings the harness must produce, with one-line instructions per heading. Read-only in the composer; CHUNK-12's parser reads back into the same constant.
     - Section 10 Completion Criteria ← empty with a placeholder comment.
   - Returns an `ExecutionBriefDraft` with no `locked_at`.

6. **`briefComposerHost.ts`** (~0.5 day).
   - Register the `deliveryos.brief.compose` command.
   - On invoke (`requirementId` arg), call `briefBuilder.assembleDraft`, open a webview panel, post `brief.draftReady` to the webview.
   - Subscribe to webview messages: `brief.editSection`, `brief.editList`, `brief.save`.
   - **Host-side immutability guard (load-bearing).** Before processing `brief.editSection` or `brief.editList` for an existing brief, the host MUST look up the brief's `memory_entries` row and reject the message if `locked_at` is set. The host replies with `{ command: "brief.saveResult", ok: false, errors: ["Brief is locked; create a new version via Compose new version."] }` (re-using the save-result envelope so the webview surfaces the error in one place). Webview-only enforcement (disabling controls) is treated as a UX courtesy, **not** a security boundary — a webview can be tampered with via devtools, so the host is the authoritative gate. The check is a single `SELECT locked_at FROM memory_entries WHERE id = ?` per edit message; cheap.
   - On `brief.save`: run `briefValidator.validate(draft)`. If invalid, return `{ command: "brief.saveResult", ok: false, errors }`. If valid: assign id (`briefIds.next()`), set `locked_at`, call `briefMarkdown.serialise`, `vscode.workspace.fs.writeFile`, then `MemoryStore.create({ type: 'execution', title, payload, body: serialisedMarkdown })` + `MemoryStore.link(briefId, requirementId, 'derives-from')` + `MemoryStore.link(briefId, priorBriefId, 'supersedes')` if a prior version exists, then refresh the tree. **Per-CHUNK-03 API shapes (DOS:O4 iteration-3 audit fix):** `create` takes an object argument `{ type, title, payload, body? }`; `link` takes positional `(fromId, toId, kind)`. No positional `create("execution", …)` and no object-form `link({ from_id, to_id, kind })`.
   - The `brief.save` handler MUST also re-check the (`memory_entries`) row at write time: if the row already exists and has `locked_at` set (race against a concurrent open of the same brief id, or a malicious webview reusing a stale id), reject the save.

7. **Webview composer panel** (~1 day).
   - `main.tsx` mounts `<BriefComposerApp/>` and connects `vscode-messenger`.
   - `BriefComposerApp` shows: a left pane with the section list (collapsible per section), a right pane with the live preview rendered from `briefMarkdown.serialise(draft)` (host serialises and pushes the string; webview does not import the host module — sends an `editSection` message and receives a fresh serialised preview, OR re-serialises locally via a tiny webview-side mirror that we keep behind a `webview/src/lib/briefMarkdownMirror.ts` shim — see § 11 Risks).
   - `AllowedForbiddenEditor` is two textareas with per-line glob validation (uses `picomatch.makeRe` — bundle `picomatch` for the webview too).
   - `CodebaseContextPaste` is a labelled textarea with placeholder copy `"Paste folder structure, conventions, test commands. Future: auto-extract."`.
   - `SaveAndLockButton` is disabled while validation is failing; tooltip lists errors.

8. **Tree view wire-up** (~0.5 day).
   - Extend the EXECUTE node's `getChildren` in the existing `TreeDataProvider`.
   - For each requirement in the project, list the briefs ordered by `created_at` ascending (so v1 sits above v2 visually).
   - Each brief item's `command` opens the composer in read-only mode.
   - If no briefs exist, show a `"Compose Execution Brief…"` child that runs `deliveryos.brief.compose`.

9. **Read-only mode** (~0.25 day).
   - Composer panel accepts an existing brief id and posts `brief.draftReady` with `locked_at` set.
   - Webview disables every editable control when `locked_at` is set.
   - A "Compose new version" button is enabled in read-only mode; clicking re-opens the composer in draft mode with `supersedes: <id>` pre-set.

10. **Manual smoke test** (~0.25 day).
    - Pick a requirement from a CHUNK-08 run, compose a brief with realistic Allowed/Forbidden lists, save, verify markdown on disk matches the schema, reload VS Code, verify the brief reopens cleanly in read-only mode.

Total: ~5 session-days; aligns with the part-1-plan estimate (4–5).

---

## 10. Test plan

### 10.1 Manual end-to-end

1. From the requirements catalogue (CHUNK-07), pick a requirement that already has a test spec (CHUNK-08).
2. Click "Compose Execution Brief".
3. Verify all ten sections pre-fill where data exists (1, 2, 3?, 4?, 6) and stand empty with placeholder text where it does not (5, 7, 8, 9 is templated, 10).
4. Paste a Codebase Context blob into Section 5.
5. Add Allowed globs (e.g. `src/backend/api/bugs.py`, `tests/integration/test_bugs_api.py`).
6. Add Forbidden globs (e.g. `migrations/**`, `src/frontend/**`).
7. Click "Save and lock". Confirm success toast + "Reveal in explorer" action.
8. Open `<workspace>/.deliveryos/memory/execution/<brief-id>.md` and verify:
   - Frontmatter has `brief_id`, `schema_version: 1`, `requirement_id`, `created_at`, `locked_at`.
   - Sections are in numeric order, with the canonical names.
   - Allowed/Forbidden are bulleted.
9. Close VS Code, reopen. Verify:
   - The EXECUTE tree shows the brief under its requirement.
   - Clicking the brief opens the composer in read-only mode.
   - The "Compose new version" button is visible; clicking it spawns a draft with `supersedes` set.
10. Try saving a brief with an empty Allowed list — confirm the validator blocks with a clear error.
11. Try saving a brief with an unparseable glob (e.g. `src/[[[unclosed`) — confirm the per-line glob validator flags it.

### 10.2 Suggested unit tests

`extension/src/brief/__tests__/briefMarkdown.test.ts`:

- **round-trip(simple)** — `serialise(parse(serialise(brief))) === serialise(brief)` for the PRD § 23 fixture.
- **round-trip(empty-forbidden)** — a brief with empty Forbidden round-trips as `- (none)` and parses back to `forbidden: []`.
- **round-trip(comments)** — `#` comment lines inside the Allowed/Forbidden editor body survive parse → serialise (only matters if we choose to support inline comments; otherwise skip).
- **parse(missing-section)** throws `BriefMarkdownParseError({ kind: "missing-section" })`.
- **parse(out-of-order)** throws `BriefMarkdownParseError({ kind: "out-of-order" })`.
- **parse(bad-section-name)** throws when `## 7. Allowed` (missing "Changes") appears.
- **parse(duplicate-section)** throws on two `## 1. Objective`.
- **parse(schema-mismatch)** throws when frontmatter `schema_version: 2`.
- **parse(invalid-yaml)** throws on broken frontmatter.
- **parse(lenient-CRLF)** succeeds with `\r\n` line endings; warning recorded.
- **parse(lenient-case-h1)** succeeds with `# deliveryos execution brief`; warning recorded.
- **parseAllowedForbidden** returns correct arrays for a brief stripped to only Sections 7 + 8 (and broken frontmatter).
- **parseAllowedForbidden(empty-forbidden)** returns `forbidden: []` for the `- (none)` placeholder.

`extension/src/brief/__tests__/briefValidator.test.ts`:

- **empty-allowed-blocks-save**.
- **invalid-glob-blocks-save** with line number reported.
- **missing-frontmatter-key-blocks-save**.

`extension/src/brief/__tests__/briefBuilder.test.ts`:

- **assembleDraft** pre-fills Sections 1, 2, 6 from a fixture requirement + test spec.
- **assembleDraft** leaves Section 5 empty with the canonical placeholder text.

---

## 11. Risks, edge cases, open questions

### 11.1 Brief schema drift

The schema is pinned in [architecture/execution-briefs.md](../../architecture/execution-briefs.md) and frozen at `schema_version: 1` by `BRIEF_SCHEMA_VERSION`. If PRD/architecture docs evolve to add a Section 11 or rename a section, the parser will hard-fail on every existing brief — **by design**. Migration plan:

- Bump `BRIEF_SCHEMA_VERSION` and write a `migrations/brief-v1-to-v2.ts` that rewrites every existing brief markdown file on first activation post-upgrade.
- Until that migration exists, **the schema is frozen**. No silent extensions.

### 11.2 Codebase Memory placeholder (Section 5)

The MVP pastes. The seam in `briefBuilder.ts` is marked with a `TODO(codebase-memory)` comment pointing at a future `codebaseExtractor` module. CHUNK-09 does **not** ship that module. The composer's Section 5 editor carries a small note: "Future: DeliveryOS will auto-extract this. For now, paste manually."

### 11.3 Webview-side serialisation mirror

`briefMarkdown.ts` lives on the extension host. The webview cannot import it directly (different runtime). Two options:

- **Option A — host-serialises-on-keystroke.** Every section edit posts a message; host serialises and returns the full markdown string for preview. Simple, but every keystroke crosses the postMessage boundary.
- **Option B — webview mirror.** Bundle a minimal serialise-only copy in `webview/src/lib/briefMarkdownMirror.ts`, kept in lockstep with the host module. Faster preview, but two sources of truth (recipe for drift).

**Recommendation:** Option A for MVP — simpler reasoning, postMessage is cheap, brief is small. Revisit if preview latency annoys.

### 11.4 Empty-Forbidden representation

Choice: store `- (none)` in the markdown when Forbidden is empty. Alternative: omit the bullet and leave the heading body blank. Picked the explicit sentinel because CHUNK-13's `parseAllowedForbidden` then has a single shape to recognise rather than special-casing "no bullets".

### 11.5 Brief id format

`brief_<uuid-v4>` — flat across the workspace, no per-project prefix. The frontmatter `project_id` ties it to a project. Picking flat ids keeps the file system layout flat: `.deliveryos/memory/execution/brief_xxxx.md`. CHUNK-03's memory store schema already supports this.

### 11.5a Immutability enforcement — host is authoritative

Brief immutability is a **load-bearing audit guarantee**, not a UX
nicety: the brief is the contract the harness ran against, and CHUNK-12's
result attribution + CHUNK-13's diff classification + CHUNK-14's release
evidence all assume a locked brief stays byte-identical from save through
release.

The webview disables editable controls when `locked_at` is set, but a
webview is just an iframe-equivalent — a curious user with devtools can
re-enable a button. That makes webview-only enforcement insufficient.
**The host-side guard in step 6** (rejecting `brief.editSection` and
`brief.editList` when `locked_at` is set on the targeted brief's
`memory_entries` row) is the actual boundary. Treat the webview
disabled-state as a hint to the well-behaved user; treat the host check
as the contract.

The same guard runs at `brief.save` time, defending against a stale-id
attack where a webview holds an old draft id from before a save.

### 11.6 Concurrent edit during compose

The composer doesn't lock anything during draft. If the user opens two composer panels for the same requirement, they end up with two separate drafts and two separate saved briefs (different ids, both valid, both linked back to the requirement). This is a degenerate but acceptable outcome for MVP.

### 11.7 Workspace not trusted

If `vscode.workspace.isTrusted === false`, the composer disables Save and shows a banner: "DeliveryOS needs workspace trust to write briefs. Trust this workspace to continue." (CHUNK-01 already declared `capabilities.untrustedWorkspaces.supported: false`, so this is belt-and-braces.)

### 11.8 Open question: should Section 4 (Approved Design Context) auto-include linked Architecture Decisions?

For MVP, no — Design Memory is barely populated. Re-evaluate when Design Memory has more behind it (post-MVP).

### 11.9 Open question: support drafting offline (no requirement linked)?

For MVP, no — the composer requires a `requirementId` arg. A standalone "blank brief" flow is a degenerate scenario and complicates the data model.

---

## 12. Explicit dependencies

### 12.1 Upstream (CHUNK-09 depends on)

- **CHUNK-02 — Webview foundation.** The composer panel uses Vite + React + Tailwind + `vscode-messenger` + CSP'd HTML factory from CHUNK-02.
- **CHUNK-03 — Memory store.** Persists Execution Memory entries + memory links. Schema (polymorphic `memory_entries` + `memory_links`) is owned by CHUNK-03; CHUNK-09 imports the schema, never redefines it.
- **CHUNK-07 — Requirements catalogue.** Source of the `requirementId` passed to the composer.
- **CHUNK-08 — Test Designer.** Source of the Test Spec used to pre-fill Section 6.

### 12.2 Downstream (CHUNKs that depend on CHUNK-09)

- **CHUNK-10 — Harness profiles.** Imports `briefMarkdown.parse` to read a saved brief and `briefMarkdown.serialise` (or a profile-aware wrapper around it) to re-emit it under each profile's conventions. Reads the canonical 10-section structure; profile rendering is presentation, not schema.
- **CHUNK-11 — File handoff.** Reads the saved brief markdown verbatim and writes it to `.deliveryos-handoff/current-execution-brief.md`. Does **not** re-serialise — the canonical markdown on disk is the canonical artefact. Also calls CHUNK-09's `handoffSiblings.ts` renderers (`renderContextPackage`, `renderTestSpecification`, `renderVerificationChecklist`, `renderMemorySummary`) and writes their output to the four sibling paths in `.deliveryos-handoff/`. CHUNK-11 owns the writes; CHUNK-09 owns the renderers.
- **CHUNK-13 — Allowed/Forbidden diff.** Imports `briefMarkdown.parseAllowedForbidden` to extract Sections 7 + 8 as glob arrays; uses `picomatch` (same syntax documented here in § 5.2). Generates the Claude Code PreToolUse hook by reading the same brief, same parser.

### 12.3 What this chunk exposes (frozen exports)

- The Execution Brief markdown schema, frozen at v1, documented in § 4 + § 5.
- `briefMarkdown.parse`, `briefMarkdown.serialise`, `briefMarkdown.parseAllowedForbidden` from `extension/src/brief/briefMarkdown.ts`.
- The `BRIEF_SECTION_NAMES` and `BRIEF_SCHEMA_VERSION` constants.
- `ExecutionBrief`, `BriefSection`, `BriefAllowedList`, `BriefForbiddenList`, `BriefFrontmatter` types from `extension/src/brief/types.ts`.
- The webview message contract (`brief.generateDraft`, `brief.editSection`, `brief.editList`, `brief.save`) from `contracts/src/brief.ts`.
- The on-disk path convention `<workspace>/.deliveryos/memory/execution/<brief-id>.md`.
- The four handoff sibling renderers from `extension/src/brief/handoffSiblings.ts`: `renderContextPackage`, `renderTestSpecification`, `renderVerificationChecklist`, `renderMemorySummary`. CHUNK-11 imports these; no other chunk re-implements them.
- The memory link kinds **used by** this chunk: `derives-from` (Brief → Requirement) and `supersedes` (Brief → prior Brief). The kinds themselves are defined in `contracts/src/links.ts` (owned by CHUNK-03); CHUNK-09 imports them, does not invent them. Test Spec linkage is reached via Requirement → Test Spec (`has-test-spec`, owned by CHUNK-08); the brief does not write a direct edge to Test Spec.

These are the **only** brief-related exports. Downstream chunks must import them, not re-implement them.

---

## 13. Shared cross-chunk contracts honoured

- **Memory schema (CHUNK-03):** `memory_entries(id, type="execution", title, payload_json, created_at, updated_at)` + `memory_links(from, to, kind)`. No new tables.
- **Link-kind taxonomy (CHUNK-03):** `contracts/src/links.ts` is the canonical home for `LINK_KINDS`. CHUNK-09 imports `derives-from` and `supersedes`; does **not** define new kinds.
- **Webview message contracts (CHUNK-02):** all webview ↔ extension messages for the composer live in `contracts/src/brief.ts`. No duplicate message types.
- **`.deliveryos/` memory directory layout (CHUNK-03):** brief markdown bodies under `<workspace>/.deliveryos/memory/execution/`. No new top-level dirs.
- **Workspace trust capability (CHUNK-01):** composer disables Save when untrusted.
- **Schema source of truth:** [docs/architecture/execution-briefs.md](../../architecture/execution-briefs.md) for the 10-section schema and the immutability rule. This chunk implements it; it does not extend it.

---

## 14. Definition of done

CHUNK-09 is done when **all** of the following are true. Mirrors the
`part-1-plan.md` done-when row for CHUNK-09 and resolves the audit's m16
finding (criteria scattered in Test plan → consolidated here).

- [ ] The brief composer renders **all ten canonical sections** with the
      exact headings listed in § 2 and § 4.4, in numeric order, with no
      missing or extra sections.
- [ ] **Round-trip stability:** for every committed fixture brief in
      `extension/src/brief/__fixtures__/`, `serialise(parse(x)) === x`
      byte-for-byte (with LF endings). At least one fixture covers each
      lenient-parse case (CRLF, case-insensitive H1) and the empty-Forbidden
      sentinel.
- [ ] **Immutability gate works end-to-end.** A saved brief's `locked_at`
      is set in `memory_entries`; both the webview disables edit controls
      AND the host rejects `brief.editSection` / `brief.editList` /
      `brief.save` for that brief id (per § 11.5a). A unit test asserts the
      host rejection with `locked_at` set; an integration test asserts the
      webview disabled state.
- [ ] **Sibling handoff files render.** Calling each of the four exports
      from `handoffSiblings.ts` (`renderContextPackage`,
      `renderTestSpecification`, `renderVerificationChecklist`,
      `renderMemorySummary`) against a fixture brief returns a non-empty
      markdown string that parses as valid markdown. `renderMemorySummary`
      output is `≤ 50` lines.
- [ ] **CHUNK-12's `RESULT_MD_SECTION_NAMES` is embedded in every brief's
      Section 9.** Saving a brief and reading Section 9 back yields a body
      that contains all six canonical `result.md` section names from the
      shared constant. CHUNK-12's parser, imported in a co-located test,
      finds all six headings when handed the brief's Section 9 expansion.
- [ ] **Glob parse-time normalisation** is in place: a brief with a
      trailing-slash glob (`src/legacy/`) round-trips to `src/legacy/**`.
      The parsed `ExecutionBrief.allowed.globs` array never contains a
      trailing-slash entry.
- [ ] **Link kinds match the canonical taxonomy.** A saved brief writes
      `derives-from` edges to its Requirement and (if present) Test Spec,
      and a `supersedes` edge if it replaces a prior brief. No other link
      kinds are written. The kinds are imported from
      `contracts/src/links.ts`, never inlined as string literals.
- [ ] **Manual smoke (§ 10.1) passes end-to-end** on a real workspace
      against a CHUNK-08 test-spec fixture: compose → save → reopen →
      read-only → "Compose new version" → revised draft has `supersedes`.
