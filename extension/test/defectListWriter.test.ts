// L2 — aggregate markdown writers (DEFECT_LIST.md / CHANGE_REQUESTS.md).
// Pure renderers are tested directly; the store-resolver + FS round-trip is
// tested against an in-memory store + the vscode-stub FS.

import { afterEach, beforeEach, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { Uri, workspace, __resetVscodeStub } from './vscode-stub';
import { MemoryStore } from '../src/memory/MemoryStore';
import {
  changeRowsFromCrs,
  defectRowsFromBugs,
  formatDate,
  regenerateDefectList,
  renderChangeRequestList,
  renderDefectList,
  type ChangeRow,
  type DefectRow,
} from '../src/iteration/defectListWriter';

const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);
const workspaceUri = Uri.file('/test-workspace');

const sampleDefect: DefectRow = {
  id: 'BUG-001',
  severity: 'high',
  status: 'open',
  area: 'auth',
  description: 'Login fails for mixed-case emails',
  discoveredIn: 'manual',
  requirement: 'REQ-004',
  verified: '—',
  notes: '',
};

describe('defectListWriter — pure renderers', () => {
  it('renders a defect table with header + separator + one row', () => {
    const md = renderDefectList([sampleDefect]);
    assert.match(md, /# Defect List/);
    assert.match(md, /\| Bug \| Severity \| Status \|/);
    assert.match(md, /\| BUG-001 \| high \| open \| auth \|/);
    assert.match(md, /REQ-004/);
  });

  it('escapes pipes and newlines inside a cell', () => {
    const md = renderDefectList([
      { ...sampleDefect, description: 'a | b\nc' },
    ]);
    assert.match(md, /a \\\| b c/);
    // The row must remain a single line (no raw newline split it).
    const rowLines = md.split('\n').filter((l) => l.startsWith('| BUG-001'));
    assert.equal(rowLines.length, 1);
  });

  it('shows an empty-state note when there are no defects', () => {
    const md = renderDefectList([]);
    assert.match(md, /_No defects logged yet\._/);
  });

  it('renders a change-request table', () => {
    const rows: ChangeRow[] = [
      { id: 'CR-001', status: 'applied', description: 'add offline mode', added: '2', edited: '1', deleted: '0' },
    ];
    const md = renderChangeRequestList(rows);
    assert.match(md, /# Change Requests/);
    assert.match(md, /\| CR-001 \| applied \| add offline mode \| 2 \| 1 \| 0 \|/);
  });

  it('formatDate renders YYYY-MM-DD or em-dash', () => {
    assert.equal(formatDate(undefined), '—');
    assert.equal(formatDate(0), '—');
    assert.equal(formatDate(Date.parse('2026-06-11T12:00:00Z')), '2026-06-11');
  });
});

describe('defectListWriter — store resolvers + FS', () => {
  beforeEach(() => __resetVscodeStub());
  afterEach(() => __resetVscodeStub());

  it('resolves targetRequirementId to its REQ-NNN user id', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const intent = await store.create({
      type: 'intent',
      title: 'p',
      payload: { rawIdea: { text: 'x', capturedAt: 1 }, discovery: null } as never,
      body: 'x',
    });
    const reqs = await store.createRequirementItems(intent.id, [
      { title: 'Login', description: 'Login works', category: 'functional', priority: 'must', sourcePrdSection: 'Scope' },
    ]);
    const reqEntryId = reqs[0];
    const bug = await store.createBug(intent.id, {
      description: 'login broken',
      severity: 'critical',
      targetRequirementId: reqEntryId,
    });

    const rows = await defectRowsFromBugs(store, [
      { entryId: bug.entryId, payload: bug.payload, createdAt: 0, updatedAt: 0 },
    ]);
    assert.equal(rows.length, 1);
    assert.match(rows[0].requirement, /^REQ-\d+$/);
    await store.close();
  });

  it('regenerateDefectList writes .deliveryos/DEFECT_LIST.md', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const intent = await store.create({
      type: 'intent',
      title: 'p',
      payload: { rawIdea: { text: 'x', capturedAt: 1 }, discovery: null } as never,
      body: 'x',
    });
    await store.createBug(intent.id, { description: 'broken nav', severity: 'medium' });

    await regenerateDefectList(workspaceUri, store, intent.id);

    const uri = Uri.joinPath(workspaceUri, '.deliveryos', 'DEFECT_LIST.md');
    const written = new TextDecoder().decode(await workspace.fs.readFile(uri));
    assert.match(written, /BUG-001/);
    assert.match(written, /broken nav/);
    await store.close();
  });

  it('changeRowsFromCrs maps counts from payload arrays', () => {
    const rows = changeRowsFromCrs([
      {
        entryId: 'change-request-1',
        createdAt: 0,
        updatedAt: 0,
        payload: {
          kind: 'change-request',
          id: 'CR-001',
          description: 'x',
          status: 'applied',
          prdSnapshotSections: [],
          addedRequirementIds: ['a', 'b'],
          editedRequirementIds: ['c'],
          deletedRequirementUserIds: [],
        },
      },
    ]);
    assert.equal(rows[0].added, '2');
    assert.equal(rows[0].edited, '1');
    assert.equal(rows[0].deleted, '0');
  });
});
