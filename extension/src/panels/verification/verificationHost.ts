// CHUNK-14 § panels/verification/verificationHost.ts — webview host for verification.

import * as vscode from 'vscode';
import { renderPanelHtml } from '../../webview/htmlFactory';
import { existingPanel, trackPanel } from '../../webview/panelManager';
import type { MemoryStore } from '../../memory/MemoryStore';
import type {
  VerificationApproveParams,
  VerificationRejectParams,
  VerificationRequestReworkParams,
  VerificationRecordBypassParams,
  MemoryApplyUpdateParams,
  ReleaseExportParams,
  ReleaseZipPackageParams,
  DiffOutcome,
} from '@deliveryos/contracts';
import type { StoredResultPayload } from '@deliveryos/contracts';
import { recordVerdict } from '../../verification/verificationWorkflow';
import { applyUpdate, recordBypass } from '../../memory/update';
import { exportReleaseEvidence } from '../../release/releaseEvidenceExport';
import { zipPackage } from '../../release/zipPackage';

export const VERIFICATION_VIEW_TYPE = 'deliveryos.verification';
const VERIFICATION_TITLE = 'DeliveryOS: Verify';

export interface VerificationOpenArgs {
  requirementEntryId: string;
  resultEntryId: string;
  testSpecEntryId: string;
}

/**
 * Open (or reveal) the Verification panel for the given requirement/result/testSpec triple.
 */
