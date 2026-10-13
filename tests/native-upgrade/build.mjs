import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Native installer tests require a disposable GitHub runner');
assert.ok(['win32', 'darwin'].includes(process.platform));
const root = resolve('scratch/native-upgrade');
mkdirSync(root, { recursive: true });
const cli = resolve('node_modules/@tauri-apps/cli/tauri.js');
const target = process.platform === 'win32' ? 'x86_64-pc-windows-msvc' : 'aarch64-apple-darwin';
const bundles = process.platform === 'win32' ? 'nsis,msi' : 'app,dmg';
const originals = new Map(['package.json', 'package-lock.json', 'src/main.tsx', 'src-tauri/Cargo.toml',
  'src-tauri/Cargo.lock', 'src-tauri/tauri.conf.json', 'src-tauri/src/lib.rs'].map(path => [path, readFileSync(path, 'utf8')]));
const pkg = JSON.parse(originals.get('package.json'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
assert.ok([major, minor, patch].every(Number.isInteger), 'Expected a stable baseline version');
const versions = [0, 1, 2].map(offset => `${major}.${minor}.${patch + offset}`);
writeFileSync(join(root, 'versions.json'), JSON.stringify(versions));
const key = join(root, 'test.key');
// Independent ephemeral trust root. Never read or use the production signing secret.
execFileSync(process.execPath, [cli, 'signer', 'generate', '--ci', '--force', '-w', key], { stdio: 'pipe' });
const env = { ...process.env, NOVELITE_UPGRADE_TEST_DIR: root,
  TAURI_SIGNING_PRIVATE_KEY: readFileSync(key, 'utf8').trim(), TAURI_SIGNING_PRIVATE_KEY_PASSWORD: '' };
const pubkey = readFileSync(`${key}.pub`, 'utf8').trim();
const bridge = 'src-tauri/src/upgrade_test.rs';
try {
  copyFileSync('tests/native-upgrade/bridge.rs', bridge);
  writeFileSync('src/main.tsx', `${originals.get('src/main.tsx')}\nimport '../tests/native-upgrade/driver';\n`);
  const lib = originals.get('src-tauri/src/lib.rs');
  assert.equal(lib.split('tauri::Builder::default()').length, 2, 'Expected one app builder');
  writeFileSync('src-tauri/src/lib.rs', 'mod upgrade_test;\n' + lib.replace('tauri::Builder::default()',
    'tauri::Builder::default().invoke_handler(tauri::generate_handler![upgrade_test::upgrade_test])'));
  for (const version of versions) {
    console.log(`::group::Build native upgrade fixture ${version}`);
    writeFileSync('package.json', JSON.stringify({ ...pkg, version }, null, 2));
    const lock = JSON.parse(originals.get('package-lock.json'));
    lock.version = lock.packages[''].version = version;
    writeFileSync('package-lock.json', JSON.stringify(lock, null, 2));
    writeFileSync('src-tauri/Cargo.toml', originals.get('src-tauri/Cargo.toml').replace(/^version = "[^"]+"/m, `version = "${version}"`));
    writeFileSync('src-tauri/Cargo.lock', originals.get('src-tauri/Cargo.lock').replace(/(name = "novelite"\r?\nversion = ")[^"]+/, `$1${version}`));
    const config = JSON.parse(originals.get('src-tauri/tauri.conf.json'));
    config.version = version;
    config.identifier = 'com.novelite.upgrade-test';
    config.plugins.updater.pubkey = pubkey;
    config.plugins.updater.endpoints = ['http://127.0.0.1:39187/latest.json'];
    config.plugins.updater.dangerousInsecureTransportProtocol = true;
    // Keep the shipped passive install/restart behavior and all application code unchanged.
    writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(config, null, 2));
    execFileSync(process.execPath, [cli, 'build', '--target', target, '--bundles', bundles, '--ci', '--', '--locked'],
      { stdio: 'inherit', env });
    const output = join(root, version);
    mkdirSync(output, { recursive: true });
    const bundleRoot = `src-tauri/target/${target}/release/bundle`;
    for (const kind of process.platform === 'win32' ? ['nsis', 'msi'] : ['macos', 'dmg']) {
      for (const file of readdirSync(`${bundleRoot}/${kind}`, { withFileTypes: true })) {
        if (file.isFile() && (file.name.includes(`_${version}_`) || file.name.startsWith('novelite.app.tar.gz'))) {
          copyFileSync(`${bundleRoot}/${kind}/${file.name}`, join(output, file.name));
        }
      }
    }
    console.log('::endgroup::');
  }
} finally {
  for (const [path, contents] of originals) writeFileSync(path, contents);
  rmSync(bridge, { force: true });
  // Retain only the public key and signed fixtures for the runtime tests.
  rmSync(key, { force: true });
}
