import * as vscode from 'vscode';
import { renderPanelHtml } from '../webview/htmlFactory';
import { trackPanel } from '../webview/panelManager';
import {
  DISCOVER_TITLE,
  DISCOVER_VIEW_TYPE,
} from '../webview/discoverPanel';
import type { HostMessenger } from '../webview/messenger';

export function discoverPanelSerializer(
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
        entry: 'discover',
        title: DISCOVER_TITLE,
      });
      host.attachPanel(panel);
      trackPanel(panel, DISCOVER_VIEW_TYPE);
    },
  };
}
