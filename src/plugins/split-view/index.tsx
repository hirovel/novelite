import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { eventBus } from '../../core/events/EventBus';

export const SplitViewPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-split-view',
    name: '分屏对照',
    version: '2.0.0',
    description: '提供左右与上下对等双编辑器协同对照写作。',
    author: 'hirovel',
    icon: 'Columns',
    defaultEnabled: true,
  },

  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'split-view.toggle',
      title: '切换对照分屏 (Split View)',
      category: '视图',
      shortcut: 'Alt+S',
      run: () => {
        eventBus.emit('split-view:toggle');
      },
    });

    ctx.registerCommand({
      id: 'split-view.focus-toggle',
      title: '在主副分屏窗格间切换光标焦点 (Jump Between Panes)',
      category: '视图',
      shortcut: 'Ctrl+\\',
      run: () => {
        eventBus.emit('split-view:focus-pane', 'toggle');
      },
    });

    ctx.registerCommand({
      id: 'split-view.focus-primary',
      title: '聚焦左栏/主窗格',
      category: '视图',
      shortcut: 'Alt+1',
      run: () => {
        eventBus.emit('split-view:focus-pane', 'primary');
      },
    });

    ctx.registerCommand({
      id: 'split-view.focus-secondary',
      title: '聚焦右栏/副窗格',
      category: '视图',
      shortcut: 'Alt+2',
      run: () => {
        eventBus.emit('split-view:focus-pane', 'secondary');
      },
    });

    ctx.registerCommand({
      id: 'split-view.swap',
      title: '对调两栏分屏章节 (Swap Panes)',
      category: '视图',
      shortcut: 'Alt+X',
      run: () => {
        eventBus.emit('split-view:swap');
      },
    });
  },
};
