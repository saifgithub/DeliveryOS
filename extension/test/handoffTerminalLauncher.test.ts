// CHUNK-11 § terminalLauncher.ts — unit tests for pure command-building.
// The VS Code surface (createTerminal/sendText/show/onDidCloseTerminal)
// is exercised by the manual smoke (spec § 8); this file covers the two
// pure helpers buildCommand + shellQuote.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { buildCommand, shellQuote } from '../src/handoff/terminalLauncher';
import { PROFILE_LIST, getProfile } from '../src/profiles';

function makeWorkspace(path = '/wk'): vscode.WorkspaceFolder {
  return { uri: vscode.Uri.file(path), name: 'fixture', index: 0 };
}

describe('handoff/terminalLauncher — shellQuote', () => {
  it('leaves safe paths unquoted for readability', () => {
    assert.equal(shellQuote('/Users/dev/repo/.deliveryos-handoff/result.md'), '/Users/dev/repo/.deliveryos-handoff/result.md');
    assert.equal(shellQuote('current-execution-brief.md'), 'current-execution-brief.md');
  });

  it('wraps paths containing spaces in single quotes', () => {
    assert.equal(shellQuote('/Users/dev/My Project/result.md'), "'/Users/dev/My Project/result.md'");
  });

  it("escapes embedded single quotes with the POSIX '\\'' trick", () => {
    assert.equal(shellQuote("o'reilly"), "'o'\\''reilly'");
  });

  it('round-trips through `echo` (visual contract): escaped string would echo back to the original', () => {
    // We do not actually shell out, but we verify the POSIX pattern:
    //   echo 'o'\''reilly'   →  o'reilly
    const escaped = shellQuote("a'b");
    assert.equal(escaped, "'a'\\''b'");
  });
});

describe('handoff/terminalLauncher — buildCommand (Claude Code)', () => {
  const profile = getProfile('claude-code');
  const ws = makeWorkspace('/wk');

  it('substitutes ${BRIEF_PATH} and ${RESULT_PATH} from the canonical handoff dir', () => {
    const cmd = buildCommand(profile, ws);
    assert.ok(cmd.startsWith('claude --add-dir . '));
    assert.ok(
      cmd.includes('/wk/.deliveryos-handoff/current-execution-brief.md'),
      'should contain absolute brief path',
    );
    assert.ok(
      cmd.includes('/wk/.deliveryos-handoff/result.md'),
      'should contain absolute result path',
    );
    assert.ok(
      !cmd.includes('${BRIEF_PATH}'),
      '${BRIEF_PATH} placeholder must be substituted',
    );
    assert.ok(
      !cmd.includes('${RESULT_PATH}'),
      '${RESULT_PATH} placeholder must be substituted',
    );
  });

  it('quotes paths that contain spaces', () => {
    const spaceWs = makeWorkspace('/Users/dev/My Repo');
    const cmd = buildCommand(profile, spaceWs);
    assert.ok(
      cmd.includes("'/Users/dev/My Repo/.deliveryos-handoff/current-execution-brief.md'"),
    );
    assert.ok(
      cmd.includes("'/Users/dev/My Repo/.deliveryos-handoff/result.md'"),
    );
  });
});

describe('handoff/terminalLauncher — buildCommand (Codex)', () => {
  const profile = getProfile('codex');
  const ws = makeWorkspace('/wk');

  it('produces the codex exec -o ... shape', () => {
    const cmd = buildCommand(profile, ws);
    assert.ok(cmd.startsWith('codex exec -o '));
    assert.ok(cmd.includes('/wk/.deliveryos-handoff/result.md'));
    assert.ok(cmd.includes('/wk/.deliveryos-handoff/current-execution-brief.md'));
    assert.ok(!cmd.includes('${BRIEF_PATH}'));
    assert.ok(!cmd.includes('${RESULT_PATH}'));
  });
});

describe('handoff/terminalLauncher — buildCommand (all profiles)', () => {
  for (const profile of PROFILE_LIST) {
    it(`leaves no unsubstituted placeholders for ${profile.name}`, () => {
      const cmd = buildCommand(profile, makeWorkspace('/wk'));
      assert.ok(!/\$\{BRIEF_PATH\}/.test(cmd), `${profile.name}: $\{BRIEF_PATH} not substituted`);
      assert.ok(!/\$\{RESULT_PATH\}/.test(cmd), `${profile.name}: $\{RESULT_PATH} not substituted`);
      assert.ok(!/\$\{WORKSPACE\}/.test(cmd), `${profile.name}: $\{WORKSPACE} not substituted`);
    });
  }
});
