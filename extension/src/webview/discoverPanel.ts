import * as vscode from 'vscode';
import type { DiscoverMode } from '@deliveryos/contracts';
import { renderPanelHtml } from './htmlFactory';
import { existingPanel, trackPanel } from './panelManager';
import type { HostMessenger } from './messenger';

export const DISCOVER_VIEW_TYPE = 'deliveryos.discover';
export const DISCOVER_TITLE = 'DeliveryOS: Discover';
export const DEFAULT_DISCOVER_MODE: DiscoverMode = 'rawIdea';

let pendingMode: DiscoverMode | undefined;

export function setPendingDiscoverMode(mode: DiscoverMode): void {
  pendingMode = mode;
}

export function consumePendingDiscoverMode(): DiscoverMode {
  const m = pendingMode ?? DEFAULT_DISCOVER_MODE;
  pendingMode = undefined;
  return m;
}

export async function openDiscoverPanel(
  context: vscode.ExtensionContext,
  host: HostMessenger,
  mode?: DiscoverMode,
): Promise<void> {
  if (mode) setPendingDiscoverMode(mode);

  const existing = existingPanel(DISCOVER_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    if (mode) host.broadcastDiscoverMode(mode);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    DISCOVER_VIEW_TYPE,
    DISCOVER_TITLE,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: false,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
      ],
    },
  );

  panel.webview.html = await renderPanelHtml({
    webview: panel.webview,
    extensionUri: context.extensionUri,
    entry: 'discover',
    title: DISCOVER_TITLE,
  });

  host.attachPanel(panel);
  trackPanel(panel, DISCOVER_VIEW_TYPE);
}
