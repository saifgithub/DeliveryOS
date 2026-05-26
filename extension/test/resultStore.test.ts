// CHUNK-12 — integration tests for result/resultStore.ts
// Uses the in-memory MemoryStore pattern from memory.test.ts.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { Uri, __resetVscodeStub } from './vscode-stub';
import { MemoryStore } from '../src/memory/MemoryStore';
import { persistResult } from '../src/result/resultStore';
import type { StoredResultPayload } from '@deliveryos/contracts';
import type { ParsedResult } from '@deliveryos/contracts';

const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);

const workspaceUri = Uri.file('/test-workspace-result-store');

function makeParsedResult(): ParsedResult {
  return {
    confidence: 'high',
    sections: {
      summary: 'All tests pass.',
      filesChangedClaimed: [{ path: 'src/index.ts', claimedStatus: 'modified' }],
      testsAdded: ['Added LoginController test'],
      testsRun: ['npm test — 10 pass'],
      risks: ['Minor risk'],
      questions: ['Need to review later'],
    },
    missingSections: [],
    rawText: '# Result\n\nAll done.\n',
  };
}

function makePayload(overrides: Partial<StoredResultPayload> = {}): StoredResultPayload {
  return {
    rawOutput: '# Result\n\nAll done.\n',
    summary: 'All tests pass.',
    harness: 'claude-code',
    parseConfidence: 'high',
    briefId: '',
    harnessIdentity: 'claude-code',
    capturedAt: new Date().toISOString(),
    source: 'watcher',
    parsed: makeParsedResult(),
    filesChanged: { gitAvailable: false, fromGit: [], fromHarness: [] },
    ...overrides,
  };
}

describe('resultStore — persistResult', () => {
  beforeEach(() => __resetVscodeStub());

  it('round-trip: result entry exists with type result, body equals rawText', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);

    // Create a brief (execution) entry to act as the parent.
    const briefEntry = await store.create({
      type: 'execution',
      title: 'Test Brief',
      payload: {
        briefMarkdown: '# Brief',
        targetHarness: 'claude-code',
        briefVersion: 1,
      },
    });

    const rawText = '# Harness result\n\nSome output here.\n';
    const payload = makePayload({ briefId: briefEntry.id });

    const resultId = await persistResult(store, briefEntry.id, payload, rawText);

    assert.ok(resultId, 'resultId should be defined');
    const entry = await store.read(resultId);
    assert.ok(entry, 'entry should exist');
    assert.equal(entry!.type, 'result');
    assert.equal(entry!.body, rawText);

    await store.close();
  });

  it('memory_links row exists: from_id=briefEntryId, kind=produced', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);

    const briefEntry = await store.create({
      type: 'execution',
      title: 'Brief For Link Test',
      payload: {
        briefMarkdown: '# Brief',
        targetHarness: 'claude-code',
        briefVersion: 1,
      },
    });

    const rawText = '# Result output\n';
    const payload = makePayload({ briefId: briefEntry.id });

    const resultId = await persistResult(store, briefEntry.id, payload, rawText);

    // Check the link exists: brief → result via 'produced'.
    const linked = await store.walk(briefEntry.id, 'produced');
    assert.equal(linked.length, 1, 'should have exactly one produced link');
    assert.equal(linked[0].id, resultId);
    assert.equal(linked[0].type, 'result');

    await store.close();
  });

  it('payload.diffOutcome is undefined on new capture', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);

    const briefEntry = await store.create({
      type: 'execution',
      title: 'Brief For DiffOutcome Test',
      payload: {
        briefMarkdown: '# Brief',
        targetHarness: 'claude-code',
        briefVersion: 1,
      },
    });

    const rawText = '# Result\n';
    const payload = makePayload({ briefId: briefEntry.id });
    // Explicitly ensure no diffOutcome.
    assert.equal(payload.diffOutcome, undefined);

    const resultId = await persistResult(store, briefEntry.id, payload, rawText);
    const entry = await store.read(resultId);
    assert.ok(entry);
    const storedPayload = entry!.payload as StoredResultPayload;
    assert.equal(storedPayload.diffOutcome, undefined, 'diffOutcome should be undefined');

    await store.close();
  });
});
