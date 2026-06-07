import * as vscode from 'vscode';
import { renderPanelHtml } from '../webview/htmlFactory';
import { trackPanel } from '../webview/panelManager';
import {
  CHANGE_REQUEST_TITLE,
  CHANGE_REQUEST_VIEW_TYPE,
} from '../webview/changeRequestPanel';
import type { HostMessenger } from '../webview/messenger';

export function changeRequestPanelSerializer(
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
        entry: 'change-request',
        title: CHANGE_REQUEST_TITLE,
      });
      host.attachPanel(panel);
      trackPanel(panel, CHANGE_REQUEST_VIEW_TYPE);
    },
  };
}
