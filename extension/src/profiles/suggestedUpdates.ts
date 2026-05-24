// CHUNK-10 § 3 + § 5 — compose per-profile suggested updates.
// Pure orchestration over `applyManagedBlock` from managedBlock.ts and the
// frozen body strings in bodies.ts. The vscode dep is injected as a small
// reader interface so the module is testable headlessly.

import { AGENTS_MD_BODY, CLAUDE_MD_BODY, CLAUDE_SETTINGS_STUB } from './bodies';
import {
  applyManagedBlock,
  readManagedBlock,
  BEGIN_MARKER_MD,
  END_MARKER_MD,
  SENTINEL_KEY_JSON,
} from './managedBlock';
import type { HarnessProfile, ManagedBlockFormat, SuggestedUpdate } from './types';

/**
 * Minimal workspace file reader for testability. Host wires this to
 * `vscode.workspace.fs.readFile` with `FileSystemError.FileNotFound` →
 * `null`.
 */
export interface WorkspaceFileReader {
  /**
   * @param relativePath workspace-relative POSIX path.
   * @returns UTF-8 string content, or `null` if the file does not exist.
   */
  readFile(relativePath: string): Promise<string | null>;
}

interface UpdatePlan {
  readonly file: string;
  readonly format: ManagedBlockFormat;
  readonly body: string;
}

const HAND_EDIT_WARNING =
  'Existing managed block was hand-edited; Apply will overwrite your changes.';

export async function computeSuggestedUpdates(
  profile: HarnessProfile,
  reader: WorkspaceFileReader,
): Promise<readonly SuggestedUpdate[]> {
  const plans = planFor(profile);
  const results: SuggestedUpdate[] = [];
  for (const plan of plans) {
    results.push(await computeOne(plan, reader));
  }
  return results;
}

function planFor(profile: HarnessProfile): readonly UpdatePlan[] {
  if (profile.name === 'claude-code') {
    return [
      { file: profile.instruction_file, format: 'md', body: CLAUDE_MD_BODY },
      {
        file: '.claude/settings.json',
        format: 'json',
        body: JSON.stringify(CLAUDE_SETTINGS_STUB, null, 2),
      },
    ];
  }
  if (profile.name === 'codex') {
    return [
      { file: profile.instruction_file, format: 'md', body: AGENTS_MD_BODY },
    ];
  }
  return [];
}

async function computeOne(
  plan: UpdatePlan,
  reader: WorkspaceFileReader,
): Promise<SuggestedUpdate> {
  let existing: string | null;
  try {
    existing = await reader.readFile(plan.file);
  } catch (e) {
    return errorUpdate(plan, null, `Failed to read ${plan.file}: ${(e as Error).message}`);
  }

  const result = applyManagedBlock(existing, plan.body, plan.format);
  const managedBlock = {
    file: plan.file,
    format: plan.format,
    begin: plan.format === 'md' ? BEGIN_MARKER_MD : SENTINEL_KEY_JSON,
    end: plan.format === 'md' ? END_MARKER_MD : SENTINEL_KEY_JSON,
    body: result.blockBody,
  } as const;

  const update: SuggestedUpdate = {
    file: plan.file,
    existingContent: existing,
    nextContent: result.next,
    managedBlock,
    action: result.action,
    ...(result.error !== undefined ? { error: result.error } : {}),
    ...(shouldWarn(result.action, existing, plan) ? { warning: HAND_EDIT_WARNING } : {}),
  };
  return update;
}

function shouldWarn(
  action: SuggestedUpdate['action'],
  existing: string | null,
  plan: UpdatePlan,
): boolean {
  if (action !== 'replace-block') return false;
  if (existing === null) return false;
  // Distinguish "real hand-edit" from "first install of a richer stub" by
  // checking whether the existing block was non-trivial. For json: any
  // existing sentinel value counts. For md/gitignore: an existing block
  // with meaningful body counts. Cheap heuristic: read the existing block
  // and confirm it's non-empty after stripping the stamp.
  const existingBlock = readManagedBlock(existing, plan.format);
  if (existingBlock === null) return false;
  const stripped = existingBlock.body.replace(/^<!--.*?-->\s*/, '').trim();
  return stripped.length > 0;
}

function errorUpdate(plan: UpdatePlan, existing: string | null, message: string): SuggestedUpdate {
  return {
    file: plan.file,
    existingContent: existing,
    nextContent: existing ?? '',
    managedBlock: {
      file: plan.file,
      format: plan.format,
      begin: plan.format === 'md' ? BEGIN_MARKER_MD : SENTINEL_KEY_JSON,
      end: plan.format === 'md' ? END_MARKER_MD : SENTINEL_KEY_JSON,
      body: '',
    },
    action: 'noop',
    error: message,
  };
}
