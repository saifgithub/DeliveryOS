import type { NotificationType, RequestType } from 'vscode-messenger-common';

// --- Domain (shared between host + webview) -------------------------------
//
// CHUNK-09 (Execution Brief composer). Given an approved Requirement (and
// optionally its linked Test Spec from CHUNK-08), composes the canonical
// 10-section DeliveryOS Execution Brief and persists it as a `type='execution'`
// memory entry whose body file is the canonical brief markdown.
//
// `contracts/src/memory.ts` is deliberately NOT extended for this chunk —
// `ExecutionPayload`'s minimum stable shape (`briefMarkdown`, `targetHarness`,
// `briefVersion`) is honoured via the cast-through pattern in MemoryStore
// (mirrors the PRD + Requirements + TestSpec layers). The richer fields here
// (frontmatter, locked_at, supersedes, parsed Allowed/Forbidden lists) are
// CHUNK-09 extensions stored in the same row.
//
// On the wire, `ExecutionBriefDraft` is the shape webview ↔ host messages
// carry. The richer extension-host `ExecutionBrief` shape lives in
// `extension/src/brief/types.ts` and is not exported to the webview.

export type BriefSectionId =
  | 'objective'
  | 'approved-requirement'
  | 'business-intent'
  | 'approved-design-context'
  | 'existing-codebase-context'
  | 'test-first-specification'
  | 'allowed-changes'
  | 'forbidden-changes'
  | 'expected-output'
  | 'completion-criteria';

export type BriefSectionNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface BriefSectionDraft {
  readonly id: BriefSectionId;
  readonly number: BriefSectionNumber;
  readonly name: string;
  /** Raw markdown body of the section (sans heading). */
  readonly body: string;
  /**
   * `true` for sections the composer renders as read-only. In MVP only
   * Section 9 (Expected Output) is read-only — its body is the fixed
   * `renderExpectedOutputSection()` template shared with CHUNK-12.
   */
  readonly readOnly: boolean;
}

export interface BriefFrontmatterDraft {
  readonly brief_id: string;
  readonly schema_version: number;
  readonly project_id: string;
  readonly requirement_id: string;
  readonly test_spec_id?: string;
  readonly supersedes?: string;
  /** `'(unspecified)'` until CHUNK-10 fills it on render. */
  readonly profile: string;
  /** ISO 8601. */
  readonly created_at: string;
  /** ISO 8601. Absent ⇒ draft. */
  readonly locked_at?: string;
}

export interface BriefMetaLines {
  readonly profile: string;
  readonly project: string;
  readonly requirement: string;
}

/**
 * Wire-safe projection of an Execution Brief. Used for both the bootstrap
 * payload (host → webview) and the `brief.save` message (webview → host).
 * The host re-derives `allowed` / `forbidden` from the section bodies via
 * `briefMarkdown.parseAllowedForbidden`-style logic on save.
 */
export interface ExecutionBriefDraft {
  readonly frontmatter: BriefFrontmatterDraft;
  readonly title: string;
  readonly metaLines: BriefMetaLines;
  /** Ordered 1..10, indexed by `BriefSectionId`. */
  readonly sections: Readonly<Record<BriefSectionId, BriefSectionDraft>>;
  /** Parsed mirror of `sections['allowed-changes'].body`. */
  readonly allowed: readonly string[];
  /** Parsed mirror of `sections['forbidden-changes'].body`. Empty ⇒ `- (none)`. */
  readonly forbidden: readonly string[];
}

export interface BriefValidation {
  readonly ok: boolean;
  /** Blocking issues — Save is disabled while non-empty. */
  readonly errors: readonly string[];
  /** Non-blocking advisory ("Section 5 looks short", etc.). */
  readonly warnings: readonly string[];
}

/** Brief shown in the "Briefs" section of the requirement detail panel. */
export interface RequirementBriefSummary {
  /** SQLite row id (canonical entry id; use for opening the markdown file). */
  readonly entryId: string;
  /** User-visible brief id; e.g. `brief_01HXYZ...`. */
  readonly id: string;
  /** Monotonically increasing per-requirement; v1 is the first. */
  readonly version: number;
  /** ISO 8601 of `locked_at`. */
  readonly createdAt: string;
  /** Entry id of the brief this one supersedes, if any. */
  readonly supersedesEntryId?: string;
}

// --- Wire messages (webview ↔ host, all request/response unless noted) ----

/**
 * Bootstrap has no params — the host resolves the active requirement (or the
 * existing brief id for read-only re-open) from a module-level pending-holder
 * populated by the panel-open command. Mirrors
 * `consumePendingTestDesignerRequirement` exactly.
 */
export type BriefBootstrapParams = Record<string, never>;

export type BriefBootstrapResult =
  | {
      readonly ok: true;
      /** `'draft'` for a fresh composer; `'readonly'` for a saved brief. */
      readonly mode: 'draft' | 'readonly';
      readonly draft: ExecutionBriefDraft;
      readonly validation: BriefValidation;
      /** Convenience: pre-serialised markdown for the live preview pane. */
      readonly preview: string;
      readonly requirementUserId: string;
      readonly requirementTitle: string;
    }
  | {
      readonly ok: false;
      readonly reason: 'no-requirement' | 'no-brief' | 'no-project' | 'no-prd';
    };

export interface BriefEditSectionParams {
  readonly sectionId: BriefSectionId;
  readonly body: string;
}

export type BriefEditSectionResult =
  | {
      readonly ok: true;
      readonly draft: ExecutionBriefDraft;
      readonly validation: BriefValidation;
      readonly preview: string;
    }
  | {
      readonly ok: false;
      readonly reason: 'read-only-section' | 'locked' | 'unknown-section';
    };

export interface BriefEditListParams {
  readonly list: 'allowed' | 'forbidden';
  /** One glob per element. Trailing-slash directory shorthand is normalised host-side. */
  readonly globs: readonly string[];
}

export type BriefEditListResult =
  | {
      readonly ok: true;
      readonly draft: ExecutionBriefDraft;
      readonly validation: BriefValidation;
      readonly preview: string;
    }
  | { readonly ok: false; readonly reason: 'locked' };

export interface BriefSaveParams {
  readonly draft: ExecutionBriefDraft;
}

export type BriefSaveResult =
  | {
      readonly ok: true;
      readonly entryId: string;
      readonly briefId: string;
      readonly bodyUri: string;
    }
  | {
      readonly ok: false;
      readonly reason: 'validation' | 'locked';
      readonly errors: readonly string[];
    };

export interface BriefCopyPreviewParams {
  readonly markdown: string;
}

export interface BriefCopyPreviewResult {
  readonly ok: true;
  readonly bytesCopied: number;
}

/** One-way notification fired when the user cancels / closes the panel. */
export type BriefCancelParams = Record<string, never>;

// --- RequestType / NotificationType constants -----------------------------

export const BriefBootstrap: RequestType<BriefBootstrapParams, BriefBootstrapResult> = {
  method: 'brief/bootstrap',
};

export const BriefEditSection: RequestType<BriefEditSectionParams, BriefEditSectionResult> = {
  method: 'brief/editSection',
};

export const BriefEditList: RequestType<BriefEditListParams, BriefEditListResult> = {
  method: 'brief/editList',
};

export const BriefSave: RequestType<BriefSaveParams, BriefSaveResult> = {
  method: 'brief/save',
};

export const BriefCopyPreview: RequestType<BriefCopyPreviewParams, BriefCopyPreviewResult> = {
  method: 'brief/copyPreview',
};

export const BriefCancel: NotificationType<BriefCancelParams> = {
  method: 'brief/cancel',
};
