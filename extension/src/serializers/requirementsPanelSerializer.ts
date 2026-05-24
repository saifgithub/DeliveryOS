import * as vscode from 'vscode';
import { renderPanelHtml } from '../webview/htmlFactory';
import { trackPanel } from '../webview/panelManager';
import { REQUIREMENTS_TITLE, REQUIREMENTS_VIEW_TYPE } from '../webview/requirementsPanel';
import type { HostMessenger } from '../webview/messenger';

export function requirementsPanelSerializer(
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
        entry: 'requirements',
        title: REQUIREMENTS_TITLE,
      });
      host.attachPanel(panel);
      trackPanel(panel, REQUIREMENTS_VIEW_TYPE);
    },
  };
}
