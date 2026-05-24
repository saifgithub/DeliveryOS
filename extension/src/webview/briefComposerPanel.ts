import * as vscode from 'vscode';
import { renderPanelHtml } from './htmlFactory';
import { existingPanel, trackPanel } from './panelManager';
import type { HostMessenger } from './messenger';

export const BRIEF_COMPOSER_VIEW_TYPE = 'deliveryos.briefComposer';
export const BRIEF_COMPOSER_TITLE = 'DeliveryOS: Execution Brief';

/**
 * Singleton composer panel. The (requirementEntryId, briefEntryId?, supersedesEntryId?)
 * triple is delivered to the webview via a module-level pending-holder
 * (read once on bootstrap) — mirrors `consumePendingTestDesignerRequirement`.
 *
 * Three modes the holder can express:
 *   1. fresh draft for a requirement (only requirementEntryId set)
 *   2. read-only re-open of a saved brief (briefEntryId set)
 *   3. revise an existing brief (supersedesEntryId set; requirementEntryId
 *      resolved host-side from the prior brief)
 */
export interface PendingBriefRequest {
  readonly requirementEntryId: string;
  readonly briefEntryId?: string;
  readonly supersedesEntryId?: string;
}

let pending: PendingBriefRequest | undefined;

export function setPendingBriefRequest(request: PendingBriefRequest | undefined): void {
  pending = request;
}

export function consumePendingBriefRequest(): PendingBriefRequest | undefined {
  const request = pending;
  pending = undefined;
  return request;
}

export async function openBriefComposerPanel(
  context: vscode.ExtensionContext,
  host: HostMessenger,
  options: PendingBriefRequest,
): Promise<void> {
  setPendingBriefRequest(options);

  const existing = existingPanel(BRIEF_COMPOSER_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    BRIEF_COMPOSER_VIEW_TYPE,
    BRIEF_COMPOSER_TITLE,
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
    entry: 'brief-composer',
    title: BRIEF_COMPOSER_TITLE,
  });

  host.attachPanel(panel);
  trackPanel(panel, BRIEF_COMPOSER_VIEW_TYPE);
}
