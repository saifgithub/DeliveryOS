import type { DecomposedRequirement, RequirementCategory, RequirementPriority } from '@deliveryos/contracts';

export interface EditedRequirement {
  readonly id: string;
  readonly patch: {
    readonly title?: string;
    readonly description?: string;
    readonly category?: RequirementCategory;
    readonly priority?: RequirementPriority;
    readonly sourcePrdSection?: string;
  };
}

export interface DeletedRequirement {
  readonly id: string;
}

export type ChangeRequestParseResult =
  | {
      readonly ok: true;
      readonly added: readonly DecomposedRequirement[];
      readonly edited: readonly EditedRequirement[];
      readonly deleted: readonly DeletedRequirement[];
      readonly warnings: readonly string[];
    }
  | { readonly ok: false; readonly reason: string; readonly raw: string };

/**
 * Parse an AI-pasted change-request response into added / edited / deleted
 * requirement mutations.
 *
 * Algorithm:
 * 1. Strip all sentinel blocks (BEGIN_PRD, BEGIN_REQUIREMENTS,
 *    BEGIN_CHANGE_REQUEST) if accidentally pasted back.
 * 2. Strip a single outer ```json code fence.
 * 3. Parse JSON with shape { added, edited, deleted }.
 * 4. Validate each sub-array, collecting per-row warnings.
 */
export function parseChangeRequest(text: string): ChangeRequestParseResult {
  const raw = text;
  let stripped = stripAllSentinels(text).trim();
  if (stripped.length === 0) {
    return { ok: false, reason: 'Empty paste — nothing to parse.', raw };
  }

  const candidate = stripOuterFence(stripped) ?? stripped;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return {
      ok: false,
      reason:
        'Could not parse as JSON. Make sure the AI returned a single ```json code block with "added", "edited", and "deleted" arrays.',
      raw,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'JSON must be an object with "added", "edited", "deleted" keys.', raw };
  }

  const obj = parsed as Record<string, unknown>;
  const allWarnings: string[] = [];

  const added = parseAddedRows(obj.added, allWarnings);
  const edited = parseEditedRows(obj.edited, allWarnings);
  const deleted = parseDeletedRows(obj.deleted, allWarnings);

  return { ok: true, added, edited, deleted, warnings: allWarnings };
}

// --- Sentinel stripping -----------------------------------------------------

function stripSentinel(text: string, begin: string, end: string): string {
  const b = text.indexOf(begin);
  const e = text.indexOf(end);
  if (b === -1 || e === -1 || e < b) return text;
  return text.slice(0, b) + text.slice(e + end.length);
}

function stripAllSentinels(text: string): string {
  let t = stripSentinel(text, '<!-- BEGIN_PRD -->', '<!-- END_PRD -->');
  t = stripSentinel(t, '<!-- BEGIN_REQUIREMENTS -->', '<!-- END_REQUIREMENTS -->');
  t = stripSentinel(t, '<!-- BEGIN_CHANGE_REQUEST -->', '<!-- END_CHANGE_REQUEST -->');
  return t;
}

function stripOuterFence(text: string): string | null {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:[a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)\n```\s*$/);
  return m ? (m[1] ?? null) : null;
}

// --- Sub-array parsers -------------------------------------------------------

function parseAddedRows(raw: unknown, warnings: string[]): DecomposedRequirement[] {
  if (!Array.isArray(raw)) return [];
  const out: DecomposedRequirement[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const title = str(r.title).trim();
    if (!title) continue;
    const rowWarnings: string[] = [];
    out.push({
      title,
      description: str(r.description),
      category: coerceCategory(r.category ?? r.type, rowWarnings),
      priority: coercePriority(r.priority, rowWarnings),
      sourcePrdSection: str(r.sourcePrdSection ?? r['source-prd-section']),
      ...(rowWarnings.length > 0 ? { warnings: rowWarnings } : {}),
    });
    warnings.push(...rowWarnings);
  }
  return out;
}

function parseEditedRows(raw: unknown, warnings: string[]): EditedRequirement[] {
  if (!Array.isArray(raw)) return [];
  const out: EditedRequirement[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = str(r.id).trim().toUpperCase();
    if (!id.match(/^REQ-\d+$/)) {
      if (id) warnings.push(`Skipped edited row with invalid id "${id}" — expected "REQ-NNN".`);
      continue;
    }
    const patchFields: {
      title?: string;
      description?: string;
      category?: RequirementCategory;
      priority?: RequirementPriority;
      sourcePrdSection?: string;
    } = {};
    if (r.title !== undefined) patchFields.title = str(r.title);
    if (r.description !== undefined) patchFields.description = str(r.description);
    if (r.category !== undefined) {
      const rowW: string[] = [];
      patchFields.category = coerceCategory(r.category, rowW);
      warnings.push(...rowW);
    }
    if (r.priority !== undefined) {
      const rowW: string[] = [];
      patchFields.priority = coercePriority(r.priority, rowW);
      warnings.push(...rowW);
    }
    if (r.sourcePrdSection !== undefined) patchFields.sourcePrdSection = str(r.sourcePrdSection);
    out.push({ id, patch: patchFields });
  }
  return out;
}

function parseDeletedRows(raw: unknown, _warnings: string[]): DeletedRequirement[] {
  if (!Array.isArray(raw)) return [];
  const out: DeletedRequirement[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = str(r.id).trim().toUpperCase();
    if (id.match(/^REQ-\d+$/)) {
      out.push({ id });
    }
  }
  return out;
}

// --- Coercion helpers (mirrors parser.ts) -----------------------------------

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

function coerceCategory(v: unknown, warnings: string[]): RequirementCategory {
  const s = str(v).trim().toLowerCase();
  if (s === 'functional' || s === 'non-functional') return s;
  if (s === 'nonfunctional' || s === 'non functional') return 'non-functional';
  if (s.length > 0) warnings.push(`Unrecognised category "${s}" — defaulted to "functional".`);
  return 'functional';
}

function coercePriority(v: unknown, warnings: string[]): RequirementPriority {
  const s = str(v).trim().toLowerCase();
  if (s === 'must' || s === 'should' || s === 'could') return s;
  if (s === 'must have' || s === 'must-have') return 'must';
  if (s === 'should have' || s === 'should-have') return 'should';
  if (s === 'could have' || s === 'could-have') return 'could';
  if (s.length > 0) warnings.push(`Unrecognised priority "${s}" — defaulted to "should".`);
  return 'should';
}
