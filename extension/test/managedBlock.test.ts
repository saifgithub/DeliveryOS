// CHUNK-10 § 11.1 — unit tests for the managed delimiter block reader/writer/applier.
// Covers round-trip, idempotency, create/append/replace actions, multi-block
// rejection, JSON parse-failure path, JSON key preservation, and whitespace
// normalisation.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BEGIN_MARKER_GITIGNORE,
  BEGIN_MARKER_MD,
  END_MARKER_GITIGNORE,
  END_MARKER_MD,
  SENTINEL_KEY_JSON,
  applyManagedBlock,
  buildManagedBlock,
  readManagedBlock,
} from '../src/profiles/managedBlock';

describe('managedBlock — markdown variant', () => {
  it('round-trips: build → read returns the stamped body verbatim', () => {
    const body = 'hello DeliveryOS';
    const block = buildManagedBlock(body, 'md');
    const read = readManagedBlock(block, 'md');
    assert.ok(read, 'expected non-null block');
    assert.ok(read.body.includes(body), 'body should round-trip');
    assert.ok(read.body.includes('DeliveryOS managed block v1'), 'stamp should round-trip');
  });

  it('round-trips multi-line body with markdown tables and HTML comments', () => {
    const body = [
      '## Heading inside body',
      '',
      '| col | val |',
      '| --- | --- |',
      '| a   |  1  |',
      '',
      '<!-- inner comment, not a marker -->',
      '',
      'trailing line',
    ].join('\n');
    const block = buildManagedBlock(body, 'md');
    const read = readManagedBlock(block, 'md');
    assert.ok(read);
    assert.ok(read.body.includes('## Heading inside body'));
    assert.ok(read.body.includes('<!-- inner comment, not a marker -->'));
  });

  it('readManagedBlock returns null when no marker is present', () => {
    assert.equal(readManagedBlock('plain content with no marker', 'md'), null);
  });

  it('readManagedBlock throws on multiple BEGIN markers', () => {
    const content =
      'foo\n' +
      BEGIN_MARKER_MD +
      '\nbody1\n' +
      END_MARKER_MD +
      '\nbar\n' +
      BEGIN_MARKER_MD +
      '\nbody2\n' +
      END_MARKER_MD;
    assert.throws(() => readManagedBlock(content, 'md'), /Multiple.*markers/);
  });
});

