// CHUNK-12 § resultStore.ts — bridge between captureFlow and MemoryStore.
// Uses the cast-through pattern (as unknown as ResultPayload) established by
// CHUNK-09/CHUNK-11. Does NOT create any new SQL tables.

import type { MemoryStore } from '../memory/MemoryStore';
import type { ResultPayload } from '@deliveryos/contracts';
import type { StoredResultPayload } from '@deliveryos/contracts';

/**
 * Persist a result entry and link it to its originating brief.
 * Returns the resultId (memory entry id).
 *
 * Direction: brief → result (brief "produced" the result).
 */
export async function persistResult(
  store: MemoryStore,
  briefEntryId: string,
  payload: StoredResultPayload,
  rawText: string,
): Promise<string> {
  const entry = await store.create({
    type: 'result',
    title: `Result — ${new Date(payload.capturedAt).toLocaleString()}`,
    payload: payload as unknown as ResultPayload,
    body: rawText, // raw harness markdown verbatim
  });

  // Link: brief → result with kind 'produced'.
  if (briefEntryId) {
    await store.link(briefEntryId, entry.id, 'produced');
  }

  return entry.id;
}
