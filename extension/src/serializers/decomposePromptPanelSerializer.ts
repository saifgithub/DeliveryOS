import * as vscode from 'vscode';
import { renderPanelHtml } from '../webview/htmlFactory';
import { trackPanel } from '../webview/panelManager';
import {
  DECOMPOSE_TITLE,
  DECOMPOSE_VIEW_TYPE,
} from '../webview/decomposePromptPanel';
import type { HostMessenger } from '../webview/messenger';

export function decomposePromptPanelSerializer(
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
        entry: 'requirements-decompose',
        title: DECOMPOSE_TITLE,
      });
      host.attachPanel(panel);
      trackPanel(panel, DECOMPOSE_VIEW_TYPE);
    },
  };
}
