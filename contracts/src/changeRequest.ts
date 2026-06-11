import type { RequestType } from 'vscode-messenger-common';
import type { PrdSection } from './prd';

// --- Domain types ---

// logged → prompted → applied (requirement deltas in) → verified (the change
// was built, captured, and passed verification — terminal).
export type ChangeRequestStatus = 'logged' | 'prompted' | 'applied' | 'verified';

export interface ChangeRequest {
  readonly entryId: string;
  readonly id: string;                            // CR-001, CR-002...
  readonly description: string;
  readonly status: ChangeRequestStatus;
  readonly createdAt: number;
  readonly appliedAt?: number;
  readonly addedRequirementIds?: readonly string[];     // entryIds
  readonly editedRequirementIds?: readonly string[];    // entryIds
  readonly deletedRequirementUserIds?: readonly string[]; // REQ-NNN (already deleted)
}

// Stored payload shape (used by MemoryStore internally + contracts layer).
export interface ChangeRequestPayload {
  readonly kind: 'change-request';
  readonly id: string;
  readonly description: string;
  readonly status: ChangeRequestStatus;
  readonly prdSnapshotSections: readonly PrdSection[];
  readonly appliedAt?: number;
  readonly addedRequirementIds?: readonly string[];
  readonly editedRequirementIds?: readonly string[];
  readonly deletedRequirementUserIds?: readonly string[];
}

// --- Wire messages (webview ↔ host) ---

export interface ChangeRequestLoadParams {
  readonly entryId: string;
}

export type ChangeRequestLoadResult =
  | { readonly ok: true; readonly changeRequest: ChangeRequest }
  | { readonly ok: false; readonly reason: string };

export interface ChangeRequestListParams {
  readonly projectId?: string;
}

export type ChangeRequestListResult =
  | { readonly ok: true; readonly changeRequests: readonly ChangeRequest[] }
  | { readonly ok: false; readonly reason: string };

export interface ChangeRequestGeneratePromptParams {
  readonly description: string;
}

export type ChangeRequestGeneratePromptResult =
  | { readonly ok: true; readonly crEntryId: string; readonly bytesCopied: number }
  | { readonly ok: false; readonly reason: string };

export interface ChangeRequestPasteApplyParams {
  readonly crEntryId: string;
  readonly text: string;
}

export type ChangeRequestPasteApplyResult =
  | {
      readonly ok: true;
      readonly added: number;
      readonly edited: number;
      readonly deleted: number;
      readonly warnings: readonly string[];
    }
  | { readonly ok: false; readonly reason: string; readonly raw: string };

// --- Bootstrap ---

export type ChangeRequestBootstrapResult =
  | { readonly ok: true; readonly crEntryId: string | null }
  | { readonly ok: false; readonly reason: string };

export const ChangeRequestBootstrap: RequestType<Record<string, never>, ChangeRequestBootstrapResult> = {
  method: 'changeRequest/bootstrap',
};

// --- Request type constants ---

export const ChangeRequestLoad: RequestType<ChangeRequestLoadParams, ChangeRequestLoadResult> = {
  method: 'changeRequest/load',
};

export const ChangeRequestList: RequestType<ChangeRequestListParams, ChangeRequestListResult> = {
  method: 'changeRequest/list',
};

export const ChangeRequestGeneratePrompt: RequestType<
  ChangeRequestGeneratePromptParams,
  ChangeRequestGeneratePromptResult
> = { method: 'changeRequest/generatePrompt' };

export const ChangeRequestPasteApply: RequestType<
  ChangeRequestPasteApplyParams,
  ChangeRequestPasteApplyResult
> = { method: 'changeRequest/pasteApply' };
