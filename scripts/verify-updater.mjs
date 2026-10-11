import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

function scan(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? scan(join(dir, entry.name)) : [join(dir, entry.name)]);
}
const artifacts = scan(`src-tauri/target/${process.env.TARGET}/release/bundle`)
  .filter(path => /\.(exe|msi|app\.tar\.gz)\.sig$/.test(path)).map(path => resolve(path.slice(0, -4)));
assert.equal(artifacts.length, process.platform === 'win32' ? 2 : 1);
execFileSync('cargo', ['run', '--release', '--target', process.env.TARGET, '--locked', '--manifest-path', 'src-tauri/Cargo.toml', '--example', 'verify_update', '--',
  resolve('scratch/updater.pub'), ...artifacts], { stdio: 'inherit' });
