import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import type { Theme } from '../../core/themes/types';

export const BackgroundAtmospherePlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-background-atmosphere',
    name: '艺术空间与背景氛围工坊',
    version: '1.0.0',
    description: '提供极光流动光晕、暗房胶片颗粒、素描点阵、原稿横线等写作空间氛围渲染。',
    author: 'Novelite Core',
    icon: 'Sparkles',
    defaultEnabled: false,
  },
  init: (ctx: PluginContext) => {
    // 1. Aurora Ambient Mesh Glow
    ctx.registerBackgroundRenderer({
      id: 'aurora',
      name: '极光流云',
      render: (theme: Theme, intensity: number) => {
        const accentColor = theme.colors.accent || '#8b5cf6';
        const clampedIntensity = Math.max(0.05, Math.min(1.0, intensity));
        return (
          <div
            className="absolute inset-0 transition-opacity duration-700 pointer-events-none"
            style={{ opacity: clampedIntensity }}
          >
            <div
              className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full blur-[110px] animate-pulse"
              style={{
                background: `radial-gradient(circle, ${accentColor}28 0%, ${theme.colors.bgHover}10 70%, transparent 100%)`,
                animationDuration: '9s',
              }}
            />
            <div
              className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full blur-[130px] animate-pulse"
              style={{
                background: `radial-gradient(circle, ${theme.colors.cursor || accentColor}22 0%, ${theme.colors.bgSecondary}15 70%, transparent 100%)`,
                animationDuration: '12s',
              }}
            />
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[450px] w-[650px] rounded-full blur-[140px]"
              style={{
                background: `radial-gradient(ellipse, ${accentColor}12 0%, transparent 75%)`,
              }}
            />
          </div>
        );
      },
    });

    // 2. Cinematic Analog Film Grain
    ctx.registerBackgroundRenderer({
      id: 'grain',
      name: '暗房胶片',
      render: (_theme: Theme, intensity: number) => {
        const clampedIntensity = Math.max(0.05, Math.min(1.0, intensity));
        return (
          <div
            className="absolute inset-0 mix-blend-overlay transition-opacity duration-500 pointer-events-none"
            style={{
              opacity: clampedIntensity * 0.45,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />
        );
      },
    });

    // 3. Subtle Dot Matrix Grid
    ctx.registerBackgroundRenderer({
      id: 'grid',
      name: '素描点阵',
      render: (theme: Theme, intensity: number) => {
        const clampedIntensity = Math.max(0.05, Math.min(1.0, intensity));
        return (
          <div
            className="absolute inset-0 transition-opacity duration-500 pointer-events-none"
            style={{
              opacity: clampedIntensity * 0.4,
              backgroundImage: `radial-gradient(${theme.colors.textMuted} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0',
            }}
          />
        );
      },
    });

    // 4. Classic Manuscript Ruled Lines
    ctx.registerBackgroundRenderer({
      id: 'ruled',
      name: '原稿信纸',
      render: (theme: Theme, intensity: number) => {
        const clampedIntensity = Math.max(0.05, Math.min(1.0, intensity));
        return (
          <div
            className="absolute inset-0 transition-opacity duration-500 pointer-events-none"
            style={{
              opacity: clampedIntensity * 0.25,
              backgroundImage: `linear-gradient(to bottom, transparent 35px, ${theme.colors.border} 36px)`,
              backgroundSize: '100% 36px',
            }}
          />
        );
      },
    });

    // Command: Cycle Background Effect
    ctx.registerCommand({
      id: 'background.cycle-effect',
      title: '切换背景空间氛围特效',
      category: '视觉沉浸',
      shortcut: 'Alt+B',
      run: (c) => {
        const effects = ['solid', 'aurora', 'grain', 'grid', 'ruled'];
        const current = c.getSetting('effect', 'aurora');
        const next = effects[(effects.indexOf(current) + 1) % effects.length];
        c.setSetting('effect', next);
        c.emit('background-effect-changed', next);
        c.showToast(`已切换空间氛围：${next}`, 'info');
      },
    });
  },
};
