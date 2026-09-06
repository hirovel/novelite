import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { eventBus } from '../../core/events/EventBus';

export const GlobalSearchPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-global-search',
    name: '全书全文检索',
    version: '1.0.0',
    description: '提供跨全书所有分卷与章节正文的秒级全文检索、上下文片段高亮与一键跳转定位。',
    author: 'hirovel',
    icon: 'Search',
    defaultEnabled: true,
  },

  init: (ctx: PluginContext) => {
    // 🌟 Register Command for Command Palette & Cheatsheet
    ctx.registerCommand({
      id: 'global-search:open',
      title: '全书正文全文检索',
      category: '查找与检索',
      shortcut: 'Ctrl+Shift+F',
      run: () => {
        eventBus.emit('global-search:open');
      },
    });
  },
};
