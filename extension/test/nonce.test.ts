import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nonce } from '../src/webview/nonce';

describe('nonce()', () => {
  it('returns a 32-char base64url string (24 bytes encoded)', () => {
    const value = nonce();
    assert.match(value, /^[A-Za-z0-9_-]{32}$/);
  });

  it('produces 100 unique values across 100 calls', () => {
    const values = new Set<string>();
    for (let i = 0; i < 100; i++) values.add(nonce());
    assert.equal(values.size, 100);
  });
});
