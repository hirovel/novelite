import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import type { Theme } from '../../core/themes/types';
import { getLanguage } from '../../core/i18n';

export const BackgroundAtmospherePlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-background-atmosphere',
    name: '背景与氛围',
    nameEn: 'Background Atmosphere',
    version: '1.0.0',
    description: '提供自定义背景壁纸、高斯模糊、暗化遮罩与氛围渲染。',
    descriptionEn: 'Custom wallpapers, Gaussian blur, dimming overlays, and atmospheric background effects.',
    author: 'hirovel',
    icon: 'Sparkles',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    // 1. Aurora Ambient Mesh Glow
    ctx.registerBackgroundRenderer({
      id: 'aurora',
      name: '极光流云',
      nameEn: 'Aurora Flow',
      render: (theme: Theme, intensity: number) => {
        const accent = theme.colors.accent || '#a78bfa';
        const cursor = theme.colors.cursor || accent;
        const opacity = Math.max(0.15, Math.min(1.0, intensity));
        return (
          <div className="absolute inset-0 transition-opacity duration-700 pointer-events-none" style={{ opacity }}>
            <div
              className="absolute -top-24 -right-24 h-[560px] w-[560px] rounded-full blur-[100px] animate-pulse"
              style={{
                background: `radial-gradient(circle, ${accent}55 0%, ${accent}18 50%, transparent 75%)`,
                animationDuration: '8s',
              }}
            />
            <div
              className="absolute -bottom-32 -left-32 h-[640px] w-[640px] rounded-full blur-[120px] animate-pulse"
              style={{
                background: `radial-gradient(circle, ${cursor}45 0%, ${accent}12 50%, transparent 75%)`,
                animationDuration: '11s',
              }}
            />
            <div
              className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[480px] w-[700px] rounded-full blur-[130px]"
              style={{
                background: `radial-gradient(ellipse, ${accent}28 0%, transparent 70%)`,
              }}
            />
          </div>
        );
      },
    });

    // 2. Classic Manuscript Ruled Lines (Horizontal baselines rendered directly in CodeMirror)
    ctx.registerBackgroundRenderer({
      id: 'ruled',
      name: '信纸横线',
      nameEn: 'Manuscript Ruled Lines',
      render: () => {
        return null;
      },
    });

    // Command: Cycle Background Effect
    ctx.registerCommand({
      id: 'background.cycle-effect',
      title: '切换背景空间氛围特效',
      titleEn: 'Cycle Background Atmosphere Effect',
      descriptionEn: 'Cycle between solid, aurora, ruled manuscript, and custom image',
      category: '视觉沉浸',
      categoryEn: 'Atmosphere',
      shortcut: 'Alt+B',
      run: (c) => {
        const hasCustom = !!localStorage.getItem('novelite_custom_image');
        const effects = hasCustom
          ? ['custom', 'solid', 'aurora', 'ruled']
          : ['solid', 'aurora', 'ruled'];
        const current = (typeof localStorage !== 'undefined' && localStorage.getItem('novelite_bg_effect')) || c.getSetting('effect', 'aurora');
        const next = effects[(effects.indexOf(current) + 1) % effects.length];
        c.setSetting('effect', next);
        c.emit('background-effect-changed', next);
        const isEn = getLanguage() === 'en';
        const nameMap: Record<string, string> = isEn
          ? {
              custom: 'Custom Wallpaper',
              solid: 'Solid Color',
              aurora: 'Aurora Flow',
              ruled: 'Manuscript Ruled',
            }
          : {
              custom: '自定义背景',
              solid: '纯色背景',
              aurora: '极光流云',
              ruled: '信纸横线',
            };
        c.showToast(isEn ? `Atmosphere effect: ${nameMap[next] || next}` : `已切换空间氛围: ${nameMap[next] || next}`, 'info');
      },
    });
  },
};
