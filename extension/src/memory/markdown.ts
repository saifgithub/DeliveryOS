// CHUNK-03 § 2.8 — helpers for the markdown body files.
// Frontmatter is informational only; the SQLite row is the source of truth.

import * as vscode from 'vscode';
import type { MemoryType } from '@deliveryos/contracts';
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
}

/** 4-line YAML frontmatter block prefixed to every body file. */
export function renderFrontmatter(fields: FrontmatterFields): string {
  const escaped = fields.title.replace(/"/g, '\\"');
  return [
    '---',
    `id: ${fields.id}`,
    `type: ${fields.type}`,
    `title: "${escaped}"`,
    `created_at: ${new Date(fields.createdAt).toISOString()}`,
    '---',
    '',
  ].join('\n');
}
