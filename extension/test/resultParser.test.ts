// CHUNK-12 — unit tests for result/resultParser.ts
// Uses node:test + node:assert/strict (matches all existing test files).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseResultMd } from '../src/result/resultParser';

function makeFullResult(): string {
  return `
## Summary of Changes

We refactored the auth module and added a new login endpoint.

## Files Changed

- src/auth/login.ts (new)
- src/auth/session.ts (modified)
- tests/auth.test.ts (new)

## Tests Added/Updated

- Added LoginController suite
- Added SessionStore unit tests

## Tests Run

- npm test — 42 pass, 0 fail
- npm run lint — clean

## Risks

- Session token expiry not tested under load
- Missing edge case for expired OAuth tokens

## Unresolved Questions

- Should we use JWT or opaque tokens?
- Who reviews the auth changes?
`.trim();
}

describe('resultParser — parseResultMd', () => {
  it('canonical full input → confidence: high, all 6 sections populated, missingSections empty', () => {
    const result = parseResultMd(makeFullResult());
    assert.equal(result.confidence, 'high');
    assert.deepEqual(result.missingSections, []);
    assert.ok(result.sections.summary && result.sections.summary.length > 0);
    assert.ok(Array.isArray(result.sections.filesChangedClaimed));
    assert.ok(Array.isArray(result.sections.testsAdded));
    assert.ok(Array.isArray(result.sections.testsRun));
    assert.ok(Array.isArray(result.sections.risks));
    assert.ok(Array.isArray(result.sections.questions));
    assert.equal(result.rawText, makeFullResult());
  });

  it('missing "Tests Run" + "Risks" sections → confidence: medium, missingSections has those two', () => {
    const text = `
## Summary of Changes

Some changes were made.

## Files Changed

- src/index.ts (modified)

## Tests Added/Updated

- Added some tests

## Unresolved Questions

- Do we need more tests?
`.trim();
    const result = parseResultMd(text);
    assert.equal(result.confidence, 'medium');
    assert.ok(result.missingSections.includes('Tests Run'), 'should be missing Tests Run');
    assert.ok(result.missingSections.includes('Risks'), 'should be missing Risks');
  });

  it('H3-level headings → still detected, confidence: high', () => {
    const text = `
### Summary of Changes

Changes at H3 level.

### Files Changed

- src/foo.ts

### Tests Added/Updated

- Added foo test

### Tests Run

- npm test — 5 pass

### Risks

- None known

### Unresolved Questions

- Nothing outstanding
`.trim();
    const result = parseResultMd(text);
    assert.equal(result.confidence, 'high', `Expected high but got ${result.confidence}`);
    assert.deepEqual(result.missingSections, []);
  });

  it('pure prose, no headers → confidence: low, rawText preserved verbatim', () => {
    const text = 'Just some plain text without any markdown sections. No headings here.';
    const result = parseResultMd(text);
    assert.equal(result.confidence, 'low');
    assert.equal(result.rawText, text);
  });

  it('Files Changed with mixed bullet styles (-, *, 1.) → all parsed as ClaimedFileChange[]', () => {
    const text = `
## Summary of Changes

Done.

## Files Changed

- src/a.ts
* src/b.ts
1. src/c.ts

## Tests Added/Updated

- test a

## Tests Run

- npm test

## Risks

- none

## Unresolved Questions

- none
`.trim();
    const result = parseResultMd(text);
    assert.ok(Array.isArray(result.sections.filesChangedClaimed));
    const paths = result.sections.filesChangedClaimed!.map((f) => f.path);
    assert.ok(paths.includes('src/a.ts'), 'should include src/a.ts');
    assert.ok(paths.includes('src/b.ts'), 'should include src/b.ts');
    assert.ok(paths.includes('src/c.ts'), 'should include src/c.ts');
  });

  it('Files Changed with status tags (new), — modified, : deleted → claimedStatus correct', () => {
    const text = `
## Summary of Changes

Done.

## Files Changed

- src/new.ts (new)
- src/changed.ts — modified
- src/gone.ts: deleted

## Tests Added/Updated

- t

## Tests Run

- npm test

## Risks

- r

## Unresolved Questions

- q
`.trim();
    const result = parseResultMd(text);
    const files = result.sections.filesChangedClaimed!;
    const byPath = Object.fromEntries(files.map((f) => [f.path, f.claimedStatus]));
    assert.equal(byPath['src/new.ts'], 'new');
    assert.equal(byPath['src/changed.ts'], 'modified');
    assert.equal(byPath['src/gone.ts'], 'deleted');
  });

  it('empty string input → confidence: low, no throw', () => {
    let result;
    assert.doesNotThrow(() => {
      result = parseResultMd('');
    });
    assert.equal(result!.confidence, 'low');
    assert.equal(result!.rawText, '');
    assert.deepEqual(result!.sections, {});
  });

  it('synonym "Tests Added or Updated" matches canonical section', () => {
    const text = `
## Summary of Changes

Done.

## Files Changed

- f.ts

## Tests Added or Updated

- Some test

## Tests Run

- npm test — pass

## Risks

- none

## Unresolved Questions

- none
`.trim();
    const result = parseResultMd(text);
    assert.ok(!result.missingSections.includes('Tests Added/Updated'), 'synonym should match');
    assert.ok(Array.isArray(result.sections.testsAdded));
  });
});
