import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RequirementSummary } from '@deliveryos/contracts';
import { buildTestDesignerPrompt } from '../src/specialists/testDesigner/promptBuilder';
import { parseTestDesignerResult } from '../src/specialists/testDesigner/resultParser';

// --- fixtures --------------------------------------------------------------

const FIXTURE_REQUIREMENT: RequirementSummary = {
  entryId: 'req-entry-fixture-uuid',
  id: 'REQ-002',
  title: 'Bug submission API',
  description: 'The system accepts new bug reports via a JSON POST endpoint.',
  category: 'functional',
  priority: 'must',
  sourcePrdSection: 'Goals',
};

const HIGH_CONFIDENCE = `## Verification Criteria

- A new bug can be submitted via POST /bugs with a JSON body.
- A submitted bug appears in the bug list within 1s.
- Invalid payloads receive a 400 response with an error message.

## Test Specification

### T-REQ-002-01 Happy-path submission
- Given: the API is reachable.
- When: the user POSTs a well-formed bug payload.
- Then: a 201 Created response carrying the new bug id is returned.

### T-REQ-002-02 Missing field rejection
- Given: the API is reachable.
- When: the user POSTs a payload missing the title field.
- Then: a 400 Bad Request response naming the missing field is returned.

### T-REQ-002-03 List reflects submission
- Given: a bug has just been submitted.
- When: the user fetches GET /bugs.
- Then: the new bug appears in the response array.
`;

const MISSING_TEST_SPEC = `## Verification Criteria

- A new bug can be submitted via POST /bugs.
- Submitted bugs appear in the list.
`;

const MISSING_CRITERIA = `## Test Specification

### T-REQ-002-01 Happy path
- Given: API up.
- When: POST /bugs.
- Then: 201 returned.
`;

const RAW_NO_HEADERS = `Here are some thoughts on testing.

A bug should be submittable.
It should appear in the list.
Invalid payloads should error.
`;

const NOISY_PREAMBLE = `Sure! Here are some test specifications for your bug submission requirement.

I've covered happy and unhappy paths, plus an edge case.

## Verification Criteria

- A new bug can be submitted.
- Invalid payloads return 400.

## Test Specification

### T-REQ-002-01 Happy path
- Given: API reachable.
- When: POST /bugs with valid body.
- Then: 201.

## Open Questions
- What rate-limiting policy applies?
- Is auth required on this endpoint?
`;

const FENCED_WRAPPER = `\`\`\`md
## Verification Criteria

- A new bug can be submitted.

## Test Specification

### T-REQ-002-01 Happy path
- Given: API reachable.
- When: POST /bugs.
- Then: 201.
\`\`\``;

const ALT_HEADER_TEST_SPEC = `## Verification Criteria

- A bug can be submitted.

## Test Spec

### T-REQ-002-01 Submission
- Given: API up.
- When: POST.
- Then: 201.
`;

const UNNAMED_CASE_HEADINGS = `## Verification Criteria

- A bug can be submitted.

## Test Specification

### Happy-path submission
- Given: API up.
- When: POST.
- Then: 201.

### Missing-field rejection
- Given: API up.
- When: POST without title.
- Then: 400.
`;

// --- buildTestDesignerPrompt ----------------------------------------------

