import React, { useState, useRef } from 'react';
import { X, Sparkles, Palette, Type, Puzzle, RotateCcw, Image, Check, SlidersHorizontal, Layers, Upload, Crop, Trash2, Image as ImageIcon } from 'lucide-react';
import type { Theme } from '../../core/themes/types';
import { THEMES } from '../../core/themes/themeDefinitions';
import { pluginManager } from '../../core/plugins/PluginManager';
import { LiveCursorTestArena } from './LiveCursorTestArena';
import { ImageCropModal, type CropParams } from './ImageCropModal';
import type { BackgroundEffect } from '../editor/EditorBackground';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  onSelectTheme: (themeId: string) => void;
  cursorShape: 'beam' | 'block' | 'underline';
  onSelectCursorShape: (shape: 'beam' | 'block' | 'underline') => void;
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
  physicsMode: 'fluid' | 'ribbon' | 'quantum';
  onChangePhysicsMode: (mode: 'fluid' | 'ribbon' | 'quantum') => void;
  luminescence: boolean;
  onChangeLuminescence: (val: boolean) => void;
  inlineSkew?: boolean;
  onChangeInlineSkew?: (val: boolean) => void;
  streamPreset: 'theme' | 'cyan-violet' | 'ice-blue' | 'emerald' | 'amber-rose' | 'sakura' | 'mono' | 'custom';
  onChangeStreamPreset: (preset: 'theme' | 'cyan-violet' | 'ice-blue' | 'emerald' | 'amber-rose' | 'sakura' | 'mono' | 'custom') => void;
  streamHeadColor: string;
  onChangeStreamHeadColor: (color: string) => void;
  streamTailColor: string;
  onChangeStreamTailColor: (color: string) => void;
  backgroundEffect: BackgroundEffect;
  onChangeBackgroundEffect: (effect: BackgroundEffect) => void;
  backgroundIntensity: number;
  onChangeBackgroundIntensity: (intensity: number) => void;
  customImage?: string | null;
  onChangeCustomImage: (img: string | null) => void;
  customImageRaw?: string | null;
  onChangeCustomImageRaw?: (raw: string | null) => void;
  cropParams?: CropParams | null;
  onChangeCropParams?: (params: CropParams | null) => void;
  customImageBlur?: number;
  onChangeCustomImageBlur: (blur: number) => void;
  customImageDim?: number;
  onChangeCustomImageDim: (dim: number) => void;
  fontPreset: 'lxgw' | 'songti' | 'sans' | 'mono' | 'custom';
  onSelectFontPreset: (preset: 'lxgw' | 'songti' | 'sans' | 'mono' | 'custom') => void;
  customFontName: string;
  onChangeCustomFontName: (name: string) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  lineHeight: number;
  onChangeLineHeight: (height: number) => void;
  contentMaxWidth: number;
  onChangeContentMaxWidth: (width: number) => void;
  horizontalPadding: number;
  onChangeHorizontalPadding: (padding: number) => void;
  paragraphSpacing: number;
  onChangeParagraphSpacing: (spacing: number) => void;
  indentEnabled: boolean;
  onToggleIndent: () => void;
  spotlightMode: 'none' | 'paragraph';
  onSelectSpotlightMode: (mode: 'none' | 'paragraph') => void;
  zeroChrome: boolean;
  onToggleZeroChrome: () => void;
}

