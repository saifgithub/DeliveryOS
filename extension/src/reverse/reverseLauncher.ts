// DOS:P10 § reverse/reverseLauncher.ts — builds + launches the agent command
// for the REVERSE path. Mirrors `handoff/terminalLauncher.ts#buildCommand`:
// reuses the active HarnessProfile's `command_template` and `shellQuote`, but
// substitutes the reverse paths — ${BRIEF_PATH} = analysis-brief.md and
// ${RESULT_PATH} = prd.md (the file the agent writes the PRD to).
//
// shouldExecute=false — the user presses Enter, which is their explicit consent
// to let the agent read the repo (the audit point, same as the forward handoff).

import * as path from 'node:path';
import * as vscode from 'vscode';
import type { HarnessProfile } from '../profiles';
import { shellQuote } from '../handoff/terminalLauncher';
import { REVERSE_ANALYSIS_BRIEF, REVERSE_PRD } from './paths';

/**
 * Build the pre-typed reverse command for a profile + workspace. Reads the
 * profile's `command_template` and substitutes the three permitted placeholders
 * against the `.deliveryos-reverse/` paths.
 */
export function buildReverseCommand(
  profile: HarnessProfile,
  workspace: vscode.WorkspaceFolder,
): string {
  const template = profile.command_template ?? '';
  const briefPath = path.join(workspace.uri.fsPath, REVERSE_ANALYSIS_BRIEF);
  const resultPath = path.join(workspace.uri.fsPath, REVERSE_PRD);
  return template
    .replace(/\$\{BRIEF_PATH\}/g, shellQuote(briefPath))
    .replace(/\$\{RESULT_PATH\}/g, shellQuote(resultPath))
    .replace(/\$\{WORKSPACE\}/g, shellQuote(workspace.uri.fsPath));
}

/**
 * Open the integrated terminal with the reverse command pre-typed (not
 * executed). Returns the terminal so callers can dispose if needed.
 */
export function launchReverseTerminal(
  profile: HarnessProfile,
  workspace: vscode.WorkspaceFolder,
): vscode.Terminal {
  const command = buildReverseCommand(profile, workspace);
  const terminal = vscode.window.createTerminal({
    name: `DeliveryOS Reverse — ${profile.display_name}`,
    cwd: workspace.uri,
    iconPath: new vscode.ThemeIcon('search'),
    isTransient: true,
  });
  // shouldExecute=false — user presses Enter (consent at the EXECUTE moment).
  terminal.sendText(command, false);
  terminal.show(true);
  return terminal;
}
