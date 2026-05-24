// CHUNK-11 § .gitignore template — unit tests for the build/read/apply
// flow. Logic delegates to CHUNK-10's `applyManagedBlock`; these tests
// focus on the wrapper behaviour: read-or-absent, plan classification,
// idempotency on re-apply, hand-edit detection, atomic write.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { __resetVscodeStub } from './vscode-stub';
import {
  applyGitignoreBlock,
  buildGitignoreBlock,
  gitignoreState,
} from '../src/handoff/gitignoreTemplate';
import {
  BEGIN_MARKER_GITIGNORE,
  END_MARKER_GITIGNORE,
} from '../src/profiles';

function makeWorkspace(path = '/wk'): vscode.WorkspaceFolder {
  return { uri: vscode.Uri.file(path), name: 'fixture', index: 0 };
}

function gitignoreUri(ws: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(ws.uri, '.gitignore');
}

async function readGitignore(ws: vscode.WorkspaceFolder): Promise<string | null> {
  try {
    const bytes = await vscode.workspace.fs.readFile(gitignoreUri(ws));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

async function writeGitignore(ws: vscode.WorkspaceFolder, content: string): Promise<void> {
  await vscode.workspace.fs.writeFile(gitignoreUri(ws), new TextEncoder().encode(content));
}

beforeEach(() => __resetVscodeStub());

describe('handoff/gitignoreTemplate — buildGitignoreBlock', () => {
  it('is deterministic', () => {
    assert.equal(buildGitignoreBlock(), buildGitignoreBlock());
  });

  it('contains the canonical 5 ignore rules + 2 unignore rules', () => {
    const body = buildGitignoreBlock();
    assert.ok(body.includes('.deliveryos-handoff/current-*.md'));
    assert.ok(body.includes('.deliveryos-handoff/memory-summary.md'));
    assert.ok(body.includes('.deliveryos-handoff/result.md'));
    assert.ok(body.includes('!.deliveryos-handoff/history/'));
    assert.ok(body.includes('!.deliveryos-handoff/history/**'));
  });
});

describe('handoff/gitignoreTemplate — gitignoreState', () => {
  it('returns absent + plan=create when .gitignore is missing', async () => {
    const ws = makeWorkspace();
    const state = await gitignoreState(ws);
    assert.equal(state.kind, 'absent');
    assert.equal(state.plannedAction, 'create');
    assert.equal(state.existing, null);
  });

  it('returns absent + plan=append-block when .gitignore exists without our marker', async () => {
    const ws = makeWorkspace();
    await writeGitignore(ws, 'node_modules/\n');
    const state = await gitignoreState(ws);
    assert.equal(state.kind, 'absent');
    assert.equal(state.plannedAction, 'append-block');
    assert.equal(state.existing, 'node_modules/\n');
  });

  it('returns present-matching after a successful apply (idempotent)', async () => {
    const ws = makeWorkspace();
    await applyGitignoreBlock(ws);
    const state = await gitignoreState(ws);
    assert.equal(state.kind, 'present-matching');
    assert.equal(state.plannedAction, 'noop');
  });

  it('returns present-differs when the block has been hand-edited', async () => {
    const ws = makeWorkspace();
    await applyGitignoreBlock(ws);
    const current = (await readGitignore(ws))!;
    const tampered = current.replace('.deliveryos-handoff/result.md', '.deliveryos-handoff/RESULT.MD');
    await writeGitignore(ws, tampered);
    const state = await gitignoreState(ws);
    assert.equal(state.kind, 'present-differs');
    assert.equal(state.plannedAction, 'replace-block');
  });
});

describe('handoff/gitignoreTemplate — applyGitignoreBlock', () => {
  it('creates a fresh .gitignore when absent', async () => {
    const ws = makeWorkspace();
    const plan = await applyGitignoreBlock(ws);
    assert.equal(plan.action, 'create');
    const content = (await readGitignore(ws))!;
    assert.ok(content.includes(BEGIN_MARKER_GITIGNORE));
    assert.ok(content.includes(END_MARKER_GITIGNORE));
    assert.ok(content.includes('.deliveryos-handoff/result.md'));
  });

  it('appends the block when .gitignore exists without it', async () => {
    const ws = makeWorkspace();
    await writeGitignore(ws, 'node_modules/\ndist/\n');
    const plan = await applyGitignoreBlock(ws);
    assert.equal(plan.action, 'append-block');
    const content = (await readGitignore(ws))!;
    assert.ok(content.startsWith('node_modules/\ndist/\n'), 'pre-existing rules preserved');
    assert.ok(content.includes(BEGIN_MARKER_GITIGNORE), 'managed block appended');
  });

  it('is idempotent: re-apply on a matching file is a no-op', async () => {
    const ws = makeWorkspace();
    await applyGitignoreBlock(ws);
    const after1 = (await readGitignore(ws))!;
    const plan2 = await applyGitignoreBlock(ws);
    const after2 = (await readGitignore(ws))!;
    assert.equal(plan2.action, 'noop');
    assert.equal(after2, after1);
  });

  it('replaces the block when hand-edited (surfaces as replace-block plan)', async () => {
    const ws = makeWorkspace();
    await applyGitignoreBlock(ws);
    const current = (await readGitignore(ws))!;
    const tampered = current.replace('.deliveryos-handoff/result.md', '.deliveryos-handoff/RESULT.MD');
    await writeGitignore(ws, tampered);
    const plan = await applyGitignoreBlock(ws);
    assert.equal(plan.action, 'replace-block');
    const after = (await readGitignore(ws))!;
    assert.ok(after.includes('.deliveryos-handoff/result.md'));
    assert.ok(!after.includes('.deliveryos-handoff/RESULT.MD'));
  });

  it('preserves content outside the managed block on replace', async () => {
    const ws = makeWorkspace();
    await writeGitignore(ws, 'node_modules/\n\n');
    await applyGitignoreBlock(ws);
    const current = (await readGitignore(ws))!;
    // Tamper inside the block.
    const tampered = current.replace('.deliveryos-handoff/result.md', '.deliveryos-handoff/RESULT.MD');
    await writeGitignore(ws, tampered);
    const plan = await applyGitignoreBlock(ws);
    assert.equal(plan.action, 'replace-block');
    const after = (await readGitignore(ws))!;
    assert.ok(after.startsWith('node_modules/\n'), 'outside-block content preserved');
  });
});
