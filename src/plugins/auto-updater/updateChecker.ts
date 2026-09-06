import type { UpdateInfo } from './types';
import { eventBus } from '../../core/events/EventBus';

export const CURRENT_VERSION = '1.0.0';
export const GITHUB_REPO = 'hirovel/novelite';
const CACHE_KEY = 'novelite_update_cache';
const LAST_CHECK_KEY = 'novelite_last_update_check';

/**
 * 比较两个语义化版本号 (例如 "1.0.1" vs "1.0.0")
 * 返回 1 表示 v1 > v2，-1 表示 v1 < v2，0 表示相等
 */
export function compareSemver(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const clean2 = v2.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(clean1.length, clean2.length);
  for (let i = 0; i < len; i++) {
    const n1 = clean1[i] ?? 0;
    const n2 = clean2[i] ?? 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

/**
 * 检查软件是否有新版本
 */
export async function checkForUpdates(
  currentVersion = CURRENT_VERSION,
  force = false
): Promise<UpdateInfo | null> {
  const now = Date.now();
  const lastCheck = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0', 10);

  // 若非强制检查且 4 小时内已检查过，直接使用缓存
  if (!force && now - lastCheck < 4 * 60 * 60 * 1000) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Fall through
      }
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      // 暂无 Releases 或网络不可达时优雅退出
      return {
        currentVersion,
        latestVersion: currentVersion,
        hasUpdate: false,
      };
    }

    const release = await res.json();
    const rawTag = release.tag_name || release.name || currentVersion;
    const latestVersion = rawTag.replace(/^v/i, '').trim();
    const hasUpdate = compareSemver(latestVersion, currentVersion) > 0;

    const assets = (release.assets || []).map((a: any) => ({
      name: a.name,
      url: a.browser_download_url,
      size: a.size,
    }));

    const updateInfo: UpdateInfo = {
      currentVersion,
      latestVersion,
      hasUpdate,
      publishedAt: release.published_at,
      releaseTitle: release.name || rawTag,
      releaseNotes: release.body || '',
      htmlUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases`,
      assets,
    };

    localStorage.setItem(LAST_CHECK_KEY, String(now));
    localStorage.setItem(CACHE_KEY, JSON.stringify(updateInfo));

    if (hasUpdate) {
      eventBus.emit('app:update-available', updateInfo);
    }

    return updateInfo;
  } catch (err) {
    console.debug('[AutoUpdater] Check for updates failed or offline:', err);
    return {
      currentVersion,
      latestVersion: currentVersion,
      hasUpdate: false,
    };
  }
}
