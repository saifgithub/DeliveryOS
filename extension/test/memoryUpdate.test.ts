// CHUNK-14 — unit tests for the memory update flow.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { Uri, __resetVscodeStub } from './vscode-stub';
import { MemoryStore } from '../src/memory/MemoryStore';
import { applyUpdate, recordBypass } from '../src/memory/update';
import type { VerificationMemoryPayload } from '@deliveryos/contracts';
import type { VerificationPayload } from '@deliveryos/contracts';

const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);

const workspaceUri = Uri.file('/test-workspace-memory-update');

async function makeVerificationEntry(store: MemoryStore): Promise<string> {
  const verPayload: VerificationMemoryPayload = {
    verdict: 'pass',
    failedCriteria: [],
    defects: [],
    diffOverride: false,
    approvedBy: 'user',
    approvedAt: Date.now(),
    testSpecRef: { id: 'ts-1', type: 'test-spec', title: 'TS' },
    resultRef: { id: 'r-1', type: 'result', title: 'Result' },
    diffSummary: { verdict: 'pass', forbiddenTouched: [], allowedNotTouched: [] },
    memoryUpdateForm: {
      submitted: false,
      fields: { designUpdate: '', codebaseUpdate: '', requirementAssumptionUpdate: '' },
      emptyFieldsRecorded: [],
    },
    bypasses: [],
  };

  const entry = await store.create({
    type: 'verification',
    title: 'Test verification',
    payload: verPayload as unknown as VerificationPayload,
  });
  return entry.id;
}

describe('memoryUpdate — applyUpdate', () => {
  beforeEach(() => __resetVscodeStub());

  it('empty fields record nothing-to-add in emptyFieldsRecorded', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const verificationId = await makeVerificationEntry(store);

    await applyUpdate(
      verificationId,
      { designUpdate: '', codebaseUpdate: '', requirementAssumptionUpdate: '' },
      store,
    );

    const entry = await store.read(verificationId);
    const payload = entry!.payload as unknown as VerificationMemoryPayload;
    assert.equal(payload.memoryUpdateForm.submitted, true);
    assert.ok(
      payload.memoryUpdateForm.emptyFieldsRecorded.includes('design'),
      'design should be in emptyFieldsRecorded',
    );
    assert.ok(
      payload.memoryUpdateForm.emptyFieldsRecorded.includes('codebase'),
      'codebase should be in emptyFieldsRecorded',
    );
    assert.ok(
      payload.memoryUpdateForm.emptyFieldsRecorded.includes('requirement'),
      'requirement should be in emptyFieldsRecorded',
    );

    await store.close();
  });

  it('non-empty design creates a design entry linked via derived-from-verification', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const verificationId = await makeVerificationEntry(store);

    await applyUpdate(
      verificationId,
      { designUpdate: 'Use repository pattern', codebaseUpdate: '', requirementAssumptionUpdate: '' },
      store,
    );

    // Check design entries linked back to verification.
    const backlinks = await store.backlinks(verificationId, 'derived-from-verification');
    assert.equal(backlinks.length, 1, 'should have 1 backlink from design entry');
    const designEntry = await store.read(backlinks[0].fromId);
    assert.ok(designEntry, 'design entry should exist');
    assert.equal(designEntry!.type, 'design');

    await store.close();
  });

  it('non-empty codebase creates a codebase entry linked via derived-from-verification', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const verificationId = await makeVerificationEntry(store);

    await applyUpdate(
      verificationId,
      { designUpdate: '', codebaseUpdate: 'src/index.ts is the entry point', requirementAssumptionUpdate: '' },
      store,
    );

    const backlinks = await store.backlinks(verificationId, 'derived-from-verification');
    assert.equal(backlinks.length, 1);
    const codebaseEntry = await store.read(backlinks[0].fromId);
    assert.equal(codebaseEntry!.type, 'codebase');

    await store.close();
  });

  it('throws when verification entry not found', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);

    await assert.rejects(
      () =>
        applyUpdate(
          'verification-nonexistent',
          { designUpdate: '', codebaseUpdate: '', requirementAssumptionUpdate: '' },
          store,
        ),
      /not found/i,
    );

    await store.close();
  });
});

describe('memoryUpdate — recordBypass', () => {
  beforeEach(() => __resetVscodeStub());

  it('justification min-length: 9 chars → rejects', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const verificationId = await makeVerificationEntry(store);

    await assert.rejects(
      () => recordBypass(verificationId, '123456789', store), // 9 chars
      /at least 10 characters/i,
    );

    await store.close();
  });

  it('justification min-length: 10 chars → accepts', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const verificationId = await makeVerificationEntry(store);

    const bypass = await recordBypass(verificationId, '1234567890', store); // 10 chars
    assert.ok(bypass, 'bypass should be returned');
    assert.equal(bypass.gate, 'memory-update');
    assert.equal(bypass.stage, 'VERIFY');
    assert.equal(bypass.bypassedBy, 'user');
    assert.equal(bypass.parentVerificationId, verificationId);

    await store.close();
  });

  it('bypass writes correct BypassRecord shape and appends to bypasses[]', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const verificationId = await makeVerificationEntry(store);

    await recordBypass(verificationId, 'prototype iteration only', store);

    const entry = await store.read(verificationId);
    const payload = entry!.payload as unknown as VerificationMemoryPayload;
    assert.equal(payload.bypasses.length, 1, 'should have 1 bypass');
    const b = payload.bypasses[0];
    assert.equal(b.gate, 'memory-update');
    assert.equal(b.stage, 'VERIFY');
    assert.equal(b.justification, 'prototype iteration only');
    assert.equal(b.bypassedBy, 'user');
    assert.equal(b.parentVerificationId, verificationId);
    assert.ok(typeof b.bypassedAt === 'number' && b.bypassedAt > 0);

    await store.close();
  });

  it('multiple bypasses accumulate correctly', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const verificationId = await makeVerificationEntry(store);

    await recordBypass(verificationId, 'first bypass reason', store);
    await recordBypass(verificationId, 'second bypass reason', store);

    const entry = await store.read(verificationId);
    const payload = entry!.payload as unknown as VerificationMemoryPayload;
    assert.equal(payload.bypasses.length, 2, 'should have 2 bypasses');

    await store.close();
  });
});
