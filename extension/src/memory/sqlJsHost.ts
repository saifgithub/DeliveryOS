// CHUNK-03 § 2.4 + § 12 — thin adapter around sql.js.
// Owns: loading the WASM blob, opening/creating the workspace DB file, and
// the explicit flush-per-mutation strategy. `MemoryStore` calls
// `host.flush()` after every write; this file is the future tuning seam
// (§ 12.3) for debounced flushing or a better-sqlite3 swap.
//
// Concurrency note (§ 13.7): VS Code's extension host is single-threaded,
// so the sql.js Database needs no internal locking. If a webview is ever
// given direct write access via a worker, this assumption breaks.

import * as vscode from 'vscode';
import initSqlJs from 'sql.js';
import { memorySqlite, deliveryosDir } from './paths';
import type { SqlJsDatabase, SqlJsStatic } from './sqlJsTypes';

export interface SqlJsHostOptions {
  readonly inMemoryOnly?: boolean; // tests open without disk flushing
}

export class SqlJsHost {
  private constructor(
    private readonly _db: SqlJsDatabase,
    private readonly dbUri: vscode.Uri | undefined,
    private readonly workspaceUri: vscode.Uri | undefined,
  ) {}

  get db(): SqlJsDatabase {
    return this._db;
  }

  /** Opens (or creates) the per-workspace `.deliveryos/memory.sqlite` DB. */
  static async open(
    context: vscode.ExtensionContext,
    workspaceUri: vscode.Uri,
  ): Promise<SqlJsHost> {
    const SQL = await loadSqlJs(context);
    const dbUri = memorySqlite(workspaceUri);

    let existing: Uint8Array | undefined;
    try {
      existing = await vscode.workspace.fs.readFile(dbUri);
    } catch (err) {
      if (!isFileNotFound(err)) throw err;
    }

    const db = existing ? new SQL.Database(existing) : new SQL.Database();
    return new SqlJsHost(db, dbUri, workspaceUri);
  }

  /** Opens an in-memory DB with no disk affinity. For unit tests. */
  static async openInMemory(wasmBytes: Uint8Array): Promise<SqlJsHost> {
    const SQL = await initSqlJs({ wasmBinary: toArrayBuffer(wasmBytes) });
    return new SqlJsHost(new SQL.Database(), undefined, undefined);
  }

  /** Persists the in-memory DB snapshot to disk. No-op when in-memory-only. */
  async flush(): Promise<void> {
    if (!this.dbUri || !this.workspaceUri) return;
    // Ensure the `.deliveryos/` directory exists before writing.
    await vscode.workspace.fs.createDirectory(deliveryosDir(this.workspaceUri));
    const snapshot = this._db.export();
    await vscode.workspace.fs.writeFile(this.dbUri, snapshot);
  }

  /** Closes the underlying DB. Safe to call twice. */
  close(): void {
    try {
      this._db.close();
    } catch {
      // Already closed.
    }
  }
}

async function loadSqlJs(context: vscode.ExtensionContext): Promise<SqlJsStatic> {
  const wasmUri = vscode.Uri.joinPath(context.extensionUri, 'dist', 'sql-wasm.wasm');
  const wasmBytes = await vscode.workspace.fs.readFile(wasmUri);
  // sql.js accepts a pre-loaded WASM blob via `wasmBinary`; this avoids any
  // network fetch or filesystem walk inside the bundled glue.
  return initSqlJs({ wasmBinary: toArrayBuffer(wasmBytes) });
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // vscode.workspace.fs.readFile returns Uint8Array; sql.js's wasmBinary
  // option is typed ArrayBuffer. Slice creates a clean copy that's
  // independent of the underlying Buffer if Node returned one.
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function isFileNotFound(err: unknown): boolean {
  return err instanceof vscode.FileSystemError && err.code === 'FileNotFound';
}
