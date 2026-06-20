// CHUNK-03 § 2.8 — helpers for the markdown body files.
//
// The frontmatter is LOSSLESS: it carries the full typed payload (compact
// JSON) alongside id/type/title/timestamps, so the SQLite index can be deleted
// and rebuilt from the markdown alone (see MemoryStore.rebuildFromMarkdown).
// During normal operation SQLite remains the query/graph engine; the markdown
// is the durable, driver-free source of truth.

import * as vscode from 'vscode';
import {
  LINK_KINDS,
  MEMORY_TYPES,
  type LinkKind,
  type MemoryLink,
  type MemoryType,
} from '@deliveryos/contracts';
import { memoryBodyDir } from './paths';

const UTF8 = new TextEncoder();
const UTF8_DECODER = new TextDecoder('utf-8');

export function bodyPath(
  workspace: vscode.Uri,
  type: MemoryType,
  id: string,
): vscode.Uri {
  return vscode.Uri.joinPath(memoryBodyDir(workspace, type), `${id}.md`);
}

export async function writeBody(uri: vscode.Uri, content: string): Promise<void> {
  const parent = vscode.Uri.joinPath(uri, '..');
  await vscode.workspace.fs.createDirectory(parent);
  await vscode.workspace.fs.writeFile(uri, UTF8.encode(content));
}

export async function readBody(uri: vscode.Uri): Promise<string | null> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return UTF8_DECODER.decode(bytes);
  } catch (err) {
    if (err instanceof vscode.FileSystemError && err.code === 'FileNotFound') {
      return null;
    }
    throw err;
  }
}

export async function deleteBody(uri: vscode.Uri): Promise<void> {
  try {
    await vscode.workspace.fs.delete(uri, { useTrash: false });
  } catch {
    // Best-effort: ignore failures so we don't mask the real (caller's) error.
  }
}

export interface FrontmatterFields {
  readonly id: string;
  readonly type: MemoryType;
  readonly title: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  /** Full typed payload — serialised compact so the block stays one line. */
  readonly payload: unknown;
}

/**
 * YAML frontmatter block prefixed to every body file. `payload_json` is a
 * single compact line (no newlines), so `stripFrontmatter` removes it cleanly
 * and the prose body below is never polluted.
 */
export function renderFrontmatter(fields: FrontmatterFields): string {
  const escaped = fields.title.replace(/"/g, '\\"');
  return [
    '---',
    `id: ${fields.id}`,
    `type: ${fields.type}`,
    `title: "${escaped}"`,
    `created_at: ${new Date(fields.createdAt).toISOString()}`,
    `updated_at: ${new Date(fields.updatedAt).toISOString()}`,
    `payload_json: ${JSON.stringify(fields.payload)}`,
    '---',
    '',
  ].join('\n');
}

export interface ParsedBodyFile {
  readonly id: string;
  readonly type: MemoryType;
  readonly title: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly payload: unknown;
  /** Prose body with the frontmatter block stripped. */
  readonly body: string;
}

/**
 * Parse a lossless body file back into its row + payload. Returns null when the
 * file lacks a frontmatter block or a usable `payload_json` — i.e. a legacy
 * file written before payloads were embedded (those are backfilled on open).
 */
export function parseBodyFile(content: string): ParsedBodyFile | null {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const header = content.slice(4, end);
  const body = content.slice(end + 5);

  const fields = new Map<string, string>();
  for (const line of header.split('\n')) {
    const idx = line.indexOf(': ');
    if (idx === -1) continue;
    fields.set(line.slice(0, idx), line.slice(idx + 2));
  }

  const id = fields.get('id');
  const typeRaw = fields.get('type');
  const payloadRaw = fields.get('payload_json');
  if (!id || !typeRaw || !payloadRaw) return null;
  if (!(MEMORY_TYPES as readonly string[]).includes(typeRaw)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    return null;
  }

  const titleRaw = fields.get('title') ?? '';
  const title = titleRaw.replace(/^"|"$/g, '').replace(/\\"/g, '"');
  const createdAt = Date.parse(fields.get('created_at') ?? '');
  const updatedRaw = fields.get('updated_at');
  const updatedAt = updatedRaw ? Date.parse(updatedRaw) : createdAt;

  return {
    id,
    type: typeRaw as MemoryType,
    title,
    createdAt: Number.isNaN(createdAt) ? 0 : createdAt,
    updatedAt: Number.isNaN(updatedAt) ? (Number.isNaN(createdAt) ? 0 : createdAt) : updatedAt,
    payload,
    body,
  };
}

const LINK_KIND_SET: ReadonlySet<string> = new Set(LINK_KINDS);

/**
 * Parse the raw edge triples out of a generated `LINKS.md` projection. Lines
 * are `from_id  kind  to_id` (anything after is a `#` comment); headers and
 * prose are skipped because their second token is not a known link kind.
 */
export function parseLinksFile(content: string): MemoryLink[] {
  const out: MemoryLink[] = [];
  for (const line of content.split('\n')) {
    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 3) continue;
    const [fromId, kind, toId] = tokens;
    if (!LINK_KIND_SET.has(kind)) continue;
    out.push({ fromId, toId, kind: kind as LinkKind });
  }
  return out;
}
