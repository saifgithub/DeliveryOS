// CHUNK-11 § paths.ts — unit tests for path constants, URI factories,
// and the YYYYMMDDTHHmmssZ timestamp format.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import {
  CURRENT_CONTEXT_PACKAGE,
  CURRENT_EXECUTION_BRIEF,
  CURRENT_TEST_SPECIFICATION,
  CURRENT_VERIFICATION_CHECKLIST,
  HANDOFF_DIR,
  HANDOFF_HISTORY_DIR,
  HISTORY_GITKEEP,
  MEMORY_SUMMARY,
  RESULT,
  currentContextPackageUri,
  currentExecutionBriefUri,
  currentTestSpecificationUri,
  currentVerificationChecklistUri,
  handoffDirUri,
  historyBriefUri,
  historyDirUri,
  historyGitkeepUri,
  historyResultUri,
  historyTimestamp,
  memorySummaryUri,
  parseHistoryTimestamp,
  resultRelativePattern,
  resultUri,
} from '../src/handoff/paths';

function makeWorkspace(path = '/wk'): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file(path),
    name: 'fixture',
    index: 0,
  };
}

describe('handoff/paths — string constants', () => {
  it('HANDOFF_DIR is the dotfile form (spec finding #6)', () => {
    assert.equal(HANDOFF_DIR, '.deliveryos-handoff');
  });

  it('all CURRENT_* paths are rooted in HANDOFF_DIR', () => {
    for (const p of [
      CURRENT_EXECUTION_BRIEF,
      CURRENT_CONTEXT_PACKAGE,
      CURRENT_TEST_SPECIFICATION,
      CURRENT_VERIFICATION_CHECKLIST,
      MEMORY_SUMMARY,
      RESULT,
    ]) {
      assert.ok(p.startsWith(`${HANDOFF_DIR}/`), `${p} should start with ${HANDOFF_DIR}/`);
    }
  });

  it('HANDOFF_HISTORY_DIR + HISTORY_GITKEEP are nested under HANDOFF_DIR', () => {
    assert.equal(HANDOFF_HISTORY_DIR, `${HANDOFF_DIR}/history`);
    assert.equal(HISTORY_GITKEEP, `${HANDOFF_HISTORY_DIR}/.gitkeep`);
  });
});

describe('handoff/paths — URI factories', () => {
  const ws = makeWorkspace('/wk');

  it('handoffDirUri joins the workspace folder with HANDOFF_DIR', () => {
    assert.equal(handoffDirUri(ws).fsPath, `/wk/${HANDOFF_DIR}`);
  });

  it('historyDirUri joins with HANDOFF_HISTORY_DIR', () => {
    assert.equal(historyDirUri(ws).fsPath, `/wk/${HANDOFF_HISTORY_DIR}`);
  });

  it('current-* factories return the matching constants under the workspace', () => {
    assert.equal(currentExecutionBriefUri(ws).fsPath, `/wk/${CURRENT_EXECUTION_BRIEF}`);
    assert.equal(currentContextPackageUri(ws).fsPath, `/wk/${CURRENT_CONTEXT_PACKAGE}`);
    assert.equal(currentTestSpecificationUri(ws).fsPath, `/wk/${CURRENT_TEST_SPECIFICATION}`);
    assert.equal(
      currentVerificationChecklistUri(ws).fsPath,
      `/wk/${CURRENT_VERIFICATION_CHECKLIST}`,
    );
    assert.equal(memorySummaryUri(ws).fsPath, `/wk/${MEMORY_SUMMARY}`);
    assert.equal(resultUri(ws).fsPath, `/wk/${RESULT}`);
    assert.equal(historyGitkeepUri(ws).fsPath, `/wk/${HISTORY_GITKEEP}`);
  });

  it('history brief + result URIs include the timestamp', () => {
    const ts = '20260720T143022Z';
    assert.equal(
      historyBriefUri(ws, ts).fsPath,
      `/wk/${HANDOFF_HISTORY_DIR}/${ts}-execution-brief.md`,
    );
    assert.equal(
      historyResultUri(ws, ts).fsPath,
      `/wk/${HANDOFF_HISTORY_DIR}/${ts}-result.md`,
    );
  });

  it('resultRelativePattern is rooted at the workspace folder', () => {
    const pattern = resultRelativePattern(ws);
    assert.equal((pattern as unknown as { pattern: string }).pattern, RESULT);
  });
});

describe('handoff/paths — historyTimestamp', () => {
  it('returns YYYYMMDDTHHmmssZ with no separators', () => {
    const d = new Date(Date.UTC(2026, 6, 20, 14, 30, 22)); // 2026-07-20 14:30:22 UTC
    assert.equal(historyTimestamp(d), '20260720T143022Z');
  });

  it('pads single-digit fields to two zeros', () => {
    const d = new Date(Date.UTC(2026, 0, 5, 3, 4, 9)); // 2026-01-05 03:04:09 UTC
    assert.equal(historyTimestamp(d), '20260105T030409Z');
  });

  it('output is filesystem-safe on Windows (no colons)', () => {
    const ts = historyTimestamp(new Date());
    assert.ok(!ts.includes(':'), 'timestamp must not contain ":"');
    assert.ok(!ts.includes('-'), 'timestamp must not contain "-" (basic form)');
    assert.ok(!ts.includes(' '), 'timestamp must not contain spaces');
  });

  it('lexical sort matches chronological order', () => {
    const earlier = historyTimestamp(new Date(Date.UTC(2026, 0, 1, 0, 0, 0)));
    const later = historyTimestamp(new Date(Date.UTC(2026, 11, 31, 23, 59, 59)));
    assert.ok(earlier < later, 'lexical sort should preserve chronology');
  });

  it('round-trips via parseHistoryTimestamp', () => {
    const original = new Date(Date.UTC(2026, 6, 20, 14, 30, 22));
    const ts = historyTimestamp(original);
    const parsed = parseHistoryTimestamp(ts);
    assert.ok(parsed instanceof Date);
    assert.equal(parsed.toISOString(), original.toISOString());
  });

  it('parseHistoryTimestamp returns null for malformed input', () => {
    assert.equal(parseHistoryTimestamp(''), null);
    assert.equal(parseHistoryTimestamp('2026-07-20T14:30:22Z'), null); // extended form not accepted
    assert.equal(parseHistoryTimestamp('20260720T143022'), null); // missing Z
    assert.equal(parseHistoryTimestamp('not-a-timestamp'), null);
  });
});
