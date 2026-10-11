import { applyUpdate, checkForUpdates } from '../src/plugins/auto-updater/updateChecker';
import { saveBeforeRestart, registerRestartSave } from '../src/core/storage/restartGuard';
import { projectStore } from '../src/core/storage/ProjectStore';

export async function runUpdaterRegressions() {
  const results: string[] = [];
  const assert = (ok: unknown, label: string) => { if (!ok) throw new Error(label); results.push(label); };
  const order: string[] = [];
  const update = { download: async () => { order.push('verified'); }, install: async () => { order.push('install'); } };
  const save = async () => { order.push('save'); };
  const restart = async () => { order.push('restart'); };
  await applyUpdate(update, () => {}, save, restart);
  assert(order.join() === 'verified,save,install,restart', 'Verified download and completed save precede install/restart');
  for (const failure of ['download', 'save', 'install']) {
    order.length = 0;
    let rejected = false;
    try {
      await applyUpdate({
        download: async () => { if (failure === 'download') throw Error('Invalid signature or offline'); },
        install: async () => { order.push('install'); if (failure === 'install') throw Error('Installer failed'); },
      }, () => {}, async () => { if (failure === 'save') throw Error('Disk full'); }, restart);
    } catch { rejected = true; }
    assert(rejected && !order.includes('restart') && (failure === 'install' || !order.includes('install')), `${failure} failure cannot restart or proceed to a later stage`);
  }
  const originalSave = projectStore.save;
  projectStore.save = () => false;
  let blocked = false;
  try { await saveBeforeRestart(); } catch { blocked = true; }
  projectStore.save = originalSave;
  assert(blocked, 'App storage failure blocks restart');
  const unregister = registerRestartSave(async () => { throw Error('Disk write failed'); });
  blocked = false;
  try { await saveBeforeRestart(); } catch { blocked = true; }
  unregister();
  assert(blocked, 'Editor disk save rejection blocks restart');
  const original = (window as any).__TAURI_INTERNALS__;
  (window as any).isTauri = true;
  (window as any).__TAURI_INTERNALS__ = { invoke: async () => { throw Error('Offline'); } };
  blocked = false;
  try { await checkForUpdates(true); } catch { blocked = true; }
  assert(blocked, 'Network failure is not reported as already up to date');
  let requests = 0;
  (window as any).__TAURI_INTERNALS__.invoke = async () => { requests++; return null; };
  await Promise.all([checkForUpdates(true), checkForUpdates(true)]);
  assert(requests === 1, 'Concurrent checks share a request');
  (window as any).__TAURI_INTERNALS__ = original;
  return results;
}
