// CHUNK-13 § diff/persist.ts — persists a DiffOutcome to the Result Memory
// record via MemoryStore.update(resultId, { payload: { ..., diffOutcome } }).

import type { MemoryStore } from '../memory/MemoryStore';
import type { DiffOutcome } from '@deliveryos/contracts';
import type { ResultPayload } from '@deliveryos/contracts';

/**
 * Write a DiffOutcome to the Result Memory record identified by resultId.
 * The diffOutcome slot on ResultPayload is declared as `unknown` by CHUNK-03.
 */
export async function persistDiffOutcome(
  store: MemoryStore,
  resultId: string,
  outcome: DiffOutcome,
): Promise<void> {
  await store.update<'result'>(resultId, {
    payload: { diffOutcome: outcome as unknown } as Partial<ResultPayload>,
  });
}
