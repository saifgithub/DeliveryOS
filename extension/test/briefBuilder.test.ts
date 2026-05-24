import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { Uri, __resetVscodeStub } from './vscode-stub';
import { MemoryStore } from '../src/memory/MemoryStore';
import { assembleDraft } from '../src/brief/briefBuilder';
import {
  BRIEF_SCHEMA_VERSION,
  parse,
  serialise,
} from '../src/brief/briefMarkdown';
import { validate } from '../src/brief/briefValidator';

const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);
const workspaceUri = Uri.file('/test-workspace');

async function newStore(): Promise<MemoryStore> {
  return MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
}

async function seedRequirement(store: MemoryStore): Promise<{
  intentId: string;
  prdId: string;
  reqEntryId: string;
}> {
  const intent = await store.createIntent(
    'Sort GitHub issues by priority',
    'Bug Triage Assistant',
  );
  const prd = await store.upsertPrdParent(
    { id: intent.id, title: intent.title },
    [
      {
        id: 'goals',
        title: 'Goals',
        body: 'Make triage less awful.',
        present: true,
      },
    ],
  );
  const ids = await store.createRequirementItems(prd.prdId, [
    {
      title: 'Bug submission API',
      description: 'Implement a POST /bugs endpoint that validates and persists.',
      category: 'functional',
      priority: 'must',
      sourcePrdSection: 'Goals',
    },
  ]);
  return { intentId: intent.id, prdId: prd.prdId, reqEntryId: ids[0] };
}

describe('assembleDraft', () => {
  beforeEach(() => __resetVscodeStub());
  afterEach(() => __resetVscodeStub());

  it('produces a draft brief with all 10 sections + canonical Section 9 template', async () => {
    const store = await newStore();
    try {
      const { reqEntryId, intentId } = await seedRequirement(store);
      const outcome = await assembleDraft({
        memoryStore: store,
        requirementEntryId: reqEntryId,
        projectId: intentId,
        projectTitle: 'Bug Triage Assistant',
      });
      assert.equal(outcome.ok, true);
      if (!outcome.ok) return;
      const brief = outcome.brief;
      assert.equal(brief.frontmatter.schema_version, BRIEF_SCHEMA_VERSION);
      assert.equal(brief.frontmatter.project_id, intentId);
      assert.equal(brief.frontmatter.requirement_id, 'REQ-001');
      assert.equal(brief.frontmatter.profile, '(unspecified)');
      assert.ok(brief.frontmatter.brief_id.startsWith('brief_'));
      assert.match(brief.sections.objective.body, /REQ-001/);
      assert.match(brief.sections['approved-requirement'].body, /Bug submission API/);
      assert.match(brief.sections['test-first-specification'].body, /No Test Specification linked/);
      assert.match(brief.sections['expected-output'].body, /Summary of Changes/);
      assert.match(brief.sections['expected-output'].body, /Unresolved Questions/);
      assert.equal(brief.allowed.globs.length, 0);
      assert.equal(brief.forbidden.globs.length, 0);
    } finally {
      await store.close();
    }
  });

  it('round-trips through serialise → parse', async () => {
    const store = await newStore();
    try {
      const { reqEntryId, intentId } = await seedRequirement(store);
      const outcome = await assembleDraft({
        memoryStore: store,
        requirementEntryId: reqEntryId,
        projectId: intentId,
        projectTitle: 'Bug Triage Assistant',
      });
      if (!outcome.ok) return assert.fail('expected draft to assemble');
      // Add a populated Allowed list so the brief becomes serialise-stable.
      const withAllowed = {
        ...outcome.brief,
        allowed: { kind: 'allowed' as const, globs: ['src/foo.ts'] },
        sections: {
          ...outcome.brief.sections,
          'allowed-changes': {
            ...outcome.brief.sections['allowed-changes'],
            body: '- src/foo.ts',
          },
        },
      };
      const md = serialise(withAllowed);
      const { brief } = parse(md);
      assert.equal(brief.frontmatter.brief_id, outcome.brief.frontmatter.brief_id);
      assert.deepEqual(brief.allowed.globs, ['src/foo.ts']);
    } finally {
      await store.close();
    }
  });

  it('returns no-requirement for a non-existent id', async () => {
    const store = await newStore();
    try {
      const outcome = await assembleDraft({
        memoryStore: store,
        requirementEntryId: 'requirement-ghost123',
        projectId: 'intent-deadbeef',
        projectTitle: 'X',
      });
      assert.equal(outcome.ok, false);
    } finally {
      await store.close();
    }
  });

  it('a fresh draft fails validation only because Allowed is empty', async () => {
    const store = await newStore();
    try {
      const { reqEntryId, intentId } = await seedRequirement(store);
      const outcome = await assembleDraft({
        memoryStore: store,
        requirementEntryId: reqEntryId,
        projectId: intentId,
        projectTitle: 'Bug Triage Assistant',
      });
      if (!outcome.ok) return assert.fail();
      const v = validate(outcome.brief);
      assert.equal(v.ok, false);
      assert.ok(v.errors.some((e) => /Allowed Changes/.test(e)));
      // Section 5 is permitted to be empty; should appear only as a warning
      // (or not at all) but not as a blocking error.
      assert.equal(
        v.errors.filter((e) => /Existing Codebase Context/.test(e)).length,
        0,
      );
    } finally {
      await store.close();
    }
  });
});

