// CHUNK-11 § .gitignore template (full) — opt-in `.gitignore` snippet that
// frames the handoff directory: ignore the current pointers + result.md,
// commit the history/ audit trail.
//
// All managed-block parsing/writing logic delegates to CHUNK-10's canonical
// `applyManagedBlock` — no parallel implementation lives here. CHUNK-10's
// applier already supports the `'gitignore'` format.

import * as vscode from 'vscode';
import {
  applyManagedBlock,
  buildManagedBlock,
  readManagedBlock,
  writeFileAtomic,
  type ManagedBlockAction,
  type ManagedBlockPlan,
} from '../profiles';

/**
 * The body inside the managed block. CHUNK-10's `buildManagedBlock` wraps
 * this with `# DELIVERYOS:BEGIN` / `# DELIVERYOS:END` markers + version
 * stamp.
 */
export function buildGitignoreBlock(): string {
  return [
    '# DeliveryOS handoff — auto-managed, regenerated each handoff',
    '# Ignore the current pointers and result.md, but COMMIT history/ for audit.',
    '.deliveryos-handoff/current-*.md',
    '.deliveryos-handoff/memory-summary.md',
    '.deliveryos-handoff/result.md',
    '!.deliveryos-handoff/history/',
    '!.deliveryos-handoff/history/**',
  ].join('\n');
}

export type GitignoreStateKind = 'absent' | 'present-matching' | 'present-differs';

export interface GitignoreState {
  readonly kind: GitignoreStateKind;
  /** Whole-file content; null when `.gitignore` does not exist. */
  readonly existing: string | null;
  /** What `applyManagedBlock` would do if we wrote now. */
  readonly plannedAction: ManagedBlockAction;
}

function gitignoreUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, '.gitignore');
}

async function readGitignore(workspace: vscode.WorkspaceFolder): Promise<string | null> {
  try {
    const bytes = await vscode.workspace.fs.readFile(gitignoreUri(workspace));
    return new TextDecoder().decode(bytes);
  } catch (err) {
    // FileSystemError code or name pattern, matches CHUNK-10's reader contract.
    if (isFileNotFound(err)) return null;
    throw err;
  }
}

function isFileNotFound(err: unknown): boolean {
  if (err instanceof Error) {
    const code = (err as Error & { code?: string }).code;
    if (code === 'FileNotFound' || code === 'ENOENT') return true;
    if (err.name === 'FileSystemError' && /FileNotFound/i.test(err.message)) return true;
    if (/ENOENT/i.test(err.message)) return true;
  }
  return false;
}

/**
 * Snapshot the current state of `.gitignore` vis-à-vis our managed block.
 * Returns:
 *   - `absent`             → file missing OR file present without our marker
 *   - `present-matching`   → marker present and body matches (idempotent re-apply is a noop)
 *   - `present-differs`    → marker present and body differs (hand-edit or stale)
 */
export async function gitignoreState(workspace: vscode.WorkspaceFolder): Promise<GitignoreState> {
  const existing = await readGitignore(workspace);
  const body = buildGitignoreBlock();
  const plan = applyManagedBlock(existing, body, 'gitignore');

  let kind: GitignoreStateKind;
  switch (plan.action) {
    case 'noop':
      kind = 'present-matching';
      break;
    case 'replace-block':
      kind = 'present-differs';
      break;
    default:
      // create + append-block both surface as "absent" to callers since the
      // managed block is not yet established in the file.
      kind = 'absent';
      break;
  }

  return { kind, existing, plannedAction: plan.action };
}

/**
 * Idempotently apply the managed block to `.gitignore`. Returns the plan
 * the caller can use to decide whether to surface a host-side warning modal
 * (for `replace-block` — the hand-edit case mirrors CHUNK-10 § 11.5a).
 */
export async function applyGitignoreBlock(
  workspace: vscode.WorkspaceFolder,
): Promise<ManagedBlockPlan> {
  const existing = await readGitignore(workspace);
  const body = buildGitignoreBlock();
  const plan = applyManagedBlock(existing, body, 'gitignore');

  if (plan.action !== 'noop') {
    await writeFileAtomic(vscode, gitignoreUri(workspace), plan.next);
  }

  return plan;
}

// Re-export so callers can render a preview / diff without re-importing
// from CHUNK-10's managedBlock.
export { buildManagedBlock, readManagedBlock };
