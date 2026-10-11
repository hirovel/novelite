// Update the tap in this repository only after its exact release is public.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const [caskFile, tag] = process.argv.slice(2);
assert.match(tag || '', /^v\d+\.\d+\.\d+$/);
const content = readFileSync(caskFile, 'utf8');
assert.ok(content.includes(`version "${tag.slice(1)}"`));
assert.ok(!content.includes('file://'), 'Never publish a local test URL');
const repo = process.env.GITHUB_REPOSITORY;
assert.equal(repo, 'hirovel/novelite');
assert.ok(process.env.GH_TOKEN);
async function api(path, method = 'GET', body) {
  const response = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.ok(response.ok, `GitHub ${method} ${path}: HTTP ${response.status}`);
  return response.json();
}
const release = await api(`releases/tags/${tag}`);
assert.ok(!release.draft && !release.prerelease);
const latest = await api('releases/latest');
assert.equal(latest.tag_name, tag, 'Do not downgrade Homebrew to an older release');
const asset = release.assets.find(asset => asset.name === `novelite_${tag.slice(1)}_aarch64.dmg`);
assert.ok(asset);
const sha = content.match(/sha256 "([a-f0-9]{64})"/)?.[1];
assert.equal(asset.digest, `sha256:${sha}`, 'Cask must match the published DMG');
const existing = await api('contents/Casks/novelite.rb?ref=main');
if (Buffer.from(existing.content, 'base64').toString('utf8') === content) {
  console.log('Homebrew is already up to date');
} else {
  await api('contents/Casks/novelite.rb', 'PUT', {
    message: `chore: update Homebrew cask to ${tag}`,
    content: Buffer.from(content).toString('base64'), sha: existing.sha, branch: 'main',
  });
  console.log(`Homebrew updated to ${tag}`);
}