export async function openVerificationPanel(
  context: vscode.ExtensionContext,
  store: MemoryStore,
  args: VerificationOpenArgs,
): Promise<void> {
  const existing = existingPanel(VERIFICATION_VIEW_TYPE);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Active);
    await sendVerificationLoaded(existing, store, args);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    VERIFICATION_VIEW_TYPE,
    VERIFICATION_TITLE,
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
      entry: 'verification',
      title: VERIFICATION_TITLE,
    });
  } catch {
    panel.webview.html = buildFallbackHtml(args.requirementEntryId);
  }

  trackPanel(panel, VERIFICATION_VIEW_TYPE);

  const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;

  panel.webview.onDidReceiveMessage(async (msg: unknown) => {
    const m = msg as { method?: string; id?: string; params?: unknown };
    if (!m?.method) return;

    const respond = (result: unknown, error?: { code: number; message: string }) => {
      if (m.id !== undefined) {
        panel.webview.postMessage(
          error
            ? { id: m.id, error }
            : { id: m.id, result },
        );
      }
    };

    switch (m.method) {
      case 'verification.approve': {
        const p = m.params as VerificationApproveParams;
        try {
          const verificationId = await recordVerdict(store, args, {
            verdict: 'pass',
            diffOverride: p.diffOverride,
            ...(p.failedCriteria ? { failedCriteria: p.failedCriteria } : {}),
            ...(p.defects ? { defects: p.defects } : {}),
          });
          respond({ verificationId });
        } catch (err) {
          respond(null, { code: -32000, message: String(err) });
        }
        break;
      }
      case 'verification.reject': {
        const p = m.params as VerificationRejectParams;
        try {
          const verificationId = await recordVerdict(store, args, {
            verdict: 'fail',
            diffOverride: p.diffOverride,
            failedCriteria: p.failedCriteria,
            defects: p.defects,
          });
          respond({ verificationId });
        } catch (err) {
          respond(null, { code: -32000, message: String(err) });
        }
        break;
      }
      case 'verification.requestRework': {
        const p = m.params as VerificationRequestReworkParams;
        try {
          const verificationId = await recordVerdict(store, args, {
            verdict: 'rework',
            diffOverride: false,
            reworkNotes: p.reworkNotes,
          });
          respond({ verificationId });
        } catch (err) {
          respond(null, { code: -32000, message: String(err) });
        }
        break;
      }
      case 'verification.recordBypass': {
        const p = m.params as VerificationRecordBypassParams;
        try {
          await recordBypass(p.verificationId, p.justification, store);
          respond({ ok: true });
        } catch (err) {
          respond({ ok: false }, { code: -32000, message: String(err) });
        }
        break;
      }
      case 'memory.applyUpdate': {
        const p = m.params as MemoryApplyUpdateParams;
        try {
          await applyUpdate(p.verificationId, p.form, store);
          respond({ ok: true });
        } catch (err) {
          respond({ ok: false }, { code: -32000, message: String(err) });
        }
        break;
      }
      case 'release.export': {
        const p = m.params as ReleaseExportParams;
        if (!workspaceUri) {
          respond(null, { code: -32001, message: 'No workspace folder open' });
          break;
        }
        try {
          const evidence = await exportReleaseEvidence(store, workspaceUri, p.verificationId);
          respond(evidence);
          // Also send a notification.
          panel.webview.postMessage({ method: 'release.preview', params: { evidence } });
        } catch (err) {
          respond(null, { code: -32000, message: String(err) });
        }
        break;
      }
      case 'release.zipPackage': {
        const p = m.params as ReleaseZipPackageParams;
        if (!workspaceUri) {
          respond(null, { code: -32001, message: 'No workspace folder open' });
          break;
        }
        try {
          // Reconstruct evidence from memory store (minimal re-walk).
          const verEntries = await store.list('release');
          const releaseEntry = verEntries.find((e) => {
            const payload = e.payload as { releaseId?: string };
            return payload.releaseId === p.releaseId;
          });
          if (releaseEntry) {
            const payload = releaseEntry.payload as {
              documentPath?: string;
              requirementRef?: { id: string; title: string; type: string };
              verificationRef?: { id: string; title: string; type: string };
            };
            // Re-walk chain for zip packaging.
            const { walkChain } = await import('../../release/memoryGraphWalker');
            const { renderEvidence } = await import('../../release/markdownRenderer');
            if (payload.verificationRef?.id) {
              const chain = await walkChain(payload.verificationRef.id, store);
              const markdown = renderEvidence(chain, p.releaseId);
              const filesReferenced: string[] = [];
              if (chain.verification) filesReferenced.push(chain.verification.path);
              if (chain.result) filesReferenced.push(chain.result.path);
              if (chain.testSpec) filesReferenced.push(chain.testSpec.path);
              if (chain.execution) filesReferenced.push(chain.execution.path);
              if (chain.requirement) filesReferenced.push(chain.requirement.path);
              if (chain.prd) filesReferenced.push(chain.prd.path);
              if (chain.intent) filesReferenced.push(chain.intent.path);
              if (chain.design) filesReferenced.push(chain.design.path);
              await zipPackage({ releaseId: p.releaseId, markdown, filesReferenced, chain }, workspaceUri);
            }
          }
          respond({});
        } catch (err) {
          respond(null, { code: -32000, message: String(err) });
        }
        break;
      }
    }
  });

  await sendVerificationLoaded(panel, store, args);
}

async function sendVerificationLoaded(
  panel: vscode.WebviewPanel,
  store: MemoryStore,
  args: VerificationOpenArgs,
): Promise<void> {
  try {
    const testSpec = await store.read(args.testSpecEntryId);
    const result = await store.read(args.resultEntryId);

    if (!testSpec || !result) {
      panel.webview.postMessage({
        method: 'error',
        params: { message: 'Could not load test-spec or result from memory store.' },
      });
      return;
    }

    const resultPayload = result.payload as unknown as StoredResultPayload;
    const diff = (resultPayload.diffOutcome as DiffOutcome | undefined) ?? null;

    panel.webview.postMessage({
      method: 'verification.loaded',
      params: { testSpec, result, diff },
    });
  } catch (err) {
    panel.webview.postMessage({
      method: 'error',
      params: { message: err instanceof Error ? err.message : String(err) },
    });
  }
}

function buildFallbackHtml(requirementEntryId: string): string {
  return `<html><body><p>Verification panel for ${requirementEntryId}. (Webview build pending.)</p></body></html>`;
}
