// CHUNK-13 § hooks/hookInstallPlan.ts — re-exports HookInstallPlan types
// from @deliveryos/contracts so extension-internal modules can import
// from a local path.
//
// The canonical definitions live in contracts/src/diff.ts.

export type {
  HookInstallPlan,
  HookFileOp,
  ManagedBlockPlanForDiff,
} from '@deliveryos/contracts';
