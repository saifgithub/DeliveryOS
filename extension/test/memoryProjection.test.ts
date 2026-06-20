// Tests for the grep-able markdown projection (src/memory/projection.ts).
// Uses the same vscode-stub aliasing as memory.test.ts: MemoryStore body
// writes and the projection files both land in the stub's in-memory FS, so
// we read them back through the stubbed `vscode.workspace.fs`.

import { afterEach, beforeEach, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { Uri, workspace, __resetVscodeStub } from './vscode-stub';
import { MEMORY_TYPES } from '@deliveryos/contracts';
import { MemoryStore, type ProjectionSnapshot } from '../src/memory/MemoryStore';
import {
  MemoryProjection,
  renderIndex,
  renderLinks,
  renderTypeRollup,
} from '../src/memory/projection';
import {
  memoryIndexPath,
  memoryLinksPath,
  memoryTypeRollupPath,
} from '../src/memory/paths';

const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);

const workspaceUri = Uri.file('/test-workspace');
const decoder = new TextDecoder('utf-8');

async function read(uri: ReturnType<typeof memoryIndexPath>): Promise<string> {
  const bytes = await workspace.fs.readFile(uri);
  return decoder.decode(bytes);
}

describe('memory projection', () => {
  beforeEach(() => __resetVscodeStub());
  afterEach(() => __resetVscodeStub());

  describe('writer (end-to-end through the store)', () => {
    it('mirrors every entry and link into grep-able markdown', async () => {
      const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
      const intent = await store.createIntent('a bug triage assistant', 'My Project');
      const bug = await store.createBug(intent.id, {
        description: 'Login fails for mixed-case emails',
        severity: 'high',
      });

      const projection = new MemoryProjection(store, workspaceUri);
      await projection.regenerateNow();

      const index = await read(memoryIndexPath(workspaceUri));
      // Every entry is a row; the bug's status/user-id are grep-able columns.
      assert.match(index, /\| bug \|/);
      assert.ok(index.includes(bug.entryId));
      assert.ok(index.includes('BUG-001'));
      assert.match(index, /\|\s*open\s*\|/);

      const links = await read(memoryLinksPath(workspaceUri));
      // Raw edge line: from_id  kind  to_id (driver-free traversal).
      assert.ok(links.includes(`${bug.entryId}  derives-from  ${intent.id}`));

      const bugRollup = await read(memoryTypeRollupPath(workspaceUri, 'bug'));
      assert.match(bugRollup, /## BUG-001 —/);
      assert.match(bugRollup, /- status: open/);
      assert.match(bugRollup, /- severity: high/);
      // Outbound link rendered with resolved label.
      assert.match(bugRollup, /- derives-from → /);

      // The target entry shows the backlink.
      const intentRollup = await read(memoryTypeRollupPath(workspaceUri, 'intent'));
      assert.match(intentRollup, /- derives-from ← BUG-001/);

      // Types with no entries still get a (non-stale) file.
      const releaseRollup = await read(memoryTypeRollupPath(workspaceUri, 'release'));
      assert.match(releaseRollup, /_None yet\._/);

      await store.close();
      projection.dispose();
    });

    it('reflects updates on the next regeneration (no drift)', async () => {
      const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
      const intent = await store.createIntent('idea', 'Proj');
      const bug = await store.createBug(intent.id, {
        description: 'flaky thing',
        severity: 'low',
      });
      const projection = new MemoryProjection(store, workspaceUri);
      await projection.regenerateNow();

      await store.updateBug(bug.entryId, { status: 'fixed' });
      await projection.regenerateNow();

      const bugRollup = await read(memoryTypeRollupPath(workspaceUri, 'bug'));
      assert.match(bugRollup, /- status: fixed/);
      assert.ok(!/- status: open/.test(bugRollup));

      await store.close();
      projection.dispose();
    });

    it('writes a file for all 11 canonical types', async () => {
      const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
      const projection = new MemoryProjection(store, workspaceUri);
      await projection.regenerateNow();
      for (const type of MEMORY_TYPES) {
        const text = await read(memoryTypeRollupPath(workspaceUri, type));
        assert.match(text, new RegExp(`# ${type} memory`));
      }
      await store.close();
      projection.dispose();
    });
  });

  describe('renderers (pure)', () => {
    const snapshot: ProjectionSnapshot = {
      entries: [
        {
          id: 'bug-aaaa',
          type: 'bug',
          title: 'Pipe | in title should not break the table',
          payload: { kind: 'bug', id: 'BUG-007', status: 'open', severity: 'high' },
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      links: [{ fromId: 'bug-aaaa', toId: 'intent-bbbb', kind: 'derives-from' }],
    };

    it('escapes pipes in index table cells', () => {
      const index = renderIndex(snapshot);
      assert.ok(index.includes('Pipe \\| in title'));
    });

    it('resolves missing link targets without throwing', () => {
      const links = renderLinks(snapshot);
      assert.ok(links.includes('bug-aaaa  derives-from  intent-bbbb'));
      assert.match(links, /intent-bbbb \(missing\)/);
    });

    it('renders an empty rollup for a type with no entries', () => {
      assert.match(renderTypeRollup('release', snapshot), /_None yet\._/);
    });
  });
});
