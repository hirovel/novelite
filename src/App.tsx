import React, { useState, useEffect, useRef } from 'react';
import { THEMES, DEFAULT_THEME_ID } from './core/themes/themeDefinitions';
import type { Theme } from './core/themes/types';
import { NovelEditor } from './components/editor/NovelEditor';
import { TopSeamlessTitlebar } from './components/navigation/TopSeamlessTitlebar';
import { TerminalBar } from './components/statusbar/TerminalBar';
import { CommandPalette } from './components/palette/CommandPalette';
import { SettingsDrawer } from './components/settings/SettingsDrawer';
import type { CropParams } from './components/settings/ImageCropModal';
import { pluginManager } from './core/plugins/PluginManager';
import { dynamicPluginLoader } from './core/plugins/DynamicPluginLoader';
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
import { FocusModePlugin } from './plugins/focus-mode';
import { DialogueHighlighterPlugin } from './plugins/dialogue-highlighter';
import { ScratchpadPlugin } from './plugins/scratchpad';
import { WordCounterPlugin } from './plugins/word-counter';
import { QuickExporterPlugin } from './plugins/quick-exporter';
import { EditorToolkitPlugin } from './plugins/editor-toolkit';
import { SplitViewPlugin } from './plugins/split-view';
import { SplitViewPane } from './plugins/split-view/SplitViewPane';
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
  const [physicsMode, setPhysicsMode] = useState<'fluid' | 'ribbon' | 'quantum'>(() => {
    return (localStorage.getItem('novelite_cursor_physics_mode') as any) || 'fluid';
  });
  const [luminescence, setLuminescence] = useState<boolean>(() => {
    const saved = localStorage.getItem('novelite_cursor_luminescence');
    return saved !== null ? saved === 'true' : true;
  });
  const [inlineSkew, setInlineSkew] = useState<boolean>(() => {
    const saved = localStorage.getItem('novelite_cursor_inline_skew');
    return saved !== null ? saved === 'true' : true;
  });
  const [streamPreset, setStreamPreset] = useState<'theme' | 'cyan-violet' | 'ice-blue' | 'emerald' | 'amber-rose' | 'sakura' | 'mono' | 'custom'>(() => {
    return (localStorage.getItem('novelite_cursor_stream_preset') as any) || 'theme';
  });
  const [streamHeadColor, setStreamHeadColor] = useState<string>(() => {
    return localStorage.getItem('novelite_cursor_stream_head') || '#38bdf8';
  });
  const [streamTailColor, setStreamTailColor] = useState<string>(() => {
    return localStorage.getItem('novelite_cursor_stream_tail') || '#a78bfa';
  });

  // Background Artistic Effect state
  const [backgroundEffect, setBackgroundEffect] = useState<BackgroundEffect>(() => {
    const saved = localStorage.getItem('novelite_bg_effect');
    if (saved === 'aurora' || saved === 'ruled' || saved === 'solid' || saved === 'custom') {
      return saved;
    }
    return 'aurora';
  });
  const [backgroundIntensity, setBackgroundIntensity] = useState<number>(() => {
    return Number(localStorage.getItem('novelite_bg_intensity')) || 0.65;
  });
  const [customImage, setCustomImage] = useState<string | null>(() => {
    return localStorage.getItem('novelite_custom_image') || null;
  });
  const [customImageRaw, setCustomImageRaw] = useState<string | null>(() => {
    return localStorage.getItem('novelite_custom_image_raw') || null;
  });
  const [cropParams, setCropParams] = useState<CropParams | null>(() => {
    const saved = localStorage.getItem('novelite_crop_params');
    return saved ? JSON.parse(saved) : null;
  });
  const [customImageBlur, setCustomImageBlur] = useState<number>(() => {
    return Number(localStorage.getItem('novelite_custom_image_blur')) || 6;
  });
  const [customImageDim, setCustomImageDim] = useState<number>(() => {
    const val = localStorage.getItem('novelite_custom_image_dim');
    return val !== null ? Number(val) : 0.45;
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
    return saved !== null ? saved === 'true' : false;
  });
  const [indentSize, setIndentSize] = useState<'2em' | '1em' | '3em' | '0'>(() => {
    return (localStorage.getItem('novelite_indent_size') as any) || '2em';
  });
  const [kinsokuStrictness, setKinsokuStrictness] = useState<'strict' | 'loose' | 'native'>(() => {
    return (localStorage.getItem('novelite_kinsoku_strictness') as any) || 'strict';
  });
  const [punctuationHalt, setPunctuationHalt] = useState<boolean>(() => {
    const saved = localStorage.getItem('novelite_punctuation_halt');
    return saved !== null ? saved === 'true' : true;
  });
  const [textAlignment, setTextAlignment] = useState<'justify' | 'left'>(() => {
    return (localStorage.getItem('novelite_text_alignment') as any) || 'justify';
  });
  const [letterSpacing, setLetterSpacing] = useState<number>(() => {
    return Number(localStorage.getItem('novelite_letter_spacing')) || 0.02;
  });

  // Spotlight Focus & Zero-Chrome Layout state
  const [spotlightMode, setSpotlightMode] = useState<'none' | 'paragraph'>(() => {
    return (localStorage.getItem('novelite_spotlight_mode') as any) || 'paragraph';
  });
  const [zeroChrome, setZeroChrome] = useState<boolean>(() => {
    const saved = localStorage.getItem('novelite_zero_chrome');
    return saved !== null ? saved === 'true' : true;
  });

  // Typewriter Mode state
  const [typewriterEnabled, setTypewriterEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('novelite_typewriter_enabled');
    return saved !== null ? saved === 'true' : false;
  });
  const [typewriterRatio, setTypewriterRatio] = useState<number>(() => {
    return Number(localStorage.getItem('novelite_typewriter_ratio')) || 0.38;
  });
  const [typewriterSpeed, setTypewriterSpeed] = useState<'gentle' | 'balanced' | 'snappy' | 'instant'>(() => {
    return (localStorage.getItem('novelite_typewriter_speed') as any) || 'balanced';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    return localStorage.getItem('novelite_sidebar_open') !== 'false';
  });
  const [isSplitViewOpen, setIsSplitViewOpen] = useState<boolean>(false);
  const [splitDirection, setSplitDirection] = useState<'vertical' | 'horizontal'>(() => {
    return (localStorage.getItem('novelite_split_direction') as any) || 'vertical';
  });
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    const saved = localStorage.getItem('novelite_split_ratio');
    return saved ? Number(saved) : 0.5;
  });

  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);

  const handleToggleSplitDirection = () => {
    const next = splitDirection === 'vertical' ? 'horizontal' : 'vertical';
    setSplitDirection(next);
    localStorage.setItem('novelite_split_direction', next);
    eventBus.emit('show-toast', { message: next === 'horizontal' ? '已切换为上下水平分栏' : '已切换为左右垂直分栏', type: 'info' });
  };

  const handleSplitRatioChange = (ratio: number) => {
    const clamped = Math.max(0.2, Math.min(0.8, ratio));
    setSplitRatio(clamped);
    localStorage.setItem('novelite_split_ratio', String(clamped));
  };

  const handleSplitterPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      if (splitDirection === 'vertical') {
        const offset = moveEvt.clientX - rect.left;
        const mainRatio = offset / rect.width;
        handleSplitRatioChange(1 - mainRatio);
      } else {
        const offset = moveEvt.clientY - rect.top;
        const mainRatio = offset / rect.height;
        handleSplitRatioChange(1 - mainRatio);
      }
    };

    const onPointerUp = () => {
      setIsDraggingSplitter(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

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
    pluginManager.registerPlugin(FocusModePlugin);
    pluginManager.registerPlugin(DialogueHighlighterPlugin);
    pluginManager.registerPlugin(ScratchpadPlugin);
    pluginManager.registerPlugin(WordCounterPlugin);
    pluginManager.registerPlugin(QuickExporterPlugin);
    pluginManager.registerPlugin(EditorToolkitPlugin);
    pluginManager.registerPlugin(SplitViewPlugin);
    pluginManager.registerPlugin(SampleUserPlugin);

    // Initialize previously installed community and custom JS plugins
    dynamicPluginLoader.init();

    if (typewriterEnabled) {
      pluginManager.enablePlugin('plugin-typewriter');
    }
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
    ctx.setSetting('physicsMode', physicsMode);
    ctx.setSetting('luminescence', luminescence);
    ctx.setSetting('inlineSkew', inlineSkew);
    ctx.setSetting('streamPreset', streamPreset);
    ctx.setSetting('streamHeadColor', streamHeadColor);
    ctx.setSetting('streamTailColor', streamTailColor);
  }, [cursorShape, cursorColor, cursorAnimationLength, cursorTrailSize, vfxMode, blinkMode, breatheCycle, speedMode, physicsMode, luminescence, inlineSkew, streamPreset, streamHeadColor, streamTailColor, theme]);

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
    ctx.setSetting('indentSize', indentSize);
    ctx.setSetting('kinsokuStrictness', kinsokuStrictness);
    ctx.setSetting('punctuationHalt', punctuationHalt);
    ctx.setSetting('textAlignment', textAlignment);
    ctx.setSetting('letterSpacing', letterSpacing);
  }, [
    fontPreset,
    customFontName,
    fontSize,
    lineHeight,
    contentMaxWidth,
    horizontalPadding,
    paragraphSpacing,
    indentEnabled,
    indentSize,
    kinsokuStrictness,
    punctuationHalt,
    textAlignment,
    letterSpacing,
  ]);

  // Update typewriter settings into plugin manager
  useEffect(() => {
    const ctx = pluginManager.createPluginContext('plugin-typewriter');
    ctx.setSetting('enabled', typewriterEnabled);
    ctx.setSetting('anchorRatio', typewriterRatio);
    ctx.setSetting('speedMode', typewriterSpeed);
  }, [typewriterEnabled, typewriterRatio, typewriterSpeed]);

  useEffect(() => {
    const unsubToast = eventBus.on('show-toast', ({ message, type }: any) => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToast({ message, type });
      toastTimeoutRef.current = setTimeout(() => setToast(null), 2500);
    });

    const unsubTheme = eventBus.on('theme-changed', (newId: any) => {
      if (THEMES[newId]) {
        setThemeId(newId);
        localStorage.setItem('novelite_theme_id', newId);
      }
    });

    const unsubVfx = eventBus.on('live-cursor:vfx-changed', (mode: any) => {
      if (mode) {
        setVfxMode(mode);
        localStorage.setItem('novelite_cursor_vfx_mode', mode);
      }
    });

    const unsubPhysics = eventBus.on('live-cursor:physics-changed', (mode: any) => {
      if (mode) {
        setPhysicsMode(mode);
        localStorage.setItem('novelite_cursor_physics_mode', mode);
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

    const unsubTypewriter = eventBus.on('plugin-setting-changed:plugin-typewriter', ({ key, value }: any) => {
      if (key === 'enabled' && typeof value === 'boolean') {
        setTypewriterEnabled(value);
        localStorage.setItem('novelite_typewriter_enabled', String(value));
      } else if (key === 'anchorRatio' && typeof value === 'number') {
        setTypewriterRatio(value);
        localStorage.setItem('novelite_typewriter_ratio', String(value));
      } else if (key === 'speedMode' && typeof value === 'string') {
        setTypewriterSpeed(value as any);
        localStorage.setItem('novelite_typewriter_speed', value);
      }
    });

    const unsubSplitView = eventBus.on('split-view:toggle', () => {
      setIsSplitViewOpen((prev) => !prev);
    });

    return () => {
      unsubToast();
      unsubTheme();
      unsubVfx();
      unsubPhysics();
      unsubTypo();
      unsubTypewriter();
      unsubSplitView();
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
          const targetId = cmd.pluginId || cmd.id;
          const ctx = pluginManager.getPluginContext(targetId) || pluginManager.createPluginContext(targetId);
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

  const handleChangeIndentSize = (size: '2em' | '1em' | '3em' | '0') => {
    setIndentSize(size);
    localStorage.setItem('novelite_indent_size', size);
  };

  const handleChangeKinsoku = (val: 'strict' | 'loose' | 'native') => {
    setKinsokuStrictness(val);
    localStorage.setItem('novelite_kinsoku_strictness', val);
  };

  const handleTogglePunctuationHalt = () => {
    setPunctuationHalt((prev) => {
      const next = !prev;
      localStorage.setItem('novelite_punctuation_halt', String(next));
      return next;
    });
  };

  const handleChangeTextAlignment = (align: 'justify' | 'left') => {
    setTextAlignment(align);
    localStorage.setItem('novelite_text_alignment', align);
  };

  const handleChangeLetterSpacing = (val: number) => {
    setLetterSpacing(val);
    setDebouncedStorage('novelite_letter_spacing', String(val));
  };

  const debounceTimerRef = useRef<Record<string, number>>({});
  const setDebouncedStorage = (key: string, value: string) => {
    if (debounceTimerRef.current[key]) {
      clearTimeout(debounceTimerRef.current[key]);
    }
    debounceTimerRef.current[key] = window.setTimeout(() => {
      localStorage.setItem(key, value);
    }, 200);
  };

  const handleChangeAnimationLength = (len: number) => {
    setCursorAnimationLength(len);
    setDebouncedStorage('novelite_cursor_anim_length', String(len));
  };

  const handleChangeTrailSize = (size: number) => {
    setCursorTrailSize(size);
    setDebouncedStorage('novelite_cursor_trail_size', String(size));
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
    setDebouncedStorage('novelite_cursor_breathe_cycle', String(cycle));
  };

  const handleChangeSpeedMode = (mode: 'gentle' | 'balanced' | 'snappy') => {
    setSpeedMode(mode);
    localStorage.setItem('novelite_cursor_speed_mode', mode);
  };

  const handleChangePhysicsMode = (mode: 'fluid' | 'ribbon' | 'quantum') => {
    setPhysicsMode(mode);
    localStorage.setItem('novelite_cursor_physics_mode', mode);
  };

  const handleChangeLuminescence = (val: boolean) => {
    setLuminescence(val);
    localStorage.setItem('novelite_cursor_luminescence', String(val));
  };

  const handleChangeInlineSkew = (val: boolean) => {
    setInlineSkew(val);
    localStorage.setItem('novelite_cursor_inline_skew', String(val));
  };

  const handleChangeStreamPreset = (preset: 'theme' | 'cyan-violet' | 'ice-blue' | 'emerald' | 'amber-rose' | 'sakura' | 'mono' | 'custom') => {
    setStreamPreset(preset);
    localStorage.setItem('novelite_cursor_stream_preset', preset);
  };

  const handleChangeStreamHeadColor = (color: string) => {
    setStreamHeadColor(color);
    localStorage.setItem('novelite_cursor_stream_head', color);
  };

  const handleChangeStreamTailColor = (color: string) => {
    setStreamTailColor(color);
    localStorage.setItem('novelite_cursor_stream_tail', color);
  };

  const handleChangeBackgroundEffect = (eff: BackgroundEffect) => {
    setBackgroundEffect(eff);
    localStorage.setItem('novelite_bg_effect', eff);
  };

  const handleChangeBackgroundIntensity = (intensity: number) => {
    setBackgroundIntensity(intensity);
    localStorage.setItem('novelite_bg_intensity', String(intensity));
  };

  const handleChangeCustomImage = (img: string | null) => {
    setCustomImage(img);
    if (img) {
      localStorage.setItem('novelite_custom_image', img);
    } else {
      localStorage.removeItem('novelite_custom_image');
    }
  };

  const handleChangeCustomImageRaw = (raw: string | null) => {
    setCustomImageRaw(raw);
    if (raw) {
      localStorage.setItem('novelite_custom_image_raw', raw);
    } else {
      localStorage.removeItem('novelite_custom_image_raw');
    }
  };

  const handleChangeCropParams = (params: CropParams | null) => {
    setCropParams(params);
    if (params) {
      localStorage.setItem('novelite_crop_params', JSON.stringify(params));
    } else {
      localStorage.removeItem('novelite_crop_params');
    }
  };

  const handleChangeCustomImageBlur = (blur: number) => {
    setCustomImageBlur(blur);
    setDebouncedStorage('novelite_custom_image_blur', String(blur));
  };

  const handleChangeCustomImageDim = (dim: number) => {
    setCustomImageDim(dim);
    setDebouncedStorage('novelite_custom_image_dim', String(dim));
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

  const handleToggleTypewriter = (enabled: boolean) => {
    setTypewriterEnabled(enabled);
    localStorage.setItem('novelite_typewriter_enabled', String(enabled));
    if (enabled) {
      pluginManager.enablePlugin('plugin-typewriter');
    }
    const ctx = pluginManager.createPluginContext('plugin-typewriter');
    ctx.setSetting('enabled', enabled);
    eventBus.emit('editor-extensions-changed');
  };

  const handleChangeTypewriterRatio = (ratio: number) => {
    setTypewriterRatio(ratio);
    localStorage.setItem('novelite_typewriter_ratio', String(ratio));
  };

  const handleChangeTypewriterSpeed = (speed: 'gentle' | 'balanced' | 'snappy' | 'instant') => {
    setTypewriterSpeed(speed);
    localStorage.setItem('novelite_typewriter_speed', speed);
  };

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden font-sans select-none antialiased"
      style={{
        backgroundColor: theme.colors.bg,
        color: theme.colors.text,
      }}
    >
      {/* 🌟 Top Seamless Titlebar (Zero background seam, Horizon Island Capsule & Windows 3 Controls) */}
      {!isZenMode && (
        <TopSeamlessTitlebar
          theme={theme}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
      )}

      {/* Main Area / Split Layout Host */}
      <div
        ref={splitContainerRef}
        className={`relative flex flex-1 overflow-hidden ${
          isSplitViewOpen && splitDirection === 'horizontal' ? 'flex-col' : 'flex-row'
        } ${isDraggingSplitter ? (splitDirection === 'vertical' ? 'select-none cursor-col-resize' : 'select-none cursor-row-resize') : ''}`}
      >
        {/* Main Editor Canvas (Dynamic Size & Full Literary Canvas) */}
        <main
          className="relative flex flex-col overflow-hidden transition-[width,height] duration-75 ease-out"
          style={{
            width: isSplitViewOpen && splitDirection === 'vertical' ? `${(1 - splitRatio) * 100}%` : '100%',
            height: isSplitViewOpen && splitDirection === 'horizontal' ? `${(1 - splitRatio) * 100}%` : '100%',
            minWidth: isSplitViewOpen && splitDirection === 'vertical' ? '280px' : undefined,
            minHeight: isSplitViewOpen && splitDirection === 'horizontal' ? '200px' : undefined,
          }}
        >
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
            customImage={customImage}
            customImageBlur={customImageBlur}
            customImageDim={customImageDim}
            fontPreset={fontPreset}
            customFontName={customFontName}
            fontSize={fontSize}
            lineHeight={lineHeight}
            contentMaxWidth={contentMaxWidth}
            spotlightMode={spotlightMode}
            zeroChrome={zeroChrome}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onToggleSidebar={() => {
              const next = !isSidebarOpen;
              setIsSidebarOpen(next);
              localStorage.setItem('novelite_sidebar_open', String(next));
            }}
            isSidebarOpen={isSidebarOpen}
          />
        </main>

        {/* Resizable Hairline Splitter Divider */}
        {isSplitViewOpen && (
          <div
            onPointerDown={handleSplitterPointerDown}
            onDoubleClick={() => handleSplitRatioChange(0.5)}
            title="按住拖拽调节分屏比例，双击恢复 50:50 对等"
            className={`group flex items-center justify-center relative z-30 transition-colors ${
              splitDirection === 'vertical'
                ? 'w-2 -mx-1 cursor-col-resize hover:bg-cyan-400/20 active:bg-cyan-400/40'
                : 'h-2 -my-1 cursor-row-resize hover:bg-cyan-400/20 active:bg-cyan-400/40'
            }`}
          >
            <div
              className={`bg-white/10 group-hover:bg-cyan-400 transition-colors rounded-full ${
                splitDirection === 'vertical' ? 'w-[1.5px] h-10' : 'h-[1.5px] w-10'
              }`}
            />
          </div>
        )}

        {/* Split View Secondary Pane (Right/Bottom Pane) */}
        {isSplitViewOpen && (
          <div
            style={{
              width: splitDirection === 'vertical' ? `${splitRatio * 100}%` : '100%',
              height: splitDirection === 'horizontal' ? `${splitRatio * 100}%` : '100%',
              minWidth: splitDirection === 'vertical' ? '280px' : undefined,
              minHeight: splitDirection === 'horizontal' ? '200px' : undefined,
            }}
            className="flex flex-col relative overflow-hidden"
          >
            <SplitViewPane
              isOpen={isSplitViewOpen}
              onClose={() => setIsSplitViewOpen(false)}
              theme={theme}
              direction={splitDirection}
              onToggleDirection={handleToggleSplitDirection}
              splitRatio={splitRatio}
              onChangeSplitRatio={handleSplitRatioChange}
              fontPreset={fontPreset}
              fontSize={fontSize}
              lineHeight={lineHeight}
            />
          </div>
        )}
      </div>

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
        physicsMode={physicsMode}
        onChangePhysicsMode={handleChangePhysicsMode}
        luminescence={luminescence}
        onChangeLuminescence={handleChangeLuminescence}
        inlineSkew={inlineSkew}
        onChangeInlineSkew={handleChangeInlineSkew}
        streamPreset={streamPreset}
        onChangeStreamPreset={handleChangeStreamPreset}
        streamHeadColor={streamHeadColor}
        onChangeStreamHeadColor={handleChangeStreamHeadColor}
        streamTailColor={streamTailColor}
        onChangeStreamTailColor={handleChangeStreamTailColor}
        backgroundEffect={backgroundEffect}
        onChangeBackgroundEffect={handleChangeBackgroundEffect}
        backgroundIntensity={backgroundIntensity}
        onChangeBackgroundIntensity={handleChangeBackgroundIntensity}
        customImage={customImage}
        onChangeCustomImage={handleChangeCustomImage}
        customImageRaw={customImageRaw}
        onChangeCustomImageRaw={handleChangeCustomImageRaw}
        cropParams={cropParams}
        onChangeCropParams={handleChangeCropParams}
        customImageBlur={customImageBlur}
        onChangeCustomImageBlur={handleChangeCustomImageBlur}
        customImageDim={customImageDim}
        onChangeCustomImageDim={handleChangeCustomImageDim}
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
        indentSize={indentSize}
        onChangeIndentSize={handleChangeIndentSize}
        kinsokuStrictness={kinsokuStrictness}
        onChangeKinsoku={handleChangeKinsoku}
        punctuationHalt={punctuationHalt}
        onTogglePunctuationHalt={handleTogglePunctuationHalt}
        textAlignment={textAlignment}
        onChangeTextAlignment={handleChangeTextAlignment}
        letterSpacing={letterSpacing}
        onChangeLetterSpacing={handleChangeLetterSpacing}
        spotlightMode={spotlightMode}
        onSelectSpotlightMode={handleSelectSpotlightMode}
        zeroChrome={zeroChrome}
        onToggleZeroChrome={handleToggleZeroChrome}
        typewriterEnabled={typewriterEnabled}
        onToggleTypewriter={handleToggleTypewriter}
        typewriterRatio={typewriterRatio}
        onChangeTypewriterRatio={handleChangeTypewriterRatio}
        typewriterSpeed={typewriterSpeed}
        onChangeTypewriterSpeed={handleChangeTypewriterSpeed}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
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
    </div>
  );
};
