import assert from 'node:assert/strict';
import test from 'node:test';
import { redactEnvEntry, redactValue } from '../src/redact.js';

test('disabled redaction preserves secret-looking environment values for local debugging', () => {
  const token = 'ghp_abcdefghijklmnop';
  assert.equal(redactEnvEntry('API_TOKEN', token, false), `API_TOKEN=${token}`);
});

test('enabled redaction hides values by secret key and known token format', () => {
  assert.equal(redactEnvEntry('API_TOKEN', 'ordinary value'), 'API_TOKEN=[REDACTED]');
  assert.equal(redactEnvEntry('LABEL', 'ghp_abcdefghijklmnop'), 'LABEL=[REDACTED]');
});

test('redactValue defaults to enabled and accepts explicit opt-out', () => {
  assert.equal(redactValue('ghp_abcdefghijklmnop'), '[REDACTED]');
  assert.equal(redactValue('ghp_abcdefghijklmnop', false), 'ghp_abcdefghijklmnop');
});
