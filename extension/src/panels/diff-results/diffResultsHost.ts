// CHUNK-13 § panels/diff-results/diffResultsHost.ts — host-side panel
// controller for the diff-results webview. Spawns the panel, serves the
// DiffOutcome, handles openFile and applyHookInstall messages.

import * as vscode from 'vscode';
import { renderPanelHtml } from '../../webview/htmlFactory';
import { existingPanel, trackPanel } from '../../webview/panelManager';
import type { MemoryStore } from '../../memory/MemoryStore';
import type { StoredResultPayload } from '@deliveryos/contracts';
import type { DiffOutcome } from '../../diff/types';
import { runDiffForResult } from '../../diff/runForResult';
import { buildHookInstallPlan, applyHookInstallPlan } from '../../hooks/preToolUseGenerator';

export const DIFF_RESULTS_VIEW_TYPE = 'deliveryos.diffResults';
const DIFF_RESULTS_TITLE = 'DeliveryOS: Diff Results';

/**
 * Open (or reveal) the Diff Results panel for the given resultId.
 */
export async function openDiffResultsPanel(
  context: vscode.ExtensionContext,
  store: MemoryStore,
  resultId: string,
): Promise<void> {
  const existing = existingPanel(DIFF_RESULTS_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    // Send updated outcome to the already-open panel.
    await sendDiffOutcome(existing, store, resultId);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    DIFF_RESULTS_VIEW_TYPE,
    DIFF_RESULTS_TITLE,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
    },
  );

  try {
    panel.webview.html = await renderPanelHtml({
      webview: panel.webview,
      extensionUri: context.extensionUri,
      entry: 'diff-results',
      title: DIFF_RESULTS_TITLE,
    });
  } catch {
    panel.webview.html = buildFallbackHtml(resultId);
  }

  trackPanel(panel, DIFF_RESULTS_VIEW_TYPE);

  // Wire messages from the webview.
  panel.webview.onDidReceiveMessage(async (msg: unknown) => {
    const m = msg as { kind?: string; resultId?: string; path?: string };
    if (!m?.kind) return;

    switch (m.kind) {
      case 'requestDiffOutcome': {
        const rid = m.resultId ?? resultId;
        await sendDiffOutcome(panel, store, rid);
        break;
      }
      case 'recomputeDiff': {
        const rid = m.resultId ?? resultId;
        try {
          const outcome = await runDiffForResult(store, rid);
          panel.webview.postMessage({ kind: 'diffOutcome', outcome });
        } catch (err) {
          panel.webview.postMessage({
            kind: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
        break;
      }
      case 'openFile': {
        if (m.path) {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (workspaceFolder) {
            const uri = vscode.Uri.joinPath(workspaceFolder.uri, m.path);
            await vscode.commands.executeCommand('vscode.open', uri);
          }
        }
        break;
      }
      case 'copyPath': {
        if (m.path) {
          await vscode.env.clipboard.writeText(m.path);
        }
        break;
      }
      case 'requestHookInstallPlan': {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          panel.webview.postMessage({ kind: 'hookInstallPlan', plan: null });
          return;
        }
        try {
          const plan = await buildHookInstallPlan(workspaceFolder.uri);
          panel.webview.postMessage({ kind: 'hookInstallPlan', plan });
        } catch (err) {
          panel.webview.postMessage({
            kind: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
        break;
      }
      case 'applyHookInstall': {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;
        const confirm = await vscode.window.showWarningMessage(
          "DeliveryOS will write files into .claude/. Continue?",
          { modal: false },
          'Yes, write',
          'Cancel',
        );
        if (confirm !== 'Yes, write') return;
        try {
          const plan = await buildHookInstallPlan(workspaceFolder.uri);
          await applyHookInstallPlan(workspaceFolder.uri, plan);
          panel.webview.postMessage({ kind: 'hookInstalled', appliedAt: Date.now() });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          panel.webview.postMessage({ kind: 'error', message: `Hook install failed: ${errMsg}` });
        }
        break;
      }
    }
  });

  // Send initial outcome.
  await sendDiffOutcome(panel, store, resultId);
}

async function sendDiffOutcome(
  panel: vscode.WebviewPanel,
  store: MemoryStore,
  resultId: string,
): Promise<void> {
  try {
    // Check if we already have a stored outcome.
    const entry = await store.read(resultId);
    if (!entry || entry.type !== 'result') {
      panel.webview.postMessage({ kind: 'error', message: `Result ${resultId} not found.` });
      return;
    }
    const payload = entry.payload as unknown as StoredResultPayload;
    let outcome = payload.diffOutcome as DiffOutcome | undefined;

    // If no outcome stored, compute it now.
    if (!outcome) {
      outcome = await runDiffForResult(store, resultId);
    }

    panel.webview.postMessage({ kind: 'diffOutcome', outcome });
  } catch (err) {
    panel.webview.postMessage({
      kind: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

function buildFallbackHtml(resultId: string): string {
  return `<html><body><p>Diff results for result ${resultId}. (Webview build pending.)</p></body></html>`;
}
