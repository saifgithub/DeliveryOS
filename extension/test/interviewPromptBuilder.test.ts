import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildInterviewPrompt } from '../src/discovery/interviewPromptBuilder';
import { DISCOVERY_QUESTIONS_MVP } from '../src/discovery/questionLibrary';
import type { InterviewRound } from '@deliveryos/contracts';

const BASE_INPUT = {
  projectTitle: 'Bug Triage Assistant',
  rawIdea: 'An AI tool that sorts incoming GitHub issues by likely priority.',
  questions: DISCOVERY_QUESTIONS_MVP,
  priorRounds: [] as InterviewRound[],
  nextQuestionNumber: 1,
};

describe('buildInterviewPrompt — round-1 (no prior rounds)', () => {
  it('contains the project title', () => {
    const prompt = buildInterviewPrompt(BASE_INPUT);
    assert.match(prompt, /Bug Triage Assistant/);
  });

  it('contains the raw idea', () => {
    const prompt = buildInterviewPrompt(BASE_INPUT);
    assert.match(prompt, /sorts incoming GitHub issues/);
  });

  it('mentions max 8 questions per round', () => {
    const prompt = buildInterviewPrompt(BASE_INPUT);
    assert.match(prompt, /at most 8 questions per round/i);
  });

  it('starts numbering from nextQuestionNumber (I1 for first round)', () => {
    const prompt = buildInterviewPrompt(BASE_INPUT);
    assert.match(prompt, /start from \*\*I1\*\*/);
  });

  it('includes all 12 coverage topics', () => {
    const prompt = buildInterviewPrompt(BASE_INPUT);
    for (let i = 1; i <= 12; i++) {
      assert.match(prompt, new RegExp(`\\*\\*Q${i}\\.`), `expected Q${i} in coverage topics`);
    }
  });

  it('does NOT include a Prior Interview Rounds section when no prior rounds', () => {
    const prompt = buildInterviewPrompt(BASE_INPUT);
    assert.doesNotMatch(prompt, /## Prior Interview Rounds/);
  });

  it('includes VERDICT: SUFFICIENT output format instructions', () => {
    const prompt = buildInterviewPrompt(BASE_INPUT);
    assert.match(prompt, /VERDICT: SUFFICIENT/);
  });

  it('includes I<N> question block output format instructions', () => {
    const prompt = buildInterviewPrompt(BASE_INPUT);
    assert.match(prompt, /### I<N>/);
  });
});

describe('buildInterviewPrompt — with prior rounds (transcript inclusion)', () => {
  const priorRounds: InterviewRound[] = [
    {
      round: 1,
      rawPaste: 'raw paste round 1',
      parsedAt: 1000,
      questions: [
        {
          id: 'I1',
          topicRef: 'Q1',
          question: 'Who are the primary users?',
          recommendedAnswer: 'Solo maintainers of open-source repos.',
          userAnswer: 'OSS project leads managing 5–20 issues a week.',
        },
        {
          id: 'I2',
          question: 'What is the deployment target?',
          recommendedAnswer: 'Cloud SaaS.',
          userAnswer: null, // should fall back to recommendedAnswer
        },
      ],
    },
  ];

  it('includes a Prior Interview Rounds section', () => {
    const prompt = buildInterviewPrompt({ ...BASE_INPUT, priorRounds });
    assert.match(prompt, /## Prior Interview Rounds/);
  });

  it('renders the user answer when present', () => {
    const prompt = buildInterviewPrompt({ ...BASE_INPUT, priorRounds });
    assert.match(prompt, /OSS project leads managing 5–20 issues a week/);
  });

  it('falls back to recommendedAnswer when userAnswer is null', () => {
    const prompt = buildInterviewPrompt({ ...BASE_INPUT, priorRounds });
    assert.match(prompt, /Cloud SaaS/);
  });

  it('starts global numbering from nextQuestionNumber in a later round', () => {
    const prompt = buildInterviewPrompt({
      ...BASE_INPUT,
      priorRounds,
      nextQuestionNumber: 3,
    });
    assert.match(prompt, /start from \*\*I3\*\*/);
  });

  it('includes Round label in transcript', () => {
    const prompt = buildInterviewPrompt({ ...BASE_INPUT, priorRounds });
    assert.match(prompt, /### Round 1/);
  });
});
