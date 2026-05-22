import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNewer, parseOwnerRepo } from '../src/updater/helpers';

describe('parseOwnerRepo', () => {
  it('parses an https git URL', () => {
    assert.deepEqual(parseOwnerRepo('https://github.com/foo/bar.git'), {
      owner: 'foo',
      repo: 'bar',
    });
  });

  it('parses an https URL without .git suffix', () => {
    assert.deepEqual(parseOwnerRepo('https://github.com/foo/bar'), {
      owner: 'foo',
      repo: 'bar',
    });
  });

  it('parses a git+ssh URL', () => {
    assert.deepEqual(parseOwnerRepo('git@github.com:foo/bar.git'), {
      owner: 'foo',
      repo: 'bar',
    });
  });

  it('returns null for an empty or non-GitHub URL', () => {
    assert.equal(parseOwnerRepo(''), null);
    assert.equal(parseOwnerRepo('https://gitlab.com/foo/bar.git'), null);
  });
});

describe('isNewer', () => {
  it('detects a newer patch', () => {
    assert.equal(isNewer('v0.0.2', '0.0.1'), true);
  });

  it('detects a newer minor', () => {
    assert.equal(isNewer('0.1.0', 'v0.0.99'), true);
  });

  it('detects a newer major', () => {
    assert.equal(isNewer('1.0.0', '0.99.99'), true);
  });

  it('returns false for an older or equal version', () => {
    assert.equal(isNewer('v0.0.1', 'v0.0.2'), false);
    assert.equal(isNewer('v0.0.1', '0.0.1'), false);
  });

  it('treats a pre-release suffix as the base version', () => {
    assert.equal(isNewer('v0.0.1-alpha', '0.0.1'), false);
    assert.equal(isNewer('v0.0.2-rc.1', '0.0.1'), true);
  });

  it('treats non-numeric or missing parts as zero', () => {
    assert.equal(isNewer('v', '0.0.0'), false);
    assert.equal(isNewer('1', '0.99.99'), true);
  });
});
