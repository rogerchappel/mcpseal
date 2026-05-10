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

test('markdown output is stable and useful', async () => {
  const raw = await readFile('examples/risky-mcp.json', 'utf8');
  const report = scanTargets([{ label: 'examples/risky-mcp.json', absolutePath: 'examples/risky-mcp.json', raw, parsed: JSON.parse(raw) }], { redact: true, failOn: [] });
  const markdown = renderMarkdown(report);
  assert.match(markdown, /^# MCPSeal report/);
  assert.match(markdown, /## Findings/);
  assert.match(markdown, /1970-01-01T00:00:00.000Z/);
});
