// CHUNK-11 § terminalLauncher.ts — opens the integrated terminal with
// the harness command pre-typed (shouldExecute=false). Pressing Enter is
// the user's explicit consent to ship the brief's Allowed/Forbidden
// Changes to the harness — the audit point at the EXECUTE moment of the
// SDLC loop.
//
// Reads `profile.command_template` from CHUNK-10's HarnessProfile record.
// Substitutes ${BRIEF_PATH} / ${RESULT_PATH} / ${WORKSPACE} only — no
// other interpolation is permitted (every shipped command is reproducible
// from profile + substitutions).

import * as path from 'node:path';
import * as vscode from 'vscode';
import type { TerminalCloseReason } from '@deliveryos/contracts';
import type { HarnessProfile } from '../profiles';
import { HANDOFF_DIR } from './paths';

export interface LaunchOptions {
  readonly profile: HarnessProfile;
  readonly workspace: vscode.WorkspaceFolder;
  readonly handoffTimestamp: string;
  readonly briefId: string;
}

export interface TerminalClosedEvent {
  readonly briefId: string;
  readonly handoffTimestamp: string;
  readonly exitCode: number | null;
  readonly reason: TerminalCloseReason;
}

interface TrackedTerminal {
  readonly briefId: string;
  readonly handoffTimestamp: string;
}

/**
 * Owns the terminals DeliveryOS launches + the single onDidCloseTerminal
 * subscription that powers close-event telemetry. Construct once per
 * extension activation; dispose on deactivation.
 */
export class TerminalLauncher implements vscode.Disposable {
  private readonly tracked = new Map<vscode.Terminal, TrackedTerminal>();
  private readonly emitter = new vscode.EventEmitter<TerminalClosedEvent>();
  private readonly closeSub: vscode.Disposable;

  readonly onClose = this.emitter.event;

  constructor() {
    this.closeSub = vscode.window.onDidCloseTerminal((terminal) => {
      const meta = this.tracked.get(terminal);
      if (!meta) return;
      const exit = terminal.exitStatus;
      this.emitter.fire({
        briefId: meta.briefId,
        handoffTimestamp: meta.handoffTimestamp,
        exitCode: typeof exit?.code === 'number' ? exit.code : null,
        reason: mapTerminalExitReason(exit?.reason),
      });
      this.tracked.delete(terminal);
    });
  }

  launch(opts: LaunchOptions): vscode.Terminal {
    const command = buildCommand(opts.profile, opts.workspace);
    const terminal = vscode.window.createTerminal({
      name: `DeliveryOS — ${opts.profile.display_name}`,
      cwd: opts.workspace.uri,
      iconPath: new vscode.ThemeIcon('rocket'),
      isTransient: true,
    });
    this.tracked.set(terminal, {
      briefId: opts.briefId,
      handoffTimestamp: opts.handoffTimestamp,
    });
    // shouldExecute=false — user presses Enter (spec § Why shouldExecute=false).
    terminal.sendText(command, false);
    terminal.show(true);
    return terminal;
  }

  dispose(): void {
    this.closeSub.dispose();
    this.emitter.dispose();
    this.tracked.clear();
  }
}

// --- Command building (exposed for unit tests) ----------------------------

/**
 * Build the pre-typed command for a profile + workspace. Always reads
 * `profile.command_template` and substitutes the three permitted
 * placeholders. Falls back to an empty string when the profile omits
 * `command_template` (currently impossible for MVP profiles but the type
 * declares it optional).
 */
export function buildCommand(
  profile: HarnessProfile,
  workspace: vscode.WorkspaceFolder,
): string {
  const template = profile.command_template ?? '';
  const briefPath = path.join(
    workspace.uri.fsPath,
    profile.handoff_dir || HANDOFF_DIR,
    'current-execution-brief.md',
  );
  const resultPath = path.join(
    workspace.uri.fsPath,
    profile.handoff_dir || HANDOFF_DIR,
    'result.md',
  );
  return template
    .replace(/\$\{BRIEF_PATH\}/g, shellQuote(briefPath))
    .replace(/\$\{RESULT_PATH\}/g, shellQuote(resultPath))
    .replace(/\$\{WORKSPACE\}/g, shellQuote(workspace.uri.fsPath));
}

/**
 * POSIX-safe single-quote escape. Wraps the value in `'…'`, replacing any
 * single-quote with `'\''`. Defence-in-depth — for MVP we only quote
 * filesystem paths (never user content). Paths without metacharacters
 * pass through unchanged (no surrounding quotes) to keep the pre-typed
 * command readable.
 */
export function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./~-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function mapTerminalExitReason(
  reason: vscode.TerminalExitReason | undefined,
): TerminalCloseReason {
  // VS Code TerminalExitReason enum:
  //   0 = Unknown        → 'unknown'
  //   1 = Shutdown       → 'extensionHost' (window reload / host restart)
  //   2 = Process        → 'process'       (harness exited)
  //   3 = User           → 'user'          (user closed the pane)
  //   4 = Extension      → 'extensionHost' (DeliveryOS disposed it)
  switch (reason) {
    case 2:
      return 'process';
    case 3:
      return 'user';
    case 1:
    case 4:
      return 'extensionHost';
    default:
      return 'unknown';
  }
}
