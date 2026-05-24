import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type {
  CodebaseMemory,
  RequirementMemory,
  TestSpecMemory,
} from '@deliveryos/contracts';
import {
  BRIEF_SCHEMA_VERSION,
  CANONICAL_BRIEF_TITLE,
  renderExpectedOutputSection,
} from '../src/brief/briefMarkdown';
import {
  renderContextPackage,
  renderMemorySummary,
  renderTestSpecification,
  renderVerificationChecklist,
} from '../src/brief/handoffSiblings';
import type { ExecutionBrief } from '../src/brief/types';

const ISO = '2026-07-07T10:30:00Z';
const LOCKED = '2026-07-07T11:05:00Z';

function makeBrief(overrides: Partial<ExecutionBrief> = {}): ExecutionBrief {
  const base: ExecutionBrief = {
    frontmatter: {
      brief_id: 'brief_fixture',
      schema_version: BRIEF_SCHEMA_VERSION,
      project_id: 'prj',
      requirement_id: 'REQ-001',
      profile: '(unspecified)',
      created_at: ISO,
      locked_at: LOCKED,
    },
    title: CANONICAL_BRIEF_TITLE,
    metaLines: {
      profile: '(unspecified)',
      project: 'Bug Triage',
      requirement: 'REQ-001 — Triage incoming bugs',
    },
    sections: {
      objective: { id: 'objective', number: 1, name: 'Objective', body: 'Do the work.' },
      'approved-requirement': {
        id: 'approved-requirement',
        number: 2,
        name: 'Approved Requirement',
        body: 'REQ-001 — Triage incoming bugs.',
      },
      'business-intent': {
        id: 'business-intent',
        number: 3,
        name: 'Business Intent',
        body: 'Reduce time-to-fix.',
      },
      'approved-design-context': {
        id: 'approved-design-context',
        number: 4,
        name: 'Approved Design Context',
        body: 'Architecture.',
      },
      'existing-codebase-context': {
        id: 'existing-codebase-context',
        number: 5,
        name: 'Existing Codebase Context',
        body: 'src/api/ houses the FastAPI router.',
      },
      'test-first-specification': {
        id: 'test-first-specification',
        number: 6,
        name: 'Test-First Specification',
        body: '- VC-1: happy path',
      },
      'allowed-changes': {
        id: 'allowed-changes',
        number: 7,
        name: 'Allowed Changes',
        body: '- src/api/triage.py',
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
        body: '- Tests pass\n- No forbidden file changed\n- Linter clean',
      },
    },
    allowed: { kind: 'allowed', globs: ['src/api/triage.py'] },
    forbidden: { kind: 'forbidden', globs: ['migrations/**'] },
  };
  return { ...base, ...overrides };
}

const REQUIREMENT_FIXTURE: RequirementMemory = {
  id: 'requirement-r001',
  type: 'requirement',
  title: 'Triage incoming bugs',
  payload: {
    category: 'functional',
    priority: 'must',
    text: 'Sort by severity then age.',
  },
  body: 'Sort by severity then age.',
  createdAt: 1,
  updatedAt: 1,
};

