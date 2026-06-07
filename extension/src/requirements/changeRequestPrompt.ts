import type { DraftPrd, RequirementCategory, RequirementPriority } from '@deliveryos/contracts';
import { renderPrdMarkdown } from '../prd/sectionSchema';

export interface ChangeRequestRequirementSlice {
  readonly id: string;
  readonly title: string;
  readonly category: RequirementCategory;
  readonly priority: RequirementPriority;
  readonly sourcePrdSection: string;
}

export interface ChangeRequestPromptInput {
  readonly prd: DraftPrd;
  readonly requirements: readonly ChangeRequestRequirementSlice[];
  readonly crDescription: string;
  readonly prdMarkdownBody?: string;
}

/**
 * Pure function. Returns the full change-request prompt the user copies into
 * an AI tool. Embeds three sentinel-wrapped blocks:
 * - <!-- BEGIN_PRD --> ... <!-- END_PRD --> — current PRD
 * - <!-- BEGIN_REQUIREMENTS --> ... <!-- END_REQUIREMENTS --> — current catalogue
 * - <!-- BEGIN_CHANGE_REQUEST --> ... <!-- END_CHANGE_REQUEST --> — user's CR
 */
export function buildChangeRequestPrompt(input: ChangeRequestPromptInput): string {
  const { prd, requirements, crDescription } = input;

  const prdBody =
    input.prdMarkdownBody ??
    renderPrdMarkdown({ projectTitle: prd.projectTitle, sections: prd.sections });

  const requirementsTable = renderRequirementsTable(requirements);

  return `You are a senior business analyst. A change request has been raised against the \
requirements catalogue for **${prd.projectTitle}**. Your job is to determine which \
requirements should be added, edited, or deleted to reflect the change.

## Current PRD

<!-- BEGIN_PRD -->
${prdBody}
<!-- END_PRD -->

## Current Requirements Catalogue

<!-- BEGIN_REQUIREMENTS -->
${requirementsTable}
<!-- END_REQUIREMENTS -->

## Change Request

<!-- BEGIN_CHANGE_REQUEST -->
${crDescription.trim()}
<!-- END_CHANGE_REQUEST -->

## Output format

Return a single fenced JSON code block with exactly these three keys:

\`\`\`json
{
  "added": [
    {
      "title": "string — short imperative phrase, 5–10 words",
      "description": "string — one paragraph, plain text or markdown",
      "category": "functional" | "non-functional",
      "priority": "must" | "should" | "could",
      "sourcePrdSection": "string — the heading text of the PRD section this traces to"
    }
  ],
  "edited": [
    {
      "id": "REQ-NNN",
      "title": "optional — only include if changing",
      "description": "optional — only include if changing",
      "category": "optional — functional | non-functional",
      "priority": "optional — must | should | could",
      "sourcePrdSection": "optional — only include if changing"
    }
  ],
  "deleted": [
    { "id": "REQ-NNN" }
  ]
}
\`\`\`

## Rules

- For \`added\`: do NOT include an \`id\` field — DeliveryOS assigns IDs.
- For \`edited\`: only include the fields that actually change; omit the rest.
- For \`deleted\`: include only the \`id\` (e.g. \`"REQ-005"\`).
- If no requirements need adding, edited, or deleting, return an empty array for that key.
- \`category\` must be \`functional\` or \`non-functional\` (lowercase, hyphenated).
- Use MoSCoW priorities in lowercase only: \`must\`, \`should\`, \`could\`.
- Return only the code block. No prose around it.
`;
}

function renderRequirementsTable(requirements: readonly ChangeRequestRequirementSlice[]): string {
  if (requirements.length === 0) {
    return '_No requirements yet._';
  }
  const header = '| ID | Title | Category | Priority | Source PRD section |';
  const sep    = '| -- | ----- | -------- | -------- | ------------------ |';
  const rows = requirements.map(
    (r) =>
      `| ${r.id} | ${escapeCell(r.title)} | ${r.category} | ${r.priority} | ${escapeCell(r.sourcePrdSection)} |`,
  );
  return [header, sep, ...rows].join('\n');
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|');
}
