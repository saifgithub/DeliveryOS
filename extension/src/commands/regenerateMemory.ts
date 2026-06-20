import * as vscode from 'vscode';
import type { MemoryStore } from '../memory/MemoryStore';
import type { MemoryProjection } from '../memory/projection';

/**
 * `deliveryos.memory.regenerate` — rebuild `memory.sqlite` from the markdown
 * bodies (+ `LINKS.md`), then refresh the projection. The recovery path for a
 * lost/corrupt index: the markdown is lossless, so the DB is disposable.
 */
export function registerRegenerateMemory(
  store: MemoryStore,
  projection: MemoryProjection,
): vscode.Disposable {
  return vscode.commands.registerCommand('deliveryos.memory.regenerate', async () => {
    const choice = await vscode.window.showWarningMessage(
      'Rebuild memory.sqlite from the markdown bodies? The current SQLite index will be replaced by what is on disk.',
      { modal: true },
      'Rebuild',
    );
    if (choice !== 'Rebuild') return;

    try {
      const { entries, links } = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'DeliveryOS: rebuilding memory index…' },
        () => store.rebuildFromMarkdown(),
      );
      await projection.regenerateNow();
      vscode.window.showInformationMessage(
        `DeliveryOS: rebuilt memory index — ${entries} entr${entries === 1 ? 'y' : 'ies'}, ${links} link${links === 1 ? '' : 's'}.`,
      );
    } catch (err) {
      vscode.window.showErrorMessage(
        `DeliveryOS: memory rebuild failed — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });
}
