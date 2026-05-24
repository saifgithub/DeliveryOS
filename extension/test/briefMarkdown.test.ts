import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRIEF_SCHEMA_VERSION,
  BRIEF_SECTION_NAMES,
  BRIEF_SECTION_IDS,
  BriefMarkdownParseError,
  CANONICAL_BRIEF_TITLE,
  RESULT_MD_SECTION_NAMES,
  parse,
  parseAllowedForbidden,
  renderExpectedOutputSection,
  sectionId,
  sectionName,
  sectionNumber,
  serialise,
} from '../src/brief/briefMarkdown';
import type { ExecutionBrief } from '../src/brief/types';

const ISO = '2026-07-07T10:30:00Z';
const LOCKED = '2026-07-07T11:05:00Z';

const FIXTURE_BRIEF: ExecutionBrief = {
  frontmatter: {
    brief_id: 'brief_test-fixture-0001',
    schema_version: BRIEF_SCHEMA_VERSION,
    project_id: 'prj_demo',
    requirement_id: 'requirement-abcd1234',
    test_spec_id: 'test-spec-xyzw5678',
    profile: '(unspecified)',
    created_at: ISO,
    locked_at: LOCKED,
  },
  title: CANONICAL_BRIEF_TITLE,
  metaLines: {
    profile: '(unspecified)',
    project: 'Bug Triage Assistant',
    requirement: 'REQ-002 — Bug submission API',
  },
  sections: {
    objective: {
      id: 'objective',
      number: 1,
      name: 'Objective',
      body: 'Implement a JSON `POST /bugs` endpoint that accepts a new bug report.',
    },
    'approved-requirement': {
      id: 'approved-requirement',
      number: 2,
      name: 'Approved Requirement',
      body: 'REQ-002 — Bug submission API. Validates payload, persists to DB, returns 201.',
    },
    'business-intent': {
      id: 'business-intent',
      number: 3,
      name: 'Business Intent',
      body: 'Lower friction for users reporting bugs from the in-app feedback widget.',
    },
    'approved-design-context': {
      id: 'approved-design-context',
      number: 4,
      name: 'Approved Design Context',
      body: '- Use existing FastAPI router\n- Pydantic v2 validation\n- SQLAlchemy 2.x repository pattern',
    },
    'existing-codebase-context': {
      id: 'existing-codebase-context',
      number: 5,
      name: 'Existing Codebase Context',
      body: 'src/backend/ houses the FastAPI app. tests/integration/ runs against a Postgres test container.',
    },
    'test-first-specification': {
      id: 'test-first-specification',
      number: 6,
      name: 'Test-First Specification',
      body: '- VC-REQ-002-01: 201 on valid payload\n- VC-REQ-002-02: 422 on missing title',
    },
    'allowed-changes': {
      id: 'allowed-changes',
      number: 7,
      name: 'Allowed Changes',
      body: '- src/backend/api/bugs.py\n- src/backend/models/bug_report.py\n- tests/integration/test_bugs_api.py',
    },
    'forbidden-changes': {
      id: 'forbidden-changes',
      number: 8,
      name: 'Forbidden Changes',
      body: '- src/backend/api/users.py\n- migrations/**\n- src/frontend/**',
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
      body: '- All Allowed files modified or new\n- No Forbidden files touched\n- All listed test cases pass',
    },
  },
  allowed: {
    kind: 'allowed',
    globs: [
      'src/backend/api/bugs.py',
      'src/backend/models/bug_report.py',
      'tests/integration/test_bugs_api.py',
    ],
  },
  forbidden: {
    kind: 'forbidden',
    globs: ['src/backend/api/users.py', 'migrations/**', 'src/frontend/**'],
  },
};

describe('BRIEF_SECTION_NAMES', () => {
  it('has exactly 10 unique entries in canonical order', () => {
    assert.equal(BRIEF_SECTION_NAMES.length, 10);
    assert.equal(new Set(BRIEF_SECTION_NAMES).size, 10);
    assert.equal(BRIEF_SECTION_NAMES[0], 'Objective');
    assert.equal(BRIEF_SECTION_NAMES[9], 'Completion Criteria');
  });
});

