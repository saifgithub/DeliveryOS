import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRIEF_SCHEMA_VERSION,
  CANONICAL_BRIEF_TITLE,
  renderExpectedOutputSection,
} from '../src/brief/briefMarkdown';
import { validate } from '../src/brief/briefValidator';
import type { ExecutionBrief } from '../src/brief/types';

const ISO = '2026-07-07T10:30:00Z';

function makeBrief(overrides: Partial<ExecutionBrief> = {}): ExecutionBrief {
  const base: ExecutionBrief = {
    frontmatter: {
      brief_id: 'brief_test-v',
      schema_version: BRIEF_SCHEMA_VERSION,
      project_id: 'prj',
      requirement_id: 'requirement-x',
      profile: '(unspecified)',
      created_at: ISO,
    },
    title: CANONICAL_BRIEF_TITLE,
    metaLines: {
      profile: '(unspecified)',
      project: 'Demo',
      requirement: 'REQ-001 — Stub',
    },
    sections: {
      objective: { id: 'objective', number: 1, name: 'Objective', body: 'Do the thing.' },
      'approved-requirement': {
        id: 'approved-requirement',
        number: 2,
        name: 'Approved Requirement',
        body: 'REQ-001 — Stub. The thing.',
      },
      'business-intent': {
        id: 'business-intent',
        number: 3,
        name: 'Business Intent',
        body: 'Because it is good for users.',
      },
      'approved-design-context': {
        id: 'approved-design-context',
        number: 4,
        name: 'Approved Design Context',
        body: 'Architecture notes.',
      },
      'existing-codebase-context': {
        id: 'existing-codebase-context',
        number: 5,
        name: 'Existing Codebase Context',
        body: 'src/ houses the app and tests/ houses the tests. Postgres test container.',
      },
      'test-first-specification': {
        id: 'test-first-specification',
        number: 6,
        name: 'Test-First Specification',
        body: '- VC-1: happy path\n- VC-2: 4xx on bad input',
      },
      'allowed-changes': {
        id: 'allowed-changes',
        number: 7,
        name: 'Allowed Changes',
        body: '- src/foo.ts\n- tests/foo.test.ts',
      },
      'forbidden-changes': {
        id: 'forbidden-changes',
        number: 8,
        name: 'Forbidden Changes',
        body: '- migrations/**',
      },
      'expected-output': {
        id: 'expected-output',
        number: 9,
        name: 'Expected Output',
        body: renderExpectedOutputSection(),
      },
      'completion-criteria': {
        id: 'completion-criteria',
        number: 10,
        name: 'Completion Criteria',
        body: '- tests pass\n- no forbidden file changed',
      },
    },
    allowed: { kind: 'allowed', globs: ['src/foo.ts', 'tests/foo.test.ts'] },
    forbidden: { kind: 'forbidden', globs: ['migrations/**'] },
  };
  return { ...base, ...overrides };
}

describe('validate — happy path', () => {
  it('returns ok for a complete brief', () => {
    const v = validate(makeBrief());
    assert.equal(v.ok, true, `unexpected errors: ${JSON.stringify(v.errors)}`);
    assert.deepEqual(v.errors, []);
  });
});

describe('validate — frontmatter', () => {
  it('blocks save with missing brief_id', () => {
    const v = validate(
      makeBrief({
        frontmatter: {
          brief_id: '',
          schema_version: BRIEF_SCHEMA_VERSION,
          project_id: 'p',
          requirement_id: 'r',
          profile: '(unspecified)',
          created_at: ISO,
        },
      }),
    );
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => /brief_id/.test(e)));
  });
  it('blocks save with wrong schema_version', () => {
    const v = validate(
      makeBrief({
        frontmatter: {
          brief_id: 'brief_x',
          schema_version: 99,
          project_id: 'p',
          requirement_id: 'r',
          profile: '(unspecified)',
          created_at: ISO,
        },
      }),
    );
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => /schema_version/.test(e)));
  });
});

describe('validate — sections', () => {
  it('blocks save when Section 1 body is empty', () => {
    const b = makeBrief();
    const v = validate({
      ...b,
      sections: {
        ...b.sections,
        objective: { ...b.sections.objective, body: '   ' },
      },
    });
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => /Objective/.test(e)));
  });
  it('blocks save when Section 9 has been tampered with', () => {
    const b = makeBrief();
    const v = validate({
      ...b,
      sections: {
        ...b.sections,
        'expected-output': {
          ...b.sections['expected-output'],
          body: 'custom expected output (not the template)',
        },
      },
    });
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => /Section 9/.test(e)));
  });
  it('warns but does not block when Section 5 is short', () => {
    const b = makeBrief();
    const v = validate({
      ...b,
      sections: {
        ...b.sections,
        'existing-codebase-context': {
          ...b.sections['existing-codebase-context'],
          body: 'tiny',
        },
      },
    });
    assert.equal(v.ok, true);
    assert.ok(v.warnings.some((w) => /Section 5/.test(w)));
  });
});

describe('validate — Allowed list', () => {
  it('blocks save when Allowed is empty', () => {
    const b = makeBrief();
    const v = validate({
      ...b,
      allowed: { kind: 'allowed', globs: [] },
      sections: {
        ...b.sections,
        'allowed-changes': { ...b.sections['allowed-changes'], body: '' },
      },
    });
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => /Allowed Changes/.test(e)));
  });
  it('blocks save when an Allowed glob is so large picomatch chokes on it', () => {
    // picomatch.makeRe throws on inputs > 65,536 chars. The validator catches
    // that and emits a per-line error.
    const b = makeBrief();
    const v = validate({
      ...b,
      allowed: { kind: 'allowed', globs: ['src/legit.ts', 'a'.repeat(100_000)] },
    });
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => /Allowed list line 2/.test(e)));
  });
  it('blocks save when an Allowed glob is blank', () => {
    const b = makeBrief();
    const v = validate({
      ...b,
      allowed: { kind: 'allowed', globs: ['  '] },
    });
    assert.equal(v.ok, false);
  });
  it('warns on duplicates', () => {
    const b = makeBrief();
    const v = validate({
      ...b,
      allowed: { kind: 'allowed', globs: ['src/foo.ts', 'src/foo.ts'] },
    });
    assert.equal(v.ok, true);
    assert.ok(v.warnings.some((w) => /more than once/.test(w)));
  });
});

describe('validate — Forbidden list', () => {
  it('accepts empty Forbidden', () => {
    const b = makeBrief();
    const v = validate({
      ...b,
      forbidden: { kind: 'forbidden', globs: [] },
      sections: {
        ...b.sections,
        'forbidden-changes': { ...b.sections['forbidden-changes'], body: '- (none)' },
      },
    });
    assert.equal(v.ok, true);
  });
  it('blocks save on blank Forbidden glob', () => {
    const b = makeBrief();
    const v = validate({
      ...b,
      forbidden: { kind: 'forbidden', globs: ['   '] },
    });
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => /Forbidden list line 1/.test(e)));
  });
});
