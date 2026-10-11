import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const json = path => JSON.parse(readFileSync(path, 'utf8'));
const pkg = json('package.json');
const lock = json('package-lock.json');
const tauri = json('src-tauri/tauri.conf.json');
const cargo = readFileSync('src-tauri/Cargo.toml', 'utf8').match(/^version = "([^"]+)"/m)?.[1];
for (const version of [lock.version, lock.packages[''].version, tauri.version, cargo]) {
  assert.equal(version, pkg.version, 'Release versions must match');
}
if (process.env.GITHUB_REF_TYPE === 'tag') {
  assert.equal(process.env.GITHUB_REF_NAME, `v${pkg.version}`, 'Tag must match application version');
}
for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
  const entry = lock.packages[`node_modules/${name}`];
  assert.ok(entry, `Missing lock entry: ${name}`);
  assert.ok(!entry.os && !entry.cpu, `Platform-specific package must not be a required dependency: ${name}`);
}
for (const family of ['@oxlint/binding', '@rolldown/binding', '@tauri-apps/cli', '@tailwindcss/oxide']) {
  for (const arch of ['arm64', 'x64']) {
    assert.ok(lock.packages[`node_modules/${family}-darwin-${arch}`]?.optional, `Missing optional Mac ${arch} dependency: ${family}`);
  }
}
console.log(`Release v${pkg.version}: versions and macOS dependency coverage OK`);
