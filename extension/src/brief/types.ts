// CHUNK-09 § 6.1 — extension-host-internal types for the Execution Brief.
// The wire-safe projection lives in `contracts/src/brief.ts` as
// `ExecutionBriefDraft`. The host types here carry parser warnings and the
// strict union types over `number` that the wire form widens for transport.

import type { BriefFrontmatterDraft, BriefSectionId } from '@deliveryos/contracts';

export type { BriefSectionId } from '@deliveryos/contracts';

export interface BriefSection {
  readonly id: BriefSectionId;
  readonly number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  /** Matches `BRIEF_SECTION_NAMES[number - 1]`. */
  readonly name: string;
  /** Raw markdown body of the section (sans heading). */
  readonly body: string;
}

export interface BriefAllowedList {
  readonly kind: 'allowed';
  readonly globs: readonly string[];
}

export interface BriefForbiddenList {
  readonly kind: 'forbidden';
  readonly globs: readonly string[];
}

export type BriefFrontmatter = BriefFrontmatterDraft;

export interface BriefMetaLines {
  readonly profile: string;
  readonly project: string;
  readonly requirement: string;
}

/**
 * Host-side richer brief shape. Used inside the briefMarkdown parser +
 * briefBuilder. Convert to `ExecutionBriefDraft` (contracts) before sending
 * to the webview.
 */
export interface ExecutionBrief {
  readonly frontmatter: BriefFrontmatter;
  /** Always `'DeliveryOS Execution Brief'` on serialise; lenient on parse. */
  readonly title: string;
  readonly metaLines: BriefMetaLines;
  readonly sections: Readonly<Record<BriefSectionId, BriefSection>>;
  /** Parsed mirror of sections['allowed-changes'].body. */
  readonly allowed: BriefAllowedList;
  /** Parsed mirror of sections['forbidden-changes'].body. */
  readonly forbidden: BriefForbiddenList;
}
