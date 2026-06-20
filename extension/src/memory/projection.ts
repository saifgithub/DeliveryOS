// Grep-able markdown projection of the SQLite memory index.
//
// SQLite (`memory.sqlite`) is the extension's query/graph engine, but it is
// NOT the AI's read path: a database needs a driver, a flat file does not.
// This module mirrors every entry and every link into plain markdown under
// `.deliveryos/memory/` so any harness — Claude Code, Codex, a shell script,
// a human — answers questions with `Read`/`grep`/`cat` and never opens the DB.
//
// The projection is derived and disposable: it is rewritten in full from the
// store on every mutation, so it can never drift. Never hand-edit these files
// (edit the per-entry body files in each `<type>/` folder instead).

import * as vscode from 'vscode';
import { MEMORY_TYPES, type MemoryLink, type MemoryType } from '@deliveryos/contracts';
import type { MemoryStore, ProjectionEntry, ProjectionSnapshot } from './MemoryStore';
import { memoryDir, memoryIndexPath, memoryLinksPath, memoryTypeRollupPath } from './paths';

const DO_NOT_EDIT =
  '> Generated, read-only projection of `memory.sqlite`. Rewritten on every change — do not edit; edit the body files in each `<type>/` folder instead.';

const UTF8 = new TextEncoder();

// --- Field extraction (generic across all 11 payload shapes) --------------

/** The user-visible id carried in a payload (BUG-001, REQ-003, CR-002, …). */
function userIdOf(entry: ProjectionEntry): string {
  const p = entry.payload;
  if (p && typeof p === 'object' && 'id' in p && typeof (p as { id: unknown }).id === 'string') {
    return (p as { id: string }).id;
  }
  return '';
}

/** The status field if the payload carries one (open, logged, pass, …). */
function statusOf(entry: ProjectionEntry): string {
  const p = entry.payload;
  if (
    p &&
    typeof p === 'object' &&
    'status' in p &&
    typeof (p as { status: unknown }).status === 'string'
  ) {
    return (p as { status: string }).status;
  }
  return '';
}

/**
 * Flatten a payload to `key: value` scalar pairs — strings, numbers, booleans,
 * and arrays of those. Nested objects / long-form prose are skipped (the body
 * file holds the prose). `id` is excluded; it is surfaced separately. This is
 * deliberately schema-agnostic so new payload kinds project for free.
 */
function scalarFields(payload: unknown): Array<[string, string]> {
  if (!payload || typeof payload !== 'object') return [];
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (key === 'id') continue;
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      if (value.length <= 200) out.push([key, value.replace(/\s+/g, ' ').trim()]);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      out.push([key, String(value)]);
    } else if (Array.isArray(value)) {
      const prims = value.filter(
        (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
      );
      if (prims.length > 0 && prims.length === value.length) {
        out.push([key, prims.join(', ')]);
      } else if (value.length > 0) {
        out.push([key, `[${value.length} item(s)]`]);
      }
    }
  }
  return out;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/** Escape a value for use inside a markdown table cell. */
function cell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function labelFor(entry: ProjectionEntry): string {
  const uid = userIdOf(entry);
  return uid ? `${uid} (${entry.id})` : entry.id;
}

// --- Renderers (pure; exported for tests) ---------------------------------

