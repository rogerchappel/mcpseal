import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packagePath = new URL('../package.json', import.meta.url);
const workflowPath = new URL('../.github/workflows/release.yml', import.meta.url);

export function checkPublishConfig(packageJson, workflow) {
  assert.equal(packageJson.name, 'mcpseal', 'release package name must be mcpseal');
  assert.notEqual(packageJson.private, true, 'release package must not be private');
  assert.equal(packageJson.publishConfig?.access, 'public', 'publishConfig.access must be public');
  assert.equal(packageJson.publishConfig?.provenance, true, 'publishConfig.provenance must be enabled');

  const publish = workflow.indexOf('npm publish');
  const githubRelease = workflow.indexOf('gh release create');
  assert.notEqual(publish, -1, 'release workflow must publish to npm');
  assert.notEqual(githubRelease, -1, 'release workflow must create a GitHub release');
  assert(publish < githubRelease, 'npm publication must precede GitHub release creation');
  assert.match(workflow, /id-token:\s*write/, 'release workflow must grant OIDC token permission');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  const workflow = await readFile(workflowPath, 'utf8');
  checkPublishConfig(packageJson, workflow);
  console.log('npm trusted-publishing configuration ok');
}
