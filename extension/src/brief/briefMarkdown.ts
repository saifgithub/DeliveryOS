// CHUNK-09 § 4 + § 5 + § 6.3 — canonical Execution Brief markdown.
// THIS IS THE SINGLE SOURCE OF TRUTH for parse, serialise, schema constants,
// and the `result.md` section-name list shared with CHUNK-12.
//
// CHUNK-10 (profile rendering), CHUNK-12 (`result.md` parsing), CHUNK-13
// (Allowed/Forbidden diff) MUST import from here. No re-implementation.
//
// Pure module: no `vscode`, no `fs`, no `picomatch`. Glob *validation* is
// CHUNK-09 § 5.2's `briefValidator`'s job; this module only normalises the
// trailing-slash directory shorthand and shape.

import type {
  BriefFrontmatter,
  BriefMetaLines,
  BriefSection,
  ExecutionBrief,
} from './types';
import type { BriefSectionId } from '@deliveryos/contracts';

// --- Frozen schema constants ---------------------------------------------

export const BRIEF_SCHEMA_VERSION = 1 as const;

/**
 * Canonical section names in numeric order. Index 0 = Section 1 ("Objective").
 * Frozen at v1. Downstream chunks import this list; never inlined.
 */
export const BRIEF_SECTION_NAMES = [
  'Objective',
  'Approved Requirement',
  'Business Intent',
  'Approved Design Context',
  'Existing Codebase Context',
  'Test-First Specification',
  'Allowed Changes',
  'Forbidden Changes',
  'Expected Output',
  'Completion Criteria',
] as const satisfies readonly string[];

export type BriefSectionName = (typeof BRIEF_SECTION_NAMES)[number];

const SECTION_ID_BY_NUMBER: Readonly<Record<number, BriefSectionId>> = {
  1: 'objective',
  2: 'approved-requirement',
  3: 'business-intent',
  4: 'approved-design-context',
  5: 'existing-codebase-context',
  6: 'test-first-specification',
  7: 'allowed-changes',
  8: 'forbidden-changes',
  9: 'expected-output',
  10: 'completion-criteria',
};

const SECTION_NUMBER_BY_ID: Readonly<Record<BriefSectionId, number>> = {
  objective: 1,
  'approved-requirement': 2,
  'business-intent': 3,
  'approved-design-context': 4,
  'existing-codebase-context': 5,
  'test-first-specification': 6,
  'allowed-changes': 7,
  'forbidden-changes': 8,
  'expected-output': 9,
  'completion-criteria': 10,
};

export const BRIEF_SECTION_IDS: readonly BriefSectionId[] = [
  'objective',
  'approved-requirement',
  'business-intent',
  'approved-design-context',
  'existing-codebase-context',
  'test-first-specification',
  'allowed-changes',
  'forbidden-changes',
  'expected-output',
  'completion-criteria',
];

/**
 * Canonical section names CHUNK-12's `result.md` parser expects, and that
 * CHUNK-09 embeds verbatim into every brief's Section 9 ("Expected Output").
 * Frozen alongside `BRIEF_SCHEMA_VERSION`.
 */
export const RESULT_MD_SECTION_NAMES = [
  'Summary of Changes',
  'Files Changed',
  'Tests Added/Updated',
  'Tests Run',
  'Risks',
  'Unresolved Questions',
] as const satisfies readonly string[];

export const CANONICAL_BRIEF_TITLE = 'DeliveryOS Execution Brief';

/** Sentinel rendered when the Forbidden list is empty, per spec § 5.3. */
export const EMPTY_FORBIDDEN_SENTINEL = '- (none)';

// --- Errors ---------------------------------------------------------------

export type BriefMarkdownParseErrorKind =
  | 'missing-frontmatter'
  | 'schema-mismatch'
  | 'missing-section'
  | 'out-of-order'
  | 'bad-section-name'
  | 'duplicate-section'
  | 'invalid-yaml'
  | 'missing-required-key';

export class BriefMarkdownParseError extends Error {
  readonly kind: BriefMarkdownParseErrorKind;
  readonly detail?: string;
  constructor(kind: BriefMarkdownParseErrorKind, message: string, detail?: string) {
    super(message);
    this.name = 'BriefMarkdownParseError';
    this.kind = kind;
    if (detail !== undefined) this.detail = detail;
  }
}

// --- Public API -----------------------------------------------------------

export interface BriefMarkdownParseResult {
  readonly brief: ExecutionBrief;
  readonly warnings: readonly string[];
}

