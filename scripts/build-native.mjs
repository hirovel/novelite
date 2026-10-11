import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const cli = resolve('node_modules/@tauri-apps/cli/tauri.js');
const args = ['build', ...process.argv.slice(2)];
mkdirSync('scratch', { recursive: true });
if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
  if (process.env.GITHUB_REF_TYPE === 'tag') throw new Error('Release signing secret is required');
  const key = resolve('scratch/ci-updater.key');
  execFileSync(process.execPath, [cli, 'signer', 'generate', '--ci', '--force', '-w', key], { stdio: 'pipe' });
  process.env.TAURI_SIGNING_PRIVATE_KEY = readFileSync(key, 'utf8').trim();
  const pubkey = readFileSync(`${key}.pub`, 'utf8').trim();
  writeFileSync('scratch/updater-ci.json', JSON.stringify({ plugins: { updater: { pubkey } } }));
  args.splice(1, 0, '--config', 'scratch/updater-ci.json');
  writeFileSync('scratch/updater.pub', pubkey);
} else {
  const config = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
  writeFileSync('scratch/updater.pub', config.plugins.updater.pubkey);
}
execFileSync(process.execPath, [cli, ...args], { stdio: 'inherit', env: process.env });
