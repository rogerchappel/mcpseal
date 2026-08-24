import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const script = path.resolve('scripts/check-package-version-available.mjs');
const packageMetadata = JSON.parse(await readFile('package.json', 'utf8'));
const lockMetadata = JSON.parse(await readFile('package-lock.json', 'utf8'));

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

test('guards the current package and lockfile version from republishing', async () => {
  assert.equal(lockMetadata.version, packageMetadata.version);
  assert.equal(lockMetadata.packages[''].version, packageMetadata.version);

  await withRegistry({ versions: { [packageMetadata.version]: {} } }, async (registry) => {
    const result = await check(registry, packageMetadata.version);
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`${packageMetadata.name}@${packageMetadata.version} is already published`));
  });
});
