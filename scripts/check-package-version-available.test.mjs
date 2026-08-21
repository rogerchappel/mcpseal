import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import path from 'node:path';
import test from 'node:test';

const script = path.resolve('scripts/check-package-version-available.mjs');

async function withRegistry(metadata, callback) {
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(metadata));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function check(registry, version) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, 'mcpseal', version], {
      env: { ...process.env, NPM_REGISTRY_URL: registry },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

test('accepts a version absent from npm metadata', async () => {
  await withRegistry({ versions: { '0.1.1': {} } }, async (registry) => {
    const result = await check(registry, '0.1.2');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /mcpseal@0\.1\.2 is available/);
  });
});

test('rejects a version already present in npm metadata', async () => {
  await withRegistry({ versions: { '0.1.1': {} } }, async (registry) => {
    const result = await check(registry, '0.1.1');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /mcpseal@0\.1\.1 is already published/);
  });
});
