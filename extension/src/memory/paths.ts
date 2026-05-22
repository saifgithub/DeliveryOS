// CHUNK-03 § 2.10 — canonical on-disk path constants and helpers.
// Every consumer that touches `.deliveryos/` imports from here so a single
// rename refactor moves the layout.

import * as vscode from 'vscode';
import type { MemoryType } from '@deliveryos/contracts';

export const DELIVERYOS_DIR = '.deliveryos';
export const MEMORY_SQLITE_FILENAME = 'memory.sqlite';
export const MEMORY_BODY_DIR = 'memory';
export const README_FILENAME = 'README.md';

// CHUNK-03 § 3.2 — path constant only. CHUNK-03 does NOT open this DB; a
// later (post-MVP) chunk implements the cross-project store.
export const HARNESS_SQLITE_FILENAME = 'harness.sqlite';

export function deliveryosDir(workspace: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(workspace, DELIVERYOS_DIR);
}

export function memorySqlite(workspace: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(deliveryosDir(workspace), MEMORY_SQLITE_FILENAME);
}

export function memoryBodyDir(workspace: vscode.Uri, type: MemoryType): vscode.Uri {
  return vscode.Uri.joinPath(deliveryosDir(workspace), MEMORY_BODY_DIR, type);
}

export function readmePath(workspace: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(deliveryosDir(workspace), README_FILENAME);
}

export function globalStoragePath(context: vscode.ExtensionContext): vscode.Uri {
  return vscode.Uri.joinPath(context.globalStorageUri, HARNESS_SQLITE_FILENAME);
}
