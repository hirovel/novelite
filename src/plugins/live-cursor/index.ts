import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { getLanguage } from '../../core/i18n';

export const LiveCursorPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-live-cursor',
    name: '灵感光标',
    nameEn: 'Inspiration Live Cursor',
    version: '2.0.0',
    description: '提供平滑物理光标动力学跟随、拖尾与呼吸动效。',
    descriptionEn: 'Physics-driven smooth cursor dynamics, trails, and breathing idle animation.',
    author: 'hirovel',
    defaultEnabled: true,
  },

  init(ctx: PluginContext) {
    ctx.registerCommand({
      id: 'live-cursor.cycle-physics',
      title: '切换光标动画模式 (流体/丝带/敏捷)',
      titleEn: 'Cycle Cursor Animation Mode (Fluid / Ribbon / Snappy)',
      descriptionEn: 'Cycle cursor physics between fluid, multi-node ribbon, and snappy',
      category: '光标',
      categoryEn: 'Live Cursor',
      shortcut: 'Alt+P',
      run: (c: PluginContext) => {
        const isEn = getLanguage() === 'en';
        const modes: Array<'fluid' | 'ribbon' | 'quantum'> = ['fluid', 'ribbon', 'quantum'];
        const names: Record<string, string> = isEn
          ? {
              fluid: 'Fluid',
              ribbon: 'Ribbon',
              quantum: 'Snappy',
            }
          : {
              fluid: '流体',
              ribbon: '丝带',
              quantum: '敏捷',
            };
        const current = c.getSetting<'fluid' | 'ribbon' | 'quantum'>('physicsMode', 'fluid');
        const nextIdx = (modes.indexOf(current) + 1) % modes.length;
        const next = modes[nextIdx];
        c.setSetting('physicsMode', next);
        c.emit('live-cursor:physics-changed', next);
        c.showToast(isEn ? `Cursor mode: ${names[next]}` : `光标模式: ${names[next]}`);
      },
    });

    ctx.registerCommand({
      id: 'live-cursor.cycle-vfx',
      title: '轮换光标物理动效预设',
      titleEn: 'Cycle Cursor VFX Particle Presets',
      descriptionEn: 'Cycle particle sparks between pure, embers, ripples, and feather',
      category: '光标',
      categoryEn: 'Live Cursor',
      shortcut: 'Alt+C',
      run: (c: PluginContext) => {
        const isEn = getLanguage() === 'en';
        const modes: Array<'pure' | 'embers' | 'ripples' | 'feather'> = ['pure', 'embers', 'ripples', 'feather'];
        const names: Record<string, string> = isEn
          ? {
              pure: 'Pure Elegance',
              embers: 'Inspiration Embers',
              ripples: 'Ink Ripples',
              feather: 'Feather Dust',
            }
          : {
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
        c.showToast(isEn ? `VFX preset: ${names[next]}` : `粒子特效: ${names[next]}`);
      },
    });

    ctx.registerCommand({
      id: 'live-cursor.reset',
      title: '重置光标默认设置',
      titleEn: 'Reset Cursor Default Settings',
      descriptionEn: 'Restore cursor physics, vfx, and trail dimensions to defaults',
      category: '光标',
      categoryEn: 'Live Cursor',
      run: (c: PluginContext) => {
        const isEn = getLanguage() === 'en';
        c.setSetting('shape', 'beam');
        c.setSetting('color', 'auto');
        c.setSetting('animationLength', 0.08);
        c.setSetting('trailSize', 0.75);
        c.setSetting('vfxMode', 'pure');
        c.setSetting('blinkMode', 'smooth');
        c.setSetting('physicsMode', 'fluid');
        c.setSetting('luminescence', true);
        c.setSetting('streamPreset', 'theme');
        c.emit('live-cursor:vfx-changed', 'pure');
        c.showToast(isEn ? 'Cursor settings restored to defaults' : '已重置光标设置');
      },
    });
  },

  getEditorExtensions(_ctx: PluginContext) {
    // 🌟 Live 灵感光标已由 NovelEditor 内置的专用 cursorCompartmentRef 统一托管，
    // 支持与当前主题色彩/专属流光/React状态零闪烁热重载。
    // 此处返回空数组，彻底避免挂载双重扩展和生成重复 Canvas 导致的静默切换与状态冲突。
    return [];
  },
};

