import {
  PRD_SECTION_IDS,
  type DraftPrd,
  type PrdParseReport,
  type PrdSection,
  type PrdSectionId,
} from '@deliveryos/contracts';

export { PRD_SECTION_IDS };

export const PRD_SECTION_DEFINITIONS: Record<
  PrdSectionId,
  { readonly id: PrdSectionId; readonly title: string; readonly order: number; readonly promptHint: string }
> = {
  problem: {
    id: 'problem',
    title: 'Problem',
    order: 1,
    promptHint:
      'What user or business problem does this product solve? Be specific about who hurts and how.',
  },
  users: {
    id: 'users',
    title: 'Users',
    order: 2,
    promptHint:
      'Primary and secondary users. For each, list role, context, and pain points being addressed.',
  },
  goals: {
    id: 'goals',
    title: 'Goals',
    order: 3,
    promptHint:
      'Product goals (3–8 bullets). Each goal should be outcome-focused, not feature-focused.',
  },
  'non-goals': {
    id: 'non-goals',
    title: 'Non-Goals',
    order: 4,
    promptHint:
      'What this product is explicitly NOT trying to be. List comparable tools we are not replacing.',
  },
  constraints: {
    id: 'constraints',
    title: 'Constraints',
    order: 5,
    promptHint:
      'Hard constraints (technical, regulatory, time, budget) the build must respect.',
  },
  assumptions: {
    id: 'assumptions',
    title: 'Assumptions',
    order: 6,
    promptHint:
      'What we are taking as given. If any of these prove false, the PRD must be revisited.',
  },
  risks: {
    id: 'risks',
    title: 'Risks',
    order: 7,
    promptHint:
      'Key risks with a 1-line mitigation each. Cover technical, market, dependency, and execution risk.',
  },
  'success-criteria': {
    id: 'success-criteria',
    title: 'Success Criteria',
    order: 8,
    promptHint:
      'Observable, measurable outcomes that mean the product has succeeded. Tie back to Goals.',
  },
} as const;

// Alias map: normalised heading text → canonical section id.
// Normalisation: lowercase, strip leading digits+period, strip punctuation, collapse whitespace.
const ALIAS_MAP: Record<string, PrdSectionId> = {
  problem: 'problem',
  'problem statement': 'problem',
  users: 'users',
  'target users': 'users',
  'user personas': 'users',
  personas: 'users',
  goals: 'goals',
  goal: 'goals',
  objectives: 'goals',
  objective: 'goals',
  'non-goals': 'non-goals',
  'non goals': 'non-goals',
  'nongoals': 'non-goals',
  'out of scope': 'non-goals',
  'out-of-scope': 'non-goals',
  'not in scope': 'non-goals',
  constraints: 'constraints',
  constraint: 'constraints',
  assumptions: 'assumptions',
  assumption: 'assumptions',
  risks: 'risks',
  risk: 'risks',
  'risks and mitigations': 'risks',
  'risks mitigations': 'risks',
  'success criteria': 'success-criteria',
  'success-criteria': 'success-criteria',
  'acceptance criteria': 'success-criteria',
  'definition of success': 'success-criteria',
  'measures of success': 'success-criteria',
  kpis: 'success-criteria',
  metrics: 'success-criteria',
};

function normaliseHeading(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^#+\s*/, '')           // strip leading # markers
    .replace(/^\d+\.\s*/, '')        // strip leading "3. "
    .replace(/[^a-z0-9\s-]/g, ' ')  // replace non-alphanumeric (except hyphens) with space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lenient parser. Walks `##` headings, normalises, matches via alias table.
 * Skips headings inside triple-backtick fences.
 * Missing sections get empty body; unrecognised headings are recorded in the report.
 */
export function parsePrdMarkdown(
  raw: string,
  _projectTitle: string,
): { sections: PrdSection[]; report: PrdParseReport } {
  const lines = raw.split('\n');
  const accumulated: Partial<Record<PrdSectionId, string>> = {};
  const unmatchedHeadings: string[] = [];

  let fenceDepth = 0;
  let currentId: PrdSectionId | null = null;
  let currentBodyLines: string[] = [];

  function flush(): void {
    if (currentId !== null) {
      accumulated[currentId] = (accumulated[currentId] ?? '') + currentBodyLines.join('\n');
    }
    currentBodyLines = [];
  }

  for (const line of lines) {
    // Track triple-backtick fence state.
    if (line.trimStart().startsWith('```')) {
      fenceDepth = fenceDepth === 0 ? 1 : 0;
    }

    if (fenceDepth > 0) {
      // Inside a fence: accumulate as body, never treat as heading.
      currentBodyLines.push(line);
      continue;
    }

    // Level-1 heading: the document title — skip, don't close the current section.
    if (/^#\s/.test(line)) {
      continue;
    }

    // Level-2 heading: potential section boundary.
    if (/^##\s/.test(line)) {
      flush();
      const raw2 = line.replace(/^##\s+/, '');
      const normalised = normaliseHeading(raw2);
      const matched = ALIAS_MAP[normalised];
      if (matched) {
        currentId = matched;
      } else {
        currentId = null;
        unmatchedHeadings.push(raw2.trim());
      }
      continue;
    }

    // Level-3+ headings and body lines: accumulate.
    currentBodyLines.push(line);
  }
  flush();

  // Build canonical sections array in order.
  const sections: PrdSection[] = PRD_SECTION_IDS.map((id) => ({
    id,
    title: PRD_SECTION_DEFINITIONS[id].title,
    body: (accumulated[id] ?? '').trim(),
  }));

  const sectionsFound = PRD_SECTION_IDS.filter((id) => (accumulated[id] ?? '').trim().length > 0);
  const sectionsMissing = PRD_SECTION_IDS.filter(
    (id) => !sectionsFound.includes(id),
  );

  return {
    sections,
    report: {
      sectionsFound,
      sectionsMissing,
      unmatchedHeadings,
      rawByteLength: new TextEncoder().encode(raw).length,
    },
  };
}

/**
 * Renders a DraftPrd back to canonical markdown. Used to keep the on-disk body in sync with payload_json.
 */
export function renderPrdMarkdown(prd: Pick<DraftPrd, 'projectTitle' | 'sections'>): string {
  const parts: string[] = [`# ${prd.projectTitle}`];
  for (const section of prd.sections) {
    parts.push(`\n## ${section.title}\n`);
    parts.push(section.body.length > 0 ? section.body : '');
  }
  return parts.join('\n');
}
