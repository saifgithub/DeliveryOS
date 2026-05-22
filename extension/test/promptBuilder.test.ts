import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDiscoveryPrompt } from '../src/discovery/promptBuilder';
import { DISCOVERY_QUESTIONS_MVP } from '../src/discovery/questionLibrary';

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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
