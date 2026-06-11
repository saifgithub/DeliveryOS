import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDiscoveryPrompt } from '../src/discovery/promptBuilder';
import { DISCOVERY_QUESTIONS_MVP } from '../src/discovery/questionLibrary';
import type { InterviewRecord } from '@deliveryos/contracts';

describe('buildDiscoveryPrompt', () => {
  it('interpolates project title and raw idea', () => {
    const prompt = buildDiscoveryPrompt({
      projectTitle: 'Bug Triage Assistant',
      rawIdea: 'Sort incoming GitHub issues by likely priority.',
      questions: DISCOVERY_QUESTIONS_MVP,
    });
    assert.match(prompt, /\*\*Project title:\*\* Bug Triage Assistant/);
    assert.match(
      prompt,
      /Sort incoming GitHub issues by likely priority\./,
    );
  });

  it('renders all twelve question headings in order', () => {
    const prompt = buildDiscoveryPrompt({
      projectTitle: 'X',
      rawIdea: 'Y',
      questions: DISCOVERY_QUESTIONS_MVP,
    });
    for (let i = 1; i <= 12; i++) {
      assert.match(
        prompt,
        new RegExp(`### Q${i}\\. .+`),
        `expected ### Q${i}. heading`,
      );
    }
    const q1Index = prompt.indexOf('### Q1.');
    const q12Index = prompt.indexOf('### Q12.');
    assert.ok(q1Index < q12Index, 'Q1 should appear before Q12');
  });

  it('renders helper text in italics when present', () => {
    const withHelper = DISCOVERY_QUESTIONS_MVP.find((q) => q.helperText);
    assert.ok(withHelper, 'fixture: at least one question has helper text');
    const prompt = buildDiscoveryPrompt({
      projectTitle: 'X',
      rawIdea: 'Y',
      questions: DISCOVERY_QUESTIONS_MVP,
    });
    assert.match(prompt, new RegExp(`_${escapeRegex(withHelper.helperText!)}_`));
  });

  it('handles an empty raw idea without throwing', () => {
    const prompt = buildDiscoveryPrompt({
      projectTitle: 'X',
      rawIdea: '',
      questions: DISCOVERY_QUESTIONS_MVP,
    });
    assert.match(prompt, /\*\*Raw idea:\*\*/);
  });

  it('adapts the output-format count to the questions array length', () => {
    const subset = DISCOVERY_QUESTIONS_MVP.slice(0, 3);
    const prompt = buildDiscoveryPrompt({
      projectTitle: 'X',
      rawIdea: 'Y',
      questions: subset,
    });
    assert.match(prompt, /### Q3\.`\s+for each answer/);
    assert.doesNotMatch(prompt, /### Q12\./);
  });
});

describe('DISCOVERY_QUESTIONS_MVP', () => {
  it('has exactly 12 entries', () => {
    assert.equal(DISCOVERY_QUESTIONS_MVP.length, 12);
  });

  it('has unique ids Q1 through Q12', () => {
    const ids = DISCOVERY_QUESTIONS_MVP.map((q) => q.id);
    assert.deepEqual(ids, [
      'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6',
      'Q7', 'Q8', 'Q9', 'Q10', 'Q11', 'Q12',
    ]);
  });
});

describe('buildDiscoveryPrompt — interview transcript (L3)', () => {
  const baseInput = {
    projectTitle: 'TestProject',
    rawIdea: 'A raw idea for testing.',
    questions: DISCOVERY_QUESTIONS_MVP,
  };

  it('does not include an Interview Transcript section when interview is absent', () => {
    const prompt = buildDiscoveryPrompt(baseInput);
    assert.doesNotMatch(prompt, /## Interview Transcript/);
  });

  it('does not include an Interview Transcript section when interview is null', () => {
    const prompt = buildDiscoveryPrompt({ ...baseInput, interview: null });
    assert.doesNotMatch(prompt, /## Interview Transcript/);
  });

  it('does not include an Interview Transcript section when interview has no rounds', () => {
    const interview: InterviewRecord = {
      rounds: [],
      status: 'in_progress',
      declaredSufficientAt: null,
      sufficiencySource: null,
    };
    const prompt = buildDiscoveryPrompt({ ...baseInput, interview });
    assert.doesNotMatch(prompt, /## Interview Transcript/);
  });

  it('includes Interview Transcript section when interview has rounds', () => {
    const interview: InterviewRecord = {
      rounds: [
        {
          round: 1,
          rawPaste: '',
          parsedAt: 0,
          questions: [
            {
              id: 'I1',
              topicRef: 'Q1',
              question: 'Who is the primary user?',
              recommendedAnswer: 'OSS maintainers.',
              userAnswer: 'Enterprise engineering teams.',
            },
          ],
        },
      ],
      status: 'sufficient',
      declaredSufficientAt: 12345,
      sufficiencySource: 'ai',
    };
    const prompt = buildDiscoveryPrompt({ ...baseInput, interview });
    assert.match(prompt, /## Interview Transcript/);
  });

  it('renders the user answer when present in the transcript', () => {
    const interview: InterviewRecord = {
      rounds: [
        {
          round: 1,
          rawPaste: '',
          parsedAt: 0,
          questions: [
            {
              id: 'I1',
              question: 'What is the scale?',
              recommendedAnswer: 'Small scale, ~100/day.',
              userAnswer: 'About 500 requests per day at launch.',
            },
          ],
        },
      ],
      status: 'sufficient',
      declaredSufficientAt: null,
      sufficiencySource: null,
    };
    const prompt = buildDiscoveryPrompt({ ...baseInput, interview });
    assert.match(prompt, /About 500 requests per day at launch/);
    assert.doesNotMatch(prompt, /Small scale, ~100\/day/);
  });

  it('falls back to recommendedAnswer when userAnswer is null', () => {
    const interview: InterviewRecord = {
      rounds: [
        {
          round: 1,
          rawPaste: '',
          parsedAt: 0,
          questions: [
            {
              id: 'I1',
              question: 'What is the deployment target?',
              recommendedAnswer: 'Cloud SaaS.',
              userAnswer: null,
            },
          ],
        },
      ],
      status: 'sufficient',
      declaredSufficientAt: null,
      sufficiencySource: null,
    };
    const prompt = buildDiscoveryPrompt({ ...baseInput, interview });
    assert.match(prompt, /Cloud SaaS/);
  });

  it('adds transcript-override wording to the task section', () => {
    const interview: InterviewRecord = {
      rounds: [
        {
          round: 1,
          rawPaste: '',
          parsedAt: 0,
          questions: [
            {
              id: 'I1',
              question: 'Any question?',
              recommendedAnswer: 'Default.',
              userAnswer: 'User answer.',
            },
          ],
        },
      ],
      status: 'sufficient',
      declaredSufficientAt: null,
      sufficiencySource: null,
    };
    const prompt = buildDiscoveryPrompt({ ...baseInput, interview });
    assert.match(prompt, /transcript is the user's voice/);
  });
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
