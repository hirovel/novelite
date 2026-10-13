import { persistRestartCheckpoint, restoreRestartCheckpoint } from '../src/core/storage/restartCheckpoint';
import { saveBeforeRestart } from '../src/core/storage/restartGuard';

export async function runCheckpointRegressions() {
  const results: string[] = [];
  const assert = (ok: unknown, label: string) => { if (!ok) throw new Error(label); results.push(label); };
  const original = (window as any).__TAURI_INTERNALS__;
  const storage = { ...localStorage };
  let checkpoint: any = null;
  let failWrite = false;
  (window as any).__TAURI_INTERNALS__ = { invoke: async (command: string, args: any) => {
    if (command === 'write_restart_checkpoint') {
      if (failWrite) throw Error('Checkpoint disk is full');
      checkpoint = structuredClone(args.checkpoint);
    } else if (command === 'read_restart_checkpoint') return checkpoint;
    else if (command === 'clear_restart_checkpoint') {
      if (args.id === checkpoint.id) checkpoint = null;
    } else throw Error(`Unexpected checkpoint command: ${command}`);
  } };
  try {
    localStorage.setItem('test_manuscript', '最后一段 café 🌙');
    await persistRestartCheckpoint();
    const first = structuredClone(checkpoint);
    // Reproduce the exact native failure: WebKit restarts with the previous on-disk state.
    localStorage.setItem('test_manuscript', '旧内容');
    localStorage.setItem('test_deleted_setting', 'stale');
    localStorage.removeItem('novelite_restart_checkpoint');
    await restoreRestartCheckpoint();
    assert(localStorage.getItem('test_manuscript') === '最后一段 café 🌙', 'Native checkpoint recovers text lost by WebView storage on restart');
    assert(localStorage.getItem('test_deleted_setting') === null, 'Recovery also preserves deleted settings');
    assert(checkpoint.id === first.id, 'Recovered checkpoint survives another immediate restart');
    localStorage.setItem('test_manuscript', '恢复之后继续写的新内容');
    await restoreRestartCheckpoint();
    assert(checkpoint === null && localStorage.getItem('test_manuscript') === '恢复之后继续写的新内容', 'A persisted checkpoint marker preserves newer work and retires the old snapshot');
    await persistRestartCheckpoint();
    assert(checkpoint.id !== first.id, 'Consecutive upgrades replace the checkpoint with a new generation');
    failWrite = true;
    let blocked = false;
    try { await saveBeforeRestart(); } catch { blocked = true; }
    assert(blocked, 'Native checkpoint write failure blocks installation and restart');
  } finally {
    localStorage.clear();
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
    (window as any).__TAURI_INTERNALS__ = original;
  }
  return results;
}
