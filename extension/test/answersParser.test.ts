import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseAnswers } from '../src/discovery/answersParser';
import { DISCOVERY_QUESTIONS_MVP } from '../src/discovery/questionLibrary';

const Q = DISCOVERY_QUESTIONS_MVP;

describe('parseAnswers — happy path', () => {
  it('parses a well-formed `### Q<n>.` markdown reply', () => {
    const paste = [
      '### Q1. What problem does this solve?',
      'It triages incoming bug reports by likely priority.',
      '',
      '### Q2. Scope?',
      'In: priority labels. Out: comment authoring.',
      '',
      '### Q3. Users?',
      'Solo maintainers of small repos.',
    ].join('\n');

    const { answers, unmatchedText } = parseAnswers(paste, Q);

    assert.equal(answers.length, 3);
    assert.equal(answers[0].question, Q[0].prompt);
    assert.match(answers[0].answer, /triages incoming bug reports/);
    assert.equal(answers[1].question, Q[1].prompt);
    assert.match(answers[1].answer, /In: priority labels/);
    assert.equal(answers[2].question, Q[2].prompt);
    assert.equal(unmatchedText, '');
  });

  it('captures all 12 questions when the AI returns the full set', () => {
    const paste = Q.map(
      (q, i) => `### Q${i + 1}. ${q.prompt}\n\nAnswer ${i + 1} body.`,
    ).join('\n\n');
    const { answers, unmatchedText } = parseAnswers(paste, Q);
    assert.equal(answers.length, 12);
    assert.equal(unmatchedText, '');
    answers.forEach((a, i) => {
      assert.equal(a.question, Q[i].prompt);
      assert.equal(a.answer, `Answer ${i + 1} body.`);
    });
  });
});

describe('parseAnswers — fallback markers', () => {
  it('matches `**Q<n>**` bold markers', () => {
    const paste = [
      '**Q1** Some problem.',
      'Body line one.',
      '',
      '**Q2** Some scope.',
      'Body line two.',
    ].join('\n');
    const { answers } = parseAnswers(paste, Q);
    assert.equal(answers.length, 2);
    assert.match(answers[0].answer, /Body line one/);
    assert.match(answers[1].answer, /Body line two/);
  });

  it('matches `Q<n>.` plain markers at line start', () => {
    const paste = [
      'Q1. Problem statement here.',
      'Answer body A.',
      '',
      'Q2. Scope statement here.',
      'Answer body B.',
    ].join('\n');
    const { answers } = parseAnswers(paste, Q);
    assert.equal(answers.length, 2);
    assert.match(answers[0].answer, /Answer body A/);
    assert.match(answers[1].answer, /Answer body B/);
  });
});

describe('parseAnswers — edge cases', () => {
  it('returns empty answers + empty unmatchedText for an empty paste', () => {
    const { answers, unmatchedText } = parseAnswers('', Q);
    assert.equal(answers.length, 0);
    assert.equal(unmatchedText, '');
  });

  it('returns empty answers + the full paste in unmatchedText when no markers are found', () => {
    const paste = 'Just some free-form prose without any Q headings.';
    const { answers, unmatchedText } = parseAnswers(paste, Q);
    assert.equal(answers.length, 0);
    assert.equal(unmatchedText, paste);
  });

  it('captures preamble before the first heading into unmatchedText', () => {
    const paste = [
      'Here is my response:',
      '',
      '### Q1. Problem',
      'Answer A.',
    ].join('\n');
    const { answers, unmatchedText } = parseAnswers(paste, Q);
    assert.equal(answers.length, 1);
    assert.match(unmatchedText, /Here is my response/);
  });

  it('drops markers for unknown question ids into unmatchedText', () => {
    const paste = [
      '### Q99. Some bogus question',
      'Bogus answer.',
      '',
      '### Q1. Problem',
      'Real answer.',
    ].join('\n');
    const { answers, unmatchedText } = parseAnswers(paste, Q);
    assert.equal(answers.length, 1);
    assert.equal(answers[0].question, Q[0].prompt);
    assert.match(unmatchedText, /Q99/);
  });

  it('preserves markdown within answer bodies', () => {
    const paste = [
      '### Q1. Problem',
      'It does **three** things:',
      '',
      '- thing one',
      '- thing two',
      '- thing three',
    ].join('\n');
    const { answers } = parseAnswers(paste, Q);
    assert.equal(answers.length, 1);
    assert.match(answers[0].answer, /\*\*three\*\*/);
    assert.match(answers[0].answer, /- thing one/);
  });
});
