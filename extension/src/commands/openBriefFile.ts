import * as vscode from 'vscode';
import type { MemoryStore } from '../memory/MemoryStore';

export function registerOpenBriefFile(memoryStore: MemoryStore | undefined): vscode.Disposable {
  return vscode.commands.registerCommand(
    'deliveryos.brief.openFile',
    async (args?: { readonly briefEntryId?: string }) => {
      const id = args?.briefEntryId;
      if (!id || !memoryStore) {
        vscode.window.showWarningMessage(
          'DeliveryOS: cannot open brief — no entry id provided.',
        );
        return;
      }
      const uri = memoryStore.briefBodyUri(id);
      await vscode.commands.executeCommand('vscode.open', uri);
    },
  );
}
