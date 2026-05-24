import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { DraftPrd } from '@deliveryos/contracts';
import { buildDecomposePrompt } from '../src/requirements/decompositionPrompt';
import { parseDecomposed } from '../src/requirements/parser';

// --- fixtures --------------------------------------------------------------

const SAMPLE_PRD: DraftPrd = {
  prdId: 'prd-fixture',
  projectId: 'proj-fixture',
  projectTitle: 'Sample Project',
  sections: [
    { id: 'problem', title: 'Problem', body: 'Users cannot ship reliably.' },
    { id: 'users', title: 'Users', body: 'Solo developers.' },
    { id: 'goals', title: 'Goals', body: 'Ship the MVP.' },
    { id: 'non-goals', title: 'Non-Goals', body: 'Enterprise SSO.' },
    { id: 'constraints', title: 'Constraints', body: 'Sideloaded VSIX.' },
    { id: 'assumptions', title: 'Assumptions', body: 'User has VS Code.' },
    { id: 'risks', title: 'Risks', body: 'Manual paste fatigue.' },
    { id: 'success-criteria', title: 'Success Criteria', body: 'Demo runs cleanly.' },
  ],
  createdAt: 1000,
  updatedAt: 2000,
};

const VALID_JSON_PASTE = `\`\`\`json
[
  {
    "title": "User can create a project",
    "description": "A first-run flow that prompts for project name and persists it.",
    "category": "functional",
    "priority": "must",
    "sourcePrdSection": "Goals"
  },
  {
    "title": "Catalogue renders 100 rows under 100ms",
    "description": "Performance budget for the requirements table.",
    "category": "non-functional",
    "priority": "should",
    "sourcePrdSection": "Success Criteria"
  }
]
\`\`\``;

const NESTED_JSON_PASTE = `\`\`\`json
{
  "requirements": [
    {
      "title": "User can edit a requirement",
      "description": "Inline edit on the catalogue row.",
      "category": "functional",
      "priority": "must",
      "sourcePrdSection": "Goals"
    }
  ]
}
\`\`\``;

const CLEAN_TABLE_PASTE = `\`\`\`md
| Title | Description | Category | Priority | Source PRD section |
| ----- | ----------- | -------- | -------- | ------------------ |
| User can create a project | First-run flow. | functional | must | Goals |
| Catalogue renders fast | <100ms budget. | non-functional | should | Success Criteria |
\`\`\``;

const RAGGED_TABLE_PASTE = `Here you go!

| Title | Description | Type | Priority | Section |
| --- | --- | --- | --- | --- |
| Project create | Persist project name. | Functional | Must have | Goals |
| Empty title row to drop |  | functional | should | Goals |
|   | should be dropped | functional | should | Goals |
| Speed budget | Render in <100ms. | nonfunctional | Could-have | Success Criteria |
`;

const GARBAGE_PASTE = `Sure! Here are some requirements:

- The system should let users create projects.
- The system should be fast.

Let me know if you'd like more detail.`;

const PRD_ECHO_PASTE = `<!-- BEGIN_PRD -->
# Sample Project

## Goals

Ship the MVP.
<!-- END_PRD -->

\`\`\`json
[
  {
    "title": "User can decompose PRD",
    "description": "Manual mode.",
    "category": "functional",
    "priority": "must",
    "sourcePrdSection": "Goals"
  }
]
\`\`\``;

const EMPTY_PASTE = '   \n\n  \t  ';

const INVALID_PRIORITY_PASTE = `\`\`\`json
[
  {
    "title": "Edge-case row",
    "description": "Bad enums get coerced.",
    "category": "weird-value",
    "priority": "P0",
    "sourcePrdSection": "Goals"
  }
]
\`\`\``;

const BARE_ARRAY_NO_FENCE = `[
  { "title": "Bare array", "description": "No fence.", "category": "functional", "priority": "must", "sourcePrdSection": "Goals" }
]`;

const TYPE_ALIAS_JSON = `\`\`\`json
[
  {
    "title": "Type field instead of category",
    "description": "Spec-aligned wording.",
    "type": "Functional",
    "priority": "Must",
    "sourcePrdSection": "Goals"
  }
]
\`\`\``;

// --- buildDecomposePrompt -------------------------------------------------

