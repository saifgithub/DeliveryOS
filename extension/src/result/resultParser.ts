// CHUNK-12 § resultParser.ts — pure function, no I/O, no VS Code APIs.
// Parses a `result.md` markdown document into a structured ParsedResult.
// Imports RESULT_MD_SECTION_NAMES from briefMarkdown — single source of truth.

import { RESULT_MD_SECTION_NAMES } from '../brief/briefMarkdown';
import type { ClaimedFileChange, ParsedResult, ParseConfidence } from '@deliveryos/contracts';

// The 6 canonical section names from BRIEF_SCHEMA_VERSION 1.
// ['Summary of Changes', 'Files Changed', 'Tests Added/Updated', 'Tests Run', 'Risks', 'Unresolved Questions']
const CANONICAL_NAMES = RESULT_MD_SECTION_NAMES as readonly string[];

// Synonyms for lenient matching.
// Maps normalised synonym → canonical name.
const SYNONYMS: Readonly<Record<string, string>> = {
  'tests added or updated': 'Tests Added/Updated',
  'tests added/updated': 'Tests Added/Updated',
  'tests added': 'Tests Added/Updated',
  'tests updated': 'Tests Added/Updated',
  'files changed': 'Files Changed',
  'changed files': 'Files Changed',
  'summary of changes': 'Summary of Changes',
  'summary': 'Summary of Changes',
  'changes': 'Summary of Changes',
  'tests run': 'Tests Run',
  'risks': 'Risks',
  'risk': 'Risks',
  'unresolved questions': 'Unresolved Questions',
  'unresolved': 'Unresolved Questions',
  'questions': 'Unresolved Questions',
  'open questions': 'Unresolved Questions',
};

const HEADING_RE = /^#{1,3}\s+(?:\d+\.\s+)?(?<title>.+?)\s*$/;

