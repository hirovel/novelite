import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { eventBus } from '../../core/events/EventBus';

export const KeymapPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-keymap',
    name: '快捷键管理',
    nameEn: 'Keymap Manager',
    version: '1.0.0',
    description: '提供全局快捷键注册路由、自定义改键与快捷键速查面板。',
    descriptionEn: 'Full-keyboard shortcut router, custom key recording, and floating cheatsheet.',
    author: 'hirovel',
    icon: 'Keyboard',
    defaultEnabled: true,
  },

  init: (ctx: PluginContext) => {
    // 🌟 Register Command for Command Palette & Cheatsheet
    ctx.registerCommand({
      id: 'keymap:open-cheatsheet',
      title: '快捷键速查与自定义',
      titleEn: 'Keymap Cheatsheet & Remap',
      description: '打开快捷键速查面板，支持修改与自定义按键',
      descriptionEn: 'Open keybinding cheatsheet and hotkey remap panel',
      category: 'system',
      categoryEn: 'System',
      shortcut: 'Ctrl+/',
      run: () => {
        eventBus.emit('keymap:open-cheatsheet');
      },
    });
  },
};
