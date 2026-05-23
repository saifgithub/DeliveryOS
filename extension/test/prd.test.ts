import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { PRD_SECTION_IDS } from '@deliveryos/contracts';
import { parsePrdMarkdown, renderPrdMarkdown } from '../src/prd/sectionSchema';
import { buildGenerateDraftPrompt, buildReviseSectionPrompt } from '../src/prd/promptBuilder';
import type { DiscoveryRecord } from '@deliveryos/contracts';

const FIXTURES = path.resolve(__dirname, 'fixtures', 'prd');

function fixture(name: string): string {
  return readFileSync(path.join(FIXTURES, name), 'utf-8');
}

// --- parsePrdMarkdown -------------------------------------------------------

describe('parsePrdMarkdown — canonical fixture', () => {
  const raw = fixture('canonical.md');
  const { sections, report } = parsePrdMarkdown(raw, 'DeliveryOS');

  it('returns exactly 8 sections in canonical order', () => {
    assert.equal(sections.length, 8);
    assert.deepEqual(
      sections.map((s) => s.id),
      [...PRD_SECTION_IDS],
    );
  });

  it('reports all 8 sections found and none missing', () => {
    assert.equal(report.sectionsFound.length, 8);
    assert.equal(report.sectionsMissing.length, 0);
  });

  it('reports no unmatched headings', () => {
    assert.equal(report.unmatchedHeadings.length, 0);
  });

  it('captures a non-empty body for each section', () => {
    for (const s of sections) {
      assert.ok(s.body.length > 0, `expected non-empty body for section "${s.id}"`);
    }
  });

  it('strips the document-title h1 from section bodies', () => {
    for (const s of sections) {
      assert.doesNotMatch(s.body, /^# /, `section "${s.id}" body starts with h1`);
    }
  });
});

describe('parsePrdMarkdown — reordered fixture (Risks and Success Criteria swapped)', () => {
  const raw = fixture('reordered.md');
  const { sections, report } = parsePrdMarkdown(raw, 'Bug Triage Assistant');

  it('returns sections in canonical order despite reordered input', () => {
    assert.deepEqual(
      sections.map((s) => s.id),
      [...PRD_SECTION_IDS],
    );
  });

  it('finds all 8 sections', () => {
    assert.equal(report.sectionsFound.length, 8);
    assert.equal(report.sectionsMissing.length, 0);
  });

  it('success-criteria body appears at position 7 (index) in sections array', () => {
    assert.equal(sections[7].id, 'success-criteria');
    assert.ok(sections[7].body.length > 0);
  });
});

describe('parsePrdMarkdown — missing-two fixture (constraints + assumptions absent)', () => {
  const raw = fixture('missing-two.md');
  const { sections, report } = parsePrdMarkdown(raw, 'Minimal Demo App');

  it('still returns 8 sections total', () => {
    assert.equal(sections.length, 8);
  });

  it('flags constraints and assumptions as missing', () => {
    assert.ok(report.sectionsMissing.includes('constraints'), 'expected constraints missing');
    assert.ok(report.sectionsMissing.includes('assumptions'), 'expected assumptions missing');
  });

  it('reports exactly 2 missing sections', () => {
    assert.equal(report.sectionsMissing.length, 2);
  });

  it('gives empty body to missing sections', () => {
    const constraints = sections.find((s) => s.id === 'constraints');
    const assumptions = sections.find((s) => s.id === 'assumptions');
    assert.ok(constraints, 'constraints section exists in array');
    assert.ok(assumptions, 'assumptions section exists in array');
    assert.equal(constraints!.body, '');
    assert.equal(assumptions!.body, '');
  });
});

describe('parsePrdMarkdown — alias normalisation', () => {
  it('maps "## non goals" (no hyphen) to non-goals', () => {
    const raw = '## non goals\n\nSome content here.';
    const { sections, report } = parsePrdMarkdown(raw, 'Test');
    const ng = sections.find((s) => s.id === 'non-goals');
    assert.ok(ng, 'non-goals section found');
    assert.match(ng!.body, /Some content here/);
    assert.ok(report.sectionsFound.includes('non-goals'));
  });

  it('maps "## Out of Scope" to non-goals', () => {
    const raw = '## Out of Scope\n\nNot doing this.';
    const { sections } = parsePrdMarkdown(raw, 'Test');
    const ng = sections.find((s) => s.id === 'non-goals');
    assert.match(ng!.body, /Not doing this/);
  });

  it('maps "## acceptance criteria" to success-criteria', () => {
    const raw = '## acceptance criteria\n\nAll tests green.';
    const { sections } = parsePrdMarkdown(raw, 'Test');
    const sc = sections.find((s) => s.id === 'success-criteria');
    assert.match(sc!.body, /All tests green/);
  });

  it('records unrecognised headings in unmatchedHeadings', () => {
    const raw = '## Completely Unknown Section\n\nSome text.';
    const { report } = parsePrdMarkdown(raw, 'Test');
    assert.ok(
      report.unmatchedHeadings.some((h) => h.includes('Completely Unknown')),
      'unrecognised heading should appear in report',
    );
  });
});

describe('parsePrdMarkdown — fence-skip', () => {
  it('does not treat ## inside a code fence as a section heading', () => {
    const raw = [
      '## Problem',
      'Some text.',
      '```markdown',
      '## This is not a heading',
      '```',
      'More problem text.',
    ].join('\n');
    const { sections, report } = parsePrdMarkdown(raw, 'Test');
    const problem = sections.find((s) => s.id === 'problem');
    assert.ok(problem!.body.includes('Some text'), 'problem body has text before fence');
    assert.ok(problem!.body.includes('More problem text'), 'problem body has text after fence');
    assert.equal(report.sectionsMissing.length, 7, 'only problem section is found');
  });
});

// --- renderPrdMarkdown -------------------------------------------------------

describe('renderPrdMarkdown', () => {
  it('round-trips through parsePrdMarkdown cleanly', () => {
    const raw = fixture('canonical.md');
    const { sections } = parsePrdMarkdown(raw, 'DeliveryOS');
    const rendered = renderPrdMarkdown({ projectTitle: 'DeliveryOS', sections });
    const { sections: reparsed } = parsePrdMarkdown(rendered, 'DeliveryOS');
    for (let i = 0; i < 8; i++) {
      assert.equal(
        reparsed[i].id,
        sections[i].id,
        `section ${i} id mismatch after round-trip`,
      );
      assert.equal(
        reparsed[i].body.trim(),
        sections[i].body.trim(),
        `section ${i} body mismatch after round-trip`,
      );
    }
  });

  it('starts with # <projectTitle>', () => {
    const { sections } = parsePrdMarkdown(fixture('canonical.md'), 'DeliveryOS');
    const rendered = renderPrdMarkdown({ projectTitle: 'DeliveryOS', sections });
    assert.ok(rendered.startsWith('# DeliveryOS'), 'rendered PRD must start with # DeliveryOS');
  });

  it('contains all 8 ## section headings', () => {
    const { sections } = parsePrdMarkdown(fixture('canonical.md'), 'DeliveryOS');
    const rendered = renderPrdMarkdown({ projectTitle: 'DeliveryOS', sections });
    for (const id of PRD_SECTION_IDS) {
      const title = sections.find((s) => s.id === id)!.title;
      assert.ok(rendered.includes(`## ${title}`), `missing ## ${title}`);
    }
  });
});

// --- buildGenerateDraftPrompt ------------------------------------------------

const SAMPLE_DISCOVERY: DiscoveryRecord = {
  promptSnapshot: 'snapshot',
  answers: [
    { question: 'What problem does this solve?', answer: 'It triages GitHub issues.' },
    { question: 'Who are the primary users?', answer: 'Engineering team leads.' },
  ],
  completedAt: 1_700_000_000_000,
};

describe('buildGenerateDraftPrompt', () => {
  it('is deterministic given fixed inputs', () => {
    const input = {
      projectTitle: 'Bug Triage Assistant',
      rawIdea: 'Sort incoming GitHub issues by likely priority.',
      discoveryRecord: SAMPLE_DISCOVERY,
    };
    assert.equal(buildGenerateDraftPrompt(input), buildGenerateDraftPrompt(input));
  });

  it('contains the project title', () => {
    const prompt = buildGenerateDraftPrompt({
      projectTitle: 'My Project',
      rawIdea: 'An idea.',
      discoveryRecord: SAMPLE_DISCOVERY,
    });
    assert.match(prompt, /My Project/);
  });

  it('contains the raw idea text', () => {
    const prompt = buildGenerateDraftPrompt({
      projectTitle: 'X',
      rawIdea: 'Sort incoming GitHub issues.',
      discoveryRecord: SAMPLE_DISCOVERY,
    });
    assert.match(prompt, /Sort incoming GitHub issues/);
  });

  it('contains all 8 section prompt hints', () => {
    const prompt = buildGenerateDraftPrompt({
      projectTitle: 'X',
      rawIdea: 'Y',
      discoveryRecord: SAMPLE_DISCOVERY,
    });
    // Each hint is labeled with the section title in bold
    assert.match(prompt, /\*\*Problem\*\*/);
    assert.match(prompt, /\*\*Users\*\*/);
    assert.match(prompt, /\*\*Goals\*\*/);
    assert.match(prompt, /\*\*Non-Goals\*\*/);
    assert.match(prompt, /\*\*Constraints\*\*/);
    assert.match(prompt, /\*\*Assumptions\*\*/);
    assert.match(prompt, /\*\*Risks\*\*/);
    assert.match(prompt, /\*\*Success Criteria\*\*/);
  });

  it('interpolates discovery answers', () => {
    const prompt = buildGenerateDraftPrompt({
      projectTitle: 'X',
      rawIdea: 'Y',
      discoveryRecord: SAMPLE_DISCOVERY,
    });
    assert.match(prompt, /triages GitHub issues/);
  });

  it('handles an empty raw idea without throwing', () => {
    const prompt = buildGenerateDraftPrompt({
      projectTitle: 'X',
      rawIdea: '',
      discoveryRecord: { promptSnapshot: '', answers: [], completedAt: 0 },
    });
    assert.match(prompt, /not provided/);
  });
});

// --- buildReviseSectionPrompt ------------------------------------------------

describe('buildReviseSectionPrompt', () => {
  it('is deterministic given fixed inputs', () => {
    const input = {
      section: { id: 'goals' as const, title: 'Goals', body: 'Current goals here.' },
      instruction: 'Tighten to 5 bullets.',
      prdContext: {
        projectTitle: 'My Project',
        otherSectionSummaries: { problem: 'The problem statement.', users: 'The users.' },
      },
    };
    assert.equal(buildReviseSectionPrompt(input), buildReviseSectionPrompt(input));
  });

  it('contains the section title', () => {
    const prompt = buildReviseSectionPrompt({
      section: { id: 'goals' as const, title: 'Goals', body: 'Goals go here.' },
      instruction: 'Tighten.',
      prdContext: { projectTitle: 'X', otherSectionSummaries: {} },
    });
    assert.match(prompt, /Goals/);
  });

  it('contains the instruction', () => {
    const prompt = buildReviseSectionPrompt({
      section: { id: 'risks' as const, title: 'Risks', body: 'Some risks.' },
      instruction: 'Add a mitigation for data loss.',
      prdContext: { projectTitle: 'X', otherSectionSummaries: {} },
    });
    assert.match(prompt, /Add a mitigation for data loss/);
  });

  it('contains the current section body', () => {
    const prompt = buildReviseSectionPrompt({
      section: { id: 'problem' as const, title: 'Problem', body: 'Unique body text.' },
      instruction: 'Revise.',
      prdContext: { projectTitle: 'X', otherSectionSummaries: {} },
    });
    assert.match(prompt, /Unique body text/);
  });

  it('truncates other-section summaries at ~200 chars', () => {
    const longBody = 'a'.repeat(300);
    const prompt = buildReviseSectionPrompt({
      section: { id: 'goals' as const, title: 'Goals', body: 'Goals.' },
      instruction: 'Revise.',
      prdContext: {
        projectTitle: 'X',
        otherSectionSummaries: { problem: longBody },
      },
    });
    // The truncated snippet ends with '…' and is not the full 300 chars
    assert.match(prompt, /a{200}…/);
  });
});
