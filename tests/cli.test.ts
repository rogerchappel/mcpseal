import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('CLI scan prints markdown for checked-in fixture', () => {
  const result = spawnSync(process.execPath, ['dist/cli.js', 'scan', 'examples/risky-mcp.json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /# MCPSeal report/);
  assert.match(result.stdout, /Broad filesystem access/);
});

test('CLI check fails when requested gate has findings', () => {
  const result = spawnSync(process.execPath, ['dist/cli.js', 'check', 'examples/risky-mcp.json', '--fail-on', 'secret-env,broad-fs'], { encoding: 'utf8' });
  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stdout, /"failedGates"/);
});
