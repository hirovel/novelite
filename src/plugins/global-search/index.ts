import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { eventBus } from '../../core/events/EventBus';

export const GlobalSearchPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-global-search',
    name: '全书全文检索',
    nameEn: 'Global Full-text Search',
    version: '1.0.0',
    description: '提供跨全书所有分卷与章节正文的秒级全文检索、上下文片段高亮与一键跳转定位。',
    descriptionEn: 'Full-text keyword indexing and chapter jump across your entire novel manuscript.',
    author: 'hirovel',
    icon: 'Search',
    defaultEnabled: true,
  },

  init: (ctx: PluginContext) => {
    // 🌟 Register Command for Command Palette & Cheatsheet
    ctx.registerCommand({
      id: 'global-search:open',
      title: '全书正文全文检索',
      titleEn: 'Global Novel Full-text Search',
      descriptionEn: 'Search across all novel volumes and chapter manuscripts',
      category: '查找与检索',
      categoryEn: 'Search',
      shortcut: 'Ctrl+Shift+F',
      run: () => {
        eventBus.emit('global-search:open');
      },
    });
  },
};
