// CHUNK-03 § 2.5 + § 6 — durable memory layer consumed by every later chunk.
// Each mutation: BEGIN → SQL → markdown body write → COMMIT → host.flush().
// On any throw inside the transaction the catch issues ROLLBACK and
// best-effort-deletes the partial body file so we don't leak orphans.
//
// Per § 13.7 (concurrency): VS Code's extension host is single-threaded, so
// there is exactly one writer to this store. No locking.

import * as vscode from 'vscode';
import {
  type DecomposedRequirement,
  type DraftPrd,
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
} from '@deliveryos/contracts';
import { renderPrdMarkdown } from '../prd/sectionSchema';

export type MemoryChangeEvent =
  | { readonly kind: 'create' | 'update'; readonly entryId: string; readonly entryType: MemoryType }
  | { readonly kind: 'link' | 'unlink'; readonly fromId: string; readonly toId: string; readonly linkKind: LinkKind };
import { generateMemoryId, parseMemoryIdType } from './ids';
import {
  bodyPath,
  deleteBody,
  readBody,
  renderFrontmatter,
  writeBody,
} from './markdown';
import { runMigrations } from './migrations';
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
    const writingBody = patch.body !== undefined;
    const fullBody = writingBody
      ? renderFrontmatter({
          id: row.id,
          type: row.type,
          title: nextTitle,
          createdAt: row.created_at,
        }) + patch.body
      : null;

    // Snapshot the existing body file (if we're rewriting it) so we can
    // restore on rollback. Cheap — these files are small.
    const previousBody = writingBody ? await readBody(uri) : null;

    this.host.db.exec('BEGIN');
    try {
      this.host.db.run(
        `UPDATE memory_entries SET title = ?, payload_json = ?, updated_at = ? WHERE id = ?`,
        [nextTitle, JSON.stringify(nextPayload), now, id],
      );
      if (writingBody && fullBody !== null) {
        await writeBody(uri, fullBody);
      }
      this.host.db.exec('COMMIT');
    } catch (err) {
      this.host.db.exec('ROLLBACK');
      if (writingBody && previousBody !== null) {
        await writeBody(uri, previousBody);
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

function stripFrontmatter(content: string): string {
  if (!content.startsWith('---\n')) return content;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return content;
  return content.slice(end + 5);
}
