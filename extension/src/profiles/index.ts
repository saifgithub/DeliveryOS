// CHUNK-10 — barrel re-exports for the host-side profiles module.
// Day 1 surface: schema types + registry + managed-block primitives. Day 2
// extends this with render + suggestedUpdates.

export * from './types';
export { PROFILES, PROFILE_LIST, getProfile } from './registry';
export {
  BEGIN_MARKER_MD,
  END_MARKER_MD,
  SENTINEL_KEY_JSON,
  BEGIN_MARKER_GITIGNORE,
  END_MARKER_GITIGNORE,
  applyManagedBlock,
  buildManagedBlock,
  readManagedBlock,
  writeFileAtomic,
} from './managedBlock';
export type { ManagedBlockAction, ManagedBlockPlan, VscodeFsNamespace, VscodeUri } from './managedBlock';
export { renderBrief } from './render';
export { computeSuggestedUpdates } from './suggestedUpdates';
export type { WorkspaceFileReader } from './suggestedUpdates';
export { CLAUDE_MD_BODY, AGENTS_MD_BODY, CLAUDE_SETTINGS_STUB } from './bodies';
