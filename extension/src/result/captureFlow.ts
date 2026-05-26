// CHUNK-12 § captureFlow.ts — end-to-end result capture pipeline.
// Exposes captureFromHandoff (watcher-driven) and captureFromPaste (manual),
// plus an onResultCaptured event that the tree provider subscribes to.

import * as vscode from 'vscode';
import type { MemoryStore } from '../memory/MemoryStore';
import type {
  HarnessIdentity,
  StoredResultPayload,
} from '@deliveryos/contracts';
import type { ResultWatchEvent } from '../handoff/resultWatcher';
import {
  historyResultUri,
  historyTimestamp,
} from '../handoff/paths';
import { parseResultMd } from './resultParser';
import { probeGitChanges } from './gitChanges';
import { persistResult } from './resultStore';

export interface ResultCapturedEvent {
  readonly resultId: string;
  readonly briefEntryId: string;
}

const _onResultCaptured = new vscode.EventEmitter<ResultCapturedEvent>();

/** Fired after a successful capture (tree provider subscribes to this). */
export const onResultCaptured: vscode.Event<ResultCapturedEvent> = _onResultCaptured.event;

function mapHarnessIdentityToHarnessName(
  identity: HarnessIdentity,
): StoredResultPayload['harness'] {
  if (identity === 'claude-code') return 'claude-code';
  if (identity === 'codex') return 'codex';
  return 'generic';
}

function mapConfidence(
  c: 'high' | 'medium' | 'low',
): 'high' | 'low' {
  return c === 'high' ? 'high' : 'low';
}

/**
 * Watcher-driven capture. Called when result.md lands in .deliveryos-handoff/.
 * Returns the resultId or null on error.
 */
export async function captureFromHandoff(
  event: ResultWatchEvent,
  store: MemoryStore,
  workspace: vscode.WorkspaceFolder,
): Promise<string | null> {
  try {
    // 1. Read file bytes.
    let bytes: Uint8Array;
    try {
      bytes = await vscode.workspace.fs.readFile(event.resultUri);
    } catch {
      // Could be a race: file already gone.
      return null;
    }
    const text = new TextDecoder('utf-8').decode(bytes);

    // 2. Parse.
    const parsed = parseResultMd(text);

    // 3. Git probe.
    const filesChanged = await probeGitChanges(workspace.uri.fsPath);
    // Merge claimed files from the parsed result into fromHarness.
    filesChanged.fromHarness.push(...(parsed.sections.filesChangedClaimed ?? []));

    // 4. Build StoredResultPayload.
    const capturedAt = new Date().toISOString();
    const harnessIdentity: HarnessIdentity = 'claude-code'; // default; watcher can't tell
    const payload: StoredResultPayload = {
      rawOutput: text,
      ...(parsed.sections.summary !== undefined ? { summary: parsed.sections.summary } : {}),
      harness: mapHarnessIdentityToHarnessName(harnessIdentity),
      parseConfidence: mapConfidence(parsed.confidence),
      briefId: event.briefId,
      harnessIdentity,
      capturedAt,
      source: 'watcher',
      parsed,
      filesChanged,
    };

    // 5. Persist.
    const briefEntryId = event.briefId;
    const resultId = await persistResult(store, briefEntryId, payload, text);

    // 6. History snapshot — write raw bytes to history dir.
    const ts = event.handoffTimestamp || historyTimestamp(new Date());
    const histUri = historyResultUri(workspace, ts);
    try {
      await vscode.workspace.fs.writeFile(histUri, bytes);
    } catch (err) {
      console.warn('[DeliveryOS] CHUNK-12: history snapshot write failed:', err);
      // Non-fatal — do NOT roll back.
    }

    // 7. Fire onResultCaptured.
    _onResultCaptured.fire({ resultId, briefEntryId });

    return resultId;
  } catch (err) {
    console.error('[DeliveryOS] CHUNK-12: captureFromHandoff failed:', err);
    return null;
  }
}

/**
 * Paste-driven capture. Called from the PasteFallback webview panel.
 * Returns the resultId or null on error.
 */
export async function captureFromPaste(
  briefEntryId: string,
  rawText: string,
  harnessIdentity: HarnessIdentity,
  store: MemoryStore,
  workspace: vscode.WorkspaceFolder,
): Promise<string | null> {
  try {
    // 1. Parse.
    const parsed = parseResultMd(rawText);
    const bytes = new TextEncoder().encode(rawText);

    // 2. Git probe.
    const filesChanged = await probeGitChanges(workspace.uri.fsPath);
    filesChanged.fromHarness.push(...(parsed.sections.filesChangedClaimed ?? []));

    // 3. Build payload.
    const capturedAt = new Date().toISOString();
    const payload: StoredResultPayload = {
      rawOutput: rawText,
      ...(parsed.sections.summary !== undefined ? { summary: parsed.sections.summary } : {}),
      harness: mapHarnessIdentityToHarnessName(harnessIdentity),
      parseConfidence: mapConfidence(parsed.confidence),
      briefId: briefEntryId,
      harnessIdentity,
      capturedAt,
      source: 'paste',
      parsed,
      filesChanged,
    };

    // 4. Persist.
    const resultId = await persistResult(store, briefEntryId, payload, rawText);

    // 5. History snapshot.
    const ts = historyTimestamp(new Date());
    const histUri = historyResultUri(workspace, ts);
    try {
      await vscode.workspace.fs.writeFile(histUri, bytes);
    } catch (err) {
      console.warn('[DeliveryOS] CHUNK-12: history snapshot write failed (paste):', err);
    }

    // 6. Fire onResultCaptured.
    _onResultCaptured.fire({ resultId, briefEntryId });

    return resultId;
  } catch (err) {
    console.error('[DeliveryOS] CHUNK-12: captureFromPaste failed:', err);
    return null;
  }
}
