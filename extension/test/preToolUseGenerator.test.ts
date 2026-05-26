// CHUNK-13 — unit tests for the hook installer / generator
// (preToolUseGenerator and forbiddenPathsScript).
// Tests the pure logic that doesn't require vscode APIs.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { POSIX_HOOK_SCRIPT, POWERSHELL_HOOK_SCRIPT } from '../src/hooks/forbiddenPathsScript';
import { applyManagedBlock } from '../src/profiles/managedBlock';

describe('forbiddenPathsScript — POSIX template', () => {
  it('starts with shebang', () => {
    assert.ok(POSIX_HOOK_SCRIPT.startsWith('#!/usr/bin/env bash'));
  });

  it('contains the Forbidden Changes section header grep', () => {
    assert.ok(POSIX_HOOK_SCRIPT.includes('8'));
    assert.ok(POSIX_HOOK_SCRIPT.includes('Forbidden Changes'));
  });

  it('contains exit 0 and exit 2', () => {
    assert.ok(POSIX_HOOK_SCRIPT.includes('exit 0'));
    assert.ok(POSIX_HOOK_SCRIPT.includes('exit 2'));
  });

  it('uses printf not echo for user-derived strings', () => {
    assert.ok(POSIX_HOOK_SCRIPT.includes("printf 'DeliveryOS:"));
  });

  it('skips the (none) sentinel', () => {
    assert.ok(POSIX_HOOK_SCRIPT.includes('"(none)"'));
  });
});

describe('forbiddenPathsScript — PowerShell template', () => {
  it('contains $ErrorActionPreference', () => {
    assert.ok(POWERSHELL_HOOK_SCRIPT.includes("$ErrorActionPreference = 'Stop'"));
  });

  it('contains exit 0 and exit 2', () => {
    assert.ok(POWERSHELL_HOOK_SCRIPT.includes('exit 0'));
    assert.ok(POWERSHELL_HOOK_SCRIPT.includes('exit 2'));
  });

  it('skips the (none) sentinel', () => {
    assert.ok(POWERSHELL_HOOK_SCRIPT.includes("'(none)'"));
  });
});

describe('hook installer — settingsJson managed block plan', () => {
  const hookCommandSh = '.claude/hooks/deliveryos-forbidden-paths.sh';
  const hookCommandPs1 = '.claude/hooks/deliveryos-forbidden-paths.ps1';

  function buildHookBody(command: string): string {
    return JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: 'Edit|Write|MultiEdit',
            hooks: [{ type: 'command', command }],
          },
        ],
      },
    }, null, 2);
  }

  it('first-time install (no existing settings.json) → create action', () => {
    const plan = applyManagedBlock(null, buildHookBody(hookCommandSh), 'json');
    assert.equal(plan.action, 'create');
    const parsed = JSON.parse(plan.next);
    assert.ok('deliveryos.managed' in parsed);
    const managed = parsed['deliveryos.managed'] as Record<string, unknown>;
    assert.ok('hooks' in managed);
  });

  it('update install (existing settings.json with our block) → noop when body equal', () => {
    const body = buildHookBody(hookCommandSh);
    const firstPlan = applyManagedBlock(null, body, 'json');
    // Apply to get the next content, then re-apply with same body → noop
    const secondPlan = applyManagedBlock(firstPlan.next, body, 'json');
    assert.equal(secondPlan.action, 'noop');
  });

  it('update install with changed hook command → replace-block', () => {
    const bodyV1 = buildHookBody(hookCommandSh);
    const firstPlan = applyManagedBlock(null, bodyV1, 'json');
    // Now switch to ps1 command
    const bodyV2 = buildHookBody(hookCommandPs1);
    const secondPlan = applyManagedBlock(firstPlan.next, bodyV2, 'json');
    assert.equal(secondPlan.action, 'replace-block');
    const parsed = JSON.parse(secondPlan.next);
    const managed = parsed['deliveryos.managed'] as Record<string, unknown>;
    const hooks = managed['hooks'] as Record<string, unknown>;
    const preToolUse = (hooks['PreToolUse'] as Array<{ hooks: Array<{ command: string }> }>);
    assert.equal(preToolUse[0].hooks[0].command, hookCommandPs1);
  });

  it('plan contains PreToolUse matcher for Edit|Write|MultiEdit', () => {
    const body = buildHookBody(hookCommandSh);
    const plan = applyManagedBlock(null, body, 'json');
    const parsed = JSON.parse(plan.next);
    const managed = parsed['deliveryos.managed'] as Record<string, unknown>;
    const hooks = managed['hooks'] as Record<string, unknown>;
    const preToolUse = (hooks['PreToolUse'] as Array<{ matcher: string }>);
    assert.equal(preToolUse[0].matcher, 'Edit|Write|MultiEdit');
  });

  it('existing non-DeliveryOS settings.json → append-block', () => {
    const existingSettings = JSON.stringify({ 'model': 'claude-opus-4-5' }, null, 2);
    const body = buildHookBody(hookCommandSh);
    const plan = applyManagedBlock(existingSettings, body, 'json');
    assert.equal(plan.action, 'append-block');
    const parsed = JSON.parse(plan.next);
    // Existing key preserved
    assert.equal((parsed as Record<string, unknown>)['model'], 'claude-opus-4-5');
    assert.ok('deliveryos.managed' in parsed);
  });
});
