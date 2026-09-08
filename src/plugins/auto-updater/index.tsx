import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { checkForUpdates, CURRENT_VERSION } from './updateChecker';
import { eventBus } from '../../core/events/EventBus';
import { getLanguage } from '../../core/i18n';

export const AutoUpdaterPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-auto-updater',
    name: '版本更新与检测',
    nameEn: 'Auto Updater',
    version: '1.0.0',
    description: '自动检测 GitHub Releases 软件新版本，提供语义化更新日志与一键升级下载。',
    descriptionEn: 'Check for novelite version updates and release announcements automatically.',
    author: 'hirovel',
    icon: 'Sparkles',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    // 1. Register command to manually check updates
    ctx.registerCommand({
      id: 'app:check-updates',
      title: '检查软件新版本',
      titleEn: 'Check for Updates',
      descriptionEn: 'Check GitHub Releases for software updates and changelog',
      category: '系统工具',
      categoryEn: 'System',
      run: async (c) => {
        const isEn = getLanguage() === 'en';
        c.showToast(isEn ? 'Checking for updates...' : '正在检查最新版本...', 'info');
        const info = await checkForUpdates(CURRENT_VERSION, true);
        if (info && info.hasUpdate) {
          eventBus.emit('open-update-modal', info);
        } else {
          c.showToast(
            isEn ? `You are using the latest version (v${CURRENT_VERSION})` : `当前已是最新版本 (v${CURRENT_VERSION})`,
            'success'
          );
        }
      },
    });

    // 2. Listen for open-update-modal request
    ctx.on('check-for-updates', async () => {
      const isEn = getLanguage() === 'en';
      const info = await checkForUpdates(CURRENT_VERSION, true);
      if (info && info.hasUpdate) {
        eventBus.emit('open-update-modal', info);
      } else {
        eventBus.emit('show-toast', {
          message: isEn
            ? `You are using the latest version (v${CURRENT_VERSION})`
            : `当前已是最新版本 (v${CURRENT_VERSION})`,
          type: 'success',
        });
      }
    });

    // 3. Perform silent background check 3.5s after launch
    setTimeout(async () => {
      try {
        const info = await checkForUpdates(CURRENT_VERSION, false);
        if (info && info.hasUpdate) {
          eventBus.emit('open-update-modal', info);
        }
      } catch {
        // Silent
      }
    }, 3500);
  },
};
