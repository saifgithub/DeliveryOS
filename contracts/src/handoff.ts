import type { NotificationType, RequestType } from 'vscode-messenger-common';

import type { ProfileName } from './profiles';

// --- Domain (shared between host + webview) -------------------------------
//
// CHUNK-11 (File handoff + terminal integration + result watcher).
// The webview imports these types to render the "Run with..." surface; the
// host re-uses the same shapes for its handoff modules. Wire-safe by
// construction — only primitives, arrays of primitives, plain objects of
// the same. URIs are always serialised as strings across the wire (never
// raw `vscode.Uri`).

/**
 * Mirror of `extension/src/handoff/paths.ts` constants for webview-side
 * use. Webviews must never import vscode.* APIs; they receive these as
 * strings only.
 */
export const HANDOFF_PATHS = {
  dir: '.deliveryos-handoff',
  historyDir: '.deliveryos-handoff/history',
  currentExecutionBrief: '.deliveryos-handoff/current-execution-brief.md',
  currentContextPackage: '.deliveryos-handoff/current-context-package.md',
  currentTestSpecification: '.deliveryos-handoff/current-test-specification.md',
  currentVerificationChecklist: '.deliveryos-handoff/current-verification-checklist.md',
  memorySummary: '.deliveryos-handoff/memory-summary.md',
  result: '.deliveryos-handoff/result.md',
} as const;
export type HandoffPaths = typeof HANDOFF_PATHS;

/**
 * The payload the brief composer (CHUNK-09) passes to the writer. All
 * fields are full rendered markdown strings; the writer does not transform
 * them.
 */
export interface HandoffSnapshot {
  readonly executionBriefMd: string;
  readonly contextPackageMd: string;
  readonly testSpecificationMd: string;
  readonly verificationChecklistMd: string;
  readonly memorySummaryMd: string;
  readonly briefId: string;
  readonly projectId: string;
}

export type TerminalCloseReason = 'process' | 'user' | 'extensionHost' | 'unknown';

// --- Webview → host request types -----------------------------------------

export interface HandoffRunParams {
  readonly briefId: string;
}

export type HandoffRunResult =
  | {
      readonly ok: true;
      readonly handoffTimestamp: string;
      readonly briefHistoryUri: string;
    }
  | {
      readonly ok: false;
      readonly reason:
        | 'no-workspace'
        | 'no-brief'
        | 'write-failed'
        | 'launch-failed'
        | 'unknown';
      readonly error?: string;
    };

export const HandoffRunWithClaudeCode: RequestType<HandoffRunParams, HandoffRunResult> = {
  method: 'handoff/runWithClaudeCode',
};

export const HandoffRunWithCodex: RequestType<HandoffRunParams, HandoffRunResult> = {
  method: 'handoff/runWithCodex',
};

export interface HandoffApplyGitignoreParams {
  readonly briefId: string;
}

export type HandoffApplyGitignoreResult =
  | { readonly ok: true; readonly action: 'create' | 'append-block' | 'replace-block' | 'noop' }
  | {
      readonly ok: false;
      readonly reason: 'no-workspace' | 'cancelled' | 'write-failed' | 'unknown';
      readonly error?: string;
    };

export const HandoffApplyGitignoreTemplate: RequestType<
  HandoffApplyGitignoreParams,
  HandoffApplyGitignoreResult
> = {
  method: 'handoff/applyGitignoreTemplate',
};

// --- Host → webview notifications -----------------------------------------

export interface HandoffWrittenParams {
  readonly briefId: string;
  readonly handoffTimestamp: string;
  readonly briefHistoryUri: string;
  readonly profileName: ProfileName;
}

export const HandoffWritten: NotificationType<HandoffWrittenParams> = {
  method: 'handoff/written',
};

export interface HandoffResultObservedParams {
  readonly briefId: string;
  readonly handoffTimestamp: string;
  readonly resultUri: string;
  readonly contentSha256: string;
  readonly observedAt: number;
  readonly kind: 'created' | 'changed';
}

export const HandoffResultObserved: NotificationType<HandoffResultObservedParams> = {
  method: 'handoff/resultObserved',
};

export interface HandoffTerminalClosedParams {
  readonly briefId: string;
  readonly handoffTimestamp: string;
  readonly exitCode: number | null;
  readonly reason: TerminalCloseReason;
}

export const HandoffTerminalClosed: NotificationType<HandoffTerminalClosedParams> = {
  method: 'handoff/terminalClosed',
};

export interface HandoffErrorParams {
  readonly briefId: string;
  readonly message: string;
}

export const HandoffError: NotificationType<HandoffErrorParams> = {
  method: 'handoff/error',
};
