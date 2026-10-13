import { invoke, isTauri } from '@tauri-apps/api/core';

type Checkpoint = { id: string; entries: Record<string, string> };
const marker = 'novelite_restart_checkpoint';

/** localStorage returning successfully does not guarantee WKWebView has flushed it to disk. */
export async function persistRestartCheckpoint(): Promise<void> {
  if (!isTauri()) return;
  const checkpoint: Checkpoint = { id: crypto.randomUUID(), entries: {} };
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (key !== marker) checkpoint.entries[key] = localStorage.getItem(key)!;
  }
  await invoke('write_restart_checkpoint', { checkpoint });
  // Write last: a matching marker on a later startup means this snapshot has reached storage.
  localStorage.setItem(marker, checkpoint.id);
}

/** Run before importing ProjectStore/App so they cannot load or overwrite stale WebView data. */
export async function restoreRestartCheckpoint(): Promise<void> {
  if (!isTauri()) return;
  const checkpoint = await invoke<Checkpoint | null>('read_restart_checkpoint');
  if (!checkpoint) return;
  if (localStorage.getItem(marker) === checkpoint.id) {
    // Keep any newer work after an unsuccessful/cancelled installation. Never replay an old snapshot.
    await invoke('clear_restart_checkpoint', { id: checkpoint.id });
    return;
  }
  for (const key of Object.keys(localStorage)) {
    if (key !== marker && !Object.hasOwn(checkpoint.entries, key)) localStorage.removeItem(key);
  }
  for (const [key, value] of Object.entries(checkpoint.entries)) localStorage.setItem(key, value);
  localStorage.setItem(marker, checkpoint.id);
  // Keep the native copy until a subsequent startup observes this marker on disk. Clearing it
  // here would reintroduce data loss if the app restarts again before WebKit flushes the restore.
}
