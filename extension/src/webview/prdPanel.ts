import * as vscode from 'vscode';
import { renderPanelHtml } from './htmlFactory';
import { existingPanel, trackPanel } from './panelManager';
import type { HostMessenger } from './messenger';

export const PRD_VIEW_TYPE = 'deliveryos.prdEditor';
export const PRD_TITLE = 'DeliveryOS: PRD Editor';

export async function openPrdPanel(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): Promise<void> {
  const existing = existingPanel(PRD_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    PRD_VIEW_TYPE,
    PRD_TITLE,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: false,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
      ],
    },
  );

  panel.webview.html = await renderPanelHtml({
    webview: panel.webview,
    extensionUri: context.extensionUri,
    entry: 'prd-editor',
    title: PRD_TITLE,
  });

  host.attachPanel(panel);
  trackPanel(panel, PRD_VIEW_TYPE);
}
