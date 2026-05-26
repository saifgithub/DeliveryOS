// CHUNK-13 § panels/diff-results/diffResultsCommand.ts — registers the
// deliveryos.diff.openForResult command, wired from tree view items.

import * as vscode from 'vscode';
import type { MemoryStore } from '../../memory/MemoryStore';
import { openDiffResultsPanel } from './diffResultsHost';

/**
 * Register the `deliveryos.diff.openForResult` command.
 * Accepts a resultId argument (string).
 */
export function registerDiffOpenForResultCommand(
  context: vscode.ExtensionContext,
  store: MemoryStore,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'deliveryos.diff.openForResult',
    async (resultId: unknown) => {
      if (typeof resultId !== 'string' || !resultId) {
        vscode.window.showErrorMessage(
          'DeliveryOS: deliveryos.diff.openForResult requires a resultId argument.',
        );
        return;
      }
      await openDiffResultsPanel(context, store, resultId);
    },
  );
}
