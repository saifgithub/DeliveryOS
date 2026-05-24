// CHUNK-11 § resultWatcher.ts — unit tests for debounce + SHA-256 dedup
// + fallback-to-most-recent-history behaviour. Drives the watcher via the
// __fireForTest hook (mirrors what onDidCreate/onDidChange would trigger).

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { __resetVscodeStub } from './vscode-stub';
import { RESULT_DEBOUNCE_MS, ResultWatcher, type ResultWatchEvent } from '../src/handoff/resultWatcher';
import {
  HANDOFF_DIR,
  HANDOFF_HISTORY_DIR,
} from '../src/handoff/paths';

function makeWorkspace(path = '/wk'): vscode.WorkspaceFolder {
  return { uri: vscode.Uri.file(path), name: 'fixture', index: 0 };
}

function resultUri(ws: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(ws.uri, HANDOFF_DIR, 'result.md');
}

async function writeFile(uri: vscode.Uri, content: string): Promise<void> {
  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

function collect(watcher: ResultWatcher): ResultWatchEvent[] {
  const events: ResultWatchEvent[] = [];
  watcher.onResult((e) => events.push(e));
  return events;
}

beforeEach(() => __resetVscodeStub());

describe('handoff/resultWatcher — debounce', () => {
  it('collapses two create+change events within 250ms into a single emit', async () => {
    const ws = makeWorkspace();
    await writeFile(resultUri(ws), 'hello');
    const watcher = new ResultWatcher(ws);
    const events = collect(watcher);

    watcher.__fireForTest('created');
    watcher.__fireForTest('changed');

    await sleep(RESULT_DEBOUNCE_MS + 80);

    assert.equal(events.length, 1, 'expected exactly one emit after debounce');
    assert.equal(events[0].kind, 'created', 'created should win the kind race');
    watcher.dispose();
  });

  it('two writes outside the debounce window emit twice', async () => {
    const ws = makeWorkspace();
    await writeFile(resultUri(ws), 'first');
    const watcher = new ResultWatcher(ws);
    const events = collect(watcher);

    watcher.__fireForTest('created');
    await sleep(RESULT_DEBOUNCE_MS + 80);
    await writeFile(resultUri(ws), 'second'); // content differs to bypass dedup
    watcher.__fireForTest('changed');
    await sleep(RESULT_DEBOUNCE_MS + 80);

    assert.equal(events.length, 2);
    assert.equal(events[0].kind, 'created');
    assert.equal(events[1].kind, 'changed');
    watcher.dispose();
  });
});

describe('handoff/resultWatcher — content-hash dedup', () => {
  it('suppresses re-emit when content hash matches the last emit', async () => {
    const ws = makeWorkspace();
    await writeFile(resultUri(ws), 'identical content');
    const watcher = new ResultWatcher(ws);
    const events = collect(watcher);

    watcher.__fireForTest('created');
    await sleep(RESULT_DEBOUNCE_MS + 80);
    watcher.__fireForTest('changed'); // same bytes
    await sleep(RESULT_DEBOUNCE_MS + 80);

    assert.equal(events.length, 1, 'second event with identical content must be deduped');
    watcher.dispose();
  });

  it('emits when bytes change', async () => {
    const ws = makeWorkspace();
    await writeFile(resultUri(ws), 'first');
    const watcher = new ResultWatcher(ws);
    const events = collect(watcher);

    watcher.__fireForTest('created');
    await sleep(RESULT_DEBOUNCE_MS + 80);
    await writeFile(resultUri(ws), 'second');
    watcher.__fireForTest('changed');
    await sleep(RESULT_DEBOUNCE_MS + 80);

    assert.equal(events.length, 2);
    assert.notEqual(events[0].contentSha256, events[1].contentSha256);
    watcher.dispose();
  });
});

describe('handoff/resultWatcher — registerExpectedHandoff', () => {
  it('carries the registered brief metadata into the event', async () => {
    const ws = makeWorkspace();
    await writeFile(resultUri(ws), 'payload');
    const watcher = new ResultWatcher(ws);
    const events = collect(watcher);

    const briefHistoryUri = vscode.Uri.joinPath(
      ws.uri,
      HANDOFF_HISTORY_DIR,
      '20260720T143022Z-execution-brief.md',
    );
    watcher.registerExpectedHandoff('20260720T143022Z', briefHistoryUri, 'brief_42');

    watcher.__fireForTest('created');
    await sleep(RESULT_DEBOUNCE_MS + 80);

    assert.equal(events.length, 1);
    assert.equal(events[0].briefId, 'brief_42');
    assert.equal(events[0].handoffTimestamp, '20260720T143022Z');
    assert.equal(events[0].briefHistoryUri.fsPath, briefHistoryUri.fsPath);
    watcher.dispose();
  });

  it('falls back to most-recent history brief by lexical sort when none registered', async () => {
    const ws = makeWorkspace();
    await writeFile(resultUri(ws), 'payload');
    await writeFile(
      vscode.Uri.joinPath(ws.uri, HANDOFF_HISTORY_DIR, '20260101T000000Z-execution-brief.md'),
      'older',
    );
    await writeFile(
      vscode.Uri.joinPath(ws.uri, HANDOFF_HISTORY_DIR, '20260720T143022Z-execution-brief.md'),
      'newer',
    );

    const watcher = new ResultWatcher(ws);
    const events = collect(watcher);

    watcher.__fireForTest('created');
    await sleep(RESULT_DEBOUNCE_MS + 80);

    assert.equal(events.length, 1);
    assert.equal(events[0].handoffTimestamp, '20260720T143022Z');
    assert.ok(events[0].briefHistoryUri.fsPath.endsWith('20260720T143022Z-execution-brief.md'));
    assert.equal(events[0].briefId, '', 'no briefId available on fallback');
    watcher.dispose();
  });
});

describe('handoff/resultWatcher — dispose', () => {
  it('stops emitting after dispose', async () => {
    const ws = makeWorkspace();
    await writeFile(resultUri(ws), 'payload');
    const watcher = new ResultWatcher(ws);
    const events = collect(watcher);
    watcher.dispose();
    watcher.__fireForTest('created');
    await sleep(RESULT_DEBOUNCE_MS + 80);
    assert.equal(events.length, 0);
  });
});
