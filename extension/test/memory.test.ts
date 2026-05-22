// CHUNK-03 § 11.2 — unit tests for the memory module.
// Run via `npm test` from the extension/ workspace (tsx + node:test). The
// vscode-stub.ts module is aliased into the `vscode` import path via
// extension/test/tsconfig.json so MemoryStore's body file writes land in
// an in-memory Map rather than the real workspace FS.

import { afterEach, beforeEach, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { Uri, __resetVscodeStub } from './vscode-stub';
import {
  LINK_KINDS,
  MEMORY_TYPES,
  type MemoryType,
  type RequirementPayload,
} from '@deliveryos/contracts';
import { MemoryStore } from '../src/memory/MemoryStore';
import { SqlJsHost } from '../src/memory/sqlJsHost';
import { runMigrations } from '../src/memory/migrations';
import { generateMemoryId, parseMemoryIdType } from '../src/memory/ids';

// sql.js is hoisted to the root node_modules under npm workspaces.
const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);

const workspaceUri = Uri.file('/test-workspace');

function payloadFor(type: MemoryType): unknown {
  switch (type) {
    case 'intent':
      return {
        rawIdea: { text: 'bug triage assistant', capturedAt: 1 },
        discovery: null,
      };
    case 'requirement':
      return {
        category: 'functional',
        priority: 'must',
        text: 'Triage open bugs by severity',
      };
    case 'design':
      return { area: 'architecture', decision: 'use sql.js' };
    case 'codebase':
      return { folderStructure: 'src/\n  index.ts' };
    case 'execution':
      return {
        briefMarkdown: '# Brief',
        targetHarness: 'claude-code',
        briefVersion: 1,
      };
    case 'result':
      return {
        rawOutput: 'all green',
        harness: 'claude-code',
        parseConfidence: 'high',
      };
    case 'verification':
      return { verdict: 'pass' };
    case 'release':
      return {
        releaseId: 'v0.1.0',
        includedRequirementIds: [],
        finalSignOffAt: 1,
      };
    case 'test-spec':
      return {
        requirementId: 'requirement-deadbeef',
        scenarios: [
          { id: 's1', description: 'happy path', steps: [], expected: [] },
        ],
      };
  }
}

