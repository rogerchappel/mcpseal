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
  id-token: write
steps:
  - run: npm publish
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

test('rejects GitHub release creation before npm publication', () => {
  assert.throws(
    () => checkPublishConfig(validPackage, validReleasebox, validWorkflow.replace('npm publish\n  - run: gh release create', 'gh release create\n  - run: npm publish')),
    /npm publication must precede GitHub release creation/,
  );
});
