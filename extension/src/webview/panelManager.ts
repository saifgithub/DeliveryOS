import * as vscode from 'vscode';

interface ManagedPanel {
  panel: vscode.WebviewPanel;
  viewType: string;
}

const live = new Map<string, ManagedPanel>();

export function trackPanel(
  panel: vscode.WebviewPanel,
  viewType: string,
): void {
  live.set(viewType, { panel, viewType });
  panel.onDidDispose(() => {
    if (live.get(viewType)?.panel === panel) {
      live.delete(viewType);
    }
  });
}

export function existingPanel(
  viewType: string,
): vscode.WebviewPanel | undefined {
  return live.get(viewType)?.panel;
}
