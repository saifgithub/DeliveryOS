// L3 — shared back-half orchestration (compose / assign / fix / close).

import { afterEach, beforeEach, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { Uri, workspace, __resetVscodeStub } from './vscode-stub';
import { MemoryStore } from '../src/memory/MemoryStore';
import {
  closeSourceOnPass,
  closeSourcesForRequirementOnPass,
  composeBugBrief,
  findSourcesForRequirement,
  markBugAssigned,
  markBugFixed,
} from '../src/iteration/driveChange';

const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);
const workspaceUri = Uri.file('/test-workspace');

async function seed(store: MemoryStore): Promise<{ projectId: string; reqId: string }> {
  const intent = await store.create({
    type: 'intent',
    title: 'project',
    payload: { rawIdea: { text: 'okr', capturedAt: 1 }, discovery: null } as never,
    body: 'okr',
  });
  const reqs = await store.createRequirementItems(intent.id, [
    { title: 'Login', description: 'Login must work.', category: 'functional', priority: 'must', sourcePrdSection: 'Scope' },
  ]);
  return { projectId: intent.id, reqId: reqs[0] };
}

describe('driveChange — shared back-half', () => {
  beforeEach(() => __resetVscodeStub());
  afterEach(() => __resetVscodeStub());

  it('composeBugBrief reuses assembleDraft when the bug targets a requirement', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const { projectId, reqId } = await seed(store);
    const bug = await store.createBug(projectId, {
      description: 'login broken for caps emails',
      severity: 'high',
      targetRequirementId: reqId,
    });
    const outcome = await composeBugBrief(store, {
      bugEntryId: bug.entryId,
      projectId,
      projectTitle: 'OKR App',
    });
    assert.equal(outcome.ok, true);
    if (outcome.ok) {
      assert.equal(outcome.requirementEntryId, reqId);
      assert.match(outcome.brief.metaLines.requirement, /^REQ-\d+ — Login/);
    }
    await store.close();
  });

  it('composeBugBrief returns free-standing when the bug has no requirement', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const { projectId } = await seed(store);
    const bug = await store.createBug(projectId, { description: 'footer typo', severity: 'low' });
    const outcome = await composeBugBrief(store, {
      bugEntryId: bug.entryId,
      projectId,
      projectTitle: 'OKR App',
    });
    assert.equal(outcome.ok, false);
    if (!outcome.ok) assert.equal(outcome.reason, 'free-standing');
    await store.close();
  });

  it('markBugAssigned and markBugFixed advance the lifecycle', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const { projectId } = await seed(store);
    const bug = await store.createBug(projectId, { description: 'broken nav', severity: 'medium' });

    await markBugAssigned(store, bug.entryId);
    let cur = await store.loadBug(bug.entryId);
    assert.equal(cur?.payload.status, 'assigned');
    assert.ok(cur?.payload.assignedAt);

    await markBugFixed(store, bug.entryId, 'result-abc');
    cur = await store.loadBug(bug.entryId);
    assert.equal(cur?.payload.status, 'fixed');
    assert.equal(cur?.payload.fixResultId, 'result-abc');
    await store.close();
  });

  it('findSourcesForRequirement returns bugs and CRs that address a requirement', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const { projectId, reqId } = await seed(store);
    const bug = await store.createBug(projectId, {
      description: 'x',
      severity: 'high',
      targetRequirementId: reqId,
    });
    const cr = await store.createChangeRequest(projectId, 'tweak login', []);
    await store.linkCrToRequirements(cr.entryId, [reqId]);

    const sources = await findSourcesForRequirement(store, reqId);
    const ids = sources.map((s) => s.entryId).sort();
    assert.deepEqual(ids, [bug.entryId, cr.entryId].sort());
    await store.close();
  });

  it('closeSourceOnPass verifies a bug and regenerates DEFECT_LIST.md', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const { projectId } = await seed(store);
    const bug = await store.createBug(projectId, { description: 'broken nav', severity: 'medium' });

    await closeSourceOnPass(store, workspaceUri, {
      source: { entryId: bug.entryId, type: 'bug' },
      resultEntryId: 'result-xyz',
      projectId,
    });

    const cur = await store.loadBug(bug.entryId);
    assert.equal(cur?.payload.status, 'verified');
    assert.equal(cur?.payload.fixResultId, 'result-xyz');
    assert.ok(cur?.payload.verifiedAt);

    const md = new TextDecoder().decode(
      await workspace.fs.readFile(Uri.joinPath(workspaceUri, '.deliveryos', 'DEFECT_LIST.md')),
    );
    assert.match(md, /verified/);
    await store.close();
  });

  it('closeSourcesForRequirementOnPass closes a linked bug and CR to verified', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const { projectId, reqId } = await seed(store);
    const bug = await store.createBug(projectId, {
      description: 'x',
      severity: 'high',
      targetRequirementId: reqId,
    });
    const cr = await store.createChangeRequest(projectId, 'tweak', []);
    await store.updateChangeRequest(cr.entryId, { status: 'applied' });
    await store.linkCrToRequirements(cr.entryId, [reqId]);

    const closed = await closeSourcesForRequirementOnPass(store, workspaceUri, {
      requirementEntryId: reqId,
      resultEntryId: 'result-1',
      projectId,
    });
    assert.equal(closed.length, 2);

    assert.equal((await store.loadBug(bug.entryId))?.payload.status, 'verified');
    assert.equal((await store.loadChangeRequest(cr.entryId))?.payload.status, 'verified');
    await store.close();
  });
});
