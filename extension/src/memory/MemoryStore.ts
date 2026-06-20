// CHUNK-03 § 2.5 + § 6 — durable memory layer consumed by every later chunk.
// Each mutation: BEGIN → SQL → markdown body write → COMMIT → host.flush().
// On any throw inside the transaction the catch issues ROLLBACK and
// best-effort-deletes the partial body file so we don't leak orphans.
//
// Per § 13.7 (concurrency): VS Code's extension host is single-threaded, so
// there is exactly one writer to this store. No locking.

import * as vscode from 'vscode';
import {
  MEMORY_TYPES,
  type BugPayload,
  type BugSeverity,
  type ChangeRequestPayload,
  type DecomposedRequirement,
  type DraftPrd,
  type ExecutionPayload,
  type HarnessName,
  type IntentPayload,
  type LinkKind,
  type MemoryEntry,
  type MemoryEntryOfType,
  type MemoryPayloadOfType,
  type MemoryLink,
  type MemoryType,
  type PrdSection,
  type RequirementCategory,
  type RequirementPayload,
  type RequirementPriority,
  type TestCase,
  type TestScenario,
  type TestSpec,
  type TestSpecConfidence,
  type TestSpecPayload,
  type VerificationCriterion,
} from '@deliveryos/contracts';
import { renderPrdMarkdown } from '../prd/sectionSchema';

export type MemoryChangeEvent =
  | { readonly kind: 'create' | 'update'; readonly entryId: string; readonly entryType: MemoryType }
  | { readonly kind: 'link' | 'unlink'; readonly fromId: string; readonly toId: string; readonly linkKind: LinkKind };
import { generateMemoryId, parseMemoryIdType } from './ids';
import {
  bodyPath,
  deleteBody,
  parseBodyFile,
  parseLinksFile,
  readBody,
  renderFrontmatter,
  writeBody,
  type ParsedBodyFile,
} from './markdown';
import { runMigrations } from './migrations';
import { memoryBodyDir, memoryLinksPath } from './paths';
import { SqlJsHost } from './sqlJsHost';
import type { MemoryEntryRow } from './types';

export type MemoryStoreErrorCode =
  | 'not-found'
  | 'invalid-id'
  | 'type-immutable'
  | 'flush-failed'
  | 'migration-failed';

export class MemoryStoreError extends Error {
  constructor(readonly code: MemoryStoreErrorCode, message: string) {
    super(message);
    this.name = 'MemoryStoreError';
  }
}

export interface CreateInput<T extends MemoryType> {
  readonly type: T;
  readonly title: string;
  readonly payload: MemoryPayloadOfType<T>;
  readonly body?: string;
}

export interface UpdatePatch<T extends MemoryType> {
  readonly title?: string;
  readonly payload?: Partial<MemoryPayloadOfType<T>>;
  readonly body?: string;
}

/**
 * Stored shape for a requirement-item row's `payload_json`. Cast through
 * `RequirementPayload` at the SQL boundary (mirrors the PRD pattern). The
 * `kind` + `id` discriminators live in payload, NOT in a new column —
 * honouring CHUNK-03's schema contract.
 */
export interface StoredRequirementItemPayload {
  readonly kind: 'requirement-item';
  /** User-visible ID. Format: REQ-NNN (3-digit zero-padded; widens to 4+ at 1000+). */
  readonly id: string;
  readonly title: string;
  readonly category: RequirementCategory;
  readonly priority: RequirementPriority;
  readonly sourcePrdSection: string;
  /** Long-form body. Mirrors the on-disk markdown file. */
  readonly text: string;
  /** Reserved for CHUNK-08. Absent or empty until the Test Designer runs. */
  readonly verificationCriteria?: readonly string[];
}

