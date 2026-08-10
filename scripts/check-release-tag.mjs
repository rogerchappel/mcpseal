#!/usr/bin/env node

const [tag, version] = process.argv.slice(2);

if (!tag || !version) {
  console.error('Usage: node scripts/check-release-tag.mjs <tag> <package-version>');
  process.exit(2);
}

const expectedTag = `v${version}`;

if (tag !== expectedTag) {
  console.error(`Release tag mismatch: expected ${expectedTag} for package version ${version}, received ${tag}`);
  process.exit(1);
}

console.log(`Release tag ${tag} matches package version ${version}`);
