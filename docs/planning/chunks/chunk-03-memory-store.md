# CHUNK-03 — Memory store foundation: sql.js + workspace `.deliveryos/` + schema

**Status:** Spec (Phase A — Prompt 2).
**Phase / Week:** Phase 0, Week 2 (second half), starting 2026-06-01.
**Effort:** 3–4 session-days.
**Depends on:** [CHUNK-01](./chunk-01-extension-scaffold.md), [CHUNK-02](./chunk-02-webview-foundation.md).
**Consumed by:** every chunk from CHUNK-05 onwards (all memory reads/writes).
**Source-of-truth refs:** [`part-1-plan.md` CHUNK-03 + research findings #1 and #6](../part-1-plan.md), [`PRD.md` §§ 18.Y, 25.2](../../PRD.md), [`BUILD-PLAN.md` Phase 0 Week 2](../../BUILD-PLAN.md), [`architecture/memory-layers.md`](../../architecture/memory-layers.md).

> **This is the DEFINING chunk for the memory schema and the `.deliveryos/` on-disk layout.** Every later chunk that touches memory imports from here. Do not redefine the schema, the storage paths, or the `MemoryStore` API elsewhere.

---

## 1. Restated goal and scope

### Goal

Stand up the durable memory layer that every later chunk reads from and writes to. A single workspace-local SQLite file (via `sql.js` / WASM) holds the polymorphic index of memory entries plus their typed links; a sibling markdown tree holds the human-readable bodies. The schema is the **canonical memory contract** and the directory layout is the **canonical `.deliveryos/` layout** — both freeze at the end of this chunk.

### In scope

- `sql.js` integration in the extension host. The `.wasm` blob is shipped inside the VSIX (no network fetch at runtime).
- Concrete on-disk layout under `<workspace>/.deliveryos/`.
- Polymorphic single-table schema (`memory_entries`, `memory_links`, `_schema_version`) plus a tiny migration runner.
- TypeScript discriminated-union types covering all 8 memory types from [`memory-layers.md`](../../architecture/memory-layers.md) (Intent, Requirement, Design, Codebase, Execution, Result, Verification, Release).
- `MemoryStore` class with CRUD + link/walk graph operations, exposed via a singleton owned by `extension.ts`.
- Shared `contracts/src/memory.ts` slice containing the **types only** (no runtime imports) so webviews can typecheck against the same shapes.
- `.deliveryos/README.md` template generated on first project creation, explaining the on-disk layout to humans.
- "Create project" command from CHUNK-01 upgraded to persist via `MemoryStore` and write an Intent Memory entry (replacing the in-memory stub).
- Stub-only path for the future cross-project store at `context.globalStorageUri/harness.sqlite` — path constant defined and exported, but no DB opened yet.
- Manual smoke tests + a small unit-test harness for the `MemoryStore` CRUD and the migration runner.

### Out of scope (deferred to later chunks)

- Any **memory viewer UI** — read-only memory browser is a later Phase 1 chunk.
- **Result-capture / memory-update writes** — Result Memory writes land in CHUNK-12; Design/Codebase/Requirement updates land in CHUNK-14.
- **Per-type ER schema** — the polymorphic single-table approach is deliberate for the trimmed MVP. Per-type tables (with foreign keys, indices on common fields, etc.) are deferred. See [`memory-layers.md` § Storage](../../architecture/memory-layers.md) "Later: a graph backend".
- **Cross-project memory features** — only the path constant is defined here. Opening the harness-level DB, the recents list, profile storage, etc. land in a later chunk.
- **MCP exposure** of the memory graph — PRD § 18.Y Mode 3. Future build.
- **Codebase Memory auto-extraction** — CHUNK-09 still treats it as user-pasted text. CHUNK-03 only defines the *type*.
- **Atomic / fsync / WAL semantics** — see Risks below; the MVP flush is a straightforward `db.export()` + `vscode.workspace.fs.writeFile()` per mutation.

---

## 2. File-by-file breakdown

All paths are relative to the repo root. The monorepo layout from CHUNK-02 is assumed (`extension/`, `webview/`, `contracts/`).

### 2.1 `extension/src/memory/types.ts` — NEW

Exports the discriminated-union TypeScript types for all 8 memory types and the link kinds. **No runtime code** in this file beyond `const` enums — pure type definitions plus narrow constant lists.

Re-exported from `contracts/src/memory.ts` (see 2.6) so webviews share the same shapes. The extension imports from `./types`; webviews import from `@deliveryos/contracts/memory`. The two files declare identical types — the contracts package is the source of truth, `extension/src/memory/types.ts` is a thin re-export that adds the few extension-only helpers (e.g. `MemoryEntryRow` for the raw SQL row shape).

### 2.2 `extension/src/memory/schema.ts` — NEW

The exact DDL strings as `export const SCHEMA_V1: string[]` (one statement per array entry). Migration scripts for future versions live next to v1 (`SCHEMA_V2`, etc.). Also exports `CURRENT_SCHEMA_VERSION = 1` and the `INDEX_DDL` strings.

Keeping the DDL in a single file (not embedded in `MemoryStore`) makes the migration runner readable and lets tests assert against the DDL text directly.

### 2.3 `extension/src/memory/migrations.ts` — NEW

The 8-line migration runner described in [§ 7](#7-migration-runner). Exports a single function `runMigrations(db: Database): void`. Reads `_schema_version.v`, runs any pending migration script arrays from `schema.ts`, writes the new version. No transactions per migration in v1 (we only have a v1) — comment notes that v2 onwards should wrap each migration in `BEGIN; …; COMMIT;`.

### 2.4 `extension/src/memory/sqlJsHost.ts` — NEW

Thin adapter around `sql.js`. Responsibilities:

- Load `sql.js`'s `.wasm` blob from the extension's `dist/` directory (via `context.extensionUri`). This avoids any network fetch, which is the entire reason we picked `sql.js` over a hosted alternative.
- Open or create the workspace DB file at `<workspace>/.deliveryos/memory.sqlite` using `vscode.workspace.fs.readFile` (returns a `Uint8Array`). If the file does not exist, create an empty in-memory DB.
- Expose `flush(): Promise<void>` which calls `db.export()` and writes the resulting `Uint8Array` to disk via `vscode.workspace.fs.writeFile`. This is the explicit-flush-per-mutation strategy described in [§ 6](#6-sqljs-integration).
- Expose the open `Database` handle for `MemoryStore` to use.

Encapsulating `sql.js`-specific quirks here (locateFile, the `initSqlJs` initialiser, the `Uint8Array` ↔ Buffer dance) means `MemoryStore.ts` stays focused on the API surface.

### 2.5 `extension/src/memory/MemoryStore.ts` — NEW

The main API class. Implements the [§ 5 MemoryStore API](#5-memorystore-class-api). Constructor takes the open `SqlJsHost` and the workspace folder URI. Holds no state beyond the host reference and the workspace URI.

Every mutation method:
1. Begins a transaction in `sql.js` (`db.exec('BEGIN')`).
2. Runs the SQL statement.
3. Writes the markdown body to `<workspace>/.deliveryos/memory/<type>/<id>.md` (when the entry has a body).
4. Commits the transaction (`db.exec('COMMIT')`).
5. Calls `host.flush()` to persist the DB to disk.

If steps 2–4 throw, the catch block runs `db.exec('ROLLBACK')` and the partial markdown file (if any) is deleted with a best-effort `vscode.workspace.fs.delete` swallowed by a try/catch — so we don't leak orphan markdown bodies when the SQL row never committed.

### 2.6 `contracts/src/memory.ts` — NEW (slice of CHUNK-02's contracts package)

The canonical TypeScript shape for memory entries that **both** the extension host and the React webviews import. Defined here so the webview ↔ extension message contracts (CHUNK-02's `vscode-messenger` setup) can carry typed memory payloads without either side redefining the shape.

Contains exclusively `type` and `interface` declarations plus the `MEMORY_TYPES` and `LINK_KINDS` `as const` tuples. No runtime imports (`sql.js`, `vscode`, `fs`, etc.) so the file is webview-safe.

> CHUNK-02 owns the `contracts/` package. CHUNK-03 contributes the `memory.ts` slice. Slot it into `contracts/src/index.ts` alongside whatever CHUNK-02 exports.

### 2.7 `extension/src/memory/ids.ts` — NEW

Generates memory entry IDs. Format: `<type>-<short-uuid>` e.g. `intent-7a3f9b2c`. Using a typed prefix makes IDs self-describing on disk and in markdown links. UUIDs are generated with `crypto.randomUUID()` (Node 18+ / VS Code 1.85+ guaranteed) truncated to 8 chars (collision space ~4 billion within a single project is fine).

### 2.8 `extension/src/memory/markdown.ts` — NEW

Small helpers for the markdown body files:
- `bodyPath(workspaceUri, type, id): vscode.Uri` — returns the URI for the markdown body.
- `writeBody(uri, content): Promise<void>` — ensures parent dirs exist via `vscode.workspace.fs.createDirectory`, then writes UTF-8 bytes.
- `readBody(uri): Promise<string | null>` — returns null on `FileSystemError` of code `FileNotFound`.
- `frontmatter(entry): string` — emits a 4-line YAML frontmatter block (id, type, title, created_at) that prefixes every body file. Frontmatter is informational only — the SQLite row is the source of truth.

### 2.9 `extension/src/memory/readmeTemplate.ts` — NEW

Exports `RENDER_DELIVEROS_README(projectName: string): string` returning the markdown content of `.deliveryos/README.md` (see [§ 8](#8-deliveryos-directory--readme-template)). Pure function, no I/O. Called once during project creation by the upgraded `deliveryos.project.create` command.

### 2.10 `extension/src/memory/paths.ts` — NEW

Exports the canonical path constants the rest of the codebase imports. Centralising them here means later chunks (CHUNK-04 install, CHUNK-09 brief generation, etc.) can reference the same names and a single rename refactor moves everything.

- `DELIVERYOS_DIR = '.deliveryos'`
- `MEMORY_SQLITE_FILENAME = 'memory.sqlite'`
- `MEMORY_BODY_DIR = 'memory'`
- `README_FILENAME = 'README.md'`
- `HARNESS_SQLITE_FILENAME = 'harness.sqlite'` *(used only by `globalStoragePath(context)` below; the file isn't created in this chunk)*
- Helpers: `deliveryosDir(workspace)`, `memorySqlite(workspace)`, `memoryBodyDir(workspace, type)`, `globalStoragePath(context)`.

### 2.11 `extension/src/extension.ts` — EDIT (extends CHUNK-01)

- On activation: instantiate `SqlJsHost` and `MemoryStore` for the active workspace folder (if any). Wire to `context.subscriptions` for disposal.
- Re-bind `deliveryos.project.create` to call `MemoryStore.createIntent(...)` instead of the in-memory stub, then write `.deliveryos/README.md` if missing.
- Subscribe to `vscode.workspace.onDidChangeWorkspaceFolders` so swapping/adding workspace folders rebuilds the store.

### 2.12 `extension/package.json` — EDIT

- Add `"sql.js": "^1.10.3"` to `dependencies`.
- Add `"@types/sql.js": "^1.4.9"` to `devDependencies`.
- Add a `files` / build-step entry that copies `node_modules/sql.js/dist/sql-wasm.wasm` into `extension/dist/sql-wasm.wasm` so `vsce package` includes it in the VSIX.

### 2.13 `extension/.vscodeignore` — EDIT

Ensure `node_modules/sql.js/dist/sql-wasm.wasm` (or `dist/sql-wasm.wasm` after the copy) is **not** excluded. Confirm the resulting `.vsix` size budget (see [§ 11 Risks](#11-risks-edge-cases-and-open-questions)).

### 2.14 `extension/test/memory.test.ts` — NEW

Unit tests for `MemoryStore` CRUD, the migration runner, the link/walk graph operations, and a payload-JSON round-trip. Uses the same `sqlJsHost` against an in-memory-only DB (no `flush()` to disk) for speed. See [§ 10 Test plan](#10-test-plan).

### 2.15 `.deliveryos/README.md` — GENERATED at runtime

Not committed to the DeliveryOS repo. Written into the user's workspace by the upgraded `deliveryos.project.create` command. Template lives in `readmeTemplate.ts` ([§ 2.9](#29-extensionsrcmemoryreadmetemplatets--new)). Content sketched in [§ 8](#8-deliveryos-directory--readme-template).

---

## 3. Storage layout

### 3.1 Per-workspace (the entire memory graph for one project)

```text
<workspace>/
  .deliveryos/
    README.md                              # Human-readable explainer (template, see § 8)
    memory.sqlite                          # The single SQLite DB (sql.js writes via export())
    memory/
      intent/         <id>.md              # One markdown body per Intent Memory entry
      requirement/    <id>.md              # One per Requirement Memory entry
      design/         <id>.md              # …
      codebase/       <id>.md
      execution/      <id>.md
      result/         <id>.md
      verification/   <id>.md
      release/        <id>.md
```

Notes:

- `.deliveryos/` is the **dotfile** form, lowercase, with no trailing `-handoff` (per research finding #6). The `.deliveryos-handoff/` directory defined in CHUNK-11 is **separate** — it's the harness-facing workspace, churns per execution, partially gitignored. `.deliveryos/` is the durable memory directory and is *intended* to be committed (it is the audit trail).
- Each memory body file starts with a 4-line YAML frontmatter (`id`, `type`, `title`, `created_at`) followed by free-form markdown. The frontmatter is informational — SQLite holds the canonical metadata.
- `memory.sqlite` is binary. Recommend (but do not enforce) `*.sqlite` gitignore for users who don't want binaries in git; the markdown bodies alone are enough to regenerate the index. *(Index regeneration tooling is out of scope here — flagged as an open question.)*

### 3.2 Cross-project (stub only)

```text
<context.globalStorageUri>/
  harness.sqlite                           # Harness profiles, recent projects, prefs (not opened in this chunk)
```

Resolved via `context.globalStorageUri` — VS Code's per-extension global storage URI. The path constant is defined and exported (`paths.globalStoragePath(context)`), but **no DB is opened** in CHUNK-03. A later chunk (post-MVP) implements the cross-project store.

---

## 4. Polymorphic schema (canonical DDL)

The schema is deliberately polymorphic: one row in `memory_entries` per memory entry of *any* type, with the type-specific fields living inside `payload_json`. This trades per-type SQL queryability for trivial extensibility — adding a 9th memory type later requires zero schema migrations.

### 4.1 Tables (DDL — frozen for v1)

```sql
-- Schema version pin. Single row.
CREATE TABLE IF NOT EXISTS _schema_version (
  v INTEGER NOT NULL
);

-- The polymorphic memory entries table. type-specific fields live in payload_json.
CREATE TABLE IF NOT EXISTS memory_entries (
  id           TEXT PRIMARY KEY,           -- e.g. 'intent-7a3f9b2c'
  type         TEXT NOT NULL,              -- one of: intent | requirement | design | codebase
                                           --         execution | result | verification | release
  title        TEXT NOT NULL,              -- short human-facing label, denormalised for list views
  payload_json TEXT NOT NULL,              -- JSON string; shape determined by `type` (see § 5 union)
  created_at   INTEGER NOT NULL,           -- unix millis
  updated_at   INTEGER NOT NULL            -- unix millis
);

-- Directed links between entries. (from_id, to_id, kind) uniqueness.
CREATE TABLE IF NOT EXISTS memory_links (
  from_id TEXT NOT NULL,
  to_id   TEXT NOT NULL,
  kind    TEXT NOT NULL,                   -- see LINK_KINDS in § 5.4
  PRIMARY KEY (from_id, to_id, kind),
  FOREIGN KEY (from_id) REFERENCES memory_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (to_id)   REFERENCES memory_entries(id) ON DELETE CASCADE
);

-- Index on the most common filter column.
CREATE INDEX IF NOT EXISTS idx_memory_entries_type ON memory_entries(type);

-- Helpful secondary index for graph walks.
CREATE INDEX IF NOT EXISTS idx_memory_links_from ON memory_links(from_id, kind);
CREATE INDEX IF NOT EXISTS idx_memory_links_to   ON memory_links(to_id,   kind);
```

### 4.2 Initial row

After the DDL runs on a fresh DB, the migration runner inserts a single `_schema_version` row:

```sql
INSERT INTO _schema_version (v) VALUES (1);
```

### 4.3 Why one big polymorphic table

- The whole *point* of the chunk break-down's "do not design the rich per-type ER schema" instruction is to avoid premature schema rigidity. The 8 memory types from [`memory-layers.md`](../../architecture/memory-layers.md) are described in prose; their per-type fields are still evolving as the MVP gets built.
- `payload_json` carries the typed payload (validated by the discriminated union in TypeScript before insert, see [§ 5](#5-memorystore-class-api)). When per-type tables become necessary (e.g. for SQL filtering on requirement priority), a migration extracts them out — straightforward future work.
- Markdown bodies stay on disk, not in the DB, so the SQLite file is small and the markdown is human-readable / git-diffable.

---

## 5. TypeScript types — canonical memory contract

> Every later chunk imports these types. Re-declaring them anywhere else is a violation. The contracts package (`@deliveryos/contracts/memory`) is the single source of truth; `extension/src/memory/types.ts` re-exports.

### 5.1 Constants

```ts
export const MEMORY_TYPES = [
  'intent',
  'requirement',
  'design',
  'codebase',
  'execution',
  'result',
  'verification',
  'release',
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];
```

### 5.2 Base envelope

```ts
export interface MemoryEntryBase<T extends MemoryType, P> {
  id: string;                     // `${T}-${shortUuid}`
  type: T;                        // discriminator
  title: string;                  // short human label
  payload: P;                     // typed per T (see 5.3)
  body: string;                   // markdown body content (loaded lazily; empty string OK)
  createdAt: number;              // unix millis
  updatedAt: number;
}
```

`MemoryEntry` is the discriminated union of all 8 envelopes (see 5.3). The `body` is held outside the JSON payload because it lives on disk as a separate `.md` file; `MemoryStore.read()` loads it from disk and attaches.

### 5.3 The 8 typed payloads

Each payload shape is sketched from [`memory-layers.md`](../../architecture/memory-layers.md) and the PRD. Fields are intentionally minimal — the MVP trims the rich-object treatment.

```ts
// 1. Intent Memory — what the user originally wanted
export interface IntentPayload {
  rawIdea: string;                       // the original idea text the user typed
  discoveryAnswers?: DiscoveryAnswer[];  // populated by CHUNK-05; optional at create-time
  problemStatement?: string;
  userGoals?: string[];
  nonGoals?: string[];
  successCriteria?: string[];
}
export interface DiscoveryAnswer { question: string; answer: string; }

// 2. Requirement Memory — what the system agreed to build
export interface RequirementPayload {
  category: 'functional' | 'non-functional';
  priority: 'must' | 'should' | 'could';
  sourcePrdSection?: string;             // e.g. "§ 13.2"
  text: string;                          // requirement statement
  verificationCriteria?: string[];       // populated by CHUNK-08 (Test Designer)
  assumptions?: string[];
  constraints?: string[];
}

// 3. Design Memory — how the system should be built
export interface DesignPayload {
  area: 'architecture' | 'data-model' | 'api' | 'security' | 'ux' | 'other';
  decision: string;                      // the decision text
  rationale?: string;
  rejectedOptions?: string[];
  tradeoffs?: string;
}

// 4. Codebase Memory — what already exists
export interface CodebasePayload {
  folderStructure?: string;              // pasted tree, MVP
  keyFiles?: { path: string; purpose: string; }[];
  conventions?: string[];
  testCommands?: string[];                // e.g. ["npm test", "pytest"]
  knownDefects?: string[];
}

// 5. Execution Memory — what the coding harness was asked to do
export interface ExecutionPayload {
  briefMarkdown: string;                 // the rendered 10-section brief (CHUNK-09)
  targetHarness: 'claude-code' | 'codex' | 'cursor' | 'generic';
  harnessProfileId?: string;             // CHUNK-10
  contextPackageRef?: string;            // path or id of the context package
  expectedOutputs?: string[];
  briefVersion: number;                  // monotonically increasing; brief is immutable per-version
}

// 6. Result Memory — what actually happened
export interface ResultPayload {
  rawOutput: string;                     // raw text from result.md (CHUNK-12)
  summary?: string;                      // parsed sections (CHUNK-12)
  filesChanged?: string[];               // from `git diff --name-only` (CHUNK-12)
  testsAdded?: string[];
  testsRun?: string[];
  errors?: string[];
  risks?: string[];
  unresolvedQuestions?: string[];
  harness: 'claude-code' | 'codex' | 'cursor' | 'generic';
  parseConfidence: 'high' | 'low';       // CHUNK-12 sets 'low' on fallback parse
}

// 7. Verification Memory — whether the work passed
export interface VerificationPayload {
  verdict: 'pass' | 'fail';
  failedCriteria?: string[];
  defects?: string[];
  reworkNotes?: string;
  approvedBy?: string;                   // user identifier; MVP just records "user"
  approvedAt?: number;                   // unix millis
}

// 8. Release Memory — what was released and why
export interface ReleasePayload {
  releaseId: string;                     // e.g. "v0.1.0"
  includedRequirementIds: string[];
  knownLimitations?: string[];
  deferredItems?: string[];
  finalSignOffAt: number;
  evidencePackagePath?: string;          // path to release-evidence markdown (CHUNK-14)
}
```

### 5.4 The discriminated union

```ts
export type MemoryEntry =
  | MemoryEntryBase<'intent',       IntentPayload>
  | MemoryEntryBase<'requirement',  RequirementPayload>
  | MemoryEntryBase<'design',       DesignPayload>
  | MemoryEntryBase<'codebase',     CodebasePayload>
  | MemoryEntryBase<'execution',    ExecutionPayload>
  | MemoryEntryBase<'result',       ResultPayload>
  | MemoryEntryBase<'verification', VerificationPayload>
  | MemoryEntryBase<'release',      ReleasePayload>;

export type MemoryEntryOfType<T extends MemoryType> =
  Extract<MemoryEntry, { type: T }>;

export type MemoryPayloadOfType<T extends MemoryType> =
  MemoryEntryOfType<T>['payload'];
```

### 5.5 Link kinds (initial vocabulary, frozen for v1)

These cover all 8 memory types' relationships from [`memory-layers.md` § Relationships](../../architecture/memory-layers.md). Later chunks may add more — additions are non-breaking because `kind` is `TEXT`.

```ts
export const LINK_KINDS = [
  'derives-from',          // Requirement ← Intent; Design ← Requirement; etc.
  'verifies',              // Verification → Requirement
  'produced',              // Execution → Result
  'targets',               // Execution → Requirement
  'references-codebase',   // Execution → Codebase
  'supersedes',            // newer Execution → older Execution (rework)
  'includes',              // Release → Requirement
  'reworks',               // Result → Result (rework cycles)
] as const;

export type LinkKind = (typeof LINK_KINDS)[number];

export interface MemoryLink {
  fromId: string;
  toId: string;
  kind: LinkKind;
}
```

### 5.6 Raw row type (extension-only)

For the SQL layer:

```ts
// extension/src/memory/types.ts only — not exported via contracts.
export interface MemoryEntryRow {
  id: string;
  type: MemoryType;
  title: string;
  payload_json: string;
  created_at: number;
  updated_at: number;
}
```

---

## 6. `MemoryStore` class API

The single public class consumed by every later chunk. Implementation in `MemoryStore.ts`; surface frozen as part of CHUNK-03.

### 6.1 Constructor and lifecycle

```ts
export class MemoryStore {
  constructor(
    private readonly host: SqlJsHost,
    private readonly workspaceUri: vscode.Uri,
  ) {}

  /** Open + migrate. Resolves once the DB is ready. */
  static async open(
    context: vscode.ExtensionContext,
    workspaceFolder: vscode.WorkspaceFolder,
  ): Promise<MemoryStore>;

  /** Flush + close the underlying DB. Idempotent. */
  async close(): Promise<void>;
}
```

### 6.2 CRUD

```ts
/** Create a new entry. Generates the id, writes the body file, persists. */
create<T extends MemoryType>(
  input: {
    type: T;
    title: string;
    payload: MemoryPayloadOfType<T>;
    body?: string;                        // markdown body; default ''
  },
): Promise<MemoryEntryOfType<T>>;

/** Read by id. Loads the markdown body from disk. Returns null on miss. */
read(id: string): Promise<MemoryEntry | null>;

/**
 * Partial update. Patches the payload (shallow merge), title, and/or body.
 * Bumps updated_at. Throws if the entry's `type` would change (immutable).
 */
update<T extends MemoryType>(
  id: string,
  patch: {
    title?: string;
    payload?: Partial<MemoryPayloadOfType<T>>;
    body?: string;
  },
): Promise<MemoryEntryOfType<T>>;

/** Lists all entries of a given type, ordered by created_at DESC. Bodies NOT loaded. */
list<T extends MemoryType>(type: T): Promise<MemoryEntryOfType<T>[]>;
```

> `list` returns entries with `body: ''` (the field is present so callers don't have to special-case the union shape). Use `read(id)` if you need the body. This avoids loading hundreds of markdown files for a tree view.

### 6.3 Graph operations

```ts
/** Inserts a link. Idempotent — safe to call twice with the same (from, to, kind). */
link(from: string, to: string, kind: LinkKind): Promise<void>;

/** Removes a link. Idempotent. */
unlink(from: string, to: string, kind: LinkKind): Promise<void>;

/**
 * Single-hop graph walk: returns all entries reachable from `from` via links of `kind`.
 * Bodies NOT loaded.
 */
walk(from: string, kind: LinkKind): Promise<MemoryEntry[]>;

/** Lists all incoming links to an entry (used by CHUNK-14 release evidence walk). */
backlinks(to: string, kind?: LinkKind): Promise<MemoryLink[]>;
```

### 6.4 Helper / convenience

```ts
/** Single-shot "create + link" used by the upgraded project.create command. */
createIntent(rawIdea: string, projectTitle: string): Promise<MemoryEntryOfType<'intent'>>;
```

`createIntent` is the smallest API helper that lets CHUNK-01's `deliveryos.project.create` command persist via the store without leaking SQL knowledge into the command. It calls `create({ type: 'intent', title: projectTitle, payload: { rawIdea }, body: rawIdea })`.

### 6.5 Error model

- All methods reject with a typed `MemoryStoreError` carrying a `code` field (`'not-found' | 'invalid-id' | 'type-immutable' | 'flush-failed' | 'migration-failed'`).
- Callers should `catch` and present a user-facing notification via `vscode.window.showErrorMessage`; the store does not show notifications itself (keeps it testable headlessly).

---

## 7. Migration runner

The simplest correct thing. Lives in `migrations.ts`. Called once from `MemoryStore.open()` before any other SQL runs.

```ts
// migrations.ts (shape — actual file ~12 lines including the array)
export function runMigrations(db: Database): void {
  // Bootstrap: ensure _schema_version exists.
  db.exec(SCHEMA_V0_BOOTSTRAP);                         // creates _schema_version table only
  const result = db.exec('SELECT v FROM _schema_version LIMIT 1');
  const current = result.length > 0 ? (result[0].values[0][0] as number) : 0;
  for (let v = current + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    for (const stmt of MIGRATIONS[v]) db.exec(stmt);
    db.exec('DELETE FROM _schema_version');
    db.run('INSERT INTO _schema_version (v) VALUES (?)', [v]);
  }
}
```

Where `MIGRATIONS` is a `Record<number, string[]>` keyed by version number. v1 is the full DDL from [§ 4](#4-polymorphic-schema-canonical-ddl).

Notes:

- The bootstrap step is necessary because `sql.js` opens a fresh in-memory DB on first-ever workspace use — no tables exist yet.
- The loop is forward-only. There are no down migrations in v1; if rollback becomes necessary, it'll be by replaying from markdown bodies (see [§ 11](#11-risks-edge-cases-and-open-questions)).
- v2+ migrations should be wrapped in `BEGIN; … COMMIT;` — comment in the file flags this.

---

## 8. `.deliveryos/` directory + README template

When the user creates a project, `deliveryos.project.create` (upgraded from CHUNK-01) writes a `.deliveryos/README.md` if none exists. Template:

```md
# .deliveryos/

This directory is DeliveryOS's project memory. It is intended to be **committed to git** — it is the audit trail your release evidence is built from.

## What's here

- `memory.sqlite` — the index. A small SQLite DB written by the DeliveryOS extension via `sql.js` (no native modules).
  *Binary. Some teams prefer to gitignore this and rely on the markdown bodies + DeliveryOS's regenerate command (deferred).*
- `memory/` — markdown bodies, one file per memory entry, organised by type:
  - `intent/` — what you originally wanted
  - `requirement/` — what the system agreed to build
  - `design/` — how it should be built
  - `codebase/` — what already exists
  - `execution/` — what the coding harness was asked to do
  - `result/` — what actually happened
  - `verification/` — whether the work passed
  - `release/` — what was released and why

See `docs/architecture/memory-layers.md` in the DeliveryOS repo for the canonical typology.

## What's NOT here

- `.deliveryos-handoff/` lives in your workspace root (sibling to `.deliveryos/`). That's the harness-facing churn directory — DeliveryOS writes briefs into it for Claude Code or Codex to read. See the DeliveryOS docs.

## Editing

The markdown bodies are safe to edit by hand — DeliveryOS will pick up your edits next time it reads. The `memory.sqlite` is regenerated by DeliveryOS; manual edits to it are not preserved.

Project: **{{ projectName }}**
Created: **{{ isoTimestamp }}**
```

`{{ projectName }}` and `{{ isoTimestamp }}` are simple string substitutions in `readmeTemplate.ts`.

---

## 9. VS Code APIs used

- `vscode.workspace.workspaceFolders` — pick the active workspace folder for the store. If multi-root workspaces are open, MVP uses the first folder (`workspaceFolders[0]`). Multi-root support is a known follow-up.
- `vscode.workspace.fs.readFile(uri) / writeFile(uri, bytes) / createDirectory(uri) / delete(uri)` — all disk I/O goes through the workspace FS adapter (works in remote / WSL / Codespaces too — important since DeliveryOS targets multiple editor forks per ADR-0001).
- `vscode.workspace.fs.stat(uri)` — existence checks.
- `vscode.workspace.onDidChangeWorkspaceFolders` — close + reopen the store when folders change.
- `context.globalStorageUri` — base URI for the cross-project store (path-only in CHUNK-03).
- `context.extensionUri` — used by `sqlJsHost.ts` to resolve the `.wasm` blob inside the VSIX.
- `vscode.Uri.joinPath(...)` — every path construction.
- `vscode.FileSystemError` — caught in `readBody` for `FileNotFound`.

**Not used in CHUNK-03:** `vscode.workspace.fs.createFileSystemWatcher` (handoff watcher is CHUNK-11's job), `vscode.window.createTreeView` (CHUNK-01 owns the tree).

---

## 10. Step-by-step implementation outline

Suggested order — small commits per step:

1. **Add `sql.js` dependency** in `extension/package.json`; add the `dist/sql-wasm.wasm` copy step to the existing build script. Confirm `npm run build` produces `extension/dist/sql-wasm.wasm`.
2. **Define types** in `contracts/src/memory.ts` (all of [§ 5](#5-typescript-types--canonical-memory-contract)). Re-export from `contracts/src/index.ts`. Mirror-import in `extension/src/memory/types.ts`.
3. **Write `paths.ts`** — pure constants + helpers. Cheap, foundational, no I/O.
4. **Write `schema.ts`** — the DDL strings, the `MIGRATIONS` map, `CURRENT_SCHEMA_VERSION = 1`.
5. **Write `migrations.ts`** — the 8-line runner.
6. **Write `sqlJsHost.ts`** — `initSqlJs` with `locateFile` pointing at `context.extensionUri`; `flush()` method.
7. **Write `markdown.ts`** and `ids.ts` — the tiny helpers.
8. **Write `MemoryStore.ts`** — open/close, CRUD, link/walk. Each method is small (~10–20 lines) and individually testable.
9. **Write unit tests** in `extension/test/memory.test.ts` (CRUD round-trip, migration runner, payload-JSON round-trip, link/walk, error model).
10. **Wire `MemoryStore` into `extension.ts`** — instantiate on activate, dispose on deactivate, replace the CHUNK-01 stub `project.create` with `createIntent`.
11. **Write `readmeTemplate.ts`** + integrate into `project.create` so the `.deliveryos/README.md` lands on disk.
12. **Manual smoke test** (see [§ 11 Test plan / smoke](#11-risks-edge-cases-and-open-questions)).
13. **Package + size check** — `npm run package`, confirm the `.vsix` weighs in under ~5 MB.

---

## 11. Test plan

### 11.1 Manual smoke (matches `part-1-plan.md` CHUNK-03 "Verified by")

1. Build + package: `npm run package` produces a `.vsix`.
2. Install into a clean VS Code (`code --install-extension deliveryos-*.vsix`).
3. Open a fresh empty folder as a workspace.
4. Run `deliveryos.project.create`, type "Bug Triage Assistant" as the idea.
5. Confirm `<workspace>/.deliveryos/memory.sqlite` exists.
6. Confirm `<workspace>/.deliveryos/memory/intent/intent-<short>.md` exists with the raw idea.
7. Confirm `<workspace>/.deliveryos/README.md` exists.
8. Close VS Code entirely.
9. Reopen the same workspace. The DeliveryOS sidebar shows the project (the project record came back from disk).
10. Open `memory.sqlite` with the host's `sqlite3` CLI and run `SELECT id, type, title FROM memory_entries;`. The Intent row is present.

### 11.2 Unit tests (`extension/test/memory.test.ts`)

Suggested cases — each runs against an in-memory `sql.js` DB without disk flushing for speed:

- **CRUD round-trip per type.** For each of the 8 `MEMORY_TYPES`: `create` → `read` → `update` → `read` → assert equality with the updated values.
- **Type immutability.** `update` rejecting an attempt to switch `type` (well — the API doesn't expose `type` in patch, but the test asserts the `id`-prefix stays consistent).
- **Payload JSON round-trip.** Stuff a `RequirementPayload` with all optional fields populated, write, read, deep-equal. Specifically catches JSON-stringify edge cases (undefined-vs-missing).
- **`list(type)` ordering.** Create three Intent entries with mock timestamps, assert `list('intent')` returns them in `created_at DESC` order.
- **`link` / `walk` / `backlinks`.** Create an Intent and two Requirements; link each Requirement `derives-from` the Intent; walk Intent's `derives-from` outgoing → 0 results; walk both Requirements' `derives-from` outgoing → 1 result each (the Intent); `backlinks(intentId, 'derives-from')` → 2 results.
- **Migration runner.** Open a fresh in-memory DB, run migrations, assert `_schema_version.v === 1`, assert the four expected indexes are present (`PRAGMA index_list('memory_entries')`).
- **Re-open is no-op.** Run migrations twice; second call must not error and must not change schema version.
- **Error: read missing.** `read('intent-doesnotexist')` resolves to `null`, not throws.

### 11.3 Bundle-size check

Manual: after `npm run package`, `ls -lh extension/*.vsix`. Assert `< 5 MB`. If it exceeds, the most likely culprit is shipping `sql.js`'s entire `dist/` directory (which includes worker variants); the VSIX should include only `sql-wasm.wasm`. The `.vscodeignore` controls this.

> A nice-to-have CI assertion: a `scripts/check-vsix-size.js` that fails the build if `.vsix > 5 MB`. Defer to CHUNK-04 (release scaffolding), but document the budget here.

---

## 12. `sql.js` integration — flush strategy and future tuning seam

### 12.1 Decision (carried forward from research finding #1)

Ship `sql.js` (WASM), not `better-sqlite3`. Native modules break across editor forks' Electron ABIs and CHUNK-03 must not become a per-editor build matrix nightmare.

- Bundle: `sql-wasm.wasm` (~1 MB) lives at `extension/dist/sql-wasm.wasm` and is included by `vsce package`. Total VSIX impact bounded by [§ 11.3](#113-bundle-size-check).
- Load: `sqlJsHost.ts` calls `initSqlJs({ locateFile: () => vscode.Uri.joinPath(context.extensionUri, 'dist', 'sql-wasm.wasm').fsPath })`.

### 12.2 Flush strategy (MVP — explicit per-mutation)

`sql.js` is purely in-memory. The DB only hits disk when we explicitly call `db.export()` (which returns a `Uint8Array` snapshot) and write that to `memory.sqlite`. CHUNK-03 ships the **simplest correct strategy**:

> **Flush per mutation.** Every `MemoryStore` method that writes (create / update / link / unlink) calls `host.flush()` as its final step.

Rationale:
- Simplest reasoning. After every API call returns, disk = memory. Crash safety is trivial: at worst we lose the in-flight mutation.
- Write volume is tiny in MVP. The 8-memory-types graph for one project is dozens-to-low-hundreds of rows. Flushing the whole DB (a few KB) per mutation is well under the human-perception threshold.

### 12.3 Future tuning seam

The "future tuning seam" is `SqlJsHost.flush()`. The store doesn't know how flush works — it just calls it. Later optimisations land entirely inside `SqlJsHost`:

- **Debounced flush.** Replace immediate `flush()` with `scheduleFlush(250ms)`. Mutations within the debounce window coalesce into one disk write. Risk: crash safety regression (mitigated by the markdown body files — those write synchronously and are the durable record).
- **`better-sqlite3` swap.** If `sql.js` becomes the bottleneck (>100 ms latency on a mutation, say), the seam is the `SqlJsHost` interface — swap the implementation, leave `MemoryStore.ts` untouched.

Both are explicitly *out of scope* for CHUNK-03 — the simple strategy is the right starting point.

---

## 13. Risks, edge cases, and open questions

### 13.1 `sql.js` WASM bundle size

- ~1 MB compressed. Total CHUNK-03 VSIX impact: `sql-wasm.wasm` + the JS glue (~200 KB).
- **Budget assertion:** post-CHUNK-03 VSIX must stay under ~5 MB. Confirmed in the size check ([§ 11.3](#113-bundle-size-check)).
- Risk if it doesn't: revisit `.vscodeignore`. `sql.js` ships several builds (`sql-wasm.js`, `sql-wasm-debug.js`, worker variants); we want only `sql-wasm.wasm` + `sql-wasm.js`.

### 13.2 Flush latency

- `db.export()` serialises the entire DB. For an MVP-sized DB (sub-megabyte) this is sub-millisecond. As the project grows (release evidence with bodies-on-disk, the DB itself stays small) this should stay cheap.
- **Tripwire:** if `MemoryStore.create()` ever exceeds 100 ms in dogfooding, drop in the debounced flush ([§ 12.3](#123-future-tuning-seam)).

### 13.3 Atomic file writes (fsync)

- `vscode.workspace.fs.writeFile` is "best-effort durable" — no fsync guarantee on most platforms.
- A crash mid-write could leave `memory.sqlite` truncated or corrupt. **Mitigation in MVP:** the markdown body files are the durable record. A future "rebuild index from markdown" command (deferred) closes the safety loop fully.
- The "right" fix is write-to-tmp + rename, which `fs.writeFile` doesn't expose directly — we'd drop to `node:fs.promises.rename`. **Punt** to a follow-up; documented in the open questions below.

### 13.4 `payload_json` schema drift

- The payload shape is enforced *only* by TypeScript at the call site. SQLite stores it as a `TEXT` blob; nothing in the DB validates structure.
- **Mitigation today:** the discriminated union in [§ 5](#5-typescript-types--canonical-memory-contract) is the only writer path. As long as nothing else writes the DB, drift is impossible.
- **Mitigation tomorrow:** when v2 of the schema adds fields, a `migrations.ts` step can rewrite existing `payload_json` blobs. The migration runner is built to support this — `MIGRATIONS[2]` is just more SQL.
- **Open question:** do we want runtime validation of `payload_json` on read (e.g. Zod schemas mirroring the TS types)? Cheap, but adds a dep. **Recommend: defer to first dogfooding bug** that's caused by a malformed payload.

### 13.5 Body file ↔ row consistency

- If the SQL `INSERT` succeeds but the markdown `writeFile` fails (disk full, permission), we have a row with no body file. `read()` handles this — `readBody` returns `null`, `MemoryStore.read` returns the entry with `body: ''`.
- Conversely, an orphan markdown file (row was rolled back, file delete failed) is harmless — `list` doesn't enumerate the filesystem.
- **Recommend:** a future `verify` / `repair` command. Out of scope here.

### 13.6 Multi-root workspaces

- MVP picks `workspaceFolders[0]`. If the user adds a second folder while DeliveryOS is open, they don't get a second store. **Documented limitation; reasonable for MVP.**
- A user who *opens* a second folder later (i.e. swaps the active workspace) gets the right store, because `onDidChangeWorkspaceFolders` rebuilds.

### 13.7 Concurrency

- Single extension host = single writer. The `sql.js` instance is not safe for concurrent writes, but VS Code's extension host is single-threaded. **No locking needed.**
- If a future webview ever writes through a worker, this assumption breaks. **Note in the file header.**

### 13.8 SQLite file binary in git

- `memory.sqlite` is a binary blob and will produce noisy diffs / large repo growth on busy projects.
- **Mitigation in MVP:** the `.deliveryos/README.md` mentions teams can gitignore it and rely on markdown bodies + a (deferred) regenerate command.
- **Open question for Prompt 3:** should DeliveryOS *default* to gitignoring `memory.sqlite` and not commit it? Tradeoff: regen-from-markdown isn't built yet, so a fresh clone would lose link kinds (links live only in SQLite). **Recommend: commit `memory.sqlite` for MVP; revisit after the regen command exists.**

### 13.9 Open questions for Prompt 3 (validation pass)

1. Confirm the **link-kind vocabulary** in [§ 5.5](#55-link-kinds-initial-vocabulary-frozen-for-v1) is sufficient for CHUNK-09 / CHUNK-13 / CHUNK-14 needs. If new kinds emerge in their specs, this list grows — non-breaking, but worth catching now.
2. Confirm the **payload shapes** in [§ 5.3](#53-the-8-typed-payloads) match what CHUNK-05 (`IntentPayload.discoveryAnswers`), CHUNK-07 (`RequirementPayload`), CHUNK-08 (verification criteria), CHUNK-09 (`ExecutionPayload.briefMarkdown`), CHUNK-12 (`ResultPayload`), CHUNK-14 (Verification + Release) need.
3. Decide whether `memory.sqlite` defaults to gitignored or committed ([§ 13.8](#138-sqlite-file-binary-in-git)).
4. Decide whether to add runtime Zod validation of `payload_json` ([§ 13.4](#134-payload_json-schema-drift)).
5. Decide whether the rebuild-from-markdown command earns a chunk slot (currently deferred).

---

## 14. Explicit dependencies

### 14.1 What this chunk depends on

- **[CHUNK-01](./chunk-01-extension-scaffold.md)** — the extension activates, the `deliveryos.project.create` command exists, `context.extensionUri` and `context.globalStorageUri` are accessible. CHUNK-03 *replaces* the stub persistence inside `project.create`.
- **[CHUNK-02](./chunk-02-webview-foundation.md)** — owns the `contracts/` package. CHUNK-03 contributes the `contracts/src/memory.ts` slice; CHUNK-02's `contracts/src/index.ts` must export it. CHUNK-02's `vscode-messenger` contracts can carry typed memory payloads using these types from this point forward.

### 14.2 What this chunk exposes (and freezes)

| Exposed contract | Consumers |
|---|---|
| `MEMORY_TYPES` + `MemoryType` | All later chunks. |
| `MemoryEntry` discriminated union and all 8 payload interfaces | CHUNK-05 (Intent.discoveryAnswers), CHUNK-06–CHUNK-08 (Requirement), CHUNK-09 (Execution), CHUNK-11 (Execution + Codebase), CHUNK-12 (Result), CHUNK-13 (Result.filesChanged), CHUNK-14 (Verification + Release). |
| `LINK_KINDS` + `MemoryLink` | CHUNK-07, CHUNK-09, CHUNK-12, CHUNK-13, CHUNK-14. |
| `MemoryStore` class (open/close/CRUD/link/walk/backlinks) | Every chunk from CHUNK-05 onwards. |
| On-disk layout: `<workspace>/.deliveryos/memory.sqlite`, `<workspace>/.deliveryos/memory/<type>/<id>.md`, `<workspace>/.deliveryos/README.md` | CHUNK-09 (writes Execution bodies), CHUNK-12 (writes Result bodies), CHUNK-14 (writes Release bodies + `releases/` sibling — adds, doesn't conflict). |
| Cross-project stub path `<globalStorageUri>/harness.sqlite` | Reserved name; later chunk implements the DB. |
| `MemoryStoreError` codes | All callers handle via `vscode.window.showErrorMessage`. |
| `.deliveryos/` directory naming convention (dotfile, lowercase) | Frozen per research finding #6. CHUNK-04's install script and CHUNK-11's handoff directory must remain distinct (`.deliveryos-handoff/`). |

### 14.3 Cross-chunk contracts honoured

Per [`part-1-plan.md` "Shared cross-chunk contracts"](../part-1-plan.md):

- **Memory schema** — defined here, imported everywhere; never redefined.
- **`.deliveryos/` memory directory layout** — defined here per research finding #4 / #6.
- **Contracts slice** lives in `contracts/` (CHUNK-02's package), per the cross-chunk contract for "webview message contracts".

---

## 15. Definition of done (mirrors `part-1-plan.md` § CHUNK-03 "Done when")

- [ ] `npm run package` produces a `.vsix` containing `dist/sql-wasm.wasm`. Size under 5 MB.
- [ ] Installing the `.vsix` and running `deliveryos.project.create` creates `<workspace>/.deliveryos/memory.sqlite`, `<workspace>/.deliveryos/memory/intent/<id>.md`, and `<workspace>/.deliveryos/README.md`.
- [ ] Closing and reopening VS Code shows the project still present in the sidebar (loaded from disk).
- [ ] Opening `memory.sqlite` with the host's `sqlite3` CLI shows the schema (`memory_entries`, `memory_links`, `_schema_version`, the three indexes) and the Intent row.
- [ ] The migration runner runs cleanly on first init and is a no-op on re-init.
- [ ] Unit tests in `extension/test/memory.test.ts` pass headlessly (`npm test`).
- [ ] `contracts/src/memory.ts` exports the discriminated union; the webview side can `import type { MemoryEntry } from '@deliveryos/contracts/memory'` with no runtime dependency on `vscode` or `sql.js`.

---

*End of chunk-03 spec.*