describe('buildTestDesignerPrompt', () => {
  it('emits all 7 specialist-prompt sections in order', () => {
    const out = buildTestDesignerPrompt({
      requirement: FIXTURE_REQUIREMENT,
      projectTitle: 'Bug Triage Assistant',
      prdSummary: 'A solo-developer tool for triaging incoming bug reports.',
    });

    const sectionHeaders = [
      '# Specialist: Test Designer',
      '## Role',
      '## Objective',
      '## Project Context',
      '## Approved Inputs',
      '## Your Task',
      '## Output Format',
      '## Rules',
    ];
    for (const header of sectionHeaders) {
      assert.match(out, new RegExp(`(^|\\n)${escapeRe(header)}(\\n|$)`));
    }
  });

  it('locks the load-bearing parser headers in the prompt body', () => {
    const out = buildTestDesignerPrompt({
      requirement: FIXTURE_REQUIREMENT,
      projectTitle: 'Bug Triage Assistant',
      prdSummary: 'Triage incoming bug reports.',
    });

    // The result parser keys off these literal strings. Drift here means
    // the parser silently fails to extract sections.
    assert.match(out, /"## Verification Criteria"/);
    assert.match(out, /"## Test Specification"/);
    assert.match(out, /"## Open Questions"/);
  });

  it('is deterministic — identical input produces byte-identical output', () => {
    const input = {
      requirement: FIXTURE_REQUIREMENT,
      projectTitle: 'Bug Triage Assistant',
      prdSummary: 'A solo-developer tool for triaging incoming bug reports.',
    };
    const a = buildTestDesignerPrompt(input);
    const b = buildTestDesignerPrompt(input);
    assert.equal(a, b);
  });

  it('inlines the requirement id, title, category, priority, and source section', () => {
    const out = buildTestDesignerPrompt({
      requirement: FIXTURE_REQUIREMENT,
      projectTitle: 'Bug Triage Assistant',
      prdSummary: 'Triage bugs.',
    });

    assert.match(out, /Requirement ID: REQ-002/);
    assert.match(out, /Title: Bug submission API/);
    assert.match(out, /Type: functional/);
    assert.match(out, /Priority: must/);
    assert.match(out, /Source PRD section: Goals/);
    assert.match(out, /The system accepts new bug reports/);
  });

  it('defaults design context to "None recorded yet." when unset', () => {
    const out = buildTestDesignerPrompt({
      requirement: FIXTURE_REQUIREMENT,
      projectTitle: 'X',
      prdSummary: 'Y',
    });
    assert.match(out, /Design context: None recorded yet\./);
  });

  it('falls back to "No PRD summary recorded." when prdSummary is empty', () => {
    const out = buildTestDesignerPrompt({
      requirement: FIXTURE_REQUIREMENT,
      projectTitle: 'X',
      prdSummary: '   ',
    });
    assert.match(out, /PRD summary: No PRD summary recorded\./);
  });

  it('renders "None recorded." for empty assumptions and constraints', () => {
    const out = buildTestDesignerPrompt({
      requirement: FIXTURE_REQUIREMENT,
      projectTitle: 'X',
      prdSummary: 'Y',
    });
    assert.match(out, /Assumptions:\n {2}- None recorded\./);
    assert.match(out, /Constraints:\n {2}- None recorded\./);
  });

  it('lists assumptions and constraints as indented bullets when present', () => {
    const out = buildTestDesignerPrompt({
      requirement: FIXTURE_REQUIREMENT,
      projectTitle: 'X',
      prdSummary: 'Y',
      assumptions: ['Latency budget is 1s.', 'Single-tenant deployment.'],
      constraints: ['No third-party calls.'],
    });
    assert.match(out, /Assumptions:\n {2}- Latency budget is 1s\.\n {2}- Single-tenant deployment\./);
    assert.match(out, /Constraints:\n {2}- No third-party calls\./);
  });

  it('appends the existing-spec revision block when re-running', () => {
    const out = buildTestDesignerPrompt({
      requirement: FIXTURE_REQUIREMENT,
      projectTitle: 'X',
      prdSummary: 'Y',
      existingTestSpec: {
        id: 'TS-REQ-002',
        requirementEntryId: FIXTURE_REQUIREMENT.entryId,
        requirementId: FIXTURE_REQUIREMENT.id,
        title: 'Test spec for REQ-002',
        cases: [],
        openQuestions: [],
        raw: '## Verification Criteria\n\n- old criterion.\n',
        confidence: 'high',
        createdAt: 1,
        updatedAt: 2,
      },
    });
    assert.match(out, /Existing Test Spec \(for revision\)/);
    assert.match(out, /old criterion/);
  });
});

// --- parseTestDesignerResult ----------------------------------------------

