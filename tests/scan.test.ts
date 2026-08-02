import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { renderJson, renderMarkdown, scanTargets } from '../src/index.js';

test('scanTargets detects core MCP risks with redaction', async () => {
  const raw = await readFile('examples/risky-mcp.json', 'utf8');
  const report = scanTargets([{ label: 'examples/risky-mcp.json', absolutePath: 'examples/risky-mcp.json', raw, parsed: JSON.parse(raw) }], { redact: true, failOn: ['secret-env', 'broad-fs'] });
  assert.equal(report.summary.byCategory['secret-env'], 1);
  assert.equal(report.summary.byCategory['broad-fs'], 1);
  assert.equal(report.summary.failedGates.join(','), 'secret-env,broad-fs');
  assert.match(renderJson(report), /\[REDACTED\]/);
  assert.doesNotMatch(renderJson(report), /ghp_exampleSecretToken/);
});

test('safer fixture stays below default risk checks', async () => {
  const raw = await readFile('examples/safer-mcp.json', 'utf8');
  const report = scanTargets([{ label: 'examples/safer-mcp.json', absolutePath: 'examples/safer-mcp.json', raw, parsed: JSON.parse(raw) }], { redact: true, failOn: ['secret-env', 'broad-fs', 'risky-command'] });
  assert.equal(report.summary.findings, 0);
  assert.equal(report.summary.failedGates.length, 0);
});

test('scanTargets reports invalid object-map entries and scans valid siblings', () => {
  const parsed = { mcpServers: { good: { command: 'fixed-bin' }, bad: 'not-an-object' } };
  const report = scanTargets([{ label: 'mixed.json', absolutePath: 'mixed.json', raw: JSON.stringify(parsed), parsed }], { redact: true, failOn: ['config-shape'] });
  assert.equal(report.targets[0].serverCount, 1);
  assert.equal(report.summary.byCategory['config-shape'], 1);
  assert.deepEqual(report.summary.failedGates, ['config-shape']);
  assert.equal(report.findings[0].path, 'mixed.json#mcpServers.bad');
});

test('scanTargets reports every invalid array entry and scans valid siblings', () => {
  const parsed = { servers: [{ name: 'good', command: 'fixed-bin' }, null, 'bad'] };
  const report = scanTargets([{ label: 'mixed.json', absolutePath: 'mixed.json', raw: JSON.stringify(parsed), parsed }], { redact: true, failOn: ['config-shape'] });
  assert.equal(report.targets[0].serverCount, 1);
  assert.deepEqual(report.findings.map((finding) => finding.path), ['mixed.json#servers[1]', 'mixed.json#servers[2]']);
});

test('scanTargets accepts all-valid object-map and array server entries', () => {
  for (const parsed of [
    { mcpServers: { first: { command: 'one' }, second: { command: 'two' } } },
    { servers: [{ command: 'one' }, { name: 'second', command: 'two' }] }
  ]) {
    const report = scanTargets([{ label: 'valid.json', absolutePath: 'valid.json', raw: JSON.stringify(parsed), parsed }], { redact: true, failOn: ['config-shape'] });
    assert.equal(report.targets[0].serverCount, 2);
    assert.equal(report.summary.byCategory['config-shape'], 0);
    assert.deepEqual(report.summary.failedGates, []);
  }
});

test('markdown output is stable and useful', async () => {
  const raw = await readFile('examples/risky-mcp.json', 'utf8');
  const report = scanTargets([{ label: 'examples/risky-mcp.json', absolutePath: 'examples/risky-mcp.json', raw, parsed: JSON.parse(raw) }], { redact: true, failOn: [] });
  const markdown = renderMarkdown(report);
  assert.match(markdown, /^# MCPSeal report/);
  assert.match(markdown, /## Findings/);
  assert.match(markdown, /1970-01-01T00:00:00.000Z/);
});


test('scanTargets detects broad docker bind mount sources', () => {
  const parsed = { mcpServers: { dockerized: { command: 'docker', args: ['run', '-v', '/:/host:ro', 'example/mcp'] } } };
  const report = scanTargets([{ label: 'inline', absolutePath: 'inline', raw: JSON.stringify(parsed), parsed }], { redact: true, failOn: ['broad-fs'] });
  assert.equal(report.summary.byCategory['broad-fs'], 1);
  assert.equal(report.summary.failedGates.join(','), 'broad-fs');
});

test('scanTargets detects broad docker long-form bind mount sources', () => {
  for (const mount of ['type=bind,source=/,target=/host', 'type=bind,src=/home,target=/host']) {
    const parsed = { mcpServers: { dockerized: { command: 'docker', args: ['run', '--mount', mount, 'example/mcp'] } } };
    const report = scanTargets([{ label: 'inline', absolutePath: 'inline', raw: JSON.stringify(parsed), parsed }], { redact: true, failOn: ['broad-fs'] });
    assert.equal(report.summary.byCategory['broad-fs'], 1, mount);
    assert.equal(report.summary.failedGates.join(','), 'broad-fs', mount);
  }
});

test('scanTargets allows project directories in docker long-form bind mounts', () => {
  const parsed = { mcpServers: { dockerized: { command: 'docker', args: ['run', '--mount=type=bind,source=/workspace/project,target=/app', 'example/mcp'] } } };
  const report = scanTargets([{ label: 'inline', absolutePath: 'inline', raw: JSON.stringify(parsed), parsed }], { redact: true, failOn: ['broad-fs'] });
  assert.equal(report.summary.byCategory['broad-fs'], 0);
  assert.deepEqual(report.summary.failedGates, []);
});
