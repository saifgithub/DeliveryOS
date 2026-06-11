// DOS:P10 § reverse path (code → docs) — unit tests covering the four pure /
// near-pure seams: the analysis-brief builder (drift guard vs parsePrdMarkdown),
// the reverse command builder (placeholder substitution), the prd.md watcher
// (debounce + SHA dedup), and capture-into-store (parse + upsertPrdParent).

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { __resetVscodeStub } from './vscode-stub';
import { PRD_SECTION_IDS } from '@deliveryos/contracts';
import { PRD_SECTION_DEFINITIONS } from '../src/prd/sectionSchema';
import { parsePrdMarkdown } from '../src/prd/sectionSchema';
import { buildReverseAnalysisBrief } from '../src/reverse/analysisPromptBuilder';
import { buildReverseCommand } from '../src/reverse/reverseLauncher';
import {
  REVERSE_DEBOUNCE_MS,
  ReverseWatcher,
  type ReversePrdEvent,
} from '../src/reverse/reverseWatcher';
import { REVERSE_PRD } from '../src/reverse/paths';
import { captureReversePrd } from '../src/reverse/reverseCapture';
import { MemoryStore } from '../src/memory/MemoryStore';
import { InMemoryProjectRegistry, intentToRecord } from '../src/projectRegistry';
import { getProfile, PROFILE_LIST } from '../src/profiles';

function makeWorkspace(p = '/wk'): vscode.WorkspaceFolder {
  return { uri: vscode.Uri.file(p), name: 'fixture', index: 0 };
}

// --- analysis-brief builder ------------------------------------------------

describe('reverse/analysisPromptBuilder — buildReverseAnalysisBrief', () => {
  const brief = buildReverseAnalysisBrief({
    projectTitle: 'DeliveryOS',
    workspacePath: '/Users/dev/DeliveryOS',
    outputPath: REVERSE_PRD,
  });

  it('interpolates project title, workspace path, and output path', () => {
    assert.match(brief, /DeliveryOS/);
    assert.match(brief, /\/Users\/dev\/DeliveryOS/);
    assert.ok(brief.includes(REVERSE_PRD), 'brief must tell the agent where to write the PRD');
  });

  it('lists every PRD section title (so the prompt cannot drift from the parser)', () => {
    for (const id of PRD_SECTION_IDS) {
      assert.ok(
        brief.includes(PRD_SECTION_DEFINITIONS[id].title),
        `brief should mention the "${PRD_SECTION_DEFINITIONS[id].title}" section`,
      );
    }
  });

  it('round-trips: a PRD authored to the prompt’s section headings parses to all 8', () => {
    const authored = [
      '# DeliveryOS',
      ...PRD_SECTION_IDS.map(
        (id) => `\n## ${PRD_SECTION_DEFINITIONS[id].title}\nbody for ${id}`,
      ),
    ].join('\n');
    const { report } = parsePrdMarkdown(authored, 'DeliveryOS');
    assert.equal(report.sectionsFound.length, 8);
    assert.equal(report.sectionsMissing.length, 0);
    assert.equal(report.unmatchedHeadings.length, 0);
  });
});

// --- reverse command builder ----------------------------------------------

describe('reverse/reverseLauncher — buildReverseCommand', () => {
  it('substitutes the reverse brief + prd paths for Claude Code', () => {
    const cmd = buildReverseCommand(getProfile('claude-code'), makeWorkspace('/wk'));
    assert.ok(cmd.startsWith('claude --add-dir . '));
    assert.ok(cmd.includes('/wk/.deliveryos-reverse/analysis-brief.md'), 'brief path');
    assert.ok(cmd.includes('/wk/.deliveryos-reverse/prd.md'), 'prd output path');
    assert.ok(!cmd.includes('${BRIEF_PATH}'));
    assert.ok(!cmd.includes('${RESULT_PATH}'));
  });

  it('quotes paths containing spaces', () => {
    const cmd = buildReverseCommand(getProfile('claude-code'), makeWorkspace('/Users/dev/My Repo'));
    assert.ok(cmd.includes("'/Users/dev/My Repo/.deliveryos-reverse/analysis-brief.md'"));
    assert.ok(cmd.includes("'/Users/dev/My Repo/.deliveryos-reverse/prd.md'"));
  });

  it('leaves no unsubstituted placeholders for any profile', () => {
    for (const profile of PROFILE_LIST) {
      const cmd = buildReverseCommand(profile, makeWorkspace('/wk'));
      assert.ok(!/\$\{BRIEF_PATH\}/.test(cmd), `${profile.name}: BRIEF_PATH`);
      assert.ok(!/\$\{RESULT_PATH\}/.test(cmd), `${profile.name}: RESULT_PATH`);
      assert.ok(!/\$\{WORKSPACE\}/.test(cmd), `${profile.name}: WORKSPACE`);
    }
  });
});

