// CHUNK-03 § 2.5 + § 6 — durable memory layer consumed by every later chunk.
// Each mutation: BEGIN → SQL → markdown body write → COMMIT → host.flush().
// On any throw inside the transaction the catch issues ROLLBACK and
// best-effort-deletes the partial body file so we don't leak orphans.
//
// Per § 13.7 (concurrency): VS Code's extension host is single-threaded, so
// there is exactly one writer to this store. No locking.

import * as vscode from 'vscode';
import {
  type IntentPayload,
  type LinkKind,
  type MemoryEntry,
  type MemoryEntryOfType,
  type MemoryPayloadOfType,
  type MemoryLink,
  type MemoryType,
} from '@deliveryos/contracts';

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

function stripFrontmatter(content: string): string {
  if (!content.startsWith('---\n')) return content;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return content;
  return content.slice(end + 5);
}
