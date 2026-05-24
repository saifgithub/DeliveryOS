// CHUNK-11 § Handoff directory schema — single source of truth.
// Every downstream chunk that reads or writes `.deliveryos-handoff/`
// (CHUNK-12 Result Capture, CHUNK-13 Diff, CHUNK-14 Memory Update,
// CHUNK-15 Release Evidence) MUST import the constants and URI factories
// from this file. No other module is allowed to hard-code these strings.

import * as vscode from 'vscode';

// --- Directory layout (relative to workspace folder) ----------------------
//
// Dotfile form per CHUNK-11 spec finding #6 (resolves PRD § 18.Y
// inconsistency in favour of `.deliveryos-handoff/`).

export const HANDOFF_DIR = '.deliveryos-handoff';
export const HANDOFF_HISTORY_DIR = `${HANDOFF_DIR}/history`;

// current-*.md — regenerated every handoff; gitignorable.
export const CURRENT_EXECUTION_BRIEF = `${HANDOFF_DIR}/current-execution-brief.md`;
export const CURRENT_CONTEXT_PACKAGE = `${HANDOFF_DIR}/current-context-package.md`;
export const CURRENT_TEST_SPECIFICATION = `${HANDOFF_DIR}/current-test-specification.md`;
export const CURRENT_VERIFICATION_CHECKLIST = `${HANDOFF_DIR}/current-verification-checklist.md`;
export const MEMORY_SUMMARY = `${HANDOFF_DIR}/memory-summary.md`;
export const RESULT = `${HANDOFF_DIR}/result.md`;
export const HISTORY_GITKEEP = `${HANDOFF_HISTORY_DIR}/.gitkeep`;

// --- URI factories --------------------------------------------------------

export function handoffDirUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, HANDOFF_DIR);
}

export function historyDirUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, HANDOFF_HISTORY_DIR);
}

export function currentExecutionBriefUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, CURRENT_EXECUTION_BRIEF);
}

export function currentContextPackageUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, CURRENT_CONTEXT_PACKAGE);
}

export function currentTestSpecificationUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, CURRENT_TEST_SPECIFICATION);
}

export function currentVerificationChecklistUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, CURRENT_VERIFICATION_CHECKLIST);
}

export function memorySummaryUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, MEMORY_SUMMARY);
}

export function resultUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, RESULT);
}

export function historyGitkeepUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, HISTORY_GITKEEP);
}

export function historyBriefUri(workspace: vscode.WorkspaceFolder, timestamp: string): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, HANDOFF_HISTORY_DIR, `${timestamp}-execution-brief.md`);
}

export function historyResultUri(workspace: vscode.WorkspaceFolder, timestamp: string): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, HANDOFF_HISTORY_DIR, `${timestamp}-result.md`);
}

// --- Timestamp format (YYYYMMDDTHHmmssZ) ----------------------------------
//
// Basic-form ISO-8601 UTC, no separators:
//   - Sortable lexicographically.
//   - Filesystem-safe on Windows (no `:`).
//   - Round-trippable via parseHistoryTimestamp.

export function historyTimestamp(d: Date = new Date()): string {
  const yyyy = d.getUTCFullYear().toString().padStart(4, '0');
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = d.getUTCDate().toString().padStart(2, '0');
  const hh = d.getUTCHours().toString().padStart(2, '0');
  const mi = d.getUTCMinutes().toString().padStart(2, '0');
  const ss = d.getUTCSeconds().toString().padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

const TIMESTAMP_PATTERN = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;

export function parseHistoryTimestamp(ts: string): Date | null {
  const m = TIMESTAMP_PATTERN.exec(ts);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const ms = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
  );
  return Number.isNaN(ms) ? null : new Date(ms);
}

// --- Watcher helper -------------------------------------------------------

export function resultRelativePattern(
  workspace: vscode.WorkspaceFolder,
): vscode.RelativePattern {
  return new vscode.RelativePattern(workspace, RESULT);
}
