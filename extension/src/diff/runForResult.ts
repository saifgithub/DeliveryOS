// CHUNK-13 § diff/runForResult.ts — glue layer.
// Loads a Result Memory entry, resolves its linked brief, calls the
// CHUNK-09 parser to get the allowed/forbidden pattern arrays, runs the
// engine, and persists the DiffOutcome.

import type { MemoryStore } from '../memory/MemoryStore';
import type { StoredResultPayload, DiffOutcome } from '@deliveryos/contracts';
import { parseAllowedForbidden } from '../brief/briefMarkdown';
import { runDiff, CURRENT_ENGINE_VERSION } from './engine';
import { persistDiffOutcome } from './persist';

/**
 * Run (or re-run) the Allowed/Forbidden diff for the given result entry.
 * Returns the DiffOutcome and also persists it to the result record.
 *
 * Errors are thrown — callers should handle display/notification.
 */
export async function runDiffForResult(
  store: MemoryStore,
  resultId: string,
): Promise<DiffOutcome> {
  const resultEntry = await store.read(resultId);
  if (!resultEntry || resultEntry.type !== 'result') {
    throw new Error(`[DeliveryOS] runDiffForResult: result entry not found: ${resultId}`);
  }

  const resultPayload = resultEntry.payload as unknown as StoredResultPayload;

  // Resolve the linked brief — stored as the `briefId` field on StoredResultPayload.
  const briefId = resultPayload.briefId;
  if (!briefId) {
    throw new Error(
      `[DeliveryOS] runDiffForResult: result ${resultId} has no briefId field.`,
    );
  }

  const briefRecord = await store.getBrief(briefId);
  if (!briefRecord) {
    throw new Error(
      `[DeliveryOS] runDiffForResult: brief ${briefId} not found for result ${resultId}.`,
    );
  }

  // Use CHUNK-09's cheap parseAllowedForbidden (no strict frontmatter required).
  const { allowed, forbidden } = parseAllowedForbidden(briefRecord.body);

  const filesChanged = resultPayload.filesChanged ?? {
    fromGit: [],
    fromHarness: [],
    gitAvailable: false,
  };

  const outcome = runDiff({
    allowedPatterns: [...allowed],
    forbiddenPatterns: [...forbidden],
    filesChanged,
  });

  // Attach resultId to the outcome.
  const withId: DiffOutcome = { ...outcome, resultId };

  await persistDiffOutcome(store, resultId, withId);

  return withId;
}

export { CURRENT_ENGINE_VERSION };
