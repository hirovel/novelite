import React, { useState, useEffect } from 'react';
import type { Theme } from '../../core/themes/types';
import { pluginManager } from '../../core/plugins/PluginManager';

export type BackgroundEffect = 'solid' | 'aurora' | 'ruled' | 'custom';

interface Props {
  theme: Theme;
  effect: BackgroundEffect;
  intensity: number; // 0.1 to 1.0
  customImage?: string | null;
  customImageBlur?: number; // 0 to 30px
  customImageDim?: number; // 0 to 0.9
}

export const EditorBackground: React.FC<Props> = React.memo(({
  theme,
  effect,
  intensity,
  customImage,
  customImageBlur = 6,
  customImageDim = 0.45,
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    return pluginManager.subscribe(() => setTick((t) => t + 1));
  }, []);

  if (effect === 'solid') return null;

  // 1. Custom Image Wallpaper
  if (effect === 'custom' && customImage) {
    return (
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
        {/* Blurred & Scaled Image Layer */}
        <div
          className="absolute -inset-4 bg-cover bg-center transition-all duration-700 ease-out will-change-transform"
          style={{
            backgroundImage: `url("${customImage}")`,
            filter: `blur(${customImageBlur}px)`,
            opacity: Math.max(0.1, Math.min(1.0, intensity)),
            transform: 'scale(1.04)',
          }}
        />

        {/* Dynamic Theme-Aware Dimming Overlay */}
        <div
          className="absolute inset-0 transition-colors duration-500"
          style={{
            backgroundColor: theme.isDark
              ? `rgba(0, 0, 0, ${customImageDim})`
              : `rgba(255, 255, 255, ${customImageDim * 0.7})`,
          }}
        />
      </div>
    );
  }

  // 2. Check for plugin-registered renderer first
  const renderers = pluginManager.getBackgroundRenderers();
  const targetRenderer = renderers.find((r) => r.id === effect);

  // 3. High-visibility Built-in Native Fallback Renderers
  const renderNativeEffect = () => {
    switch (effect) {
      case 'aurora': {
        const accent = theme.colors.accent || '#a78bfa';
        const cursor = theme.colors.cursor || accent;
        const opacity = Math.max(0.15, Math.min(1.0, intensity));
        return (
          <div className="absolute inset-0 transition-opacity duration-700 pointer-events-none" style={{ opacity }}>
            {/* Top Right Orb */}
            <div
              className="absolute -top-24 -right-24 h-[560px] w-[560px] rounded-full blur-[100px] animate-pulse"
              style={{
                background: `radial-gradient(circle, ${accent}55 0%, ${accent}18 50%, transparent 75%)`,
                animationDuration: '8s',
              }}
            />
            {/* Bottom Left Orb */}
            <div
              className="absolute -bottom-32 -left-32 h-[640px] w-[640px] rounded-full blur-[120px] animate-pulse"
              style={{
                background: `radial-gradient(circle, ${cursor}45 0%, ${accent}12 50%, transparent 75%)`,
                animationDuration: '11s',
              }}
            />
            {/* Center Ambient */}
            <div
              className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[480px] w-[700px] rounded-full blur-[130px]"
              style={{
                background: `radial-gradient(ellipse, ${accent}28 0%, transparent 70%)`,
              }}
            />
          </div>
        );
      }

      case 'ruled': {
        const opacity = Math.max(0.1, Math.min(1.0, intensity)) * (theme.isDark ? 0.35 : 0.25);
        const marginGuideColor = theme.colors.accent || (theme.isDark ? '#e11d48' : '#dc2626');
        return (
          <div className="absolute inset-0 pointer-events-none transition-opacity duration-500 overflow-hidden" style={{ opacity }}>
            {/* Subtle Classic Manuscript Vertical Red Margin Guide Line */}
            <div
              className="absolute top-0 bottom-0 left-12 sm:left-16 w-px opacity-30 pointer-events-none"
              style={{ backgroundColor: marginGuideColor }}
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
      {targetRenderer ? targetRenderer.render(theme, intensity) : renderNativeEffect()}
    </div>
  );
});