describe('RESULT_MD_SECTION_NAMES', () => {
  it('has the 6 canonical result.md section names CHUNK-12 expects', () => {
    assert.deepEqual(RESULT_MD_SECTION_NAMES, [
      'Summary of Changes',
      'Files Changed',
      'Tests Added/Updated',
      'Tests Run',
      'Risks',
      'Unresolved Questions',
    ]);
  });
});

describe('renderExpectedOutputSection', () => {
  it('embeds every RESULT_MD_SECTION_NAMES name verbatim', () => {
    const out = renderExpectedOutputSection();
    for (const name of RESULT_MD_SECTION_NAMES) {
      assert.ok(out.includes(name), `expected ${name} in rendered output`);
    }
  });
  it('is deterministic', () => {
    assert.equal(renderExpectedOutputSection(), renderExpectedOutputSection());
  });
});

describe('sectionId / sectionNumber / sectionName helpers', () => {
  it('round-trip across the 10 sections', () => {
    for (let n = 1; n <= 10; n++) {
      const id = sectionId(n);
      assert.ok(id !== null);
      assert.equal(sectionNumber(id!), n);
      assert.equal(sectionName(id!), BRIEF_SECTION_NAMES[n - 1]);
    }
  });
  it('returns null for out-of-range numbers', () => {
    assert.equal(sectionId(0), null);
    assert.equal(sectionId(11), null);
  });
});

