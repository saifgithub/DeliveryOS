// Tests for lossless body files + rebuild-from-markdown (the "delete
// memory.sqlite and recover" capability). Same vscode-stub aliasing as
// memory.test.ts: body files and projection files live in the stub FS, shared
// across store instances opened on the same workspace URI.

import { afterEach, beforeEach, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { Uri, workspace, __resetVscodeStub } from './vscode-stub';
import { MemoryStore, type ProjectionSnapshot } from '../src/memory/MemoryStore';
import { MemoryProjection } from '../src/memory/projection';
import {
  parseBodyFile,
  parseLinksFile,
  renderFrontmatter,
} from '../src/memory/markdown';
import { bodyPath } from '../src/memory/markdown';

const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);

const workspaceUri = Uri.file('/test-workspace');
const decoder = new TextDecoder('utf-8');

function normalize(snap: ProjectionSnapshot) {
  return {
    entries: [...snap.entries]
      .map((e) => ({ ...e }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    links: [...snap.links].sort((a, b) =>
      `${a.fromId}|${a.kind}|${a.toId}`.localeCompare(`${b.fromId}|${b.kind}|${b.toId}`),
    ),
  };
}

describe('memory rebuild from markdown', () => {
  beforeEach(() => __resetVscodeStub());
  afterEach(() => __resetVscodeStub());

  it('embeds the full payload + updated_at in each body file', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const intent = await store.createIntent('a triage assistant', 'Proj');
    const bug = await store.createBug(intent.id, {
      description: 'Login fails for mixed-case emails',
      severity: 'high',
      notes: 'seen in prod',
    });

    const content = decoder.decode(
      await workspace.fs.readFile(bodyPath(workspaceUri, 'bug', bug.entryId)),
    );
    assert.match(content, /\nupdated_at: /);
    assert.match(content, /\npayload_json: /);
    const parsed = parseBodyFile(content);
    assert.ok(parsed);
    assert.equal(parsed.type, 'bug');
    assert.deepEqual(parsed.payload, bug.payload);

    await store.close();
  });

  it('recovers a fresh empty DB byte-for-byte from the markdown', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const intent = await store.createIntent('idea text', 'Recover Me');
    await store.createBug(intent.id, { description: 'flaky login', severity: 'low' });
    const cr = await store.createChangeRequest(intent.id, 'support offline mode', []);
    assert.ok(cr.entryId);

    // LINKS.md is the rebuild source for edges — make sure it is current.
    const projection = new MemoryProjection(store, workspaceUri);
    await projection.regenerateNow();
    const before = await store.exportAll();

    // Simulate "memory.sqlite was lost": a brand-new empty DB on the same FS.
    const recovered = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const counts = await recovered.rebuildFromMarkdown();
    const after = await recovered.exportAll();

    assert.equal(counts.entries, before.entries.length);
    assert.equal(counts.links, before.links.length);
    assert.deepEqual(normalize(after), normalize(before));

    await store.close();
    await recovered.close();
    projection.dispose();
  });

  it('backfills legacy body files lacking an embedded payload', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const intent = await store.createIntent('legacy', 'Legacy');

    // Rewrite the body file in the OLD format (no payload_json / updated_at).
    const uri = bodyPath(workspaceUri, 'intent', intent.id);
    const legacy = [
      '---',
      `id: ${intent.id}`,
      'type: intent',
      'title: "Legacy"',
      'created_at: 2026-01-01T00:00:00.000Z',
      '---',
      'legacy body',
    ].join('\n');
    await workspace.fs.writeFile(uri, new TextEncoder().encode(legacy));
    assert.ok(!parseBodyFile(legacy)); // legacy file is not rebuildable as-is

    const rewritten = await store.reprojectBodies();
    assert.equal(rewritten, 1);

    const fixed = decoder.decode(await workspace.fs.readFile(uri));
    assert.match(fixed, /\npayload_json: /);
    assert.match(fixed, /legacy body$/);

    await store.close();
  });

  describe('parsers (pure)', () => {
    it('round-trips frontmatter with nested payload and quoted title', () => {
      const payload = { kind: 'bug', id: 'BUG-009', nested: { a: 1, b: ['x', 'y'] }, status: 'open' };
      const file =
        renderFrontmatter({
          id: 'bug-zzzz',
          type: 'bug',
          title: 'Title with "quotes" inside',
          createdAt: 1_700_000_000_000,
          updatedAt: 1_700_000_500_000,
          payload,
        }) + 'the prose body\nsecond line';
      const parsed = parseBodyFile(file);
      assert.ok(parsed);
      assert.equal(parsed.id, 'bug-zzzz');
      assert.equal(parsed.title, 'Title with "quotes" inside');
      assert.equal(parsed.createdAt, 1_700_000_000_000);
      assert.equal(parsed.updatedAt, 1_700_000_500_000);
      assert.deepEqual(parsed.payload, payload);
      assert.equal(parsed.body, 'the prose body\nsecond line');
    });

    it('extracts edge triples and skips prose/headers', () => {
      const links = [
        '# Memory Links',
        '',
        '2 links.',
        '```',
        'bug-aaaa  derives-from  intent-bbbb   # BUG-001 --derives-from--> Proj',
        'bug-aaaa  addresses  requirement-cccc',
        'not a link line at all',
        '```',
      ].join('\n');
      const parsed = parseLinksFile(links);
      assert.deepEqual(parsed, [
        { fromId: 'bug-aaaa', toId: 'intent-bbbb', kind: 'derives-from' },
        { fromId: 'bug-aaaa', toId: 'requirement-cccc', kind: 'addresses' },
      ]);
    });
  });
});
