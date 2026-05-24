import * as vscode from 'vscode';
import { renderPanelHtml } from './htmlFactory';
import { existingPanel, trackPanel } from './panelManager';
import type { HostMessenger } from './messenger';

export const DECOMPOSE_VIEW_TYPE = 'deliveryos.requirementsDecompose';
export const DECOMPOSE_TITLE = 'DeliveryOS: Decompose PRD';

export async function openDecomposePromptPanel(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): Promise<void> {
  const existing = existingPanel(DECOMPOSE_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    DECOMPOSE_VIEW_TYPE,
    DECOMPOSE_TITLE,
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
    entry: 'requirements-decompose',
    title: DECOMPOSE_TITLE,
  });

  host.attachPanel(panel);
  trackPanel(panel, DECOMPOSE_VIEW_TYPE);
}
