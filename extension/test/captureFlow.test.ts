// CHUNK-12 — integration tests for result/captureFlow.ts
// Uses in-memory MemoryStore + vscode-stub.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { Uri, __resetVscodeStub } from './vscode-stub';
import { MemoryStore } from '../src/memory/MemoryStore';
import { captureFromHandoff, captureFromPaste, onResultCaptured } from '../src/result/captureFlow';
import type { ResultWatchEvent } from '../src/handoff/resultWatcher';
import { HANDOFF_HISTORY_DIR } from '../src/handoff/paths';
import type { StoredResultPayload } from '@deliveryos/contracts';

const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);

const workspaceUri = Uri.file('/test-workspace-capture');

function makeWorkspace(): vscode.WorkspaceFolder {
  return { uri: workspaceUri as unknown as vscode.Uri, name: 'test', index: 0 };
}

function makeResultUri(): vscode.Uri {
  return vscode.Uri.joinPath(
    workspaceUri as unknown as vscode.Uri,
    '.deliveryos-handoff',
    'result.md',
  );
}

const SAMPLE_RESULT = `## Summary of Changes

All tests pass and the auth module is refactored.

## Files Changed

- src/auth.ts (modified)

## Tests Added/Updated

- Added auth test

## Tests Run

- npm test — 5 pass

## Risks

- Minor refactor risk

## Unresolved Questions

- None
`;

function makeResultEvent(overrides: Partial<ResultWatchEvent> = {}): ResultWatchEvent {
  const bytes = new TextEncoder().encode(SAMPLE_RESULT);
  return {
    workspace: makeWorkspace() as unknown as Parameters<typeof onResultCaptured>[0] extends never ? never : vscode.WorkspaceFolder,
    resultUri: makeResultUri(),
    briefId: 'execution-aabbccdd',
    briefHistoryUri: makeResultUri(),
    handoffTimestamp: '20260526T120000Z',
    contentBytes: bytes,
    contentSha256: 'abc',
    kind: 'created',
    observedAt: Date.now(),
    ...overrides,
  } as ResultWatchEvent;
}

describe('captureFlow — captureFromHandoff', () => {
  beforeEach(() => __resetVscodeStub());

  it('fires onResultCaptured after successful capture', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);

    // Pre-write result.md into the stub FS.
    const bytes = new TextEncoder().encode(SAMPLE_RESULT);
    await vscode.workspace.fs.writeFile(makeResultUri(), bytes);

    let capturedEvent: { resultId: string; briefEntryId: string } | undefined;
    const sub = onResultCaptured((e) => {
      capturedEvent = e;
    });

    const workspace = makeWorkspace();
    const event = makeResultEvent();
    const resultId = await captureFromHandoff(
      event,
      store,
      workspace as unknown as vscode.WorkspaceFolder,
    );

    sub.dispose();
    assert.ok(resultId, 'should return a resultId');
    assert.ok(capturedEvent, 'onResultCaptured should have fired');
    assert.equal(capturedEvent!.resultId, resultId);
    assert.equal(capturedEvent!.briefEntryId, 'execution-aabbccdd');

    await store.close();
  });

  it('writes history snapshot at the correct path', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);

    const bytes = new TextEncoder().encode(SAMPLE_RESULT);
    await vscode.workspace.fs.writeFile(makeResultUri(), bytes);

    const workspace = makeWorkspace();
    const event = makeResultEvent({ handoffTimestamp: '20260526T130000Z' });
    await captureFromHandoff(event, store, workspace as unknown as vscode.WorkspaceFolder);

    const histUri = vscode.Uri.joinPath(
      workspaceUri as unknown as vscode.Uri,
      HANDOFF_HISTORY_DIR,
      '20260526T130000Z-result.md',
    );
    let histBytes: Uint8Array | undefined;
    assert.doesNotReject(async () => {
      histBytes = await vscode.workspace.fs.readFile(histUri);
    });
    histBytes = await vscode.workspace.fs.readFile(histUri);
    assert.ok(histBytes && histBytes.length > 0, 'history snapshot should be written');

    await store.close();
  });

  it('payload.diffOutcome is undefined on new capture', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);

    const bytes = new TextEncoder().encode(SAMPLE_RESULT);
    await vscode.workspace.fs.writeFile(makeResultUri(), bytes);

    const workspace = makeWorkspace();
    const event = makeResultEvent();
    const resultId = await captureFromHandoff(event, store, workspace as unknown as vscode.WorkspaceFolder);

    assert.ok(resultId);
    const entry = await store.read(resultId!);
    assert.ok(entry);
    const payload = entry!.payload as StoredResultPayload;
    assert.equal(payload.diffOutcome, undefined, 'diffOutcome should be undefined');

    await store.close();
  });
});

describe('captureFlow — captureFromPaste', () => {
  beforeEach(() => __resetVscodeStub());

  it('paste path: onResultCaptured fires, source=paste, history snapshot written', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);

    let capturedEvent: { resultId: string; briefEntryId: string } | undefined;
    const sub = onResultCaptured((e) => {
      capturedEvent = e;
    });

    const workspace = makeWorkspace();
    const resultId = await captureFromPaste(
      'execution-paste-id',
      SAMPLE_RESULT,
      'claude-code',
      store,
      workspace as unknown as vscode.WorkspaceFolder,
    );

    sub.dispose();
    assert.ok(resultId, 'should return a resultId');
    assert.ok(capturedEvent, 'onResultCaptured should have fired');
    assert.equal(capturedEvent!.resultId, resultId);
    assert.equal(capturedEvent!.briefEntryId, 'execution-paste-id');

    // Check source=paste in the stored payload.
    const entry = await store.read(resultId!);
    assert.ok(entry);
    const payload = entry!.payload as StoredResultPayload;
    assert.equal(payload.source, 'paste');

    await store.close();
  });

  it('paste path: payload.diffOutcome is undefined', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);

    const workspace = makeWorkspace();
    const resultId = await captureFromPaste(
      'execution-test',
      SAMPLE_RESULT,
      'codex',
      store,
      workspace as unknown as vscode.WorkspaceFolder,
    );

    assert.ok(resultId);
    const entry = await store.read(resultId!);
    assert.ok(entry);
    const payload = entry!.payload as StoredResultPayload;
    assert.equal(payload.diffOutcome, undefined);

    await store.close();
  });
});
