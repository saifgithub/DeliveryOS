// CHUNK-13 — unit tests for extension/src/diff/picomatchAdapter.ts
// Uses node:test + node:assert/strict (matches all existing test files).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isMatch } from '../src/diff/picomatchAdapter';

describe('picomatchAdapter — isMatch', () => {
  it('forward slash path matches the pattern', () => {
    assert.ok(isMatch('src/a.ts', 'src/**'));
    assert.ok(isMatch('src/foo/bar.ts', 'src/**/*.ts'));
  });

  it('Windows backslash path is normalised to forward slashes', () => {
    assert.ok(isMatch('src\\a.ts', 'src/**'));
    assert.ok(isMatch('src\\legacy\\foo.ts', 'src/legacy/**'));
  });

  it('dot: true — .deliveryos-handoff/** matches dotfiles', () => {
    assert.ok(isMatch('.deliveryos-handoff/x.md', '.deliveryos-handoff/**'));
    assert.ok(isMatch('.deliveryos-handoff/x.md', '**/*.md'));
  });

  it('nocase: false — case sensitive matching', () => {
    assert.ok(!isMatch('src/a.ts', 'Src/**'));
    assert.ok(!isMatch('Src/a.ts', 'src/**'));
  });

  it('leading ./ stripped — both match the same pattern', () => {
    assert.ok(isMatch('./src/a.ts', 'src/**'));
    assert.ok(isMatch('src/a.ts', 'src/**'));
  });

  it('dir/** matches files inside directory', () => {
    assert.ok(isMatch('node_modules/foo/bar.js', 'node_modules/**'));
    assert.ok(isMatch('node_modules/foo.js', 'node_modules/**'));
  });

  it('exact match: package.json', () => {
    assert.ok(isMatch('package.json', 'package.json'));
    assert.ok(!isMatch('not-package.json', 'package.json'));
  });

  it('glob with * matches any segment', () => {
    assert.ok(isMatch('src/foo.ts', 'src/*.ts'));
    assert.ok(!isMatch('src/foo/bar.ts', 'src/*.ts')); // * does not recurse
  });

  it('deep glob src/**/*.ts matches nested files', () => {
    assert.ok(isMatch('src/foo/bar/baz.ts', 'src/**/*.ts'));
    assert.ok(!isMatch('src/foo/bar/baz.js', 'src/**/*.ts'));
  });

  it('pattern does not match unrelated path', () => {
    assert.ok(!isMatch('docs/readme.md', 'src/**'));
    assert.ok(!isMatch('package.json', 'src/**'));
  });
});
