import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPublishConfig } from './check-publish-config.mjs';

const validPackage = {
  name: 'mcpseal',
  publishConfig: { access: 'public', provenance: true },
};
const validReleasebox = { release: { publishNpm: true } };
const validWorkflow = `
permissions:
  contents: read
steps:
  - name: Publish package to npm
    permissions:
      id-token: write
    run: npm publish
  - run: gh release create
`;

test('accepts public trusted publishing before GitHub release creation', () => {
  assert.doesNotThrow(() => checkPublishConfig(validPackage, validReleasebox, validWorkflow));
});

test('rejects missing public package metadata', () => {
  assert.throws(
    () => checkPublishConfig({ ...validPackage, publishConfig: { provenance: true } }, validReleasebox, validWorkflow),
    /publishConfig\.access must be public/,
  );
});

test('rejects ReleaseBox metadata with npm publishing disabled', () => {
  assert.throws(
    () => checkPublishConfig(validPackage, { release: { publishNpm: false } }, validWorkflow),
    /releasebox release\.publishNpm must be enabled/,
  );
});

test('rejects OIDC permission on the workflow-wide validation scope', () => {
  const workflowWideOidc = validWorkflow.replace('  contents: read', '  contents: read\n  id-token: write').replace('    permissions:\n      id-token: write\n', '');
  assert.throws(() => checkPublishConfig(validPackage, validReleasebox, workflowWideOidc), /npm publish step must receive the OIDC token permission/);
  assert.throws(() => checkPublishConfig(validPackage, validReleasebox, validWorkflow.replace('    permissions:\n      id-token: write', '    permissions:\n      contents: write\n      id-token: write')), /must not share a scope/);
});

test('rejects GitHub release creation before npm publication', () => {
  assert.throws(
    () => checkPublishConfig(validPackage, validReleasebox, validWorkflow.replace('npm publish\n  - run: gh release create', 'gh release create\n  - run: npm publish')),
    /npm publication must precede GitHub release creation/,
  );
});