// --- prd.md watcher --------------------------------------------------------

describe('reverse/reverseWatcher — debounce + dedup', () => {
  beforeEach(() => __resetVscodeStub());

  function prdUri(ws: vscode.WorkspaceFolder): vscode.Uri {
    return vscode.Uri.joinPath(ws.uri, REVERSE_PRD);
  }
  async function writeFile(uri: vscode.Uri, content: string): Promise<void> {
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
  }
  function collect(w: ReverseWatcher): ReversePrdEvent[] {
    const events: ReversePrdEvent[] = [];
    w.onPrd((e) => events.push(e));
    return events;
  }
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('collapses create+change within the debounce window into one emit', async () => {
    const ws = makeWorkspace();
    await writeFile(prdUri(ws), '# PRD');
    const w = new ReverseWatcher(ws);
    const events = collect(w);
    w.__fireForTest('created');
    w.__fireForTest('changed');
    await sleep(REVERSE_DEBOUNCE_MS + 80);
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, 'created', 'created wins the kind race');
    w.dispose();
  });

  it('dedups identical content and re-emits on changed bytes', async () => {
    const ws = makeWorkspace();
    await writeFile(prdUri(ws), 'same');
    const w = new ReverseWatcher(ws);
    const events = collect(w);
    w.__fireForTest('created');
    await sleep(REVERSE_DEBOUNCE_MS + 80);
    w.__fireForTest('changed'); // identical bytes → deduped
    await sleep(REVERSE_DEBOUNCE_MS + 80);
    assert.equal(events.length, 1);
    await writeFile(prdUri(ws), 'different');
    w.__fireForTest('changed');
    await sleep(REVERSE_DEBOUNCE_MS + 80);
    assert.equal(events.length, 2);
    assert.notEqual(events[0].contentSha256, events[1].contentSha256);
    w.dispose();
  });

  it('stops emitting after dispose', async () => {
    const ws = makeWorkspace();
    await writeFile(prdUri(ws), 'x');
    const w = new ReverseWatcher(ws);
    const events = collect(w);
    w.dispose();
    w.__fireForTest('created');
    await sleep(REVERSE_DEBOUNCE_MS + 80);
    assert.equal(events.length, 0);
  });
});

// --- capture into store ----------------------------------------------------

const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);

describe('reverse/reverseCapture — captureReversePrd', () => {
  beforeEach(() => __resetVscodeStub());

  it('parses the agent PRD and stores it as the project’s PRD parent', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, vscode.Uri.file('/wk'));
    const intent = await store.createIntent('Reverse-engineered from existing codebase', 'AcmeApp');
    const registry = new InMemoryProjectRegistry();
    registry.setActive(intentToRecord(intent));

    const prdMarkdown = [
      '# AcmeApp',
      ...PRD_SECTION_IDS.map((id) => `\n## ${PRD_SECTION_DEFINITIONS[id].title}\ncontent ${id}`),
    ].join('\n');
    const bytes = new TextEncoder().encode(prdMarkdown);

    const result = await captureReversePrd({ contentBytes: bytes, memoryStore: store, registry });
    assert.equal(result.sectionsFound, 8);
    assert.equal(result.sectionsMissing, 0);
    assert.equal(result.projectId, intent.id);

    // The PRD is now loadable via the same convenience the forward flow uses.
    const prd = await store.loadPrdParent(intent.id);
    assert.ok(prd, 'PRD parent should exist after capture');
    assert.equal(prd?.sections.length, 8);
    assert.match(prd?.sections[0].body ?? '', /content problem/);
    registry.dispose();
  });

  it('throws when there is no active project', async () => {
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, vscode.Uri.file('/wk'));
    const registry = new InMemoryProjectRegistry();
    await assert.rejects(
      () => captureReversePrd({ contentBytes: new TextEncoder().encode('# X'), memoryStore: store, registry }),
      /no active project/,
    );
    registry.dispose();
  });
});
