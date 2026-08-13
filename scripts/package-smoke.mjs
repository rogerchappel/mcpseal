import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const exec = promisify(execFile);
const root = process.cwd();
const workspace = await mkdtemp(path.join(tmpdir(), 'mcpseal-package-smoke-'));

try {
  await run('npm', ['run', 'build'], root);
  const pack = await run('npm', ['pack', '--json', '--pack-destination', workspace], root);
  const [manifest] = JSON.parse(pack.stdout);
  assert(manifest, 'npm pack did not report a package');

  const packedPaths = new Set(manifest.files.map(({ path: file }) => file));
  const requiredPaths = [
    'CHANGELOG.md',
    'CODE_OF_CONDUCT.md',
    'CONTRIBUTING.md',
    'LICENSE',
    'README.md',
    'SECURITY.md',
    'dist/src/cli.js',
    'dist/src/index.d.ts',
    'dist/src/index.js',
    'examples/risky-mcp.json',
    'examples/safer-mcp.json',
    'package.json',
    'schemas/report.schema.json',
  ];
  for (const requiredPath of requiredPaths) {
    assert(packedPaths.has(requiredPath), `tarball is missing ${requiredPath}`);
  }
  for (const packedPath of packedPaths) {
    assert(!packedPath.startsWith('dist/tests/'), `tarball contains forbidden test artifact ${packedPath}`);
    assert(!packedPath.startsWith('tests/'), `tarball contains forbidden test source ${packedPath}`);
  }

  const consumer = path.join(workspace, 'consumer');
  await mkdir(consumer);
  await writeFile(path.join(consumer, 'package.json'), '{"private":true,"type":"module"}\n');
  const tarball = path.join(workspace, manifest.filename);
  await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], consumer);

  const cli = path.join(consumer, 'node_modules', '.bin', 'mcpseal');
  const example = path.join(consumer, 'node_modules', 'mcpseal', 'examples', 'risky-mcp.json');
  const scan = await run(cli, ['scan', example], consumer);
  assert.match(scan.stdout, /MCPSeal report/);
  assert.match(scan.stdout, /\[REDACTED\]/);
  assert.equal(scan.stderr, '');

  const imported = await run(
    'node',
    ['--input-type=module', '--eval', "import('mcpseal').then((module) => { if (typeof module.scanTargets !== 'function') process.exit(1); })"],
    consumer,
  );
  assert.equal(imported.stderr, '');

  const installedPackage = JSON.parse(await readFile(path.join(consumer, 'node_modules', 'mcpseal', 'package.json'), 'utf8'));
  assert.equal(installedPackage.name, 'mcpseal');
  assert.deepEqual(installedPackage.bin, { mcpseal: 'dist/src/cli.js' });
  console.log(`mcpseal package smoke ok (${packedPaths.size} files)`);
} finally {
  await rm(workspace, { recursive: true, force: true });
}

async function run(command, args, cwd) {
  return exec(command, args, { cwd, encoding: 'utf8' });
}
