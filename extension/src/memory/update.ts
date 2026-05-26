// CHUNK-14 § memory/update.ts — mandatory Memory Update flow.

import type { MemoryStore } from './MemoryStore';
import type { MemoryUpdateForm, BypassRecord, VerificationMemoryPayload } from '../verification/types';
import { generateMemoryId } from './ids';
import type {
  DesignPayload,
  CodebasePayload,
  RequirementPayload,
  VerificationPayload,
} from '@deliveryos/contracts';

const BYPASS_MIN_JUSTIFICATION_LEN = 10;

/**
 * Apply the memory update form for a given verification entry.
 * For each non-empty field, creates a new memory entry linked via `derived-from-verification`.
 * Updates the verification entry's memoryUpdateForm record.
 */
export async function applyUpdate(
  verificationId: string,
  form: MemoryUpdateForm,
  store: MemoryStore,
): Promise<void> {
  const verEntry = await store.read(verificationId);
  if (!verEntry || verEntry.type !== 'verification') {
    throw new Error(`Verification entry ${verificationId} not found`);
  }

  const verPayload = verEntry.payload as unknown as VerificationMemoryPayload;
  const emptyFields: Array<'design' | 'codebase' | 'requirement'> = [];

  if (form.designUpdate.trim().length > 0) {
    const designEntry = await store.create<'design'>({
      type: 'design',
      title: `Design update from verification ${verificationId}`,
      payload: {
        area: 'other',
        decision: form.designUpdate,
      } as DesignPayload,
      body: form.designUpdate,
    });
    await store.link(designEntry.id, verificationId, 'derived-from-verification');
  } else {
    emptyFields.push('design');
  }

  if (form.codebaseUpdate.trim().length > 0) {
    const reqTitle = verPayload.resultRef?.title ?? 'unknown requirement';
    const codebaseEntry = await store.create<'codebase'>({
      type: 'codebase',
      title: `Update after ${reqTitle}`,
      payload: {
        conventions: [form.codebaseUpdate],
      } as CodebasePayload,
      body: form.codebaseUpdate,
    });
    await store.link(codebaseEntry.id, verificationId, 'derived-from-verification');
  } else {
    emptyFields.push('codebase');
  }

  if (form.requirementAssumptionUpdate.trim().length > 0) {
    const reqEntry = await store.create<'requirement'>({
      type: 'requirement',
      title: `Assumption update from verification ${verificationId}`,
      payload: {
        category: 'functional',
        priority: 'could',
        text: form.requirementAssumptionUpdate,
      } as RequirementPayload,
      body: form.requirementAssumptionUpdate,
    });
    await store.link(reqEntry.id, verificationId, 'derived-from-verification');
  } else {
    emptyFields.push('requirement');
  }

  // Update the verification entry's memoryUpdateForm record.
  const updatedPayload: VerificationMemoryPayload = {
    ...verPayload,
    memoryUpdateForm: {
      submitted: true,
      fields: form,
      emptyFieldsRecorded: emptyFields,
    },
  };
  await store.update<'verification'>(verificationId, {
    payload: updatedPayload as unknown as Partial<VerificationPayload>,
  });
}

/**
 * Record a bypass for the memory-update gate.
 * Justification must be at least 10 characters.
 * Appends a BypassRecord inline to verification.payload.bypasses[].
 */
export async function recordBypass(
  verificationId: string,
  justification: string,
  store: MemoryStore,
): Promise<BypassRecord> {
  if (justification.length < BYPASS_MIN_JUSTIFICATION_LEN) {
    throw new Error(
      `Bypass justification must be at least ${BYPASS_MIN_JUSTIFICATION_LEN} characters (got ${justification.length})`,
    );
  }

  const verEntry = await store.read(verificationId);
  if (!verEntry || verEntry.type !== 'verification') {
    throw new Error(`Verification entry ${verificationId} not found`);
  }

  const verPayload = verEntry.payload as unknown as VerificationMemoryPayload;
  const bypassId = `bypass-${generateMemoryId('verification').replace('verification-', '')}`;

  const newBypass: BypassRecord = {
    id: bypassId,
    gate: 'memory-update',
    stage: 'VERIFY',
    justification,
    bypassedAt: Date.now(),
    bypassedBy: 'user',
    parentVerificationId: verificationId,
  };

  const existingBypasses = Array.isArray(verPayload.bypasses) ? verPayload.bypasses : [];
  const updatedPayload: VerificationMemoryPayload = {
    ...verPayload,
    bypasses: [...existingBypasses, newBypass],
    memoryUpdateForm: {
      submitted: false,
      fields: verPayload.memoryUpdateForm?.fields ?? {
        designUpdate: '',
        codebaseUpdate: '',
        requirementAssumptionUpdate: '',
      },
      emptyFieldsRecorded: verPayload.memoryUpdateForm?.emptyFieldsRecorded ?? [],
    },
  };

  await store.update<'verification'>(verificationId, {
    payload: updatedPayload as unknown as Partial<VerificationPayload>,
  });

  return newBypass;
}
