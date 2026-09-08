import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { LiveCursorEngine, type StreamPresetId } from '../../plugins/live-cursor/LiveCursorEngine';
import type { Theme } from '../../core/themes/types';
import { Sliders, Pipette, Layers, Activity, Palette } from 'lucide-react';
import { useI18n } from '../../core/i18n';

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
  const { language } = useI18n();
  const isEn = language === 'en';

  const [text, setText] = useState<string>(() =>
    language === 'en'
      ? 'The quick brown fox jumps over the lazy dog.'
      : '这是一段正文测试文本+——+！'
  );

  const prevLangRef = useRef(language);
  useEffect(() => {
    if (prevLangRef.current !== language) {
      prevLangRef.current = language;
      setText(
        language === 'en'
          ? 'The quick brown fox jumps over the lazy dog.'
          : '这是一段正文测试文本+——+！'
      );
    }
  }, [language]);

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

  // 🌟 Unified Color Mode Calculation: 'theme' | 'solid' | 'stream'
  const isThemeMode = isAutoColor && (streamPreset === 'theme' || !streamPreset);
  const isSolidMode = !luminescence || streamPreset === 'mono';
  const activeColorMode: 'theme' | 'solid' | 'stream' = isThemeMode
    ? 'theme'
    : isSolidMode
    ? 'solid'
    : 'stream';

  useEffect(() => {
    configRef.current = {
      enabled: true,
      shape: cursorShape,
      color: cursorColor,
      themeColor: theme.colors.cursor || theme.colors.accent || '#a78bfa',
      themeStreamColors: theme.cursorStream || [theme.colors.cursor || theme.colors.accent || '#a78bfa', `${theme.colors.cursor || theme.colors.accent || '#a78bfa'}44`],
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

  const labels = useMemo(() => ({
    arena: isEn ? 'Cursor Test Arena' : '光标测试演练场',
    followTheme: isEn ? 'Follow Theme' : '跟随主题',
    classicSolid: isEn ? 'Classic Solid' : '经典单色',
    vibrantStream: isEn ? 'Dual-Color Stream' : '双色流光',
    beam: isEn ? 'Smooth Beam' : '平滑光柱',
    beamDesc: isEn ? 'Slim vertical line' : '细垂直光柱',
    block: isEn ? 'Minimal Block' : '极简色块',
    blockDesc: isEn ? 'Character block' : '字符方块',
    underline: isEn ? 'Underline' : '水平基准线',
    underlineDesc: isEn ? 'Baseline marker' : '底部横线',
    arenaPlaceholder: isEn ? 'Type text or press arrow keys to test cursor dynamics...' : '输入文字或按方向键测试光标跟随手感...',
    morphology: isEn ? 'Cursor Morphology' : '光标形态',
    colorStudio: isEn ? 'Cursor Color Studio' : '光标色彩工坊',
    themePreset: isEn ? 'Theme Preset' : '主题预设',
    themeDesc: isEn ? 'Cursor color tracks active theme automatically.' : '光标颜色跟随当前主题，换肤时自动同步。',
    themeStream: isEn ? 'Theme Stream' : '主题流光',
    selectSolid: isEn ? 'Select Solid Color:' : '选择单色：',
    solidMode: isEn ? 'Solid Mode' : '纯色模式',
    selectStream: isEn ? 'Select Stream Palette:' : '选择流光配色：',
    gradient: isEn ? 'Chroma Gradient' : '双色渐变',
    startColor: isEn ? 'Start Color' : '起始色',
    endColor: isEn ? 'End Color' : '结束色',
    dynamics: isEn ? 'Dynamics & Motion' : '动力学与手感',
    dynamicsModel: isEn ? 'Physics Simulation Model' : '动力学物理模型',
    fluid: isEn ? 'Fluid' : '流体',
    fluidDesc: isEn ? 'Smooth elasticity' : '平滑流体拉伸',
    ribbon: isEn ? 'Ribbon' : '丝带',
    ribbonDesc: isEn ? 'Multi-node trailing' : '多节点弧形摆动',
    quantum: isEn ? 'Snappy' : '敏捷',
    quantumDesc: isEn ? 'High damping snap' : '高阻尼快速落位',
    speedTuning: isEn ? 'Motion Responsiveness' : '移动手感调校',
    gentle: isEn ? 'Gentle' : '柔和',
    gentleDesc: isEn ? 'Soft tracking' : '平缓跟随',
    balanced: isEn ? 'Balanced' : '均衡',
    balancedDesc: isEn ? 'Natural flow' : '自然跟随',
    snappy: isEn ? 'Snappy' : '敏捷',
    snappyDesc: isEn ? 'Instant response' : '即时跟随',
    inlineSkew: isEn ? 'Inline Skew Shearing' : '行内倾角切变',
    inlineSkewDesc: isEn ? 'Skews forward while typing, rests vertical' : '打字时前倾，静止时回正',
    vfxAndBreathing: isEn ? 'Particle Sparks & Idle Breathing' : '按键微光与静态呼吸',
    vfxTitle: isEn ? 'Keypress Particle Sparks' : '按键微粒子效果',
    vfxNone: isEn ? 'None' : '无',
    vfxNoneDesc: isEn ? 'Disable particles' : '不开启粒子',
    vfxEmbers: isEn ? 'Embers' : '星火',
    vfxEmbersDesc: isEn ? 'Floating sparkles' : '击键产生微光点',
    vfxRipples: isEn ? 'Ripples' : '波纹',
    vfxRipplesDesc: isEn ? 'Subtle fluid rings' : '换行展开微水纹',
    vfxFeather: isEn ? 'Feather' : '轻芒',
    vfxFeatherDesc: isEn ? 'Soft breathing aura' : '散发呼吸微光',
    blinkTitle: isEn ? 'Idle Breathing & Blinking' : '静态呼吸与闪烁',
    blinkSmooth: isEn ? 'Smooth' : '柔和呼吸',
    blinkSmoothDesc: isEn ? 'Soft cyclic glow' : '缓慢明暗',
    blinkClassic: isEn ? 'Blink' : '传统闪烁',
    blinkClassicDesc: isEn ? 'Standard pulse' : '标准通断',
    blinkSolid: isEn ? 'Solid' : '常亮静止',
    blinkSolidDesc: isEn ? 'Steady static' : '持续稳定',
    slidersTitle: isEn ? 'Dynamics Parameter Tuning' : '动力学参数微调',
    animDuration: isEn ? 'Animation Duration' : '动画响应时长',
    trailLength: isEn ? 'Trail Stretch Length' : '拖尾延展长度',
    breatheCycle: isEn ? 'Idle Breathing Cycle' : '静态呼吸周期',
  }), [isEn]);

  const colorPresets = useMemo(() => [
    { name: isEn ? 'Aurora Violet' : '极光紫', value: '#a78bfa' },
    { name: isEn ? 'Neon Cyan' : '霓虹青', value: '#38bdf8' },
    { name: isEn ? 'Emerald' : '翡翠绿', value: '#34d399' },
    { name: isEn ? 'Radiant Gold' : '炽热金', value: '#f59e0b' },
    { name: isEn ? 'Sakura Pink' : '落樱粉', value: '#f472b6' },
    { name: isEn ? 'Pure White' : '纯净白', value: '#f8fafc' },
  ], [isEn]);

  const streamPresets: Array<{ id: StreamPresetId; name: string; colors: [string, string] }> = useMemo(() => [
    { id: 'theme', name: isEn ? 'Follow Theme' : '跟随主题', colors: theme.cursorStream || [theme.colors.accent || '#a78bfa', `${theme.colors.accent || '#a78bfa'}44`] },
    { id: 'cyan-violet', name: isEn ? 'Cyan & Violet' : '青紫双色', colors: ['#38bdf8', '#a78bfa'] },
    { id: 'ice-blue', name: isEn ? 'Ice Blue Glow' : '冰蓝微光', colors: ['#67e8f9', '#3b82f6'] },
    { id: 'emerald', name: isEn ? 'Emerald Luminescence' : '翡翠流荧', colors: ['#6ee7b7', '#059669'] },
    { id: 'amber-rose', name: isEn ? 'Amber Rose' : '赤金幻彩', colors: ['#fde047', '#f43f5e'] },
    { id: 'sakura', name: isEn ? 'Sakura Sparkle' : '落樱星辉', colors: ['#fbcfe8', '#db2777'] },
    { id: 'custom', name: isEn ? 'Custom' : '自定义', colors: [streamHeadColor, streamTailColor] },
  ], [isEn, theme, streamHeadColor, streamTailColor]);

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
  }, [updateCaret]);

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

  // Color Mode Handlers
  const handleSelectThemeMode = () => {
    onChangeCursorColor('auto');
    onChangeLuminescence?.(true);
    onChangeStreamPreset?.('theme');
  };

  const handleSelectSolidMode = () => {
    onChangeLuminescence?.(false);
    onChangeStreamPreset?.('mono');
    if (cursorColor === 'auto' || !cursorColor) {
      onChangeCursorColor(theme.colors.cursor || theme.colors.accent || '#38bdf8');
    }
  };

  const handleSelectStreamMode = () => {
    onChangeLuminescence?.(true);
    onChangeCursorColor('auto');
    if (streamPreset === 'theme' || streamPreset === 'mono' || !streamPreset) {
      onChangeStreamPreset?.('cyan-violet');
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Hidden DOM measurement mirrors */}
      <span
        ref={mirrorRef}
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          visibility: 'hidden',
          whiteSpace: 'pre',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '14px',
          lineHeight: '22px',
          pointerEvents: 'none',
        }}
      />
      <span
        ref={charMirrorRef}
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          visibility: 'hidden',
          whiteSpace: 'pre',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '14px',
          lineHeight: '22px',
          pointerEvents: 'none',
        }}
      />

      {/* 🌟 1. 光标实时测试演练场 (Live Interactive Arena) */}
      <div
        className="space-y-3 rounded-2xl border p-4.5 shadow-sm transition-colors"
        style={{
          backgroundColor: `${theme.colors.bgHover}25`,
          borderColor: `${theme.colors.border}70`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium text-xs opacity-90" style={{ color: theme.colors.text }}>
            <Sliders className="h-3.5 w-3.5 opacity-70" />
            <span>{labels.arena}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[10.5px] px-2.5 py-0.5 rounded-full border transition-all"
              style={{
                color: effectiveColor,
                borderColor: `${effectiveColor}40`,
                backgroundColor: `${effectiveColor}12`,
              }}
            >
              {activeColorMode === 'theme'
                ? `${labels.followTheme} · ${isEn ? theme.name : theme.nameZh}`
                : activeColorMode === 'solid'
                ? labels.classicSolid
                : labels.vibrantStream}
            </span>
            <span
              className="font-mono text-[10.5px] px-2.5 py-0.5 rounded-full border border-white/10 opacity-75"
              style={{ color: theme.colors.text }}
            >
              {cursorShape === 'block' ? labels.block : cursorShape === 'underline' ? labels.underline : labels.beam}
            </span>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-xl border shadow-inner transition-colors"
          style={{
            backgroundColor: theme.colors.editorBg || theme.colors.bg,
            borderColor: theme.colors.border,
          }}
        >
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
            placeholder={labels.arenaPlaceholder}
            className="w-full resize-none rounded-xl py-3 px-3.5 text-sm leading-[22px] min-h-[68px] outline-none font-mono transition-colors block"
            style={{
              backgroundColor: 'transparent',
              color: theme.colors.editorText || theme.colors.text,
              caretColor: 'transparent',
            }}
          />
        </div>
      </div>

      {/* 🌟 2. 卡片一：光标形态 (Morphology) */}
      <div
        className="space-y-4 p-4 rounded-2xl border transition-colors"
        style={{
          backgroundColor: `${theme.colors.bgSecondary}50`,
          borderColor: `${theme.colors.border}60`,
        }}
      >
        <div className="flex items-center gap-2 font-medium text-xs opacity-90" style={{ color: theme.colors.text }}>
          <Layers className="h-3.5 w-3.5 opacity-75" style={{ color: theme.colors.accent }} />
          <span>{labels.morphology}</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            { id: 'beam', name: labels.beam, desc: labels.beamDesc },
            { id: 'block', name: labels.block, desc: labels.blockDesc },
            { id: 'underline', name: labels.underline, desc: labels.underlineDesc },
          ].map((s) => {
            const isCur = cursorShape === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSelectCursorShape?.(s.id as any)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isCur ? 'font-medium shadow-xs' : 'opacity-75 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isCur ? `${theme.colors.accent}15` : theme.colors.bg,
                  borderColor: isCur ? theme.colors.accent : theme.colors.border,
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

      {/* 🌟 3. 卡片二：光标色彩工坊 (Unified Cursor Color Studio) */}
      <div
        className="space-y-4 p-4 rounded-2xl border transition-colors"
        style={{
          backgroundColor: `${theme.colors.bgSecondary}50`,
          borderColor: `${theme.colors.border}60`,
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-medium text-xs opacity-90" style={{ color: theme.colors.text }}>
            <Palette className="h-3.5 w-3.5" style={{ color: theme.colors.accent }} />
            <span>{labels.colorStudio}</span>
          </div>

          {/* 3-Mode Segmented Control */}
          <div className="flex items-center p-0.5 rounded-xl border" style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }}>
            <button
              onClick={handleSelectThemeMode}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeColorMode === 'theme' ? 'font-semibold shadow-xs' : 'opacity-65 hover:opacity-100'
              }`}
              style={{
                backgroundColor: activeColorMode === 'theme' ? `${theme.colors.accent}20` : 'transparent',
                color: activeColorMode === 'theme' ? theme.colors.accent : theme.colors.textMuted,
                border: activeColorMode === 'theme' ? `1px solid ${theme.colors.accent}40` : '1px solid transparent',
              }}
            >
              {labels.followTheme}
            </button>
            <button
              onClick={handleSelectSolidMode}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeColorMode === 'solid' ? 'font-semibold shadow-xs' : 'opacity-65 hover:opacity-100'
              }`}
              style={{
                backgroundColor: activeColorMode === 'solid' ? `${theme.colors.accent}20` : 'transparent',
                color: activeColorMode === 'solid' ? theme.colors.accent : theme.colors.textMuted,
                border: activeColorMode === 'solid' ? `1px solid ${theme.colors.accent}40` : '1px solid transparent',
              }}
            >
              {labels.classicSolid}
            </button>
            <button
              onClick={handleSelectStreamMode}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeColorMode === 'stream' ? 'font-semibold shadow-xs' : 'opacity-65 hover:opacity-100'
              }`}
              style={{
                backgroundColor: activeColorMode === 'stream' ? `${theme.colors.accent}20` : 'transparent',
                color: activeColorMode === 'stream' ? theme.colors.accent : theme.colors.textMuted,
                border: activeColorMode === 'stream' ? `1px solid ${theme.colors.accent}40` : '1px solid transparent',
              }}
            >
              {labels.vibrantStream}
            </button>
          </div>
        </div>

        {/* 3.1 MODE: 跟随主题 (Follow Theme with Preconfigured Stream) */}
        {activeColorMode === 'theme' && (
          <div
            className="p-4 rounded-xl border flex items-center justify-between gap-4 transition-all"
            style={{
              borderColor: `${theme.colors.accent}40`,
              backgroundColor: `${theme.colors.accent}08`,
            }}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                  {isEn ? theme.name : theme.nameZh}
                </span>
                <span className="text-[10px] font-mono opacity-50">({theme.name})</span>
                <span
                  className="text-[9.5px] px-2 py-0.2 rounded-full font-mono font-medium"
                  style={{
                    backgroundColor: `${theme.colors.accent}18`,
                    color: theme.colors.accent,
                    border: `1px solid ${theme.colors.accent}40`,
                  }}
                >
                  {labels.themePreset}
                </span>
              </div>
              <p className="text-[11px] opacity-65 leading-relaxed" style={{ color: theme.colors.textMuted }}>
                {labels.themeDesc}
              </p>
            </div>

            {/* Theme Stream Preview */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-black/20 border border-white/10 shadow-xs">
                <span
                  className="h-3.5 w-6 rounded-md shadow-xs"
                  style={{ backgroundColor: (theme.cursorStream || [theme.colors.accent, ''])[0] }}
                />
                <span className="text-[9.5px] font-mono opacity-40">→</span>
                <span
                  className="h-3.5 w-6 rounded-md shadow-xs"
                  style={{ backgroundColor: (theme.cursorStream || ['', theme.colors.accent])[1] }}
                />
              </div>
              <span className="text-[9.5px] font-mono opacity-50">{labels.themeStream}</span>
            </div>
          </div>
        )}

        {/* 3.2 MODE: 经典纯色 (Solid Pure Color) */}
        {activeColorMode === 'solid' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] opacity-75" style={{ color: theme.colors.text }}>
                {labels.selectSolid}
              </span>
              <span className="text-[10px] font-mono opacity-50">{labels.solidMode}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {colorPresets.map((c) => {
                const isCur = cursorColor.toLowerCase() === c.value.toLowerCase();
                return (
                  <button
                    key={c.value}
                    onClick={() => {
                      onChangeCursorColor(c.value);
                      onChangeLuminescence?.(false);
                      onChangeStreamPreset?.('mono');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      isCur ? 'font-medium shadow-xs bg-white/[0.08]' : 'hover:border-white/30 opacity-75'
                    }`}
                    style={{
                      borderColor: isCur ? c.value : theme.colors.border,
                      boxShadow: isCur ? `0 0 0 1.5px ${c.value}` : undefined,
                    }}
                  >
                    <span className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-xs shrink-0" style={{ backgroundColor: c.value }} />
                    <span className="text-[11px]" style={{ color: theme.colors.text }}>{c.name}</span>
                  </button>
                );
              })}

              {/* Custom Pipette Color */}
              <label
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border cursor-pointer hover:border-white/25 transition-all"
                style={{
                  borderColor: theme.colors.border,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                }}
              >
                <Pipette className="h-3 w-3 opacity-60" style={{ color: theme.colors.text }} />
                <div className="relative flex items-center gap-1">
                  <span className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-xs shrink-0" style={{ backgroundColor: effectiveColor }} />
                  <input
                    type="color"
                    value={effectiveColor}
                    onChange={(e) => {
                      onChangeCursorColor(e.target.value);
                      onChangeLuminescence?.(false);
                      onChangeStreamPreset?.('mono');
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <span className="font-mono text-[10.5px] opacity-70" style={{ color: theme.colors.text }}>{effectiveColor}</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* 3.3 MODE: 幻彩流光 (Dual-Color Chroma Stream) */}
        {activeColorMode === 'stream' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] opacity-75" style={{ color: theme.colors.text }}>
                {labels.selectStream}
              </span>
              <span className="text-[10px] font-mono opacity-50">{labels.gradient}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {streamPresets
                .filter((sp) => sp.id !== 'theme')
                .map((sp) => {
                  const isCur = streamPreset === sp.id;
                  return (
                    <button
                      key={sp.id}
                      onClick={() => {
                        onChangeStreamPreset?.(sp.id);
                        onChangeLuminescence?.(true);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                        isCur ? 'font-medium shadow-xs bg-white/[0.08]' : 'hover:border-white/20 opacity-75 hover:opacity-100'
                      }`}
                      style={{
                        borderColor: isCur ? theme.colors.accent : theme.colors.border,
                        boxShadow: isCur ? `0 0 0 1.5px ${theme.colors.accent}` : undefined,
                      }}
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
              <div className="flex items-center gap-3 pt-2 px-1">
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] cursor-pointer hover:border-white/25 transition-all">
                  <span className="text-[10.5px] opacity-75">{labels.startColor}</span>
                  <div className="relative flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: streamHeadColor }} />
                    <input
                      type="color"
                      value={streamHeadColor}
                      onChange={(e) => onChangeStreamHeadColor?.(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span className="font-mono text-[10px] font-medium" style={{ color: theme.colors.accent }}>{streamHeadColor}</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] cursor-pointer hover:border-white/25 transition-all">
                  <span className="text-[10.5px] opacity-75">{labels.endColor}</span>
                  <div className="relative flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: streamTailColor }} />
                    <input
                      type="color"
                      value={streamTailColor}
                      onChange={(e) => onChangeStreamTailColor?.(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span className="font-mono text-[10px] font-medium" style={{ color: theme.colors.accent }}>{streamTailColor}</span>
                  </div>
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🌟 4. 卡片三：动力学与手感 (Dynamics & Motion) */}
      <div
        className="space-y-4 p-4 rounded-2xl border transition-colors"
        style={{
          backgroundColor: `${theme.colors.bgSecondary}50`,
          borderColor: `${theme.colors.border}60`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium text-xs opacity-90" style={{ color: theme.colors.text }}>
            <Activity className="h-3.5 w-3.5 opacity-75" style={{ color: theme.colors.accent }} />
            <span>{labels.dynamics}</span>
          </div>
          <span className="text-[10px] font-mono opacity-40">Alt+P</span>
        </div>

        {/* 动力学模式 */}
        <div className="space-y-2">
          <label className="block text-[11px] opacity-75" style={{ color: theme.colors.text }}>
            {labels.dynamicsModel}
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'fluid', name: labels.fluid, desc: labels.fluidDesc },
              { id: 'ribbon', name: labels.ribbon, desc: labels.ribbonDesc },
              { id: 'quantum', name: labels.quantum, desc: labels.quantumDesc },
            ].map((pm) => {
              const isCur = physicsMode === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => onChangePhysicsMode?.(pm.id as any)}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isCur ? 'font-medium shadow-xs' : 'border-white/10 hover:border-white/20 opacity-70'
                  }`}
                  style={{
                    backgroundColor: isCur ? `${theme.colors.accent}15` : theme.colors.bg,
                    borderColor: isCur ? theme.colors.accent : theme.colors.border,
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

        {/* 移动手感调校 */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <label className="block text-[11px] opacity-75" style={{ color: theme.colors.text }}>
            {labels.speedTuning}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'gentle', name: labels.gentle, desc: labels.gentleDesc },
              { id: 'balanced', name: labels.balanced, desc: labels.balancedDesc },
              { id: 'snappy', name: labels.snappy, desc: labels.snappyDesc },
            ].map((sm) => {
              const isCur = speedMode === sm.id;
              return (
                <button
                  key={sm.id}
                  onClick={() => onChangeSpeedMode(sm.id as any)}
                  className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    isCur ? 'font-medium shadow-xs' : 'border-white/10 hover:border-white/20 opacity-70'
                  }`}
                  style={{
                    backgroundColor: isCur ? `${theme.colors.accent}15` : theme.colors.bg,
                    borderColor: isCur ? theme.colors.accent : theme.colors.border,
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

        {/* 行内倾角切变开关 */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
          <div>
            <div className="text-xs font-medium" style={{ color: theme.colors.text }}>
              {labels.inlineSkew}
            </div>
            <div className="text-[10px] opacity-50">{labels.inlineSkewDesc}</div>
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
      </div>

      {/* 🌟 5. 卡片四：按键微光与静态呼吸 (VFX & Breathing) */}
      <div
        className="space-y-4 p-4 rounded-2xl border transition-colors"
        style={{
          backgroundColor: `${theme.colors.bgSecondary}50`,
          borderColor: `${theme.colors.border}60`,
        }}
      >
        <div className="font-medium text-xs opacity-90" style={{ color: theme.colors.text }}>
          <span>{labels.vfxAndBreathing}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-2">
            <label className="block text-[11px] opacity-75" style={{ color: theme.colors.text }}>
              {labels.vfxTitle}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'pure', name: labels.vfxNone, desc: labels.vfxNoneDesc },
                { id: 'embers', name: labels.vfxEmbers, desc: labels.vfxEmbersDesc },
                { id: 'ripples', name: labels.vfxRipples, desc: labels.vfxRipplesDesc },
                { id: 'feather', name: labels.vfxFeather, desc: labels.vfxFeatherDesc },
              ].map((vfx) => {
                const isCur = vfxMode === vfx.id;
                return (
                  <button
                    key={vfx.id}
                    onClick={() => onChangeVfxMode(vfx.id as any)}
                    className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isCur ? 'font-medium shadow-xs' : 'border-white/10 hover:border-white/20 opacity-70'
                    }`}
                    style={{
                      backgroundColor: isCur ? `${theme.colors.accent}15` : theme.colors.bg,
                      borderColor: isCur ? theme.colors.accent : theme.colors.border,
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
              {labels.blinkTitle}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'smooth', name: labels.blinkSmooth, desc: labels.blinkSmoothDesc },
                { id: 'blink', name: labels.blinkClassic, desc: labels.blinkClassicDesc },
                { id: 'solid', name: labels.blinkSolid, desc: labels.blinkSolidDesc },
              ].map((bm) => {
                const isCur = blinkMode === bm.id;
                return (
                  <button
                    key={bm.id}
                    onClick={() => onChangeBlinkMode(bm.id as any)}
                    className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isCur ? 'font-medium shadow-xs' : 'border-white/10 hover:border-white/20 opacity-70'
                    }`}
                    style={{
                      backgroundColor: isCur ? `${theme.colors.accent}15` : theme.colors.bg,
                      borderColor: isCur ? theme.colors.accent : theme.colors.border,
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

      {/* 🌟 6. 卡片五：参数微调 (Sliders) */}
      <div
        className="space-y-3 p-4 rounded-2xl border transition-colors"
        style={{
          backgroundColor: `${theme.colors.bgSecondary}50`,
          borderColor: `${theme.colors.border}60`,
        }}
      >
        <div className="flex items-center gap-2 font-medium text-xs opacity-90" style={{ color: theme.colors.text }}>
          <Sliders className="h-3.5 w-3.5 opacity-75" style={{ color: theme.colors.accent }} />
          <span>{labels.slidersTitle}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          {/* Slider 1: Response Time */}
          <div className="space-y-2.5 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium opacity-75">{labels.animDuration}</span>
              <span
                className="font-mono text-[10.5px] px-2 py-0.5 rounded-md font-semibold shadow-inner"
                style={{ backgroundColor: `${theme.colors.accent}18`, color: theme.colors.accent }}
              >
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
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/20 transition-all hover:bg-white/30 focus:outline-none"
                style={{ accentColor: theme.colors.accent }}
              />
              <div className="flex justify-between px-1">
                {[30, 80, 140, 200, 250].map((tick) => {
                  const isCurrent = Math.abs(Math.round(cursorAnimationLength * 1000) - tick) <= 15;
                  return (
                    <div key={tick} className="flex flex-col items-center gap-0.5">
                      <div
                        className={`w-0.5 h-1.5 rounded-full ${isCurrent ? 'h-2' : 'bg-white/20'}`}
                        style={{ backgroundColor: isCurrent ? theme.colors.accent : undefined }}
                      />
                      <span
                        className={`text-[8.5px] font-mono ${isCurrent ? 'font-bold' : 'opacity-35'}`}
                        style={{ color: isCurrent ? theme.colors.accent : undefined }}
                      >
                        {tick}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Slider 2: Trail Stretch */}
          <div className="space-y-2.5 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium opacity-75">{labels.trailLength}</span>
              <span
                className="font-mono text-[10.5px] px-2 py-0.5 rounded-md font-semibold shadow-inner"
                style={{ backgroundColor: `${theme.colors.accent}18`, color: theme.colors.accent }}
              >
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
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/20 transition-all hover:bg-white/30 focus:outline-none"
                style={{ accentColor: theme.colors.accent }}
              />
              <div className="flex justify-between px-1">
                {[20, 40, 60, 80, 100].map((tick) => {
                  const isCurrent = Math.abs(Math.round(cursorTrailSize * 100) - tick) <= 10;
                  return (
                    <div key={tick} className="flex flex-col items-center gap-0.5">
                      <div
                        className={`w-0.5 h-1.5 rounded-full ${isCurrent ? 'h-2' : 'bg-white/20'}`}
                        style={{ backgroundColor: isCurrent ? theme.colors.accent : undefined }}
                      />
                      <span
                        className={`text-[8.5px] font-mono ${isCurrent ? 'font-bold' : 'opacity-35'}`}
                        style={{ color: isCurrent ? theme.colors.accent : undefined }}
                      >
                        {tick}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Slider 3: Breathe Cycle */}
          <div className="space-y-2.5 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium opacity-75">{labels.breatheCycle}</span>
              <span
                className="font-mono text-[10.5px] px-2 py-0.5 rounded-md font-semibold shadow-inner"
                style={{ backgroundColor: `${theme.colors.accent}18`, color: theme.colors.accent }}
              >
                {breatheCycle.toFixed(1)} s
              </span>
            </div>

            <div className="space-y-1.5">
              <input
                type="range"
                min="0.6"
                max="3.0"
                step="0.2"
                value={breatheCycle}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onChangeBreatheCycle(val);
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/20 transition-all hover:bg-white/30 focus:outline-none"
                style={{ accentColor: theme.colors.accent }}
              />
              <div className="flex justify-between px-1">
                {[0.6, 1.2, 1.8, 2.4, 3.0].map((tick) => {
                  const isCurrent = Math.abs(breatheCycle - tick) <= 0.2;
                  return (
                    <div key={tick} className="flex flex-col items-center gap-0.5">
                      <div
                        className={`w-0.5 h-1.5 rounded-full ${isCurrent ? 'h-2' : 'bg-white/20'}`}
                        style={{ backgroundColor: isCurrent ? theme.colors.accent : undefined }}
                      />
                      <span
                        className={`text-[8.5px] font-mono ${isCurrent ? 'font-bold' : 'opacity-35'}`}
                        style={{ color: isCurrent ? theme.colors.accent : undefined }}
                      >
                        {tick}s
                      </span>
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
