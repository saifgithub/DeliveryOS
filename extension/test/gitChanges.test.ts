// CHUNK-12 — unit + integration tests for result/gitChanges.ts
// Uses real git init in a tmp dir. Node:test + node:assert/strict.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { probeGitChanges } from '../src/result/gitChanges';

function makeTmp(): string {
  return mkdtempSync(join(tmpdir(), 'deliveryos-git-test-'));
}

function cleanup(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
}

describe('gitChanges — probeGitChanges', () => {
  it('non-git directory → { gitAvailable: false, fromGit: [], fromHarness: [] }, no throw', async () => {
    const tmp = makeTmp();
    try {
      let result;
      assert.doesNotReject(async () => {
        result = await probeGitChanges(tmp);
      });
      result = await probeGitChanges(tmp);
      assert.equal(result.gitAvailable, false);
      assert.deepEqual(result.fromGit, []);
      assert.deepEqual(result.fromHarness, []);
    } finally {
      cleanup(tmp);
    }
  });

  it('clean git repo → fromGit: [], gitAvailable: true', async () => {
    const tmp = makeTmp();
    try {
      execFileSync('git', ['init', '-b', 'main'], { cwd: tmp });
      execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tmp });
      execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmp });
      // Create an initial commit so HEAD exists.
      writeFileSync(join(tmp, 'README.md'), '# Test\n');
      execFileSync('git', ['add', 'README.md'], { cwd: tmp });
      execFileSync('git', ['commit', '-m', 'init'], { cwd: tmp });

      const result = await probeGitChanges(tmp);
      assert.equal(result.gitAvailable, true);
      assert.deepEqual(result.fromGit, []);
    } finally {
      cleanup(tmp);
    }
  });

  it('modified tracked file → appears in fromGit with status: modified', async () => {
    const tmp = makeTmp();
    try {
      execFileSync('git', ['init', '-b', 'main'], { cwd: tmp });
      execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tmp });
      execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmp });
      writeFileSync(join(tmp, 'file.ts'), 'const x = 1;\n');
      execFileSync('git', ['add', 'file.ts'], { cwd: tmp });
      execFileSync('git', ['commit', '-m', 'init'], { cwd: tmp });
      // Modify the file.
      writeFileSync(join(tmp, 'file.ts'), 'const x = 2;\n');

      const result = await probeGitChanges(tmp);
      assert.equal(result.gitAvailable, true);
      const found = result.fromGit.find((f) => f.path === 'file.ts');
      assert.ok(found, 'file.ts should be in fromGit');
      assert.equal(found.status, 'modified');
    } finally {
      cleanup(tmp);
    }
  });

  it('new untracked file → appears in fromGit with status: untracked', async () => {
    const tmp = makeTmp();
    try {
      execFileSync('git', ['init', '-b', 'main'], { cwd: tmp });
      execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tmp });
      execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmp });
      writeFileSync(join(tmp, 'existing.ts'), 'const a = 1;\n');
      execFileSync('git', ['add', 'existing.ts'], { cwd: tmp });
      execFileSync('git', ['commit', '-m', 'init'], { cwd: tmp });
      // Add a new untracked file.
      writeFileSync(join(tmp, 'newfile.ts'), 'const b = 2;\n');

      const result = await probeGitChanges(tmp);
      assert.equal(result.gitAvailable, true);
      const found = result.fromGit.find((f) => f.path === 'newfile.ts');
      assert.ok(found, 'newfile.ts should be in fromGit');
      assert.equal(found.status, 'untracked');
    } finally {
      cleanup(tmp);
    }
  });
});
