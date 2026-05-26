// CHUNK-14 — unit tests for the markdown renderer.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderEvidence } from '../src/release/markdownRenderer';
import type { ChainGraph, MemoryNode } from '@deliveryos/contracts';
import type { VerificationMemoryPayload, BypassRecord } from '@deliveryos/contracts';
import type { VerificationPayload } from '@deliveryos/contracts';

function makeVerNode(payloadOverride?: Partial<VerificationMemoryPayload>): MemoryNode {
  const payload: VerificationMemoryPayload = {
    verdict: 'pass',
    failedCriteria: [],
    defects: [],
    diffOverride: false,
    approvedBy: 'user',
    approvedAt: 1700000000000,
    testSpecRef: { id: 'ts-1', type: 'test-spec', title: 'TS' },
    resultRef: { id: 'r-1', type: 'result', title: 'Result' },
    diffSummary: { verdict: 'pass', forbiddenTouched: [], allowedNotTouched: [] },
    memoryUpdateForm: {
      submitted: false,
      fields: { designUpdate: '', codebaseUpdate: '', requirementAssumptionUpdate: '' },
      emptyFieldsRecorded: [],
    },
    bypasses: [],
    ...payloadOverride,
  };
  return {
    entry: {
      id: 'verification-abc12345',
      type: 'verification',
      title: 'Verification of result',
      payload: payload as unknown as VerificationPayload,
      body: '',
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
    path: '.deliveryos/memory/verification/verification-abc12345.md',
  };
}

function makeMinimalChain(overrides?: Partial<ChainGraph>): ChainGraph {
  return {
    verification: makeVerNode(),
    bypasses: [],
    warnings: [],
    ...overrides,
  };
}

describe('markdownRenderer — renderEvidence', () => {
  it('renders a header with the release ID', () => {
    const chain = makeMinimalChain();
    const md = renderEvidence(chain, 'release-20260526-abc123');
    assert.ok(md.includes('# Release Evidence'), 'should have a h1 header');
    assert.ok(md.includes('release-20260526-abc123'), 'should include release ID');
  });

  it('renders None. in Bypasses & gaps when chain is clean', () => {
    const chain = makeMinimalChain();
    const md = renderEvidence(chain, 'release-clean');
    assert.ok(md.includes('## Bypasses & gaps'), 'should have Bypasses & gaps section');
    const afterSection = md.split('## Bypasses & gaps')[1] ?? '';
    assert.ok(afterSection.includes('None.'), 'should render None. when no bypasses/warnings');
  });

  it('renders bypass line when bypass is present', () => {
    const bypass: BypassRecord = {
      id: 'bypass-xyz',
      gate: 'memory-update',
      stage: 'VERIFY',
      justification: 'prototype iteration',
      bypassedAt: 1700000001000,
      bypassedBy: 'user',
      parentVerificationId: 'verification-abc12345',
    };
    const chain = makeMinimalChain({ bypasses: [bypass] });
    const md = renderEvidence(chain, 'release-with-bypass');
    const afterSection = md.split('## Bypasses & gaps')[1] ?? '';
    assert.ok(afterSection.includes('BYPASS:'), 'should render BYPASS: line');
    assert.ok(afterSection.includes('prototype iteration'), 'should include justification');
    assert.ok(!afterSection.includes('None.'), 'should NOT render None. when bypass present');
  });

  it('renders WARNING line when warning is present', () => {
    const chain = makeMinimalChain({
      warnings: ['missing link: verification ──evaluates──▶ result'],
    });
    const md = renderEvidence(chain, 'release-with-warning');
    const afterSection = md.split('## Bypasses & gaps')[1] ?? '';
    assert.ok(afterSection.includes('WARNING:'), 'should render WARNING: line');
    assert.ok(afterSection.includes('missing link'), 'should include warning text');
  });

  it('renders both bypass and warning when both present', () => {
    const bypass: BypassRecord = {
      id: 'bypass-1',
      gate: 'memory-update',
      stage: 'VERIFY',
      justification: 'quick prototype run',
      bypassedAt: 1700000002000,
      bypassedBy: 'user',
      parentVerificationId: 'verification-abc12345',
    };
    const chain = makeMinimalChain({
      bypasses: [bypass],
      warnings: ['missing link: prd ──derives-from──▶ intent'],
    });
    const md = renderEvidence(chain, 'release-both');
    const afterSection = md.split('## Bypasses & gaps')[1] ?? '';
    assert.ok(afterSection.includes('BYPASS:'), 'should have BYPASS line');
    assert.ok(afterSection.includes('WARNING:'), 'should have WARNING line');
    assert.ok(!afterSection.includes('None.'), 'should not have None.');
  });

  it('renders missing section placeholder when node is undefined', () => {
    // Omit result field entirely to test missing-section rendering.
    const base = makeMinimalChain();
    const { result: _omit, ...chainWithoutResult } = base;
    const chain: ChainGraph = chainWithoutResult;
    const md = renderEvidence(chain, 'release-missing');
    assert.ok(md.includes('missing from chain'), 'should render missing placeholder for undefined nodes');
  });

  it('renders 10 numbered sections', () => {
    const chain = makeMinimalChain();
    const md = renderEvidence(chain, 'release-sections');
    for (let i = 1; i <= 10; i++) {
      assert.ok(md.includes(`## ${i}.`), `should have section ${i}`);
    }
  });

  it('includes diff verdict in header', () => {
    const chain = makeMinimalChain();
    const md = renderEvidence(chain, 'release-diff');
    assert.ok(md.includes('Diff verdict:'), 'should include diff verdict in header');
    assert.ok(md.includes('pass'), 'diff verdict should be pass');
  });
});
