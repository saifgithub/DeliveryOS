import type { DiscoveryQuestion } from '@deliveryos/contracts';
import type { InterviewRecord } from '@deliveryos/contracts';

export interface DiscoveryPromptInput {
  readonly projectTitle: string;
  readonly rawIdea: string;
  readonly questions: readonly DiscoveryQuestion[];
  /** Optional interview transcript. When present, answers are grounded in it. */
  readonly interview?: InterviewRecord | null;
}

export function buildDiscoveryPrompt(input: DiscoveryPromptInput): string {
  const { projectTitle, rawIdea, questions, interview } = input;
  const questionBlocks = questions
    .map((q, i) => {
      const heading = `### Q${i + 1}. ${q.prompt}`;
      return q.helperText ? `${heading}\n\n_${q.helperText}_` : heading;
    })
    .join('\n\n');

  // Build interview transcript section when interview rounds exist
  let transcriptSection = '';
  if (interview && interview.rounds.length > 0) {
    const roundBlocks = interview.rounds.map((round) => {
      const qaLines = round.questions
        .map((iq) => {
          const topicLine = iq.topicRef ? `  _Topic: ${iq.topicRef}_\n` : '';
          const answerText = iq.userAnswer ?? iq.recommendedAnswer;
          return `**${iq.id}.** ${iq.question}\n${topicLine}  > ${answerText}`;
        })
        .join('\n\n');
      return `### Round ${round.round}\n\n${qaLines}`;
    });
    transcriptSection = `\n## Interview Transcript\n\nThe following Q&A was collected from the user during a discovery interview.\nThe user's answers represent their voice and should override any inference from the raw idea alone.\n\n${roundBlocks.join('\n\n')}\n`;
  }

  const hasTranscript = transcriptSection.length > 0;

  return `# Discovery Interview — DeliveryOS

## Role
You are a senior product discovery interviewer for a small software project.
Your job is to interrogate a raw product idea and produce a structured discovery record.

## Objective
Read the raw idea${hasTranscript ? ' and interview transcript' : ''} below. Then answer each of the twelve questions in order, using
the project's own context. Your answers will be pasted back into DeliveryOS and
will drive the rest of the product definition.

## Project Context
**Project title:** ${projectTitle}

**Raw idea:**
${rawIdea}
${transcriptSection}
## Your Task
Answer each question below in markdown. Be concrete and specific.${hasTranscript ? ' Where the raw idea and interview transcript differ, the transcript is the user\'s voice and takes precedence.' : ''} Where the
project does not have a clear answer, write "Unknown — needs decision" and
state what would be needed to decide.

${questionBlocks}

## Output Format
Return a single markdown document. Use the exact heading shape \`### Q1.\`, \`### Q2.\`, ... \`### Q${questions.length}.\`
for each answer. Keep each answer to roughly 80–200 words.
Do not add new questions. Do not skip questions — write "Unknown — needs decision"
if you cannot answer.

## Rules
- Do not invent constraints the user did not state.${hasTranscript ? '\n- The interview transcript is the user\'s voice — it overrides inference from the raw idea alone.' : ''}
- Do not propose implementation details.
- Where regulated industry, PII, customer-facing surface, or third-party data
  applies, say so clearly — it changes downstream stage configuration.
- Keep the tone neutral and analytical.
`;
}
