// CHUNK-10 § 5 + § 11 — unit tests for computeSuggestedUpdates.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyManagedBlock,
  buildManagedBlock,
  BEGIN_MARKER_MD,
  SENTINEL_KEY_JSON,
} from '../src/profiles/managedBlock';
import { PROFILES } from '../src/profiles/registry';
import { computeSuggestedUpdates } from '../src/profiles/suggestedUpdates';
import { AGENTS_MD_BODY, CLAUDE_MD_BODY, CLAUDE_SETTINGS_STUB } from '../src/profiles/bodies';
import type { WorkspaceFileReader } from '../src/profiles/suggestedUpdates';

function makeReader(files: Record<string, string | null> = {}): WorkspaceFileReader {
  return {
    async readFile(relativePath: string): Promise<string | null> {
      return files[relativePath] ?? null;
    },
  };
}

describe('computeSuggestedUpdates — Claude Code profile', () => {
  it('returns CLAUDE.md + .claude/settings.json (both create on empty workspace)', async () => {
    const updates = await computeSuggestedUpdates(PROFILES['claude-code'], makeReader());
    assert.equal(updates.length, 2);
    assert.equal(updates[0].file, 'CLAUDE.md');
    assert.equal(updates[1].file, '.claude/settings.json');
    assert.equal(updates[0].action, 'create');
    assert.equal(updates[1].action, 'create');
    assert.equal(updates[0].existingContent, null);
    assert.equal(updates[1].existingContent, null);
  });

  it('produces a CLAUDE.md file that includes the BEGIN marker + body', async () => {
    const [claudeMd] = await computeSuggestedUpdates(PROFILES['claude-code'], makeReader());
    assert.ok(claudeMd.nextContent.includes(BEGIN_MARKER_MD));
    assert.ok(claudeMd.nextContent.includes('DeliveryOS coordination'));
    assert.ok(claudeMd.nextContent.includes('.deliveryos-handoff/current-execution-brief.md'));
  });

  it('produces a .claude/settings.json file with the sentinel key', async () => {
    const [, settings] = await computeSuggestedUpdates(PROFILES['claude-code'], makeReader());
    const parsed = JSON.parse(settings.nextContent);
    assert.ok(parsed[SENTINEL_KEY_JSON]);
    assert.equal(parsed[SENTINEL_KEY_JSON].version, 1);
    assert.equal(parsed[SENTINEL_KEY_JSON].hooks, null);
  });

  it('flips to noop on second compute after an apply (idempotency)', async () => {
    const firstReader = makeReader();
    const [claudeMd, settings] = await computeSuggestedUpdates(
      PROFILES['claude-code'],
      firstReader,
    );
    // Simulate the apply happening — second reader returns the applied content.
    const secondReader = makeReader({
      'CLAUDE.md': claudeMd.nextContent,
      '.claude/settings.json': settings.nextContent,
    });
    const second = await computeSuggestedUpdates(PROFILES['claude-code'], secondReader);
    assert.equal(second[0].action, 'noop');
    assert.equal(second[1].action, 'noop');
  });

  it('sets action=append-block + no warning when CLAUDE.md exists without our block', async () => {
    const reader = makeReader({
      'CLAUDE.md': '# Existing project rules\n\nDo not commit secrets.\n',
    });
    const [claudeMd] = await computeSuggestedUpdates(PROFILES['claude-code'], reader);
    assert.equal(claudeMd.action, 'append-block');
    assert.equal(claudeMd.warning, undefined);
    assert.ok(claudeMd.nextContent.startsWith('# Existing project rules'));
  });

  it('sets action=replace-block + warning when CLAUDE.md was hand-edited inside the block', async () => {
    // Build a "previous version" of the managed block, then mutate the body.
    const handEdited =
      '# top-of-file\n\n' +
      buildManagedBlock('A previously-applied body that the user edited.', 'md') +
      '\n';
    const reader = makeReader({ 'CLAUDE.md': handEdited });
    const [claudeMd] = await computeSuggestedUpdates(PROFILES['claude-code'], reader);
    assert.equal(claudeMd.action, 'replace-block');
    assert.equal(
      claudeMd.warning,
      'Existing managed block was hand-edited; Apply will overwrite your changes.',
    );
  });

  it('preserves other JSON keys when .claude/settings.json already has unrelated config', async () => {
    const existingJson = JSON.stringify({ theme: 'dark', otherSetting: { nested: true } }, null, 2);
    const reader = makeReader({ '.claude/settings.json': existingJson });
    const [, settings] = await computeSuggestedUpdates(PROFILES['claude-code'], reader);
    assert.equal(settings.action, 'append-block');
    const parsed = JSON.parse(settings.nextContent);
    assert.equal(parsed.theme, 'dark');
    assert.deepEqual(parsed.otherSetting, { nested: true });
    assert.ok(parsed[SENTINEL_KEY_JSON]);
  });

  it('returns noop + error when .claude/settings.json is broken JSON', async () => {
    const reader = makeReader({ '.claude/settings.json': '{ broken' });
    const [, settings] = await computeSuggestedUpdates(PROFILES['claude-code'], reader);
    assert.equal(settings.action, 'noop');
    assert.equal(settings.nextContent, '{ broken', 'file content must not be modified');
    assert.ok(settings.error);
    assert.match(settings.error, /JSON/);
  });
});

describe('computeSuggestedUpdates — Codex profile', () => {
  it('returns exactly one update for AGENTS.md', async () => {
    const updates = await computeSuggestedUpdates(PROFILES.codex, makeReader());
    assert.equal(updates.length, 1);
    assert.equal(updates[0].file, 'AGENTS.md');
  });

  it('AGENTS.md body mentions the Codex -o flag', async () => {
    const [agents] = await computeSuggestedUpdates(PROFILES.codex, makeReader());
    assert.ok(agents.nextContent.includes('codex exec'));
    assert.ok(agents.nextContent.includes('-o'));
  });

  it('action=replace-block + warning on hand-edited AGENTS.md', async () => {
    const handEdited = buildManagedBlock('User-edited Codex coordination notes.', 'md');
    const reader = makeReader({ 'AGENTS.md': handEdited });
    const [agents] = await computeSuggestedUpdates(PROFILES.codex, reader);
    assert.equal(agents.action, 'replace-block');
    assert.ok(agents.warning);
  });
});

describe('frozen body content sanity', () => {
  it('CLAUDE_MD_BODY mentions the brief path + hook reference', () => {
    assert.ok(CLAUDE_MD_BODY.includes('.deliveryos-handoff/current-execution-brief.md'));
    assert.ok(CLAUDE_MD_BODY.includes('result.md'));
    assert.ok(CLAUDE_MD_BODY.includes('.claude/settings.json'));
  });

  it('AGENTS_MD_BODY mentions the LF standard reference', () => {
    assert.ok(AGENTS_MD_BODY.includes('Linux Foundation'));
  });

  it('CLAUDE_SETTINGS_STUB has the four required keys', () => {
    assert.equal(CLAUDE_SETTINGS_STUB.version, 1);
    assert.equal(CLAUDE_SETTINGS_STUB.begin, 'DELIVERYOS:BEGIN');
    assert.equal(CLAUDE_SETTINGS_STUB.end, 'DELIVERYOS:END');
    assert.equal(CLAUDE_SETTINGS_STUB.hooks, null);
  });

  it('CLAUDE_SETTINGS_STUB serialises into a valid JSON body for the applier', () => {
    const body = JSON.stringify(CLAUDE_SETTINGS_STUB, null, 2);
    const plan = applyManagedBlock(null, body, 'json');
    assert.equal(plan.action, 'create');
  });
});