export function renderIndex(snapshot: ProjectionSnapshot): string {
  const lines: string[] = [
    '# Memory Index',
    '',
    DO_NOT_EDIT,
    '',
    `${snapshot.entries.length} entr${snapshot.entries.length === 1 ? 'y' : 'ies'}.`,
    '',
    '| entry_id | type | id | status | title | updated |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const e of snapshot.entries) {
    lines.push(
      `| ${cell(e.id)} | ${cell(e.type)} | ${cell(userIdOf(e))} | ${cell(statusOf(e))} | ${cell(e.title)} | ${iso(e.updatedAt)} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

export function renderLinks(snapshot: ProjectionSnapshot): string {
  const byId = new Map<string, ProjectionEntry>();
  for (const e of snapshot.entries) byId.set(e.id, e);
  const resolve = (id: string): string => {
    const e = byId.get(id);
    return e ? labelFor(e) : `${id} (missing)`;
  };

  const lines: string[] = [
    '# Memory Links',
    '',
    DO_NOT_EDIT,
    '',
    `${snapshot.links.length} link${snapshot.links.length === 1 ? '' : 's'}.`,
    '',
    'Format: `from_id  kind  to_id`  — trailing `#` comment resolves the human ids/titles.',
    '',
    '```',
  ];
  for (const l of snapshot.links) {
    lines.push(`${l.fromId}  ${l.kind}  ${l.toId}   # ${resolve(l.fromId)} --${l.kind}--> ${resolve(l.toId)}`);
  }
  lines.push('```', '');
  return lines.join('\n');
}

export function renderTypeRollup(
  type: MemoryType,
  snapshot: ProjectionSnapshot,
): string {
  const entries = snapshot.entries.filter((e) => e.type === type);
  const outbound = new Map<string, MemoryLink[]>();
  const inbound = new Map<string, MemoryLink[]>();
  const push = (map: Map<string, MemoryLink[]>, key: string, link: MemoryLink): void => {
    const list = map.get(key);
    if (list) list.push(link);
    else map.set(key, [link]);
  };
  for (const l of snapshot.links) {
    push(outbound, l.fromId, l);
    push(inbound, l.toId, l);
  }
  const byId = new Map<string, ProjectionEntry>();
  for (const e of snapshot.entries) byId.set(e.id, e);
  const label = (id: string): string => {
    const e = byId.get(id);
    return e ? labelFor(e) : `${id} (missing)`;
  };

  const lines: string[] = [
    `# ${type} memory`,
    '',
    DO_NOT_EDIT,
    '',
    `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} of type \`${type}\`.`,
    '',
  ];

  if (entries.length === 0) {
    lines.push('_None yet._', '');
    return lines.join('\n');
  }

  for (const e of entries) {
    const uid = userIdOf(e);
    lines.push(`## ${uid ? `${uid} — ` : ''}${e.title}`.trimEnd());
    lines.push('');
    lines.push(`- entry_id: ${e.id}`);
    if (uid) lines.push(`- id: ${uid}`);
    for (const [k, v] of scalarFields(e.payload)) lines.push(`- ${k}: ${v}`);
    lines.push(`- created: ${iso(e.createdAt)}`);
    lines.push(`- updated: ${iso(e.updatedAt)}`);
    const out = outbound.get(e.id) ?? [];
    const inc = inbound.get(e.id) ?? [];
    if (out.length > 0 || inc.length > 0) {
      lines.push('- links:');
      for (const l of out) lines.push(`  - ${l.kind} → ${label(l.toId)}`);
      for (const l of inc) lines.push(`  - ${l.kind} ← ${label(l.fromId)}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// --- Writer ---------------------------------------------------------------

/**
 * Subscribes to store mutations and keeps the markdown projection current.
 * Regeneration is debounced (so a batch of creates/links produces one rewrite)
 * and serialized (overlapping triggers coalesce into a single trailing run).
 * Write failures are logged, never thrown — a stale projection must not break
 * a memory mutation.
 */
export class MemoryProjection implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private pending = false;
  private disposed = false;

  constructor(
    private readonly store: MemoryStore,
    private readonly workspace: vscode.Uri,
    private readonly debounceMs = 150,
  ) {
    this.disposables.push(this.store.onDidChangeMemory(() => this.schedule()));
  }

  /** Rebuild every projection file now, awaiting completion. */
  async regenerateNow(): Promise<void> {
    if (this.disposed) return;
    if (this.running) {
      this.pending = true;
      return;
    }
    this.running = true;
    try {
      const snapshot = await this.store.exportAll();
      await vscode.workspace.fs.createDirectory(memoryDir(this.workspace));
      await this.writeAtomic(memoryIndexPath(this.workspace), renderIndex(snapshot));
      await this.writeAtomic(memoryLinksPath(this.workspace), renderLinks(snapshot));
      for (const type of MEMORY_TYPES) {
        await this.writeAtomic(
          memoryTypeRollupPath(this.workspace, type),
          renderTypeRollup(type, snapshot),
        );
      }
    } catch (err) {
      console.error(
        'DeliveryOS: memory projection regeneration failed —',
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      this.running = false;
      if (this.pending && !this.disposed) {
        this.pending = false;
        void this.regenerateNow();
      }
    }
  }

  private schedule(): void {
    if (this.disposed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.regenerateNow();
    }, this.debounceMs);
  }

  private async writeAtomic(uri: vscode.Uri, content: string): Promise<void> {
    const tmp = vscode.Uri.file(`${uri.fsPath}.deliveryos.tmp`);
    await vscode.workspace.fs.writeFile(tmp, UTF8.encode(content));
    await vscode.workspace.fs.rename(tmp, uri, { overwrite: true });
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
  }
}
