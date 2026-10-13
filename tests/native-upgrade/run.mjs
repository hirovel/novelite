import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { promisify } from 'node:util';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Native installer tests require a disposable GitHub runner');
const exec = promisify(execFile);
const root = resolve('scratch/native-upgrade');
const windows = process.platform === 'win32';
assert.ok(windows || process.platform === 'darwin');
const versions = JSON.parse(readFileSync(join(root, 'versions.json'), 'utf8'));
const last = versions.at(-1);
const app = '/Applications/novelite.app';
const executable = windows ? join(root, 'installed app', 'novelite.exe') : `${app}/Contents/MacOS/novelite`;
const eventsPath = join(root, 'events.jsonl');
const evidence = [];
const downloads = [];
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (file, value) => writeFileSync(join(root, file), JSON.stringify(value, null, 2));
const run = async (command, args, options = {}) => {
  const result = await exec(command, args, { timeout: 240000, maxBuffer: 8 * 1024 * 1024, ...options });
  if (result.stdout.trim()) console.log(result.stdout.trim());
  return result.stdout.trim();
};
const ps = (action, kind, version) => run('pwsh', ['-NoProfile', '-File', 'tests/native-upgrade/windows.ps1',
  '-Action', action, '-Kind', kind, '-Root', root, '-Version', version]);
const artifact = (version, extension) => {
  const matches = readdirSync(join(root, version)).filter(file => file.endsWith(extension));
  assert.equal(matches.length, 1, `Expected one ${extension} artifact for ${version}`);
  return matches[0];
};

const server = createServer((request, response) => {
  try {
    const mode = json(join(root, 'mode.json'));
    if (request.url === '/latest.json') {
      if (mode.mode === 'idle') { response.writeHead(204).end(); return; }
      if (mode.mode === 'unavailable') { response.writeHead(503).end('Test outage'); return; }
      const payloadVersion = versions.includes(mode.version) ? mode.version : versions[0];
      const platforms = {};
      for (const [key, extension] of windows
        ? [['windows-x86_64-nsis', '-setup.exe'], ['windows-x86_64-msi', '.msi']]
        : [['darwin-aarch64', '.app.tar.gz']]) {
        const name = artifact(payloadVersion, extension);
        platforms[key] = { url: `http://127.0.0.1:39187/${payloadVersion}/${encodeURIComponent(name)}`,
          signature: readFileSync(join(root, payloadVersion, `${name}.sig`), 'utf8').trim() };
      }
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
        version: mode.version, pub_date: '2026-10-13T00:00:00Z', notes: 'Controlled native upgrade fixture', platforms,
      }));
      return;
    }
    const [, version, encodedName] = request.url.split('/');
    assert.ok(versions.includes(version));
    const name = decodeURIComponent(encodedName);
    assert.ok(readdirSync(join(root, version)).includes(name));
    const path = join(root, version, name);
    const bytes = readFileSync(path);
    downloads.push({ flow: json(join(root, 'active.json')).flow, version, name, mode: mode.mode });
    response.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': bytes.length });
    if (mode.mode === 'corrupt') {
      bytes[Math.floor(bytes.length / 2)] ^= 1;
      response.end(bytes);
    } else if (mode.mode === 'interrupted') {
      response.write(bytes.subarray(0, Math.floor(bytes.length / 3)));
      setTimeout(() => response.destroy(), 100);
    } else {
      createReadStream(path).pipe(response);
    }
  } catch (error) {
    response.writeHead(500).end(String(error));
  }
});
save('mode.json', { mode: 'idle' });
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(39187, '127.0.0.1', resolve); });

async function verify(kind, version) {
  if (windows) return ps('verify', kind, version);
  const expected = join(root, `payload-${version}`);
  mkdirSync(expected, { recursive: true });
  await run('tar', ['-xzf', join(root, version, artifact(version, '.app.tar.gz')), '-C', expected]);
  assert.equal(hash(executable), hash(join(expected, 'novelite.app/Contents/MacOS/novelite')), 'Installed Mac executable differs from signed update payload');
  const installedVersion = await run('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', `${app}/Contents/Info.plist`]);
  assert.equal(installedVersion, version);
  await run('codesign', ['--verify', '--deep', '--strict', app]);
  console.log(`PASS macOS ${version} bundle version, executable hash and code signature`);
}

async function launch(kind) {
  if (windows) await ps('launch', kind, versions[0]);
  else {
    const child = spawn(executable, [], { detached: true, stdio: 'ignore' });
    child.unref();
  }
}