describe('managedBlock — applier (markdown variant)', () => {
  it('action=create when existing is null', () => {
    const plan = applyManagedBlock(null, 'hello', 'md');
    assert.equal(plan.action, 'create');
    assert.ok(plan.next.includes(BEGIN_MARKER_MD));
    assert.ok(plan.next.includes(END_MARKER_MD));
    assert.ok(plan.next.includes('hello'));
    // Header comment should precede the managed block on first create.
    assert.ok(plan.next.indexOf('This file is read') < plan.next.indexOf(BEGIN_MARKER_MD));
  });

  it('action=append-block when existing has no marker', () => {
    const existing = '# Pre-existing content\n\nsome user notes\n';
    const plan = applyManagedBlock(existing, 'hello', 'md');
    assert.equal(plan.action, 'append-block');
    assert.ok(plan.next.startsWith(existing), 'existing prefix preserved');
    assert.ok(plan.next.includes(BEGIN_MARKER_MD));
  });

  it('action=noop when existing block body equals new body', () => {
    const created = applyManagedBlock(null, 'hello', 'md');
    const reapplied = applyManagedBlock(created.next, 'hello', 'md');
    assert.equal(reapplied.action, 'noop');
    assert.equal(reapplied.next, created.next);
  });

  it('action=replace-block when existing body differs', () => {
    const created = applyManagedBlock(null, 'hello', 'md');
    const updated = applyManagedBlock(created.next, 'goodbye', 'md');
    assert.equal(updated.action, 'replace-block');
    assert.ok(updated.next.includes('goodbye'));
    assert.ok(!updated.next.includes('hello'));
  });

  it('replace-block preserves bytes outside the managed block', () => {
    const before = '# Top-of-file content\n\nuser paragraph\n\n';
    const after = '\n\n## Below the managed block\n\nmore user content\n';
    const block = buildManagedBlock('inner one', 'md');
    const existing = `${before}${block}${after}`;
    const plan = applyManagedBlock(existing, 'inner two', 'md');
    assert.equal(plan.action, 'replace-block');
    assert.ok(plan.next.startsWith(before));
    assert.ok(plan.next.endsWith(after));
    assert.ok(plan.next.includes('inner two'));
    assert.ok(!plan.next.includes('inner one'));
  });

  it('idempotency holds across two consecutive applies', () => {
    const first = applyManagedBlock(null, 'idempotent body', 'md');
    const second = applyManagedBlock(first.next, 'idempotent body', 'md');
    assert.equal(second.action, 'noop');
    const third = applyManagedBlock(second.next, 'idempotent body', 'md');
    assert.equal(third.action, 'noop');
  });

  it('whitespace normalisation: trailing whitespace per line is ignored for noop check', () => {
    const created = applyManagedBlock(null, 'line one\nline two', 'md');
    // Simulate an editor that trimmed trailing whitespace.
    const editedTrailing = created.next.replace(/ +$/gm, '');
    const reapplied = applyManagedBlock(editedTrailing, 'line one\nline two', 'md');
    assert.equal(reapplied.action, 'noop');
  });

  it('whitespace normalisation: trailing blank lines inside the block are ignored', () => {
    const built = buildManagedBlock('only line', 'md');
    const withExtraBlankLines = built.replace(
      END_MARKER_MD,
      `\n\n\n${END_MARKER_MD}`,
    );
    const plan = applyManagedBlock(withExtraBlankLines, 'only line', 'md');
    assert.equal(plan.action, 'noop');
  });

  it('version stamp survives the round-trip', () => {
    const created = applyManagedBlock(null, 'body', 'md');
    const reapplied = applyManagedBlock(created.next, 'body', 'md');
    assert.equal(reapplied.action, 'noop');
    assert.ok(created.next.includes('DeliveryOS managed block v1'));
  });
});

describe('managedBlock — gitignore variant', () => {
  it('round-trips with hash-marker syntax', () => {
    const body = '.deliveryos-handoff/result.md\n.deliveryos-handoff/history/';
    const block = buildManagedBlock(body, 'gitignore');
    assert.ok(block.startsWith(BEGIN_MARKER_GITIGNORE));
    assert.ok(block.endsWith(END_MARKER_GITIGNORE));
    const read = readManagedBlock(block, 'gitignore');
    assert.ok(read);
    assert.ok(read.body.includes('.deliveryos-handoff/result.md'));
  });

  it('action=create produces no header comment (gitignore convention)', () => {
    const plan = applyManagedBlock(null, '.tmp/\n', 'gitignore');
    assert.equal(plan.action, 'create');
    // Gitignore: file should start with the BEGIN marker, no preface.
    assert.ok(plan.next.startsWith(BEGIN_MARKER_GITIGNORE));
  });

  it('action=append-block preserves existing patterns', () => {
    const existing = 'node_modules\ndist/\n.env\n';
    const plan = applyManagedBlock(existing, '.tmp/', 'gitignore');
    assert.equal(plan.action, 'append-block');
    assert.ok(plan.next.startsWith(existing));
    assert.ok(plan.next.includes(BEGIN_MARKER_GITIGNORE));
  });

  it('idempotency holds for gitignore', () => {
    const first = applyManagedBlock(null, '.tmp/\n.cache/', 'gitignore');
    const second = applyManagedBlock(first.next, '.tmp/\n.cache/', 'gitignore');
    assert.equal(second.action, 'noop');
  });
});

