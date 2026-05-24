import * as vscode from 'vscode';
import { openRequirementsPanel } from '../webview/requirementsPanel';
import type { HostMessenger } from '../webview/messenger';

export function registerOpenRequirements(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'deliveryos.requirements.open',
    (args?: { readonly selectedId?: string }) =>
      openRequirementsPanel(context, host, args?.selectedId ? { selectedId: args.selectedId } : undefined),
  );
}
