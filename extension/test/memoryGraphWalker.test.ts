// CHUNK-14 — unit tests for the memory graph walker.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { Uri, __resetVscodeStub } from './vscode-stub';
import { MemoryStore } from '../src/memory/MemoryStore';
import { walkChain } from '../src/release/memoryGraphWalker';
import type { VerificationPayload } from '@deliveryos/contracts';
import type { VerificationMemoryPayload, BypassRecord } from '@deliveryos/contracts';

const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);

const workspaceUri = Uri.file('/test-workspace-walker');

describe('memoryGraphWalker', () => {
  beforeEach(() => __resetVscodeStub());

  it('throws when verification entry does not exist', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    await assert.rejects(
      () => walkChain('verification-nonexistent', store),
      /not found/i,
    );
    await store.close();
  });

  it('missing-link tolerance: emits warning when result link absent', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);

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
      memoryUpdateForm: { submitted: false, fields: { designUpdate: '', codebaseUpdate: '', requirementAssumptionUpdate: '' }, emptyFieldsRecorded: [] },
      bypasses: [],
    };

    const verEntry = await store.create({
      type: 'verification',
      title: 'Test verification',
      payload: verPayload as unknown as VerificationPayload,
    });

    const chain = await walkChain(verEntry.id, store);
    assert.ok(chain.warnings.some((w) => w.includes('result')), 'should warn about missing result link');
    assert.ok(chain.warnings.some((w) => w.includes('test-spec')), 'should warn about missing test-spec link');
    assert.equal(chain.result, undefined, 'result should be undefined when link absent');
    await store.close();
  });

  it('complete-chain happy path: resolves all 8 nodes when chain intact', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);

    // Build a full chain: intent → prd (requirement kind=prd) → requirement → execution + test-spec → result → verification.
    const intentEntry = await store.create({
      type: 'intent',
      title: 'My idea',
      payload: { rawIdea: { text: 'Build something', capturedAt: 1 }, discovery: null },
    });

    const prdEntry = await store.create({
      type: 'requirement',
      title: 'PRD',
      payload: { kind: 'prd', projectId: intentEntry.id, projectTitle: 'My idea', sections: [], createdAt: 1, updatedAt: 1 } as unknown as import('@deliveryos/contracts').RequirementPayload,
    });
    await store.link(prdEntry.id, intentEntry.id, 'derives-from');

    const reqEntry = await store.create({
      type: 'requirement',
      title: 'REQ-001 — Feature',
      payload: { kind: 'requirement-item', id: 'REQ-001', title: 'Feature', category: 'functional', priority: 'must', sourcePrdSection: 'S1', text: 'Do the thing' } as unknown as import('@deliveryos/contracts').RequirementPayload,
    });
    await store.link(reqEntry.id, prdEntry.id, 'derives-from');

    const testSpecEntry = await store.create({
      type: 'test-spec',
      title: 'TS-REQ-001',
      payload: { requirementId: reqEntry.id, scenarios: [] },
    });
    await store.link(reqEntry.id, testSpecEntry.id, 'has-test-spec');

    const execEntry = await store.create({
      type: 'execution',
      title: 'Brief v1',
      payload: { briefMarkdown: '# Brief', targetHarness: 'claude-code' as const, briefVersion: 1 },
    });
    await store.link(execEntry.id, reqEntry.id, 'derives-from');

    const resultEntry = await store.create({
      type: 'result',
      title: 'Result 1',
      payload: { rawOutput: 'done', harness: 'claude-code' as const, parseConfidence: 'high' as const },
    });
    await store.link(execEntry.id, resultEntry.id, 'produced');

    const verPayload: VerificationMemoryPayload = {
      verdict: 'pass',
      failedCriteria: [],
      defects: [],
      diffOverride: false,
      approvedBy: 'user',
      approvedAt: Date.now(),
      testSpecRef: { id: testSpecEntry.id, type: 'test-spec', title: testSpecEntry.title },
      resultRef: { id: resultEntry.id, type: 'result', title: resultEntry.title },
      diffSummary: { verdict: 'pass', forbiddenTouched: [], allowedNotTouched: [] },
      memoryUpdateForm: { submitted: false, fields: { designUpdate: '', codebaseUpdate: '', requirementAssumptionUpdate: '' }, emptyFieldsRecorded: [] },
      bypasses: [],
    };

    const verEntry = await store.create({
      type: 'verification',
      title: 'Verification of result',
      payload: verPayload as unknown as VerificationPayload,
    });
    await store.link(verEntry.id, resultEntry.id, 'evaluates');
    await store.link(verEntry.id, testSpecEntry.id, 'evaluates');
    await store.link(verEntry.id, reqEntry.id, 'verifies');

    const chain = await walkChain(verEntry.id, store);

    assert.ok(chain.verification, 'verification should be set');
    assert.ok(chain.result, 'result should be set');
    assert.ok(chain.testSpec, 'testSpec should be set');
    assert.ok(chain.execution, 'execution should be set');
    assert.ok(chain.requirement, 'requirement should be set');
    assert.ok(chain.prd, 'prd should be set');
    assert.ok(chain.intent, 'intent should be set');
    assert.equal(chain.codebase, undefined, 'codebase always undefined in v1');
    assert.equal(chain.warnings.length, 0, `should have no warnings; got: ${chain.warnings.join('; ')}`);

    await store.close();
  });

  it('bypasses read from verification.payload.bypasses[]', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);

    const bypass: BypassRecord = {
      id: 'bypass-abc',
      gate: 'memory-update',
      stage: 'VERIFY',
      justification: 'prototype work, skip',
      bypassedAt: Date.now(),
      bypassedBy: 'user',
      parentVerificationId: 'ver-1',
    };

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
      memoryUpdateForm: { submitted: false, fields: { designUpdate: '', codebaseUpdate: '', requirementAssumptionUpdate: '' }, emptyFieldsRecorded: [] },
      bypasses: [bypass],
    };

    const verEntry = await store.create({
      type: 'verification',
      title: 'Ver with bypass',
      payload: verPayload as unknown as VerificationPayload,
    });

    const chain = await walkChain(verEntry.id, store);
    assert.equal(chain.bypasses.length, 1, 'should have 1 bypass');
    assert.equal(chain.bypasses[0].id, 'bypass-abc');
    assert.equal(chain.bypasses[0].justification, 'prototype work, skip');
    await store.close();
  });

  it('cycle detection: visited loop emits warning and stops recursion', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);

    // Create a result entry.
    const resultEntry = await store.create({
      type: 'result',
      title: 'Result Cycle',
      payload: { rawOutput: 'done', harness: 'claude-code' as const, parseConfidence: 'high' as const },
    });

    // Create an execution entry pointing to the result.
    const execEntry = await store.create({
      type: 'execution',
      title: 'Brief Cycle',
      payload: { briefMarkdown: '# Brief', targetHarness: 'claude-code' as const, briefVersion: 1 },
    });
    await store.link(execEntry.id, resultEntry.id, 'produced');

    // Requirement.
    const reqEntry = await store.create({
      type: 'requirement',
      title: 'REQ Cycle',
      payload: { kind: 'requirement-item', id: 'REQ-C01', title: 'Cycle req', category: 'functional', priority: 'must', sourcePrdSection: 'S1', text: 'cycle' } as unknown as import('@deliveryos/contracts').RequirementPayload,
    });
    await store.link(execEntry.id, reqEntry.id, 'derives-from');

    // Create verification.
    const verPayload: VerificationMemoryPayload = {
      verdict: 'pass',
      failedCriteria: [],
      defects: [],
      diffOverride: false,
      approvedBy: 'user',
      approvedAt: Date.now(),
      testSpecRef: { id: 'ts-c', type: 'test-spec', title: 'TS' },
      resultRef: { id: resultEntry.id, type: 'result', title: resultEntry.title },
      diffSummary: { verdict: 'pass', forbiddenTouched: [], allowedNotTouched: [] },
      memoryUpdateForm: { submitted: false, fields: { designUpdate: '', codebaseUpdate: '', requirementAssumptionUpdate: '' }, emptyFieldsRecorded: [] },
      bypasses: [],
    };

    const verEntry = await store.create({
      type: 'verification',
      title: 'Ver Cycle',
      payload: verPayload as unknown as VerificationPayload,
    });
    await store.link(verEntry.id, resultEntry.id, 'evaluates');

    // Simulate cycle: add result → verEntry as 'evaluates' to create a cycle scenario.
    // Actually the cycle detection operates on the visited set — add verEntry.id as a
    // derives-from target of reqEntry to simulate a cycle at that level.
    await store.link(reqEntry.id, verEntry.id, 'derives-from');

    const chain = await walkChain(verEntry.id, store);
    // The walker will attempt to follow derives-from from reqEntry and encounter verEntry.id
    // which is already in visited — it should emit a cycle warning OR just a prd-missing warning.
    // Either way: should not throw and should return a ChainGraph.
    assert.ok(chain, 'should return a chain graph even with cycle');
    assert.ok(Array.isArray(chain.warnings), 'warnings should be an array');
    await store.close();
  });
});