describe('parseTestDesignerResult', () => {
  it('parses high-confidence input with criteria + cases', () => {
    const result = parseTestDesignerResult(HIGH_CONFIDENCE, { requirementId: 'REQ-002' });
    assert.equal(result.confidence, 'high');
    assert.equal(result.verificationCriteria.length, 3);
    assert.equal(result.cases.length, 3);
    assert.equal(result.verificationCriteria[0]?.id, 'VC-REQ-002-01');
    assert.equal(result.cases[0]?.id, 'T-REQ-002-01');
    assert.equal(result.cases[0]?.title, 'Happy-path submission');
    assert.ok(result.cases[0]?.bullets.some((b) => b.startsWith('Given:')));
    assert.ok(result.cases[0]?.bullets.some((b) => b.startsWith('When:')));
    assert.ok(result.cases[0]?.bullets.some((b) => b.startsWith('Then:')));
    assert.equal(result.warnings.length, 0);
  });

  it('flags low confidence when only verification criteria are present', () => {
    const result = parseTestDesignerResult(MISSING_TEST_SPEC, { requirementId: 'REQ-002' });
    assert.equal(result.confidence, 'low');
    assert.equal(result.verificationCriteria.length, 2);
    assert.equal(result.cases.length, 0);
    assert.ok(result.warnings.some((w) => /Test Specification/.test(w)));
  });

  it('flags low confidence when only the test spec is present', () => {
    const result = parseTestDesignerResult(MISSING_CRITERIA, { requirementId: 'REQ-002' });
    assert.equal(result.confidence, 'low');
    assert.equal(result.verificationCriteria.length, 0);
    assert.equal(result.cases.length, 1);
    assert.ok(result.warnings.some((w) => /Verification Criteria/.test(w)));
  });

  it('flags raw confidence when neither header is found', () => {
    const result = parseTestDesignerResult(RAW_NO_HEADERS, { requirementId: 'REQ-002' });
    assert.equal(result.confidence, 'raw');
    assert.equal(result.verificationCriteria.length, 0);
    assert.equal(result.cases.length, 0);
  });

  it('strips noisy preamble and extracts open questions', () => {
    const result = parseTestDesignerResult(NOISY_PREAMBLE, { requirementId: 'REQ-002' });
    assert.equal(result.confidence, 'high');
    assert.equal(result.verificationCriteria.length, 2);
    assert.equal(result.cases.length, 1);
    assert.equal(result.openQuestions.length, 2);
    assert.match(result.openQuestions[0] ?? '', /rate-limiting/);
  });

  it('unwraps a single outer fenced code block', () => {
    const result = parseTestDesignerResult(FENCED_WRAPPER, { requirementId: 'REQ-002' });
    assert.equal(result.confidence, 'high');
    assert.equal(result.verificationCriteria.length, 1);
    assert.equal(result.cases.length, 1);
  });

  it('accepts "## Test Spec" as an alias for "## Test Specification"', () => {
    const result = parseTestDesignerResult(ALT_HEADER_TEST_SPEC, { requirementId: 'REQ-002' });
    assert.equal(result.confidence, 'high');
    assert.equal(result.cases.length, 1);
  });

  it('assigns deterministic T-IDs when the heading lacks one', () => {
    const result = parseTestDesignerResult(UNNAMED_CASE_HEADINGS, { requirementId: 'REQ-002' });
    assert.equal(result.cases.length, 2);
    assert.equal(result.cases[0]?.id, 'T-REQ-002-01');
    assert.equal(result.cases[0]?.title, 'Happy-path submission');
    assert.equal(result.cases[1]?.id, 'T-REQ-002-02');
    assert.equal(result.cases[1]?.title, 'Missing-field rejection');
  });

  it('returns empty arrays for blank input', () => {
    const result = parseTestDesignerResult('', { requirementId: 'REQ-002' });
    assert.equal(result.confidence, 'raw');
    assert.equal(result.verificationCriteria.length, 0);
    assert.equal(result.cases.length, 0);
  });

  it('preserves Given/When/Then bullets verbatim (no AST split per spec §10 Risk 1)', () => {
    const result = parseTestDesignerResult(HIGH_CONFIDENCE, { requirementId: 'REQ-002' });
    const firstCase = result.cases[0];
    assert.ok(firstCase);
    // All three bullets present, in order, with their labels intact.
    assert.equal(firstCase.bullets.length, 3);
    assert.match(firstCase.bullets[0] ?? '', /^Given:/);
    assert.match(firstCase.bullets[1] ?? '', /^When:/);
    assert.match(firstCase.bullets[2] ?? '', /^Then:/);
  });

  it('parses multiple verification criteria bullet styles (- and *)', () => {
    const input = `## Verification Criteria

- First criterion.
* Second criterion.
- Third criterion.

## Test Specification

### T-REQ-002-01 Sample
- Given: x.
`;
    const result = parseTestDesignerResult(input, { requirementId: 'REQ-002' });
    assert.equal(result.verificationCriteria.length, 3);
    assert.equal(result.verificationCriteria[1]?.text, 'Second criterion.');
  });
});

// --- helpers ---------------------------------------------------------------

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
