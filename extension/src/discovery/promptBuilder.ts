import type { DiscoveryQuestion } from '@deliveryos/contracts';

export interface DiscoveryPromptInput {
  readonly projectTitle: string;
  readonly rawIdea: string;
  readonly questions: readonly DiscoveryQuestion[];
}

export function buildDiscoveryPrompt(input: DiscoveryPromptInput): string {
  const { projectTitle, rawIdea, questions } = input;
  const questionBlocks = questions
    .map((q, i) => {
      const heading = `### Q${i + 1}. ${q.prompt}`;
      return q.helperText ? `${heading}\n\n_${q.helperText}_` : heading;
    })
    .join('\n\n');

  return `# Discovery Interview — DeliveryOS

## Role
You are a senior product discovery interviewer for a small software project.
Your job is to interrogate a raw product idea and produce a structured discovery record.

## Objective
Read the raw idea below. Then answer each of the twelve questions in order, using
the project's own context. Your answers will be pasted back into DeliveryOS and
will drive the rest of the product definition.

## Project Context
**Project title:** ${projectTitle}

**Raw idea:**
${rawIdea}

## Your Task
Answer each question below in markdown. Be concrete and specific. Where the
project does not have a clear answer, write "Unknown — needs decision" and
state what would be needed to decide.

${questionBlocks}

## Output Format
Return a single markdown document. Use the exact heading shape \`### Q1.\`, \`### Q2.\`, ... \`### Q${questions.length}.\`
for each answer. Keep each answer to roughly 80–200 words.
Do not add new questions. Do not skip questions — write "Unknown — needs decision"
if you cannot answer.

## Rules
- Do not invent constraints the user did not state.
- Do not propose implementation details.
- Where regulated industry, PII, customer-facing surface, or third-party data
  applies, say so clearly — it changes downstream stage configuration.
- Keep the tone neutral and analytical.
`;
}
