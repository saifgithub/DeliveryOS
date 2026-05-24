import type { NotificationType, RequestType } from 'vscode-messenger-common';

// --- Domain (shared between host + webview) -------------------------------
//
// Field names are lowercase end-to-end to match the existing
// `RequirementPayload` shape in contracts/src/memory.ts. Stored entries use
// `type='requirement'` + `payload.kind='requirement-item'` to discriminate
// from the PRD parent (`payload.kind='prd'`). `contracts/src/memory.ts` is
// deliberately not extended for this chunk — the `kind` discriminator lives
// inside the polymorphic payload, mirroring the PRD layer's cast-through
// pattern (see extension/src/memory/MemoryStore.ts upsertPrdParent).

export type RequirementCategory = 'functional' | 'non-functional';

export type RequirementPriority = 'must' | 'should' | 'could';

/**
 * "empty" until CHUNK-08 runs. CHUNK-07 never writes 'draft' or 'approved' —
 * those transitions are owned by CHUNK-08 (Test Designer). The host derives
 * this field from `verificationCriteria?.length` on read; it is NOT stored.
 */
export type VerificationStatus = 'empty' | 'draft' | 'approved';

/**
 * Lightweight summary of a linked Test Specification (CHUNK-08).
 * Populated by the host when a `has-test-spec` link exists; `null` otherwise.
 */
export interface RequirementTestSpecSummary {
  /** User-visible test-spec id; e.g. 'TS-REQ-002'. */
  readonly id: string;
  /** Test case headings — just enough for the detail panel to list. */
  readonly caseTitles: readonly string[];
}

export interface Requirement {
  /** Internal SQLite row id (UUID). Used for `requirements/update` + `requirements/delete`. */
  readonly entryId: string;
  /** User-visible ID. Format: 'REQ-NNN' (3-digit zero-padded). */
  readonly id: string;
  readonly title: string;
  /** Long-form body. Mirrors `payload.text` and the on-disk markdown file. */
  readonly description: string;
  readonly category: RequirementCategory;
  readonly priority: RequirementPriority;
  /** Heading text of the PRD section this was derived from, e.g. 'Goals'. */
  readonly sourcePrdSection: string;
  readonly verificationStatus: VerificationStatus;
  /**
   * Verification criteria — plain-string list populated by CHUNK-08's Test
   * Designer. Empty array when no criteria have been written yet.
   */
  readonly verificationCriteria: readonly string[];
  /**
   * Linked Test Specification, if CHUNK-08 has run for this requirement.
   * `null` when no `has-test-spec` link exists.
   */
  readonly testSpec: RequirementTestSpecSummary | null;
}

/**
 * Output of the parser. IDs are deliberately omitted — the host assigns
 * canonical `REQ-NNN` to prevent duplicates from AI output (see CHUNK-07 §10).
 */
export interface DecomposedRequirement {
  readonly title: string;
  readonly description: string;
  readonly category: RequirementCategory;
  readonly priority: RequirementPriority;
  readonly sourcePrdSection: string;
  /** Parser warnings raised while normalising this row (coerced enum values, etc.). */
  readonly warnings?: readonly string[];
}

/**
 * Read-only projection assembled by the host on `requirements.list`. Computed
 * from `memory_entries` (type='requirement', payload.kind='requirement-item')
 * plus the resolved source-PRD parent. Never persisted on its own.
 */
export interface RequirementsCatalogue {
  readonly prdId: string;
  readonly prdTitle: string;
  /** PRD section headings, sourced from `DraftPrd.sections`. Drives the detail-editor dropdown. */
  readonly prdSections: readonly string[];
  readonly requirements: readonly Requirement[];
}

/** Result of `parseDecomposed`. Discriminated on `ok`. */
export type DecomposedParseResult =
  | {
      readonly ok: true;
      readonly mode: 'json' | 'markdown-table';
      readonly requirements: readonly DecomposedRequirement[];
    }
  | { readonly ok: false; readonly reason: string; readonly raw: string };

// --- Wire messages (webview ↔ host, all request/response unless noted) ----

export interface RequirementsListParams {
  readonly projectId: string;
}

export type RequirementsListResult =
  | { readonly ok: true; readonly catalogue: RequirementsCatalogue }
  | { readonly ok: false; readonly reason: 'no-prd' | 'no-project' };

