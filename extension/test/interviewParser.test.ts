import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseInterviewResponse } from '../src/discovery/interviewParser';

describe('parseInterviewResponse — VERDICT: SUFFICIENT detection', () => {
  it('detects ### VERDICT: SUFFICIENT (canonical form)', () => {
    const paste = [
      '### VERDICT: SUFFICIENT',
      'All 12 topics are covered by the raw idea and prior answers. No further questions needed.',
    ].join('\n');
    const result = parseInterviewResponse(paste, 1);
    assert.equal(result.kind, 'sufficient');
    assert.match(
      (result as { kind: 'sufficient'; rationale: string }).rationale,
      /All 12 topics/,
    );
  });

  it('detects VERDICT: SUFFICIENT without ### prefix', () => {
    const paste = 'VERDICT: SUFFICIENT\nThe raw idea covers all key areas.';
    const result = parseInterviewResponse(paste, 1);
    assert.equal(result.kind, 'sufficient');
  });

  it('detects verdict case-insensitively', () => {
    const paste = 'verdict: sufficient\nEverything looks good.';
    const result = parseInterviewResponse(paste, 1);
    assert.equal(result.kind, 'sufficient');
  });

  it('extracts rationale paragraph after VERDICT line', () => {
    const paste = '### VERDICT: SUFFICIENT\nRationale goes here on multiple\nlines of text.';
    const result = parseInterviewResponse(paste, 1);
    assert.equal(result.kind, 'sufficient');
    assert.match(
      (result as { kind: 'sufficient'; rationale: string }).rationale,
      /Rationale goes here/,
    );
  });
});

describe('parseInterviewResponse — ### I<N>. marker (canonical form)', () => {
  it('parses a single question with all fields', () => {
    const paste = [
      '### I1. Who are the primary users?',
      '**Topic:** Q3',
      '**Recommended:** Solo maintainers of open-source repositories.',
    ].join('\n');
    const result = parseInterviewResponse(paste, 1);
    assert.equal(result.kind, 'questions');
    if (result.kind !== 'questions') return;
    assert.equal(result.questions.length, 1);
    const q = result.questions[0];
    assert.equal(q.id, 'I1');
    assert.equal(q.topicRef, 'Q3');
    assert.match(q.question, /Who are the primary users/);
    assert.match(q.recommendedAnswer, /Solo maintainers/);
    assert.equal(q.userAnswer, null);
  });

  it('parses multiple questions in sequence', () => {
    const paste = [
      '### I1. What problem does this solve?',
      '**Topic:** Q1',
      '**Recommended:** Prioritising bug reports for OSS maintainers.',
      '',
      '### I2. What is the deployment target?',
      '**Topic:** Q10',
      '**Recommended:** Cloud SaaS.',
    ].join('\n');
    const result = parseInterviewResponse(paste, 1);
    assert.equal(result.kind, 'questions');
    if (result.kind !== 'questions') return;
    assert.equal(result.questions.length, 2);
    assert.equal(result.questions[0].id, 'I1');
    assert.equal(result.questions[1].id, 'I2');
  });

  it('parses a question without a Topic line', () => {
    const paste = [
      '### I5. What is the scale?',
      '**Recommended:** Small scale, ~100 requests/day.',
    ].join('\n');
    const result = parseInterviewResponse(paste, 5);
    assert.equal(result.kind, 'questions');
    if (result.kind !== 'questions') return;
    assert.equal(result.questions.length, 1);
    assert.equal(result.questions[0].topicRef, undefined);
    assert.equal(result.questions[0].id, 'I5');
  });
});

describe('parseInterviewResponse — **I<N>.** bold marker fallback', () => {
  it('matches **I<N>.**-style markers', () => {
    const paste = [
      '**I1.** What is the primary problem?',
      '**Recommended:** Sorting issues by severity.',
    ].join('\n');
    const result = parseInterviewResponse(paste, 1);
    assert.equal(result.kind, 'questions');
    if (result.kind !== 'questions') return;
    assert.equal(result.questions.length, 1);
    assert.equal(result.questions[0].id, 'I1');
    assert.match(result.questions[0].recommendedAnswer, /Sorting issues/);
  });
});

describe('parseInterviewResponse — line-start I<N>. marker fallback', () => {
  it('matches plain I<N>. markers at line start', () => {
    const paste = [
      'I3. What data does the system store?',
      '**Recommended:** GitHub issue metadata only.',
      '',
      'I4. Are there regulatory constraints?',
      '**Recommended:** No — it is a developer tool.',
    ].join('\n');
    const result = parseInterviewResponse(paste, 3);
    assert.equal(result.kind, 'questions');
    if (result.kind !== 'questions') return;
    assert.equal(result.questions.length, 2);
    assert.equal(result.questions[0].id, 'I3');
    assert.equal(result.questions[1].id, 'I4');
  });
});

describe('parseInterviewResponse — edge cases', () => {
  it('returns empty questions + empty unmatchedText for empty paste', () => {
    const result = parseInterviewResponse('', 1);
    assert.equal(result.kind, 'questions');
    if (result.kind !== 'questions') return;
    assert.equal(result.questions.length, 0);
    assert.equal(result.unmatchedText, '');
  });

  it('puts unrecognised text in unmatchedText when no markers found', () => {
    const paste = 'Some free-form text without any interview markers.';
    const result = parseInterviewResponse(paste, 1);
    assert.equal(result.kind, 'questions');
    if (result.kind !== 'questions') return;
    assert.equal(result.questions.length, 0);
    assert.equal(result.unmatchedText, paste);
  });

  it('captures preamble before first marker into unmatchedText', () => {
    const paste = [
      'Here is my interview question:',
      '',
      '### I1. What problem does this solve?',
      '**Recommended:** Triage fatigue for OSS maintainers.',
    ].join('\n');
    const result = parseInterviewResponse(paste, 1);
    assert.equal(result.kind, 'questions');
    if (result.kind !== 'questions') return;
    assert.equal(result.questions.length, 1);
    assert.match(result.unmatchedText, /Here is my interview question/);
  });

  it('userAnswer is always null (parser never sets it)', () => {
    const paste = '### I1. Any question?\n**Recommended:** Some default.';
    const result = parseInterviewResponse(paste, 1);
    if (result.kind !== 'questions') return;
    assert.equal(result.questions[0].userAnswer, null);
  });

  it('global numbering: question id matches the marker number, not nextQuestionNumber', () => {
    const paste = [
      '### I7. Seventh question globally?',
      '**Recommended:** Yes.',
    ].join('\n');
    const result = parseInterviewResponse(paste, 7);
    assert.equal(result.kind, 'questions');
    if (result.kind !== 'questions') return;
    assert.equal(result.questions[0].id, 'I7');
  });
});
