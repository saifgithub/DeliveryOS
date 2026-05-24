import * as vscode from 'vscode';
import { renderPanelHtml } from '../webview/htmlFactory';
import { trackPanel } from '../webview/panelManager';
import {
  TEST_DESIGNER_TITLE,
  TEST_DESIGNER_VIEW_TYPE,
  setPendingTestDesignerRequirement,
} from '../webview/testDesignerPanel';
import type { HostMessenger } from '../webview/messenger';

interface RestoredState {
  readonly requirementEntryId?: string;
}

export function testDesignerPanelSerializer(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): vscode.WebviewPanelSerializer<RestoredState> {
  return {
    async deserializeWebviewPanel(panel, state) {
      if (state?.requirementEntryId) {
        setPendingTestDesignerRequirement(state.requirementEntryId);
      }
      panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
      };
      panel.webview.html = await renderPanelHtml({
        webview: panel.webview,
        extensionUri: context.extensionUri,
        entry: 'test-designer',
        title: TEST_DESIGNER_TITLE,
      });
      host.attachPanel(panel);
      trackPanel(panel, TEST_DESIGNER_VIEW_TYPE);
    },
  };
}
