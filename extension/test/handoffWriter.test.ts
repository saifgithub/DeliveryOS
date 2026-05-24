// CHUNK-11 § writer.ts — unit tests for HandoffWriter against the in-memory
// vscode shim. Verifies all 5 current-* files land, history snapshot
// byte-matches, .gitkeep is created once, atomic-write tmp file is not left
// behind, and history timestamp shape is correct.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { __resetVscodeStub } from './vscode-stub';
import { HandoffWriter } from '../src/handoff/writer';
import {
  CURRENT_CONTEXT_PACKAGE,
  CURRENT_EXECUTION_BRIEF,
  CURRENT_TEST_SPECIFICATION,
  CURRENT_VERIFICATION_CHECKLIST,
  HANDOFF_DIR,
  HANDOFF_HISTORY_DIR,
  HISTORY_GITKEEP,
  MEMORY_SUMMARY,
} from '../src/handoff/paths';
import type { HandoffSnapshot } from '@deliveryos/contracts';

function makeWorkspace(path = '/wk'): vscode.WorkspaceFolder {
  return { uri: vscode.Uri.file(path), name: 'fixture', index: 0 };
}

function makeSnapshot(overrides: Partial<HandoffSnapshot> = {}): HandoffSnapshot {
  return {
    executionBriefMd: '# Execution brief\n\n…body…\n',
    contextPackageMd: '# Context package\n\n…\n',
    testSpecificationMd: '# Test specification\n\n…\n',
    verificationChecklistMd: '# Verification checklist\n\n- [ ] thing\n',
    memorySummaryMd: '# Memory summary\n\n…\n',
    briefId: 'brief_fixture',
    projectId: 'prj_fixture',
    ...overrides,
  };
}

async function readFile(uri: vscode.Uri): Promise<string> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  return new TextDecoder().decode(bytes);
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

beforeEach(() => __resetVscodeStub());

describe('handoff/writer — HandoffWriter.write', () => {
  it('creates all 5 current-* files at the canonical paths', async () => {
    const ws = makeWorkspace();
    const writer = new HandoffWriter(ws);
    const snapshot = makeSnapshot();

    await writer.write(snapshot);

    const checks: Array<[string, string]> = [
      [CURRENT_EXECUTION_BRIEF, snapshot.executionBriefMd],
      [CURRENT_CONTEXT_PACKAGE, snapshot.contextPackageMd],
      [CURRENT_TEST_SPECIFICATION, snapshot.testSpecificationMd],
      [CURRENT_VERIFICATION_CHECKLIST, snapshot.verificationChecklistMd],
      [MEMORY_SUMMARY, snapshot.memorySummaryMd],
    ];
    for (const [rel, expected] of checks) {
      const uri = vscode.Uri.joinPath(ws.uri, rel);
      assert.ok(await fileExists(uri), `expected ${rel} to exist`);
      assert.equal(await readFile(uri), expected, `${rel} content mismatch`);
    }
  });

  it('writes a history snapshot whose bytes match the current brief', async () => {
    const ws = makeWorkspace();
    const writer = new HandoffWriter(ws);
    const snapshot = makeSnapshot();

    const result = await writer.write(snapshot);

    assert.ok(/^\d{8}T\d{6}Z$/.test(result.timestamp), 'timestamp shape');
    const historyContent = await readFile(result.briefHistoryUri);
    const currentContent = await readFile(
      vscode.Uri.joinPath(ws.uri, CURRENT_EXECUTION_BRIEF),
    );
    assert.equal(historyContent, currentContent, 'history snapshot must byte-match current brief');
    assert.equal(historyContent, snapshot.executionBriefMd);
  });

  it('writes history/.gitkeep on first run and leaves it alone on subsequent runs', async () => {
    const ws = makeWorkspace();
    const writer = new HandoffWriter(ws);
    await writer.write(makeSnapshot());
    const gitkeepUri = vscode.Uri.joinPath(ws.uri, HISTORY_GITKEEP);
    assert.ok(await fileExists(gitkeepUri), '.gitkeep should exist after first write');

    // Tamper the .gitkeep to confirm writer does not overwrite it.
    await vscode.workspace.fs.writeFile(gitkeepUri, new TextEncoder().encode('sentinel'));
    await writer.write(makeSnapshot());
    assert.equal(await readFile(gitkeepUri), 'sentinel', '.gitkeep should not be re-written');
  });

  it('does not leave behind the .deliveryos.tmp atomic-write file', async () => {
    const ws = makeWorkspace();
    const writer = new HandoffWriter(ws);
    await writer.write(makeSnapshot());
    const tmpUri = vscode.Uri.joinPath(ws.uri, `${CURRENT_EXECUTION_BRIEF}.deliveryos.tmp`);
    assert.equal(
      await fileExists(tmpUri),
      false,
      'atomic-write tmp file must be renamed, not left behind',
    );
  });

  it('does NOT create result.md upfront', async () => {
    const ws = makeWorkspace();
    const writer = new HandoffWriter(ws);
    await writer.write(makeSnapshot());
    const resultPath = vscode.Uri.joinPath(ws.uri, `${HANDOFF_DIR}/result.md`);
    assert.equal(
      await fileExists(resultPath),
      false,
      'result.md must be written by the harness, not the writer',
    );
  });

  it('subsequent writes overwrite current-* and refresh history snapshot', async () => {
    const ws = makeWorkspace();
    const writer = new HandoffWriter(ws);
    await writer.write(makeSnapshot({ executionBriefMd: 'first version' }));
    const second = await writer.write(makeSnapshot({ executionBriefMd: 'second version' }));

    const currentBrief = await readFile(vscode.Uri.joinPath(ws.uri, CURRENT_EXECUTION_BRIEF));
    assert.equal(currentBrief, 'second version', 'current-* overwritten by second write');

    // Second history snapshot reflects second write. (If both writes land in
    // the same UTC second the timestamps collide and the second overwrites
    // the first — acceptable per spec § timestamp format.)
    const secondHistory = await readFile(second.briefHistoryUri);
    assert.equal(secondHistory, 'second version');
  });

  it('creates HANDOFF_DIR + history/ directories idempotently', async () => {
    const ws = makeWorkspace();
    const writer = new HandoffWriter(ws);
    // First run creates them.
    await writer.write(makeSnapshot());
    // Second run must not throw on the existing directory.
    await writer.write(makeSnapshot());
    const dirUri = vscode.Uri.joinPath(ws.uri, HANDOFF_DIR);
    const histUri = vscode.Uri.joinPath(ws.uri, HANDOFF_HISTORY_DIR);
    assert.ok(await fileExists(dirUri));
    assert.ok(await fileExists(histUri));
  });
});
