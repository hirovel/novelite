import { isTauri } from '@tauri-apps/api/core';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { saveBeforeRestart } from '../../core/storage/restartGuard';
import { version } from '../../../package.json';
import type { UpdateInfo } from './types';

export const CURRENT_VERSION = version;
let pending: Update | null = null;
let lastCheck = 0;
let checking: Promise<UpdateInfo> | null = null;
let installing = false;

function metadata(): UpdateInfo {
  return {
    currentVersion: CURRENT_VERSION,
    latestVersion: pending?.version ?? CURRENT_VERSION,
    hasUpdate: !!pending,
    publishedAt: pending?.date,
    releaseNotes: pending?.body,
  };
}

export async function checkForUpdates(force = false): Promise<UpdateInfo> {
  if (!isTauri()) throw new Error('Updates require the desktop app');
  if (installing) return metadata();
  if (checking) return checking;
  if (!force && lastCheck && Date.now() - lastCheck < 4 * 60 * 60 * 1000) return metadata();
  checking = (async () => {
    const update = await check({ timeout: 15000 });
    await pending?.close();
    pending = update;
    lastCheck = Date.now();
    return metadata();
  })();
  try { return await checking; } finally { checking = null; }
}

export type UpdateProgress = { phase: 'download' | 'saving' | 'installing' | 'restarting'; downloaded?: number; total?: number };

/** Separate verified download from install: Windows exits immediately at install. */
export async function applyUpdate(
  update: Pick<Update, 'download' | 'install'>,
  progress: (state: UpdateProgress) => void,
  save = saveBeforeRestart,
  restart = relaunch,
): Promise<void> {
  let downloaded = 0;
  let total: number | undefined;
  progress({ phase: 'download', downloaded });
  await update.download(event => {
    if (event.event === 'Started') total = event.data.contentLength;
    if (event.event === 'Progress') downloaded += event.data.chunkLength;
    progress({ phase: 'download', downloaded, total });
  }, { timeout: 120000 });
  progress({ phase: 'saving' });
  await save();
  progress({ phase: 'installing' });
  await update.install({ restartAfterInstall: true });
  progress({ phase: 'restarting' });
  await restart();
}

export async function installUpdate(expectedVersion: string, progress: (state: UpdateProgress) => void): Promise<void> {
  if (installing) throw new Error('An update is already in progress');
  installing = true;
  try {
    if (checking) await checking;
    if (!pending || pending.version !== expectedVersion) throw new Error('Check for updates again');
    await applyUpdate(pending, progress);
  } finally {
    await pending?.close().catch(() => {});
    pending = null;
    lastCheck = 0;
    installing = false;
  }
}