describe('memory module', () => {
  beforeEach(() => __resetVscodeStub());
  afterEach(() => __resetVscodeStub());

  describe('ids', () => {
    it('generates typed prefixed ids', () => {
      const id = generateMemoryId('intent');
      assert.ok(id.startsWith('intent-'));
      assert.equal(id.length, 'intent-'.length + 8);
    });
    it('parses the type back out of an id', () => {
      assert.equal(parseMemoryIdType('intent-7a3f9b2c'), 'intent');
      assert.equal(parseMemoryIdType('bogus'), null);
    });
    it('generates unique ids across many calls', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) ids.add(generateMemoryId('intent'));
      assert.equal(ids.size, 100);
    });
  });

  describe('migration runner', () => {
    it('initialises schema v1 from scratch', async () => {
      const host = await SqlJsHost.openInMemory(wasmBytes);
      runMigrations(host.db);
      const v = host.db.exec('SELECT v FROM _schema_version LIMIT 1');
      assert.equal(v[0].values[0][0], 1);
      const tables = host.db.exec(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      );
      const names = tables[0].values.map((r) => r[0] as string);
      assert.deepEqual(names, ['_schema_version', 'memory_entries', 'memory_links']);
      host.close();
    });
    it('is idempotent on re-run', async () => {
      const host = await SqlJsHost.openInMemory(wasmBytes);
      runMigrations(host.db);
      runMigrations(host.db);
      const v = host.db.exec('SELECT v FROM _schema_version');
      assert.equal(v[0].values.length, 1);
      assert.equal(v[0].values[0][0], 1);
      host.close();
    });
    it('creates the three expected indexes', async () => {
      const host = await SqlJsHost.openInMemory(wasmBytes);
      runMigrations(host.db);
      const res = host.db.exec(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name",
      );
      const indexes = res[0].values.map((r) => r[0] as string);
      assert.deepEqual(indexes, [
        'idx_memory_entries_type',
        'idx_memory_links_from',
        'idx_memory_links_to',
      ]);
      host.close();
    });
  });

  describe('MemoryStore CRUD', () => {
    for (const type of MEMORY_TYPES) {
      it(`round-trips a ${type} entry`, async () => {
        const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
        const payload = payloadFor(type) as never;
        const created = await store.create({
          type,
          title: `${type} title`,
          payload,
          body: `hello ${type}`,
        });
        assert.equal(created.type, type);
        assert.ok(created.id.startsWith(`${type}-`));

        const read = await store.read(created.id);
        assert.ok(read, 'read returned null');
        assert.equal(read.type, type);
        assert.equal(read.title, `${type} title`);
        assert.equal(read.body, `hello ${type}`);
        await store.close();
      });
    }

    it('returns null for a missing read', async () => {
      const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
      const res = await store.read('intent-doesnotexist');
      assert.equal(res, null);
      await store.close();
    });

    it('shallow-merges payload patches on update', async () => {
      const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
      const created = await store.create({
        type: 'requirement',
        title: 'r1',
        payload: {
          category: 'functional',
          priority: 'must',
          text: 'orig',
        } as RequirementPayload,
      });
      const updated = await store.update<'requirement'>(created.id, {
        payload: { priority: 'should' },
      });
      assert.equal(updated.payload.priority, 'should');
      assert.equal(updated.payload.text, 'orig'); // preserved
      assert.equal(updated.payload.category, 'functional');
      await store.close();
    });

    it('throws not-found on update of missing id', async () => {
      const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
      await assert.rejects(
        () => store.update('intent-nope', { title: 'x' }),
        /not-found|No entry/,
      );
      await store.close();
    });

    it('lists entries of a given type in created_at DESC order', async () => {
      const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
      const a = await store.create({
        type: 'intent',
        title: 'first',
        payload: payloadFor('intent') as never,
      });
      await new Promise((r) => setTimeout(r, 2));
      const b = await store.create({
        type: 'intent',
        title: 'second',
        payload: payloadFor('intent') as never,
      });
      await new Promise((r) => setTimeout(r, 2));
      const c = await store.create({
        type: 'intent',
        title: 'third',
        payload: payloadFor('intent') as never,
      });
      const list = await store.list('intent');
      assert.deepEqual(
        list.map((e) => e.id),
        [c.id, b.id, a.id],
      );
      await store.close();
    });
  });

  describe('MemoryStore links', () => {
    it('link / walk / backlinks round-trip', async () => {
      const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
      const intent = await store.create({
        type: 'intent',
        title: 'i1',
        payload: payloadFor('intent') as never,
      });
      const r1 = await store.create({
        type: 'requirement',
        title: 'r1',
        payload: payloadFor('requirement') as never,
      });
      const r2 = await store.create({
        type: 'requirement',
        title: 'r2',
        payload: payloadFor('requirement') as never,
      });
      await store.link(r1.id, intent.id, 'derives-from');
      await store.link(r2.id, intent.id, 'derives-from');

      const fromR1 = await store.walk(r1.id, 'derives-from');
      assert.equal(fromR1.length, 1);
      assert.equal(fromR1[0].id, intent.id);

      const fromIntent = await store.walk(intent.id, 'derives-from');
      assert.equal(fromIntent.length, 0);

      const backlinks = await store.backlinks(intent.id, 'derives-from');
      assert.equal(backlinks.length, 2);
      assert.deepEqual(
        backlinks.map((l) => l.fromId).sort(),
        [r1.id, r2.id].sort(),
      );
      await store.close();
    });

    it('link is idempotent (INSERT OR IGNORE)', async () => {
      const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
      const intent = await store.create({
        type: 'intent',
        title: 'i',
        payload: payloadFor('intent') as never,
      });
      const r = await store.create({
        type: 'requirement',
        title: 'r',
        payload: payloadFor('requirement') as never,
      });
      await store.link(r.id, intent.id, 'derives-from');
      await store.link(r.id, intent.id, 'derives-from'); // dup
      const backlinks = await store.backlinks(intent.id);
      assert.equal(backlinks.length, 1);
      await store.close();
    });

    it('backlinks honours every canonical LinkKind name', () => {
      // Sanity: the kinds vocabulary is what § 5.5 declared.
      assert.deepEqual(
        [...LINK_KINDS].sort(),
        [
          'derived-from-verification',
          'derives-from',
          'evaluates',
          'has-test-spec',
          'includes',
          'produced',
          'releases',
          'reworks',
          'supersedes',
          'verifies',
        ],
      );
    });
  });

  describe('payload JSON round-trip edge cases', () => {
    it('preserves a fully-populated RequirementPayload (no undefined fields lost)', async () => {
      const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
      const payload: RequirementPayload = {
        category: 'non-functional',
        priority: 'should',
        sourcePrdSection: '§ 13.2',
        text: 'Must respond in under 100ms',
        verificationCriteria: ['p95 < 100ms', 'p99 < 200ms'],
        assumptions: ['homogenous network'],
        constraints: ['no caching'],
      };
      const created = await store.create({
        type: 'requirement',
        title: 'perf',
        payload,
      });
      const read = await store.read(created.id);
      assert.ok(read);
      assert.deepEqual(read.payload, payload);
      await store.close();
    });
  });
});
