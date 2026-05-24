// CHUNK-10 § 2 — hard-coded MVP profile records. Two profiles only:
// Claude Code + Codex. Cursor, Generic, Replit/Lovable are deferred.
// Adding a profile widens `ProfileName` in types.ts, which forces a compile
// error at every switch point in render/suggestedUpdates.

import type { HarnessProfile, ProfileName } from './types';

/**
 * Claude Code profile.
 * Pinned to Claude Code CLI 1.x as of 2026-Q2. If a future Claude Code
 * release breaks the contract, ship a new extension version rather than
 * negotiating at runtime (per `docs/architecture/harness-profiles.md` final §).
 */
const CLAUDE_CODE: HarnessProfile = {
  name: 'claude-code',
  display_name: 'Claude Code',
  instruction_file: 'CLAUDE.md',
  handoff_dir: '.deliveryos-handoff',
  brief_style: 'structured-full',
  include_test_commands: true,
  include_lint_commands: true,
  include_forbidden_changes: true,
  output_format: 'markdown',
  mcp_capable: true,
  command_template:
    'claude --add-dir . "Run the brief at ${BRIEF_PATH} and write result to ${RESULT_PATH}"',
};

/**
 * Codex profile.
 * Pinned to Codex CLI as of 2026-Q2. `-o` flag (research finding #4) writes
 * the last assistant message to ${RESULT_PATH} automatically — so the brief
 * launch command frames `result.md` write as Codex-driven, unlike Claude Code.
 */
const CODEX: HarnessProfile = {
  name: 'codex',
  display_name: 'Codex',
  instruction_file: 'AGENTS.md',
  handoff_dir: '.deliveryos-handoff',
  brief_style: 'structured-full',
  include_test_commands: true,
  include_lint_commands: true,
  include_forbidden_changes: true,
  output_format: 'markdown',
  mcp_capable: true,
  command_template: 'codex exec -o ${RESULT_PATH} "Run the brief at ${BRIEF_PATH}"',
};

export const PROFILES: Readonly<Record<ProfileName, HarnessProfile>> = {
  'claude-code': CLAUDE_CODE,
  codex: CODEX,
};

export const PROFILE_LIST: readonly HarnessProfile[] = [CLAUDE_CODE, CODEX];

/**
 * Resolve a profile by name. Throws on unknown name — the call sites all
 * receive a `ProfileName` from a typed message so this branch is defensive.
 */
export function getProfile(name: ProfileName): HarnessProfile {
  const profile = PROFILES[name];
  if (!profile) {
    throw new Error(`Unknown harness profile: ${String(name)}`);
  }
  return profile;
}
