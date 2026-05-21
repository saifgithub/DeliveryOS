import * as vscode from 'vscode';
import { renderPanelHtml } from '../webview/htmlFactory';
import { trackPanel } from '../webview/panelManager';
import { HELLO_TITLE, HELLO_VIEW_TYPE } from '../webview/helloPanel';
import type { HostMessenger } from '../webview/messenger';

export function helloPanelSerializer(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): vscode.WebviewPanelSerializer {
  return {
    async deserializeWebviewPanel(panel) {
      panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
        ],
      };
      panel.webview.html = await renderPanelHtml({
        webview: panel.webview,
        extensionUri: context.extensionUri,
        entry: 'hello',
        title: HELLO_TITLE,
      });
      host.attachPanel(panel);
      trackPanel(panel, HELLO_VIEW_TYPE);
    },
  };
}
