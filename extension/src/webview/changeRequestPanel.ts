import * as vscode from 'vscode';
import { renderPanelHtml } from './htmlFactory';
import { existingPanel, trackPanel } from './panelManager';
import type { HostMessenger } from './messenger';

export const CHANGE_REQUEST_VIEW_TYPE = 'deliveryos.changeRequest';
export const CHANGE_REQUEST_TITLE = 'DeliveryOS: Change Request';

let pendingCrEntryId: string | null = null;

export function setPendingCrEntryId(id: string | null): void {
  pendingCrEntryId = id;
}

export function consumePendingCrEntryId(): string | null {
  const id = pendingCrEntryId;
  pendingCrEntryId = null;
  return id;
}

export async function openChangeRequestPanel(
  context: vscode.ExtensionContext,
  host: HostMessenger,
  args?: { crEntryId?: string },
): Promise<void> {
  setPendingCrEntryId(args?.crEntryId ?? null);

  const existing = existingPanel(CHANGE_REQUEST_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    CHANGE_REQUEST_VIEW_TYPE,
    CHANGE_REQUEST_TITLE,
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
    entry: 'change-request',
    title: CHANGE_REQUEST_TITLE,
  });

  host.attachPanel(panel);
  trackPanel(panel, CHANGE_REQUEST_VIEW_TYPE);
}
