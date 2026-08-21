#!/usr/bin/env node

const packageName = process.argv[2] ?? process.env.npm_package_name;
const packageVersion = process.argv[3] ?? process.env.npm_package_version;
const registry = (process.env.NPM_REGISTRY_URL ?? 'https://registry.npmjs.org').replace(/\/$/, '');

if (!packageName || !packageVersion) {
  console.error('Usage: node scripts/check-package-version-available.mjs <package-name> <package-version>');
  process.exit(2);
}

const encodedName = packageName.startsWith('@')
  ? `@${encodeURIComponent(packageName.slice(1))}`
  : encodeURIComponent(packageName);
const response = await fetch(`${registry}/${encodedName}`);

if (response.status === 404) {
  console.log(`${packageName}@${packageVersion} is available on npm`);
  process.exit(0);
}

if (!response.ok) {
  console.error(`Unable to verify ${packageName}@${packageVersion} on npm: registry returned ${response.status}`);
  process.exit(2);
}

const metadata = await response.json();
if (Object.hasOwn(metadata.versions ?? {}, packageVersion)) {
  console.error(`${packageName}@${packageVersion} is already published on npm`);
  process.exit(1);
}

console.log(`${packageName}@${packageVersion} is available on npm`);
