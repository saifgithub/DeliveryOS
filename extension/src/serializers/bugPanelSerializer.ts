import * as vscode from 'vscode';
import { renderPanelHtml } from '../webview/htmlFactory';
import { trackPanel } from '../webview/panelManager';
import { BUG_TITLE, BUG_VIEW_TYPE } from '../webview/bugPanel';
import type { HostMessenger } from '../webview/messenger';

export function bugPanelSerializer(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): vscode.WebviewPanelSerializer {
  return {
    async deserializeWebviewPanel(panel) {
      panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
      };
      panel.webview.html = await renderPanelHtml({
        webview: panel.webview,
        extensionUri: context.extensionUri,
        entry: 'bug',
        title: BUG_TITLE,
      });
      host.attachPanel(panel);
      trackPanel(panel, BUG_VIEW_TYPE);
    },
  };
}
