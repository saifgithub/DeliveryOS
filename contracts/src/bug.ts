// Post-build iteration loop — Bug front door.
// A Bug records "the built product does not match an existing requirement"
// (or a free-standing defect with no requirement). Mirrors the change-request
// contract shape. Webview-safe: no runtime imports.

import type { RequestType } from 'vscode-messenger-common';

// --- Domain types ---

export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';

// open → assigned (brief composed / handed off) → fixed (result captured)
// → verified (verification pass). `deferred` is a terminal side-state.
export type BugStatus = 'open' | 'assigned' | 'fixed' | 'verified' | 'deferred';

export interface Bug {
  readonly entryId: string;
  readonly id: string; // BUG-001, BUG-002...
  readonly description: string;
  readonly severity: BugSeverity;
  readonly status: BugStatus;
  readonly area?: string;
  readonly discoveredIn?: string;
  readonly targetRequirementId?: string; // entryId of violated requirement (optional)
  readonly fixResultId?: string; // entryId of the result that fixed it
  readonly createdAt: number;
  readonly assignedAt?: number;
  readonly fixedAt?: number;
  readonly verifiedAt?: number;
  readonly deferredReason?: string;
  readonly notes?: string;
}

// Stored payload shape (used by MemoryStore internally + contracts layer).
export interface BugPayload {
  readonly kind: 'bug';
  readonly id: string;
  readonly description: string;
  readonly severity: BugSeverity;
  readonly status: BugStatus;
  readonly area?: string;
  readonly discoveredIn?: string;
  readonly targetRequirementId?: string;
  readonly fixResultId?: string;
  readonly assignedAt?: number;
  readonly fixedAt?: number;
  readonly verifiedAt?: number;
  readonly deferredReason?: string;
  readonly notes?: string;
}

// --- Wire messages (webview ↔ host) ---

export interface BugLogParams {
  readonly description: string;
  readonly severity: BugSeverity;
  readonly area?: string;
  readonly discoveredIn?: string;
  readonly targetRequirementId?: string;
  readonly notes?: string;
}

export type BugLogResult =
  | { readonly ok: true; readonly bugEntryId: string; readonly bugId: string }
  | { readonly ok: false; readonly reason: string };

export interface BugListParams {
  readonly projectId?: string;
}

export type BugListResult =
  | { readonly ok: true; readonly bugs: readonly Bug[] }
  | { readonly ok: false; readonly reason: string };

export interface BugLoadParams {
  readonly entryId: string;
}

export type BugLoadResult =
  | { readonly ok: true; readonly bug: Bug }
  | { readonly ok: false; readonly reason: string };

export interface BugUpdateParams {
  readonly entryId: string;
  readonly status?: BugStatus;
  readonly severity?: BugSeverity;
  readonly area?: string;
  readonly targetRequirementId?: string;
  readonly deferredReason?: string;
  readonly notes?: string;
}

export type BugUpdateResult =
  | { readonly ok: true; readonly bug: Bug }
  | { readonly ok: false; readonly reason: string };

// --- Bootstrap ---

export type BugBootstrapResult =
  | { readonly ok: true; readonly projectId: string | null }
  | { readonly ok: false; readonly reason: string };

export const BugBootstrap: RequestType<Record<string, never>, BugBootstrapResult> = {
  method: 'bug/bootstrap',
};

// --- Request type constants ---

export const BugLog: RequestType<BugLogParams, BugLogResult> = {
  method: 'bug/log',
};

export const BugList: RequestType<BugListParams, BugListResult> = {
  method: 'bug/list',
};

export const BugLoad: RequestType<BugLoadParams, BugLoadResult> = {
  method: 'bug/load',
};

export const BugUpdate: RequestType<BugUpdateParams, BugUpdateResult> = {
  method: 'bug/update',
};
