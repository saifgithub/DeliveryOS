import * as vscode from 'vscode';
import { renderPanelHtml } from '../webview/htmlFactory';
import { trackPanel } from '../webview/panelManager';
import { PRD_TITLE, PRD_VIEW_TYPE } from '../webview/prdPanel';
import type { HostMessenger } from '../webview/messenger';

export function prdEditorSerializer(
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
        entry: 'prd-editor',
        title: PRD_TITLE,
      });
      host.attachPanel(panel);
      trackPanel(panel, PRD_VIEW_TYPE);
    },
  };
}
