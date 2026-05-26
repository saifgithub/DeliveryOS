// CHUNK-14 — unit tests for the verification workflow.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { Uri, __resetVscodeStub } from './vscode-stub';
import { MemoryStore } from '../src/memory/MemoryStore';
import { recordVerdict } from '../src/verification/verificationWorkflow';
import type { VerificationMemoryPayload } from '@deliveryos/contracts';

const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);

const workspaceUri = Uri.file('/test-workspace-verification');

async function buildBaseEntries(store: MemoryStore) {
  const reqEntry = await store.create({
    type: 'requirement',
    title: 'REQ-001 — Feature',
    payload: {
      category: 'functional' as const,
      priority: 'must' as const,
      text: 'Do the thing',
    },
  });

  const testSpecEntry = await store.create({
    type: 'test-spec',
    title: 'TS-REQ-001',
    payload: { requirementId: reqEntry.id, scenarios: [] },
  });

  const resultEntry = await store.create({
    type: 'result',
    title: 'Result 1',
    payload: { rawOutput: 'done', harness: 'claude-code' as const, parseConfidence: 'high' as const },
  });

  return { reqEntry, testSpecEntry, resultEntry };
}

describe('verificationWorkflow — recordVerdict', () => {
  beforeEach(() => __resetVscodeStub());

  it('pass verdict writes VerificationMemory with correct type', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const { reqEntry, testSpecEntry, resultEntry } = await buildBaseEntries(store);

    const verificationId = await recordVerdict(
      store,
      {
        requirementEntryId: reqEntry.id,
        resultEntryId: resultEntry.id,
        testSpecEntryId: testSpecEntry.id,
      },
      { verdict: 'pass', diffOverride: false },
    );

    assert.ok(verificationId, 'verificationId should be defined');
    const entry = await store.read(verificationId);
    assert.ok(entry, 'entry should exist');
    assert.equal(entry!.type, 'verification');

    await store.close();
  });

  it('pass verdict writes correct links: evaluates (result), evaluates (testSpec), verifies (req)', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const { reqEntry, testSpecEntry, resultEntry } = await buildBaseEntries(store);

    const verificationId = await recordVerdict(
      store,
      {
        requirementEntryId: reqEntry.id,
        resultEntryId: resultEntry.id,
        testSpecEntryId: testSpecEntry.id,
      },
      { verdict: 'pass', diffOverride: false },
    );

    const evaluatesTargets = await store.walk(verificationId, 'evaluates');
    const evaluatesIds = evaluatesTargets.map((e) => e.id);
    assert.ok(evaluatesIds.includes(resultEntry.id), 'should have evaluates → result');
    assert.ok(evaluatesIds.includes(testSpecEntry.id), 'should have evaluates → testSpec');

    const verifiesTargets = await store.walk(verificationId, 'verifies');
    assert.equal(verifiesTargets.length, 1, 'should have one verifies link');
    assert.equal(verifiesTargets[0].id, reqEntry.id);

    await store.close();
  });

  it('diffOverride flag propagated into payload', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const { reqEntry, testSpecEntry, resultEntry } = await buildBaseEntries(store);

    const verificationId = await recordVerdict(
      store,
      {
        requirementEntryId: reqEntry.id,
        resultEntryId: resultEntry.id,
        testSpecEntryId: testSpecEntry.id,
      },
      { verdict: 'pass', diffOverride: true },
    );

    const entry = await store.read(verificationId);
    const payload = entry!.payload as unknown as VerificationMemoryPayload;
    assert.equal(payload.diffOverride, true, 'diffOverride should be true');

    await store.close();
  });

  it('fail verdict sets verdict=fail and records failedCriteria', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const { reqEntry, testSpecEntry, resultEntry } = await buildBaseEntries(store);

    const verificationId = await recordVerdict(
      store,
      {
        requirementEntryId: reqEntry.id,
        resultEntryId: resultEntry.id,
        testSpecEntryId: testSpecEntry.id,
      },
      {
        verdict: 'fail',
        diffOverride: false,
        failedCriteria: ['Criterion A', 'Criterion B'],
        defects: [{ id: 'D1', summary: 'Bug in feature X' }],
      },
    );

    const entry = await store.read(verificationId);
    const payload = entry!.payload as unknown as VerificationMemoryPayload;
    assert.equal(payload.verdict, 'fail');
    assert.deepEqual(payload.failedCriteria, ['Criterion A', 'Criterion B']);
    assert.equal(payload.defects.length, 1);
    assert.equal(payload.defects[0].id, 'D1');

    await store.close();
  });

  it('rework verdict writes entry but does NOT create a release', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const { reqEntry, testSpecEntry, resultEntry } = await buildBaseEntries(store);

    const verificationId = await recordVerdict(
      store,
      {
        requirementEntryId: reqEntry.id,
        resultEntryId: resultEntry.id,
        testSpecEntryId: testSpecEntry.id,
      },
      {
        verdict: 'rework',
        diffOverride: false,
        reworkNotes: 'Need to rework the implementation',
      },
    );

    const entry = await store.read(verificationId);
    const payload = entry!.payload as unknown as VerificationMemoryPayload;
    assert.equal(payload.verdict, 'rework');
    assert.equal(payload.reworkNotes, 'Need to rework the implementation');

    // No release entries should exist.
    const releases = await store.list('release');
    assert.equal(releases.length, 0, 'rework verdict should not create a release');

    await store.close();
  });

  it('throws when result entry not found', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const { reqEntry, testSpecEntry } = await buildBaseEntries(store);

    await assert.rejects(
      () =>
        recordVerdict(
          store,
          {
            requirementEntryId: reqEntry.id,
            resultEntryId: 'result-nonexistent',
            testSpecEntryId: testSpecEntry.id,
          },
          { verdict: 'pass', diffOverride: false },
        ),
      /not found/i,
    );

    await store.close();
  });
});
