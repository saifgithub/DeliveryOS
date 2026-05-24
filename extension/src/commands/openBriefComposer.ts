import * as vscode from 'vscode';
import { openBriefComposerPanel } from '../webview/briefComposerPanel';
import type { HostMessenger } from '../webview/messenger';

export function registerOpenBriefComposer(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'deliveryos.brief.compose',
    async (args?: {
      readonly requirementEntryId?: string;
      readonly briefEntryId?: string;
      readonly supersedesEntryId?: string;
    }) => {
      const id = args?.requirementEntryId;
      if (!id) {
        vscode.window.showWarningMessage(
          'DeliveryOS: open the Execution Brief composer from a requirement in the catalogue (no requirement selected).',
        );
        return;
      }
      await openBriefComposerPanel(context, host, {
        requirementEntryId: id,
        ...(args?.briefEntryId ? { briefEntryId: args.briefEntryId } : {}),
        ...(args?.supersedesEntryId ? { supersedesEntryId: args.supersedesEntryId } : {}),
      });
    },
  );
}