export interface RequirementItemRecord {
  readonly entryId: string;
  readonly payload: StoredRequirementItemPayload;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface ChangeRequestRecord {
  readonly entryId: string;
  readonly payload: ChangeRequestPayload;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface BugRecord {
  readonly entryId: string;
  readonly payload: BugPayload;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/**
 * Stored shape for a `type='test-spec'` row's `payload_json`. CHUNK-08
 * extends the minimum stable `TestSpecPayload` shape (`requirementId` +
 * `scenarios`) with extra Test Designer fields via the cast-through
 * pattern. `scenarios[]` is populated from `cases[]` so downstream
 * consumers honour the contracts-level contract.
 */
export interface StoredTestSpecPayload {
  readonly kind: 'test-spec';
  /** User-visible memory-entry id; e.g. "TS-REQ-002". */
  readonly id: string;
  /** User-visible parent requirement id; e.g. "REQ-002". */
  readonly requirementUserId: string;
  /** Required by `TestSpecPayload` — SQLite UUID of the parent requirement entry. */
  readonly requirementId: string;
  /** Required by `TestSpecPayload`. Derived from `cases[]` at write time. */
  readonly scenarios: readonly TestScenario[];
  /** CHUNK-08 canonical representation (read-back side). */
  readonly cases: readonly TestCase[];
  readonly verificationCriteria: readonly VerificationCriterion[];
  readonly openQuestions: readonly string[];
  readonly confidence: TestSpecConfidence;
}

export interface TestSpecRecord {
  readonly entryId: string;
  readonly title: string;
  readonly body: string;
  readonly payload: StoredTestSpecPayload;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/**
 * Stored shape for a `type='execution'` row's `payload_json`. CHUNK-09's
 * Execution Brief layer. The minimum stable `ExecutionPayload` shape
 * (`briefMarkdown` + `targetHarness` + `briefVersion`) is honoured via the
 * cast-through pattern. `payload.kind='execution-brief'` discriminates from
 * any future hypothetical sibling using `type='execution'`.
 *
 * The brief markdown itself (the canonical artefact) lives in the
 * `MemoryEntry.body` field — `payload.briefMarkdown` is denormalised cache
 * (same content; useful for cheap queries that don't want to round-trip the
 * file). On any read mismatch the body file wins, per CHUNK-09 § 7.1.
 */
export interface StoredExecutionPayload {
  readonly kind: 'execution-brief';
  /** User-visible brief id; e.g. 'brief_<uuid-v4>'. Mirrors `frontmatter.brief_id`. */
  readonly id: string;
  /** Required by ExecutionPayload — the cached canonical brief markdown. */
  readonly briefMarkdown: string;
  /** Required by ExecutionPayload. CHUNK-10 sets the real harness; CHUNK-09 emits 'generic'. */
  readonly targetHarness: HarnessName;
  /** Required by ExecutionPayload. v1 for now; bumps when supersedes chains lengthen. */
  readonly briefVersion: number;
  /** Project id from the requirement's chain. */
  readonly projectId: string;
  /** Requirement entry id this brief was composed from. */
  readonly requirementEntryId: string;
  /** User-visible requirement id (REQ-NNN). */
  readonly requirementUserId: string;
  /** Test-spec entry id linked via the requirement, captured at compose time. */
  readonly testSpecEntryId?: string;
  /** Brief entry id this one supersedes, if a revision. */
  readonly supersedesEntryId?: string;
  /** Schema version of the brief markdown (mirrors `BRIEF_SCHEMA_VERSION`). */
  readonly schemaVersion: number;
  /** Frontmatter `profile`. CHUNK-09 always writes '(unspecified)'. */
  readonly profile: string;
  /** ISO 8601 lock timestamp — set immediately before write. */
  readonly lockedAt: string;
}

export interface BriefRecord {
  readonly entryId: string;
  readonly title: string;
  /** Canonical brief markdown — the body file with system frontmatter stripped. */
  readonly body: string;
  readonly payload: StoredExecutionPayload;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** A single entry as exported for the markdown projection. */
export interface ProjectionEntry {
  readonly id: string;
  readonly type: MemoryType;
  readonly title: string;
  readonly payload: unknown;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** The whole store, flattened for the markdown projection. */
export interface ProjectionSnapshot {
  readonly entries: readonly ProjectionEntry[];
  readonly links: readonly MemoryLink[];
}

export class MemoryStore {
  private readonly _onDidChangeMemory = new vscode.EventEmitter<MemoryChangeEvent>();
  readonly onDidChangeMemory: vscode.Event<MemoryChangeEvent> = this._onDidChangeMemory.event;

  private constructor(
    private readonly host: SqlJsHost,
    private readonly workspaceUri: vscode.Uri,
  ) {}

  static async open(
    context: vscode.ExtensionContext,
    workspaceFolder: vscode.WorkspaceFolder,
  ): Promise<MemoryStore> {
    const host = await SqlJsHost.open(context, workspaceFolder.uri);
    try {
      runMigrations(host.db);
    } catch (err) {
      host.close();
      throw new MemoryStoreError(
        'migration-failed',
        err instanceof Error ? err.message : String(err),
      );
    }
    await host.flush();
    return new MemoryStore(host, workspaceFolder.uri);
  }

  /** Test-only factory: in-memory DB with no disk affinity. */
  static async openInMemoryForTests(
    wasmBytes: Uint8Array,
    workspaceUri: vscode.Uri,
  ): Promise<MemoryStore> {
    const host = await SqlJsHost.openInMemory(wasmBytes);
    runMigrations(host.db);
    return new MemoryStore(host, workspaceUri);
  }

  async close(): Promise<void> {
    try {
      await this.host.flush();
    } finally {
      this.host.close();
      this._onDidChangeMemory.dispose();
    }
  }

  // --- CRUD --------------------------------------------------------------

  async create<T extends MemoryType>(input: CreateInput<T>): Promise<MemoryEntryOfType<T>> {
    const id = generateMemoryId(input.type);
    const now = Date.now();
    const body = input.body ?? '';
    const fullBody = renderFrontmatter({
      id,
      type: input.type,
      title: input.title,
      createdAt: now,
      updatedAt: now,
      payload: input.payload,
    }) + body;
    const uri = bodyPath(this.workspaceUri, input.type, id);

    this.host.db.exec('BEGIN');
    try {
      this.host.db.run(
        `INSERT INTO memory_entries (id, type, title, payload_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, input.type, input.title, JSON.stringify(input.payload), now, now],
      );
      await writeBody(uri, fullBody);
      this.host.db.exec('COMMIT');
    } catch (err) {
      this.host.db.exec('ROLLBACK');
      await deleteBody(uri);
      throw err;
    }
    await this.flushOrThrow();
    this._onDidChangeMemory.fire({ kind: 'create', entryId: id, entryType: input.type });

    // Round-trip the entry as the union member.
    const entry: MemoryEntry = {
      id,
      type: input.type,
      title: input.title,
      payload: input.payload,
      body,
      createdAt: now,
      updatedAt: now,
    } as MemoryEntry;
    return entry as MemoryEntryOfType<T>;
  }

  async read(id: string): Promise<MemoryEntry | null> {
    const row = this.selectRowById(id);
    if (!row) return null;
    const uri = bodyPath(this.workspaceUri, row.type, row.id);
    const stored = await readBody(uri);
    const body = stripFrontmatter(stored ?? '');
    return rowToEntry(row, body);
  }

  async update<T extends MemoryType>(
    id: string,
    patch: UpdatePatch<T>,
  ): Promise<MemoryEntryOfType<T>> {
    const idType = parseMemoryIdType(id);
    if (!idType) throw new MemoryStoreError('invalid-id', `Bad id: ${id}`);

    const row = this.selectRowById(id);
    if (!row) throw new MemoryStoreError('not-found', `No entry with id ${id}`);

    if (row.type !== idType) {
      // Defensive: id prefix and stored type disagree. Treat as immutable.
      throw new MemoryStoreError('type-immutable', `Stored type ${row.type} != id prefix ${idType}`);
    }

    const now = Date.now();
    const nextTitle = patch.title ?? row.title;
    const nextPayload = patch.payload
      ? { ...JSON.parse(row.payload_json), ...patch.payload }
      : JSON.parse(row.payload_json);

    const uri = bodyPath(this.workspaceUri, row.type, row.id);

    // Always rewrite the body file: its frontmatter carries the lossless
    // payload + updated_at, so a payload-only patch (e.g. a status change with
    // no new body text) must still refresh the file. Preserve the existing
    // prose body when the caller doesn't supply one.
    const previousBody = await readBody(uri);
    const existingBodyText = stripFrontmatter(previousBody ?? '');
    const nextBodyText = patch.body ?? existingBodyText;
    const fullBody =
      renderFrontmatter({
        id: row.id,
        type: row.type,
        title: nextTitle,
        createdAt: row.created_at,
        updatedAt: now,
        payload: nextPayload,
      }) + nextBodyText;

    this.host.db.exec('BEGIN');
    try {
      this.host.db.run(
        `UPDATE memory_entries SET title = ?, payload_json = ?, updated_at = ? WHERE id = ?`,
        [nextTitle, JSON.stringify(nextPayload), now, id],
      );
      await writeBody(uri, fullBody);
      this.host.db.exec('COMMIT');
    } catch (err) {
      this.host.db.exec('ROLLBACK');
      if (previousBody !== null) {
        await writeBody(uri, previousBody);
      } else {
        await deleteBody(uri);
      }
      throw err;
    }
    await this.flushOrThrow();
    this._onDidChangeMemory.fire({ kind: 'update', entryId: id, entryType: row.type });

    const fresh = await this.read(id);
    if (!fresh) {
      throw new MemoryStoreError('not-found', `Entry ${id} vanished mid-update`);
    }
    return fresh as MemoryEntryOfType<T>;
  }

  async list<T extends MemoryType>(type: T): Promise<MemoryEntryOfType<T>[]> {
    const stmt = this.host.db.prepare(
      `SELECT id, type, title, payload_json, created_at, updated_at
         FROM memory_entries
        WHERE type = ?
        ORDER BY created_at DESC`,
    );
    try {
      stmt.bind([type]);
      const out: MemoryEntryOfType<T>[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as unknown as MemoryEntryRow;
        out.push(rowToEntry(row, '') as MemoryEntryOfType<T>);
      }
      return out;
    } finally {
      stmt.free();
    }
  }

  // --- Graph operations --------------------------------------------------

  async link(from: string, to: string, kind: LinkKind): Promise<void> {
    this.host.db.run(
      `INSERT OR IGNORE INTO memory_links (from_id, to_id, kind) VALUES (?, ?, ?)`,
      [from, to, kind],
    );
    await this.flushOrThrow();
    this._onDidChangeMemory.fire({ kind: 'link', fromId: from, toId: to, linkKind: kind });
  }

  async unlink(from: string, to: string, kind: LinkKind): Promise<void> {
    this.host.db.run(
      `DELETE FROM memory_links WHERE from_id = ? AND to_id = ? AND kind = ?`,
      [from, to, kind],
    );
    await this.flushOrThrow();
    this._onDidChangeMemory.fire({ kind: 'unlink', fromId: from, toId: to, linkKind: kind });
  }

  async walk(from: string, kind: LinkKind): Promise<MemoryEntry[]> {
    const stmt = this.host.db.prepare(
      `SELECT e.id, e.type, e.title, e.payload_json, e.created_at, e.updated_at
         FROM memory_links l
         JOIN memory_entries e ON e.id = l.to_id
        WHERE l.from_id = ? AND l.kind = ?`,
    );
    try {
      stmt.bind([from, kind]);
      const out: MemoryEntry[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as unknown as MemoryEntryRow;
        out.push(rowToEntry(row, ''));
      }
      return out;
    } finally {
      stmt.free();
    }
  }

  async backlinks(to: string, kind?: LinkKind): Promise<MemoryLink[]> {
    const sql = kind
      ? `SELECT from_id, to_id, kind FROM memory_links WHERE to_id = ? AND kind = ?`
      : `SELECT from_id, to_id, kind FROM memory_links WHERE to_id = ?`;
    const params = kind ? [to, kind] : [to];
    const stmt = this.host.db.prepare(sql);
    try {
      stmt.bind(params);
      const out: MemoryLink[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as unknown as {
          from_id: string;
          to_id: string;
          kind: LinkKind;
        };
        out.push({ fromId: row.from_id, toId: row.to_id, kind: row.kind });
      }
      return out;
    } finally {
      stmt.free();
    }
  }

  // --- Convenience -------------------------------------------------------

  /** Single-shot create-Intent helper used by `deliveryos.project.create`. */
  async createIntent(
    rawIdea: string,
    projectTitle: string,
  ): Promise<MemoryEntryOfType<'intent'>> {
    const payload: IntentPayload = {
      rawIdea: { text: rawIdea, capturedAt: Date.now() },
      discovery: null,
    };
    return this.create({
      type: 'intent',
      title: projectTitle,
      payload,
      body: rawIdea,
    });
  }

  /** Find the PRD parent Requirement Memory entry for a project (by projectId in payload_json). */
  async loadPrdParent(projectId: string): Promise<DraftPrd | null> {
    const stmt = this.host.db.prepare(
      `SELECT id, type, title, payload_json, created_at, updated_at
         FROM memory_entries
        WHERE type = 'requirement'
          AND json_extract(payload_json, '$.kind') = 'prd'
          AND json_extract(payload_json, '$.projectId') = ?
        LIMIT 1`,
    );
    try {
      stmt.bind([projectId]);
      if (!stmt.step()) return null;
      const row = stmt.getAsObject() as unknown as import('./types').MemoryEntryRow;
      const stored = JSON.parse(row.payload_json) as {
        kind: 'prd';
        projectId: string;
        projectTitle: string;
        sections: PrdSection[];
        createdAt: number;
        updatedAt: number;
      };
      return {
        prdId: row.id,
        projectId: stored.projectId,
        projectTitle: stored.projectTitle,
        sections: stored.sections,
        createdAt: stored.createdAt,
        updatedAt: stored.updatedAt,
      };
    } finally {
      stmt.free();
    }
  }

  /**
   * Create or update the PRD parent Requirement Memory entry.
   * The entry's id IS the prdId — no duplication in stored payload.
   * Pass existingPrdId to update; omit to create a new entry + link.
   */
  async upsertPrdParent(
    intentEntry: { readonly id: string; readonly title: string },
    sections: readonly PrdSection[],
    existingPrdId?: string,
  ): Promise<DraftPrd> {
    const now = Date.now();
    const body = renderPrdMarkdown({ projectTitle: intentEntry.title, sections });

    if (existingPrdId) {
      const existing = await this.read(existingPrdId);
      const createdAt = existing?.createdAt ?? now;
      const storedPayload = {
        kind: 'prd' as const,
        projectId: intentEntry.id,
        projectTitle: intentEntry.title,
        sections: [...sections],
        createdAt,
        updatedAt: now,
      };
      await this.update<'requirement'>(existingPrdId, {
        payload: storedPayload as unknown as Partial<RequirementPayload>,
        body,
      });
      return {
        prdId: existingPrdId,
        projectId: intentEntry.id,
        projectTitle: intentEntry.title,
        sections: [...sections],
        createdAt,
        updatedAt: now,
      };
    }

    const storedPayload = {
      kind: 'prd' as const,
      projectId: intentEntry.id,
      projectTitle: intentEntry.title,
      sections: [...sections],
      createdAt: now,
      updatedAt: now,
    };
    const entry = await this.create<'requirement'>({
      type: 'requirement',
      title: intentEntry.title,
      payload: storedPayload as unknown as RequirementPayload,
      body,
    });
    await this.link(entry.id, intentEntry.id, 'derives-from');
    return {
      prdId: entry.id,
      projectId: intentEntry.id,
      projectTitle: intentEntry.title,
      sections: [...sections],
      createdAt: now,
      updatedAt: now,
    };
  }

  // --- Requirement-item CRUD (CHUNK-07) ---------------------------------

  /** List all requirement-item entries that derive from the given PRD. */
  async listRequirementItems(prdId: string): Promise<RequirementItemRecord[]> {
    const stmt = this.host.db.prepare(
      `SELECT e.id, e.title, e.payload_json, e.created_at, e.updated_at
         FROM memory_entries e
         JOIN memory_links l ON l.from_id = e.id
        WHERE e.type = 'requirement'
          AND json_extract(e.payload_json, '$.kind') = 'requirement-item'
          AND l.to_id = ?
          AND l.kind = 'derives-from'
        ORDER BY json_extract(e.payload_json, '$.id') ASC`,
    );
    try {
      stmt.bind([prdId]);
      const out: RequirementItemRecord[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as unknown as {
          id: string;
          title: string;
          payload_json: string;
          created_at: number;
          updated_at: number;
        };
        const payload = JSON.parse(row.payload_json) as StoredRequirementItemPayload;
        out.push({
          entryId: row.id,
          payload,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
      return out;
    } finally {
      stmt.free();
    }
  }

  /**
   * Batch-create requirement-item entries from a parsed decomposition. The
   * host assigns sequential `REQ-NNN` IDs starting from the next available
   * across the entire store (NOT per-PRD — IDs are stable across the project).
   * Each item gets `derives-from` linked to the PRD.
   *
   * Returns the created `entryId`s in input order.
   */
  async createRequirementItems(
    prdId: string,
    items: readonly DecomposedRequirement[],
  ): Promise<readonly string[]> {
    if (items.length === 0) return [];
    let nextNum = await this.nextRequirementIdNumber();
    const created: string[] = [];
    for (const item of items) {
      const reqId = formatReqId(nextNum++);
      const storedPayload: StoredRequirementItemPayload = {
        kind: 'requirement-item',
        id: reqId,
        title: item.title,
        category: item.category,
        priority: item.priority,
        sourcePrdSection: item.sourcePrdSection,
        text: item.description,
      };
      const entry = await this.create<'requirement'>({
        type: 'requirement',
        title: `${reqId} — ${item.title}`,
        payload: storedPayload as unknown as RequirementPayload,
        body: item.description,
      });
      await this.link(entry.id, prdId, 'derives-from');
      created.push(entry.id);
    }
    return created;
  }

  /**
   * Patch a requirement-item entry. `kind` and `id` (REQ-NNN) are preserved
   * regardless of the patch contents — the host owns ID assignment.
   */
  async updateRequirementItem(
    entryId: string,
    patch: {
      readonly title?: string;
      readonly description?: string;
      readonly category?: RequirementCategory;
      readonly priority?: RequirementPriority;
      readonly sourcePrdSection?: string;
    },
  ): Promise<RequirementItemRecord> {
    const row = this.selectRowById(entryId);
    if (!row) {
      throw new MemoryStoreError('not-found', `No requirement-item ${entryId}`);
    }
    const stored = JSON.parse(row.payload_json) as StoredRequirementItemPayload;
    if (stored.kind !== 'requirement-item') {
      throw new MemoryStoreError(
        'type-immutable',
        `Entry ${entryId} is not a requirement-item (kind=${String(stored.kind)})`,
      );
    }
    const nextStored: StoredRequirementItemPayload = {
      ...stored,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { text: patch.description } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.sourcePrdSection !== undefined ? { sourcePrdSection: patch.sourcePrdSection } : {}),
    };
    const nextEntryTitle = `${nextStored.id} — ${nextStored.title}`;
    const updatePatch: UpdatePatch<'requirement'> = {
      title: nextEntryTitle,
      payload: nextStored as unknown as Partial<RequirementPayload>,
      ...(patch.description !== undefined ? { body: patch.description } : {}),
    };
    await this.update<'requirement'>(entryId, updatePatch);
    const fresh = this.selectRowById(entryId);
    if (!fresh) throw new MemoryStoreError('not-found', `Entry ${entryId} vanished mid-update`);
    return {
      entryId: fresh.id,
      payload: nextStored,
      createdAt: fresh.created_at,
      updatedAt: fresh.updated_at,
    };
  }

  /** Delete a requirement-item entry. Removes SQL row, links, and body file. */
  async deleteRequirementItem(entryId: string): Promise<void> {
    const row = this.selectRowById(entryId);
    if (!row) return;
    const stored = JSON.parse(row.payload_json) as StoredRequirementItemPayload;
    if (stored.kind !== 'requirement-item') {
      throw new MemoryStoreError(
        'type-immutable',
        `Entry ${entryId} is not a requirement-item (kind=${String(stored.kind)})`,
      );
    }
    const uri = bodyPath(this.workspaceUri, row.type, row.id);
    this.host.db.exec('BEGIN');
    try {
      this.host.db.run(`DELETE FROM memory_links WHERE from_id = ? OR to_id = ?`, [
        entryId,
        entryId,
      ]);
      this.host.db.run(`DELETE FROM memory_entries WHERE id = ?`, [entryId]);
      this.host.db.exec('COMMIT');
    } catch (err) {
      this.host.db.exec('ROLLBACK');
      throw err;
    }
    await deleteBody(uri);
    await this.flushOrThrow();
    this._onDidChangeMemory.fire({ kind: 'update', entryId, entryType: row.type });
  }

  // --- Change Request CRUD -----------------------------------------------

  /** Create a new CR entry in status 'logged', linked derives-from the PRD. */
  async createChangeRequest(
    prdId: string,
    description: string,
    prdSnapshotSections: readonly PrdSection[],
  ): Promise<ChangeRequestRecord> {
    const nextNum = await this.nextCrIdNumber();
    const crId = formatCrId(nextNum);
    const payload: ChangeRequestPayload = {
      kind: 'change-request',
      id: crId,
      description,
      status: 'logged',
      prdSnapshotSections,
    };
    const entry = await this.create<'change-request'>({
      type: 'change-request',
      title: `${crId} — ${description.slice(0, 80)}`,
      payload: payload as unknown as MemoryPayloadOfType<'change-request'>,
      body: description,
    });
    await this.link(entry.id, prdId, 'derives-from');
    return {
      entryId: entry.id,
      payload,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  /** List all CR entries that derive from the given PRD. */
  async listChangeRequests(prdId: string): Promise<ChangeRequestRecord[]> {
    const stmt = this.host.db.prepare(
      `SELECT e.id, e.payload_json, e.created_at, e.updated_at
         FROM memory_entries e
         JOIN memory_links l ON l.from_id = e.id
        WHERE e.type = 'change-request'
          AND l.to_id = ?
          AND l.kind = 'derives-from'
        ORDER BY json_extract(e.payload_json, '$.id') ASC`,
    );
    try {
      stmt.bind([prdId]);
      const out: ChangeRequestRecord[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as unknown as {
          id: string;
          payload_json: string;
          created_at: number;
          updated_at: number;
        };
        const payload = JSON.parse(row.payload_json) as ChangeRequestPayload;
        out.push({
          entryId: row.id,
          payload,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
      return out;
    } finally {
      stmt.free();
    }
  }

  /** Load a single CR by its SQL entry id. Returns null if not found. */
  async loadChangeRequest(entryId: string): Promise<ChangeRequestRecord | null> {
    const row = this.selectRowById(entryId);
    if (!row || row.type !== 'change-request') return null;
    const payload = JSON.parse(row.payload_json) as ChangeRequestPayload;
    return {
      entryId: row.id,
      payload,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** Patch a CR entry. `kind` and `id` (CR-NNN) are preserved. */
  async updateChangeRequest(
    entryId: string,
    patch: Partial<Omit<ChangeRequestPayload, 'kind' | 'id'>>,
  ): Promise<ChangeRequestRecord> {
    const row = this.selectRowById(entryId);
    if (!row) throw new MemoryStoreError('not-found', `No change-request ${entryId}`);
    const stored = JSON.parse(row.payload_json) as ChangeRequestPayload;
    if (stored.kind !== 'change-request') {
      throw new MemoryStoreError(
        'type-immutable',
        `Entry ${entryId} is not a change-request (kind=${String(stored.kind)})`,
      );
    }
    const next: ChangeRequestPayload = { ...stored, ...patch };
    await this.update<'change-request'>(entryId, {
      payload: next as unknown as Partial<MemoryPayloadOfType<'change-request'>>,
    });
    const fresh = this.selectRowById(entryId);
    if (!fresh) throw new MemoryStoreError('not-found', `Entry ${entryId} vanished mid-update`);
    return {
      entryId: fresh.id,
      payload: next,
      createdAt: fresh.created_at,
      updatedAt: fresh.updated_at,
    };
  }

  /** Write `addresses` links from a CR to each affected requirement entry. */
  async linkCrToRequirements(crEntryId: string, requirementEntryIds: readonly string[]): Promise<void> {
    for (const reqId of requirementEntryIds) {
      await this.link(crEntryId, reqId, 'addresses');
    }
  }

  // --- Bug CRUD (post-build iteration loop) ------------------------------

  /**
   * Create a new bug entry in status 'open', linked `derives-from` the project
   * (PRD intent). If `targetRequirementId` is given, also writes an `addresses`
   * link to the violated requirement.
   */
  async createBug(
    projectId: string,
    input: {
      readonly description: string;
      readonly severity: BugSeverity;
      readonly area?: string;
      readonly discoveredIn?: string;
      readonly targetRequirementId?: string;
      readonly notes?: string;
    },
  ): Promise<BugRecord> {
    const nextNum = await this.nextBugIdNumber();
    const bugId = formatBugId(nextNum);
    const payload: BugPayload = {
      kind: 'bug',
      id: bugId,
      description: input.description,
      severity: input.severity,
      status: 'open',
      ...(input.area ? { area: input.area } : {}),
      ...(input.discoveredIn ? { discoveredIn: input.discoveredIn } : {}),
      ...(input.targetRequirementId ? { targetRequirementId: input.targetRequirementId } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    };
    const entry = await this.create<'bug'>({
      type: 'bug',
      title: `${bugId} — ${input.description.slice(0, 80)}`,
      payload: payload as unknown as MemoryPayloadOfType<'bug'>,
      body: input.description,
    });
    await this.link(entry.id, projectId, 'derives-from');
    if (input.targetRequirementId) {
      await this.link(entry.id, input.targetRequirementId, 'addresses');
    }
    return {
      entryId: entry.id,
      payload,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  /** List all bug entries that derive from the given project (PRD intent). */
  async listBugs(projectId: string): Promise<BugRecord[]> {
    const stmt = this.host.db.prepare(
      `SELECT e.id, e.payload_json, e.created_at, e.updated_at
         FROM memory_entries e
         JOIN memory_links l ON l.from_id = e.id
        WHERE e.type = 'bug'
          AND l.to_id = ?
          AND l.kind = 'derives-from'
        ORDER BY json_extract(e.payload_json, '$.id') ASC`,
    );
    try {
      stmt.bind([projectId]);
      const out: BugRecord[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as unknown as {
          id: string;
          payload_json: string;
          created_at: number;
          updated_at: number;
        };
        const payload = JSON.parse(row.payload_json) as BugPayload;
        out.push({
          entryId: row.id,
          payload,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
      return out;
    } finally {
      stmt.free();
    }
  }

  /** Load a single bug by its SQL entry id. Returns null if not found. */
  async loadBug(entryId: string): Promise<BugRecord | null> {
    const row = this.selectRowById(entryId);
    if (!row || row.type !== 'bug') return null;
    const payload = JSON.parse(row.payload_json) as BugPayload;
    return {
      entryId: row.id,
      payload,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** Patch a bug entry. `kind` and `id` (BUG-NNN) are preserved. */
  async updateBug(
    entryId: string,
    patch: Partial<Omit<BugPayload, 'kind' | 'id'>>,
  ): Promise<BugRecord> {
    const row = this.selectRowById(entryId);
    if (!row) throw new MemoryStoreError('not-found', `No bug ${entryId}`);
    const stored = JSON.parse(row.payload_json) as BugPayload;
    if (stored.kind !== 'bug') {
      throw new MemoryStoreError(
        'type-immutable',
        `Entry ${entryId} is not a bug (kind=${String(stored.kind)})`,
      );
    }
    const next: BugPayload = { ...stored, ...patch };
    await this.update<'bug'>(entryId, {
      payload: next as unknown as Partial<MemoryPayloadOfType<'bug'>>,
    });
    const fresh = this.selectRowById(entryId);
    if (!fresh) throw new MemoryStoreError('not-found', `Entry ${entryId} vanished mid-update`);
    return {
      entryId: fresh.id,
      payload: next,
      createdAt: fresh.created_at,
      updatedAt: fresh.updated_at,
    };
  }

  /** Write an `addresses` link from a bug to the requirement it violates. */
  async linkBugToRequirement(bugEntryId: string, requirementEntryId: string): Promise<void> {
    await this.link(bugEntryId, requirementEntryId, 'addresses');
  }

  // --- Test-spec CRUD (CHUNK-08) ----------------------------------------

  /**
   * Look up the test-spec linked from a Requirement via `has-test-spec`.
   * Returns null when no edge exists.
   */
  async getTestSpec(requirementEntryId: string): Promise<TestSpecRecord | null> {
    const stmt = this.host.db.prepare(
      `SELECT e.id, e.title, e.payload_json, e.created_at, e.updated_at
         FROM memory_entries e
         JOIN memory_links l ON l.to_id = e.id
        WHERE e.type = 'test-spec'
          AND l.from_id = ?
          AND l.kind = 'has-test-spec'
        LIMIT 1`,
    );
    try {
      stmt.bind([requirementEntryId]);
      if (!stmt.step()) return null;
      const row = stmt.getAsObject() as unknown as {
        id: string;
        title: string;
        payload_json: string;
        created_at: number;
        updated_at: number;
      };
      const payload = JSON.parse(row.payload_json) as StoredTestSpecPayload;
      const uri = bodyPath(this.workspaceUri, 'test-spec', row.id);
      const stored = await readBody(uri);
      const body = stripFrontmatter(stored ?? '');
      return {
        entryId: row.id,
        title: row.title,
        body,
        payload,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } finally {
      stmt.free();
    }
  }

  /**
   * Create or overwrite the test-spec for a given Requirement entry. On
   * overwrite, the previous entry + links + markdown body are removed in a
   * single tx, then the new row + body + link are written.
   *
   * Also patches the parent Requirement's `verificationCriteria` field
   * (plain-string list — `RequirementPayload.verificationCriteria` is
   * `readonly string[]`) via the underlying `update<'requirement'>` path.
   *
   * Returns the freshly-stored test-spec record.
   */
  async createOrOverwriteTestSpec(args: {
    readonly requirementEntryId: string;
    /** Parsed criteria — the host re-parses raw on every commit. */
    readonly verificationCriteria: readonly VerificationCriterion[];
    readonly cases: readonly TestCase[];
    readonly openQuestions: readonly string[];
    readonly confidence: TestSpecConfidence;
    /** AI's verbatim markdown response — stored as the entry body. */
    readonly raw: string;
  }): Promise<TestSpecRecord> {
    const requirementRow = this.selectRowById(args.requirementEntryId);
    if (!requirementRow) {
      throw new MemoryStoreError(
        'not-found',
        `No requirement entry ${args.requirementEntryId}`,
      );
    }
    const reqStored = JSON.parse(requirementRow.payload_json) as StoredRequirementItemPayload;
    if (reqStored.kind !== 'requirement-item') {
      throw new MemoryStoreError(
        'type-immutable',
        `Entry ${args.requirementEntryId} is not a requirement-item`,
      );
    }

    // Overwrite path: drop any prior test-spec for this requirement.
    const existing = await this.getTestSpec(args.requirementEntryId);
    if (existing) {
      const existingUri = bodyPath(this.workspaceUri, 'test-spec', existing.entryId);
      this.host.db.exec('BEGIN');
      try {
        this.host.db.run(`DELETE FROM memory_links WHERE from_id = ? OR to_id = ?`, [
          existing.entryId,
          existing.entryId,
        ]);
        this.host.db.run(`DELETE FROM memory_entries WHERE id = ?`, [existing.entryId]);
        this.host.db.exec('COMMIT');
      } catch (err) {
        this.host.db.exec('ROLLBACK');
        throw err;
      }
      await deleteBody(existingUri);
    }

    // Create the new test-spec entry. Use the generic memory id generator
    // (UUID with `test-spec-` prefix); store the human-visible TS-<reqId>
    // separately in `payload.id`. Tree + URI use the SQLite row id.
    const scenarios: TestScenario[] = args.cases.map((c) => ({
      id: c.id,
      description: c.title,
      steps: [...c.bullets],
      expected: [],
    }));
    const testSpecUserId = formatTestSpecId(reqStored.id);
    const storedPayload: StoredTestSpecPayload = {
      kind: 'test-spec',
      id: testSpecUserId,
      requirementUserId: reqStored.id,
      requirementId: args.requirementEntryId,
      scenarios,
      cases: [...args.cases],
      verificationCriteria: [...args.verificationCriteria],
      openQuestions: [...args.openQuestions],
      confidence: args.confidence,
    };
    const entryTitle = `${testSpecUserId} — ${reqStored.title}`;
    const created = await this.create<'test-spec'>({
      type: 'test-spec',
      title: entryTitle,
      payload: storedPayload as unknown as TestSpecPayload,
      body: args.raw,
    });
    await this.link(args.requirementEntryId, created.id, 'has-test-spec');

    // Patch the parent requirement: write the plain-string verification
    // criteria (canonical `RequirementPayload.verificationCriteria` shape).
    const nextReqPayload: StoredRequirementItemPayload = {
      ...reqStored,
      verificationCriteria: args.verificationCriteria.map((vc) => vc.text),
    };
    await this.update<'requirement'>(args.requirementEntryId, {
      payload: nextReqPayload as unknown as Partial<RequirementPayload>,
    });

    // Round-trip the test-spec record to read the freshly-persisted timestamps.
    const fresh = await this.getTestSpec(args.requirementEntryId);
    if (!fresh) {
      throw new MemoryStoreError('not-found', `Test-spec for ${args.requirementEntryId} vanished mid-create`);
    }
    return fresh;
  }

  /** Project a stored test-spec record to the contracts-level `TestSpec` shape. */
  toTestSpec(record: TestSpecRecord): TestSpec {
    return {
      id: record.payload.id,
      requirementEntryId: record.payload.requirementId,
      requirementId: record.payload.requirementUserId,
      title: record.title,
      cases: record.payload.cases,
      openQuestions: record.payload.openQuestions,
      raw: record.body,
      confidence: record.payload.confidence,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /** Find the on-disk URI for the test-spec markdown body, by SQLite row id. */
  testSpecBodyUri(testSpecEntryId: string): vscode.Uri {
    return bodyPath(this.workspaceUri, 'test-spec', testSpecEntryId);
  }

  // --- Execution Brief CRUD (CHUNK-09) ----------------------------------

  /**
   * Fetch a single brief by its SQLite row id. Returns null when the row
   * is missing or is not an execution-brief. The brief markdown body file
   * is read from disk; system frontmatter (id/type/title/created_at) is
   * stripped, leaving the canonical brief markdown (which starts with its
   * own frontmatter — brief_id, schema_version, ...).
   */
  async getBrief(briefEntryId: string): Promise<BriefRecord | null> {
    const row = this.selectRowById(briefEntryId);
    if (!row || row.type !== 'execution') return null;
    const payload = JSON.parse(row.payload_json) as StoredExecutionPayload;
    if (payload.kind !== 'execution-brief') return null;
    const uri = bodyPath(this.workspaceUri, 'execution', row.id);
    const stored = await readBody(uri);
    const body = stripFrontmatter(stored ?? '');
    return {
      entryId: row.id,
      title: row.title,
      body,
      payload,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * List every Execution Brief derived from the given Requirement entry,
   * ordered by `created_at` ascending (v1 first). The version number is
   * the 1-based position in this list.
   *
   * Joins via the `derives-from` link kind owned by CHUNK-03.
   */
  async listBriefsForRequirement(requirementEntryId: string): Promise<BriefRecord[]> {
    const stmt = this.host.db.prepare(
      `SELECT e.id, e.title, e.payload_json, e.created_at, e.updated_at
         FROM memory_entries e
         JOIN memory_links l ON l.from_id = e.id
        WHERE e.type = 'execution'
          AND l.to_id = ?
          AND l.kind = 'derives-from'
        ORDER BY e.created_at ASC`,
    );
    const briefs: BriefRecord[] = [];
    try {
      stmt.bind([requirementEntryId]);
      while (stmt.step()) {
        const row = stmt.getAsObject() as unknown as {
          id: string;
          title: string;
          payload_json: string;
          created_at: number;
          updated_at: number;
        };
        const payload = JSON.parse(row.payload_json) as StoredExecutionPayload;
        if (payload.kind !== 'execution-brief') continue;
        const uri = bodyPath(this.workspaceUri, 'execution', row.id);
        const stored = await readBody(uri);
        const body = stripFrontmatter(stored ?? '');
        briefs.push({
          entryId: row.id,
          title: row.title,
          body,
          payload,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
    } finally {
      stmt.free();
    }
    return briefs;
  }

  /**
   * Create a new immutable Execution Brief entry, link it to its requirement
   * via `derives-from`, and optionally link to a prior brief via `supersedes`.
   * Uses the cast-through pattern (`as unknown as ExecutionPayload`) to
   * extend the minimum stable `ExecutionPayload` shape with CHUNK-09's
   * richer fields — `contracts/src/memory.ts` is NOT touched.
   *
   * `args.briefMarkdown` is the canonical brief markdown (starts with its
   * own frontmatter block; serialised by `briefMarkdown.serialise`). This
   * function does not re-serialise — the host validator + serialiser are
   * the authoritative chain; this is just persistence.
   *
   * Briefs are immutable post-write. There is no `updateBrief`; revisions
   * create a fresh brief with `supersedes` set.
   */
  async createBrief(args: {
    readonly requirementEntryId: string;
    readonly projectId: string;
    readonly briefUserId: string;
    readonly briefMarkdown: string;
    readonly profile: string;
    readonly lockedAt: string;
    readonly briefVersion: number;
    readonly schemaVersion: number;
    readonly testSpecEntryId?: string;
    readonly supersedesEntryId?: string;
  }): Promise<BriefRecord> {
    const reqRow = this.selectRowById(args.requirementEntryId);
    if (!reqRow) {
      throw new MemoryStoreError(
        'not-found',
        `No requirement entry ${args.requirementEntryId}`,
      );
    }
    const reqStored = JSON.parse(reqRow.payload_json) as StoredRequirementItemPayload;
    if (reqStored.kind !== 'requirement-item') {
      throw new MemoryStoreError(
        'type-immutable',
        `Entry ${args.requirementEntryId} is not a requirement-item`,
      );
    }

    const storedPayload: StoredExecutionPayload = {
      kind: 'execution-brief',
      id: args.briefUserId,
      briefMarkdown: args.briefMarkdown,
      targetHarness: 'generic',
      briefVersion: args.briefVersion,
      projectId: args.projectId,
      requirementEntryId: args.requirementEntryId,
      requirementUserId: reqStored.id,
      ...(args.testSpecEntryId ? { testSpecEntryId: args.testSpecEntryId } : {}),
      ...(args.supersedesEntryId ? { supersedesEntryId: args.supersedesEntryId } : {}),
      schemaVersion: args.schemaVersion,
      profile: args.profile,
      lockedAt: args.lockedAt,
    };
    const entryTitle = `${args.briefUserId} — ${reqStored.id} ${reqStored.title}`;
    const created = await this.create<'execution'>({
      type: 'execution',
      title: entryTitle,
      payload: storedPayload as unknown as ExecutionPayload,
      body: args.briefMarkdown,
    });
    await this.link(created.id, args.requirementEntryId, 'derives-from');
    if (args.supersedesEntryId) {
      await this.link(created.id, args.supersedesEntryId, 'supersedes');
    }
    const fresh = await this.getBrief(created.id);
    if (!fresh) {
      throw new MemoryStoreError(
        'not-found',
        `Brief ${created.id} vanished mid-create`,
      );
    }
    return fresh;
  }

  /** Find the on-disk URI for the brief markdown body, by SQLite row id. */
  briefBodyUri(briefEntryId: string): vscode.Uri {
    return bodyPath(this.workspaceUri, 'execution', briefEntryId);
  }

  // --- Result CRUD (CHUNK-12) -------------------------------------------

  /**
   * List all result entries produced by the given brief entry, newest first.
   * Queries via the `produced` link kind (brief → result).
   */
  async listResultsForBrief(briefEntryId: string): Promise<Array<{
    entryId: string;
    title: string;
    payload: import('@deliveryos/contracts').ResultPayload;
    createdAt: number;
    updatedAt: number;
  }>> {
    const stmt = this.host.db.prepare(
      `SELECT e.id, e.title, e.payload_json, e.created_at, e.updated_at
         FROM memory_entries e
         JOIN memory_links l ON l.to_id = e.id
        WHERE l.from_id = ? AND l.kind = 'produced' AND e.type = 'result'
        ORDER BY e.created_at DESC`,
    );
    try {
      stmt.bind([briefEntryId]);
      const out: Array<{
        entryId: string;
        title: string;
        payload: import('@deliveryos/contracts').ResultPayload;
        createdAt: number;
        updatedAt: number;
      }> = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as unknown as {
          id: string;
          title: string;
          payload_json: string;
          created_at: number;
          updated_at: number;
        };
        out.push({
          entryId: row.id,
          title: row.title,
          payload: JSON.parse(row.payload_json) as import('@deliveryos/contracts').ResultPayload,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
      return out;
    } finally {
      stmt.free();
    }
  }

  /** Scan the store for the highest CR-NNN already assigned. Returns next number to use. */
  private async nextCrIdNumber(): Promise<number> {
    const stmt = this.host.db.prepare(
      `SELECT json_extract(payload_json, '$.id') AS crid
         FROM memory_entries
        WHERE type = 'change-request'`,
    );
    try {
      stmt.bind([]);
      let max = 0;
      while (stmt.step()) {
        const row = stmt.getAsObject() as unknown as { crid: string | null };
        const match = (row.crid ?? '').match(/^CR-(\d+)$/);
        if (match) {
          const n = Number(match[1]);
          if (Number.isFinite(n) && n > max) max = n;
        }
      }
      return max + 1;
    } finally {
      stmt.free();
    }
  }

  /** Scan the store for the highest BUG-NNN already assigned. Returns next number to use. */
  private async nextBugIdNumber(): Promise<number> {
    const stmt = this.host.db.prepare(
      `SELECT json_extract(payload_json, '$.id') AS bugid
         FROM memory_entries
        WHERE type = 'bug'`,
    );
    try {
      stmt.bind([]);
      let max = 0;
      while (stmt.step()) {
        const row = stmt.getAsObject() as unknown as { bugid: string | null };
        const match = (row.bugid ?? '').match(/^BUG-(\d+)$/);
        if (match) {
          const n = Number(match[1]);
          if (Number.isFinite(n) && n > max) max = n;
        }
      }
      return max + 1;
    } finally {
      stmt.free();
    }
  }

  /** Scan the store for the highest REQ-NNN already assigned. Returns next number to use. */
  private async nextRequirementIdNumber(): Promise<number> {
    const stmt = this.host.db.prepare(
      `SELECT json_extract(payload_json, '$.id') AS rid
         FROM memory_entries
        WHERE type = 'requirement'
          AND json_extract(payload_json, '$.kind') = 'requirement-item'`,
    );
    try {
      stmt.bind([]);
      let max = 0;
      while (stmt.step()) {
        const row = stmt.getAsObject() as unknown as { rid: string | null };
        const match = (row.rid ?? '').match(/^REQ-(\d+)$/);
        if (match) {
          const n = Number(match[1]);
          if (Number.isFinite(n) && n > max) max = n;
        }
      }
      return max + 1;
    } finally {
      stmt.free();
    }
  }

  // --- Projection (grep-able markdown mirror) ---------------------------

  /**
   * Read the entire store — every entry (with parsed payload) and every link.
   * Powers the markdown projection in `projection.ts`: the read-only,
   * driver-free interface the AI and other harnesses use instead of opening
   * the SQLite file. Bodies are not included; they already live on disk.
   */
  async exportAll(): Promise<ProjectionSnapshot> {
    const entries: ProjectionEntry[] = [];
    const eStmt = this.host.db.prepare(
      `SELECT id, type, title, payload_json, created_at, updated_at
         FROM memory_entries
        ORDER BY type ASC, created_at ASC`,
    );
    try {
      while (eStmt.step()) {
        const row = eStmt.getAsObject() as unknown as MemoryEntryRow;
        entries.push({
          id: row.id,
          type: row.type,
          title: row.title,
          payload: JSON.parse(row.payload_json) as unknown,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
    } finally {
      eStmt.free();
    }

    const links: MemoryLink[] = [];
    const lStmt = this.host.db.prepare(
      `SELECT from_id, to_id, kind FROM memory_links ORDER BY from_id ASC, kind ASC, to_id ASC`,
    );
    try {
      while (lStmt.step()) {
        const row = lStmt.getAsObject() as unknown as {
          from_id: string;
          to_id: string;
          kind: LinkKind;
        };
        links.push({ fromId: row.from_id, toId: row.to_id, kind: row.kind });
      }
    } finally {
      lStmt.free();
    }

    return { entries, links };
  }

  /**
   * Rebuild the entire SQLite index from the markdown on disk — entries (with
   * their full payloads) from the `<type>/*.md` body files, links from the
   * generated `LINKS.md` projection. Dangling links (an endpoint with no body
   * file) are skipped. This is the "delete memory.sqlite and recover"
   * capability: the body files are lossless, so the DB is disposable.
   *
   * Wipes and repopulates in a single transaction. Callers should regenerate
   * the projection afterwards. Returns the counts written.
   */
  async rebuildFromMarkdown(): Promise<{ entries: number; links: number }> {
    const parsedEntries: ParsedBodyFile[] = [];
    for (const type of MEMORY_TYPES) {
      const dir = memoryBodyDir(this.workspaceUri, type);
      let names: Array<[string, number]>;
      try {
        names = await vscode.workspace.fs.readDirectory(dir);
      } catch {
        continue; // no entries of this type yet
      }
      for (const [name] of names) {
        if (!name.endsWith('.md')) continue;
        const content = await readBody(vscode.Uri.joinPath(dir, name));
        if (!content) continue;
        const parsed = parseBodyFile(content);
        if (parsed && parsed.type === type) parsedEntries.push(parsed);
      }
    }

    const linksContent = await readBody(memoryLinksPath(this.workspaceUri));
    const linkRows = linksContent ? parseLinksFile(linksContent) : [];
    const ids = new Set(parsedEntries.map((e) => e.id));

    this.host.db.exec('BEGIN');
    try {
      this.host.db.run('DELETE FROM memory_links');
      this.host.db.run('DELETE FROM memory_entries');
      for (const e of parsedEntries) {
        this.host.db.run(
          `INSERT INTO memory_entries (id, type, title, payload_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [e.id, e.type, e.title, JSON.stringify(e.payload), e.createdAt, e.updatedAt],
        );
      }
      let links = 0;
      for (const l of linkRows) {
        if (!ids.has(l.fromId) || !ids.has(l.toId)) continue;
        this.host.db.run(
          `INSERT OR IGNORE INTO memory_links (from_id, to_id, kind) VALUES (?, ?, ?)`,
          [l.fromId, l.toId, l.kind],
        );
        links += 1;
      }
      this.host.db.exec('COMMIT');
      await this.flushOrThrow();
      return { entries: parsedEntries.length, links };
    } catch (err) {
      this.host.db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * Backfill body files that predate lossless frontmatter (no embedded
   * `payload_json`). Rewrites each such file from the DB row so the markdown
   * becomes a faithful, rebuildable mirror. Idempotent and cheap: files that
   * already carry a payload are left untouched. Run once on open.
   */
  async reprojectBodies(): Promise<number> {
    const { entries } = await this.exportAll();
    let rewritten = 0;
    for (const e of entries) {
      const uri = bodyPath(this.workspaceUri, e.type, e.id);
      const current = await readBody(uri);
      if (current !== null && current.includes('\npayload_json:')) continue;
      const body = stripFrontmatter(current ?? '');
      const fullBody =
        renderFrontmatter({
          id: e.id,
          type: e.type,
          title: e.title,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
          payload: e.payload,
        }) + body;
      await writeBody(uri, fullBody);
      rewritten += 1;
    }
    return rewritten;
  }

  // --- Internals ---------------------------------------------------------

  private selectRowById(id: string): MemoryEntryRow | null {
    const stmt = this.host.db.prepare(
      `SELECT id, type, title, payload_json, created_at, updated_at
         FROM memory_entries WHERE id = ? LIMIT 1`,
    );
    try {
      stmt.bind([id]);
      if (!stmt.step()) return null;
      return stmt.getAsObject() as unknown as MemoryEntryRow;
    } finally {
      stmt.free();
    }
  }

  private async flushOrThrow(): Promise<void> {
    try {
      await this.host.flush();
    } catch (err) {
      throw new MemoryStoreError(
        'flush-failed',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

function rowToEntry(row: MemoryEntryRow, body: string): MemoryEntry {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    payload: JSON.parse(row.payload_json),
    body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as MemoryEntry;
}

function formatReqId(n: number): string {
  if (n >= 1000) return `REQ-${String(n)}`;
  return `REQ-${String(n).padStart(3, '0')}`;
}

function formatCrId(n: number): string {
  if (n >= 1000) return `CR-${String(n)}`;
  return `CR-${String(n).padStart(3, '0')}`;
}

function formatBugId(n: number): string {
  if (n >= 1000) return `BUG-${String(n)}`;
  return `BUG-${String(n).padStart(3, '0')}`;
}

function formatTestSpecId(requirementUserId: string): string {
  return `TS-${requirementUserId}`;
}

function stripFrontmatter(content: string): string {
  if (!content.startsWith('---\n')) return content;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return content;
  return content.slice(end + 5);
}
