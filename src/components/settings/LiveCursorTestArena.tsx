import React, { useState, useRef, useEffect } from 'react';
import { LiveCursorEngine } from '../../plugins/live-cursor/LiveCursorEngine';
import type { Theme } from '../../core/themes/types';
import { Sliders } from 'lucide-react';

interface Props {
  theme: Theme;
  cursorShape: 'beam' | 'block' | 'underline';
  cursorColor: string;
  onChangeCursorColor: (color: string) => void;
  cursorAnimationLength: number;
  onChangeAnimationLength: (len: number) => void;
  cursorTrailSize: number;
  onChangeTrailSize: (size: number) => void;
  vfxMode: 'pure' | 'embers' | 'ripples' | 'feather';
  onChangeVfxMode: (vfx: 'pure' | 'embers' | 'ripples' | 'feather') => void;
  blinkMode: 'smooth' | 'solid' | 'blink';
  onChangeBlinkMode: (mode: 'smooth' | 'solid' | 'blink') => void;
  breatheCycle: number;
  onChangeBreatheCycle: (cycle: number) => void;
  speedMode: 'gentle' | 'balanced' | 'snappy';
  onChangeSpeedMode: (mode: 'gentle' | 'balanced' | 'snappy') => void;
}

export const LiveCursorTestArena: React.FC<Props> = ({
  theme,
  cursorShape,
  cursorColor,
  onChangeCursorColor,
  cursorAnimationLength,
  onChangeAnimationLength,
  cursorTrailSize,
  onChangeTrailSize,
  vfxMode,
  onChangeVfxMode,
  blinkMode,
  onChangeBlinkMode,
  breatheCycle,
  onChangeBreatheCycle,
  speedMode,
  onChangeSpeedMode,
}) => {
  const [text, setText] = useState<string>('问剑青云，试看天下谁为主');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<LiveCursorEngine>(new LiveCursorEngine());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const isAutoColor = !cursorColor || cursorColor === 'auto';
  const effectiveColor = isAutoColor ? (theme.colors.cursor || theme.colors.accent || '#a78bfa') : cursorColor;

  const colorPresets = [
    { name: '极光紫', value: '#a78bfa' },
    { name: '霓虹青', value: '#38bdf8' },
    { name: '翡翠绿', value: '#34d399' },
    { name: '炽热金', value: '#f59e0b' },
    { name: '落樱粉', value: '#f472b6' },
    { name: '纯净白', value: '#f8fafc' },
  ];

  const updateCaret = (immediate = false) => {
    const input = inputRef.current;
    const container = containerRef.current;
    if (!input || !container) return;

    const selStart = input.selectionStart || 0;
    const sub = text.slice(0, selStart);

    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');
    if (!measureCtx) return;

    measureCtx.font = '14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    const textWidth = measureCtx.measureText(sub).width;

    const paddingLeft = 14;
    const targetX = paddingLeft + textWidth;
    const targetY = 11;
    const targetH = 22;

    let targetW = 2.6;
    if (cursorShape === 'block') {
      const charWidth = measureCtx.measureText(text[selStart] || 'M').width || 10;
      targetW = charWidth;
    } else if (cursorShape === 'underline') {
      targetW = 12;
    }

    if (immediate) {
      engineRef.current.teleport(targetX, targetY, targetW, targetH);
    } else {
      engineRef.current.setTarget(targetX, targetY, targetW, targetH);
    }
  };

  useEffect(() => {
    updateCaret(true);
  }, [cursorShape, cursorColor, cursorAnimationLength, cursorTrailSize, vfxMode, blinkMode, breatheCycle, speedMode, theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (containerRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const rect = containerRef.current.getBoundingClientRect();

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);

        const config = {
          enabled: true,
          shape: cursorShape,
          color: cursorColor,
          themeColor: theme.colors.cursor || theme.colors.accent || '#a78bfa',
          animationLength: cursorAnimationLength,
          trailSize: cursorTrailSize,
          vfxMode,
          blinkMode,
          breatheCycle,
          speedMode: speedMode || 'gentle',
          glow: true,
        };

        const engine = engineRef.current;
        engine.update(dt, config);
        engine.draw(ctx, config);

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [cursorShape, cursorColor, cursorAnimationLength, cursorTrailSize, vfxMode, blinkMode, breatheCycle, speedMode, theme]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    setTimeout(() => updateCaret(false), 0);
  };

  const handleSelectOrKey = () => {
    setTimeout(() => updateCaret(false), 0);
  };

  return (
    <div
      className="space-y-4 rounded-xl border p-4 shadow-sm text-xs"
      style={{
        backgroundColor: `${theme.colors.bgHover}40`,
        borderColor: theme.colors.border,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-xs" style={{ color: theme.colors.text }}>
          <Sliders className="h-3.5 w-3.5 text-cyan-400" />
          <span>Live 动态光标手感测试靶场</span>
        </div>
        <span
          className="font-mono text-[10.5px] px-2 py-0.5 rounded-full border border-white/10"
          style={{ color: effectiveColor }}
        >
          {cursorShape === 'block' ? '极简色块' : cursorShape === 'underline' ? '水平基准线' : '平滑光柱'}
        </span>
      </div>

      {/* Typing Canvas Input Box */}
      <div ref={containerRef} className="relative w-full overflow-hidden rounded-lg">
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        />

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleInput}
          onClick={handleSelectOrKey}
          onKeyUp={handleSelectOrKey}
          onKeyDown={handleSelectOrKey}
          placeholder="在此键入文字或按方向键测试 Live 光标物理拉伸手感..."
          className="w-full rounded-lg border py-2.5 px-3.5 text-sm outline-none font-mono transition-colors"
          style={{
            backgroundColor: theme.colors.bg,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            caretColor: 'transparent',
          }}
        />
      </div>

      {/* 1. Motion Speed Mode (Gentle, Balanced, Snappy) */}
      <div className="space-y-1.5 pt-1">
        <label className="block font-medium opacity-80" style={{ color: theme.colors.text }}>
          移动律动节奏 (Motion Cadence - 解决连续跳行暴冲)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'gentle', name: '舒缓典雅 (推荐)', desc: '平稳匀速，绝无暴冲' },
            { id: 'balanced', name: '自然平衡', desc: '适中灵动，手感自然' },
            { id: 'snappy', name: '极速跟手', desc: '瞬态迅捷响应' },
          ].map((sm) => {
            const isCur = speedMode === sm.id;
            return (
              <button
                key={sm.id}
                onClick={() => onChangeSpeedMode(sm.id as any)}
                className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all ${
                  isCur ? 'ring-1 ring-cyan-400 font-semibold shadow-xs' : 'border-white/10 hover:border-white/20 opacity-70'
                }`}
                style={{
                  backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                  borderColor: isCur ? effectiveColor : theme.colors.border,
                }}
              >
                <span className="text-[11px] font-medium" style={{ color: isCur ? theme.colors.text : theme.colors.textMuted }}>
                  {sm.name}
                </span>
                <span className="text-[9px] opacity-50 mt-0.5">{sm.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Cursor Color Customizer + Follow Theme Option */}
      <div className="space-y-1.5 pt-1">
        <label className="block font-medium opacity-80" style={{ color: theme.colors.text }}>
          光标色彩模式 (Color Preference)
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onChangeCursorColor('auto')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
              isAutoColor ? 'ring-1 ring-cyan-400 font-semibold' : 'border-white/10 hover:border-white/30 opacity-75'
            }`}
            style={{
              backgroundColor: isAutoColor ? `${theme.colors.accent}30` : 'transparent',
              borderColor: isAutoColor ? theme.colors.accent : 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <span
              className="h-3 w-3 rounded-full border border-white/20 shadow-xs"
              style={{ backgroundColor: theme.colors.cursor || theme.colors.accent }}
            />
            <span className="text-[11px]" style={{ color: theme.colors.text }}>
              跟随当前主题 ({theme.name})
            </span>
          </button>

          {colorPresets.map((c) => {
            const isCur = !isAutoColor && cursorColor.toLowerCase() === c.value.toLowerCase();
            return (
              <button
                key={c.value}
                onClick={() => onChangeCursorColor(c.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                  isCur ? 'ring-1 ring-cyan-400 font-semibold' : 'border-white/10 hover:border-white/30 opacity-75'
                }`}
                style={{ backgroundColor: isCur ? `${c.value}25` : 'transparent' }}
              >
                <span className="h-3 w-3 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: c.value }} />
                <span className="text-[11px]" style={{ color: theme.colors.text }}>{c.name}</span>
              </button>
            );
          })}

          <div className="flex items-center gap-1.5 pl-1">
            <input
              type="color"
              value={effectiveColor}
              onChange={(e) => onChangeCursorColor(e.target.value)}
              className="h-6 w-6 rounded cursor-pointer border-none bg-transparent"
              title="拾取自定义独立颜色"
            />
            <span className="font-mono text-[10.5px] opacity-60">{effectiveColor}</span>
          </div>
        </div>
      </div>

      {/* 3. Original Literature Live VFX Modes */}
      <div className="space-y-1.5 pt-1">
        <label className="block font-medium opacity-80" style={{ color: theme.colors.text }}>
          动态光标特效 (Live VFX)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'pure', name: '纯粹静雅 (推荐)', desc: '极简专注，无额外粒子' },
            { id: 'embers', name: '灵感微星', desc: '落笔伴随轻柔微芒' },
            { id: 'ripples', name: '砚池水纹', desc: '换行如水滴入砚台' },
            { id: 'feather', name: '羽落轻芒', desc: '轻盈柔和呼吸气场' },
          ].map((vfx) => {
            const isCur = vfxMode === vfx.id;
            return (
              <button
                key={vfx.id}
                onClick={() => onChangeVfxMode(vfx.id as any)}
                className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                  isCur ? 'ring-1 ring-cyan-400 font-semibold shadow-xs' : 'border-white/10 hover:border-white/20 opacity-70'
                }`}
                style={{
                  backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                  borderColor: isCur ? effectiveColor : theme.colors.border,
                }}
              >
                <span className="text-[11.5px] font-medium" style={{ color: isCur ? theme.colors.text : theme.colors.textMuted }}>
                  {vfx.name}
                </span>
                <span className="text-[9.5px] opacity-50 mt-0.5">{vfx.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Blinking & Breathing Dynamics */}
      <div className="space-y-2 pt-1">
        <label className="block font-medium opacity-80" style={{ color: theme.colors.text }}>
          静止闪烁模式 (Idle Dynamics)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'smooth', name: '呼吸脉冲 (平滑渐隐)' },
            { id: 'solid', name: '常驻高亮 (不闪烁)' },
            { id: 'blink', name: '经典硬闪' },
          ].map((bm) => {
            const isCur = blinkMode === bm.id;
            return (
              <button
                key={bm.id}
                onClick={() => onChangeBlinkMode(bm.id as any)}
                className={`py-1.5 px-2 rounded-lg border text-center font-medium text-[11px] transition-all ${
                  isCur ? 'ring-1 ring-cyan-400 font-semibold shadow-xs' : 'border-white/10 hover:border-white/20 opacity-70'
                }`}
                style={{
                  backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                  borderColor: isCur ? effectiveColor : theme.colors.border,
                  color: isCur ? theme.colors.text : theme.colors.textMuted,
                }}
              >
                {bm.name}
              </button>
            );
          })}
        </div>

        {blinkMode !== 'solid' && (
          <div className="rounded-lg border p-2.5 bg-black/10 border-white/5 space-y-1 animate-in fade-in duration-150">
            <div className="flex justify-between text-[10.5px]">
              <span style={{ color: theme.colors.text }}>呼吸周期时长 (Breathing Frequency)</span>
              <span className="font-mono text-cyan-400 font-bold">{breatheCycle.toFixed(1)}s / 次</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={breatheCycle}
              onChange={(e) => onChangeBreatheCycle(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] opacity-40">
              <span>快速灵动 (0.5s)</span>
              <span>深沉舒缓 (2.5s)</span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Physics Sliders */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-[11px]">
        <div>
          <div className="flex justify-between mb-1">
            <span style={{ color: theme.colors.text }}>流体平滑周期 (Animation Length)</span>
            <span className="font-mono text-cyan-400 font-bold">{Math.round(cursorAnimationLength * 1000)}ms</span>
          </div>
          <input
            type="range"
            min="0.03"
            max="0.18"
            step="0.01"
            value={cursorAnimationLength}
            onChange={(e) => onChangeAnimationLength(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] opacity-40">
            <span>更迅捷跟手</span>
            <span>更丝滑流体</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span style={{ color: theme.colors.text }}>尾迹拉伸强度 (Trail Size)</span>
            <span className="font-mono text-cyan-400 font-bold">{Math.round(cursorTrailSize * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            value={cursorTrailSize}
            onChange={(e) => onChangeTrailSize(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] opacity-40">
            <span>轻微微动</span>
            <span>饱满胶囊拉伸</span>
          </div>
        </div>
      </div>
    </div>
  );
};
