import React from 'react';

interface BrandIconProps {
  size?: number;
  className?: string;
}

/**
 * 🌟 Novelite 官方品牌图腾：07-A 曜夜烫金双层手稿 (The Stacked Folio)
 * - 纯净独立物体形态（无圆角方框外壳，完全独立悬浮）
 * - 极致矢量精密度，白银折纸折角 + 24K 烫金一体化熔铸排版线
 * - 紧致视口裁切，在 16px ~ 64px 微型尺寸下依然极度锐利
 */
export const BrandIcon: React.FC<BrandIconProps> = ({ size = 18, className = '' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="7.5 25 220 220"
      width={size}
      height={size}
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Layer 1: Back Under-sheet Outline */}
      <polygon
        points="45,60 135,60 175,100 175,225 45,225"
        fill="none"
        stroke="#64748b"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.65"
      />

      {/* Layer 2: Front Hero Sheet Outline */}
      <polygon
        points="60,45 150,45 190,85 190,210 60,210"
        fill="none"
        stroke="#f8fafc"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Layer 3: Folded Corner Triangle (Pure White Solid) */}
      <polygon
        points="150,45 150,85 190,85"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="2"
      />

      {/* Layer 4: Ruling Line 1 (Silver Slate) */}
      <line
        x1="85"
        y1="135"
        x2="165"
        y2="135"
        stroke="#cbd5e1"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Layer 5: Ruling Line 2 (24K Gold) */}
      <line
        x1="85"
        y1="165"
        x2="145"
        y2="165"
        stroke="#f59e0b"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Layer 6: Core Dot (24K Gold) */}
      <circle cx="145" cy="165" r="6" fill="#f59e0b" />
    </svg>
  );
};
