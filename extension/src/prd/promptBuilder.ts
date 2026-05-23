import type { DiscoveryRecord, PrdSection, PrdSectionId } from '@deliveryos/contracts';
import { PRD_SECTION_DEFINITIONS, PRD_SECTION_IDS } from './sectionSchema';

export interface GenerateDraftPromptInput {
  readonly projectTitle: string;
  readonly rawIdea: string;
  readonly discoveryRecord: DiscoveryRecord;
}

export function buildGenerateDraftPrompt(input: GenerateDraftPromptInput): string {
  const { projectTitle, rawIdea, discoveryRecord } = input;

  const sectionList = PRD_SECTION_IDS.map((id, i) => {
    const def = PRD_SECTION_DEFINITIONS[id];
    return `${i + 1}. **${def.title}** — ${def.promptHint}`;
  }).join('\n');

  const discoveryBlock = discoveryRecord.answers
    .map((a) => `**Q: ${a.question}**\n${a.answer}`)
    .join('\n\n');

  return `You are helping draft a Product Requirements Document (PRD) for a product called \
**${projectTitle}**. The PRD will be used inside DeliveryOS, a structured SDLC tool that \
decomposes the PRD into requirements, generates execution briefs for AI coding harnesses, \
and tracks traceability end to end.

## Your task

Produce a draft PRD with the following 8 sections, in this order. Each section is a \
level-2 markdown heading (\`## <Title>\`) followed by the body. Output **only** the PRD \
markdown — no preamble, no closing remarks.

${sectionList}

## Inputs

### Raw idea

> ${rawIdea || '*(not provided)*'}

### Discovery answers

${discoveryBlock || '*(no discovery answers available)*'}

## Output format

Start with \`# ${projectTitle}\` as the document title, then each \`## <Title>\` section.
Use bullets where natural. Prefer concrete over abstract. If you don't know an answer, \
write \`*(unknown — flag for the user)*\` rather than inventing.

Do not output anything other than the PRD markdown.
`;
}

export interface ReviseSectionPromptInput {
  readonly section: PrdSection;
  readonly instruction: string;
  readonly prdContext: {
    readonly projectTitle: string;
    readonly otherSectionSummaries: Partial<Record<PrdSectionId, string>>;
  };
}

export function buildReviseSectionPrompt(input: ReviseSectionPromptInput): string {
  const { section, instruction, prdContext } = input;
  const { projectTitle, otherSectionSummaries } = prdContext;

  const contextLines = PRD_SECTION_IDS.filter((id) => id !== section.id)
    .map((id) => {
      const def = PRD_SECTION_DEFINITIONS[id];
      const body = otherSectionSummaries[id] ?? '';
      const snippet = body.length > 200 ? body.slice(0, 200) + '…' : body || '*(empty)*';
      return `**${def.title}:** ${snippet}`;
    })
    .join('\n\n');

  return `You are helping refine **one section** of a Product Requirements Document for \
**${projectTitle}**.

## Section to revise: ${PRD_SECTION_DEFINITIONS[section.id].title}

### Current content

${section.body || '*(empty)*'}

### Revision instruction

${instruction}

## Context (other sections, summarised)

${contextLines}

## Your task

Rewrite the **${PRD_SECTION_DEFINITIONS[section.id].title}** section based on the revision \
instruction. Output **only** the new section body — no \`## <Title>\` heading, no preamble, \
no commentary. The user will paste the result directly back into the section editor.
`;
}
