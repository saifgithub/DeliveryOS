import * as vscode from 'vscode';
import { renderPanelHtml } from './htmlFactory';
import { existingPanel, trackPanel } from './panelManager';
import type { HostMessenger } from './messenger';

export const HELLO_VIEW_TYPE = 'deliveryos.hello';
export const HELLO_TITLE = 'DeliveryOS: Hello';

export async function openHelloPanel(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): Promise<void> {
  const existing = existingPanel(HELLO_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    HELLO_VIEW_TYPE,
    HELLO_TITLE,
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
    entry: 'hello',
    title: HELLO_TITLE,
  });

  host.attachPanel(panel);
  trackPanel(panel, HELLO_VIEW_TYPE);
}
