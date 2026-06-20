import type { RequestType } from 'vscode-messenger-common';

// --- Section schema (shared between host + webview) -----------------------

export const PRD_SECTION_IDS = [
  'problem',
  'users',
  'goals',
  'non-goals',
  'constraints',
  'assumptions',
  'risks',
  'success-criteria',
] as const;

export type PrdSectionId = (typeof PRD_SECTION_IDS)[number];

export interface PrdSection {
  readonly id: PrdSectionId;
  readonly title: string;
  readonly body: string;
}

export interface DraftPrd {
  readonly prdId: string;
  readonly projectId: string;
  readonly projectTitle: string;
  readonly sections: readonly PrdSection[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface PrdParseReport {
  readonly sectionsFound: readonly PrdSectionId[];
  readonly sectionsMissing: readonly PrdSectionId[];
  readonly unmatchedHeadings: readonly string[];
  readonly rawByteLength: number;
}

// --- Wire messages (webview ↔ host, all request/response) ----------------

export interface PrdLoadParams {
  readonly projectId: string;
}

export interface PrdLoadResult {
  readonly prd: DraftPrd | null;
  readonly projectId: string;
  readonly projectTitle: string;
}

export interface PrdGenerateDraftPromptParams {
  readonly projectId: string;
}

export interface PrdGenerateDraftPromptResult {
  readonly ok: true;
  readonly bytesCopied: number;
}

export interface PrdPasteDraftParams {
  readonly projectId: string;
  readonly rawMarkdown: string;
}

export interface PrdPasteDraftResult {
  readonly prd: DraftPrd;
  readonly report: PrdParseReport;
}

export interface PrdSaveSectionParams {
  readonly prdId: string;
  readonly sectionId: PrdSectionId;
  readonly body: string;
}

export interface PrdSaveSectionResult {
  readonly ok: true;
  readonly updatedAt: number;
}

export interface PrdReviseSectionPromptParams {
  readonly prdId: string;
  readonly sectionId: PrdSectionId;
  readonly instruction: string;
}

export interface PrdReviseSectionPromptResult {
  readonly ok: true;
  readonly bytesCopied: number;
}

export interface PrdRunAIParams {
  readonly projectId: string;
}

export type PrdRunAIResult =
  | { readonly ok: true; readonly prd: DraftPrd; readonly report: PrdParseReport }
  | { readonly ok: false; readonly reason: string; readonly clipboardFallback?: true };

export const PrdLoad: RequestType<PrdLoadParams, PrdLoadResult> = {
  method: 'prd/load',
};

export const PrdGenerateDraftPrompt: RequestType<
  PrdGenerateDraftPromptParams,
  PrdGenerateDraftPromptResult
> = { method: 'prd/generateDraftPrompt' };

export const PrdPasteDraft: RequestType<PrdPasteDraftParams, PrdPasteDraftResult> = {
  method: 'prd/pasteDraft',
};

export const PrdSaveSection: RequestType<PrdSaveSectionParams, PrdSaveSectionResult> = {
  method: 'prd/saveSection',
};

export const PrdReviseSectionPrompt: RequestType<
  PrdReviseSectionPromptParams,
  PrdReviseSectionPromptResult
> = { method: 'prd/reviseSectionPrompt' };

export const PrdRunAI: RequestType<PrdRunAIParams, PrdRunAIResult> = {
  method: 'prd/runAI',
};