describe('renderContextPackage', () => {
  it('renders codebase memory when present (folder structure + key files + conventions)', () => {
    const codebase: CodebaseMemory = {
      id: 'codebase-c001',
      type: 'codebase',
      title: 'Bug Triage codebase',
      body: '',
      createdAt: 1,
      updatedAt: 1,
      payload: {
        folderStructure: 'src/api/\n  triage.py',
        keyFiles: [{ path: 'src/api/triage.py', purpose: 'FastAPI router' }],
        conventions: ['ruff for lint', 'pytest for tests'],
        testCommands: ['pytest -q'],
      },
    };
    const out = renderContextPackage(REQUIREMENT_FIXTURE, codebase, makeBrief());
    assert.match(out, /# Existing Codebase Context/);
    assert.match(out, /## Folder structure/);
    assert.match(out, /triage\.py/);
    assert.match(out, /## Key files/);
    assert.match(out, /FastAPI router/);
    assert.match(out, /## Conventions/);
    assert.match(out, /ruff for lint/);
    assert.match(out, /## Test commands/);
    assert.match(out, /pytest -q/);
  });

  it('falls back to Section 5 verbatim when no codebase memory linked', () => {
    const out = renderContextPackage(REQUIREMENT_FIXTURE, null, makeBrief());
    assert.match(out, /src\/api\/ houses the FastAPI router\./);
  });

  it('handles empty Section 5 gracefully', () => {
    const brief = makeBrief({
      sections: {
        ...makeBrief().sections,
        'existing-codebase-context': {
          id: 'existing-codebase-context',
          number: 5,
          name: 'Existing Codebase Context',
          body: '',
        },
      },
    });
    const out = renderContextPackage(REQUIREMENT_FIXTURE, null, brief);
    assert.match(out, /_\(empty\)_/);
  });

  it('is byte-stable for identical inputs', () => {
    const a = renderContextPackage(REQUIREMENT_FIXTURE, null, makeBrief());
    const b = renderContextPackage(REQUIREMENT_FIXTURE, null, makeBrief());
    assert.equal(a, b);
  });
});

describe('renderTestSpecification', () => {
  it('emits the heading + preamble + raw test-spec body', () => {
    const testSpec: TestSpecMemory = {
      id: 'test-spec-ts001',
      type: 'test-spec',
      title: 'TS-REQ-001 — Triage tests',
      body: '## Verification Criteria\n- VC-1: ...\n\n## Test Specification\n### T-1\n- step 1',
      createdAt: 1,
      updatedAt: 1,
      payload: {
        requirementId: 'requirement-r001',
        scenarios: [{ id: 's1', description: 'happy', steps: [], expected: [] }],
      },
    };
    const out = renderTestSpecification(testSpec);
    assert.match(out, /# Test Specification/);
    assert.match(out, /TS-REQ-001 — Triage tests/);
    assert.match(out, /## Verification Criteria/);
    assert.match(out, /T-1/);
  });
});

describe('renderVerificationChecklist', () => {
  it('converts Section 10 bulleted lines to GFM checkbox items', () => {
    const out = renderVerificationChecklist(makeBrief());
    assert.match(out, /# Verification Checklist/);
    assert.match(out, /- \[ \] Tests pass/);
    assert.match(out, /- \[ \] No forbidden file changed/);
    assert.match(out, /- \[ \] Linter clean/);
  });
  it('preserves existing [ ] / [x] checkboxes', () => {
    const brief = makeBrief({
      sections: {
        ...makeBrief().sections,
        'completion-criteria': {
          id: 'completion-criteria',
          number: 10,
          name: 'Completion Criteria',
          body: '- [x] already-done\n- still-todo',
        },
      },
    });
    const out = renderVerificationChecklist(brief);
    assert.match(out, /- \[ \] already-done/);
    assert.match(out, /- \[ \] still-todo/);
  });
});

describe('renderMemorySummary', () => {
  it('emits a tight rollup including requirement + brief headers', () => {
    const out = renderMemorySummary({
      brief: makeBrief(),
      requirement: REQUIREMENT_FIXTURE,
      linkedEntries: [
        { id: 'intent-001', type: 'intent', title: 'Bug Triage Assistant' },
        { id: 'test-spec-001', type: 'test-spec', title: 'TS-REQ-001 — Triage tests' },
      ],
    });
    assert.match(out, /# Memory summary/);
    assert.match(out, /Requirement: requirement-r001 — Triage incoming bugs/);
    assert.match(out, /Brief: brief_fixture/);
    assert.match(out, /## Linked entries/);
    assert.match(out, /- intent:intent-001/);
    assert.match(out, /- test-spec:test-spec-001/);
  });

  it('truncates linked entries past the 50-line cap', () => {
    const linkedEntries = [] as { id: string; type: string; title: string }[];
    for (let i = 0; i < 100; i++) {
      linkedEntries.push({ id: `entry-${i}`, type: 'design', title: `Decision ${i}` });
    }
    const out = renderMemorySummary({
      brief: makeBrief(),
      requirement: REQUIREMENT_FIXTURE,
      linkedEntries,
    });
    const lineCount = out.split('\n').filter((l) => l.length > 0).length;
    assert.ok(lineCount <= 50, `expected ≤ 50 non-empty lines, got ${lineCount}`);
    assert.match(out, /more \(truncated\)/);
  });
});