describe('serialise', () => {
  it('produces a brief that starts with frontmatter + canonical title', () => {
    const md = serialise(FIXTURE_BRIEF);
    assert.ok(md.startsWith('---\n'));
    assert.match(md, /\n# DeliveryOS Execution Brief\n/);
  });
  it('emits all 10 sections in numeric order', () => {
    const md = serialise(FIXTURE_BRIEF);
    let lastIdx = -1;
    for (let n = 1; n <= 10; n++) {
      const heading = `## ${n}. ${BRIEF_SECTION_NAMES[n - 1]}`;
      const idx = md.indexOf(heading);
      assert.ok(idx > -1, `missing heading: ${heading}`);
      assert.ok(idx > lastIdx, `heading ${heading} out of order`);
      lastIdx = idx;
    }
  });
  it('emits the meta lines block above Section 1', () => {
    const md = serialise(FIXTURE_BRIEF);
    assert.match(md, /Profile: \(unspecified\)/);
    assert.match(md, /Project: Bug Triage Assistant/);
    assert.match(md, /Requirement: REQ-002 — Bug submission API/);
    assert.ok(md.indexOf('Requirement:') < md.indexOf('## 1.'));
  });
  it('is deterministic', () => {
    assert.equal(serialise(FIXTURE_BRIEF), serialise(FIXTURE_BRIEF));
  });
  it('ends with exactly one trailing newline', () => {
    const md = serialise(FIXTURE_BRIEF);
    assert.match(md, /\n$/);
    assert.doesNotMatch(md, /\n\n$/);
  });
});

describe('parse → serialise round-trip', () => {
  it('round-trips the fixture brief byte-for-byte', () => {
    const a = serialise(FIXTURE_BRIEF);
    const parsed = parse(a);
    assert.equal(parsed.warnings.length, 0);
    const b = serialise(parsed.brief);
    assert.equal(a, b);
  });
  it('round-trip preserves frontmatter optional keys', () => {
    const { brief } = parse(serialise(FIXTURE_BRIEF));
    assert.equal(brief.frontmatter.test_spec_id, 'test-spec-xyzw5678');
    assert.equal(brief.frontmatter.locked_at, LOCKED);
  });
  it('round-trips a brief without optional frontmatter keys', () => {
    const minimal: ExecutionBrief = {
      ...FIXTURE_BRIEF,
      frontmatter: {
        brief_id: 'brief_min',
        schema_version: BRIEF_SCHEMA_VERSION,
        project_id: 'prj_min',
        requirement_id: 'requirement-min',
        profile: '(unspecified)',
        created_at: ISO,
      },
    };
    const a = serialise(minimal);
    const { brief } = parse(a);
    assert.equal(brief.frontmatter.test_spec_id, undefined);
    assert.equal(brief.frontmatter.locked_at, undefined);
    assert.equal(brief.frontmatter.supersedes, undefined);
    assert.equal(serialise(brief), a);
  });
});

describe('parse — strict failures', () => {
  it('throws on missing frontmatter', () => {
    const noFrontmatter = serialise(FIXTURE_BRIEF).replace(/^---\n[\s\S]*?\n---\n/, '');
    assert.throws(
      () => parse(noFrontmatter),
      (err) => err instanceof BriefMarkdownParseError && err.kind === 'missing-frontmatter',
    );
  });
  it('throws on schema-version mismatch', () => {
    const wrong = serialise(FIXTURE_BRIEF).replace(
      `schema_version: ${BRIEF_SCHEMA_VERSION}`,
      'schema_version: 9',
    );
    assert.throws(
      () => parse(wrong),
      (err) => err instanceof BriefMarkdownParseError && err.kind === 'schema-mismatch',
    );
  });
  it('throws on missing required frontmatter key', () => {
    const noProject = serialise(FIXTURE_BRIEF).replace(/project_id: "[^"]*"\n/, '');
    assert.throws(
      () => parse(noProject),
      (err) => err instanceof BriefMarkdownParseError && err.kind === 'missing-required-key',
    );
  });
  it('throws on a section heading whose name is wrong', () => {
    const renamed = serialise(FIXTURE_BRIEF).replace(
      '## 7. Allowed Changes',
      '## 7. Allowed',
    );
    assert.throws(
      () => parse(renamed),
      (err) => err instanceof BriefMarkdownParseError && err.kind === 'bad-section-name',
    );
  });
  it('throws on duplicate section', () => {
    // Inject an extra `## 1. Objective` block.
    const md = serialise(FIXTURE_BRIEF).replace(
      '## 2. Approved Requirement',
      '## 1. Objective\n\nduplicated\n\n## 2. Approved Requirement',
    );
    assert.throws(
      () => parse(md),
      (err) => err instanceof BriefMarkdownParseError && err.kind === 'duplicate-section',
    );
  });
  it('throws on out-of-order section', () => {
    const swapped = serialise(FIXTURE_BRIEF)
      .replace('## 1. Objective', '__PLACEHOLDER1__')
      .replace('## 2. Approved Requirement', '## 1. Objective')
      .replace('__PLACEHOLDER1__', '## 2. Approved Requirement');
    assert.throws(
      () => parse(swapped),
      (err) =>
        err instanceof BriefMarkdownParseError &&
        (err.kind === 'out-of-order' || err.kind === 'bad-section-name'),
    );
  });
  it('throws on missing section', () => {
    // Drop Section 10 entirely.
    const md = serialise(FIXTURE_BRIEF).replace(
      /## 10\. Completion Criteria[\s\S]*$/,
      '',
    );
    assert.throws(
      () => parse(md),
      (err) => err instanceof BriefMarkdownParseError && err.kind === 'missing-section',
    );
  });
  it('throws on broken YAML', () => {
    const md = '---\nthis-is-not-a-yaml-line-without-colon\n---\n# DeliveryOS Execution Brief\n';
    assert.throws(
      () => parse(md),
      (err) => err instanceof BriefMarkdownParseError && err.kind === 'invalid-yaml',
    );
  });
});

describe('parse — lenient warnings', () => {
  it('normalises CRLF line endings and warns', () => {
    const md = serialise(FIXTURE_BRIEF).replace(/\n/g, '\r\n');
    const { brief, warnings } = parse(md);
    assert.ok(warnings.includes('crlf-normalised'));
    assert.equal(brief.sections.objective.body, FIXTURE_BRIEF.sections.objective.body);
  });
  it('accepts case-insensitive H1 title and warns', () => {
    const md = serialise(FIXTURE_BRIEF).replace(
      '# DeliveryOS Execution Brief',
      '# deliveryos execution brief',
    );
    const { warnings } = parse(md);
    assert.ok(warnings.includes('h1-case-mismatch'));
  });
});

describe('parse — Allowed/Forbidden lists', () => {
  it('reads bullets out of the Section 7 body', () => {
    const { brief } = parse(serialise(FIXTURE_BRIEF));
    assert.deepEqual(brief.allowed.globs, [
      'src/backend/api/bugs.py',
      'src/backend/models/bug_report.py',
      'tests/integration/test_bugs_api.py',
    ]);
  });
  it('normalises trailing-slash directory shorthand to **', () => {
    const withTrailingSlash = serialise({
      ...FIXTURE_BRIEF,
      sections: {
        ...FIXTURE_BRIEF.sections,
        'allowed-changes': {
          ...FIXTURE_BRIEF.sections['allowed-changes'],
          body: '- src/legacy/\n- src/backend/api/bugs.py',
        },
      },
    });
    const { brief } = parse(withTrailingSlash);
    assert.deepEqual(
      brief.allowed.globs,
      ['src/legacy/**', 'src/backend/api/bugs.py'],
      'trailing slash should normalise to /**',
    );
  });
  it('treats empty-Forbidden sentinel `- (none)` as []', () => {
    const md = serialise({
      ...FIXTURE_BRIEF,
      sections: {
        ...FIXTURE_BRIEF.sections,
        'forbidden-changes': {
          ...FIXTURE_BRIEF.sections['forbidden-changes'],
          body: '- (none)',
        },
      },
      forbidden: { kind: 'forbidden', globs: [] },
    });
    const { brief } = parse(md);
    assert.deepEqual(brief.forbidden.globs, []);
  });
  it('accepts bare lines (no bullet) and trims them', () => {
    const md = serialise({
      ...FIXTURE_BRIEF,
      sections: {
        ...FIXTURE_BRIEF.sections,
        'allowed-changes': {
          ...FIXTURE_BRIEF.sections['allowed-changes'],
          body: 'src/backend/api/bugs.py\nsrc/backend/models/bug_report.py',
        },
      },
    });
    const { brief } = parse(md);
    assert.deepEqual(brief.allowed.globs, [
      'src/backend/api/bugs.py',
      'src/backend/models/bug_report.py',
    ]);
  });
});

describe('parseAllowedForbidden — cheap path', () => {
  it('extracts globs without requiring valid frontmatter', () => {
    const partial = [
      '<-- whatever preamble -->',
      '## 7. Allowed Changes',
      '- src/api/foo.ts',
      '- src/api/bar.ts',
      '',
      '## 8. Forbidden Changes',
      '- migrations/**',
    ].join('\n');
    const out = parseAllowedForbidden(partial);
    assert.deepEqual(out.allowed, ['src/api/foo.ts', 'src/api/bar.ts']);
    assert.deepEqual(out.forbidden, ['migrations/**']);
  });
  it('returns empty arrays when sections are absent', () => {
    const out = parseAllowedForbidden('# Random doc with no brief structure\n');
    assert.deepEqual(out.allowed, []);
    assert.deepEqual(out.forbidden, []);
  });
  it('treats `- (none)` as empty Forbidden', () => {
    const md = ['## 7. Allowed Changes', '- foo.ts', '', '## 8. Forbidden Changes', '- (none)'].join(
      '\n',
    );
    const out = parseAllowedForbidden(md);
    assert.deepEqual(out.forbidden, []);
  });
  it('normalises trailing-slash directory shorthand at the cheap path too', () => {
    const md = ['## 7. Allowed Changes', '- src/legacy/', '', '## 8. Forbidden Changes', ''].join(
      '\n',
    );
    const out = parseAllowedForbidden(md);
    assert.deepEqual(out.allowed, ['src/legacy/**']);
  });
});

describe('BRIEF_SECTION_IDS', () => {
  it('matches the section name order', () => {
    for (let i = 0; i < 10; i++) {
      assert.equal(sectionName(BRIEF_SECTION_IDS[i]), BRIEF_SECTION_NAMES[i]);
    }
  });
});
