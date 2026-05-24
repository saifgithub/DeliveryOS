import * as vscode from 'vscode';
import { renderPanelHtml } from '../webview/htmlFactory';
import { trackPanel } from '../webview/panelManager';
import {
  BRIEF_COMPOSER_TITLE,
  BRIEF_COMPOSER_VIEW_TYPE,
  setPendingBriefRequest,
} from '../webview/briefComposerPanel';
import type { HostMessenger } from '../webview/messenger';

interface RestoredState {
  readonly requirementEntryId?: string;
  readonly briefEntryId?: string;
  readonly supersedesEntryId?: string;
}

export function briefComposerSerializer(
  context: vscode.ExtensionContext,
  host: HostMessenger,
): vscode.WebviewPanelSerializer<RestoredState> {
  return {
    async deserializeWebviewPanel(panel, state) {
      if (state?.requirementEntryId) {
        setPendingBriefRequest({
          requirementEntryId: state.requirementEntryId,
          ...(state.briefEntryId ? { briefEntryId: state.briefEntryId } : {}),
          ...(state.supersedesEntryId ? { supersedesEntryId: state.supersedesEntryId } : {}),
        });
      }
      panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
      };
      panel.webview.html = await renderPanelHtml({
        webview: panel.webview,
        extensionUri: context.extensionUri,
        entry: 'brief-composer',
        title: BRIEF_COMPOSER_TITLE,
      });
      host.attachPanel(panel);
      trackPanel(panel, BRIEF_COMPOSER_VIEW_TYPE);
    },
  };
}