/**
 * Parse a brief markdown document into an `ExecutionBrief`. Strict on schema
 * (section ids, names, order, frontmatter keys); lenient on whitespace,
 * CRLF endings, and H1 case (warns).
 */
export function parse(md: string): BriefMarkdownParseResult {
  const warnings: string[] = [];

  // Normalise CRLF → LF (lenient; warn).
  let text = md;
  if (text.includes('\r\n')) {
    warnings.push('crlf-normalised');
    text = text.replace(/\r\n/g, '\n');
  }
  if (text.includes('\r')) {
    text = text.replace(/\r/g, '\n');
  }

  // Frontmatter — required between two `---` lines at the very top.
  const frontmatter = parseFrontmatter(text);
  const restAfterFrontmatter = text.slice(frontmatter.consumed);

  // H1 title — required, lenient on case.
  const { title, warnings: titleWarnings, rest: afterTitle } = parseTitle(
    restAfterFrontmatter,
  );
  warnings.push(...titleWarnings);

  // Meta lines (`Profile:`, `Project:`, `Requirement:`) before first H2 — optional.
  const { meta, rest: afterMeta } = parseMetaLines(afterTitle);

  // Sections — strict on numeric order, names, no dupes.
  const sections = parseSections(afterMeta);

  const allowedGlobs = extractListGlobs(sections.byId['allowed-changes'].body);
  const forbiddenGlobs = extractForbiddenGlobs(
    sections.byId['forbidden-changes'].body,
  );

  const brief: ExecutionBrief = {
    frontmatter: frontmatter.value,
    title,
    metaLines: meta,
    sections: sections.byId,
    allowed: { kind: 'allowed', globs: allowedGlobs },
    forbidden: { kind: 'forbidden', globs: forbiddenGlobs },
  };

  return { brief, warnings };
}

/**
 * Cheap regex-based scan for Sections 7 + 8 only. Does NOT require valid
 * frontmatter — CHUNK-13's runtime adapter calls this against
 * `.deliveryos-handoff/current-execution-brief.md`, which may have been edited.
 */
export function parseAllowedForbidden(md: string): {
  readonly allowed: readonly string[];
  readonly forbidden: readonly string[];
} {
  const text = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const allowedBody = extractSectionBody(text, 7, 'Allowed Changes');
  const forbiddenBody = extractSectionBody(text, 8, 'Forbidden Changes');
  return {
    allowed: allowedBody === null ? [] : extractListGlobs(allowedBody),
    forbidden:
      forbiddenBody === null ? [] : extractForbiddenGlobs(forbiddenBody),
  };
}

/**
 * Render an `ExecutionBrief` to its canonical markdown form. Deterministic:
 * `serialise(parse(serialise(brief))) === serialise(brief)` byte-for-byte.
 */
export function serialise(brief: ExecutionBrief): string {
  const parts: string[] = [];
  parts.push(renderFrontmatter(brief.frontmatter));
  parts.push(`# ${CANONICAL_BRIEF_TITLE}`);
  parts.push('');
  parts.push(`Profile: ${brief.metaLines.profile}`);
  parts.push(`Project: ${brief.metaLines.project}`);
  parts.push(`Requirement: ${brief.metaLines.requirement}`);
  parts.push('');
  for (let n = 1; n <= 10; n++) {
    const id = SECTION_ID_BY_NUMBER[n];
    const section = brief.sections[id];
    parts.push(`## ${n}. ${BRIEF_SECTION_NAMES[n - 1]}`);
    parts.push('');
    parts.push(section.body.trimEnd());
    parts.push('');
  }
  // Trim trailing blank duplicates → exactly one terminating newline.
  let out = parts.join('\n');
  out = out.replace(/\n+$/, '\n');
  if (!out.endsWith('\n')) out += '\n';
  return out;
}

/**
 * Section 9 body template embedded verbatim by `serialise()` for any
 * brief whose `sections['expected-output'].body` is empty or
 * equals the canonical template. CHUNK-12's parser keys off the same
 * `RESULT_MD_SECTION_NAMES` constant.
 */
