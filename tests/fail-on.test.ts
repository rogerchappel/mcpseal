import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFailOn } from '../src/index.js';

test('parseFailOn accepts comma separated categories', () => {
  assert.deepEqual(parseFailOn('secret-env,broad-fs'), ['secret-env', 'broad-fs']);
});

test('parseFailOn rejects unknown categories', () => {
  assert.throws(() => parseFailOn('secrets'), /Unknown --fail-on categories/);
});
