// CHUNK-13 § diff/recompute.ts — "Re-run diff" command.
// Re-computes the DiffOutcome for a result entry, replacing any stale outcome
// (e.g. after an engine version bump).

import * as vscode from 'vscode';
import type { MemoryStore } from '../memory/MemoryStore';
import { runDiffForResult } from './runForResult';

/**
 * Register the `deliveryos.diff.recompute` command.
 * The command takes a resultId argument.
 */
export function registerRecomputeDiffCommand(
  store: MemoryStore,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'deliveryos.diff.recompute',
    async (resultId: unknown) => {
      if (typeof resultId !== 'string' || !resultId) {
        vscode.window.showErrorMessage('DeliveryOS: deliveryos.diff.recompute requires a resultId argument.');
        return;
      }
      try {
        const outcome = await runDiffForResult(store, resultId);
        const label = outcome.verdict === 'pass' ? 'PASS' : 'FAIL';
        vscode.window.showInformationMessage(
          `DeliveryOS: Diff recomputed — ${label} (${outcome.files.length} files).`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`DeliveryOS: Failed to recompute diff — ${msg}`);
      }
    },
  );
}
