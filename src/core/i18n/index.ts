import { useSyncExternalStore } from 'react';
import type { SupportedLanguage, TranslationDictionary } from './types';
import { zh } from './locales/zh';
import { en } from './locales/en';
import { eventBus } from '../events/EventBus';
import { pluginManager } from '../plugins/PluginManager';
import { safeStorageSet } from '../storage/safeStorage';

const STORAGE_KEY = 'novelite_language';

const dictionaries: Record<SupportedLanguage, TranslationDictionary> = {
  zh,
  en,
};

function detectInitialLanguage(): SupportedLanguage {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'zh' || saved === 'en') {
    return saved;
  }
  // 首次启动检测操作系统语言，西文环境初始化为 en，其余环境一律默认 zh (简体中文)
  if (typeof navigator !== 'undefined' && navigator.language) {
    const navLang = navigator.language.toLowerCase();
    if (navLang.startsWith('en')) {
      return 'en';
    }
  }
  return 'zh';
}

let currentLanguage: SupportedLanguage = detectInitialLanguage();
const subscribers = new Set<() => void>();

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

function notify() {
  subscribers.forEach((cb) => cb());
}

export function getLanguage(): SupportedLanguage {
  return currentLanguage;
}

export function setLanguage(lang: SupportedLanguage) {
  if (currentLanguage === lang) return;
  currentLanguage = lang;
  safeStorageSet(STORAGE_KEY, lang);

  // 保障排版引擎激活状态
  if (!pluginManager.isPluginEnabled('plugin-chinese-typography')) {
    try {
      pluginManager.enablePlugin('plugin-chinese-typography');
    } catch {
      // ignore
    }
  }

  notify();
  eventBus.emit('language-changed', lang);
  eventBus.emit('editor-extensions-changed');
}

/**
 * 极速路径式取词函数，例如 t('settings.tabs.cursor')
 */
export function t(path: string, fallback?: string): string {
  const keys = path.split('.');
  let current: any = dictionaries[currentLanguage];

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      current = undefined;
      break;
    }
  }

  if (typeof current === 'string') return current;

  // Fallback 到中文基准字典
  if (currentLanguage !== 'zh') {
    let zhCurrent: any = dictionaries.zh;
    for (const k of keys) {
      if (zhCurrent && typeof zhCurrent === 'object' && k in zhCurrent) {
        zhCurrent = zhCurrent[k];
      } else {
        zhCurrent = undefined;
        break;
      }
    }
    if (typeof zhCurrent === 'string') return zhCurrent;
  }

  return fallback || path;
}

/**
 * React 响应式 Hook
 */
export function useTranslation() {
  const language = useSyncExternalStore(subscribe, getLanguage, () => 'zh');

  return {
    language,
    setLanguage,
    t,
  };
}

export const useI18n = useTranslation;

/**
 * 初始化检查（在 App 启动时调用，保障核心排版引擎正常载入）
 */
export function initI18n() {
  if (!pluginManager.isPluginEnabled('plugin-chinese-typography')) {
    try {
      pluginManager.enablePlugin('plugin-chinese-typography');
    } catch {
      // ignore
    }
  }
}
