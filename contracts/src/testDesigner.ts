import type { NotificationType, RequestType } from 'vscode-messenger-common';

// --- Domain (shared between host + webview) -------------------------------
//
// CHUNK-08 (Test Designer specialist). Given an approved Requirement, runs a
// manual-prompt flow that produces:
//   1. Verification criteria attached to the Requirement payload's
//      `verificationCriteria` field (which is reserved in
//      contracts/src/memory.ts but never written by CHUNK-07).
//   2. A Test Specification stored as a `type='test-spec'` memory entry
//      with a markdown body on disk, linked from the Requirement via
//      `kind: 'has-test-spec'`.
//
// `contracts/src/memory.ts` is deliberately NOT extended for this chunk —
// `TestSpecPayload`'s minimum stable shape (`requirementId` + `scenarios`)
// is honoured via the cast-through pattern in MemoryStore (mirrors the PRD
// + Requirement layers). The richer fields below (`cases`, `openQuestions`,
// `confidence`) are CHUNK-08 extensions stored in the same row.

export interface VerificationCriterion {
  /** Stable id, unique within the requirement. e.g. "VC-REQ-002-01". */
  readonly id: string;
  /** Plain text criterion, one bullet's worth. */
  readonly text: string;
}

export interface TestCase {
  /** e.g. "T-REQ-002-01". */
  readonly id: string;
  /** Short title (the level-3 heading without the id prefix). */
  readonly title: string;
  /**
   * Flat list of bullet lines. May contain "Given:"/"When:"/"Then:" labels
   * as prose; we do NOT parse them out for MVP (spec §10 Risk 1).
   */
  readonly bullets: readonly string[];
}

/** Parser confidence carried through to the UI + persisted on the entry. */
export type TestSpecConfidence = 'high' | 'low' | 'raw';

/**
 * Message-passing shape for the Test Specification. The on-disk storage
 * splits this between `MemoryEntry` envelope fields (id/title/body/createdAt/
 * updatedAt) and the extension-field payload (cases/openQuestions/
 * confidence), with `scenarios[]` (canonical TestSpecPayload) populated
 * from `cases[]` for downstream consumers.
 */
export interface TestSpec {
  /** Memory entry id; e.g. "TS-REQ-002". Matches the row in memory_entries. */
  readonly id: string;
  /** UUID of the Requirement this spec verifies. */
  readonly requirementEntryId: string;
  /** User-visible requirement id; e.g. "REQ-002". */
  readonly requirementId: string;
  /** Human title — defaults to `Test spec for <requirement.title>`. */
  readonly title: string;
  /** Ordered list of test cases (CHUNK-08 canonical representation). */
  readonly cases: readonly TestCase[];
  /** Open questions returned by the AI (parsed from `## Open Questions`). */
  readonly openQuestions: readonly string[];
  /** The raw markdown body the AI returned, stored verbatim for audit. */
  readonly raw: string;
  /** Parser confidence at the moment of save. */
  readonly confidence: TestSpecConfidence;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/**
 * Lightweight projection of a Requirement passed to the webview on bootstrap.
 * Avoids dragging the full `Requirement` shape (which carries verification
 * fields the panel does not need to re-render).
 */
export interface RequirementSummary {
  readonly entryId: string;
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: 'functional' | 'non-functional';
  readonly priority: 'must' | 'should' | 'could';
  readonly sourcePrdSection: string;
}

/**
 * Lenient parser output. The webview shows the preview block; the host
 * re-parses `raw` on `commit` (spec §4: webview cannot be trusted).
 */
export interface TestDesignerParseResult {
  readonly confidence: TestSpecConfidence;
  readonly verificationCriteria: readonly VerificationCriterion[];
  readonly cases: readonly TestCase[];
  readonly openQuestions: readonly string[];
  /** Diagnostics surfaced to the UI (e.g. `'no-criteria-section'`). */
  readonly warnings: readonly string[];
}

// --- Wire messages (webview ↔ host, all request/response unless noted) ----

/**
 * Bootstrap has no params — the host resolves the active requirement from a
 * module-level pending-holder populated by the panel-open command (mirrors
 * `consumePendingDiscoverMode` in the Discover flow).
 */
export type TestDesignerBootstrapParams = Record<string, never>;

export type TestDesignerBootstrapResult =
  | {
      readonly ok: true;
      readonly requirement: RequirementSummary;
      readonly projectTitle: string;
      readonly prdSummary: string;
      /** Existing test-spec for this requirement, if any (overwrite prompt). */
      readonly existing: TestSpec | null;
    }
  | { readonly ok: false; readonly reason: 'no-requirement' | 'no-prd' | 'no-project' };

export interface TestDesignerGeneratePromptParams {
  readonly requirementEntryId: string;
}

export type TestDesignerGeneratePromptResult =
  | { readonly ok: true; readonly prompt: string }
  | { readonly ok: false; readonly reason: 'no-requirement' | 'no-prd' | 'no-project' };

export interface TestDesignerCopyPromptParams {
  readonly prompt: string;
}

export interface TestDesignerCopyPromptResult {
  readonly ok: true;
  readonly bytesCopied: number;
}

export interface TestDesignerPasteResultParams {
  readonly requirementEntryId: string;
  readonly raw: string;
}

export interface TestDesignerPasteResultResult {
  readonly ok: true;
  readonly parse: TestDesignerParseResult;
}

export interface TestDesignerCommitParams {
  readonly requirementEntryId: string;
  /** Raw markdown — host re-parses; webview's preview is advisory only. */
  readonly raw: string;
}

export type TestDesignerCommitResult =
  | {
      readonly ok: true;
      readonly testSpecId: string;
      readonly verificationCriteriaCount: number;
      readonly caseCount: number;
      readonly confidence: TestSpecConfidence;
    }
  | { readonly ok: false; readonly reason: string };

/** One-way notification fired when the user cancels / closes the panel. */
export type TestDesignerCancelParams = Record<string, never>;

// --- RequestType / NotificationType constants -----------------------------

export const TestDesignerBootstrap: RequestType<
  TestDesignerBootstrapParams,
  TestDesignerBootstrapResult
> = { method: 'testDesigner/bootstrap' };

export const TestDesignerGeneratePrompt: RequestType<
  TestDesignerGeneratePromptParams,
  TestDesignerGeneratePromptResult
> = { method: 'testDesigner/generatePrompt' };

export const TestDesignerCopyPrompt: RequestType<
  TestDesignerCopyPromptParams,
  TestDesignerCopyPromptResult
> = { method: 'testDesigner/copyPrompt' };

export const TestDesignerPasteResult: RequestType<
  TestDesignerPasteResultParams,
  TestDesignerPasteResultResult
> = { method: 'testDesigner/pasteResult' };

export const TestDesignerCommit: RequestType<
  TestDesignerCommitParams,
  TestDesignerCommitResult
> = { method: 'testDesigner/commit' };

export const TestDesignerCancel: NotificationType<TestDesignerCancelParams> = {
  method: 'testDesigner/cancel',
};
