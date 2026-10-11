import type { NovelitePlugin } from '../../core/plugins/types';
import { checkForUpdates, CURRENT_VERSION } from './updateChecker';
import { eventBus } from '../../core/events/EventBus';
import { getLanguage } from '../../core/i18n';

let startup: ReturnType<typeof setTimeout> | undefined;
let periodic: ReturnType<typeof setInterval> | undefined;

async function checkUpdates(manual: boolean) {
  const isEn = getLanguage() === 'en';
  const toast = (message: string, type = 'info') => eventBus.emit('show-toast', { message, type });
  if (manual) toast(isEn ? 'Checking for updates…' : '正在检查更新…');
  try {
    const info = await checkForUpdates(manual);
    if (info.hasUpdate) eventBus.emit('open-update-modal', info);
    else if (manual) toast(isEn ? `You are up to date (v${CURRENT_VERSION})` : `当前已是最新版本 (v${CURRENT_VERSION})`, 'success');
  } catch {
    if (manual) toast(isEn ? 'Could not check for updates. Check your connection and try again.' : '检查更新失败，请检查网络后重试。', 'error');
  }
}

export const AutoUpdaterPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-auto-updater', name: '自动更新', nameEn: 'Auto Updater', version: '1.1.0',
    description: '自动检查新版本，确认后校验、保存手稿并安装更新。',
    descriptionEn: 'Check for signed updates, save manuscripts and install on confirmation.',
    author: 'hirovel', icon: 'Sparkles', defaultEnabled: true,
  },
  init: ctx => {
    ctx.registerCommand({ id: 'app:check-updates', title: '检查软件新版本', titleEn: 'Check for Updates',
      category: '系统工具', categoryEn: 'System', run: () => checkUpdates(true) });
    ctx.on('check-for-updates', () => checkUpdates(true));
    startup = setTimeout(() => void checkUpdates(false), 3500);
    periodic = setInterval(() => void checkUpdates(false), 4 * 60 * 60 * 1000);
  },
  unmount: () => { clearTimeout(startup); clearInterval(periodic); },
};
