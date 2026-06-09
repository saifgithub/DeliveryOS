// DOS:P10 § reverse/analysisPromptBuilder.ts — builds the analysis brief
// DeliveryOS hands to the agent for the REVERSE path (code → docs).
//
// The agent reads the whole repo and writes an 8-section PRD to `outputPath`.
// The output format is pinned to exactly what `parsePrdMarkdown` consumes —
// `# <Title>` then `## <Section>` for each of PRD_SECTION_IDS — and the section
// titles + hints are sourced from PRD_SECTION_DEFINITIONS so the prompt and the
// parser can never drift apart.

import { PRD_SECTION_IDS } from '@deliveryos/contracts';
import { PRD_SECTION_DEFINITIONS } from '../prd/sectionSchema';

export interface ReverseAnalysisBriefInput {
  readonly projectTitle: string;
  /** Absolute path of the repo the agent should read (the workspace root). */
  readonly workspacePath: string;
  /** Relative path the agent must write the PRD markdown to. */
  readonly outputPath: string;
}

/**
 * Build the markdown analysis brief. Pure function — no IO. The host writes
 * the returned string to `.deliveryos-reverse/analysis-brief.md` and launches
 * the agent pointed at it.
 */
export function buildReverseAnalysisBrief(input: ReverseAnalysisBriefInput): string {
  const { projectTitle, workspacePath, outputPath } = input;

  const sectionSpec = PRD_SECTION_IDS.map((id) => {
    const def = PRD_SECTION_DEFINITIONS[id];
    return `### ${def.title}\n${def.promptHint}`;
  }).join('\n\n');

  const outputTemplate = [
    `# ${projectTitle}`,
    ...PRD_SECTION_IDS.map((id) => `\n## ${PRD_SECTION_DEFINITIONS[id].title}\n<your content>`),
  ].join('\n');

  return `# DeliveryOS — Reverse Path: derive a PRD from this codebase

You are a senior product analyst reverse-engineering a Product Requirements
Document (PRD) for **${projectTitle}** from an existing codebase. The code already
exists; your job is to recover the *intent* behind it — the problem it solves, who
it serves, and what "done" means — not to describe the implementation line by line.

## What to read

The repository root is:

    ${workspacePath}

Read enough of it to ground every claim in evidence. Prioritise:

- \`README\`, \`README.md\`, and any \`docs/\` — stated purpose, audience, scope.
- \`package.json\` / manifest files — name, description, dependencies, scripts (tech constraints).
- The directory structure and entry points — what the system actually does.
- Tests — they encode the expected behaviour and success criteria.
- Config, CI, and license — operational + regulatory constraints.

Infer from evidence. Where the code is ambiguous, say so in **Assumptions** rather
than guessing silently. Do not invent features the code does not support.

## Sections to produce

${sectionSpec}

## Output — write to disk, exact format

Write the PRD as a single markdown document to this path (relative to the repo root):

    ${outputPath}

Use this exact shape — a level-1 title, then one \`## \` heading per section, in this
order. No preamble, no commentary outside the document, no code fences around it:

\`\`\`markdown
${outputTemplate}
\`\`\`

The section headings must match the titles above verbatim so DeliveryOS can parse
them. After writing the file, stop — DeliveryOS detects it automatically.
`;
}
