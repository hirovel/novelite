import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LiveCursorEngine, type StreamPresetId } from '../../plugins/live-cursor/LiveCursorEngine';
import type { Theme } from '../../core/themes/types';
import { Sliders, Sparkles, Pipette, Zap, Layers, Activity } from 'lucide-react';

interface Props {
  theme: Theme;
  cursorShape: 'beam' | 'block' | 'underline';
  onSelectCursorShape?: (shape: 'beam' | 'block' | 'underline') => void;
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
  physicsMode?: 'fluid' | 'ribbon' | 'quantum';
  onChangePhysicsMode?: (mode: 'fluid' | 'ribbon' | 'quantum') => void;
  luminescence?: boolean;
  onChangeLuminescence?: (val: boolean) => void;
  inlineSkew?: boolean;
  onChangeInlineSkew?: (val: boolean) => void;
  streamPreset?: StreamPresetId;
  onChangeStreamPreset?: (preset: StreamPresetId) => void;
  streamHeadColor?: string;
  onChangeStreamHeadColor?: (color: string) => void;
  streamTailColor?: string;
  onChangeStreamTailColor?: (color: string) => void;
}

export const LiveCursorTestArena: React.FC<Props> = ({
  theme,
  cursorShape,
  onSelectCursorShape,
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
  physicsMode = 'fluid',
  onChangePhysicsMode,
  luminescence = true,
  onChangeLuminescence,
  inlineSkew = true,
  onChangeInlineSkew,
  streamPreset = 'theme',
  onChangeStreamPreset,
  streamHeadColor = '#38bdf8',
  onChangeStreamHeadColor,
  streamTailColor = '#a78bfa',
  onChangeStreamTailColor,
}) => {
  const [text, setText] = useState<string>('这是一个测试文本！\n这也是！');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = useRef<HTMLSpanElement | null>(null);
  const charMirrorRef = useRef<HTMLSpanElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<LiveCursorEngine>(new LiveCursorEngine());
  const configRef = useRef<any>({});
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const isAutoColor = !cursorColor || cursorColor === 'auto';
  const effectiveColor = isAutoColor ? (theme.colors.cursor || theme.colors.accent || '#a78bfa') : cursorColor;

  useEffect(() => {
    configRef.current = {
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
      physicsMode,
      luminescence,
      inlineSkew,
      streamPreset,
      streamHeadColor,
      streamTailColor,
      glow: true,
    };
  }, [cursorShape, cursorColor, cursorAnimationLength, cursorTrailSize, vfxMode, blinkMode, breatheCycle, speedMode, physicsMode, luminescence, inlineSkew, streamPreset, streamHeadColor, streamTailColor, theme]);

  const colorPresets = [
    { name: '极光紫', value: '#a78bfa' },
    { name: '霓虹青', value: '#38bdf8' },
    { name: '翡翠绿', value: '#34d399' },
    { name: '炽热金', value: '#f59e0b' },
    { name: '落樱粉', value: '#f472b6' },
    { name: '纯净白', value: '#f8fafc' },
  ];

  const streamPresets: Array<{ id: StreamPresetId; name: string; colors: [string, string] }> = [
    { id: 'theme', name: '跟随主题', colors: [theme.colors.accent || '#a78bfa', `${theme.colors.accent || '#a78bfa'}44`] },
    { id: 'cyan-violet', name: '青紫双色', colors: ['#38bdf8', '#a78bfa'] },
    { id: 'ice-blue', name: '冰蓝微光', colors: ['#67e8f9', '#3b82f6'] },
    { id: 'emerald', name: '翡翠流荧', colors: ['#6ee7b7', '#059669'] },
    { id: 'amber-rose', name: '赤金幻彩', colors: ['#fde047', '#f43f5e'] },
    { id: 'sakura', name: '落樱星辉', colors: ['#fbcfe8', '#db2777'] },
    { id: 'mono', name: '单色渐变', colors: [effectiveColor, `${effectiveColor}33`] },
    { id: 'custom', name: '自定义', colors: [streamHeadColor, streamTailColor] },
  ];

  const updateCaret = useCallback((immediate = false) => {
    const input = inputRef.current;
    const mirror = mirrorRef.current;
    const charMirror = charMirrorRef.current;
    if (!input || !mirror || !charMirror) return;

    const selStart = input.selectionStart || 0;
    const sub = text.slice(0, selStart);

    // Multi-line support: split by \n to measure current line prefix and line index
    const lines = sub.split('\n');
    const currentLineIndex = lines.length - 1;
    const currentLinePrefix = lines[currentLineIndex];

    mirror.textContent = currentLinePrefix;
    const measuredWidth = mirror.getBoundingClientRect().width;

    const currentChar = text[selStart] === '\n' || !text[selStart] ? 'M' : text[selStart];
    charMirror.textContent = currentChar;
    const charWidth = charMirror.getBoundingClientRect().width || 10;

    const paddingLeft = 14; // px-3.5 = 14px
    const paddingTop = 12;  // py-3 = 12px
    const lineHeight = 22;

    const targetX = paddingLeft + measuredWidth;
    let targetY = paddingTop + currentLineIndex * lineHeight;
    let targetH = 22;
    let targetW = 2.6;

    if (cursorShape === 'block') {
      targetW = charWidth;
    } else if (cursorShape === 'underline') {
      targetW = charWidth;
      targetY = paddingTop + currentLineIndex * lineHeight + 18.5;
      targetH = 2.6;
    }

    if (immediate) {
      engineRef.current.teleport(targetX, targetY, targetW, targetH);
    } else {
      engineRef.current.setTarget(targetX, targetY, targetW, targetH);
    }
  }, [cursorShape, text]);

  useEffect(() => {
    engineRef.current.setFocused(true);
    updateCaret(true);
  }, [updateCaret, text, cursorShape]);

  // Single mount animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    engineRef.current.setFocused(true);

    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const ro = new ResizeObserver(() => {
      handleResize();
      updateCaret(true);
    });
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const last = lastTimeRef.current || now;
      const dt = Math.min((now - last) / 1000, 0.05);
      lastTimeRef.current = now;

      if (containerRef.current && canvas.width > 0 && canvas.height > 0) {
        const dpr = window.devicePixelRatio || 1;
        const rect = containerRef.current.getBoundingClientRect();

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);

        const config = configRef.current;
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
      ro.disconnect();
    };
  }, [updateCaret]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleSelectOrKey = () => {
    engineRef.current.setFocused(true);
    updateCaret(false);
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Hidden DOM measurement mirrors */}
      <span
        ref={mirrorRef}
        className="absolute -top-9999px -left-9999px invisible whitespace-pre font-mono text-sm pointer-events-none"
      />
      <span
        ref={charMirrorRef}
        className="absolute -top-9999px -left-9999px invisible whitespace-pre font-mono text-sm pointer-events-none"
      />

      {/* 🌟 1. 光标测试 */}
      <div
        className="space-y-3 rounded-2xl border p-4.5 shadow-sm"
        style={{
          backgroundColor: `${theme.colors.bgHover}25`,
          borderColor: `${theme.colors.border}70`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium text-xs opacity-90" style={{ color: theme.colors.text }}>
            <Sliders className="h-3.5 w-3.5 opacity-70" />
            <span>光标测试</span>
          </div>
          <span
            className="font-mono text-[10.5px] px-2 py-0.5 rounded-full border border-white/10"
            style={{ color: effectiveColor }}
          >
            {cursorShape === 'block' ? '极简色块' : cursorShape === 'underline' ? '水平基准线' : '平滑光柱'}
          </span>
        </div>

        <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-white/10">
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          />

          <textarea
            ref={inputRef}
            rows={2}
            value={text}
            onChange={handleInput}
            onClick={handleSelectOrKey}
            onKeyUp={handleSelectOrKey}
            onKeyDown={handleSelectOrKey}
            onFocus={() => {
              engineRef.current.setFocused(true);
              updateCaret(false);
            }}
            placeholder="输入文字或按方向键测试光标..."
            className="w-full resize-none rounded-xl py-3 px-3.5 text-sm leading-[22px] min-h-[68px] outline-none font-mono transition-colors block"
            style={{
              backgroundColor: theme.colors.bg,
              color: theme.colors.text,
              caretColor: 'transparent',
            }}
          />
        </div>
      </div>

      {/* 🌟 2. 卡片一：形态与基准色彩 (Morphology & Color) */}
      <div className="space-y-4 p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2 font-medium text-xs opacity-90" style={{ color: theme.colors.text }}>
          <Layers className="h-3.5 w-3.5 opacity-75 text-cyan-400" />
          <span>形态与色彩</span>
        </div>

        {/* 光标形态 */}
        <div className="space-y-2">
          <label className="block text-[11px] opacity-75" style={{ color: theme.colors.text }}>
            光标形态
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'beam', name: '平滑光柱', desc: '2.6px 细垂直光柱，清晰专注' },
              { id: 'block', name: '极简色块', desc: '半透明字符方块，沉浸专注' },
              { id: 'underline', name: '水平基准线', desc: '底部水平基准线' },
            ].map((s) => {
              const isCur = cursorShape === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectCursorShape?.(s.id as any)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    isCur ? 'ring-1.5 ring-cyan-400/80 font-medium bg-white/[0.08]' : 'border-white/10 hover:border-white/20 opacity-75'
                  }`}
                  style={{
                    backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                    borderColor: isCur ? effectiveColor : theme.colors.border,
                  }}
                >
                  <span className="text-xs font-semibold" style={{ color: theme.colors.text }}>
                    {s.name}
                  </span>
                  <span className="text-[9.5px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                    {s.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 基准色彩 */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <label className="block text-[11px] opacity-75" style={{ color: theme.colors.text }}>
            光标基准颜色
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onChangeCursorColor('auto')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                isAutoColor ? 'ring-1.5 ring-cyan-400 font-medium bg-white/[0.08]' : 'border-white/10 hover:border-white/30 opacity-75'
              }`}
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-xs"
                style={{ backgroundColor: theme.colors.cursor || theme.colors.accent }}
              />
              <span className="text-[11px]" style={{ color: theme.colors.text }}>
                跟随主题 ({theme.name})
              </span>
            </button>

            {colorPresets.map((c) => {
              const isCur = !isAutoColor && cursorColor.toLowerCase() === c.value.toLowerCase();
              return (
                <button
                  key={c.value}
                  onClick={() => onChangeCursorColor(c.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all ${
                    isCur ? 'ring-1.5 ring-cyan-400 font-medium bg-white/[0.08]' : 'border-white/10 hover:border-white/30 opacity-75'
                  }`}
                >
                  <span className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: c.value }} />
                  <span className="text-[11px]" style={{ color: theme.colors.text }}>{c.name}</span>
                </button>
              );
            })}

            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] cursor-pointer hover:border-white/25 transition-all">
              <Pipette className="h-3 w-3 opacity-60" />
              <div className="relative flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: effectiveColor }} />
                <input
                  type="color"
                  value={effectiveColor}
                  onChange={(e) => onChangeCursorColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <span className="font-mono text-[10.5px] opacity-70">{effectiveColor}</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* 🌟 3. 卡片二：动力学与切变手感 (Dynamics & Motion) */}
      <div className="space-y-4 p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium text-xs opacity-90" style={{ color: theme.colors.text }}>
            <Activity className="h-3.5 w-3.5 opacity-75 text-cyan-400" />
            <span>动力学与手感</span>
          </div>
          <span className="text-[10px] font-mono opacity-40">快捷键 Alt+P</span>
        </div>

        {/* 动力学模式 */}
        <div className="space-y-2">
          <label className="block text-[11px] opacity-75" style={{ color: theme.colors.text }}>
            动力学物理模型
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'fluid', name: '流体', desc: '平滑流体拉伸' },
              { id: 'ribbon', name: '丝带', desc: '多节点弧形摆动' },
              { id: 'quantum', name: '极速', desc: '高频阻尼，快速落位' },
            ].map((pm) => {
              const isCur = physicsMode === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => onChangePhysicsMode?.(pm.id as any)}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                    isCur ? 'ring-1.5 ring-cyan-400/80 font-medium shadow-sm' : 'border-white/10 hover:border-white/20 opacity-70'
                  }`}
                  style={{
                    backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                    borderColor: isCur ? effectiveColor : theme.colors.border,
                  }}
                >
                  <span className="text-xs font-medium" style={{ color: isCur ? theme.colors.text : theme.colors.textMuted }}>
                    {pm.name}
                  </span>
                  <span className="text-[9.5px] opacity-50 mt-0.5">{pm.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 行内倾角切变开关 */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-cyan-400 opacity-80" />
            <div>
              <div className="text-[11px] font-medium" style={{ color: theme.colors.text }}>
                行内倾角切变
              </div>
              <div className="text-[9.5px] opacity-50">单行打字时自动前倾平行四边形切变，静止平滑回正</div>
            </div>
          </div>
          <button
            onClick={() => onChangeInlineSkew?.(!inlineSkew)}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out"
            style={{ backgroundColor: inlineSkew ? theme.colors.accent : 'rgba(255,255,255,0.2)' }}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                inlineSkew ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 移动节奏 */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <label className="block text-[11px] opacity-75" style={{ color: theme.colors.text }}>
            移动节奏
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'gentle', name: '舒缓', desc: '平稳缓和' },
              { id: 'balanced', name: '自然', desc: '灵敏适中' },
              { id: 'snappy', name: '极速', desc: '紧跟按键' },
            ].map((sm) => {
              const isCur = speedMode === sm.id;
              return (
                <button
                  key={sm.id}
                  onClick={() => onChangeSpeedMode(sm.id as any)}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                    isCur ? 'ring-1.5 ring-cyan-400/80 font-medium shadow-sm' : 'border-white/10 hover:border-white/20 opacity-70'
                  }`}
                  style={{
                    backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                    borderColor: isCur ? effectiveColor : theme.colors.border,
                  }}
                >
                  <span className="text-[11.5px] font-medium" style={{ color: isCur ? theme.colors.text : theme.colors.textMuted }}>
                    {sm.name}
                  </span>
                  <span className="text-[9.5px] opacity-50 mt-0.5">{sm.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🌟 4. 卡片三：流光与粒子效果 */}
      <div className="space-y-4 p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2 font-medium text-xs opacity-90" style={{ color: theme.colors.text }}>
          <Sparkles className="h-3.5 w-3.5 opacity-75 text-cyan-400" />
          <span>流光与粒子效果</span>
        </div>

        {/* 流光渐变开关 */}
        <div className="space-y-3 p-3 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-xs" style={{ color: theme.colors.text }}>
                流光色彩渐变
              </div>
              <div className="text-[10px] opacity-50">位移与输入时光标显示渐变色彩</div>
            </div>
            <button
              onClick={() => onChangeLuminescence?.(!luminescence)}
              className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out"
              style={{ backgroundColor: luminescence ? theme.colors.accent : 'rgba(255,255,255,0.2)' }}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  luminescence ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {luminescence && (
            <div className="pt-2 border-t border-white/5 space-y-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {streamPresets.map((sp) => {
                  const isCur = streamPreset === sp.id;
                  return (
                    <button
                      key={sp.id}
                      onClick={() => onChangeStreamPreset?.(sp.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                        isCur ? 'ring-1.5 ring-cyan-400 font-medium bg-white/[0.08]' : 'border-white/10 hover:border-white/20 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="flex h-3.5 w-6 rounded-full overflow-hidden shrink-0 border border-white/20 shadow-xs">
                        <span className="w-1/2 h-full" style={{ backgroundColor: sp.colors[0] }} />
                        <span className="w-1/2 h-full" style={{ backgroundColor: sp.colors[1] }} />
                      </div>
                      <span className="text-[11px] truncate" style={{ color: theme.colors.text }}>{sp.name}</span>
                    </button>
                  );
                })}
              </div>

              {streamPreset === 'custom' && (
                <div className="flex items-center gap-3 pt-1 px-1">
                  <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] cursor-pointer hover:border-white/25 transition-all">
                    <span className="text-[10.5px] opacity-75">起始色</span>
                    <div className="relative flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: streamHeadColor }} />
                      <input
                        type="color"
                        value={streamHeadColor}
                        onChange={(e) => onChangeStreamHeadColor?.(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <span className="font-mono text-[10px] text-cyan-300 font-medium">{streamHeadColor}</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] cursor-pointer hover:border-white/25 transition-all">
                    <span className="text-[10.5px] opacity-75">结束色</span>
                    <div className="relative flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: streamTailColor }} />
                      <input
                        type="color"
                        value={streamTailColor}
                        onChange={(e) => onChangeStreamTailColor?.(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <span className="font-mono text-[10px] text-purple-300 font-medium">{streamTailColor}</span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 微粒子与静态呼吸 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-white/5">
          <div className="space-y-2">
            <label className="block text-[11px] opacity-75" style={{ color: theme.colors.text }}>
              按键粒子效果
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'pure', name: '无', desc: '不开启粒子' },
                { id: 'embers', name: '星火', desc: '击键产生微光点' },
                { id: 'ripples', name: '波纹', desc: '换行展开微水纹' },
                { id: 'feather', name: '轻芒', desc: '散发呼吸微光' },
              ].map((vfx) => {
                const isCur = vfxMode === vfx.id;
                return (
                  <button
                    key={vfx.id}
                    onClick={() => onChangeVfxMode(vfx.id as any)}
                    className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all ${
                      isCur ? 'ring-1.5 ring-cyan-400 font-medium shadow-xs' : 'border-white/10 hover:border-white/20 opacity-70'
                    }`}
                    style={{
                      backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                      borderColor: isCur ? effectiveColor : theme.colors.border,
                    }}
                  >
                    <span className="text-[11px] font-medium" style={{ color: isCur ? theme.colors.text : theme.colors.textMuted }}>
                      {vfx.name}
                    </span>
                    <span className="text-[9px] opacity-50 mt-0.5">{vfx.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] opacity-75" style={{ color: theme.colors.text }}>
              静态呼吸与闪烁
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'smooth', name: '柔和呼吸', desc: '缓慢明暗' },
                { id: 'blink', name: '传统闪烁', desc: '标准通断' },
                { id: 'solid', name: '常亮静止', desc: '持续稳定' },
              ].map((bm) => {
                const isCur = blinkMode === bm.id;
                return (
                  <button
                    key={bm.id}
                    onClick={() => onChangeBlinkMode(bm.id as any)}
                    className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all ${
                      isCur ? 'ring-1.5 ring-cyan-400 font-medium shadow-xs' : 'border-white/10 hover:border-white/20 opacity-70'
                    }`}
                    style={{
                      backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                      borderColor: isCur ? effectiveColor : theme.colors.border,
                    }}
                  >
                    <span className="text-[10.5px] font-medium" style={{ color: isCur ? theme.colors.text : theme.colors.textMuted }}>
                      {bm.name}
                    </span>
                    <span className="text-[9px] opacity-50 mt-0.5">{bm.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 5. 参数调整 */}
      <div className="space-y-3 p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2 font-medium text-xs opacity-90" style={{ color: theme.colors.text }}>
          <Sliders className="h-3.5 w-3.5 opacity-75 text-cyan-400" />
          <span>参数调整</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          {/* Slider 1: Response Time */}
          <div className="space-y-2.5 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium opacity-75">动画时长</span>
              <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-md bg-white/10 text-cyan-300 font-semibold shadow-inner">
                {Math.round(cursorAnimationLength * 1000)} ms
              </span>
            </div>

            <div className="space-y-1.5">
              <input
                type="range"
                min="0.03"
                max="0.25"
                step="0.01"
                value={cursorAnimationLength}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeAnimationLength(val);
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/20 accent-cyan-400 transition-all hover:bg-white/30 focus:outline-none"
              />
              <div className="flex justify-between px-1">
                {[30, 80, 140, 200, 250].map((tick) => {
                  const isCurrent = Math.abs(Math.round(cursorAnimationLength * 1000) - tick) <= 15;
                  return (
                    <div key={tick} className="flex flex-col items-center gap-0.5">
                      <div className={`w-0.5 h-1.5 rounded-full ${isCurrent ? 'bg-cyan-400 h-2' : 'bg-white/20'}`} />
                      <span className={`text-[8.5px] font-mono ${isCurrent ? 'text-cyan-300 font-bold' : 'opacity-35'}`}>{tick}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Slider 2: Trail Stretch */}
          <div className="space-y-2.5 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium opacity-75">拖尾长度</span>
              <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-md bg-white/10 text-cyan-300 font-semibold shadow-inner">
                {Math.round(cursorTrailSize * 100)} %
              </span>
            </div>

            <div className="space-y-1.5">
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={cursorTrailSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeTrailSize(val);
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/20 accent-cyan-400 transition-all hover:bg-white/30 focus:outline-none"
              />
              <div className="flex justify-between px-1">
                {[20, 40, 60, 80, 100].map((tick) => {
                  const isCurrent = Math.abs(Math.round(cursorTrailSize * 100) - tick) <= 10;
                  return (
                    <div key={tick} className="flex flex-col items-center gap-0.5">
                      <div className={`w-0.5 h-1.5 rounded-full ${isCurrent ? 'bg-cyan-400 h-2' : 'bg-white/20'}`} />
                      <span className={`text-[8.5px] font-mono ${isCurrent ? 'text-cyan-300 font-bold' : 'opacity-35'}`}>{tick}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Slider 3: Breathe Cycle */}
          <div className="space-y-2.5 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium opacity-75">呼吸周期</span>
              <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-md bg-white/10 text-cyan-300 font-semibold shadow-inner">
                {breatheCycle.toFixed(1)} s
              </span>
            </div>

            <div className="space-y-1.5">
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                value={breatheCycle}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeBreatheCycle(val);
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/20 accent-cyan-400 transition-all hover:bg-white/30 focus:outline-none"
              />
              <div className="flex justify-between px-1">
                {[0.5, 1.0, 1.5, 2.0, 2.5].map((tick) => {
                  const isCurrent = Math.abs(breatheCycle - tick) <= 0.2;
                  return (
                    <div key={tick} className="flex flex-col items-center gap-0.5">
                      <div className={`w-0.5 h-1.5 rounded-full ${isCurrent ? 'bg-cyan-400 h-2' : 'bg-white/20'}`} />
                      <span className={`text-[8.5px] font-mono ${isCurrent ? 'text-cyan-300 font-bold' : 'opacity-35'}`}>{tick}s</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
