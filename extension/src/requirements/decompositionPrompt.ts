import type { DraftPrd } from '@deliveryos/contracts';
import { renderPrdMarkdown } from '../prd/sectionSchema';

export interface DecompositionPromptInput {
  readonly prd: DraftPrd;
  /**
   * Optional pre-rendered PRD markdown body. If omitted, the prompt builder
   * renders it on the fly from `prd.sections` via `renderPrdMarkdown`.
   * Provided as an injection point for tests + future on-disk reads.
   */
  readonly prdMarkdownBody?: string;
}

/**
 * Pure function. Returns the full decomposition prompt the user copies into
 * an AI tool. The PRD body is wrapped in `<!-- BEGIN_PRD -->` /
 * `<!-- END_PRD -->` sentinels so the parser can later strip them if the
 * user accidentally pastes them back along with the response.
 */
export function buildDecomposePrompt(input: DecompositionPromptInput): string {
  const { prd } = input;
  const body =
    input.prdMarkdownBody ??
    renderPrdMarkdown({ projectTitle: prd.projectTitle, sections: prd.sections });

  return `You are a senior business analyst. Your job is to decompose the PRD below into \
a structured requirements catalogue for **${prd.projectTitle}**.

## PRD

<!-- BEGIN_PRD -->
${body}
<!-- END_PRD -->

## Output format

**Preferred:** return a single fenced JSON code block whose body is an array of \
objects. Each object must have exactly these fields and types:

\`\`\`json
[
  {
    "title": "string — short imperative phrase, 5–10 words",
    "description": "string — one paragraph, plain text or markdown",
    "category": "functional" | "non-functional",
    "priority": "must" | "should" | "could",
    "sourcePrdSection": "string — the heading text of the PRD section this came from"
  }
]
\`\`\`

**Fallback:** if you cannot produce JSON, return a single GitHub-flavoured \
markdown table with exactly these columns, in this order:

\`\`\`md
| Title | Description | Category | Priority | Source PRD section |
| ----- | ----------- | -------- | -------- | ------------------ |
\`\`\`

## Rules

- Do NOT include an \`id\` field. DeliveryOS assigns IDs.
- Every requirement must trace to a section in the PRD above.
- \`category\` must be \`functional\` or \`non-functional\` (lowercase, hyphenated).
- Use MoSCoW priorities in lowercase only: \`must\`, \`should\`, \`could\`.
- Aim for 15–40 requirements. If the PRD is small, fewer is fine.
- Do NOT propose verification criteria or test specs — that is a later stage.
- Return only the code block (JSON or markdown table). No prose around it.
`;
}
