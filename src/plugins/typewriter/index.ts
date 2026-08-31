import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { createTypewriterExtension, type TypewriterConfig } from './typewriterExtension';

export const TypewriterPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-typewriter',
    name: '打字机模式',
    version: '2.1.0',
    description: '保持当前编辑行平滑锁定在黄金视线高度，免去频繁手动滚动的疲劳。',
    author: 'hirovel',
    icon: 'AlignVerticalSpaceAround',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'typewriter.toggle',
      title: '切换打字机居中模式',
      category: '排版沉浸',
      run: (c) => {
        const enabled = c.getSetting<boolean>('enabled', false);
        const next = !enabled;
        c.setSetting('enabled', next);
        c.showToast(next ? '已开启打字机居中模式' : '已关闭打字机居中模式', 'info');
      },
    });
  },
  getEditorExtensions: (ctx: PluginContext) => {
    return [
      createTypewriterExtension((): TypewriterConfig => ({
        enabled: ctx.getSetting<boolean>('enabled', false),
        anchorRatio: ctx.getSetting<number>('anchorRatio', 0.38),
        speedMode: ctx.getSetting<'gentle' | 'balanced' | 'snappy' | 'instant'>('speedMode', 'balanced'),
      })),
    ];
  },
};
