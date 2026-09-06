import { useSyncExternalStore } from 'react';
import type { SupportedLanguage, TranslationDictionary } from './types';
import { zh } from './locales/zh';
import { en } from './locales/en';
import { eventBus } from '../events/EventBus';
import { pluginManager } from '../plugins/PluginManager';

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

export function setLanguage(lang: SupportedLanguage, options: { autoManageTypography?: boolean } = { autoManageTypography: true }) {
  if (currentLanguage === lang) return;
  currentLanguage = lang;
  localStorage.setItem(STORAGE_KEY, lang);

  // 联动机制：当切换为英文时，默认停用中文排版插件；切换回中文时重新启用
  if (options.autoManageTypography) {
    try {
      if (lang === 'en') {
        if (pluginManager.isPluginEnabled('plugin-chinese-typography')) {
          pluginManager.disablePlugin('plugin-chinese-typography');
        }
      } else if (lang === 'zh') {
        if (!pluginManager.isPluginEnabled('plugin-chinese-typography')) {
          pluginManager.enablePlugin('plugin-chinese-typography');
        }
      }
    } catch (err) {
      console.error('[i18n] Failed to auto-manage typography plugin:', err);
    }
  }

  notify();
  eventBus.emit('language-changed', lang);
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

/**
 * 初始化检查（在 App 启动时调用，如果首开被判定为 en，则同步应用排版停用联动）
 */
export function initI18n() {
  const initial = getLanguage();
  if (initial === 'en' && pluginManager.isPluginEnabled('plugin-chinese-typography')) {
    pluginManager.disablePlugin('plugin-chinese-typography');
  }
}
