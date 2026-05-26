// CHUNK-14 § verification/verificationWorkflow.ts — orchestrates the lifecycle.

import type { MemoryStore } from '../memory/MemoryStore';
import type {
  VerificationVerdict,
  Defect,
  VerificationMemoryPayload,
  MemoryUpdateFormRecord,
} from './types';
import type { DiffOutcome } from '@deliveryos/contracts';
import type { StoredResultPayload } from '@deliveryos/contracts';
import { generateMemoryId } from '../memory/ids';
import type { VerificationPayload } from '@deliveryos/contracts';

export interface VerificationInputs {
  /** The requirement entry id being verified. */
  requirementEntryId: string;
  /** The result entry id to verify. */
  resultEntryId: string;
  /** The test-spec entry id for this requirement. */
  testSpecEntryId: string;
}

export interface VerdictRequest {
  verdict: VerificationVerdict;
  diffOverride: boolean;
  failedCriteria?: string[];
  defects?: Defect[];
  reworkNotes?: string;
}

/**
 * Write a VerificationMemory entry for a given verdict.
 * Links: evaluates → result, evaluates → test-spec, verifies → requirement.
 * Returns the newly created verification entry id.
 */
export async function recordVerdict(
  store: MemoryStore,
  inputs: VerificationInputs,
  request: VerdictRequest,
): Promise<string> {
  // Read result to get diff summary.
  const resultEntry = await store.read(inputs.resultEntryId);
  if (!resultEntry || resultEntry.type !== 'result') {
    throw new Error(`Result entry ${inputs.resultEntryId} not found`);
  }
  const resultPayload = resultEntry.payload as unknown as StoredResultPayload;
  const diffOutcome = resultPayload.diffOutcome as DiffOutcome | undefined;

  // Read test-spec for ref.
  const testSpecEntry = await store.read(inputs.testSpecEntryId);
  if (!testSpecEntry || testSpecEntry.type !== 'test-spec') {
    throw new Error(`Test-spec entry ${inputs.testSpecEntryId} not found`);
  }

  // Read requirement for ref.
  const reqEntry = await store.read(inputs.requirementEntryId);
  if (!reqEntry || reqEntry.type !== 'requirement') {
    throw new Error(`Requirement entry ${inputs.requirementEntryId} not found`);
  }

  const approvedAt = Date.now();
  const emptyMemUpdateForm: MemoryUpdateFormRecord = {
    submitted: false,
    fields: {
      designUpdate: '',
      codebaseUpdate: '',
      requirementAssumptionUpdate: '',
    },
    emptyFieldsRecorded: [],
  };

  const verificationPayload: VerificationMemoryPayload = {
    verdict: request.verdict,
    failedCriteria: request.failedCriteria ?? [],
    defects: request.defects ?? [],
    ...(request.reworkNotes !== undefined ? { reworkNotes: request.reworkNotes } : {}),
    diffOverride: request.diffOverride,
    approvedBy: 'user',
    approvedAt,
    testSpecRef: {
      id: testSpecEntry.id,
      type: testSpecEntry.type,
      title: testSpecEntry.title,
    },
    resultRef: {
      id: resultEntry.id,
      type: resultEntry.type,
      title: resultEntry.title,
    },
    diffSummary: {
      verdict: diffOutcome?.verdict ?? 'fail',
      forbiddenTouched: diffOutcome
        ? diffOutcome.files
            .filter((f) => f.classification === 'forbidden-but-touched')
            .map((f) => f.path)
        : [],
      allowedNotTouched: diffOutcome ? diffOutcome.unmatchedAllowedPatterns : [],
    },
    memoryUpdateForm: emptyMemUpdateForm,
    bypasses: [],
  };

  const created = await store.create<'verification'>({
    type: 'verification',
    title: `Verification of ${resultEntry.id}`,
    payload: verificationPayload as unknown as VerificationPayload,
  });

  // Write links.
  await store.link(created.id, inputs.resultEntryId, 'evaluates');
  await store.link(created.id, inputs.testSpecEntryId, 'evaluates');
  await store.link(created.id, inputs.requirementEntryId, 'verifies');

  return created.id;
}

/**
 * Generate a bypass record id.
 */
export function newBypassId(): string {
  return generateMemoryId('verification').replace('verification-', 'bypass-');
}
