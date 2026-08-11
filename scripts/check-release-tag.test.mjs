import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';

const script = path.resolve('scripts/check-release-tag.mjs');

function check(tag, version) {
  return spawnSync(process.execPath, [script, tag, version], { encoding: 'utf8' });
}

test('accepts the exact v-prefixed package version', () => {
  const result = check('v0.1.0', '0.1.0');

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /v0\.1\.0 matches package version 0\.1\.0/);
});

test('rejects a tag for a different package version', () => {
  const result = check('v9.9.9', '0.1.0');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /expected v0\.1\.0.*received v9\.9\.9/);
});

test('rejects a matching version without the required v prefix', () => {
  const result = check('0.1.0', '0.1.0');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /expected v0\.1\.0.*received 0\.1\.0/);
});
