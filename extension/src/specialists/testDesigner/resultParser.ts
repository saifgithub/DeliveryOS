import type {
  TestCase,
  TestDesignerParseResult,
  TestSpecConfidence,
  VerificationCriterion,
} from '@deliveryos/contracts';

export interface ParseResultOptions {
  /**
   * REQ-NNN this paste belongs to. Drives the deterministic id prefixes:
   *   - Verification criteria: `VC-<reqId>-<NN>`
   *   - Test cases:            `T-<reqId>-<NN>`
   */
  readonly requirementId: string;
}

/**
 * Lenient header-driven parser for the Test Designer AI response.
 *
 * Strategy (CHUNK-08 spec §2):
 *   1. Strip noisy preamble — skip lines until the first `^## ` (or `^# `).
 *   2. Split on `^## ` headers.
 *   3. Find the section whose heading contains "verification criteria"
 *      (case-insensitive); collect top-level `-` / `*` bullets as criteria.
 *   4. Find the section whose heading contains "test specification" or
 *      "test spec"; parse `^### ` subsections as `TestCase[]` — first line
 *      after the heading is the title (if heading lacks one), then bullets.
 *   5. Find the section whose heading contains "open questions"; collect
 *      bullets into `openQuestions`.
 *   6. Confidence:
 *      - `'high'`  — both criteria + cases present.
 *      - `'low'`   — exactly one of criteria/cases present.
 *      - `'raw'`   — neither found (treat the entire input as opaque).
 */
export function parseTestDesignerResult(
  raw: string,
  options: ParseResultOptions,
): TestDesignerParseResult {
  const warnings: string[] = [];
  const reqId = options.requirementId;

  const trimmed = stripPreamble(raw);
  if (trimmed.length === 0) {
    return {
      confidence: 'raw',
      verificationCriteria: [],
      cases: [],
      openQuestions: [],
      warnings: ['Empty paste — nothing to parse.'],
    };
  }

  const sections = splitSections(trimmed);
  if (sections.length === 0) {
    return {
      confidence: 'raw',
      verificationCriteria: [],
      cases: [],
      openQuestions: [],
      warnings: ['No `## ` headers found — stored as raw markdown.'],
    };
  }

  const criteriaSection = findSection(sections, (h) => h.toLowerCase().includes('verification criteria'));
  const specSection = findSection(sections, (h) => {
    const lower = h.toLowerCase();
    return lower.includes('test specification') || lower.includes('test spec');
  });
  const openSection = findSection(sections, (h) => h.toLowerCase().includes('open questions'));

  const verificationCriteria: VerificationCriterion[] = criteriaSection
    ? extractBullets(criteriaSection.body).map((text, i) => ({
        id: `VC-${reqId}-${pad2(i + 1)}`,
        text,
      }))
    : [];

  const cases: TestCase[] = specSection ? extractCases(specSection.body, reqId) : [];

  const openQuestions = openSection ? extractBullets(openSection.body) : [];

  if (!criteriaSection) warnings.push('No `## Verification Criteria` section found.');
  if (!specSection) warnings.push('No `## Test Specification` section found.');

  let confidence: TestSpecConfidence;
  if (criteriaSection && specSection) {
    confidence = 'high';
  } else if (criteriaSection || specSection) {
    confidence = 'low';
  } else {
    confidence = 'raw';
  }

  return {
    confidence,
    verificationCriteria,
    cases,
    openQuestions,
    warnings,
  };
}

// --- preamble stripping ----------------------------------------------------

/**
 * Drop everything before the first heading line. Models often prefix with
 * "Sure! Here are the tests:" or a code-fence wrapper.
 */
function stripPreamble(raw: string): string {
  const text = raw.replace(/^﻿/, '').trim();
  if (text.length === 0) return '';
  // If the whole thing is one fenced block, unwrap it.
  const fenceMatch = text.match(/^```(?:[a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)\n```\s*$/);
  const body = fenceMatch ? (fenceMatch[1] ?? '') : text;

  const lines = body.split(/\r?\n/);
  let firstHeading = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,6}\s+/.test(lines[i] ?? '')) {
      firstHeading = i;
      break;
    }
  }
  if (firstHeading === -1) return body.trim();
  return lines.slice(firstHeading).join('\n').trim();
}

