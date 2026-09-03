import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { eventBus } from './core/events/EventBus';
import { projectStore, countWordsFast } from './core/storage/ProjectStore';
import type { BackgroundEffect } from './components/editor/EditorBackground';
import { Command, Settings } from 'lucide-react';

// Import Consolidated Core Plugins (Grounded & High Cohesion)
import { ChineseTypographyPlugin } from './plugins/chinese-typography';
import { ImmersionPlugin } from './plugins/immersion';
import { NovelFilesPlugin } from './plugins/novel-files';
import { BackgroundAtmospherePlugin } from './plugins/background-atmosphere';
import { LiveCursorPlugin } from './plugins/live-cursor';
import { SplitViewPlugin } from './plugins/split-view';
import { KeymapPlugin } from './plugins/keymap';
import { KeymapCheatsheetModal } from './plugins/keymap/KeymapCheatsheetModal';
import { useGlobalKeymap } from './core/keymap/useGlobalKeymap';

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
  const [editorTextColor, setEditorTextColor] = useState<string>(() => {
    return localStorage.getItem('novelite_editor_text_color') || 'auto';
  });
  const [uiAccentColor, setUiAccentColor] = useState<string>(() => {
    return localStorage.getItem('novelite_ui_accent_color') || 'auto';
  });
  const [dialogueColor, setDialogueColor] = useState<string>(() => {
    return localStorage.getItem('novelite_dialogue_color') || 'auto';
  });
  const [dialogueEnabled, setDialogueEnabled] = useState<boolean>(() => {
    return localStorage.getItem('novelite_dialogue_enabled') !== 'false';
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
  const [isSplitViewOpen, setIsSplitViewOpen] = useState<boolean>(() => {
    return localStorage.getItem('novelite_split_open') === 'true';
  });
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

  const [secondaryChapterId, setSecondaryChapterId] = useState<string | null>(() => {
    const stored = localStorage.getItem('novelite_split_secondary_chapter');
    if (stored) return stored;
    const project = projectStore.getProject();
    const active = projectStore.getActiveChapter();
    if (project && active) {
      const allChaps: { id: string }[] = [];
      project.volumes.forEach((v) => allChaps.push(...v.chapters));
      const idx = allChaps.findIndex((c) => c.id === active.id);
      if (idx > 0) return allChaps[idx - 1].id;
      if (idx === 0 && allChaps.length > 1) return allChaps[1].id;
    }
    return active?.id || null;
  });

  const secondaryChapterIdRef = useRef(secondaryChapterId);
  useEffect(() => {
    secondaryChapterIdRef.current = secondaryChapterId;
  }, [secondaryChapterId]);

  const handleSwapPanes = useCallback(() => {
    const primaryChap = projectStore.getActiveChapter();
    const secId = secondaryChapterIdRef.current;
    if (!primaryChap || !secId || primaryChap.id === secId) return;

    const oldPrimaryId = primaryChap.id;
    const oldSecId = secId;

    setSecondaryChapterId(oldPrimaryId);
    localStorage.setItem('novelite_split_secondary_chapter', oldPrimaryId);
    projectStore.setActiveChapter(oldSecId);
    eventBus.emit('show-toast', { message: '左右/上下分屏章节已对调', type: 'info' });
  }, []);

  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // 🌟 Global Unified Keymap Capture Engine
  useGlobalKeymap();

  const [hudStats, setHudStats] = useState<{ title: string; wordCount: number; isSaving: boolean }>(() => {
    const chap = projectStore.getActiveChapter();
    return {
      title: chap?.title || '未命名章节',
      wordCount: chap ? countWordsFast(chap.content) : 0,
      isSaving: false,
    };
  });

  const [toast, setToast] = useState<{ message: string; type?: string } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  useEffect(() => {
    pluginManager.registerPlugin(ChineseTypographyPlugin);
    pluginManager.registerPlugin(ImmersionPlugin);
    pluginManager.registerPlugin(NovelFilesPlugin);
    pluginManager.registerPlugin(BackgroundAtmospherePlugin);
    pluginManager.registerPlugin(LiveCursorPlugin);
    pluginManager.registerPlugin(SplitViewPlugin);
    pluginManager.registerPlugin(KeymapPlugin);

    // Initialize previously installed community and custom JS plugins
    dynamicPluginLoader.init();
  }, []);

  const effectiveAccent = (uiAccentColor && uiAccentColor !== 'auto') ? uiAccentColor : theme.colors.accent;

  const effectiveDialogueColor = !dialogueEnabled
    ? 'inherit'
    : (dialogueColor && dialogueColor !== 'auto')
      ? dialogueColor
      : (!theme.isDark
          ? (theme.id === 'paper-parchment' ? '#c95738' : '#292524')
          : (effectiveAccent || '#8b5cf6'));

  // 🌟 Universal Theme Tokens Injection on documentElement
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-bg', theme.colors.bg);
    root.style.setProperty('--theme-bg-secondary', theme.colors.bgSecondary);
    root.style.setProperty('--theme-bg-hover', theme.colors.bgHover);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-muted', theme.colors.textMuted);
    root.style.setProperty('--theme-border', theme.colors.border);
    root.style.setProperty('--theme-accent', effectiveAccent);
    root.style.setProperty('--theme-accent-glow', `${effectiveAccent}40`);
    root.style.setProperty('--theme-cursor', theme.colors.cursor);
    root.style.setProperty('--theme-selection', theme.colors.selection);
    root.style.setProperty('--theme-editor-bg', theme.colors.editorBg);
    root.style.setProperty(
      '--theme-editor-text',
      editorTextColor !== 'auto' && editorTextColor ? editorTextColor : theme.colors.editorText
    );
    root.style.setProperty('--theme-statusbar-bg', theme.colors.statusbarBg);
    root.style.setProperty('--theme-statusbar-text', theme.colors.statusbarText);
    root.style.setProperty('--novelite-dialogue-color', effectiveDialogueColor);
    root.setAttribute('data-theme', theme.id);
    root.setAttribute('data-theme-mode', theme.isDark ? 'dark' : 'light');
    root.style.colorScheme = theme.isDark ? 'dark' : 'light';
  }, [theme, editorTextColor, effectiveAccent, effectiveDialogueColor, dialogueEnabled]);

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

  // Update typography settings into plugin manager
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
    const ctx = pluginManager.createPluginContext('plugin-immersion');
    ctx.setSetting('typewriterEnabled', typewriterEnabled);
    ctx.setSetting('typewriterAnchorRatio', typewriterRatio);
    ctx.setSetting('typewriterSpeedMode', typewriterSpeed);
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

    const unsubFontSize = eventBus.on('font-size-changed', (newSize: any) => {
      if (typeof newSize === 'number') {
        setFontSize(newSize);
        localStorage.setItem('novelite_font_size', String(newSize));
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

    const unsubImmersion = eventBus.on('plugin-setting-changed:plugin-immersion', ({ key, value }: any) => {
      if (key === 'typewriterEnabled' && typeof value === 'boolean') {
        setTypewriterEnabled(value);
        localStorage.setItem('novelite_typewriter_enabled', String(value));
      } else if (key === 'typewriterAnchorRatio' && typeof value === 'number') {
        setTypewriterRatio(value);
        localStorage.setItem('novelite_typewriter_ratio', String(value));
      } else if (key === 'typewriterSpeedMode' && typeof value === 'string') {
        setTypewriterSpeed(value as any);
        localStorage.setItem('novelite_typewriter_speed', value);
      } else if (key === 'dialogueEnabled' && typeof value === 'boolean') {
        setDialogueEnabled(value);
        localStorage.setItem('novelite_dialogue_enabled', String(value));
      } else if (key === 'focusEnabled' && typeof value === 'boolean') {
        setSpotlightMode(value ? 'paragraph' : 'none');
        localStorage.setItem('novelite_spotlight_mode', value ? 'paragraph' : 'none');
      }
    });

    const unsubBgEffect = eventBus.on('background-effect-changed', (effect: any) => {
      if (effect && typeof effect === 'string') {
        setBackgroundEffect(effect as BackgroundEffect);
        localStorage.setItem('novelite_bg_effect', effect);
      }
    });

    const unsubBgPlugin = eventBus.on('plugin-setting-changed:plugin-background-atmosphere', ({ key, value }: any) => {
      if (key === 'effect' && typeof value === 'string') {
        setBackgroundEffect(value as BackgroundEffect);
        localStorage.setItem('novelite_bg_effect', value);
      } else if (key === 'intensity' && typeof value === 'number') {
        setBackgroundIntensity(value);
        localStorage.setItem('novelite_bg_intensity', String(value));
      }
    });

    const unsubTyping = eventBus.on('typing-state-changed', (typing: boolean) => {
      setIsTyping(Boolean(typing));
      if (typing) {
        setHudStats((prev) => ({ ...prev, isSaving: true }));
      } else {
        const chap = projectStore.getActiveChapter();
        setHudStats({
          title: chap?.title || '未命名章节',
          wordCount: chap ? countWordsFast(chap.content) : 0,
          isSaving: false,
        });
      }
    });

    const unsubChapSelect = eventBus.on('chapter-selected', (chap: any) => {
      if (chap) {
        setHudStats({
          title: chap.title || '未命名章节',
          wordCount: countWordsFast(chap.content || ''),
          isSaving: false,
        });
      }
    });

    const unsubChapContent = eventBus.on('chapter-content-updated', (data: any) => {
      const targetChapId = data?.chapterId || data?.id;
      const active = projectStore.getActiveChapter();
      if (active && targetChapId && active.id === targetChapId && typeof data?.content === 'string') {
        setHudStats({
          title: active.title || '未命名章节',
          wordCount: countWordsFast(data.content),
          isSaving: false,
        });
      }
    });

    return () => {
      unsubToast();
      unsubTheme();
      unsubVfx();
      unsubPhysics();
      unsubFontSize();
      unsubTypo();
      unsubImmersion();
      unsubBgEffect();
      unsubBgPlugin();
      unsubTyping();
      unsubChapSelect();
      unsubChapContent();
    };
  }, []);

  useEffect(() => {
    const unsubToggleSplit = eventBus.on('split-view:toggle', () => {
      setIsSplitViewOpen((prev) => {
        const next = !prev;
        localStorage.setItem('novelite_split_open', String(next));
        eventBus.emit('show-toast', {
          message: next ? '已开启对照分屏 (Alt+S)' : '已关闭对照分屏',
          type: 'info',
        });
        return next;
      });
    });

    const unsubSwap = eventBus.on('split-view:swap', handleSwapPanes);

    const unsubCheatsheet = eventBus.on('keymap:open-cheatsheet', () => {
      setIsCheatsheetOpen(true);
    });

    const unsubCmdPalette = eventBus.on('command-palette:toggle', () => {
      setIsCommandPaletteOpen((prev) => !prev);
    });

    const unsubZen = eventBus.on('zen-mode:toggle', () => {
      setIsZenMode((prev) => !prev);
    });

    const unsubSettings = eventBus.on('settings:open', () => {
      setIsSettingsOpen(true);
    });

    const unsubCloseAll = eventBus.on('modal:close-all', () => {
      setIsCheatsheetOpen(false);
      setIsCommandPaletteOpen(false);
      setIsSettingsOpen(false);
    });

    return () => {
      unsubToggleSplit();
      unsubSwap();
      unsubCheatsheet();
      unsubCmdPalette();
      unsubZen();
      unsubSettings();
      unsubCloseAll();
    };
  }, [handleSwapPanes]);

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

  const handleChangeEditorTextColor = (color: string) => {
    setEditorTextColor(color);
    localStorage.setItem('novelite_editor_text_color', color);
  };

  const handleChangeUiAccentColor = (color: string) => {
    setUiAccentColor(color);
    localStorage.setItem('novelite_ui_accent_color', color);
  };

  const handleChangeDialogueColor = (color: string) => {
    setDialogueColor(color);
    localStorage.setItem('novelite_dialogue_color', color);
    const ctx = pluginManager.getPluginContext('plugin-immersion');
    if (color === 'auto') {
      ctx?.setSetting('dialogueColorPreset', 'theme');
    } else {
      ctx?.setSetting('dialogueColorPreset', 'custom');
      ctx?.setSetting('dialogueCustomColor', color);
    }
    eventBus.emit('editor-extensions-changed');
  };

  const handleToggleDialogue = () => {
    setDialogueEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('novelite_dialogue_enabled', String(next));
      const ctx = pluginManager.getPluginContext('plugin-immersion');
      ctx?.setSetting('dialogueEnabled', next);
      eventBus.emit('editor-extensions-changed');
      return next;
    });
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
    const ctx = pluginManager.getPluginContext('plugin-background-atmosphere');
    ctx?.setSetting('effect', eff);
  };

  const handleChangeBackgroundIntensity = (intensity: number) => {
    setBackgroundIntensity(intensity);
    localStorage.setItem('novelite_bg_intensity', String(intensity));
    const ctx = pluginManager.getPluginContext('plugin-background-atmosphere');
    ctx?.setSetting('intensity', intensity);
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
          isSplitViewOpen={isSplitViewOpen}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
      )}

      {/* Main Area / Symmetrical Split Layout Host */}
      <div
        ref={splitContainerRef}
        className={`relative flex flex-1 overflow-hidden ${
          isSplitViewOpen && splitDirection === 'horizontal' ? 'flex-col' : 'flex-row'
        } ${isDraggingSplitter ? (splitDirection === 'vertical' ? 'select-none cursor-col-resize' : 'select-none cursor-row-resize') : ''}`}
      >

        {/* Primary Editor Pane (Left / Top) */}
        <main
          className={`relative flex flex-col overflow-hidden ${
            isDraggingSplitter ? 'transition-none' : 'transition-[width,height] duration-75 ease-out'
          } z-10 ${isSplitViewOpen ? 'pt-10' : ''}`}
          style={{
            width: isSplitViewOpen && splitDirection === 'vertical' ? `${(1 - splitRatio) * 100}%` : '100%',
            height: isSplitViewOpen && splitDirection === 'horizontal' ? `${(1 - splitRatio) * 100}%` : '100%',
            minWidth: isSplitViewOpen && splitDirection === 'vertical' ? '280px' : undefined,
            minHeight: isSplitViewOpen && splitDirection === 'horizontal' ? '200px' : undefined,
          }}
        >
          <NovelEditor
            paneId="primary"
            showPaneHeader={isSplitViewOpen}
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
            physicsMode={physicsMode}
            luminescence={luminescence}
            inlineSkew={inlineSkew}
            streamPreset={streamPreset}
            streamHeadColor={streamHeadColor}
            streamTailColor={streamTailColor}
            backgroundEffect={backgroundEffect}
            backgroundIntensity={backgroundIntensity}
            customImage={customImage}
            customImageBlur={customImageBlur}
            customImageDim={customImageDim}
            fontPreset={fontPreset}
            customFontName={customFontName}
            fontSize={fontSize}
            lineHeight={lineHeight}
            editorTextColor={editorTextColor}
            contentMaxWidth={contentMaxWidth}
            spotlightMode={spotlightMode}
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

        {/* Secondary Symmetrical Editor Pane (Right / Bottom) */}
        {isSplitViewOpen && (
          <section
            style={{
              width: splitDirection === 'vertical' ? `${splitRatio * 100}%` : '100%',
              height: splitDirection === 'horizontal' ? `${splitRatio * 100}%` : '100%',
              minWidth: splitDirection === 'vertical' ? '280px' : undefined,
              minHeight: splitDirection === 'horizontal' ? '200px' : undefined,
            }}
            className={`relative flex flex-col overflow-hidden ${
              isDraggingSplitter ? 'transition-none' : 'transition-[width,height] duration-75 ease-out'
            } z-10 ${splitDirection === 'vertical' ? 'pt-10' : ''}`}
          >
            <NovelEditor
              paneId="secondary"
              boundChapterId={secondaryChapterId || undefined}
              onSelectChapter={(id) => {
                setSecondaryChapterId(id);
                localStorage.setItem('novelite_split_secondary_chapter', id);
              }}
              showPaneHeader={true}
              onClosePane={() => setIsSplitViewOpen(false)}
              onSwapPanes={handleSwapPanes}
              onToggleSplitDirection={handleToggleSplitDirection}
              splitDirection={splitDirection}
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
              physicsMode={physicsMode}
              luminescence={luminescence}
              inlineSkew={inlineSkew}
              streamPreset={streamPreset}
              streamHeadColor={streamHeadColor}
              streamTailColor={streamTailColor}
              backgroundEffect={backgroundEffect}
              backgroundIntensity={backgroundIntensity}
              customImage={customImage}
              customImageBlur={customImageBlur}
              customImageDim={customImageDim}
              fontPreset={fontPreset}
              customFontName={customFontName}
              fontSize={fontSize}
              lineHeight={lineHeight}
              editorTextColor={editorTextColor}
              contentMaxWidth={contentMaxWidth}
              spotlightMode={spotlightMode}
            />
          </section>
        )}
      </div>

      {/* 🌟 Universal SOTA Dynamic Island Floating Micro-HUD (Single & Split View Compatible) */}
      {!isZenMode && zeroChrome && (
        <div
          className={`fixed bottom-6 right-8 z-40 flex items-center gap-3 px-4 py-2 rounded-full border shadow-2xl backdrop-blur-2xl select-none text-[11.5px] font-mono transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] ${
            isTyping ? 'opacity-0 translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'
          }`}
          style={{
            backgroundColor: `${theme.colors.bgSecondary}cc`,
            borderColor: `${theme.colors.border}90`,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px ${theme.colors.accent}20`,
            color: theme.colors.textMuted,
          }}
        >
          {/* Status Orb with pulse ring */}
          <div className="relative flex items-center justify-center">
            <span
              title={hudStats.isSaving ? '正在保存...' : '本地实时保存状态'}
              className={`h-2 w-2 rounded-full shrink-0 ${
                hudStats.isSaving
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
              }`}
            />
          </div>

          {/* Word Count */}
          <div className="flex items-center gap-1 font-semibold tracking-tight" style={{ color: theme.colors.text }}>
            <span>{hudStats.wordCount.toLocaleString()} 字</span>
          </div>

          <span className="opacity-25 select-none">|</span>

          {/* Reading Time */}
          <span className="opacity-60 text-[10.5px]">
            约 {Math.max(1, Math.ceil(hudStats.wordCount / 350))} 分钟
          </span>

          <span className="opacity-25 select-none">|</span>

          {/* Active Chapter Title */}
          <span
            className="opacity-85 max-w-[140px] truncate text-[11px] font-medium"
            title={hudStats.title}
            style={{ color: theme.colors.text }}
          >
            {hudStats.title}
          </span>

          {/* Micro Action Dock (Clean 2-button: Command Palette & Settings) */}
          <div className="flex items-center gap-1 pl-1.5 border-l ml-0.5" style={{ borderColor: `${theme.colors.border}60` }}>
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              title="命令面板 (Ctrl+P / ⌘K)"
              className="p-1 rounded-md opacity-60 hover:opacity-100 transition-all cursor-pointer"
              style={{ color: theme.colors.text }}
            >
              <Command className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              title="偏好设置 (Ctrl+, / ⌘,)"
              className="p-1 rounded-md opacity-60 hover:opacity-100 transition-all cursor-pointer"
              style={{ color: theme.colors.text }}
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

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
        onClose={() => {
          setIsCommandPaletteOpen(false);
          setTimeout(() => eventBus.emit('split-view:focus-pane', 'primary'), 40);
        }}
        theme={theme}
      />

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setTimeout(() => eventBus.emit('split-view:focus-pane', 'primary'), 40);
        }}
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
        editorTextColor={editorTextColor}
        onChangeEditorTextColor={handleChangeEditorTextColor}
        uiAccentColor={uiAccentColor}
        onChangeUiAccentColor={handleChangeUiAccentColor}
        dialogueColor={dialogueColor}
        onChangeDialogueColor={handleChangeDialogueColor}
        dialogueEnabledProp={dialogueEnabled}
        onToggleDialogueProp={handleToggleDialogue}
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

      {/* ⌨️ Hotkeys Cheatsheet & Keymap Manager Modal */}
      <KeymapCheatsheetModal
        isOpen={isCheatsheetOpen}
        onClose={() => setIsCheatsheetOpen(false)}
        theme={theme}
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
