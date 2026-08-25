import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';

export const LiveCursorPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-live-cursor',
    name: 'Live 灵感光标',
    version: '1.0.0',
    description: 'Novelite 自研 120fps GPU 物理流体光标与文学视觉动效引擎',
    author: 'Novelite Team',
    defaultEnabled: true,
  },

  init(ctx: PluginContext) {
    ctx.registerCommand({
      id: 'live-cursor.reset',
      title: '重置 Live 光标默认设置',
      category: '光标',
      run: (c: PluginContext) => {
        c.setSetting('shape', 'beam');
        c.setSetting('color', 'auto');
        c.setSetting('animationLength', 0.08);
        c.setSetting('trailSize', 0.75);
        c.setSetting('vfxMode', 'inkflow');
        c.setSetting('blinkMode', 'smooth');
        c.showToast('✨ 已重置 Live 动态光标设置');
      },
    });
  },

  getEditorExtensions() {
    return [];
  },
};
