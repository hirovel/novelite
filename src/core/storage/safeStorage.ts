import { eventBus } from '../events/EventBus';

/**
 * Safe local storage wrapper that prevents unhandled QuotaExceededError,
 * SecurityError (e.g. cookies/storage blocked in Private Browsing),
 * and corrupted JSON parsing crashes.
 */

let quotaWarningEmitted = false;

export function safeStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    console.warn(`[SafeStorage] Failed to set "${key}":`, error);
    if (error?.name === 'QuotaExceededError' || error?.code === 22) {
      if (!quotaWarningEmitted) {
        quotaWarningEmitted = true;
        const isEn = typeof localStorage !== 'undefined' && localStorage.getItem('novelite_language') === 'en';
        eventBus.emit('show-toast', {
          message: isEn
            ? 'Browser local storage quota exceeded, please backup your manuscript or save to local disk!'
            : '本地浏览器存储配额已满，请及时备份手稿或连接本地磁盘保存！',
          type: 'warning',
        });
        setTimeout(() => {
          quotaWarningEmitted = false;
        }, 15000);
      }
    }
    return false;
  }
}

export function safeStorageGet(key: string, fallback: string | null = null): string | null {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch (error) {
    console.warn(`[SafeStorage] Failed to get "${key}":`, error);
    return fallback;
  }
}

export function safeStorageRemove(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[SafeStorage] Failed to remove "${key}":`, error);
    return false;
  }
}

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('[SafeStorage] JSON parse failed, using fallback:', error);
    return fallback;
  }
}