export function renderExpectedOutputSection(): string {
  const lines: string[] = [];
  lines.push(
    'Your `result.md` MUST contain exactly the following six H2 sections, ' +
      'in this order:',
  );
  lines.push('');
  for (const name of RESULT_MD_SECTION_NAMES) {
    lines.push(`### ${name}`);
    lines.push(EXPECTED_OUTPUT_INSTRUCTIONS[name]);
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

const EXPECTED_OUTPUT_INSTRUCTIONS: Readonly<
  Record<(typeof RESULT_MD_SECTION_NAMES)[number], string>
> = {
  'Summary of Changes':
    'One short paragraph describing what was changed and why.',
  'Files Changed':
    'Bulleted list of every file the run created, modified, or deleted, in the form `path/to/file.ext`.',
  'Tests Added/Updated':
    'Bulleted list of new or modified test files, with one line per added test case.',
  'Tests Run':
    'Bulleted list of the test invocations executed and their pass/fail counts.',
  Risks:
    'Bulleted list of risks introduced by this change (regressions, untested edges, perf concerns).',
  'Unresolved Questions':
    'Bulleted list of decisions deferred or assumptions made that the human should review.',
};

// --- Frontmatter ----------------------------------------------------------

interface FrontmatterParseOutcome {
  readonly value: BriefFrontmatter;
  /** Index in the original text where the closing `---\n` ends (start of body). */
  readonly consumed: number;
}

const REQUIRED_FRONTMATTER_KEYS = [
  'brief_id',
  'schema_version',
  'project_id',
  'requirement_id',
  'profile',
  'created_at',
] as const;

const OPTIONAL_FRONTMATTER_KEYS = ['test_spec_id', 'supersedes', 'locked_at'] as const;

function parseFrontmatter(text: string): FrontmatterParseOutcome {
  if (!text.startsWith('---\n')) {
    throw new BriefMarkdownParseError(
      'missing-frontmatter',
      'Brief markdown must start with `---\\n` frontmatter block.',
    );
  }
  const closeIdx = text.indexOf('\n---\n', 4);
  if (closeIdx === -1) {
    // Accept terminal `\n---` (no trailing newline after).
    const terminalIdx = text.indexOf('\n---', 4);
    if (terminalIdx === -1) {
      throw new BriefMarkdownParseError(
        'missing-frontmatter',
        'Frontmatter `---` closer not found.',
      );
    }
    const yamlBody = text.slice(4, terminalIdx);
    const fm = decodeYamlFrontmatter(yamlBody);
    return { value: fm, consumed: terminalIdx + '\n---'.length };
  }
  const yamlBody = text.slice(4, closeIdx);
  const fm = decodeYamlFrontmatter(yamlBody);
  return { value: fm, consumed: closeIdx + '\n---\n'.length };
}

/**
 * Minimal YAML decoder. The brief frontmatter is intentionally flat — every
 * key is a string-or-number scalar on its own line. Quotes are optional but
 * supported. Lines starting with `#` are skipped. No nested structures, no
 * lists. This keeps the parser dep-free.
 */
function decodeYamlFrontmatter(yaml: string): BriefFrontmatter {
  const fields: Record<string, string | number> = {};
  const lines = yaml.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon === -1) {
      throw new BriefMarkdownParseError(
        'invalid-yaml',
        `Frontmatter line lacks colon: ${JSON.stringify(line)}`,
      );
    }
    const key = line.slice(0, colon).trim();
    const value = unquoteScalar(line.slice(colon + 1).trim());
    fields[key] = value;
  }

  for (const key of REQUIRED_FRONTMATTER_KEYS) {
    if (!(key in fields)) {
      throw new BriefMarkdownParseError(
        'missing-required-key',
        `Frontmatter missing required key: ${key}`,
        key,
      );
    }
  }

  const schemaVersion = toNumber(fields.schema_version);
  if (schemaVersion !== BRIEF_SCHEMA_VERSION) {
    throw new BriefMarkdownParseError(
      'schema-mismatch',
      `Brief frontmatter schema_version ${schemaVersion} != ${BRIEF_SCHEMA_VERSION}.`,
      String(schemaVersion),
    );
  }

  const out: Record<string, unknown> = {
    brief_id: String(fields.brief_id),
    schema_version: BRIEF_SCHEMA_VERSION,
    project_id: String(fields.project_id),
    requirement_id: String(fields.requirement_id),
    profile: String(fields.profile),
    created_at: String(fields.created_at),
  };
  for (const optKey of OPTIONAL_FRONTMATTER_KEYS) {
    if (optKey in fields) {
      out[optKey] = String(fields[optKey]);
    }
  }
  return out as unknown as BriefFrontmatter;
}

function unquoteScalar(value: string): string | number {
  if (value === '') return '';
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (/^-?\d+$/.test(value)) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return value;
}

function toNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new BriefMarkdownParseError(
      'invalid-yaml',
      `Expected numeric value, got ${JSON.stringify(value)}`,
    );
  }
  return n;
}

