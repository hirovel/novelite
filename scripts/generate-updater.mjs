import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [directory, tag] = process.argv.slice(2);
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
assert.equal(tag, `v${version}`);
const files = readdirSync(directory);
const platforms = {};
for (const [platform, pattern] of [
  ['darwin-aarch64', /^novelite\.app\.tar\.gz$/],
  ['windows-x86_64-nsis', new RegExp(`^novelite_${version.replaceAll('.', '\\.')}.*-setup\\.exe$`)],
  ['windows-x86_64-msi', new RegExp(`^novelite_${version.replaceAll('.', '\\.')}.*\\.msi$`)],
]) {
  const matches = files.filter(file => pattern.test(file));
  assert.equal(matches.length, 1, `Expected one update artifact for ${platform}`);
  const file = matches[0];
  const signature = readFileSync(join(directory, `${file}.sig`), 'utf8').trim();
  assert.ok(signature.length > 100, `Missing signature for ${file}`);
  platforms[platform] = { signature, url: `https://github.com/hirovel/novelite/releases/download/${tag}/${file}` };
}
writeFileSync(join(directory, 'latest.json'), JSON.stringify({ version, pub_date: new Date().toISOString(),
  notes: readFileSync(`docs/releases/${tag}.md`, 'utf8'), platforms }, null, 2) + '\n');
console.log(`Created signed update manifest for ${tag}`);
