// CHUNK-13 § contracts/src/diff.ts — webview ↔ host message contract for
// the diff-results panel. Types defined inline (contracts cannot import
// from extension/).
// Webview-safe: no runtime imports (no `vscode`, no `sql.js`, no `fs`).

import type { FilesChangedList } from './result';

// --- Core diff types (canonical source; extension/src/diff/types.ts re-exports these) ---

export type { FilesChangedList };

export interface DiffInput {
  /** Already-normalised patterns from CHUNK-09's parser. */
  allowedPatterns: string[];
  /** Already-normalised patterns from CHUNK-09's parser. */
  forbiddenPatterns: string[];
  /** Structured shape from CHUNK-12. */
  filesChanged: FilesChangedList;
}

export type FileClassification =
  | 'allowed-and-touched'
  | 'forbidden-but-touched'
  | 'unclassified-but-touched';

export interface FileVerdict {
  path: string;
  classification: FileClassification;
  matchedRule: string | null;
  /** Which section the rule came from. */
  matchedSection: 7 | 8 | null;
}

export interface DiffNote {
  level: 'info' | 'warn' | 'error';
  message: string;
  path?: string;
}

export interface DiffOutcome {
  /** Identifier of the Result Memory entry this outcome is attached to. */
  resultId: string;
  verdict: 'pass' | 'fail';
  files: FileVerdict[];
  unmatchedAllowedPatterns: string[];
  notes: DiffNote[];
  inputs: DiffInput;
  engineVersion: 1;
  computedAt: number;
}

export interface BriefDiff {
  resultId: string;
  briefId: string;
  verdict: 'pass' | 'fail';
  forbiddenTouchedCount: number;
  filesChangedCount: number;
}

// --- Hook install plan types ---

export interface HookFileOp {
  path: string;
  exists: boolean;
  proposedContent: string;
  currentContent: string | null;
  mode: number;
}

export interface ManagedBlockPlanForDiff {
  action: 'create' | 'append-block' | 'replace-block' | 'noop';
  next: string;
  blockBody: string;
  error?: string;
}

export interface HookInstallPlan {
  profile: 'claude-code';
  platform: string;
  fileOps: HookFileOp[];
  settingsJsonPlan: ManagedBlockPlanForDiff;
}

// --- Webview ↔ host message shapes ---

export type DiffPanelInbound =
  | { kind: 'requestDiffOutcome'; resultId: string }
  | { kind: 'requestHookInstallPlan'; resultId: string }
  | { kind: 'applyHookInstall'; resultId: string }
  | { kind: 'openFile'; path: string }
  | { kind: 'copyPath'; path: string }
  | { kind: 'recomputeDiff'; resultId: string };

export type DiffPanelOutbound =
  | { kind: 'diffOutcome'; outcome: DiffOutcome }
  | { kind: 'hookInstallPlan'; plan: HookInstallPlan | null }
  | { kind: 'hookInstalled'; appliedAt: number }
  | { kind: 'error'; message: string };
