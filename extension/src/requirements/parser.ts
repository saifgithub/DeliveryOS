import type {
  DecomposedParseResult,
  DecomposedRequirement,
  RequirementCategory,
  RequirementPriority,
} from '@deliveryos/contracts';

/**
 * Parse an AI-pasted decomposition response into `DecomposedRequirement[]`.
 *
 * Algorithm (per CHUNK-07 § 2):
 * 1. Strip the BEGIN_PRD/END_PRD sentinel block if the user accidentally
 *    pasted it back along with the response.
 * 2. Strip a single top-level ```json / ```yaml / ```md code-fence block; use
 *    its inner body as the candidate. Otherwise use the whole input.
 * 3. JSON attempt: accept both `[...]` and `{ requirements: [...] }` shapes.
 * 4. Markdown-table fallback: header row + separator row + data rows.
 * 5. On total failure return `{ ok: false, reason, raw }` so the host can
 *    render the manual-add fallback editor.
 */
export function parseDecomposed(text: string): DecomposedParseResult {
  const raw = text;
  const stripped = stripPrdSentinels(text).trim();
  if (stripped.length === 0) {
    return { ok: false, reason: 'Empty paste — nothing to parse.', raw };
  }

  const candidate = stripOuterFence(stripped) ?? stripped;

  const jsonResult = tryJson(candidate);
  if (jsonResult) {
    return { ok: true, mode: 'json', requirements: jsonResult };
  }

  const tableResult = tryMarkdownTable(candidate);
  if (tableResult) {
    return { ok: true, mode: 'markdown-table', requirements: tableResult };
  }

  return {
    ok: false,
    reason:
      'Could not parse as JSON or as a markdown table. Try cleaning the paste, or use the manual-add fallback.',
    raw,
  };
}

// --- sentinel + fence stripping -------------------------------------------

function stripPrdSentinels(text: string): string {
  const begin = text.indexOf('<!-- BEGIN_PRD -->');
  const end = text.indexOf('<!-- END_PRD -->');
  if (begin === -1 || end === -1 || end < begin) return text;
  return text.slice(0, begin) + text.slice(end + '<!-- END_PRD -->'.length);
}

/**
 * If `text` is exactly a single fenced code block (optionally with a
 * language tag), return the inner body. Otherwise return `null`.
 */
function stripOuterFence(text: string): string | null {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:[a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)\n```\s*$/);
  if (!fenceMatch) return null;
  return fenceMatch[1] ?? null;
}

// --- JSON attempt ---------------------------------------------------------

function tryJson(text: string): DecomposedRequirement[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  let rows: unknown;
  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { requirements?: unknown }).requirements)) {
    rows = (parsed as { requirements: unknown[] }).requirements;
  } else {
    return null;
  }

  if (!Array.isArray(rows) || rows.length === 0) return null;

  const out: DecomposedRequirement[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const title = stringOrEmpty(r.title);
    if (title.trim().length === 0) continue;
    const warnings: string[] = [];
    out.push({
      title: title.trim(),
      description: stringOrEmpty(r.description),
      category: coerceCategory(r.category ?? r.type, warnings),
      priority: coercePriority(r.priority, warnings),
      sourcePrdSection: stringOrEmpty(r.sourcePrdSection ?? r['source-prd-section']),
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  }
  return out.length > 0 ? out : null;
}

// --- Markdown-table attempt -----------------------------------------------

/**
 * Parse a GFM markdown table. Header row + separator row (---) + data rows.
 * Cells are mapped against the canonical column order:
 *   Title | Description | Category | Priority | Source PRD section
 * Column-name lookup is case-insensitive + tolerant of `type` vs `category`.
 */
function tryMarkdownTable(text: string): DecomposedRequirement[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 3) return null;

  // Locate the first line that looks like a header (starts and ends with |).
  let headerIdx = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    if (looksLikePipeRow(lines[i]) && looksLikeSeparatorRow(lines[i + 1])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return null;

  const header = splitPipeRow(lines[headerIdx]).map((c) => c.toLowerCase());
  const columnIndex: Record<keyof DecomposedRequirement, number> = {
    title: findColumn(header, ['title', 'name']),
    description: findColumn(header, ['description', 'desc']),
    category: findColumn(header, ['category', 'type']),
    priority: findColumn(header, ['priority']),
    sourcePrdSection: findColumn(header, [
      'source prd section',
      'source',
      'prd section',
      'section',
    ]),
    warnings: -1,
  };
  if (columnIndex.title === -1) return null;

  const out: DecomposedRequirement[] = [];
  for (let i = headerIdx + 2; i < lines.length; i++) {
    if (!looksLikePipeRow(lines[i])) break;
    const cells = splitPipeRow(lines[i]);
    const title = (cells[columnIndex.title] ?? '').trim();
    if (title.length === 0) continue;
    const warnings: string[] = [];
    out.push({
      title,
      description: (cells[columnIndex.description] ?? '').trim(),
      category: coerceCategory(cells[columnIndex.category], warnings),
      priority: coercePriority(cells[columnIndex.priority], warnings),
      sourcePrdSection: (cells[columnIndex.sourcePrdSection] ?? '').trim(),
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  }
  return out.length > 0 ? out : null;
}

function looksLikePipeRow(line: string): boolean {
  return line.startsWith('|') && line.endsWith('|') && line.includes('|');
}

function looksLikeSeparatorRow(line: string): boolean {
  if (!looksLikePipeRow(line)) return false;
  const cells = splitPipeRow(line);
  return cells.every((c) => /^:?-{3,}:?$/.test(c.replace(/\s+/g, '')));
}

function splitPipeRow(line: string): string[] {
  // Trim leading/trailing pipes, then split on | (no escape-handling for MVP).
  const inner = line.replace(/^\|/, '').replace(/\|$/, '');
  return inner.split('|').map((c) => c.trim());
}

function findColumn(header: string[], candidates: string[]): number {
  for (let i = 0; i < header.length; i++) {
    if (candidates.includes(header[i])) return i;
  }
  return -1;
}

// --- normalisation helpers ------------------------------------------------

function stringOrEmpty(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

function coerceCategory(v: unknown, warnings: string[]): RequirementCategory {
  const s = stringOrEmpty(v).trim().toLowerCase();
  if (s === 'functional' || s === 'non-functional') return s;
  if (s === 'nonfunctional' || s === 'non functional') return 'non-functional';
  if (s.length > 0) {
    warnings.push(`Unrecognised category "${s}" — defaulted to "functional".`);
  }
  return 'functional';
}

function coercePriority(v: unknown, warnings: string[]): RequirementPriority {
  const s = stringOrEmpty(v).trim().toLowerCase();
  if (s === 'must' || s === 'should' || s === 'could') return s;
  if (s === 'must have' || s === 'must-have') return 'must';
  if (s === 'should have' || s === 'should-have') return 'should';
  if (s === 'could have' || s === 'could-have') return 'could';
  if (s.length > 0) {
    warnings.push(`Unrecognised priority "${s}" — defaulted to "should".`);
  }
  return 'should';
}
