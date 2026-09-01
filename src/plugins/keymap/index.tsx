import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { eventBus } from '../../core/events/EventBus';

export const KeymapPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-keymap',
    name: '快捷键管理',
    version: '1.0.0',
    description: '提供全局快捷键注册路由、自定义改键与快捷键速查面板。',
    author: 'hirovel',
    icon: 'Keyboard',
    defaultEnabled: true,
  },

  init: (ctx: PluginContext) => {
    // 🌟 Register Command for Command Palette & Cheatsheet
    ctx.registerCommand({
      id: 'keymap:open-cheatsheet',
      title: '快捷键全景速查与按键管理 (Hotkeys Cheatsheet)',
      category: '系统与心流',
      shortcut: 'Ctrl+/',
      run: () => {
        eventBus.emit('keymap:open-cheatsheet');
      },
    });
  },
};
