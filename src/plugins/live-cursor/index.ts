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
      id: 'live-cursor.cycle-vfx',
      title: '轮换光标物理动效预设 (纯粹/灵感微星/砚池水纹/羽落轻芒)',
      category: '光标',
      shortcut: 'Alt+C',
      run: (c: PluginContext) => {
        const modes: Array<'pure' | 'embers' | 'ripples' | 'feather'> = ['pure', 'embers', 'ripples', 'feather'];
        const names: Record<string, string> = {
          pure: '纯粹静雅',
          embers: '灵感微星',
          ripples: '砚池水纹',
          feather: '羽落轻芒',
        };
        const current = c.getSetting<'pure' | 'embers' | 'ripples' | 'feather'>('vfxMode', 'pure');
        const nextIdx = (modes.indexOf(current) + 1) % modes.length;
        const next = modes[nextIdx];
        c.setSetting('vfxMode', next);
        c.emit('live-cursor:vfx-changed', next);
        c.showToast(`✨ 光标动效: ${names[next]}`);
      },
    });

    ctx.registerCommand({
      id: 'live-cursor.reset',
      title: '重置 Live 光标默认设置',
      category: '光标',
      run: (c: PluginContext) => {
        c.setSetting('shape', 'beam');
        c.setSetting('color', 'auto');
        c.setSetting('animationLength', 0.08);
        c.setSetting('trailSize', 0.75);
        c.setSetting('vfxMode', 'pure');
        c.setSetting('blinkMode', 'smooth');
        c.emit('live-cursor:vfx-changed', 'pure');
        c.showToast('✨ 已重置 Live 动态光标设置');
      },
    });
  },

  getEditorExtensions() {
    return [];
  },
};