function normaliseTitle(raw: string): string {
  return raw
    .replace(/\//g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function matchSection(line: string): string | null {
  const m = HEADING_RE.exec(line);
  if (!m?.groups) return null;
  const title = m.groups['title'];
  if (!title) return null;
  const norm = normaliseTitle(title);

  // Direct match (case-insensitive).
  for (const canonical of CANONICAL_NAMES) {
    if (normaliseTitle(canonical) === norm) return canonical;
  }

  // Synonym match.
  const fromSynonym = SYNONYMS[norm];
  if (fromSynonym) return fromSynonym;

  return null;
}

// List bullet patterns: -, *, or numbered (1. 2. etc.)
const BULLET_RE = /^(?:[-*]|\d+\.)\s+(.*)$/;

// Status tag patterns:
//   - path/to/file.ts (new)
//   - path/to/file.ts (modified)
//   - path/to/file.ts — modified
//   - path/to/file.ts: deleted   (colon immediately after path, then space + status)
const STATUS_SUFFIX_RE = /(?:\s+\((?<paren>new|modified|deleted|added)\)|\s+—\s*(?<dash>new|modified|deleted|added|changed)|:\s+(?<colon>new|modified|deleted|added|changed))\s*$/i;

function parseClaimedFileChange(line: string): ClaimedFileChange | null {
  const bulletMatch = BULLET_RE.exec(line.trim());
  const content = bulletMatch ? bulletMatch[1].trim() : line.trim();
  if (!content) return null;

  const statusMatch = STATUS_SUFFIX_RE.exec(content);
  let path = content;
  let rawStatus = 'unknown';

  if (statusMatch?.groups) {
    const s = statusMatch.groups['paren'] ?? statusMatch.groups['dash'] ?? statusMatch.groups['colon'] ?? '';
    rawStatus = s.toLowerCase();
    path = content.slice(0, statusMatch.index).trim();
  }

  // Strip backtick wrapping from path.
  path = path.replace(/^`|`$/g, '').trim();
  if (!path) return null;

  // Normalise status.
  let claimedStatus: ClaimedFileChange['claimedStatus'] = 'unknown';
  if (rawStatus === 'new' || rawStatus === 'added') claimedStatus = 'new';
  else if (rawStatus === 'modified' || rawStatus === 'changed') claimedStatus = 'modified';
  else if (rawStatus === 'deleted') claimedStatus = 'deleted';

  return { path, claimedStatus };
}

function parseFilesChangedSection(lines: string[]): ClaimedFileChange[] {
  const result: ClaimedFileChange[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Only process lines that look like list items or bare paths (not headings).
    if (/^#{1,6}\s/.test(trimmed)) continue;
    const change = parseClaimedFileChange(trimmed);
    if (change) result.push(change);
  }
  return result;
}

function parseListSection(lines: string[]): string[] {
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#{1,6}\s/.test(trimmed)) continue;
    const m = BULLET_RE.exec(trimmed);
    if (m) {
      result.push(m[1].trim());
    } else {
      // Bare text lines also count.
      result.push(trimmed);
    }
  }
  return result;
}

export function parseResultMd(rawText: string): ParsedResult {
  try {
    const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

    // Accumulate sections.
    const sectionLines: Map<string, string[]> = new Map();
    for (const name of CANONICAL_NAMES) {
      sectionLines.set(name, []);
    }

    let currentSection: string | null = null;

    for (const line of lines) {
      const matched = matchSection(line);
      if (matched !== null) {
        currentSection = matched;
        // Ensure the map has this entry (it already does, but guard anyway).
        if (!sectionLines.has(currentSection)) {
          sectionLines.set(currentSection, []);
        }
      } else if (currentSection) {
        sectionLines.get(currentSection)!.push(line);
      }
    }

    // Determine which sections were found and have content.
    const foundWithContent: string[] = [];
    const foundEmpty: string[] = [];
    const missing: string[] = [];

    for (const name of CANONICAL_NAMES) {
      const ls = sectionLines.get(name) ?? [];
      const hasContent = ls.some((l) => l.trim().length > 0);
      if (ls.length === 0 && !lines.some((l) => matchSection(l) === name)) {
        missing.push(name);
      } else if (hasContent) {
        foundWithContent.push(name);
      } else {
        foundEmpty.push(name);
      }
    }

    // Re-check which sections actually appeared as headings.
    const appearedSections = new Set<string>();
    for (const line of lines) {
      const m = matchSection(line);
      if (m) appearedSections.add(m);
    }

    const actualMissing = CANONICAL_NAMES.filter((n) => !appearedSections.has(n));
    const foundCount = appearedSections.size;

    // Confidence rubric:
    // high: all 6 found with >= 1 line of content
    // medium: 3-5 found, OR all 6 found but some empty
    // low: fewer than 3 found
    let confidence: ParseConfidence;
    if (foundCount === 6 && foundWithContent.length === 6) {
      confidence = 'high';
    } else if (foundCount >= 3) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    // Build sections object.
    const summaryLines = sectionLines.get('Summary of Changes') ?? [];
    const filesLines = sectionLines.get('Files Changed') ?? [];
    const testsAddedLines = sectionLines.get('Tests Added/Updated') ?? [];
    const testsRunLines = sectionLines.get('Tests Run') ?? [];
    const risksLines = sectionLines.get('Risks') ?? [];
    const questionsLines = sectionLines.get('Unresolved Questions') ?? [];

    const summaryText = summaryLines
      .join('\n')
      .trim();
    const filesChangedClaimed = parseFilesChangedSection(filesLines);
    const testsAdded = parseListSection(testsAddedLines);
    const testsRun = parseListSection(testsRunLines);
    const risks = parseListSection(risksLines);
    const questions = parseListSection(questionsLines);

    const sections: ParsedResult['sections'] = {};
    if (appearedSections.has('Summary of Changes')) {
      sections.summary = summaryText;
    }
    if (appearedSections.has('Files Changed')) {
      sections.filesChangedClaimed = filesChangedClaimed;
    }
    if (appearedSections.has('Tests Added/Updated')) {
      sections.testsAdded = testsAdded;
    }
    if (appearedSections.has('Tests Run')) {
      sections.testsRun = testsRun;
    }
    if (appearedSections.has('Risks')) {
      sections.risks = risks;
    }
    if (appearedSections.has('Unresolved Questions')) {
      sections.questions = questions;
    }

    return {
      confidence,
      sections,
      missingSections: actualMissing,
      rawText,
    };
  } catch {
    return {
      confidence: 'low',
      sections: {},
      missingSections: [...CANONICAL_NAMES],
      rawText,
    };
  }
}
