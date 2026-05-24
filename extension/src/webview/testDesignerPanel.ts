import * as vscode from 'vscode';
import { renderPanelHtml } from './htmlFactory';
import { existingPanel, trackPanel } from './panelManager';
import type { HostMessenger } from './messenger';

export const TEST_DESIGNER_VIEW_TYPE = 'deliveryos.testDesigner';
export const TEST_DESIGNER_TITLE = 'DeliveryOS: Test Designer';

/**
 * Singleton panel. The current requirement under design is delivered to the
 * webview via a module-level holder (read once on bootstrap) — mirrors the
 * `pendingSelectedId` pattern in `requirementsPanel.ts`. Re-opening for a
 * different requirement reveals the existing panel and re-issues bootstrap.
 */
let pendingRequirementEntryId: string | undefined;

export function setPendingTestDesignerRequirement(entryId: string | undefined): void {
  pendingRequirementEntryId = entryId;
}

export function consumePendingTestDesignerRequirement(): string | undefined {
  const id = pendingRequirementEntryId;
  pendingRequirementEntryId = undefined;
  return id;
}

export async function openTestDesignerPanel(
  context: vscode.ExtensionContext,
  host: HostMessenger,
  options: { readonly requirementEntryId: string },
): Promise<void> {
  setPendingTestDesignerRequirement(options.requirementEntryId);

  const existing = existingPanel(TEST_DESIGNER_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    TEST_DESIGNER_VIEW_TYPE,
    TEST_DESIGNER_TITLE,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
    },
  );

  panel.webview.html = await renderPanelHtml({
    webview: panel.webview,
    extensionUri: context.extensionUri,
    entry: 'test-designer',
    title: TEST_DESIGNER_TITLE,
  });

  host.attachPanel(panel);
  trackPanel(panel, TEST_DESIGNER_VIEW_TYPE);
}