export interface RequirementsFilterParams {
  readonly projectId: string;
  readonly category?: RequirementCategory;
  readonly priority?: RequirementPriority;
  readonly verificationStatus?: VerificationStatus;
  readonly search?: string;
}

export type RequirementsFilterResult = RequirementsListResult;

export interface RequirementsUpdateParams {
  readonly entryId: string;
  readonly patch: {
    readonly title?: string;
    readonly description?: string;
    readonly category?: RequirementCategory;
    readonly priority?: RequirementPriority;
    readonly sourcePrdSection?: string;
  };
}

export interface RequirementsUpdateResult {
  readonly ok: true;
  readonly requirement: Requirement;
}

export interface RequirementsDeleteParams {
  readonly entryId: string;
}

export interface RequirementsDeleteResult {
  readonly ok: true;
}

export interface RequirementsOpenDecomposePanelParams {
  readonly projectId: string;
}

export interface RequirementsOpenDecomposePanelResult {
  readonly ok: true;
}

export interface RequirementsOpenTestDesignerParams {
  readonly requirementEntryId: string;
}

export type RequirementsOpenTestDesignerResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'no-requirement' };

export interface RequirementsOpenTestSpecFileParams {
  readonly requirementEntryId: string;
}

export type RequirementsOpenTestSpecFileResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'no-test-spec' | 'no-requirement' };

export interface RequirementsGenerateDecomposePromptParams {
  readonly projectId: string;
}

export type RequirementsGenerateDecomposePromptResult =
  | { readonly ok: true; readonly bytesCopied: number }
  | { readonly ok: false; readonly reason: 'no-prd' | 'no-project' };

export interface RequirementsPasteDecomposedParams {
  readonly projectId: string;
  readonly text: string;
}

export type RequirementsPasteDecomposedResult =
  | {
      readonly ok: true;
      readonly mode: 'json' | 'markdown-table';
      readonly createdIds: readonly string[];
      readonly warnings: readonly string[];
    }
  | { readonly ok: false; readonly reason: string; readonly raw: string };

/**
 * Push event fired by the host whenever a requirement-item entry mutates.
 * `'verification-update'` is fired by CHUNK-08 when a Test Designer commit
 * lands verification criteria + a linked test-spec onto the requirement.
 */
export interface RequirementsChangedParams {
  readonly source: 'create' | 'update' | 'delete' | 'verification-update';
  readonly ids: readonly string[];
}

export const RequirementsList: RequestType<RequirementsListParams, RequirementsListResult> = {
  method: 'requirements/list',
};

export const RequirementsFilter: RequestType<RequirementsFilterParams, RequirementsFilterResult> = {
  method: 'requirements/filter',
};

export const RequirementsUpdate: RequestType<RequirementsUpdateParams, RequirementsUpdateResult> = {
  method: 'requirements/update',
};

export const RequirementsDelete: RequestType<RequirementsDeleteParams, RequirementsDeleteResult> = {
  method: 'requirements/delete',
};

export const RequirementsOpenDecomposePanel: RequestType<
  RequirementsOpenDecomposePanelParams,
  RequirementsOpenDecomposePanelResult
> = { method: 'requirements/openDecomposePanel' };

export const RequirementsOpenTestDesigner: RequestType<
  RequirementsOpenTestDesignerParams,
  RequirementsOpenTestDesignerResult
> = { method: 'requirements/openTestDesigner' };

export const RequirementsOpenTestSpecFile: RequestType<
  RequirementsOpenTestSpecFileParams,
  RequirementsOpenTestSpecFileResult
> = { method: 'requirements/openTestSpecFile' };

export const RequirementsGenerateDecomposePrompt: RequestType<
  RequirementsGenerateDecomposePromptParams,
  RequirementsGenerateDecomposePromptResult
> = { method: 'requirements/generateDecomposePrompt' };

export const RequirementsPasteDecomposed: RequestType<
  RequirementsPasteDecomposedParams,
  RequirementsPasteDecomposedResult
> = { method: 'requirements/pasteDecomposed' };

export const RequirementsChanged: NotificationType<RequirementsChangedParams> = {
  method: 'requirements/changed',
};
