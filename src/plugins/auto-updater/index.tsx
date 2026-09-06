import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { checkForUpdates, CURRENT_VERSION } from './updateChecker';
import { eventBus } from '../../core/events/EventBus';

export const AutoUpdaterPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-auto-updater',
    name: '版本更新与检测',
    version: '1.0.0',
    description: '自动检测 GitHub Releases 软件新版本，提供语义化更新日志与一键升级下载。',
    author: 'hirovel',
    icon: 'Sparkles',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    // 1. Register command to manually check updates
    ctx.registerCommand({
      id: 'app:check-updates',
      title: '检查软件新版本',
      category: '系统工具',
      run: async (c) => {
        c.showToast('正在检查最新版本...', 'info');
        const info = await checkForUpdates(CURRENT_VERSION, true);
        if (info && info.hasUpdate) {
          eventBus.emit('open-update-modal', info);
        } else {
          c.showToast(`当前已是最新版本 (v${CURRENT_VERSION})`, 'success');
        }
      },
    });

    // 2. Listen for open-update-modal request
    eventBus.on('check-for-updates', async () => {
      const info = await checkForUpdates(CURRENT_VERSION, true);
      if (info && info.hasUpdate) {
        eventBus.emit('open-update-modal', info);
      } else {
        eventBus.emit('show-toast', {
          message: `当前已是最新版本 (v${CURRENT_VERSION})`,
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