describe('MemoryStore brief CRUD', () => {
  beforeEach(() => __resetVscodeStub());
  afterEach(() => __resetVscodeStub());

  it('createBrief writes a row + derives-from link', async () => {
    const store = await newStore();
    try {
      const { reqEntryId, intentId } = await seedRequirement(store);
      const outcome = await assembleDraft({
        memoryStore: store,
        requirementEntryId: reqEntryId,
        projectId: intentId,
        projectTitle: 'Bug Triage Assistant',
      });
      if (!outcome.ok) return assert.fail();
      const finalised = {
        ...outcome.brief,
        allowed: { kind: 'allowed' as const, globs: ['src/foo.ts'] },
        sections: {
          ...outcome.brief.sections,
          'allowed-changes': {
            ...outcome.brief.sections['allowed-changes'],
            body: '- src/foo.ts',
          },
        },
      };
      const lockedAt = new Date().toISOString();
      const created = await store.createBrief({
        requirementEntryId: reqEntryId,
        projectId: intentId,
        briefUserId: finalised.frontmatter.brief_id,
        briefMarkdown: serialise({
          ...finalised,
          frontmatter: { ...finalised.frontmatter, locked_at: lockedAt },
        }),
        profile: '(unspecified)',
        lockedAt,
        briefVersion: 1,
        schemaVersion: BRIEF_SCHEMA_VERSION,
      });
      assert.ok(created.entryId.startsWith('execution-'));
      const fetched = await store.getBrief(created.entryId);
      assert.ok(fetched);
      assert.equal(fetched.payload.kind, 'execution-brief');
      assert.equal(fetched.payload.id, finalised.frontmatter.brief_id);
      assert.equal(fetched.payload.requirementUserId, 'REQ-001');
      assert.match(fetched.body, /^---\nbrief_id:/);
      assert.match(fetched.body, /# DeliveryOS Execution Brief/);
      const briefs = await store.listBriefsForRequirement(reqEntryId);
      assert.equal(briefs.length, 1);
      assert.equal(briefs[0].entryId, created.entryId);
    } finally {
      await store.close();
    }
  });

  it('listBriefsForRequirement returns multiple briefs in created_at order', async () => {
    const store = await newStore();
    try {
      const { reqEntryId, intentId } = await seedRequirement(store);
      const outcome = await assembleDraft({
        memoryStore: store,
        requirementEntryId: reqEntryId,
        projectId: intentId,
        projectTitle: 'Bug Triage Assistant',
      });
      if (!outcome.ok) return assert.fail();
      const v1 = await store.createBrief({
        requirementEntryId: reqEntryId,
        projectId: intentId,
        briefUserId: 'brief_v1',
        briefMarkdown: '---\nbrief_id: "brief_v1"\nschema_version: 1\nproject_id: "p"\nrequirement_id: "REQ-001"\nprofile: "(unspecified)"\ncreated_at: "x"\n---\n# DeliveryOS Execution Brief\n',
        profile: '(unspecified)',
        lockedAt: new Date(Date.now() - 1000).toISOString(),
        briefVersion: 1,
        schemaVersion: BRIEF_SCHEMA_VERSION,
      });
      // Sleep briefly so created_at differs.
      await new Promise((r) => setTimeout(r, 10));
      const v2 = await store.createBrief({
        requirementEntryId: reqEntryId,
        projectId: intentId,
        briefUserId: 'brief_v2',
        briefMarkdown: '---\nbrief_id: "brief_v2"\nschema_version: 1\nproject_id: "p"\nrequirement_id: "REQ-001"\nprofile: "(unspecified)"\ncreated_at: "y"\n---\n# DeliveryOS Execution Brief\n',
        profile: '(unspecified)',
        lockedAt: new Date().toISOString(),
        briefVersion: 2,
        schemaVersion: BRIEF_SCHEMA_VERSION,
        supersedesEntryId: v1.entryId,
      });
      const briefs = await store.listBriefsForRequirement(reqEntryId);
      assert.equal(briefs.length, 2);
      assert.equal(briefs[0].entryId, v1.entryId);
      assert.equal(briefs[1].entryId, v2.entryId);
      assert.equal(briefs[1].payload.supersedesEntryId, v1.entryId);
    } finally {
      await store.close();
    }
  });

  it('getBrief returns null for an unknown id', async () => {
    const store = await newStore();
    try {
      const result = await store.getBrief('execution-ghost001');
      assert.equal(result, null);
    } finally {
      await store.close();
    }
  });
});