describe('buildDecomposePrompt', () => {
  it('wraps the PRD body in BEGIN_PRD/END_PRD sentinels', () => {
    const prompt = buildDecomposePrompt({ prd: SAMPLE_PRD });
    assert.match(prompt, /<!-- BEGIN_PRD -->/);
    assert.match(prompt, /<!-- END_PRD -->/);
  });

  it('mentions the project title', () => {
    const prompt = buildDecomposePrompt({ prd: SAMPLE_PRD });
    assert.match(prompt, /Sample Project/);
  });

  it('describes the JSON output shape including lowercase enums', () => {
    const prompt = buildDecomposePrompt({ prd: SAMPLE_PRD });
    assert.match(prompt, /"category":\s*"functional"\s*\|\s*"non-functional"/);
    assert.match(prompt, /"priority":\s*"must"\s*\|\s*"should"\s*\|\s*"could"/);
  });

  it('mentions the markdown-table fallback columns in order', () => {
    const prompt = buildDecomposePrompt({ prd: SAMPLE_PRD });
    const tableIdx = prompt.indexOf('| Title | Description | Category | Priority | Source PRD section |');
    assert.ok(tableIdx >= 0, 'expected canonical column header in prompt');
  });

  it('instructs the AI not to include an id field', () => {
    const prompt = buildDecomposePrompt({ prd: SAMPLE_PRD });
    assert.match(prompt, /Do NOT include an `id` field/);
  });

  it('uses the rendered PRD body when prdMarkdownBody is omitted', () => {
    const prompt = buildDecomposePrompt({ prd: SAMPLE_PRD });
    assert.match(prompt, /Users cannot ship reliably\./);
    assert.match(prompt, /## Success Criteria/);
  });

  it('honours an explicit prdMarkdownBody override', () => {
    const prompt = buildDecomposePrompt({
      prd: SAMPLE_PRD,
      prdMarkdownBody: '# Override\n\nReplaced body.',
    });
    assert.match(prompt, /Replaced body\./);
    assert.doesNotMatch(prompt, /Users cannot ship reliably\./);
  });
});

// --- parseDecomposed: JSON paths ------------------------------------------

describe('parseDecomposed — JSON array in fenced block', () => {
  const result = parseDecomposed(VALID_JSON_PASTE);

  it('returns ok=true with mode="json"', () => {
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.mode, 'json');
  });

  it('produces exactly 2 requirements with lowercase enums', () => {
    if (!result.ok) throw new Error('expected ok');
    assert.equal(result.requirements.length, 2);
    assert.equal(result.requirements[0].category, 'functional');
    assert.equal(result.requirements[0].priority, 'must');
    assert.equal(result.requirements[1].category, 'non-functional');
    assert.equal(result.requirements[1].priority, 'should');
  });

  it('emits no warnings on a clean paste', () => {
    if (!result.ok) throw new Error('expected ok');
    for (const r of result.requirements) {
      assert.equal(r.warnings, undefined);
    }
  });

  it('does not assign IDs (host owns ID assignment)', () => {
    if (!result.ok) throw new Error('expected ok');
    for (const r of result.requirements) {
      assert.equal('id' in r, false);
    }
  });
});

describe('parseDecomposed — nested { requirements: [...] } JSON', () => {
  it('accepts the nested object shape', () => {
    const result = parseDecomposed(NESTED_JSON_PASTE);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.mode, 'json');
      assert.equal(result.requirements.length, 1);
      assert.equal(result.requirements[0].title, 'User can edit a requirement');
    }
  });
});

describe('parseDecomposed — bare JSON without fences', () => {
  it('parses a bare array', () => {
    const result = parseDecomposed(BARE_ARRAY_NO_FENCE);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.mode, 'json');
      assert.equal(result.requirements[0].title, 'Bare array');
    }
  });
});

describe('parseDecomposed — capitalised enums + "type" alias', () => {
  it('coerces "Functional" → "functional" and "Must" → "must" via the type alias', () => {
    const result = parseDecomposed(TYPE_ALIAS_JSON);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.requirements[0].category, 'functional');
      assert.equal(result.requirements[0].priority, 'must');
      assert.equal(result.requirements[0].warnings, undefined);
    }
  });
});

describe('parseDecomposed — invalid enum values default + warn', () => {
  const result = parseDecomposed(INVALID_PRIORITY_PASTE);

  it('defaults unknown category to "functional"', () => {
    if (!result.ok) throw new Error('expected ok');
    assert.equal(result.requirements[0].category, 'functional');
  });

  it('defaults unknown priority to "should"', () => {
    if (!result.ok) throw new Error('expected ok');
    assert.equal(result.requirements[0].priority, 'should');
  });

  it('emits warnings for both coerced values', () => {
    if (!result.ok) throw new Error('expected ok');
    const w = result.requirements[0].warnings;
    assert.ok(Array.isArray(w) && w.length === 2, 'expected 2 warnings');
  });
});

// --- parseDecomposed: markdown-table paths --------------------------------

describe('parseDecomposed — clean markdown table', () => {
  const result = parseDecomposed(CLEAN_TABLE_PASTE);

  it('returns ok=true with mode="markdown-table"', () => {
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.mode, 'markdown-table');
  });

  it('parses both rows with correct lowercase enums', () => {
    if (!result.ok) throw new Error('expected ok');
    assert.equal(result.requirements.length, 2);
    assert.equal(result.requirements[0].category, 'functional');
    assert.equal(result.requirements[1].priority, 'should');
  });
});

describe('parseDecomposed — ragged markdown table with edge cases', () => {
  const result = parseDecomposed(RAGGED_TABLE_PASTE);

  it('drops rows with empty titles', () => {
    if (!result.ok) throw new Error('expected ok');
    assert.equal(
      result.requirements.length,
      3,
      'expected 3 rows after dropping the empty-title row',
    );
  });

  it('tolerates "Type" header alias and "Must have" / "Could-have" priority variants', () => {
    if (!result.ok) throw new Error('expected ok');
    assert.equal(result.requirements[0].priority, 'must');
    assert.equal(result.requirements[2].priority, 'could');
    assert.equal(result.requirements[2].category, 'non-functional');
  });
});

// --- parseDecomposed: PRD echo + sentinels --------------------------------

describe('parseDecomposed — PRD echo in paste', () => {
  it('strips BEGIN_PRD/END_PRD sentinel block before parsing', () => {
    const result = parseDecomposed(PRD_ECHO_PASTE);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.mode, 'json');
      assert.equal(result.requirements.length, 1);
      assert.equal(result.requirements[0].title, 'User can decompose PRD');
    }
  });
});

// --- parseDecomposed: failure modes ---------------------------------------

describe('parseDecomposed — garbage input', () => {
  const result = parseDecomposed(GARBAGE_PASTE);

  it('returns ok=false with reason + raw text preserved', () => {
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.reason.length > 0);
      assert.equal(result.raw, GARBAGE_PASTE);
    }
  });
});

describe('parseDecomposed — empty input', () => {
  it('returns ok=false on whitespace-only input', () => {
    const result = parseDecomposed(EMPTY_PASTE);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /[Ee]mpty/);
    }
  });
});
