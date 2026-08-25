import React, { useState } from 'react';
import { X, Sparkles, Palette, Type, Puzzle, RotateCcw, Image, Check } from 'lucide-react';
import type { Theme } from '../../core/themes/types';
import { THEMES } from '../../core/themes/themeDefinitions';
import { pluginManager } from '../../core/plugins/PluginManager';
import { LiveCursorTestArena } from './LiveCursorTestArena';
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
  backgroundEffect: BackgroundEffect;
  onChangeBackgroundEffect: (effect: BackgroundEffect) => void;
  backgroundIntensity: number;
  onChangeBackgroundIntensity: (intensity: number) => void;
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
  backgroundEffect,
  onChangeBackgroundEffect,
  backgroundIntensity,
  onChangeBackgroundIntensity,
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
}) => {
  const [activeTab, setActiveTab] = useState<'cursor' | 'background' | 'typography' | 'themes' | 'plugins'>('cursor');

  if (!isOpen) return null;

  const handleResetCursor = () => {
    onSelectCursorShape('beam');
    onChangeCursorColor('auto');
    onChangeAnimationLength(0.08);
    onChangeTrailSize(0.75);
    onChangeVfxMode('pure');
    onChangeBlinkMode('smooth');
    onChangeBreatheCycle(1.2);
    onChangeSpeedMode('gentle');
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md select-none p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="flex h-[88vh] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.colors.bgSecondary,
          borderColor: theme.colors.border,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-6 py-3.5"
          style={{ borderColor: theme.colors.border }}
        >
          <h2 className="text-sm font-semibold tracking-tight" style={{ color: theme.colors.text }}>
            偏好设置
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 opacity-60 hover:opacity-100 hover:bg-white/10 transition-all"
            style={{ color: theme.colors.text }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex border-b px-6 gap-2 pt-2 bg-black/10 overflow-x-auto"
          style={{ borderColor: theme.colors.border }}
        >
          {[
            { id: 'cursor', label: 'Live 灵感光标', icon: Sparkles },
            { id: 'background', label: '背景艺术特效', icon: Image },
            { id: 'typography', label: '版心与排版', icon: Type },
            { id: 'themes', label: '主题外观', icon: Palette },
            { id: 'plugins', label: '扩展插件', icon: Puzzle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-all ${
                  isActive ? 'border-current font-semibold' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={{ color: isActive ? theme.colors.accent : theme.colors.textMuted }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* TAB 1: CURSOR */}
          {activeTab === 'cursor' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold opacity-80" style={{ color: theme.colors.text }}>
                    光标形态 (Live Cursor Shapes)
                  </label>
                  <button
                    onClick={handleResetCursor}
                    className="flex items-center gap-1 text-[11px] opacity-60 hover:opacity-100 hover:text-cyan-400"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>恢复默认</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'beam', name: '平滑光柱 (Beam)', desc: '2.6px 极细垂直柱，清晰专注' },
                    { id: 'block', name: '极简色块 (Block)', desc: '半透明字符方块，沉浸专注' },
                    { id: 'underline', name: '水平基准线 (Line)', desc: '底部水平基准线' },
                  ].map((s) => {
                    const isCur = cursorShape === s.id;
                    const effectiveColor = !cursorColor || cursorColor === 'auto' ? (theme.colors.cursor || theme.colors.accent) : cursorColor;
                    return (
                      <button
                        key={s.id}
                        onClick={() => onSelectCursorShape(s.id as any)}
                        className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                          isCur ? 'ring-1 ring-cyan-400/50 shadow-xs' : 'hover:border-white/20'
                        }`}
                        style={{
                          backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                          borderColor: isCur ? effectiveColor : theme.colors.border,
                        }}
                      >
                        <span className="font-medium text-[11.5px]" style={{ color: theme.colors.text }}>
                          {s.name}
                        </span>
                        <span className="text-[10px] opacity-50 mt-1" style={{ color: theme.colors.textMuted }}>
                          {s.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dedicated Live 120fps Test Arena */}
              <LiveCursorTestArena
                theme={theme}
                cursorShape={cursorShape}
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
              />
            </div>
          )}

          {/* TAB 2: BACKGROUND ARTISTRY & ATMOSPHERE */}
          {activeTab === 'background' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold opacity-80" style={{ color: theme.colors.text }}>
                    编辑器背景艺术特效 (Background Atmosphere)
                  </label>
                  <button
                    onClick={handleResetBackground}
                    className="flex items-center gap-1 text-[11px] opacity-60 hover:opacity-100 hover:text-cyan-400"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>恢复默认</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'aurora', name: '极光流云 (Aurora Mesh)', desc: '深沉柔和的径向光晕流动，告别纯色呆板' },
                    { id: 'grain', name: '暗房胶片 (Film Grain)', desc: '细腻有机纸质胶片噪点纹理，质感丰富' },
                    { id: 'grid', name: '素描点阵 (Dot Grid)', desc: '微弱工整的手稿点阵，几何秩序之美' },
                    { id: 'ruled', name: '原稿信纸 (Ruled Lines)', desc: '经典纸质横格信纸基准线，排版典雅' },
                    { id: 'solid', name: '纯净素色 (Solid Minimal)', desc: '无额外纹理，纯色极简专注' },
                  ].map((bg) => {
                    const isCur = backgroundEffect === bg.id;
                    return (
                      <button
                        key={bg.id}
                        onClick={() => onChangeBackgroundEffect(bg.id as any)}
                        className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                          isCur ? 'ring-1 ring-cyan-400 shadow-xs' : 'hover:border-white/20'
                        }`}
                        style={{
                          backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                          borderColor: isCur ? theme.colors.accent : theme.colors.border,
                        }}
                      >
                        <span className="font-medium text-xs" style={{ color: theme.colors.text }}>
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

              {/* Background Intensity Slider */}
              {backgroundEffect !== 'solid' && (
                <div
                  className="rounded-xl border p-4 space-y-2 animate-in fade-in duration-150"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: theme.colors.text }}>背景氛围浓度 (Effect Intensity)</span>
                    <span className="font-mono text-cyan-400 font-bold">{Math.round(backgroundIntensity * 100)}%</span>
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
                  <div className="flex justify-between text-[9px] opacity-40">
                    <span>微弱隐约 (10%)</span>
                    <span>浓郁饱满 (100%)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TYPOGRAPHY & MARGIN LAYOUT */}
          {activeTab === 'typography' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold opacity-80" style={{ color: theme.colors.text }}>
                    字体方案预设
                  </label>
                  <button
                    onClick={handleResetTypography}
                    className="flex items-center gap-1 text-[11px] opacity-60 hover:opacity-100 hover:text-cyan-400"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>恢复默认</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'lxgw', name: '霞鹜文楷 / 楷体', desc: '典雅手写文学风' },
                    { id: 'songti', name: '思源宋体 / 明体', desc: '经典出版物印刷风' },
                    { id: 'sans', name: '苹方 / 微软雅黑', desc: '现代极简清晰黑体' },
                    { id: 'mono', name: '等宽终端 / 编程体', desc: '极客等宽字形' },
                    { id: 'custom', name: '自定义字体', desc: '使用本地安装的任何字体' },
                  ].map((f) => {
                    const isCur = fontPreset === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => onSelectFontPreset(f.id as any)}
                        className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                          isCur ? 'ring-1 ring-cyan-400/50 shadow-xs' : 'hover:border-white/20'
                        }`}
                        style={{
                          backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                          borderColor: isCur ? theme.colors.accent : theme.colors.border,
                        }}
                      >
                        <span className="font-medium text-[11.5px]" style={{ color: theme.colors.text }}>
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

              {/* Custom font name input */}
              {fontPreset === 'custom' && (
                <div
                  className="rounded-xl border p-3.5 space-y-2 animate-in fade-in duration-150"
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
                    className="w-full rounded-lg border p-2 text-xs outline-none font-mono focus:border-cyan-400"
                    style={{
                      backgroundColor: theme.colors.bg,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  />
                  <p className="text-[10px] opacity-50">
                    提示：只要您的 Windows 系统中已安装该字体（或系统内置），直接填入字体名称即可即时生效。
                  </p>
                </div>
              )}

              {/* Page Margins & Canvas Width Controls */}
              <div
                className="space-y-4 rounded-xl border p-4"
                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
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

                {/* Content Max Width */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: theme.colors.text }}>版心最大宽度 (Canvas Max Width)</span>
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
                  <div className="flex justify-between text-[9px] opacity-40">
                    <span>紧凑书卷 (640px)</span>
                    <span>舒展大屏 (1024px)</span>
                  </div>
                </div>

                {/* Horizontal Page Padding */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: theme.colors.text }}>左右页边距 (Page Margins)</span>
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

                {/* Font Size & Line Height */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span style={{ color: theme.colors.text }}>正文字号</span>
                      <span className="font-mono text-cyan-400">{fontSize}px</span>
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
                      <span className="font-mono text-cyan-400">{lineHeight}</span>
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
                </div>

                {/* Paragraph Spacing */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: theme.colors.text }}>段落间距 (Paragraph Spacing)</span>
                    <span className="font-mono text-cyan-400">{paragraphSpacing}em</span>
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
          )}

          {/* TAB 4: THEMES */}
          {activeTab === 'themes' && (
            <div className="space-y-4">
              <label className="block font-semibold mb-1 opacity-80" style={{ color: theme.colors.text }}>
                配色方案 (切换主题时光标与选区将自适应跟随)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(THEMES).map((th) => {
                  const isCur = theme.id === th.id;
                  return (
                    <div
                      key={th.id}
                      onClick={() => onSelectTheme(th.id)}
                      className={`flex flex-col gap-2 rounded-xl border p-3.5 cursor-pointer transition-all ${
                        isCur ? 'ring-1 ring-cyan-400 shadow-xs' : 'hover:border-white/20'
                      }`}
                      style={{
                        backgroundColor: th.colors.bgSecondary,
                        borderColor: isCur ? th.colors.accent : theme.colors.border,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs" style={{ color: th.colors.text }}>
                          {th.nameZh}
                        </span>
                        {isCur && (
                          <span className="text-[10px] font-mono text-cyan-400">
                            当前
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: th.colors.bg }} />
                        <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: th.colors.accent }} />
                        <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: th.colors.text }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: PLUGINS */}
          {activeTab === 'plugins' && (
            <div className="space-y-3">
              {pluginManager.getAllPlugins().map((p) => {
                const isEnabled = pluginManager.isPluginEnabled(p.metadata.id);
                return (
                  <div
                    key={p.metadata.id}
                    className="flex items-center justify-between rounded-xl border p-3.5"
                    style={{
                      backgroundColor: theme.colors.bg,
                      borderColor: isEnabled ? `${theme.colors.accent}40` : theme.colors.border,
                    }}
                  >
                    <div>
                      <div className="font-medium text-xs" style={{ color: theme.colors.text }}>
                        {p.metadata.name}
                      </div>
                      <div className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                        {p.metadata.description}
                      </div>
                    </div>

                    <button
                      onClick={() => pluginManager.togglePlugin(p.metadata.id)}
                      className={`text-xs px-3 py-1 rounded-full font-mono transition-colors ${
                        isEnabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/5 text-neutral-400 border border-white/5'
                      }`}
                    >
                      {isEnabled ? '开启' : '关闭'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
