import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packagePath = new URL('../package.json', import.meta.url);
const releaseboxPath = new URL('../releasebox.config.json', import.meta.url);
const workflowPath = new URL('../.github/workflows/release.yml', import.meta.url);

export function checkPublishConfig(packageJson, releaseboxConfig, workflow) {
  assert.equal(packageJson.name, 'mcpseal', 'release package name must be mcpseal');
  assert.notEqual(packageJson.private, true, 'release package must not be private');
  assert.equal(packageJson.publishConfig?.access, 'public', 'publishConfig.access must be public');
  assert.equal(packageJson.publishConfig?.provenance, true, 'publishConfig.provenance must be enabled');
  assert.equal(releaseboxConfig.release?.publishNpm, true, 'releasebox release.publishNpm must be enabled');

  const publish = workflow.indexOf('npm publish');
  const githubRelease = workflow.indexOf('gh release create');
  assert.notEqual(publish, -1, 'release workflow must publish to npm');
  assert.notEqual(githubRelease, -1, 'release workflow must create a GitHub release');
  assert(publish < githubRelease, 'npm publication must precede GitHub release creation');
  assert.match(workflow, /permissions:\s*\n\s+contents:\s*read/, 'release workflow must default to read-only contents permission');
  assert.doesNotMatch(workflow, /id-token:\s*write[\s\S]{0,80}contents:\s*write|contents:\s*write[\s\S]{0,80}id-token:\s*write/, 'publish and GitHub release permissions must not share a scope');
  const publishIndex = workflow.indexOf('name: Publish package to npm');
  const publishStep = workflow.slice(publishIndex, githubRelease);
  assert.match(publishStep, /id-token:\s*write/, 'npm publish step must receive the OIDC token permission');
  assert.doesNotMatch(workflow.slice(0, publishIndex), /id-token:\s*write/, 'validation steps must not receive OIDC token permission');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  const releaseboxConfig = JSON.parse(await readFile(releaseboxPath, 'utf8'));
  const workflow = await readFile(workflowPath, 'utf8');
  checkPublishConfig(packageJson, releaseboxConfig, workflow);
  console.log('npm trusted-publishing configuration ok');
}