// --- section splitter ------------------------------------------------------

interface Section {
  readonly heading: string;
  readonly body: string;
}

function splitSections(text: string): Section[] {
  const out: Section[] = [];
  const lines = text.split(/\r?\n/);

  let currentHeading: string | null = null;
  let currentBody: string[] = [];

  const flush = () => {
    if (currentHeading !== null) {
      out.push({ heading: currentHeading, body: currentBody.join('\n').trim() });
    }
  };

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.*)$/);
    if (headingMatch) {
      flush();
      currentHeading = (headingMatch[1] ?? '').trim();
      currentBody = [];
    } else if (currentHeading !== null) {
      currentBody.push(line);
    }
    // Lines before the first `## ` heading are ignored (level-1 title etc.)
  }
  flush();

  return out;
}

function findSection(sections: Section[], match: (heading: string) => boolean): Section | null {
  return sections.find((s) => match(s.heading)) ?? null;
}

// --- bullet extraction ----------------------------------------------------

/**
 * Collect top-level `-` / `*` / `+` bullets. Sub-bullets (indented) are
 * appended to the parent bullet's text with a separating space, so the
 * webview can show a one-liner per criterion without losing detail.
 */
function extractBullets(body: string): string[] {
  const lines = body.split(/\r?\n/);
  const out: string[] = [];
  let current: string | null = null;

  const isTopLevelBullet = (line: string) => /^[-*+]\s+/.test(line);
  const isIndentedBullet = (line: string) => /^\s+[-*+]\s+/.test(line);

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (line.length === 0) {
      if (current) {
        out.push(current.trim());
        current = null;
      }
      continue;
    }
    if (isTopLevelBullet(line)) {
      if (current) out.push(current.trim());
      current = line.replace(/^[-*+]\s+/, '');
    } else if (isIndentedBullet(line) && current) {
      current = `${current} ${line.replace(/^\s+[-*+]\s+/, '')}`;
    } else if (current && /^\s+\S/.test(line)) {
      // continuation line under a bullet
      current = `${current} ${line.trim()}`;
    } else {
      // non-bullet line; flush any open bullet
      if (current) {
        out.push(current.trim());
        current = null;
      }
    }
  }
  if (current) out.push(current.trim());

  return out.filter((b) => b.length > 0);
}

// --- test-case extraction -------------------------------------------------

/**
 * Parse a `## Test Specification` body into `TestCase[]`. Each test case is
 * a `### ` heading (id + title) followed by bullets. If the heading already
 * carries a `T-<reqId>-NN` id, we honour it; otherwise we assign the next
 * sequential id deterministically.
 */
function extractCases(body: string, reqId: string): TestCase[] {
  const lines = body.split(/\r?\n/);
  const cases: TestCase[] = [];

  let currentHeading: string | null = null;
  let currentBullets: string[] = [];

  const idPrefixRe = new RegExp(`^(T-${escapeRegExp(reqId)}-\\d{2,})\\s*[-:—]?\\s*(.*)$`, 'i');

  const flush = () => {
    if (currentHeading === null) return;
    const headingTrim = currentHeading.trim();
    let id: string;
    let title: string;
    const prefixMatch = headingTrim.match(idPrefixRe);
    if (prefixMatch) {
      id = prefixMatch[1]!.toUpperCase();
      title = (prefixMatch[2] ?? '').trim();
    } else {
      id = `T-${reqId}-${pad2(cases.length + 1)}`;
      title = headingTrim;
    }
    cases.push({
      id,
      title: title.length > 0 ? title : `Test case ${cases.length + 1}`,
      bullets: extractBullets(currentBullets.join('\n')),
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    const headingMatch = line.match(/^###\s+(.*)$/);
    if (headingMatch) {
      flush();
      currentHeading = (headingMatch[1] ?? '').trim();
      currentBullets = [];
    } else if (currentHeading !== null) {
      currentBullets.push(line);
    }
    // Lines before the first `### ` are ignored.
  }
  flush();

  return cases;
}

// --- helpers ---------------------------------------------------------------

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