export const SettingsDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  theme,
  onSelectTheme,
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
  physicsMode,
  onChangePhysicsMode,
  luminescence,
  onChangeLuminescence,
  inlineSkew,
  onChangeInlineSkew,
  streamPreset,
  onChangeStreamPreset,
  streamHeadColor,
  onChangeStreamHeadColor,
  streamTailColor,
  onChangeStreamTailColor,
  backgroundEffect,
  onChangeBackgroundEffect,
  backgroundIntensity,
  onChangeBackgroundIntensity,
  customImage,
  onChangeCustomImage,
  customImageRaw,
  onChangeCustomImageRaw,
  cropParams,
  onChangeCropParams,
  customImageBlur = 6,
  onChangeCustomImageBlur,
  customImageDim = 0.45,
  onChangeCustomImageDim,
  fontPreset,
  onSelectFontPreset,
  customFontName,
  onChangeCustomFontName,
  fontSize,
  onChangeFontSize,
  lineHeight,
  onChangeLineHeight,
  contentMaxWidth,
  onChangeContentMaxWidth,
  horizontalPadding,
  onChangeHorizontalPadding,
  paragraphSpacing,
  onChangeParagraphSpacing,
  indentEnabled,
  onToggleIndent,
  spotlightMode,
  onSelectSpotlightMode,
  zeroChrome,
  onToggleZeroChrome,
}) => {
  const [activeTab, setActiveTab] = useState<'cursor' | 'background' | 'typography' | 'themes' | 'plugins'>('cursor');
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState<boolean>(false);
  const [pendingCropImage, setPendingCropImage] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      // Pre-scale raw image safely if overly large (>2560px) to conserve local storage
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 2560;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const optimizedRaw = canvas.toDataURL('image/jpeg', 0.88);
          setPendingCropImage(optimizedRaw);
          onChangeCustomImageRaw?.(optimizedRaw);
        } else {
          setPendingCropImage(src);
          onChangeCustomImageRaw?.(src);
        }
        setCropModalOpen(true);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTriggerCropExisting = () => {
    const source = customImageRaw || customImage;
    if (source) {
      setPendingCropImage(source);
      setCropModalOpen(true);
    }
  };

  const handleClearCustomImage = () => {
    onChangeCustomImage(null);
    onChangeCustomImageRaw?.(null);
    onChangeCropParams?.(null);
    if (backgroundEffect === 'custom') {
      onChangeBackgroundEffect('aurora');
    }
  };

  React.useEffect(() => {
    let enterTimer: ReturnType<typeof setTimeout>;
    let exitTimer: ReturnType<typeof setTimeout>;

    if (isOpen) {
      enterTimer = setTimeout(() => {
        setShouldRender(true);
        setIsAnimatingIn(true);
      }, 0);
    } else {
      enterTimer = setTimeout(() => {
        setIsAnimatingIn(false);
      }, 0);
      exitTimer = setTimeout(() => {
        setShouldRender(false);
      }, 240);
    }

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  const handleResetCursor = () => {
    onSelectCursorShape('beam');
    onChangeCursorColor('auto');
    onChangeAnimationLength(0.08);
    onChangeTrailSize(0.75);
    onChangeVfxMode('pure');
    onChangeBlinkMode('smooth');
    onChangeBreatheCycle(1.2);
    onChangeSpeedMode('gentle');
    onChangePhysicsMode('fluid');
    onChangeLuminescence(true);
    onChangeStreamPreset('cyan-violet');
  };

  const handleResetTypography = () => {
    onSelectFontPreset('lxgw');
    onChangeCustomFontName('');
    onChangeFontSize(18);
    onChangeLineHeight(1.95);
    onChangeContentMaxWidth(780);
    onChangeHorizontalPadding(32);
    onChangeParagraphSpacing(0.7);
  };

  const handleResetBackground = () => {
    onChangeBackgroundEffect('aurora');
    onChangeBackgroundIntensity(0.65);
  };

  const tabMeta: Record<string, { title: string; desc: string; onReset?: () => void }> = {
    cursor: {
      title: 'Live 光标',
      desc: '光标形状、平滑跟随、拖尾与动画速度调节',
      onReset: handleResetCursor,
    },
    background: {
      title: '背景与壁纸',
      desc: '自定义背景图片、暗化遮罩、模糊度与预设效果',
      onReset: handleResetBackground,
    },
    typography: {
      title: '排版与字体',
      desc: '字体选择、版心宽度、字号行距与段落聚焦',
      onReset: handleResetTypography,
    },
    themes: {
      title: '主题配色',
      desc: '界面与文字色彩方案',
    },
    plugins: {
      title: '插件管理',
      desc: '按需启用或禁用功能插件',
    },
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center select-none p-4 sm:p-6 transition-all duration-200 ease-out ${
        isAnimatingIn
          ? 'bg-black/80 backdrop-blur-xl opacity-100'
          : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div
        className={`flex h-[86vh] w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isAnimatingIn
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        }`}
        style={{
          backgroundColor: theme.colors.bgSecondary,
          borderColor: `${theme.colors.border}cc`,
          boxShadow: `0 30px 80px -15px rgba(0, 0, 0, 0.85), 0 0 50px ${theme.colors.accentGlow}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 🌟 Left Master Navigation Sidebar */}
        <div
          className="w-56 sm:w-64 border-r flex flex-col justify-between p-4 bg-black/25 shrink-0"
          style={{ borderColor: `${theme.colors.border}70` }}
        >
          <div className="space-y-4">
            {/* Logo / Header */}
            <div className="flex items-center gap-2.5 px-3 py-2">
              <div
                className="h-7 w-7 rounded-xl flex items-center justify-center shadow-md"
                style={{ backgroundColor: theme.colors.accent, color: theme.colors.bg }}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold tracking-tight" style={{ color: theme.colors.text }}>
                  Novelite 设置
                </h2>
                <span className="text-[10px] opacity-40 font-mono">Preferences Hub</span>
              </div>
            </div>

            {/* Navigation Tab Pills */}
            <nav className="space-y-1">
              {[
                { id: 'cursor', label: '灵感光标', icon: Sparkles, badge: 'GPU' },
                { id: 'background', label: '背景艺术', icon: Image },
                { id: 'typography', label: '版心排版', icon: Type },
                { id: 'themes', label: '主题外观', icon: Palette, badge: '8套' },
                { id: 'plugins', label: '扩展插件', icon: Puzzle },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'shadow-md font-semibold scale-[1.02]'
                        : 'opacity-65 hover:opacity-100 hover:bg-white/5'
                    }`}
                    style={{
                      backgroundColor: isActive ? theme.colors.bgHover : 'transparent',
                      color: isActive ? theme.colors.accent : theme.colors.text,
                      boxShadow: isActive ? `inset 0 0 0 1px ${theme.colors.accent}30` : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'opacity-100' : 'opacity-60'}`} />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: isActive ? `${theme.colors.accent}20` : 'rgba(255,255,255,0.06)',
                          color: isActive ? theme.colors.accent : theme.colors.textMuted,
                        }}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Footer Shortcuts Info */}
          <div className="px-3 py-2 border-t border-white/5 space-y-1 text-[10px] font-mono opacity-40">
            <div className="flex justify-between">
              <span>关闭面板</span>
              <kbd className="px-1 py-0.2 rounded bg-white/10">Esc</kbd>
            </div>
            <div className="flex justify-between">
              <span>命令中心</span>
              <kbd className="px-1 py-0.2 rounded bg-white/10">Ctrl+P</kbd>
            </div>
          </div>
        </div>

        {/* 🌟 Right Detail Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-7 py-4 bg-black/10 shrink-0"
            style={{ borderColor: `${theme.colors.border}60` }}
          >
            <div>
              <h3 className="text-sm font-semibold tracking-tight" style={{ color: theme.colors.text }}>
                {tabMeta[activeTab].title}
              </h3>
              <p className="text-[11px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                {tabMeta[activeTab].desc}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {tabMeta[activeTab].onReset && (
                <button
                  onClick={tabMeta[activeTab].onReset}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition-all font-mono"
                  style={{ color: theme.colors.accent }}
                  title="恢复当前标签页默认配置"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>恢复默认</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-xl p-1.5 opacity-60 hover:opacity-100 hover:bg-white/10 transition-all"
                style={{ color: theme.colors.text }}
                title="关闭设置 (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-7 space-y-6 text-xs">
            {/* TAB 1: CURSOR */}
            {activeTab === 'cursor' && (
              <LiveCursorTestArena
                theme={theme}
                cursorShape={cursorShape}
                onSelectCursorShape={onSelectCursorShape}
                cursorColor={cursorColor}
                onChangeCursorColor={onChangeCursorColor}
                cursorAnimationLength={cursorAnimationLength}
                onChangeAnimationLength={onChangeAnimationLength}
                cursorTrailSize={cursorTrailSize}
                onChangeTrailSize={onChangeTrailSize}
                vfxMode={vfxMode}
                onChangeVfxMode={onChangeVfxMode}
                blinkMode={blinkMode}
                onChangeBlinkMode={onChangeBlinkMode}
                breatheCycle={breatheCycle}
                onChangeBreatheCycle={onChangeBreatheCycle}
                speedMode={speedMode}
                onChangeSpeedMode={onChangeSpeedMode}
                physicsMode={physicsMode}
                onChangePhysicsMode={onChangePhysicsMode}
                luminescence={luminescence}
                onChangeLuminescence={onChangeLuminescence}
                inlineSkew={inlineSkew}
                onChangeInlineSkew={onChangeInlineSkew}
                streamPreset={streamPreset}
                onChangeStreamPreset={onChangeStreamPreset}
                streamHeadColor={streamHeadColor}
                onChangeStreamHeadColor={onChangeStreamHeadColor}
                streamTailColor={streamTailColor}
                onChangeStreamTailColor={onChangeStreamTailColor}
              />
            )}

            {/* TAB 2: BACKGROUND */}
            {activeTab === 'background' && (
              <div className="space-y-6">
                {/* 🌟 1. 自定义壁纸工坊 (Custom Wallpaper Studio) */}
                <div
                  className="rounded-3xl border p-5 space-y-4 transition-all"
                  style={{
                    borderColor: backgroundEffect === 'custom' ? theme.colors.accent : theme.colors.border,
                    backgroundColor: `${theme.colors.bgSecondary}80`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${theme.colors.accent}20`, color: theme.colors.accent }}
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                          自定义背景图片
                        </span>
                        <span className="text-[10px] opacity-40 ml-2 font-mono">
                          {customImage ? '已设置自定义背景' : '支持上传并裁剪本地图片'}
                        </span>
                      </div>
                    </div>

                    {customImage && (
                      <div className="flex items-center gap-2">
                        {backgroundEffect !== 'custom' ? (
                          <button
                            onClick={() => onChangeBackgroundEffect('custom')}
                            className="px-2.5 py-1 rounded-lg text-xs font-mono border border-cyan-400/40 text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20 transition-all"
                          >
                            应用背景
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-400/15 border border-cyan-400/30 px-2 py-0.5 rounded-full font-semibold">
                            <Check className="h-3 w-3" />
                            <span>生效中</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {/* Custom Image Preview & Action Card */}
                  {customImage ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl border border-white/10 bg-black/25">
                      {/* Mini Live Preview Thumbnail */}
                      <div className="relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-md">
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                          style={{
                            backgroundImage: `url("${customImage}")`,
                            filter: `blur(${customImageBlur}px)`,
                            opacity: backgroundIntensity,
                          }}
                        />
                        <div
                          className="absolute inset-0 transition-colors"
                          style={{
                            backgroundColor: theme.isDark
                              ? `rgba(0, 0, 0, ${customImageDim})`
                              : `rgba(255, 255, 255, ${customImageDim * 0.7})`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/90 drop-shadow">
                          <span>效果预览</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex-1 flex flex-wrap sm:flex-col gap-2 w-full">
                        <button
                          onClick={handleTriggerCropExisting}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono transition-all"
                          style={{ color: theme.colors.text }}
                        >
                          <Crop className="h-3.5 w-3.5 text-cyan-400" />
                          <span>调整位置与裁剪</span>
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono transition-all"
                          style={{ color: theme.colors.text }}
                        >
                          <Upload className="h-3.5 w-3.5 opacity-60" />
                          <span>更换图片</span>
                        </button>
                        <button
                          onClick={handleClearCustomImage}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/15 text-xs font-mono transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>移除背景</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Empty Upload Dropzone */
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-white/15 hover:border-cyan-400/60 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group cursor-pointer"
                    >
                      <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="h-5 w-5 opacity-60 group-hover:text-cyan-400 group-hover:opacity-100 transition-colors" />
                      </div>
                      <span className="font-semibold text-xs group-hover:text-cyan-400 transition-colors" style={{ color: theme.colors.text }}>
                        选择或上传本地图片
                      </span>
                      <span className="text-[10px] font-mono opacity-40">
                        支持 PNG、JPG、WebP 格式
                      </span>
                    </button>
                  )}

                  {/* Wallpaper Fine-Tuning Sliders */}
                  {customImage && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                      {/* Dimming Mask */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-medium opacity-75" style={{ color: theme.colors.text }}>
                            暗化遮罩
                          </span>
                          <span className="font-mono text-cyan-400 text-[10px] font-bold">
                            {Math.round(customImageDim * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="0.85"
                          step="0.05"
                          value={customImageDim}
                          onChange={(e) => onChangeCustomImageDim(Number(e.target.value))}
                          className="w-full accent-cyan-400 cursor-pointer"
                        />
                      </div>

                      {/* Gaussian Blur */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-medium opacity-75" style={{ color: theme.colors.text }}>
                            模糊程度
                          </span>
                          <span className="font-mono text-cyan-400 text-[10px] font-bold">
                            {customImageBlur} px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="24"
                          step="1"
                          value={customImageBlur}
                          onChange={(e) => onChangeCustomImageBlur(Number(e.target.value))}
                          className="w-full accent-cyan-400 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 🌟 2. 预设背景效果 (Presets) */}
                <div>
                  <label className="font-medium text-xs opacity-80 block mb-2" style={{ color: theme.colors.text }}>
                    预设背景效果
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[
                      { id: 'aurora', name: '极光流云', desc: '柔和渐变流动氛围' },
                      { id: 'ruled', name: '信纸横线', desc: '文本真实对齐横线' },
                      { id: 'solid', name: '纯色背景', desc: '无纹理纯色底板' },
                    ].map((bg) => {
                      const isCur = backgroundEffect === bg.id;
                      return (
                        <button
                          key={bg.id}
                          onClick={() => onChangeBackgroundEffect(bg.id as any)}
                          className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                            isCur ? 'ring-2 ring-cyan-400 shadow-md font-semibold' : 'hover:border-white/20'
                          }`}
                          style={{
                            backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                            borderColor: isCur ? theme.colors.accent : theme.colors.border,
                          }}
                        >
                          <span className="text-xs" style={{ color: theme.colors.text }}>
                            {bg.name}
                          </span>
                          <span className="text-[10px] opacity-50 mt-1" style={{ color: theme.colors.textMuted }}>
                            {bg.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Global Effect Intensity Slider */}
                {backgroundEffect !== 'solid' && (
                  <div
                    className="rounded-2xl border p-5 space-y-3 animate-in fade-in duration-150"
                    style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                        效果强度
                      </span>
                      <span className="font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-400/10">
                        {Math.round(backgroundIntensity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={backgroundIntensity}
                      onChange={(e) => onChangeBackgroundIntensity(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] opacity-40 font-mono">
                      <span>较弱 (10%)</span>
                      <span>较强 (100%)</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TYPOGRAPHY */}
            {activeTab === 'typography' && (
              <div className="space-y-6">
                <div>
                  <label className="font-semibold text-xs opacity-80 block mb-2" style={{ color: theme.colors.text }}>
                    字体设置
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'lxgw', name: '霞鹜文楷 / 楷体', desc: '中文楷体字形' },
                      { id: 'songti', name: '思源宋体 / 明体', desc: '印刷宋体字形' },
                      { id: 'sans', name: '苹方 / 微软雅黑', desc: '标准无衬线黑体' },
                      { id: 'mono', name: '等宽字体', desc: '固定字符宽度' },
                      { id: 'custom', name: '自定义字体', desc: '输入系统已安装的字体名称' },
                    ].map((f) => {
                      const isCur = fontPreset === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => onSelectFontPreset(f.id as any)}
                          className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all ${
                            isCur ? 'ring-2 ring-cyan-400/80 shadow-md font-semibold' : 'hover:border-white/20'
                          }`}
                          style={{
                            backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                            borderColor: isCur ? theme.colors.accent : theme.colors.border,
                          }}
                        >
                          <span className="text-[12px]" style={{ color: theme.colors.text }}>
                            {f.name}
                          </span>
                          <span className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                            {f.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {fontPreset === 'custom' && (
                  <div
                    className="rounded-2xl border p-4 space-y-2 animate-in fade-in duration-150"
                    style={{ borderColor: theme.colors.accent, backgroundColor: `${theme.colors.bgHover}40` }}
                  >
                    <label className="block font-medium text-[11px]" style={{ color: theme.colors.text }}>
                      输入系统已安装的自定义字体名称 (Font Family Name)
                    </label>
                    <input
                      type="text"
                      value={customFontName}
                      onChange={(e) => onChangeCustomFontName(e.target.value)}
                      placeholder="例如: 方正兰亭黑, Noto Serif CJK SC, Georgia, 汉仪中宋..."
                      className="w-full rounded-xl border p-2.5 text-xs outline-none font-mono focus:border-cyan-400"
                      style={{
                        backgroundColor: theme.colors.bg,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      }}
                    />
                  </div>
                )}

                {/* Page Margins & Canvas Width */}
                <div
                  className="space-y-4 rounded-2xl border p-5"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                        中文首行缩进 (2 字符)
                      </span>
                      <p className="text-[10px] opacity-50">标准中文小说段落开头自动空两格</p>
                    </div>
                    <button
                      onClick={onToggleIndent}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all ${
                        indentEnabled
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold'
                          : 'bg-white/5 text-neutral-400 border border-white/5'
                      }`}
                    >
                      {indentEnabled && <Check className="h-3 w-3" />}
                      <span>{indentEnabled ? '已开启' : '已关闭'}</span>
                    </button>
                  </div>

                  {/* Width & Margins */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.colors.text }}>版心最大宽度</span>
                        <span className="font-mono text-cyan-400 font-bold">{contentMaxWidth}px</span>
                      </div>
                      <input
                        type="range"
                        min="640"
                        max="1024"
                        step="20"
                        value={contentMaxWidth}
                        onChange={(e) => onChangeContentMaxWidth(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.colors.text }}>左右页边距</span>
                        <span className="font-mono text-cyan-400 font-bold">{horizontalPadding}px</span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="80"
                        step="4"
                        value={horizontalPadding}
                        onChange={(e) => onChangeHorizontalPadding(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Font Size & Line Height */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.colors.text }}>正文字号</span>
                        <span className="font-mono text-cyan-400 font-bold">{fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="14"
                        max="28"
                        step="1"
                        value={fontSize}
                        onChange={(e) => onChangeFontSize(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.colors.text }}>行高比例</span>
                        <span className="font-mono text-cyan-400 font-bold">{lineHeight}</span>
                      </div>
                      <input
                        type="range"
                        min="1.5"
                        max="2.5"
                        step="0.05"
                        value={lineHeight}
                        onChange={(e) => onChangeLineHeight(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.colors.text }}>段落间距</span>
                        <span className="font-mono text-cyan-400 font-bold">{paragraphSpacing}em</span>
                      </div>
                      <input
                        type="range"
                        min="0.3"
                        max="1.4"
                        step="0.05"
                        value={paragraphSpacing}
                        onChange={(e) => onChangeParagraphSpacing(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Spotlight & Zero-Chrome */}
                <div
                  className="space-y-4 rounded-2xl border p-5"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div>
                    <label className="font-semibold text-xs block mb-1" style={{ color: theme.colors.text }}>
                      段落聚焦 (聚光灯模式)
                    </label>
                    <p className="text-[10px] opacity-50 mb-3">
                      编辑时高亮当前段落，其他段落适度暗化
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'paragraph', name: '段落高亮', desc: '高亮当前正在编辑的段落' },
                        { id: 'none', name: '关闭聚焦', desc: '全文保持正常亮度' },
                      ].map((mode) => {
                        const isCur = spotlightMode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            onClick={() => onSelectSpotlightMode(mode.id as any)}
                            className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all ${
                              isCur ? 'ring-2 ring-cyan-400 shadow-md font-semibold' : 'hover:border-white/20'
                            }`}
                            style={{
                              backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bgSecondary,
                              borderColor: isCur ? theme.colors.accent : theme.colors.border,
                            }}
                          >
                            <span className="text-[12px]" style={{ color: theme.colors.text }}>
                              {mode.name}
                            </span>
                            <span className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                              {mode.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div>
                      <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                        极简全屏模式
                      </span>
                      <p className="text-[10px] opacity-50">隐藏顶部与固定底部栏，保留纯净写作界面</p>
                    </div>
                    <button
                      onClick={onToggleZeroChrome}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all ${
                        zeroChrome
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold'
                          : 'bg-white/5 text-neutral-400 border border-white/5'
                      }`}
                    >
                      {zeroChrome ? '已开启' : '未开启'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: THEMES */}
            {activeTab === 'themes' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {Object.values(THEMES).map((th) => {
                    const isCur = theme.id === th.id;
                    return (
                      <div
                        key={th.id}
                        onClick={() => onSelectTheme(th.id)}
                        className={`group relative flex flex-col gap-3 rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                          isCur
                            ? 'ring-2 ring-cyan-400/80 shadow-lg scale-[1.01]'
                            : 'hover:border-white/20 hover:scale-[1.005] opacity-80 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: th.colors.bgSecondary,
                          borderColor: isCur ? th.colors.accent : `${th.colors.border}80`,
                        }}
                      >
                        {/* Mini Editor Mockup Preview */}
                        <div
                          className="relative w-full h-20 rounded-xl p-3 border overflow-hidden flex flex-col justify-between select-none shadow-inner"
                          style={{
                            backgroundColor: th.colors.editorBg,
                            borderColor: `${th.colors.border}60`,
                          }}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="text-[10px] font-serif font-medium tracking-wide truncate"
                                style={{ color: th.colors.editorText }}
                              >
                                “夜幕低垂，星火如织...”
                              </span>
                              <span
                                className="h-3 w-1 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                                style={{ backgroundColor: th.colors.cursor, color: th.colors.cursor }}
                              />
                            </div>
                            <div
                              className="h-1.5 w-3/4 rounded-full opacity-30"
                              style={{ backgroundColor: th.colors.editorText }}
                            />
                            <div
                              className="h-1.5 w-1/2 rounded-full opacity-20"
                              style={{ backgroundColor: th.colors.editorText }}
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1">
                              <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: th.colors.bg }} />
                              <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: th.colors.accent }} />
                              <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: th.colors.cursor }} />
                            </div>
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium"
                              style={{ backgroundColor: `${th.colors.accent}25`, color: th.colors.accent }}
                            >
                              {th.isDark ? '暗黑' : '明亮'}
                            </span>
                          </div>
                        </div>

                        {/* Title & Selection Indicator */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-xs" style={{ color: th.colors.text }}>
                              {th.nameZh}
                            </span>
                            <span className="text-[10px] opacity-40 ml-2 font-mono" style={{ color: theme.colors.textMuted }}>
                              {th.name}
                            </span>
                          </div>
                          {isCur ? (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 font-semibold">
                              <Check className="h-3 w-3" /> 当前应用
                            </span>
                          ) : (
                            <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity font-mono">
                              点击应用
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 5: PLUGINS */}
            {activeTab === 'plugins' && (
              <div className="space-y-3.5">
                {pluginManager.getAllPlugins().map((p) => {
                  const isEnabled = pluginManager.isPluginEnabled(p.metadata.id);
                  return (
                    <div
                      key={p.metadata.id}
                      className="flex items-center justify-between rounded-2xl border p-4.5 transition-all"
                      style={{
                        backgroundColor: theme.colors.bg,
                        borderColor: isEnabled ? `${theme.colors.accent}60` : theme.colors.border,
                      }}
                    >
                      <div className="flex items-center gap-3.5 max-w-[70%]">
                        <div
                          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: isEnabled ? `${theme.colors.accent}20` : 'rgba(255,255,255,0.04)',
                            color: isEnabled ? theme.colors.accent : theme.colors.textMuted,
                          }}
                        >
                          <Layers className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                              {p.metadata.name}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-neutral-400">
                              v{p.metadata.version}
                            </span>
                          </div>
                          <p className="text-[10.5px] opacity-50 mt-0.5 line-clamp-1" style={{ color: theme.colors.textMuted }}>
                            {p.metadata.description}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (isEnabled) {
                            pluginManager.disablePlugin(p.metadata.id);
                          } else {
                            pluginManager.enablePlugin(p.metadata.id);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                          isEnabled
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold shadow-xs'
                            : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {isEnabled && <Check className="h-3 w-3" />}
                        <span>{isEnabled ? '已启用' : '已禁用'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✂️ Image Crop & Viewport Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={pendingCropImage}
        initialParams={cropParams}
        theme={theme}
        onClose={() => setCropModalOpen(false)}
        onApply={(croppedUrl, params) => {
          onChangeCustomImage(croppedUrl);
          onChangeCropParams?.(params);
          onChangeBackgroundEffect('custom');
        }}
      />
    </div>
  );
};
