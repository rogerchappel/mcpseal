import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

for (const fixture of ['examples/risky-mcp.json', 'examples/safer-mcp.json', 'docs/orchestration.json', 'schemas/report.schema.json']) {
  test(`${fixture} is valid JSON`, async () => {
    const raw = await readFile(fixture, 'utf8');
    assert.doesNotThrow(() => JSON.parse(raw));
  });
}
