import * as vscode from 'vscode';
import { renderPanelHtml } from './htmlFactory';
import { existingPanel, trackPanel } from './panelManager';
import type { HostMessenger } from './messenger';

export const REQUIREMENTS_VIEW_TYPE = 'deliveryos.requirements';
export const REQUIREMENTS_TITLE = 'DeliveryOS: Requirements';

let pendingSelectedId: string | undefined;

export function setPendingRequirementSelection(entryId: string | undefined): void {
  pendingSelectedId = entryId;
}

export function consumePendingRequirementSelection(): string | undefined {
  const id = pendingSelectedId;
  pendingSelectedId = undefined;
  return id;
}

export async function openRequirementsPanel(
  context: vscode.ExtensionContext,
  host: HostMessenger,
  options?: { readonly selectedId?: string },
): Promise<void> {
  if (options?.selectedId !== undefined) {
    setPendingRequirementSelection(options.selectedId);
  }

  const existing = existingPanel(REQUIREMENTS_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    REQUIREMENTS_VIEW_TYPE,
    REQUIREMENTS_TITLE,
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
    entry: 'requirements',
    title: REQUIREMENTS_TITLE,
  });

  host.attachPanel(panel);
  trackPanel(panel, REQUIREMENTS_VIEW_TYPE);
}
