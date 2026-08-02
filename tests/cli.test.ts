import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('CLI scan prints markdown for checked-in fixture', () => {
  const result = spawnSync(process.execPath, ['dist/src/cli.js', 'scan', 'examples/risky-mcp.json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /# MCPSeal report/);
  assert.match(result.stdout, /Broad filesystem access/);
});

test('CLI check fails when requested gate has findings', () => {
  const result = spawnSync(process.execPath, ['dist/src/cli.js', 'check', 'examples/risky-mcp.json', '--fail-on', 'secret-env,broad-fs'], { encoding: 'utf8' });
  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stdout, /"failedGates"/);
});

test('CLI check fails the config-shape gate for a mixed-validity server map', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mcpseal-cli-'));
  const input = path.join(dir, 'mixed.json');
  writeFileSync(input, '{"mcpServers":{"good":{"command":"fixed-bin"},"bad":"not-an-object"}}\n');

  const result = spawnSync(process.execPath, [path.resolve('dist/src/cli.js'), 'check', input, '--fail-on', 'config-shape'], { encoding: 'utf8' });

  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stdout, /"config-shape"/);
  assert.match(result.stdout, /mcpServers\.bad/);
});

test('CLI refuses direct input as output without changing it', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mcpseal-cli-'));
  const input = path.join(dir, 'config.json');
  const original = '{"mcpServers":{}}\n';
  writeFileSync(input, original);

  const cli = path.resolve('dist/src/cli.js');
  const result = spawnSync(process.execPath, [cli, 'scan', './config.json', '--out', input], { cwd: dir, encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refusing to overwrite scanned input/);
  assert.equal(readFileSync(input, 'utf8'), original);
});

test('CLI refuses an output symlink that resolves to an input', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mcpseal-cli-'));
  const input = path.join(dir, 'config.json');
  const output = path.join(dir, 'report.md');
  const original = '{"mcpServers":{}}\n';
  writeFileSync(input, original);
  symlinkSync(input, output);

  const result = spawnSync(process.execPath, ['dist/src/cli.js', 'scan', input, '--out', output], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refusing to overwrite scanned input/);
  assert.equal(readFileSync(input, 'utf8'), original);
});

test('CLI refuses directory-discovered input as output without changing it', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mcpseal-cli-'));
  const nested = path.join(dir, 'nested');
  const input = path.join(nested, 'config.json');
  const original = '{"mcpServers":{}}\n';
  mkdirSync(nested);
  writeFileSync(input, original);

  const result = spawnSync(process.execPath, ['dist/src/cli.js', 'scan', dir, '--out', input], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refusing to overwrite scanned input/);
  assert.equal(readFileSync(input, 'utf8'), original);
});

test('CLI writes a report to a distinct output', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mcpseal-cli-'));
  const input = path.join(dir, 'config.json');
  const output = path.join(dir, 'reports', 'report.md');
  writeFileSync(input, '{"mcpServers":{}}\n');

  const result = spawnSync(process.execPath, ['dist/src/cli.js', 'scan', input, '--out', output], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(output, 'utf8'), /# MCPSeal report/);
});
