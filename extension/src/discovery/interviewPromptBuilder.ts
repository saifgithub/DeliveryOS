import type { DiscoveryQuestion } from '@deliveryos/contracts';
import type { InterviewRound } from '@deliveryos/contracts';

export interface InterviewPromptInput {
  readonly projectTitle: string;
  readonly rawIdea: string;
  readonly questions: readonly DiscoveryQuestion[];
  readonly priorRounds: readonly InterviewRound[];
  readonly nextQuestionNumber: number;
}

export function buildInterviewPrompt(input: InterviewPromptInput): string {
  const { projectTitle, rawIdea, questions, priorRounds, nextQuestionNumber } = input;

  // Build a coverage topics list from the 12 questions
  const topicsBlock = questions
    .map((q) => `- **${q.id}. ${q.topic}:** ${q.prompt}`)
    .join('\n');

  // Build prior rounds transcript section (only when rounds exist)
  let priorRoundsSection = '';
  if (priorRounds.length > 0) {
    const roundBlocks = priorRounds.map((round) => {
      const qaLines = round.questions
        .map((iq) => {
          const topicLine = iq.topicRef ? `  _Topic: ${iq.topicRef}_\n` : '';
          const userAnswerText = iq.userAnswer ?? iq.recommendedAnswer;
          return `**${iq.id}.** ${iq.question}\n${topicLine}  > ${userAnswerText}`;
        })
        .join('\n\n');
      return `### Round ${round.round}\n\n${qaLines}`;
    });
    priorRoundsSection = `\n## Prior Interview Rounds\n\n${roundBlocks.join('\n\n')}\n`;
  }

  return `# Discovery Interview — DeliveryOS

## Role
You are a senior product discovery interviewer. Your job is NOT to answer questions yourself —
your job is to interview the HUMAN developer about their product idea, probing for gaps and
ambiguities before the structured 12-question discovery analysis runs. Think grill-me style:
direct, focused, no fluff.

## Objective
Map the raw idea and any prior interview transcript against the 12 discovery coverage topics below.
For each genuine gap you find, ask the human ONE focused, concrete question. Then wait for their answers.
Do NOT fabricate answers on behalf of the user — ask instead.

If the topics are already sufficiently covered (by the raw idea or prior answers combined), declare
sufficiency and stop — do not generate more questions.

## Coverage Topics (12 Discovery Questions)
${topicsBlock}

## Project Context
**Project title:** ${projectTitle}

**Raw idea:**
${rawIdea}
${priorRoundsSection}
## Your Task
1. Analyse the raw idea and any prior interview transcript against the 12 coverage topics above.
2. Identify genuine gaps — topics where the raw idea + prior answers are vague, missing, or contradictory.
3. For each gap, formulate ONE focused question addressed to the human.
4. For each question, provide a **Recommended** answer (what a reasonable default would be) so the human can confirm or override it.
5. Limit to **at most 8 questions per round**. If you would ask more than 8, prioritise the most important gaps.
6. Number questions globally — start from **I${nextQuestionNumber}** and increment by 1.
7. If the raw idea and prior answers together cover all 12 topics sufficiently, declare sufficiency instead of asking questions.

## Output Format
Either declare sufficiency:

\`\`\`
### VERDICT: SUFFICIENT
<one paragraph rationale explaining which topics are covered and why no further questions are needed>
\`\`\`

Or output one block per question (repeat the pattern for each question):

\`\`\`
### I<N>. <your question text here>
**Topic:** Q<k>
**Recommended:** <your recommended answer for the human to confirm or override>
\`\`\`

The **Topic:** line is optional if the question spans multiple topics.

## Rules
- NEVER answer questions on the user's behalf. The Recommended line is a default to accept or override — not a fabricated answer.
- Ask questions in order of importance — cover the biggest risks first.
- One question per gap. Do not bundle multiple questions into one.
- Numbering is global across rounds. Start from I${nextQuestionNumber}.
- Keep each question and recommended answer concise (one to three sentences each).
- Do not repeat questions already answered in prior rounds.
- Do not add commentary outside the structured output format.
`;
}
