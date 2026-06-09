// DOS:P10 § reverse/paths.ts — directory schema for the REVERSE path
// (code → docs). Mirrors `handoff/paths.ts` but for the inverse flow:
// DeliveryOS writes an analysis brief, the agent reads the whole repo and
// writes a PRD markdown back, DeliveryOS watches + parses it.
//
// Isolated under `.deliveryos-reverse/` so the forward `result.md` watcher
// (handoff/resultWatcher.ts) never collides with the reverse `prd.md` watcher.

import * as vscode from 'vscode';

// --- Directory layout (relative to workspace folder) ----------------------

export const REVERSE_DIR = '.deliveryos-reverse';

// analysis-brief.md — DeliveryOS → agent (the instruction to derive a PRD).
export const REVERSE_ANALYSIS_BRIEF = `${REVERSE_DIR}/analysis-brief.md`;
// prd.md — agent → DeliveryOS (the inferred 8-section PRD markdown).
export const REVERSE_PRD = `${REVERSE_DIR}/prd.md`;

// --- URI factories --------------------------------------------------------

export function reverseDirUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, REVERSE_DIR);
}

export function reverseAnalysisBriefUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, REVERSE_ANALYSIS_BRIEF);
}

export function reversePrdUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(workspace.uri, REVERSE_PRD);
}

// --- Watcher helper -------------------------------------------------------

export function reversePrdRelativePattern(
  workspace: vscode.WorkspaceFolder,
): vscode.RelativePattern {
  return new vscode.RelativePattern(workspace, REVERSE_PRD);
}
