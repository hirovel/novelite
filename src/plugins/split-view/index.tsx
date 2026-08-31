import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { eventBus } from '../../core/events/EventBus';

export const SplitViewPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-split-view',
    name: '对照分屏工坊 (Split View)',
    version: '1.0.0',
    description: '支持在右侧一键打开前文或灵感设定对照分屏，一边看一边写。',
    author: 'Novelite Team',
    icon: 'Columns',
    defaultEnabled: true,
  },

  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'split-view.toggle',
      title: '切换对照分屏 (Split View)',
      category: '视图',
      run: () => {
        eventBus.emit('split-view:toggle');
      },
    });
  },
};
