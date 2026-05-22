// CHUNK-03 § 2.6a + § 5.5 — canonical link-kind vocabulary.
// Single source of truth across all chunks. Webview-safe (no runtime imports).
// Downstream chunks import `LINK_KINDS` / `LinkKind` as constants — never as
// string literals — so a typo becomes a TypeScript error.

export const LINK_KINDS = [
  'derives-from',
  'verifies',
  'evaluates',
  'produced',
  'supersedes',
  'includes',
  'reworks',
  'has-test-spec',
  'derived-from-verification',
  'releases',
] as const;

export type LinkKind = (typeof LINK_KINDS)[number];

export interface MemoryLink {
  readonly fromId: string;
  readonly toId: string;
  readonly kind: LinkKind;
}
