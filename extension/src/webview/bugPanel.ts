import * as vscode from 'vscode';
import { renderPanelHtml } from './htmlFactory';
import { existingPanel, trackPanel } from './panelManager';
import type { HostMessenger } from './messenger';

export const BUG_VIEW_TYPE = 'deliveryos.bug';
export const BUG_TITLE = 'DeliveryOS: Bug';

let pendingBugEntryId: string | null = null;

export function setPendingBugEntryId(id: string | null): void {
  pendingBugEntryId = id;
}

export function consumePendingBugEntryId(): string | null {
  const id = pendingBugEntryId;
  pendingBugEntryId = null;
  return id;
}

export async function openBugPanel(
  context: vscode.ExtensionContext,
  host: HostMessenger,
  args?: { bugEntryId?: string },
): Promise<void> {
  setPendingBugEntryId(args?.bugEntryId ?? null);

  const existing = existingPanel(BUG_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    BUG_VIEW_TYPE,
    BUG_TITLE,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: false,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
    },
  );

  panel.webview.html = await renderPanelHtml({
    webview: panel.webview,
    extensionUri: context.extensionUri,
    entry: 'bug',
    title: BUG_TITLE,
  });

  host.attachPanel(panel);
  trackPanel(panel, BUG_VIEW_TYPE);
}
