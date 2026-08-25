import React from 'react';
import type { Theme } from '../../core/themes/types';

export type BackgroundEffect = 'solid' | 'aurora' | 'grain' | 'grid' | 'ruled';

interface Props {
  theme: Theme;
  effect: BackgroundEffect;
  intensity: number; // 0.1 to 1.0
}

export const EditorBackground: React.FC<Props> = ({ theme, effect, intensity }) => {
  const accentColor = theme.colors.accent || '#8b5cf6';
  const clampedIntensity = Math.max(0.05, Math.min(1.0, intensity));

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
      {/* 1. Aurora Ambient Mesh Glow */}
      {effect === 'aurora' && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: clampedIntensity }}
        >
          {/* Top-Right Glowing Orb */}
          <div
            className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full blur-[110px] animate-pulse"
            style={{
              background: `radial-gradient(circle, ${accentColor}28 0%, ${theme.colors.bgHover}10 70%, transparent 100%)`,
              animationDuration: '9s',
            }}
          />
          {/* Bottom-Left Ambient Tint */}
          <div
            className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full blur-[130px] animate-pulse"
            style={{
              background: `radial-gradient(circle, ${theme.colors.cursor || accentColor}22 0%, ${theme.colors.bgSecondary}15 70%, transparent 100%)`,
              animationDuration: '12s',
            }}
          />
          {/* Center Subtle Atmosphere */}
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[450px] w-[650px] rounded-full blur-[140px]"
            style={{
              background: `radial-gradient(ellipse, ${accentColor}12 0%, transparent 75%)`,
            }}
          />
        </div>
      )}

      {/* 2. Cinematic Analog Film Grain */}
      {effect === 'grain' && (
        <div
          className="absolute inset-0 mix-blend-overlay transition-opacity duration-500"
          style={{
            opacity: clampedIntensity * 0.45,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}

      {/* 3. Subtle Dot Matrix Grid */}
      {effect === 'grid' && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: clampedIntensity * 0.4,
            backgroundImage: `radial-gradient(${theme.colors.textMuted} 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0',
          }}
        />
      )}

      {/* 4. Classic Manuscript Ruled Lines */}
      {effect === 'ruled' && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: clampedIntensity * 0.25,
            backgroundImage: `linear-gradient(to bottom, transparent 35px, ${theme.colors.border} 36px)`,
            backgroundSize: '100% 36px',
          }}
        />
      )}
    </div>
  );
};