async function observe(flow, kind, expectedVersions) {
  let cursor = 0;
  const starts = [];
  const seen = [];
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    const lines = existsSync(eventsPath) ? readFileSync(eventsPath, 'utf8').trim().split('\n').filter(Boolean) : [];
    for (; cursor < lines.length; cursor++) {
      const event = JSON.parse(lines[cursor]);
      const { stage } = event.payload;
      console.log(`${flow}: ${event.nativeVersion} PID ${event.pid} ${stage}`);
      evidence.push({ flow, ...event });
      seen.push(stage);
      assert.equal(event.nativeVersion, event.payload.version, 'Frontend and native versions differ');
      assert.equal(resolve(event.executable).toLowerCase(), resolve(executable).toLowerCase(), 'Update launched a different installation');
      assert.notEqual(stage, 'failed', JSON.stringify(event.payload));
      if (stage === 'started') {
        assert.equal(event.nativeVersion, expectedVersions[starts.length], 'Missing, repeated or out-of-order native restart');
        assert.ok(!starts.some(previous => previous.pid === event.pid), 'Restart reused the old process');
        await verify(kind, event.nativeVersion);
        starts.push(event);
        save('ack.json', { stage, pid: event.pid });
      } else if (stage.endsWith('-rejected')) {
        // A failed update must leave the registered version and actual installed bytes untouched.
        await verify(kind, event.nativeVersion);
        save('ack.json', { stage, pid: event.pid });
      } else if (stage === 'complete') {
        assert.deepEqual(starts.map(event => event.nativeVersion), expectedVersions);
        if (expectedVersions.length > 1) {
          for (const required of ['network-rejected', 'corrupt-rejected', 'interrupted-rejected', 'save-failed-rejected', 'restored', 'save-guard']) {
            assert.ok(seen.includes(required), `Missing coverage: ${required}`);
          }
          assert.equal(seen.filter(stage => stage === 'restored').length, expectedVersions.length - 1);
        }
        await pause(1500);
        return;
      }
    }
    await pause(200);
  }
  throw new Error(`${flow}: no verified automatic restart/completion within 240 seconds`);
}

async function installMac(kind) {
  const dmg = join(root, versions[0], artifact(versions[0], '.dmg'));
  assert.ok(!existsSync(app), 'CI runner already has Novelite installed');
  if (kind === 'brew') {
    const tap = join(root, 'tap');
    mkdirSync(join(tap, 'Casks'), { recursive: true });
    await run(process.execPath, ['scripts/generate-cask.mjs', dmg, join(tap, 'Casks/novelite.rb'), '--local']);
    await run('git', ['init', tap]);
    await run('git', ['-C', tap, 'add', 'Casks']);
    await run('git', ['-C', tap, '-c', 'user.name=CI', '-c', 'user.email=ci@example.invalid', 'commit', '-m', 'Native update test cask']);
    await run('brew', ['tap', 'novelite/upgrade-ci', tap]);
    try { await run('brew', ['help', 'trust']); await run('brew', ['trust', '--cask', 'novelite/upgrade-ci/novelite']); } catch { /* Older Homebrew has no trust subcommand. */ }
    await run('brew', ['install', '--cask', 'novelite/upgrade-ci/novelite']);
  } else {
    const mount = join(root, 'mounted-dmg');
    mkdirSync(mount, { recursive: true });
    await run('hdiutil', ['attach', '-nobrowse', '-readonly', '-mountpoint', mount, dmg]);
    try { await run('ditto', [join(mount, 'novelite.app'), app]); }
    finally { await run('hdiutil', ['detach', mount]); }
  }
}

try {
  const flows = windows
    ? [['nsis', versions], ['nsis', [versions[0], last]], ['msi', versions], ['msi', [versions[0], last]]]
    : [['dmg', versions], ['brew', [versions[0], last]]];
  for (const [kind, route] of flows) {
    const flow = `${kind}-${route.length === 3 ? 'consecutive' : 'skip'}`;
    console.log(`::group::${flow}: ${route.join(' → ')}`);
    writeFileSync(eventsPath, '');
    save('ack.json', null);
    save('active.json', { flow, versions: route });
    save('mode.json', { mode: 'idle' });
    if (windows) await ps('install', kind, versions[0]);
    else await installMac(kind);
    await launch(kind);
    await observe(flow, kind, route);
    const successfulDownloads = downloads.filter(download => download.flow === flow && download.mode === 'valid');
    assert.ok(successfulDownloads.length >= route.length - 1);
    for (const download of successfulDownloads) {
      assert.ok(download.name.endsWith(windows ? kind === 'msi' ? '.msi' : '-setup.exe' : '.app.tar.gz'), 'Updater changed installer format');
    }
    if (kind === 'brew') {
      // Homebrew still records the original version after an in-app update. Its next greedy upgrade must coexist safely.
      const tap = await run('brew', ['--repository', 'novelite/upgrade-ci']);
      await run(process.execPath, ['scripts/generate-cask.mjs', join(root, last, artifact(last, '.dmg')), join(tap, 'Casks/novelite.rb'), '--local']);
      await run('brew', ['upgrade', '--cask', '--greedy', 'novelite/upgrade-ci/novelite']);
      await verify(kind, last);
      writeFileSync(eventsPath, '');
      save('ack.json', null);
      save('active.json', { flow: 'brew-after-self-update', versions: route, verifyOnly: true });
      await launch(kind);
      await observe('brew-after-self-update', kind, [last]);
      await run('brew', ['uninstall', '--cask', 'novelite/upgrade-ci/novelite']);
    } else if (windows) await ps('uninstall', kind, last);
    else rmSync(app, { recursive: true }); // Exact fixed app path, on a disposable Mac runner only.
    for (let i = 0; i < 100 && existsSync(executable); i++) await pause(100);
    assert.ok(!existsSync(executable), 'Uninstall left the application executable behind');
    console.log(`PASS ${flow}`);
    console.log('::endgroup::');
  }
  save('result.json', { status: 'passed', platform: process.platform, versions, evidence, downloads });
} catch (error) {
  save('result.json', { status: 'failed', error: String(error), platform: process.platform, versions, evidence, downloads });
  throw error;
} finally {
  server.closeAllConnections();
  server.close();
  // Stop only PIDs emitted by our test bridge, never unrelated applications.
  for (const pid of new Set(evidence.map(event => event.pid))) {
    try { process.kill(pid); } catch { /* Already exited during update. */ }
  }
}
