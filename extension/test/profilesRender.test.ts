// CHUNK-10 § 3 + § 11 — unit tests for the profile-aware brief renderer.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRIEF_SCHEMA_VERSION,
  CANONICAL_BRIEF_TITLE,
} from '../src/brief/briefMarkdown';
import type { ExecutionBrief } from '../src/brief/types';
import { PROFILES, getProfile } from '../src/profiles/registry';
import { renderBrief } from '../src/profiles/render';
import type { HarnessProfile } from '../src/profiles/types';

const ISO = '2026-07-07T10:30:00Z';

function makeBrief(overrides: Partial<ExecutionBrief> = {}): ExecutionBrief {
  const base: ExecutionBrief = {
    frontmatter: {
      brief_id: 'brief_abc-123',
      schema_version: BRIEF_SCHEMA_VERSION,
      project_id: 'proj-demo',
      requirement_id: 'requirement-x',
      profile: '(unspecified)',
      created_at: ISO,
    },
    title: CANONICAL_BRIEF_TITLE,
    metaLines: {
      profile: '(unspecified)',
      project: 'Demo Project',
      requirement: 'REQ-001 — Build the bug submission API',
    },
    sections: {
      objective: {
        id: 'objective',
        number: 1,
        name: 'Objective',
        body: 'Implement bug submission endpoint.',
      },
      'approved-requirement': {
        id: 'approved-requirement',
        number: 2,
        name: 'Approved Requirement',
        body: 'Users can submit bugs via REST.',
      },
      'business-intent': {
        id: 'business-intent',
        number: 3,
        name: 'Business Intent',
        body: 'Reduce support volume by collecting structured reports.',
      },
      'approved-design-context': {
        id: 'approved-design-context',
        number: 4,
        name: 'Approved Design Context',
        body: 'POST /api/bugs returns 201 with the created id.',
      },
      'existing-codebase-context': {
        id: 'existing-codebase-context',
        number: 5,
        name: 'Existing Codebase Context',
        body: 'test: npm test\nlint: npm run lint\nbuild: npm run build\n\nThe API lives under src/api/.',
      },
      'test-first-specification': {
        id: 'test-first-specification',
        number: 6,
        name: 'Test-First Specification',
        body: '- Given a valid payload, when POST, then 201.',
      },
      'allowed-changes': {
        id: 'allowed-changes',
        number: 7,
        name: 'Allowed Changes',
        body: '- src/api/**\n- test/api/**',
      },
      'forbidden-changes': {
        id: 'forbidden-changes',
        number: 8,
        name: 'Forbidden Changes',
        body: '- src/billing/**',
      },
      'expected-output': {
        id: 'expected-output',
        number: 9,
        name: 'Expected Output',
        body: 'Section 9 template body.',
      },
      'completion-criteria': {
        id: 'completion-criteria',
        number: 10,
        name: 'Completion Criteria',
        body: '- Tests pass.\n- Lint clean.',
      },
    },
    allowed: { kind: 'allowed', globs: ['src/api/**', 'test/api/**'] },
    forbidden: { kind: 'forbidden', globs: ['src/billing/**'] },
  };
  return { ...base, ...overrides };
}

describe('renderBrief — preamble', () => {
  it('emits profile + project + requirement header lines for Claude Code', () => {
    const brief = makeBrief();
    const out = renderBrief(brief, PROFILES['claude-code']);
    assert.match(out.markdown, /^# DeliveryOS Execution Brief\n/);
    assert.match(out.markdown, /## Profile: Claude Code\n/);
    assert.match(out.markdown, /## Project: Demo Project\n/);
    assert.match(out.markdown, /## Requirement: REQ-001 — Build the bug submission API\n/);
  });

  it('emits the profile display_name for Codex', () => {
    const out = renderBrief(makeBrief(), PROFILES.codex);
    assert.match(out.markdown, /## Profile: Codex\n/);
  });

  it('returns profileName + briefId on the result envelope', () => {
    const out = renderBrief(makeBrief(), PROFILES['claude-code']);
    assert.equal(out.profileName, 'claude-code');
    assert.equal(out.briefId, 'brief_abc-123');
    assert.ok(out.renderedAt.endsWith('Z'));
  });
});

describe('renderBrief — Commands block heuristic', () => {
  it('extracts test/lint/build lines from Section 5 when flags allow', () => {
    const out = renderBrief(makeBrief(), PROFILES['claude-code']);
    assert.match(out.markdown, /## Commands\n\n- test: npm test\n- lint: npm run lint\n- build: npm run build/);
  });

  it('omits the Commands block when no commands match', () => {
    const brief = makeBrief({
      sections: {
        ...makeBrief().sections,
        'existing-codebase-context': {
          id: 'existing-codebase-context',
          number: 5,
          name: 'Existing Codebase Context',
          body: 'Just prose. No command lines here.',
        },
      },
    });
    const out = renderBrief(brief, PROFILES['claude-code']);
    assert.ok(!out.markdown.includes('## Commands'));
  });

  it('omits test command when include_test_commands is false', () => {
    const profile: HarnessProfile = {
      ...PROFILES['claude-code'],
      include_test_commands: false,
    };
    const out = renderBrief(makeBrief(), profile);
    assert.ok(!out.markdown.includes('- test: npm test'));
    assert.match(out.markdown, /- lint: npm run lint/);
  });
});

describe('renderBrief — section flags', () => {
  it('renders all 10 sections by default', () => {
    const out = renderBrief(makeBrief(), PROFILES['claude-code']);
    for (let n = 1; n <= 10; n++) {
      assert.match(out.markdown, new RegExp(`## ${n}\\. `), `section ${n} missing`);
    }
  });

  it('drops Section 8 (Forbidden Changes) when include_forbidden_changes is false', () => {
    const profile: HarnessProfile = {
      ...PROFILES['claude-code'],
      include_forbidden_changes: false,
    };
    const out = renderBrief(makeBrief(), profile);
    assert.ok(!out.markdown.includes('## 8. Forbidden Changes'));
    assert.match(out.markdown, /## 7\. Allowed Changes/);
    assert.match(out.markdown, /## 9\. Expected Output/);
  });

  it("drops Sections 3, 4, 5 when brief_style is 'concise'", () => {
    const profile: HarnessProfile = {
      ...PROFILES['claude-code'],
      brief_style: 'concise',
    };
    const out = renderBrief(makeBrief(), profile);
    assert.ok(!out.markdown.includes('## 3. Business Intent'));
    assert.ok(!out.markdown.includes('## 4. Approved Design Context'));
    assert.ok(!out.markdown.includes('## 5. Existing Codebase Context'));
    assert.match(out.markdown, /## 2\. Approved Requirement/);
    assert.match(out.markdown, /## 6\. Test-First Specification/);
  });
});

describe('renderBrief — determinism', () => {
  it('produces identical markdown across two renders of the same brief', () => {
    const brief = makeBrief();
    const a = renderBrief(brief, PROFILES['claude-code']);
    const b = renderBrief(brief, PROFILES['claude-code']);
    assert.equal(a.markdown, b.markdown);
  });
});

describe('getProfile lookup', () => {
  it('returns the Claude Code profile by name', () => {
    assert.equal(getProfile('claude-code').name, 'claude-code');
    assert.equal(getProfile('claude-code').instruction_file, 'CLAUDE.md');
  });
  it('returns the Codex profile by name', () => {
    assert.equal(getProfile('codex').name, 'codex');
    assert.equal(getProfile('codex').instruction_file, 'AGENTS.md');
  });
});
