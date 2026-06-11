// L1 — MemoryStore bug CRUD (post-build iteration loop).
// Mirrors the change-request store coverage: create → list → load → update →
// link, plus a check that the markdown body mirror round-trips.

import { afterEach, beforeEach, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { Uri, __resetVscodeStub } from './vscode-stub';
import { MemoryStore } from '../src/memory/MemoryStore';

const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);

const workspaceUri = Uri.file('/test-workspace');

async function freshStore(): Promise<MemoryStore> {
  return MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
}

// A project is anchored by an `intent` entry; bugs derive-from it.
async function seedProject(store: MemoryStore): Promise<{ projectId: string; reqId: string }> {
  const intent = await store.create({
    type: 'intent',
    title: 'project',
    payload: { rawIdea: { text: 'okr app', capturedAt: 1 }, discovery: null } as never,
    body: 'okr app',
  });
  const req = await store.create({
    type: 'requirement',
    title: 'REQ-001',
    payload: { category: 'functional', priority: 'must', text: 'Login works' } as never,
    body: 'Login works',
  });
  return { projectId: intent.id, reqId: req.id };
}

describe('MemoryStore — bug CRUD', () => {
  beforeEach(() => __resetVscodeStub());
  afterEach(() => __resetVscodeStub());

  it('creates a bug in status open with a BUG-NNN id and derives-from the project', async () => {
    const store = await freshStore();
    const { projectId } = await seedProject(store);

    const bug = await store.createBug(projectId, {
      description: 'Login fails for mixed-case emails',
      severity: 'high',
      area: 'auth',
      discoveredIn: 'manual (user report)',
    });

    assert.equal(bug.payload.id, 'BUG-001');
    assert.equal(bug.payload.status, 'open');
    assert.equal(bug.payload.severity, 'high');
    assert.equal(bug.payload.area, 'auth');
    assert.ok(bug.entryId.startsWith('bug-'));

    const list = await store.listBugs(projectId);
    assert.equal(list.length, 1);
    assert.equal(list[0].payload.id, 'BUG-001');
    await store.close();
  });

  it('auto-increments BUG-NNN across creates', async () => {
    const store = await freshStore();
    const { projectId } = await seedProject(store);
    await store.createBug(projectId, { description: 'one', severity: 'low' });
    const second = await store.createBug(projectId, { description: 'two', severity: 'medium' });
    assert.equal(second.payload.id, 'BUG-002');
    await store.close();
  });

  it('links a bug to the requirement it violates via addresses', async () => {
    const store = await freshStore();
    const { projectId, reqId } = await seedProject(store);
    const bug = await store.createBug(projectId, {
      description: 'KPI rating off-by-one at threshold boundary',
      severity: 'critical',
      targetRequirementId: reqId,
    });
    assert.equal(bug.payload.targetRequirementId, reqId);
    const linked = await store.walk(bug.entryId, 'addresses');
    assert.ok(linked.some((e) => e.id === reqId), 'expected an addresses link to the requirement');
    await store.close();
  });

  it('allows a free-standing bug with no requirement link', async () => {
    const store = await freshStore();
    const { projectId } = await seedProject(store);
    const bug = await store.createBug(projectId, { description: 'typo in footer', severity: 'low' });
    assert.equal(bug.payload.targetRequirementId, undefined);
    const linked = await store.walk(bug.entryId, 'addresses');
    assert.equal(linked.length, 0);
    await store.close();
  });

  it('updates status through the lifecycle and loads it back', async () => {
    const store = await freshStore();
    const { projectId } = await seedProject(store);
    const bug = await store.createBug(projectId, { description: 'broken nav', severity: 'medium' });

    const assigned = await store.updateBug(bug.entryId, { status: 'assigned', assignedAt: 100 });
    assert.equal(assigned.payload.status, 'assigned');
    assert.equal(assigned.payload.assignedAt, 100);

    const verified = await store.updateBug(bug.entryId, {
      status: 'verified',
      verifiedAt: 200,
      fixResultId: 'result-deadbeef',
    });
    assert.equal(verified.payload.status, 'verified');
    assert.equal(verified.payload.fixResultId, 'result-deadbeef');

    const loaded = await store.loadBug(bug.entryId);
    assert.ok(loaded);
    assert.equal(loaded.payload.status, 'verified');
    // BUG-NNN id is preserved across updates.
    assert.equal(loaded.payload.id, 'BUG-001');
    await store.close();
  });

  it('mirrors the bug body to the markdown layer (round-trips via read)', async () => {
    const store = await freshStore();
    const { projectId } = await seedProject(store);
    const bug = await store.createBug(projectId, {
      description: 'Excel import drops the last row',
      severity: 'high',
    });
    const entry = await store.read(bug.entryId);
    assert.ok(entry, 'entry should be readable');
    assert.equal(entry.type, 'bug');
    assert.match(entry.body, /Excel import drops the last row/);
    await store.close();
  });

  it('updateBug rejects a non-bug entry', async () => {
    const store = await freshStore();
    const { reqId } = await seedProject(store);
    await assert.rejects(() => store.updateBug(reqId, { status: 'fixed' }));
    await store.close();
  });
});
