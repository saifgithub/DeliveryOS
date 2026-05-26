// CHUNK-13 § diff/types.ts — re-exports diff types from contracts,
// so extension-internal modules can import from a local path while
// the canonical source lives in @deliveryos/contracts.

export type {
  DiffInput,
  DiffOutcome,
  FileVerdict,
  FileClassification,
  DiffNote,
  BriefDiff,
  HookInstallPlan,
  HookFileOp,
  DiffPanelInbound,
  DiffPanelOutbound,
} from '@deliveryos/contracts';
