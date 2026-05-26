// CHUNK-13 § hooks/preToolUseGenerator.ts — generates the Claude Code
// PreToolUse hook scripts and registers them in .claude/settings.json
// via CHUNK-10's applyManagedBlock.

import * as vscode from 'vscode';
import * as fs from 'node:fs';
import { applyManagedBlock } from '../profiles/managedBlock';
import { POSIX_HOOK_SCRIPT, POWERSHELL_HOOK_SCRIPT } from './forbiddenPathsScript';
import type { HookInstallPlan, HookFileOp } from '@deliveryos/contracts';

const HOOKS_DIR = '.claude/hooks';
const SETTINGS_JSON = '.claude/settings.json';
const POSIX_SCRIPT_NAME = 'deliveryos-forbidden-paths.sh';
const POWERSHELL_SCRIPT_NAME = 'deliveryos-forbidden-paths.ps1';

/**
 * Build a HookInstallPlan for the given workspace root.
 * Does NOT write any files — returns the plan for the diff-and-apply UX.
 */
export async function buildHookInstallPlan(
  workspaceRoot: vscode.Uri,
): Promise<HookInstallPlan> {
  const platform = process.platform;

  const fileOps: HookFileOp[] = [];

  // --- POSIX script ---
  const posixRelPath = `${HOOKS_DIR}/${POSIX_SCRIPT_NAME}`;
  const posixAbsPath = vscode.Uri.joinPath(workspaceRoot, posixRelPath);
  const posixExists = await uriExists(posixAbsPath);
  const posixCurrent = posixExists ? await readFileUtf8(posixAbsPath) : null;
  fileOps.push({
    path: posixRelPath,
    exists: posixExists,
    proposedContent: POSIX_HOOK_SCRIPT,
    currentContent: posixCurrent,
    mode: 0o755,
  });

  // --- PowerShell script ---
  const ps1RelPath = `${HOOKS_DIR}/${POWERSHELL_SCRIPT_NAME}`;
  const ps1AbsPath = vscode.Uri.joinPath(workspaceRoot, ps1RelPath);
  const ps1Exists = await uriExists(ps1AbsPath);
  const ps1Current = ps1Exists ? await readFileUtf8(ps1AbsPath) : null;
  fileOps.push({
    path: ps1RelPath,
    exists: ps1Exists,
    proposedContent: POWERSHELL_HOOK_SCRIPT,
    currentContent: ps1Current,
    mode: 0o644,
  });

  // --- .claude/settings.json managed block ---
  const settingsAbsPath = vscode.Uri.joinPath(workspaceRoot, SETTINGS_JSON);
  const settingsExists = await uriExists(settingsAbsPath);
  const settingsContent = settingsExists ? await readFileUtf8(settingsAbsPath) : null;

  const hookCommand = platform === 'win32'
    ? `.claude/hooks/${POWERSHELL_SCRIPT_NAME}`
    : `.claude/hooks/${POSIX_SCRIPT_NAME}`;

  const hookBody = JSON.stringify({
    hooks: {
      PreToolUse: [
        {
          matcher: 'Edit|Write|MultiEdit',
          hooks: [
            {
              type: 'command',
              command: hookCommand,
            },
          ],
        },
      ],
    },
  }, null, 2);

  const settingsJsonPlan = applyManagedBlock(settingsContent, hookBody, 'json');

  return {
    profile: 'claude-code',
    platform,
    fileOps,
    settingsJsonPlan,
  };
}

/**
 * Apply the given HookInstallPlan: write the scripts, chmod the .sh on
 * POSIX, and update .claude/settings.json.
 */
export async function applyHookInstallPlan(
  workspaceRoot: vscode.Uri,
  plan: HookInstallPlan,
): Promise<void> {
  const encoder = new TextEncoder();

  // Ensure .claude/hooks/ exists.
  const hooksDirUri = vscode.Uri.joinPath(workspaceRoot, HOOKS_DIR);
  try {
    await vscode.workspace.fs.createDirectory(hooksDirUri);
  } catch {
    // Directory may already exist — not an error.
  }

  // Write all file ops.
  for (const op of plan.fileOps) {
    const uri = vscode.Uri.joinPath(workspaceRoot, op.path);
    await vscode.workspace.fs.writeFile(uri, encoder.encode(op.proposedContent));
  }

  // chmod +x on the .sh on POSIX.
  if (plan.platform !== 'win32') {
    const shUri = vscode.Uri.joinPath(workspaceRoot, `${HOOKS_DIR}/${POSIX_SCRIPT_NAME}`);
    try {
      fs.chmodSync(shUri.fsPath, 0o755);
    } catch {
      // Best-effort.
    }
  }

  // Write .claude/settings.json if action is not noop.
  if (plan.settingsJsonPlan.action !== 'noop') {
    const settingsUri = vscode.Uri.joinPath(workspaceRoot, SETTINGS_JSON);
    const settingsDir = vscode.Uri.joinPath(workspaceRoot, '.claude');
    try {
      await vscode.workspace.fs.createDirectory(settingsDir);
    } catch {
      // ok
    }
    await vscode.workspace.fs.writeFile(
      settingsUri,
      encoder.encode(plan.settingsJsonPlan.next),
    );
  }
}

// --- Helpers ---------------------------------------------------------------

async function uriExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

async function readFileUtf8(uri: vscode.Uri): Promise<string> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  return new TextDecoder().decode(bytes);
}
