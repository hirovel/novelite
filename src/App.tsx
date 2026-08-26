import React, { useState, useEffect, useRef } from 'react';
import { THEMES, DEFAULT_THEME_ID } from './core/themes/themeDefinitions';
import type { Theme } from './core/themes/types';
import { NovelEditor } from './components/editor/NovelEditor';
import { FloatingChapterTree } from './components/tree/FloatingChapterTree';
import { TerminalBar } from './components/statusbar/TerminalBar';
import { CommandPalette } from './components/palette/CommandPalette';
import { SettingsDrawer } from './components/settings/SettingsDrawer';
import { pluginManager } from './core/plugins/PluginManager';
import { commandRegistry } from './core/plugins/CommandRegistry';
import { eventBus } from './core/events/EventBus';
import { projectStore } from './core/storage/ProjectStore';
import type { BackgroundEffect } from './components/editor/EditorBackground';

// Import Core & Literary Plugins
import { NovelTreePlugin } from './plugins/novel-tree';
import { BackgroundAtmospherePlugin } from './plugins/background-atmosphere';
import { LiveCursorPlugin } from './plugins/live-cursor';
import { TypewriterPlugin } from './plugins/typewriter';
import { ChineseTypographyPlugin } from './plugins/chinese-typography';
import { ScratchpadPlugin } from './plugins/scratchpad';
import { WordCounterPlugin } from './plugins/word-counter';
import { QuickExporterPlugin } from './plugins/quick-exporter';
import { SampleUserPlugin } from './plugins/custom-template/sampleUserPlugin';

