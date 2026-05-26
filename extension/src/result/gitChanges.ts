// CHUNK-12 § gitChanges.ts — probes the workspace git repository for
// changed files. Uses execFile (NOT exec — no shell injection risk).
// Never throws; returns { gitAvailable: false } on any error.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { FilesChangedList, GitFileChange } from '@deliveryos/contracts';

const execFileP = promisify(execFile);

function normalisePath(p: string): string {
  return p.replace(/\\/g, '/').trim();
}

export async function probeGitChanges(cwd: string): Promise<FilesChangedList> {
  const unavailable: FilesChangedList = {
    gitAvailable: false,
    fromGit: [],
    fromHarness: [],
  };

  try {
    // Check git is available and cwd is a git repo.
    await execFileP('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
  } catch {
    return unavailable;
  }

  try {
    const changes = new Map<string, GitFileChange['status']>();

    // 1. git diff --name-only HEAD — modified/added/deleted tracked files vs HEAD.
    try {
      const { stdout: diffOut } = await execFileP(
        'git',
        ['diff', '--name-only', 'HEAD'],
        { cwd },
      );
      for (const line of diffOut.split('\n')) {
        const p = normalisePath(line);
        if (p) changes.set(p, 'modified');
      }
    } catch {
      // HEAD may not exist yet (empty repo); tolerate.
    }

    // 2. git status --porcelain=v1 -z — catch untracked and staged files.
    try {
      const { stdout: statusOut } = await execFileP(
        'git',
        ['status', '--porcelain=v1', '-z'],
        { cwd },
      );
      // -z uses NUL as delimiter.
      const entries = statusOut.split('\0');
      for (const entry of entries) {
        if (entry.length < 3) continue;
        const xy = entry.slice(0, 2);
        const file = normalisePath(entry.slice(3));
        if (!file) continue;

        if (xy.startsWith('??')) {
          // Untracked.
          if (!changes.has(file)) {
            changes.set(file, 'untracked');
          }
        } else if (xy[0] === 'A' || xy[1] === 'A') {
          if (!changes.has(file)) {
            changes.set(file, 'added');
          }
        } else if (xy[0] === 'D' || xy[1] === 'D') {
          if (!changes.has(file)) {
            changes.set(file, 'deleted');
          }
        } else if (xy[0] === 'M' || xy[1] === 'M') {
          if (!changes.has(file)) {
            changes.set(file, 'modified');
          }
        }
      }
    } catch {
      // tolerate
    }

    // 3. git diff --diff-filter=R --name-status HEAD — detect renames.
    try {
      const { stdout: renameOut } = await execFileP(
        'git',
        ['diff', '--diff-filter=R', '--name-status', 'HEAD'],
        { cwd },
      );
      for (const line of renameOut.split('\n')) {
        const parts = line.split('\t');
        if (parts[0]?.startsWith('R') && parts[2]) {
          const dest = normalisePath(parts[2]);
          if (dest) changes.set(dest, 'renamed');
        }
      }
    } catch {
      // tolerate — renames are nice-to-have
    }

    const fromGit: GitFileChange[] = [];
    for (const [path, status] of changes) {
      fromGit.push({ path, status });
    }

    return {
      gitAvailable: true,
      fromGit,
      fromHarness: [],
    };
  } catch {
    return unavailable;
  }
}