/**
 * Render a brief frontmatter as a flat YAML block. Keys emitted in canonical
 * order; optional keys omitted when absent. Strings always quoted (matches
 * the round-trip contract — parse strips quotes, serialise re-adds them).
 */
function renderFrontmatter(fm: BriefFrontmatter): string {
  const lines: string[] = ['---'];
  lines.push(`brief_id: ${quoteScalar(fm.brief_id)}`);
  lines.push(`schema_version: ${fm.schema_version}`);
  lines.push(`project_id: ${quoteScalar(fm.project_id)}`);
  lines.push(`requirement_id: ${quoteScalar(fm.requirement_id)}`);
  if (fm.test_spec_id !== undefined) {
    lines.push(`test_spec_id: ${quoteScalar(fm.test_spec_id)}`);
  }
  if (fm.supersedes !== undefined) {
    lines.push(`supersedes: ${quoteScalar(fm.supersedes)}`);
  }
  lines.push(`profile: ${quoteScalar(fm.profile)}`);
  lines.push(`created_at: ${quoteScalar(fm.created_at)}`);
  if (fm.locked_at !== undefined) {
    lines.push(`locked_at: ${quoteScalar(fm.locked_at)}`);
  }
  lines.push('---');
  return lines.join('\n');
}

function quoteScalar(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

// --- Title + meta lines ---------------------------------------------------

function parseTitle(text: string): {
  readonly title: string;
  readonly warnings: readonly string[];
  readonly rest: string;
} {
  // Skip leading blank lines (lenient).
  const trimmed = text.replace(/^\n+/, '');
  if (!trimmed.startsWith('# ')) {
    throw new BriefMarkdownParseError(
      'missing-section',
      'Brief markdown missing H1 title line.',
    );
  }
  const nl = trimmed.indexOf('\n');
  const headerLine = (nl === -1 ? trimmed : trimmed.slice(0, nl)).trimEnd();
  const headerText = headerLine.slice(2);
  const warnings: string[] = [];
  if (headerText !== CANONICAL_BRIEF_TITLE) {
    if (headerText.toLowerCase() === CANONICAL_BRIEF_TITLE.toLowerCase()) {
      warnings.push('h1-case-mismatch');
    } else {
      throw new BriefMarkdownParseError(
        'bad-section-name',
        `H1 title must be "${CANONICAL_BRIEF_TITLE}", got ${JSON.stringify(headerText)}.`,
      );
    }
  }
  const rest = nl === -1 ? '' : trimmed.slice(nl + 1);
  return { title: CANONICAL_BRIEF_TITLE, warnings, rest };
}

function parseMetaLines(text: string): {
  readonly meta: BriefMetaLines;
  readonly rest: string;
} {
  let profile = '(unspecified)';
  let project = '';
  let requirement = '';
  // Take lines until we hit the first `## ` (H2).
  const lines = text.split('\n');
  let consumedLines = 0;
  for (const line of lines) {
    if (line.startsWith('## ')) break;
    consumedLines += 1;
    const match = /^(Profile|Project|Requirement):\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    const [, key, value] = match;
    switch (key) {
      case 'Profile':
        profile = value;
        break;
      case 'Project':
        project = value;
        break;
      case 'Requirement':
        requirement = value;
        break;
    }
  }
  const rest = lines.slice(consumedLines).join('\n');
  return {
    meta: { profile, project, requirement },
    rest,
  };
}

// --- Sections -------------------------------------------------------------

interface SectionsParseOutcome {
  readonly byId: Readonly<Record<BriefSectionId, BriefSection>>;
}

const SECTION_HEADING_RE = /^##\s+(\d+)\.\s+(.+?)\s*$/;

function parseSections(text: string): SectionsParseOutcome {
  // Walk the document line-by-line, slicing on H2 section boundaries.
  const lines = text.split('\n');
  type RawSection = {
    readonly number: number;
    readonly name: string;
    readonly bodyLines: string[];
  };
  const found: RawSection[] = [];
  let current: RawSection | null = null;
  for (const line of lines) {
    const match = SECTION_HEADING_RE.exec(line);
    if (match) {
      if (current) found.push(current);
      const number = Number(match[1]);
      current = { number, name: match[2], bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
    // Lines before the first H2 (already consumed by parseMetaLines) drop.
  }
  if (current) found.push(current);

  if (found.length === 0) {
    throw new BriefMarkdownParseError(
      'missing-section',
      'Brief markdown has no `## N. <name>` sections.',
    );
  }

  // Order + duplicates check.
  for (let i = 0; i < found.length; i++) {
    const expectedNumber = i + 1;
    const got = found[i];
    if (got.number !== expectedNumber) {
      // Could be out-of-order OR a missing section. Distinguish by membership.
      const numbers = found.map((s) => s.number);
      const seen = new Set(numbers);
      if (numbers.length !== new Set(numbers).size) {
        throw new BriefMarkdownParseError(
          'duplicate-section',
          `Duplicate section number ${got.number}.`,
        );
      }
      for (let n = 1; n <= 10; n++) {
        if (!seen.has(n)) {
          throw new BriefMarkdownParseError(
            'missing-section',
            `Brief missing required section ${n}. ${BRIEF_SECTION_NAMES[n - 1]}.`,
          );
        }
      }
      throw new BriefMarkdownParseError(
        'out-of-order',
        `Expected section ${expectedNumber}, got ${got.number}.`,
      );
    }
  }

  if (found.length !== 10) {
    throw new BriefMarkdownParseError(
      'missing-section',
      `Brief must contain all 10 sections, found ${found.length}.`,
    );
  }

  // Name check (strict canonical).
  for (let i = 0; i < 10; i++) {
    const expectedName = BRIEF_SECTION_NAMES[i];
    if (found[i].name !== expectedName) {
      throw new BriefMarkdownParseError(
        'bad-section-name',
        `Section ${i + 1} name must be "${expectedName}", got ${JSON.stringify(found[i].name)}.`,
      );
    }
  }

  // Build the typed map.
  const byId = {} as Record<BriefSectionId, BriefSection>;
  for (let i = 0; i < 10; i++) {
    const id = BRIEF_SECTION_IDS[i];
    const body = found[i].bodyLines.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
    byId[id] = {
      id,
      number: (i + 1) as BriefSection['number'],
      name: BRIEF_SECTION_NAMES[i],
      body,
    };
  }
  return { byId };
}

// --- Allowed / Forbidden lists -------------------------------------------

/**
 * Extract glob strings from a section body. Accepts:
 *   - bulleted lines (`-`, `*`, `+`)
 *   - bare lines (treated as bullets at parse time)
 *   - comment lines starting with `#` (skipped)
 *   - blank lines (skipped)
 * Normalises trailing-slash directory shorthand to `dir/**` per § 5.2.
 */
function extractListGlobs(body: string): readonly string[] {
  const out: string[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    let glob: string;
    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      glob = bullet[1].trim();
    } else {
      glob = line;
    }
    if (glob === '') continue;
    out.push(normaliseGlob(glob));
  }
  return out;
}

function extractForbiddenGlobs(body: string): readonly string[] {
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'));
  // Empty-Forbidden sentinel: a single `- (none)` (or `(none)` bare) ⇒ [].
  if (lines.length === 1) {
    const only = lines[0];
    const normalised = /^[-*+]\s+(.*)$/.exec(only)?.[1].trim() ?? only;
    if (normalised === '(none)') return [];
  }
  return extractListGlobs(body);
}

/**
 * Trailing-slash directory shorthand → `**` recursion. The single
 * normalisation site per spec § 5.2. Downstream (CHUNK-13) MUST NOT
 * expect to see `dir/` shorthand in the parsed arrays.
 */
function normaliseGlob(glob: string): string {
  if (glob.endsWith('/')) return `${glob}**`;
  return glob;
}

// --- Section-7/8 cheap extractor (parseAllowedForbidden path) ------------

function extractSectionBody(
  text: string,
  number: number,
  name: string,
): string | null {
  const headingRe = new RegExp(
    `^##\\s+${number}\\.\\s+${escapeRegExp(name)}\\s*$`,
    'm',
  );
  const startMatch = headingRe.exec(text);
  if (!startMatch) return null;
  const afterHeadingIdx = startMatch.index + startMatch[0].length;
  const rest = text.slice(afterHeadingIdx);
  // Next H2 (or end of doc) bounds the section body.
  const nextH2 = /^##\s+\d+\.\s+/m.exec(rest);
  const body = nextH2 ? rest.slice(0, nextH2.index) : rest;
  return body.replace(/^\n+/, '').replace(/\n+$/, '');
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- Section-number helpers exported for builders/validators -------------

export function sectionNumber(id: BriefSectionId): number {
  return SECTION_NUMBER_BY_ID[id];
}

export function sectionId(number: number): BriefSectionId | null {
  return SECTION_ID_BY_NUMBER[number] ?? null;
}

export function sectionName(id: BriefSectionId): string {
  return BRIEF_SECTION_NAMES[SECTION_NUMBER_BY_ID[id] - 1];
}
