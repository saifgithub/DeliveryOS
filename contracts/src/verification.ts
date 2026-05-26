// CHUNK-14 § contracts/src/verification.ts — Verification workflow contracts.
// Webview-safe: no runtime imports (no `vscode`, no `sql.js`, no `fs`).

import type { RequestType, NotificationType } from 'vscode-messenger-common';
import type { MemoryEntry } from './memory';
import type { DiffOutcome } from './diff';

// --- Core verification types ---

export type VerificationVerdict = 'pass' | 'fail' | 'rework';

export interface MemoryRef {
  id: string;
  type: string;
  title: string;
}

export interface Defect {
  id: string;
  summary: string;
  criteriaRef?: string;
}

export interface MemoryUpdateForm {
  designUpdate: string;
  codebaseUpdate: string;
  requirementAssumptionUpdate: string;
}

export interface BypassRecord {
  id: string;
  gate: 'memory-update';
  stage: 'VERIFY';
  justification: string;
  bypassedAt: number;
  bypassedBy: 'user';
  parentVerificationId: string;
}

export interface MemoryUpdateFormRecord {
  submitted: boolean;
  fields: MemoryUpdateForm;
  emptyFieldsRecorded: Array<'design' | 'codebase' | 'requirement'>;
  bypassRef?: MemoryRef;
}

export interface VerificationMemoryPayload {
  verdict: VerificationVerdict;
  failedCriteria: string[];
  defects: Defect[];
  reworkNotes?: string;
  diffOverride: boolean;
  approvedBy: 'user';
  approvedAt: number;
  testSpecRef: MemoryRef;
  resultRef: MemoryRef;
  diffSummary: {
    verdict: 'pass' | 'fail';
    forbiddenTouched: string[];
    allowedNotTouched: string[];
  };
  memoryUpdateForm: MemoryUpdateFormRecord;
  bypasses: BypassRecord[];
}

// --- Webview ↔ host message types ---

export interface VerificationApproveParams {
  diffOverride: boolean;
  defects?: Defect[];
  failedCriteria?: string[];
}
export interface VerificationApproveResult {
  verificationId: string;
}
export const VerificationApprove: RequestType<VerificationApproveParams, VerificationApproveResult> = {
  method: 'verification.approve',
};

export interface VerificationRejectParams {
  failedCriteria: string[];
  defects: Defect[];
  diffOverride: boolean;
}
export interface VerificationRejectResult {
  verificationId: string;
}
export const VerificationReject: RequestType<VerificationRejectParams, VerificationRejectResult> = {
  method: 'verification.reject',
};

export interface VerificationRequestReworkParams {
  reworkNotes: string;
}
export interface VerificationRequestReworkResult {
  verificationId: string;
}
export const VerificationRequestRework: RequestType<
  VerificationRequestReworkParams,
  VerificationRequestReworkResult
> = { method: 'verification.requestRework' };

export interface VerificationRecordBypassParams {
  verificationId: string;
  justification: string;
}
export interface VerificationRecordBypassResult {
  ok: boolean;
}
export const VerificationRecordBypass: RequestType<
  VerificationRecordBypassParams,
  VerificationRecordBypassResult
> = { method: 'verification.recordBypass' };

export interface MemoryApplyUpdateParams {
  verificationId: string;
  form: MemoryUpdateForm;
}
export interface MemoryApplyUpdateResult {
  ok: boolean;
}
export const MemoryApplyUpdate: RequestType<MemoryApplyUpdateParams, MemoryApplyUpdateResult> = {
  method: 'memory.applyUpdate',
};

export interface ReleaseExportParams {
  verificationId: string;
}
export const ReleaseExport: RequestType<ReleaseExportParams, import('./release').ReleaseEvidence> = {
  method: 'release.export',
};

export interface ReleaseZipPackageParams {
  releaseId: string;
}
export const ReleaseZipPackage: RequestType<ReleaseZipPackageParams, Record<string, never>> = {
  method: 'release.zipPackage',
};

// Notifications: ext → webview
export interface VerificationLoadedPayload {
  testSpec: MemoryEntry;
  result: MemoryEntry;
  diff: DiffOutcome | null;
  prior?: VerificationMemoryPayload;
}
export const VerificationLoaded: NotificationType<VerificationLoadedPayload> = {
  method: 'verification.loaded',
};

export interface ReleasePreviewPayload {
  evidence: import('./release').ReleaseEvidence;
}
export const ReleasePreview: NotificationType<ReleasePreviewPayload> = {
  method: 'release.preview',
};
