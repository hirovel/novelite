import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { eventBus } from '../../core/events/EventBus';

export const SplitViewPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-split-view',
    name: '分屏对照',
    nameEn: 'Dual Split View',
    version: '2.0.0',
    description: '提供左右与上下对等双编辑器协同对照写作。',
    descriptionEn: 'Side-by-side or stacked dual-editor panes for cross-chapter reference writing.',
    author: 'hirovel',
    icon: 'Columns',
    defaultEnabled: true,
  },

  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'split-view.toggle',
      title: '切换对照分屏 (Split View)',
      titleEn: 'Toggle Dual Split View',
      descriptionEn: 'Toggle side-by-side or stacked dual-editor split view',
      category: '视图',
      categoryEn: 'Split View',
      shortcut: 'Alt+S',
      run: () => {
        eventBus.emit('split-view:toggle');
      },
    });

    ctx.registerCommand({
      id: 'split-view.focus-toggle',
      title: '在主副分屏窗格间切换光标焦点 (Jump Between Panes)',
      titleEn: 'Switch Cursor Focus Between Split Panes',
      descriptionEn: 'Toggle active cursor focus between primary and secondary editor panes',
      category: '视图',
      categoryEn: 'Split View',
      shortcut: 'Ctrl+\\',
      run: () => {
        eventBus.emit('split-view:focus-pane', 'toggle');
      },
    });

    ctx.registerCommand({
      id: 'split-view.focus-primary',
      title: '聚焦左栏/主窗格',
      titleEn: 'Focus Primary Left Pane',
      descriptionEn: 'Move active editor focus to the primary left/top pane',
      category: '视图',
      categoryEn: 'Split View',
      shortcut: 'Alt+1',
      run: () => {
        eventBus.emit('split-view:focus-pane', 'primary');
      },
    });

    ctx.registerCommand({
      id: 'split-view.focus-secondary',
      title: '聚焦右栏/副窗格',
      titleEn: 'Focus Secondary Right Pane',
      descriptionEn: 'Move active editor focus to the secondary right/bottom pane',
      category: '视图',
      categoryEn: 'Split View',
      shortcut: 'Alt+2',
      run: () => {
        eventBus.emit('split-view:focus-pane', 'secondary');
      },
    });

    ctx.registerCommand({
      id: 'split-view.swap',
      title: '对调两栏分屏章节 (Swap Panes)',
      titleEn: 'Swap Chapters Between Split Panes',
      descriptionEn: 'Swap active chapters between primary and secondary editor panes',
      category: '视图',
      categoryEn: 'Split View',
      shortcut: 'Alt+X',
      run: () => {
        eventBus.emit('split-view:swap');
      },
    });
  },
};
