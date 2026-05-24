// CHUNK-09 § 6.1 + § 5.3 — validation gate run host-side before save.
// Cheap host-side checks; the canonical source-of-truth is `briefMarkdown`.
//
// Rules:
//   - Frontmatter required keys present (the parser already enforces this on
//     read; validate before serialise to surface webview-side errors).
//   - All 10 sections present with non-empty body (Section 5 may be empty;
//     warn). Section 9 body is the canonical template (validator strict).
//   - Allowed list non-empty.
//   - Every glob (Allowed + Forbidden) parses under picomatch.makeRe.
//   - No duplicate globs within a list (warn, not block).

import picomatch from 'picomatch';
import type { BriefValidation } from '@deliveryos/contracts';
import { BRIEF_SCHEMA_VERSION, BRIEF_SECTION_IDS, renderExpectedOutputSection, sectionName } from './briefMarkdown';
import type { ExecutionBrief } from './types';

export interface BriefValidationInput {
  readonly brief: ExecutionBrief;
}

const CANONICAL_EXPECTED_OUTPUT = renderExpectedOutputSection();
const SECTIONS_WITH_OPTIONAL_BODY = new Set(['existing-codebase-context']);

export function validate(brief: ExecutionBrief): BriefValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- Frontmatter ---
  const fm = brief.frontmatter;
  if (!fm.brief_id) errors.push('frontmatter.brief_id is required');
  if (fm.schema_version !== BRIEF_SCHEMA_VERSION) {
    errors.push(
      `frontmatter.schema_version must be ${BRIEF_SCHEMA_VERSION} (got ${fm.schema_version}).`,
    );
  }
  if (!fm.project_id) errors.push('frontmatter.project_id is required');
  if (!fm.requirement_id) errors.push('frontmatter.requirement_id is required');
  if (!fm.profile) errors.push('frontmatter.profile is required');
  if (!fm.created_at) errors.push('frontmatter.created_at is required');

  // --- Sections ---
  for (const id of BRIEF_SECTION_IDS) {
    const section = brief.sections[id];
    if (!section) {
      errors.push(`Section ${sectionName(id)} is missing.`);
      continue;
    }
    const trimmed = section.body.trim();
    if (trimmed === '' && !SECTIONS_WITH_OPTIONAL_BODY.has(id)) {
      if (id === 'allowed-changes' || id === 'forbidden-changes') {
        // Handled by the list-specific checks below.
      } else {
        errors.push(`Section ${section.number}. ${section.name} body must not be empty.`);
      }
    }
  }

  if (brief.sections['existing-codebase-context'].body.trim().length < 40) {
    warnings.push('Section 5 (Existing Codebase Context) looks short.');
  }

  // Section 9 must be the canonical Expected Output template.
  if (brief.sections['expected-output'].body.trim() !== CANONICAL_EXPECTED_OUTPUT.trim()) {
    errors.push(
      'Section 9 (Expected Output) is read-only and must match the canonical template.',
    );
  }

  // --- Allowed list ---
  if (brief.allowed.globs.length === 0) {
    errors.push('Section 7 (Allowed Changes) must contain at least one glob.');
  }
  for (const [i, glob] of brief.allowed.globs.entries()) {
    const err = validateGlob(glob, i + 1, 'Allowed');
    if (err) errors.push(err);
  }
  const allowedDupes = findDuplicates(brief.allowed.globs);
  for (const dupe of allowedDupes) {
    warnings.push(`Allowed glob "${dupe}" appears more than once.`);
  }

  // --- Forbidden list (may be empty) ---
  for (const [i, glob] of brief.forbidden.globs.entries()) {
    const err = validateGlob(glob, i + 1, 'Forbidden');
    if (err) errors.push(err);
  }
  const forbiddenDupes = findDuplicates(brief.forbidden.globs);
  for (const dupe of forbiddenDupes) {
    warnings.push(`Forbidden glob "${dupe}" appears more than once.`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

function validateGlob(
  glob: string,
  oneBasedIndex: number,
  list: 'Allowed' | 'Forbidden',
): string | null {
  if (glob.trim() === '') {
    return `${list} list line ${oneBasedIndex} is empty.`;
  }
  try {
    // picomatch.makeRe returns `false` (not a regex) for unparseable patterns
    // rather than throwing. Cover both paths.
    const re = picomatch.makeRe(glob);
    if (!re || !(re instanceof RegExp)) {
      return `${list} list line ${oneBasedIndex} ("${glob}") is not a valid glob.`;
    }
    return null;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return `${list} list line ${oneBasedIndex} ("${glob}") is not a valid glob: ${detail}.`;
  }
}

function findDuplicates(items: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const item of items) {
    if (seen.has(item)) dupes.add(item);
    else seen.add(item);
  }
  return [...dupes];
}