export const App: React.FC = () => {
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem('novelite_theme_id') || DEFAULT_THEME_ID;
  });
  const theme: Theme = THEMES[themeId] || THEMES[DEFAULT_THEME_ID];

  // Cursor state
  const [cursorShape, setCursorShape] = useState<'beam' | 'block' | 'underline'>(() => {
    return (localStorage.getItem('novelite_cursor_shape') as any) || 'beam';
  });
  const [cursorColor, setCursorColor] = useState<string>(() => {
    return localStorage.getItem('novelite_cursor_color') || 'auto';
  });
  const [cursorAnimationLength, setCursorAnimationLength] = useState<number>(() => {
    return Number(localStorage.getItem('novelite_cursor_anim_length')) || 0.08;
  });
  const [cursorTrailSize, setCursorTrailSize] = useState<number>(() => {
    return Number(localStorage.getItem('novelite_cursor_trail_size')) || 0.75;
  });
  const [vfxMode, setVfxMode] = useState<'pure' | 'embers' | 'ripples' | 'feather'>(() => {
    return (localStorage.getItem('novelite_cursor_vfx_mode') as any) || 'pure';
  });
  const [blinkMode, setBlinkMode] = useState<'smooth' | 'solid' | 'blink'>(() => {
    return (localStorage.getItem('novelite_cursor_blink_mode') as any) || 'smooth';
  });
  const [breatheCycle, setBreatheCycle] = useState<number>(() => {
    return Number(localStorage.getItem('novelite_cursor_breathe_cycle')) || 1.2;
  });
  const [speedMode, setSpeedMode] = useState<'gentle' | 'balanced' | 'snappy'>(() => {
    return (localStorage.getItem('novelite_cursor_speed_mode') as any) || 'gentle';
  });

  // Background Artistic Effect state
  const [backgroundEffect, setBackgroundEffect] = useState<BackgroundEffect>(() => {
    return (localStorage.getItem('novelite_bg_effect') as any) || 'aurora';
  });
  const [backgroundIntensity, setBackgroundIntensity] = useState<number>(() => {
    return Number(localStorage.getItem('novelite_bg_intensity')) || 0.65;
  });

  // Typography & Page Margins state
  const [fontPreset, setFontPreset] = useState<'lxgw' | 'songti' | 'sans' | 'mono' | 'custom'>(() => {
    return (localStorage.getItem('novelite_font_preset') as any) || 'lxgw';
  });
  const [customFontName, setCustomFontName] = useState<string>(() => {
    return localStorage.getItem('novelite_custom_font_name') || '';
  });
  const [fontSize, setFontSize] = useState<number>(() => {
    return Number(localStorage.getItem('novelite_font_size')) || 18;
  });
  const [lineHeight, setLineHeight] = useState<number>(() => {
    return Number(localStorage.getItem('novelite_line_height')) || 1.95;
  });
  const [contentMaxWidth, setContentMaxWidth] = useState<number>(() => {
    return Number(localStorage.getItem('novelite_content_max_width')) || 780;
  });
  const [horizontalPadding, setHorizontalPadding] = useState<number>(() => {
    return Number(localStorage.getItem('novelite_horiz_padding')) || 32;
  });
  const [paragraphSpacing, setParagraphSpacing] = useState<number>(() => {
    return Number(localStorage.getItem('novelite_paragraph_spacing')) || 0.7;
  });
  const [indentEnabled, setIndentEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('novelite_indent_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Spotlight Focus & Zero-Chrome Layout state
  const [spotlightMode, setSpotlightMode] = useState<'none' | 'paragraph'>(() => {
    return (localStorage.getItem('novelite_spotlight_mode') as any) || 'paragraph';
  });
  const [zeroChrome, setZeroChrome] = useState<boolean>(() => {
    const saved = localStorage.getItem('novelite_zero_chrome');
    return saved !== null ? saved === 'true' : true;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [toast, setToast] = useState<{ message: string; type?: string } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  useEffect(() => {
    pluginManager.registerPlugin(NovelTreePlugin);
    pluginManager.registerPlugin(BackgroundAtmospherePlugin);
    pluginManager.registerPlugin(LiveCursorPlugin);
    pluginManager.registerPlugin(TypewriterPlugin);
    pluginManager.registerPlugin(ChineseTypographyPlugin);
    pluginManager.registerPlugin(ScratchpadPlugin);
    pluginManager.registerPlugin(WordCounterPlugin);
    pluginManager.registerPlugin(QuickExporterPlugin);
    pluginManager.registerPlugin(SampleUserPlugin);
  }, []);

  // Update cursor settings into plugin manager
  useEffect(() => {
    const ctx = pluginManager.createPluginContext('plugin-live-cursor');
    ctx.setSetting('shape', cursorShape);
    ctx.setSetting('color', cursorColor === 'auto' ? theme.colors.cursor : cursorColor);
    ctx.setSetting('animationLength', cursorAnimationLength);
    ctx.setSetting('trailSize', cursorTrailSize);
    ctx.setSetting('vfxMode', vfxMode);
    ctx.setSetting('blinkMode', blinkMode);
    ctx.setSetting('breatheCycle', breatheCycle);
    ctx.setSetting('speedMode', speedMode);
  }, [cursorShape, cursorColor, cursorAnimationLength, cursorTrailSize, vfxMode, blinkMode, breatheCycle, speedMode, theme]);

  // Update typography & page margin settings into plugin manager
  useEffect(() => {
    const ctx = pluginManager.createPluginContext('plugin-chinese-typography');
    ctx.setSetting('fontPreset', fontPreset);
    ctx.setSetting('customFontName', customFontName);
    ctx.setSetting('fontSize', fontSize);
    ctx.setSetting('lineHeight', lineHeight);
    ctx.setSetting('contentMaxWidth', contentMaxWidth);
    ctx.setSetting('horizontalPadding', horizontalPadding);
    ctx.setSetting('paragraphSpacing', paragraphSpacing);
    ctx.setSetting('indentEnabled', indentEnabled);
  }, [fontPreset, customFontName, fontSize, lineHeight, contentMaxWidth, horizontalPadding, paragraphSpacing, indentEnabled]);

  useEffect(() => {
    const unsubToast = eventBus.on('show-toast', ({ message, type }: any) => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToast({ message, type });
      toastTimeoutRef.current = setTimeout(() => setToast(null), 2500);
    });

    const unsubVfx = eventBus.on('live-cursor:vfx-changed', (mode: any) => {
      if (mode) {
        setVfxMode(mode);
        localStorage.setItem('novelite_cursor_vfx_mode', mode);
      }
    });

    const unsubTypo = eventBus.on('plugin-setting-changed:plugin-chinese-typography', ({ key, value }: any) => {
      if (key === 'indentEnabled' && typeof value === 'boolean') {
        setIndentEnabled(value);
        localStorage.setItem('novelite_indent_enabled', String(value));
      } else if (key === 'fontSize' && typeof value === 'number') {
        setFontSize(value);
        localStorage.setItem('novelite_font_size', String(value));
      }
    });

    return () => {
      unsubToast();
      unsubVfx();
      unsubTypo();
    };
  }, []);

  useEffect(() => {
    const matchesShortcut = (e: KeyboardEvent, shortcut: string): boolean => {
      const parts = shortcut.split('+').map((s) => s.trim().toLowerCase());
      const needsCtrl = parts.includes('ctrl') || parts.includes('control') || parts.includes('cmd');
      const needsAlt = parts.includes('alt') || parts.includes('opt');
      const needsShift = parts.includes('shift');

      const hasCtrl = e.ctrlKey || e.metaKey;
      const hasAlt = e.altKey;
      const hasShift = e.shiftKey;

      if (needsCtrl !== hasCtrl) return false;
      if (needsAlt !== hasAlt) return false;
      if (needsShift !== hasShift) return false;

      const keyPart = parts.find(
        (p) => !['ctrl', 'control', 'cmd', 'alt', 'opt', 'shift'].includes(p)
      );
      if (!keyPart) return false;

      const actualKey = e.key.toLowerCase();
      if (actualKey === keyPart) return true;
      if (keyPart === '=' && (e.key === '=' || e.key === '+')) return true;
      if (keyPart === '-' && (e.key === '-' || e.key === '_')) return true;

      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Core Built-in Shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'k' || e.key === 'P' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
        return;
      }
      if (e.key === 'F11' || (e.altKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        projectStore.save();
        eventBus.emit('show-toast', { message: '章节已保存', type: 'success' });
        return;
      }

      // 2. Dispatch registered plugin commands with matching shortcut
      const commands = commandRegistry.getAll();
      for (const cmd of commands) {
        if (cmd.shortcut && matchesShortcut(e, cmd.shortcut)) {
          e.preventDefault();
          const ctx = pluginManager.createPluginContext(cmd.id);
          cmd.run(ctx);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectTheme = (id: string) => {
    setThemeId(id);
    localStorage.setItem('novelite_theme_id', id);
  };

  const handleSelectCursorShape = (shape: 'beam' | 'block' | 'underline') => {
    setCursorShape(shape);
    localStorage.setItem('novelite_cursor_shape', shape);
  };

  const handleChangeCursorColor = (color: string) => {
    setCursorColor(color);
    localStorage.setItem('novelite_cursor_color', color);
  };

  const handleSelectFontPreset = (preset: 'lxgw' | 'songti' | 'sans' | 'mono' | 'custom') => {
    setFontPreset(preset);
    localStorage.setItem('novelite_font_preset', preset);
  };

  const handleChangeCustomFontName = (name: string) => {
    setCustomFontName(name);
    localStorage.setItem('novelite_custom_font_name', name);
  };

  const handleChangeFontSize = (size: number) => {
    setFontSize(size);
    localStorage.setItem('novelite_font_size', String(size));
  };

  const handleChangeLineHeight = (height: number) => {
    setLineHeight(height);
    localStorage.setItem('novelite_line_height', String(height));
  };

  const handleChangeContentMaxWidth = (width: number) => {
    setContentMaxWidth(width);
    localStorage.setItem('novelite_content_max_width', String(width));
  };

  const handleChangeHorizontalPadding = (padding: number) => {
    setHorizontalPadding(padding);
    localStorage.setItem('novelite_horiz_padding', String(padding));
  };

  const handleChangeParagraphSpacing = (spacing: number) => {
    setParagraphSpacing(spacing);
    localStorage.setItem('novelite_paragraph_spacing', String(spacing));
  };

  const handleToggleIndent = () => {
    setIndentEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('novelite_indent_enabled', String(next));
      return next;
    });
  };

  const handleChangeAnimationLength = (len: number) => {
    setCursorAnimationLength(len);
    localStorage.setItem('novelite_cursor_anim_length', String(len));
  };

  const handleChangeTrailSize = (size: number) => {
    setCursorTrailSize(size);
    localStorage.setItem('novelite_cursor_trail_size', String(size));
  };

  const handleChangeVfxMode = (vfx: 'pure' | 'embers' | 'ripples' | 'feather') => {
    setVfxMode(vfx);
    localStorage.setItem('novelite_cursor_vfx_mode', vfx);
  };

  const handleChangeBlinkMode = (mode: 'smooth' | 'solid' | 'blink') => {
    setBlinkMode(mode);
    localStorage.setItem('novelite_cursor_blink_mode', mode);
  };

  const handleChangeBreatheCycle = (cycle: number) => {
    setBreatheCycle(cycle);
    localStorage.setItem('novelite_cursor_breathe_cycle', String(cycle));
  };

  const handleChangeSpeedMode = (mode: 'gentle' | 'balanced' | 'snappy') => {
    setSpeedMode(mode);
    localStorage.setItem('novelite_cursor_speed_mode', mode);
  };

  const handleChangeBackgroundEffect = (eff: BackgroundEffect) => {
    setBackgroundEffect(eff);
    localStorage.setItem('novelite_bg_effect', eff);
  };

  const handleChangeBackgroundIntensity = (intensity: number) => {
    setBackgroundIntensity(intensity);
    localStorage.setItem('novelite_bg_intensity', String(intensity));
  };

  const handleSelectSpotlightMode = (mode: 'none' | 'paragraph') => {
    setSpotlightMode(mode);
    localStorage.setItem('novelite_spotlight_mode', mode);
  };

  const handleToggleZeroChrome = () => {
    setZeroChrome((prev) => {
      const next = !prev;
      localStorage.setItem('novelite_zero_chrome', String(next));
      return next;
    });
  };

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden font-sans select-none antialiased"
      style={{
        backgroundColor: theme.colors.bg,
        color: theme.colors.text,
      }}
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div
            className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium shadow-xl backdrop-blur-md"
            style={{
              backgroundColor: `${theme.colors.bgSecondary}ee`,
              borderColor: theme.colors.accent,
              color: theme.colors.text,
            }}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="relative flex flex-1 overflow-hidden">
        <main className="relative flex flex-1 flex-col overflow-hidden">
          <NovelEditor
            theme={theme}
            cursorShape={cursorShape}
            cursorColor={cursorColor}
            cursorSpeed="snappy"
            cursorAnimationLength={cursorAnimationLength}
            cursorTrailSize={cursorTrailSize}
            vfxMode={vfxMode}
            blinkMode={blinkMode}
            breatheCycle={breatheCycle}
            speedMode={speedMode}
            backgroundEffect={backgroundEffect}
            backgroundIntensity={backgroundIntensity}
            fontPreset={fontPreset}
            customFontName={customFontName}
            fontSize={fontSize}
            lineHeight={lineHeight}
            contentMaxWidth={contentMaxWidth}
            spotlightMode={spotlightMode}
            zeroChrome={zeroChrome}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            isSidebarOpen={isSidebarOpen}
          />
        </main>
      </div>

      {/* Floating Chapter Tree Sheet (Ctrl+B) */}
      <FloatingChapterTree
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        theme={theme}
      />

      {/* Bottom Bar (Only visible when zeroChrome is turned off) */}
      {!isZenMode && !zeroChrome && (
        <TerminalBar
          theme={theme}
          cursorShape={cursorShape}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode((prev) => !prev)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        theme={theme}
      />

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onSelectTheme={handleSelectTheme}
        cursorShape={cursorShape}
        onSelectCursorShape={handleSelectCursorShape}
        cursorColor={cursorColor}
        onChangeCursorColor={handleChangeCursorColor}
        cursorAnimationLength={cursorAnimationLength}
        onChangeAnimationLength={handleChangeAnimationLength}
        cursorTrailSize={cursorTrailSize}
        onChangeTrailSize={handleChangeTrailSize}
        vfxMode={vfxMode}
        onChangeVfxMode={handleChangeVfxMode}
        blinkMode={blinkMode}
        onChangeBlinkMode={handleChangeBlinkMode}
        breatheCycle={breatheCycle}
        onChangeBreatheCycle={handleChangeBreatheCycle}
        speedMode={speedMode}
        onChangeSpeedMode={handleChangeSpeedMode}
        backgroundEffect={backgroundEffect}
        onChangeBackgroundEffect={handleChangeBackgroundEffect}
        backgroundIntensity={backgroundIntensity}
        onChangeBackgroundIntensity={handleChangeBackgroundIntensity}
        fontPreset={fontPreset}
        onSelectFontPreset={handleSelectFontPreset}
        customFontName={customFontName}
        onChangeCustomFontName={handleChangeCustomFontName}
        fontSize={fontSize}
        onChangeFontSize={handleChangeFontSize}
        lineHeight={lineHeight}
        onChangeLineHeight={handleChangeLineHeight}
        contentMaxWidth={contentMaxWidth}
        onChangeContentMaxWidth={handleChangeContentMaxWidth}
        horizontalPadding={horizontalPadding}
        onChangeHorizontalPadding={handleChangeHorizontalPadding}
        paragraphSpacing={paragraphSpacing}
        onChangeParagraphSpacing={handleChangeParagraphSpacing}
        indentEnabled={indentEnabled}
        onToggleIndent={handleToggleIndent}
        spotlightMode={spotlightMode}
        onSelectSpotlightMode={handleSelectSpotlightMode}
        zeroChrome={zeroChrome}
        onToggleZeroChrome={handleToggleZeroChrome}
      />
    </div>
  );
};