describe('managedBlock — JSON variant', () => {
  const stubBody = JSON.stringify(
    {
      version: 1,
      begin: 'DELIVERYOS:BEGIN',
      end: 'DELIVERYOS:END',
      hooks: null,
    },
    null,
    2,
  );

  it('action=create when file is missing', () => {
    const plan = applyManagedBlock(null, stubBody, 'json');
    assert.equal(plan.action, 'create');
    const parsed = JSON.parse(plan.next);
    assert.ok(parsed[SENTINEL_KEY_JSON]);
    assert.equal(parsed[SENTINEL_KEY_JSON].version, 1);
    assert.equal(parsed[SENTINEL_KEY_JSON].hooks, null);
  });

  it('round-trips: created file → readManagedBlock returns the sentinel body', () => {
    const plan = applyManagedBlock(null, stubBody, 'json');
    const read = readManagedBlock(plan.next, 'json');
    assert.ok(read);
    const readValue = JSON.parse(read.body);
    assert.equal(readValue.version, 1);
  });

  it('action=append-block when existing file lacks the sentinel key', () => {
    const existing = JSON.stringify({ theme: 'dark', other: 42 }, null, 2);
    const plan = applyManagedBlock(existing, stubBody, 'json');
    assert.equal(plan.action, 'append-block');
    const parsed = JSON.parse(plan.next);
    assert.equal(parsed.theme, 'dark');
    assert.equal(parsed.other, 42);
    assert.ok(parsed[SENTINEL_KEY_JSON]);
  });

  it('action=noop when existing sentinel value deep-equals the new value', () => {
    const created = applyManagedBlock(null, stubBody, 'json');
    const reapplied = applyManagedBlock(created.next, stubBody, 'json');
    assert.equal(reapplied.action, 'noop');
  });

  it('action=replace-block when existing sentinel value differs', () => {
    const created = applyManagedBlock(null, stubBody, 'json');
    const newBody = JSON.stringify(
      {
        version: 1,
        begin: 'DELIVERYOS:BEGIN',
        end: 'DELIVERYOS:END',
        hooks: { PreToolUse: [{ matcher: 'Edit' }] },
      },
      null,
      2,
    );
    const updated = applyManagedBlock(created.next, newBody, 'json');
    assert.equal(updated.action, 'replace-block');
    const parsed = JSON.parse(updated.next);
    assert.ok(parsed[SENTINEL_KEY_JSON].hooks);
  });

  it('preserves all other JSON keys across a sentinel rewrite', () => {
    const existing = JSON.stringify(
      {
        theme: 'dark',
        otherSetting: { nested: true, list: [1, 2, 3] },
        [SENTINEL_KEY_JSON]: { version: 1, hooks: null },
      },
      null,
      2,
    );
    const newBody = JSON.stringify({ version: 1, hooks: { foo: 'bar' } }, null, 2);
    const plan = applyManagedBlock(existing, newBody, 'json');
    assert.equal(plan.action, 'replace-block');
    const parsed = JSON.parse(plan.next);
    assert.equal(parsed.theme, 'dark');
    assert.deepEqual(parsed.otherSetting, { nested: true, list: [1, 2, 3] });
    assert.deepEqual(parsed[SENTINEL_KEY_JSON].hooks, { foo: 'bar' });
  });

  it('parse failure on existing file returns action=noop with an error', () => {
    const existing = '{ this is not valid JSON';
    const plan = applyManagedBlock(existing, stubBody, 'json');
    assert.equal(plan.action, 'noop');
    assert.equal(plan.next, existing, 'file content must NOT be modified');
    assert.ok(plan.error, 'error field must be set');
    assert.match(plan.error, /JSON/);
  });

  it('top-level non-object existing file returns action=noop with an error', () => {
    const existing = JSON.stringify(['array', 'not', 'object'], null, 2);
    const plan = applyManagedBlock(existing, stubBody, 'json');
    assert.equal(plan.action, 'noop');
    assert.equal(plan.next, existing);
    assert.ok(plan.error);
  });

  it('readManagedBlock returns null when sentinel key is absent', () => {
    const existing = JSON.stringify({ theme: 'dark' }, null, 2);
    assert.equal(readManagedBlock(existing, 'json'), null);
  });

  it('readManagedBlock returns null when JSON is invalid', () => {
    assert.equal(readManagedBlock('{ broken', 'json'), null);
  });
});
