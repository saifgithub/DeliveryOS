// CHUNK-12 § resultHost.ts — webview panel shells for result detail + paste.
// Pattern follows extension/src/webview/briefComposerPanel.ts.

import * as vscode from 'vscode';
import { renderPanelHtml } from '../../webview/htmlFactory';
import { existingPanel, trackPanel } from '../../webview/panelManager';
import type { HostMessenger } from '../../webview/messenger';
import type { MemoryStore } from '../../memory/MemoryStore';
import type {
  ResultAcknowledgeParams,
  StoredResultPayload,
} from '@deliveryos/contracts';
import { ResultAcknowledge } from '@deliveryos/contracts';

export const RESULT_DETAIL_VIEW_TYPE = 'deliveryos.resultDetail';
export const RESULT_PASTE_VIEW_TYPE = 'deliveryos.resultPaste';

const RESULT_DETAIL_TITLE = 'DeliveryOS: Result Detail';
const RESULT_PASTE_TITLE = 'DeliveryOS: Paste Harness Result';

/**
 * Open the Result Detail panel for a specific result entry.
 */
export async function openResultDetailPanel(
  context: vscode.ExtensionContext,
  store: MemoryStore,
  resultId: string,
): Promise<void> {
  const existing = existingPanel(RESULT_DETAIL_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    // Send the new result to the already-open panel.
    // (If we eventually have multiple panels, we'd track per-resultId.)
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    RESULT_DETAIL_VIEW_TYPE,
    RESULT_DETAIL_TITLE,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
    },
  );

  try {
    panel.webview.html = await renderPanelHtml({
      webview: panel.webview,
      extensionUri: context.extensionUri,
      entry: 'result-detail',
      title: RESULT_DETAIL_TITLE,
    });
  } catch (err) {
    // Webview build not yet present — show a plain placeholder.
    panel.webview.html = `<html><body><p>Result ${resultId} captured. (Webview build pending.)</p></body></html>`;
  }

  trackPanel(panel, RESULT_DETAIL_VIEW_TYPE);

  // Wire result.acknowledge message.
  panel.webview.onDidReceiveMessage(async (msg: unknown) => {
    const m = msg as { method?: string; params?: ResultAcknowledgeParams };
    if (m?.method === ResultAcknowledge.method && m.params?.resultId) {
      try {
        const entry = await store.read(m.params.resultId);
        if (entry && entry.type === 'result') {
          const existing = entry.payload as unknown as StoredResultPayload;
          const next = { ...existing, acknowledgedAt: new Date().toISOString() };
          await store.update(m.params.resultId, {
            payload: next as unknown as import('@deliveryos/contracts').ResultPayload,
          });
        }
      } catch (err) {
        console.error('[DeliveryOS] result.acknowledge failed:', err);
      }
    }
  });
}

/**
 * Open the Paste Fallback panel for manual result entry.
 */
export async function openPasteFallbackPanel(
  context: vscode.ExtensionContext,
  host: HostMessenger,
  _briefEntryId?: string,
): Promise<void> {
  const existing = existingPanel(RESULT_PASTE_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    RESULT_PASTE_VIEW_TYPE,
    RESULT_PASTE_TITLE,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
    },
  );

  try {
    panel.webview.html = await renderPanelHtml({
      webview: panel.webview,
      extensionUri: context.extensionUri,
      entry: 'result-paste',
      title: RESULT_PASTE_TITLE,
    });
  } catch {
    panel.webview.html = `<html><body><p>Paste Harness Result panel. (Webview build pending.)</p></body></html>`;
  }

  host.attachPanel(panel);
  trackPanel(panel, RESULT_PASTE_VIEW_TYPE);
}
