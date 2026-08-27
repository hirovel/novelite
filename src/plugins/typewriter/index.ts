import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { createTypewriterExtension } from './typewriterExtension';

export const TypewriterPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-typewriter',
    name: '平滑打字机居中模式',
    version: '2.0.0',
    description: '保持当前编辑行平滑锁定在黄金分割垂直视口，免去频繁手动滚动的疲劳。',
    author: 'Novelite Core',
    icon: 'AlignVerticalSpaceAround',
    defaultEnabled: false,
  },
  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'typewriter.toggle',
      title: '切换打字机居中模式',
      category: '排版沉浸',
      shortcut: 'Alt+T',
      run: (c) => {
        const enabled = c.getSetting<boolean>('enabled', true);
        c.setSetting('enabled', !enabled);
        c.showToast(enabled ? '已关闭打字机居中' : '已开启打字机居中', 'info');
      },
    });
  },
  getEditorExtensions: (ctx: PluginContext) => {
    return [
      createTypewriterExtension(() => ctx.getSetting<boolean>('enabled', true)),
    ];
  },
};
