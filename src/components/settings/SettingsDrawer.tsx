import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Palette,
  Type,
  RotateCcw,
  Image,
  Check,
  SlidersHorizontal,
  Layers,
  Upload,
  Crop,
  Trash2,
  Image as ImageIcon,
  Search,
  ChevronRight,
  Focus,
  FolderTree,
  AlignJustify,
  AlignLeft,
  Code2,
  Trash,
  RefreshCw,
  Keyboard,
  Columns,
  Edit2,
  AlertTriangle,
  FileText,
  Compass,
  BookOpen,
  Play,
  Globe,
} from 'lucide-react';
import type { Theme } from '../../core/themes/types';
import { THEMES } from '../../core/themes/themeDefinitions';
import { pluginManager } from '../../core/plugins/PluginManager';
import { dynamicPluginLoader } from '../../core/plugins/DynamicPluginLoader';
import { LiveCursorTestArena } from './LiveCursorTestArena';
import { ImageCropModal, type CropParams } from './ImageCropModal';
import type { BackgroundEffect } from '../editor/EditorBackground';
import type { FocusScope } from '../../plugins/immersion/focusExtension';
import { type DialogueColorPreset, DIALOGUE_COLOR_MAP } from '../../plugins/immersion/dialogueExtension';
import { eventBus } from '../../core/events/EventBus';
import { keymapRegistry } from '../../core/keymap/KeymapRegistry';
import type { KeybindingCategory, KeybindingItem } from '../../core/keymap/types';
import { useTranslation } from '../../core/i18n';
import { safeStorageSet } from '../../core/storage/safeStorage';



interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  onSelectTheme: (themeId: string) => void;
  // Font settings
  fontPreset: 'lxgw' | 'songti' | 'sans' | 'mono' | 'custom';
  onSelectFontPreset: (preset: 'lxgw' | 'songti' | 'sans' | 'mono' | 'custom') => void;
  customFontName: string;
  onChangeCustomFontName: (name: string) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  lineHeight: number;
  onChangeLineHeight: (height: number) => void;
  editorTextColor?: string;
  onChangeEditorTextColor?: (color: string) => void;
  uiAccentColor?: string;
  onChangeUiAccentColor?: (color: string) => void;
  dialogueColor?: string;
  onChangeDialogueColor?: (color: string) => void;
  dialogueEnabledProp?: boolean;
  onToggleDialogueProp?: () => void;
  contentMaxWidth: number;
  onChangeContentMaxWidth: (width: number) => void;
  horizontalPadding: number;
  onChangeHorizontalPadding: (pad: number) => void;
  paragraphSpacing: number;
  onChangeParagraphSpacing: (spacing: number) => void;
  indentEnabled: boolean;
  onToggleIndent: () => void;
  indentSize?: '2em' | '1em' | '3em' | '0';
  onChangeIndentSize?: (size: '2em' | '1em' | '3em' | '0') => void;
  kinsokuStrictness?: 'strict' | 'loose' | 'native';
  onChangeKinsoku?: (val: 'strict' | 'loose' | 'native') => void;
  punctuationHalt?: boolean;
  onTogglePunctuationHalt?: () => void;
  textAlignment?: 'justify' | 'left';
  onChangeTextAlignment?: (align: 'justify' | 'left') => void;
  letterSpacing?: number;
  onChangeLetterSpacing?: (spacing: number) => void;
  spotlightMode?: 'none' | 'paragraph';
  onSelectSpotlightMode?: (mode: 'none' | 'paragraph') => void;
  zeroChrome: boolean;
  onToggleZeroChrome: () => void;
  // Cursor settings
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
  physicsMode?: 'fluid' | 'ribbon' | 'quantum';
  onChangePhysicsMode?: (mode: 'fluid' | 'ribbon' | 'quantum') => void;
  luminescence?: boolean;
  onChangeLuminescence?: (val: boolean) => void;
  inlineSkew?: boolean;
  onChangeInlineSkew?: (val: boolean) => void;
  streamPreset?: any;
  onChangeStreamPreset?: (preset: any) => void;
  streamHeadColor?: string;
  onChangeStreamHeadColor?: (color: string) => void;
  streamTailColor?: string;
  onChangeStreamTailColor?: (color: string) => void;
  // Background settings
  backgroundEffect: BackgroundEffect;
  onChangeBackgroundEffect: (effect: BackgroundEffect) => void;
  backgroundIntensity: number;
  onChangeBackgroundIntensity: (intensity: number) => void;
  customImage: string | null;
  onChangeCustomImage: (img: string | null) => void;
  customImageRaw: string | null;
  onChangeCustomImageRaw: (raw: string | null) => void;
  cropParams: CropParams | null;
  onChangeCropParams: (crop: CropParams | null) => void;
  customImageBlur: number;
  onChangeCustomImageBlur: (blur: number) => void;
  customImageDim: number;
  onChangeCustomImageDim: (dim: number) => void;
  // Typewriter settings
  typewriterEnabled?: boolean;
  onToggleTypewriter?: (enabled: boolean) => void;
  typewriterRatio?: number;
  onChangeTypewriterRatio?: (ratio: number) => void;
  typewriterSpeed?: 'gentle' | 'balanced' | 'snappy' | 'instant';
  onChangeTypewriterSpeed?: (speed: 'gentle' | 'balanced' | 'snappy' | 'instant') => void;
}

const PLUGIN_RICH_INFO: Record<
  string,
  {
    category: string;
    categoryEn?: string;
    nameEn?: string;
    descEn?: string;
    icon: any;
    targetTab?: 'cursor' | 'background' | 'typography' | 'themes' | 'keymap';
    author?: string;
  }
> = {
  'plugin-chinese-typography': {
    category: '排版系统',
    categoryEn: 'Typography',
    nameEn: 'Chinese & Western Typography',
    descEn: 'Typesetting toolkit: punctuation spacing, first-line indent, and paired quote normalization.',
    icon: Type,
    author: 'hirovel',
    targetTab: 'typography',
  },
  'plugin-immersion': {
    category: '沉浸写作',
    categoryEn: 'Immersion',
    nameEn: 'Immersion Writing',
    descEn: 'Focus spotlight dimming, typewriter scrolling, and dialogue quotation mark highlights.',
    icon: Focus,
    author: 'hirovel',
    targetTab: 'typography',
  },
  'plugin-novel-files': {
    category: '大纲与文件',
    categoryEn: 'Outline & Files',
    nameEn: 'Novel Volumes & Chapter Outline',
    descEn: 'Volume and chapter structure management, real-time metrics, and full TXT export.',
    icon: FolderTree,
    author: 'hirovel',
  },
  'plugin-background-atmosphere': {
    category: '背景与氛围',
    categoryEn: 'Atmosphere',
    nameEn: 'Background Atmosphere',
    descEn: 'Custom wallpapers, Gaussian blur, dimming overlays, and atmospheric background effects.',
    icon: Image,
    author: 'hirovel',
    targetTab: 'background',
  },
  'plugin-live-cursor': {
    category: '灵感光标',
    categoryEn: 'Live Cursor',
    nameEn: 'Inspiration Live Cursor',
    descEn: 'Physics-driven smooth cursor trails, particle sparks, and breathing idle animation.',
    icon: Sparkles,
    author: 'hirovel',
    targetTab: 'cursor',
  },
  'plugin-split-view': {
    category: '分屏对照',
    categoryEn: 'Split View',
    nameEn: 'Dual Split View',
    descEn: 'Side-by-side or stacked dual editor panes for cross-chapter reference writing.',
    icon: Columns,
    author: 'hirovel',
  },
  'plugin-keymap': {
    category: '快捷键管理',
    categoryEn: 'Keymap',
    nameEn: 'Keymap Manager',
    descEn: 'Full-keyboard shortcut router, custom key recording, and floating cheatsheet.',
    icon: Keyboard,
    author: 'hirovel',
    targetTab: 'keymap',
  },
  'plugin-global-search': {
    category: '全局搜索',
    categoryEn: 'Search',
    nameEn: 'Global Full-text Search',
    descEn: 'Full-text keyword indexing and chapter jump across your entire novel manuscript.',
    icon: Search,
    author: 'hirovel',
  },
  'plugin-novel-import': {
    category: '稿件导入',
    categoryEn: 'Import',
    nameEn: 'Manuscript Importer',
    descEn: 'Import external TXT/Markdown novels with smart volume & chapter outline detection.',
    icon: Upload,
    author: 'hirovel',
  },
  'plugin-auto-updater': {
    category: '系统更新',
    categoryEn: 'System',
    nameEn: 'Auto Updater',
    descEn: 'Check for novelite version updates and release announcements automatically.',
    icon: RefreshCw,
    author: 'hirovel',
  },
};

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
  editorTextColor = 'auto',
  onChangeEditorTextColor,
  uiAccentColor = 'auto',
  onChangeUiAccentColor,
  dialogueColor = 'auto',
  onChangeDialogueColor,
  dialogueEnabledProp,
  onToggleDialogueProp,
  contentMaxWidth,
  onChangeContentMaxWidth,
  horizontalPadding,
  onChangeHorizontalPadding,
  paragraphSpacing,
  onChangeParagraphSpacing,
  indentEnabled,
  onToggleIndent,
  indentSize: _indentSize = '2em',
  onChangeIndentSize: _onChangeIndentSize,
  kinsokuStrictness = 'strict',
  onChangeKinsoku,
  punctuationHalt = true,
  onTogglePunctuationHalt,
  textAlignment = 'justify',
  onChangeTextAlignment,
  letterSpacing = 0.02,
  onChangeLetterSpacing,
  zeroChrome,
  onToggleZeroChrome,
  typewriterEnabled = false,
  onToggleTypewriter,
  typewriterRatio = 0.38,
  onChangeTypewriterRatio,
  typewriterSpeed = 'balanced',
  onChangeTypewriterSpeed,
}) => {
  const [activeTab, setActiveTab] = useState<'cursor' | 'background' | 'typography' | 'themes' | 'plugins' | 'keymap'>('cursor');
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const { t, language, setLanguage } = useTranslation();

  const [pluginSearch, setPluginSearch] = useState<string>('');
  const [, setPluginsVersion] = useState<number>(0);

  useEffect(() => {
    const unsub = pluginManager.subscribe(() => {
      setPluginsVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  const isChineseTypographyEnabled = pluginManager.isPluginEnabled('plugin-chinese-typography');
  const isImmersionEnabled = pluginManager.isPluginEnabled('plugin-immersion');
  const isLiveCursorEnabled = pluginManager.isPluginEnabled('plugin-live-cursor');
  const isBackgroundEnabled = pluginManager.isPluginEnabled('plugin-background-atmosphere');

  const [pluginFilter, setPluginFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [isRefreshingRegistry, setIsRefreshingRegistry] = useState<boolean>(false);
  const [isCustomScriptModalOpen, setIsCustomScriptModalOpen] = useState<boolean>(false);
  const [customScriptCode, setCustomScriptCode] = useState<string>(() => {
    const isEn = language === 'en';
    return isEn
      ? `// Novelite Custom Plugin Template
return {
  metadata: {
    id: 'plugin-my-custom-tool',
    name: 'My Custom Creative Tool',
    version: '1.0.0',
    description: 'Quickly insert plot notes and character memos',
    author: 'Custom Author',
  },
  init(ctx) {
    ctx.registerCommand({
      id: 'custom.insert-memo',
      title: 'Insert Creative Memo',
      shortcut: 'Alt+M',
      run(c) {
        c.insertText('\\n> [Plot Memo]: Plant foreshadowing here\\n');
        c.showToast('Creative memo inserted', 'success');
      }
    });
  }
};`
      : `// Novelite 自定义插件模板
return {
  metadata: {
    id: 'plugin-my-custom-tool',
    name: '我的自定义灵感工具',
    version: '1.0.0',
    description: '快捷插入常用伏笔标签与设定备忘',
    author: '自定义作者',
  },
  init(ctx) {
    ctx.registerCommand({
      id: 'custom.insert-memo',
      title: '插入灵感设定便签',
      shortcut: 'Alt+M',
      run(c) {
        c.insertText('\\n> 【设定备忘】：此处埋下伏笔\\n');
        c.showToast('已插入灵感便签', 'success');
      }
    });
  }
};`;
  });
  const [customScriptError, setCustomScriptError] = useState<string | null>(null);

  const handleRefreshRegistry = () => {
    setIsRefreshingRegistry(true);
    setTimeout(() => {
      setIsRefreshingRegistry(false);
      setPluginsVersion((v) => v + 1);
    }, 600);
  };

  const handleSaveAndRunCustomScript = () => {
    setCustomScriptError(null);
    const res = dynamicPluginLoader.executeAndRegisterCustomPlugin(customScriptCode);
    if (!res.success) {
      setCustomScriptError(res.error || (language === 'en' ? 'Execution error' : '执行出错'));
      return;
    }
    setIsCustomScriptModalOpen(false);
    setPluginsVersion((v) => v + 1);
  };

  // 🌟 Current Body Font Family Resolver for Live Typography Previews
  const currentFontFamily = useMemo(() => {
    const isEn = language === 'en';
    if (fontPreset === 'custom' && customFontName?.trim()) {
      return `"${customFontName.trim()}", "PingFang SC", "Microsoft YaHei", "微软雅黑", sans-serif`;
    }
    if (isEn) {
      switch (fontPreset) {
        case 'lxgw':
          return `"Georgia", "Baskerville", "Palatino Linotype", "Book Antiqua", "Times New Roman", serif`;
        case 'songti':
          return `"Garamond", "EB Garamond", "Times New Roman", "Baskerville", serif`;
        case 'mono':
          return `"Cascadia Code", "JetBrains Mono", Consolas, "Courier New", monospace`;
        case 'sans':
        default:
          return `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, Helvetica, Arial, sans-serif`;
      }
    }
    switch (fontPreset) {
      case 'lxgw':
        return `"LXGW WenKai Screen", "LXGW WenKai", "霞鹜文楷", "Kaiti SC", STKaiti, KaiTi, "楷体", serif`;
      case 'songti':
        return `"Source Han Serif SC", "思源宋体", "Noto Serif SC", "Songti SC", STSong, SimSun, "宋体", serif`;
      case 'mono':
        return `"Sarasa Mono SC", "等距更纱黑体", "Cascadia Code", "JetBrains Mono", Consolas, "Courier New", monospace`;
      case 'sans':
      default:
        return `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", "Noto Sans SC", sans-serif`;
    }
  }, [fontPreset, customFontName, language]);

  // 🌟 Keymap Management State
  const [keymapSearch, setKeymapSearch] = useState<string>('');
  const [keymapCategory, setKeymapCategory] = useState<KeybindingCategory | 'all'>('all');
  const [keymapItems, setKeymapItems] = useState<KeybindingItem[]>(() => keymapRegistry.getAll());
  const [recordingKeymapId, setRecordingKeymapId] = useState<string | null>(null);
  const [recordedKeymapStr, setRecordedKeymapStr] = useState<string>('');
  const [conflictKeymapItem, setConflictKeymapItem] = useState<KeybindingItem | null>(null);

  useEffect(() => {
    const handleKeymapUpdate = () => {
      setKeymapItems(keymapRegistry.getAll());
    };
    const unsub = keymapRegistry.subscribe(handleKeymapUpdate);
    const unsubBus = eventBus.on('keymap:changed', handleKeymapUpdate);
    return () => {
      unsub();
      unsubBus();
    };
  }, []);

  // Key Recording Listener in Settings Drawer
  useEffect(() => {
    if (!recordingKeymapId) return;

    const handleRecordKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingKeymapId(null);
        setRecordedKeymapStr('');
        setConflictKeymapItem(null);
        return;
      }

      if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
        return;
      }

      const keyStr = keymapRegistry.normalizeEvent(e);
      if (keyStr) {
        setRecordedKeymapStr(keyStr);
        const conflicts = keymapRegistry.findConflicts(keyStr, recordingKeymapId);
        setConflictKeymapItem(conflicts.length > 0 ? conflicts[0] : null);
      }
    };

    window.addEventListener('keydown', handleRecordKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleRecordKeyDown, { capture: true });
    };
  }, [recordingKeymapId]);

  const filteredKeymapItems = useMemo(() => {
    return keymapItems.filter((item) => {
      const matchCat = keymapCategory === 'all' || item.category === keymapCategory;
      if (!matchCat) return false;
      if (!keymapSearch.trim()) return true;
      const q = keymapSearch.toLowerCase().trim();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        Boolean(item.titleEn && item.titleEn.toLowerCase().includes(q)) ||
        Boolean(item.descriptionEn && item.descriptionEn.toLowerCase().includes(q)) ||
        item.currentKey.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [keymapItems, keymapCategory, keymapSearch]);

  const handleSaveKeymapRecording = (id: string) => {
    if (recordedKeymapStr) {
      keymapRegistry.updateBinding(id, recordedKeymapStr);
      eventBus.emit('show-toast', {
        message: language === 'en' ? `Shortcut updated to ${recordedKeymapStr}` : `快捷键已修改为 ${recordedKeymapStr}`,
        type: 'success',
      });
    }
    setRecordingKeymapId(null);
    setRecordedKeymapStr('');
    setConflictKeymapItem(null);
  };

  const handleResetSingleKeymap = (id: string) => {
    keymapRegistry.resetBinding(id);
    eventBus.emit('show-toast', {
      message: language === 'en' ? 'Restored default shortcut' : '已恢复默认按键',
      type: 'info',
    });
    setRecordingKeymapId(null);
    setRecordedKeymapStr('');
    setConflictKeymapItem(null);
  };

  const [focusEnabled, setFocusEnabled] = useState<boolean>(() => {
    return pluginManager.getPluginContext('plugin-immersion')?.getSetting<boolean>('focusEnabled', false) ?? false;
  });
  const [focusScope, setFocusScope] = useState<FocusScope>(() => {
    return pluginManager.getPluginContext('plugin-immersion')?.getSetting<FocusScope>('focusScope', 'paragraph') ?? 'paragraph';
  });
  const [focusDimOpacity, setFocusDimOpacity] = useState<number>(() => {
    return pluginManager.getPluginContext('plugin-immersion')?.getSetting<number>('focusDimOpacity', 0.28) ?? 0.28;
  });

  const handleToggleFocusMode = () => {
    const ctx = pluginManager.getPluginContext('plugin-immersion');
    const next = !focusEnabled;
    setFocusEnabled(next);
    ctx?.setSetting('focusEnabled', next);
    eventBus.emit('editor-extensions-changed');
    setPluginsVersion((v) => v + 1);
  };

  const handleChangeFocusScope = (scope: FocusScope) => {
    const ctx = pluginManager.getPluginContext('plugin-immersion');
    setFocusScope(scope);
    ctx?.setSetting('focusScope', scope);
    eventBus.emit('editor-extensions-changed');
    setPluginsVersion((v) => v + 1);
  };

  const handleChangeFocusDimOpacity = (opacity: number) => {
    const ctx = pluginManager.getPluginContext('plugin-immersion');
    setFocusDimOpacity(opacity);
    ctx?.setSetting('focusDimOpacity', opacity);
    eventBus.emit('editor-extensions-changed');
    setPluginsVersion((v) => v + 1);
  };

  const accentColor = (uiAccentColor && uiAccentColor !== 'auto') ? uiAccentColor : theme.colors.accent;
  // High-contrast text accent for light mode
  const textAccentColor = (!theme.isDark && (accentColor === '#38bdf8' || accentColor === '#06b6d4' || accentColor === '#22d3ee'))
    ? '#0284c7'
    : accentColor;

  const [dialogueEnabled, setDialogueEnabled] = useState<boolean>(() => {
    return pluginManager.getPluginContext('plugin-immersion')?.getSetting<boolean>('dialogueEnabled', true) ?? true;
  });
  const isDialogueActive = dialogueEnabledProp !== undefined ? dialogueEnabledProp : dialogueEnabled;

  const [dialogueColorPreset, setDialogueColorPreset] = useState<DialogueColorPreset>(() => {
    return pluginManager.getPluginContext('plugin-immersion')?.getSetting<DialogueColorPreset>('dialogueColorPreset', 'theme') ?? 'theme';
  });
  const [dialogueHighlightThoughts, setDialogueHighlightThoughts] = useState<boolean>(() => {
    return pluginManager.getPluginContext('plugin-immersion')?.getSetting<boolean>('dialogueHighlightThoughts', true) ?? true;
  });

  const [dialogueCustomColor, setDialogueCustomColor] = useState<string>(() => {
    return pluginManager.getPluginContext('plugin-immersion')?.getSetting<string>('dialogueCustomColor', '#c95738') ?? '#c95738';
  });

  // 🌟 Synchronize with live plugin settings whenever drawer opens or external settings change
  useEffect(() => {
    const syncFromPlugins = () => {
      const immCtx = pluginManager.getPluginContext('plugin-immersion');
      if (immCtx) {
        setFocusEnabled(immCtx.getSetting<boolean>('focusEnabled', false));
        setFocusScope(immCtx.getSetting<FocusScope>('focusScope', 'paragraph'));
        setFocusDimOpacity(immCtx.getSetting<number>('focusDimOpacity', 0.28));
        setDialogueEnabled(immCtx.getSetting<boolean>('dialogueEnabled', true));
        setDialogueColorPreset(immCtx.getSetting<DialogueColorPreset>('dialogueColorPreset', 'theme'));
        setDialogueHighlightThoughts(immCtx.getSetting<boolean>('dialogueHighlightThoughts', true));
        setDialogueCustomColor(immCtx.getSetting<string>('dialogueCustomColor', '#c95738'));
      }
    };

    if (isOpen) {
      syncFromPlugins();
    }

    const unsubImmersion = eventBus.on('plugin-setting-changed:plugin-immersion', syncFromPlugins);
    const unsubExt = eventBus.on('editor-extensions-changed', syncFromPlugins);

    return () => {
      unsubImmersion();
      unsubExt();
    };
  }, [isOpen]);

  const handleToggleDialogue = () => {
    if (onToggleDialogueProp) {
      onToggleDialogueProp();
    } else {
      const ctx = pluginManager.getPluginContext('plugin-immersion');
      const next = !dialogueEnabled;
      setDialogueEnabled(next);
      ctx?.setSetting('dialogueEnabled', next);
      eventBus.emit('editor-extensions-changed');
      setPluginsVersion((v) => v + 1);
    }
  };

  const handleChangeDialogueColorPreset = (preset: DialogueColorPreset) => {
    setDialogueColorPreset(preset);
    if (preset === 'theme') {
      onChangeDialogueColor?.('auto');
    } else if (preset in DIALOGUE_COLOR_MAP) {
      onChangeDialogueColor?.(DIALOGUE_COLOR_MAP[preset as keyof typeof DIALOGUE_COLOR_MAP].hex);
    }
    const ctx = pluginManager.getPluginContext('plugin-immersion');
    ctx?.setSetting('dialogueColorPreset', preset);
    eventBus.emit('editor-extensions-changed');
    setPluginsVersion((v) => v + 1);
  };

  const handleChangeDialogueCustomColor = (color: string) => {
    setDialogueCustomColor(color);
    setDialogueColorPreset('custom');
    onChangeDialogueColor?.(color);
    const ctx = pluginManager.getPluginContext('plugin-immersion');
    ctx?.setSetting('dialogueColorPreset', 'custom');
    ctx?.setSetting('dialogueCustomColor', color);
    eventBus.emit('editor-extensions-changed');
    setPluginsVersion((v) => v + 1);
  };

  const handleToggleDialogueThoughts = () => {
    const ctx = pluginManager.getPluginContext('plugin-immersion');
    const next = !dialogueHighlightThoughts;
    setDialogueHighlightThoughts(next);
    ctx?.setSetting('dialogueHighlightThoughts', next);
    eventBus.emit('editor-extensions-changed');
    setPluginsVersion((v) => v + 1);
  };

  const handleCleanChapterPhysicalIndent = () => {
    eventBus.emit('editor-action:format-chinese');
  };

  const handleRemoveChapterPhysicalIndent = () => {
    eventBus.emit('editor-action:remove-indents');
  };

  const handleCleanChapterPunctuation = () => {
    eventBus.emit('editor-action:clean-punctuation');
  };

  const handleUninstallCustomPlugin = (id: string) => {
    dynamicPluginLoader.uninstallCustomPlugin(id);
    setPluginsVersion((v) => v + 1);
  };

  React.useEffect(() => {
    const unsub = pluginManager.subscribe(() => {
      setPluginsVersion((v) => v + 1);
    });
    return () => unsub();
  }, []);

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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [isOpen, onClose]);

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
    onChangePhysicsMode?.('fluid');
    onChangeLuminescence?.(true);
    onChangeStreamPreset?.('cyan-violet');
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
      title: t('settings.tabs.cursor'),
      desc: isLiveCursorEnabled ? t('settings.tabDesc.cursor') : t('settings.tabs.cursor') + ' (' + t('common.disabled') + ')',
      onReset: handleResetCursor,
    },
    background: {
      title: t('settings.tabs.background'),
      desc: isBackgroundEnabled ? t('settings.tabDesc.background') : t('settings.tabs.background') + ' (' + t('common.disabled') + ')',
      onReset: handleResetBackground,
    },
    typography: {
      title: t('settings.tabs.typography'),
      desc: t('settings.tabDesc.typography'),
      onReset: handleResetTypography,
    },
    themes: {
      title: t('settings.tabs.themes'),
      desc: t('settings.tabDesc.themes'),
    },
    plugins: {
      title: t('settings.tabs.plugins'),
      desc: t('settings.tabDesc.plugins'),
    },
    keymap: {
      title: t('settings.tabs.keymap'),
      desc: t('settings.tabDesc.keymap'),
    },
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${
        isAnimatingIn ? 'opacity-100 backdrop-blur-md' : 'opacity-0 backdrop-blur-none'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-4xl h-[88vh] rounded-3xl border shadow-2xl flex overflow-hidden transition-all duration-300 transform ${
          isAnimatingIn ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        style={{
          backgroundColor: theme.colors.bg,
          borderColor: `${theme.colors.border}80`,
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px ${theme.colors.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 🌟 Left Sidebar Navigation */}
        <div
          className="w-56 border-r flex flex-col justify-between shrink-0 select-none p-4"
          style={{ backgroundColor: theme.colors.bgSecondary, borderColor: `${theme.colors.border}60` }}
        >
          <div className="space-y-6">
            {/* Logo / Header */}
            <div className="px-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight" style={{ color: theme.colors.text }}>
                  {t('settings.title')}
                </span>
              </div>
              <span className="text-[10px] opacity-40 font-mono tracking-wider uppercase">
                {t('settings.preferences')}
              </span>
            </div>

            {/* Nav Tabs */}
            <div className="space-y-1">
              {(
                [
                  { id: 'cursor', label: t('settings.tabs.cursor'), icon: Sparkles },
                  { id: 'background', label: t('settings.tabs.background'), icon: Image },
                  { id: 'typography', label: t('settings.tabs.typography'), icon: Type },
                  { id: 'themes', label: t('settings.tabs.themes'), icon: Palette },
                  { id: 'plugins', label: t('settings.tabs.plugins'), icon: SlidersHorizontal },
                  { id: 'keymap', label: t('settings.tabs.keymap'), icon: Keyboard },
                ] as const
              ).map((tab) => {
                const isCur = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                      isCur ? 'shadow-sm font-semibold' : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                    }`}
                    style={{
                      backgroundColor: isCur ? `${accentColor}18` : 'transparent',
                      color: isCur ? textAccentColor : theme.colors.text,
                      border: isCur ? `1px solid ${accentColor}35` : '1px solid transparent',
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: isCur ? textAccentColor : theme.colors.textMuted }} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Version & Shortcuts */}
          <div className="px-3 py-2 border-t space-y-3" style={{ borderColor: `${theme.colors.border}40` }}>
            {/* 🌐 界面语言切换器 (Language Switcher) */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-[11px] mb-1.5 opacity-70">
                <span className="flex items-center gap-1.5 font-medium" style={{ color: theme.colors.text }}>
                  <Globe className="h-3.5 w-3.5 opacity-70" />
                  <span>{t('settings.language')}</span>
                </span>
              </div>
              <div
                className="grid grid-cols-2 p-0.5 rounded-xl border text-[11px] font-medium"
                style={{ backgroundColor: theme.colors.bg, borderColor: `${theme.colors.border}80` }}
              >
                <button
                  onClick={() => setLanguage('zh')}
                  className={`py-1 rounded-lg transition-all cursor-pointer text-center ${
                    language === 'zh' ? 'shadow-xs font-bold' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: language === 'zh' ? `${accentColor}25` : 'transparent',
                    color: language === 'zh' ? textAccentColor : theme.colors.text,
                  }}
                >
                  简体中文
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`py-1 rounded-lg transition-all cursor-pointer text-center ${
                    language === 'en' ? 'shadow-xs font-bold' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: language === 'en' ? `${accentColor}25` : 'transparent',
                    color: language === 'en' ? textAccentColor : theme.colors.text,
                  }}
                >
                  English
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono opacity-50">
              <span>Novelite</span>
              <span>v1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  eventBus.emit('open-update-modal');
                }}
                className="hover:underline text-[10.5px] cursor-pointer hover:opacity-100 flex items-center gap-1 font-medium transition-opacity"
                style={{ color: textAccentColor }}
                title={language === 'en' ? 'GitHub Releases & Changelog' : 'GitHub 发行版与更新日志'}
              >
                <span>{t('settings.checkUpdates')}</span>
              </button>
            </div>
            <div className="space-y-1 text-[9.5px] font-mono opacity-40">
              <div className="flex justify-between">
                <span>{t('settings.closePanel')}</span>
                <kbd className="px-1 py-0.2 rounded bg-white/10">Esc</kbd>
              </div>
              <div className="flex justify-between">
                <span>{t('settings.commandCenter')}</span>
                <kbd className="px-1 py-0.2 rounded bg-white/10">Ctrl+P</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* 🌟 Right Detail Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-7 py-4 shrink-0"
            style={{ backgroundColor: theme.colors.bgSecondary, borderColor: `${theme.colors.border}60` }}
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
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition-all font-mono cursor-pointer"
                  style={{ color: theme.colors.accent }}
                  title={t('settings.resetTab')}
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{t('settings.resetTab')}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-xl p-1.5 opacity-60 hover:opacity-100 hover:bg-white/10 transition-all"
                style={{ color: theme.colors.text }}
                title={language === 'en' ? "Close settings (Esc)" : "关闭设置 (Esc)"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-7 space-y-6 text-xs">
            {/* TAB 1: CURSOR */}
            {activeTab === 'cursor' && (
              <div className="space-y-5">
                {!isLiveCursorEnabled && (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-xs">
                          {language === 'en' ? '"Live Cursor" plugin is disabled' : '「灵感光标」插件当前处于禁用状态'}
                        </span>
                        <p className="text-[10px] opacity-80 mt-0.5">
                          {language === 'en'
                            ? 'Smooth cursor dynamics, trails, and breathing animations are currently disabled in editor.'
                            : '平滑光标动力学跟随、拖尾与呼吸动效暂未在编辑器中生效。'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        pluginManager.enablePlugin('plugin-live-cursor');
                        setPluginsVersion((v) => v + 1);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition-all cursor-pointer shrink-0"
                    >
                      {language === 'en' ? 'Enable Plugin' : '一键启用插件'}
                    </button>
                  </div>
                )}
                <div className={!isLiveCursorEnabled ? 'opacity-40 pointer-events-none' : ''}>
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
                </div>
              </div>
            )}

            {/* TAB 2: BACKGROUND */}
            {activeTab === 'background' && (
              <div className="space-y-6">
                {!isBackgroundEnabled && (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-xs">
                          {language === 'en' ? '"Background Atmosphere" plugin is disabled' : '「背景与氛围」插件当前处于禁用状态'}
                        </span>
                        <p className="text-[10px] opacity-80 mt-0.5">
                          {language === 'en'
                            ? 'Custom background images, Gaussian blur, and dimming overlays are currently disabled in editor.'
                            : '自定义背景图片、高斯模糊与暗化遮罩暂未在编辑器中生效。'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        pluginManager.enablePlugin('plugin-background-atmosphere');
                        setPluginsVersion((v) => v + 1);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition-all cursor-pointer shrink-0"
                    >
                      {language === 'en' ? 'Enable Plugin' : '一键启用插件'}
                    </button>
                  </div>
                )}
                <div className={!isBackgroundEnabled ? 'opacity-40 pointer-events-none space-y-6' : 'space-y-6'}>
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
                          {language === 'en' ? 'Custom Background Image' : '自定义背景图片'}
                        </span>
                        <span className="text-[10px] opacity-40 ml-2 font-mono">
                          {customImage
                            ? (language === 'en' ? 'Custom background active' : '已设置自定义背景')
                            : (language === 'en' ? 'Upload and crop local image' : '支持上传并裁剪本地图片')}
                        </span>
                      </div>
                    </div>

                    {customImage && (
                      <div className="flex items-center gap-2">
                        {backgroundEffect !== 'custom' ? (
                          <button
                            onClick={() => onChangeBackgroundEffect('custom')}
                            className="px-2.5 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer"
                            style={{
                              backgroundColor: `${accentColor}20`,
                              color: textAccentColor,
                              borderColor: `${accentColor}40`,
                            }}
                          >
                            {language === 'en' ? 'Apply' : '应用背景'}
                          </button>
                        ) : (
                          <span
                            className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border"
                            style={{
                              backgroundColor: `${accentColor}18`,
                              color: textAccentColor,
                              borderColor: `${accentColor}35`,
                            }}
                          >
                            <Check className="h-3 w-3" />
                            <span>{language === 'en' ? 'Active' : '生效中'}</span>
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
                          <span>{language === 'en' ? 'Live Preview' : '效果预览'}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex-1 flex flex-wrap sm:flex-col gap-2 w-full">
                        <button
                          onClick={handleTriggerCropExisting}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono transition-all cursor-pointer"
                          style={{ color: theme.colors.text }}
                        >
                          <Crop className="h-3.5 w-3.5" style={{ color: textAccentColor }} />
                          <span>{language === 'en' ? 'Position & Crop' : '调整位置与裁剪'}</span>
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono transition-all cursor-pointer"
                          style={{ color: theme.colors.text }}
                        >
                          <Upload className="h-3.5 w-3.5 opacity-60" />
                          <span>{language === 'en' ? 'Change Image' : '更换图片'}</span>
                        </button>
                        <button
                          onClick={handleClearCustomImage}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/15 text-xs font-mono transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>{language === 'en' ? 'Remove Background' : '移除背景'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Empty Upload Dropzone */
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-all group cursor-pointer"
                      style={{
                        borderColor: `${theme.colors.border}80`,
                        backgroundColor: `${theme.colors.bgSecondary}50`,
                      }}
                    >
                      <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="h-5 w-5 opacity-60 group-hover:opacity-100 transition-colors" style={{ color: textAccentColor }} />
                      </div>
                      <span className="font-semibold text-xs transition-colors" style={{ color: theme.colors.text }}>
                        {language === 'en' ? 'Select or Upload Local Image' : '选择或上传本地图片'}
                      </span>
                      <span className="text-[10px] font-mono opacity-40" style={{ color: theme.colors.textMuted }}>
                        {language === 'en' ? 'Supports PNG, JPG, WebP formats' : '支持 PNG、JPG、WebP 格式'}
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
                            {language === 'en' ? 'Dimming Mask' : '暗化遮罩'}
                          </span>
                          <span className="font-mono text-[10px] font-bold" style={{ color: textAccentColor }}>
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
                          className="w-full cursor-pointer"
                          style={{ accentColor: accentColor }}
                        />
                      </div>

                      {/* Gaussian Blur */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-medium opacity-75" style={{ color: theme.colors.text }}>
                            {language === 'en' ? 'Gaussian Blur' : '模糊程度'}
                          </span>
                          <span className="font-mono text-[10px] font-bold" style={{ color: textAccentColor }}>
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
                          className="w-full cursor-pointer"
                          style={{ accentColor: accentColor }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 🌟 2. 预设背景效果 (Presets) */}
                <div>
                  <label className="font-medium text-xs opacity-80 block mb-2" style={{ color: theme.colors.text }}>
                    {language === 'en' ? 'Preset Background Atmosphere' : '预设背景效果'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[
                      { id: 'aurora', name: language === 'en' ? 'Aurora Glow' : '极光流云', desc: language === 'en' ? 'Soft flowing atmospheric gradient' : '柔和渐变流动氛围' },
                      { id: 'ruled', name: language === 'en' ? 'Ruled Manuscript' : '信纸横线', desc: language === 'en' ? 'Stationery lined page layout' : '文本真实对齐横线' },
                      { id: 'solid', name: language === 'en' ? 'Solid Studio' : '纯色背景', desc: language === 'en' ? 'Clean texture-free minimalist canvas' : '无纹理纯色底板' },
                    ].map((bg) => {
                      const isCur = backgroundEffect === bg.id;
                      return (
                        <button
                          key={bg.id}
                          onClick={() => onChangeBackgroundEffect(bg.id as any)}
                          className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                            isCur ? 'shadow-md font-semibold' : 'hover:border-white/20'
                          }`}
                          style={{
                            backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                            borderColor: isCur ? accentColor : theme.colors.border,
                            boxShadow: isCur ? `0 0 0 1.5px ${accentColor}` : undefined,
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
                        {language === 'en' ? 'Effect Intensity' : '效果强度'}
                      </span>
                      <span
                        className="font-mono font-bold px-2 py-0.5 rounded"
                        style={{ backgroundColor: `${accentColor}18`, color: textAccentColor }}
                      >
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
                      className="w-full cursor-pointer"
                      style={{ accentColor: accentColor }}
                    />
                    <div className="flex justify-between text-[10px] opacity-40 font-mono">
                      <span>{language === 'en' ? 'Subtle (10%)' : '较弱 (10%)'}</span>
                      <span>{language === 'en' ? 'Vivid (100%)' : '较强 (100%)'}</span>
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* TAB 3: TYPOGRAPHY */}
            {activeTab === 'typography' && (
              <div className="space-y-6">
                {language === 'zh' && !isChineseTypographyEnabled && (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-xs">{t('typography.pluginDisabledTitle')}</span>
                        <p className="text-[10px] opacity-80 mt-0.5">{t('typography.pluginDisabledDesc')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        pluginManager.enablePlugin('plugin-chinese-typography');
                        setPluginsVersion((v) => v + 1);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition-all cursor-pointer shrink-0"
                    >
                      {t('typography.enablePlugin')}
                    </button>
                  </div>
                )}

                <div className="space-y-6">
                <div>
                  <label className="font-semibold text-xs opacity-80 block mb-2" style={{ color: theme.colors.text }}>
                    {t('typography.fontsTitle')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'lxgw', name: t('typography.fonts.lxgwName'), desc: t('typography.fonts.lxgwDesc') },
                      { id: 'songti', name: t('typography.fonts.songtiName'), desc: t('typography.fonts.songtiDesc') },
                      { id: 'sans', name: t('typography.fonts.sansName'), desc: t('typography.fonts.sansDesc') },
                      { id: 'mono', name: t('typography.fonts.monoName'), desc: t('typography.fonts.monoDesc') },
                      { id: 'custom', name: t('typography.fonts.customName'), desc: t('typography.fonts.customDesc') },
                    ].map((f) => {
                      const isCur = fontPreset === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => onSelectFontPreset(f.id as any)}
                          className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all ${
                            isCur ? 'shadow-md font-semibold' : 'hover:border-white/20'
                          }`}
                          style={{
                            backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bg,
                            borderColor: isCur ? accentColor : theme.colors.border,
                            boxShadow: isCur ? `0 0 0 1.5px ${accentColor}` : undefined,
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
                    style={{ borderColor: accentColor, backgroundColor: `${theme.colors.bgHover}40` }}
                  >
                    <label className="block font-medium text-[11px]" style={{ color: theme.colors.text }}>
                      {t('typography.customFontLabel')}
                    </label>
                    <input
                      type="text"
                      value={customFontName}
                      onChange={(e) => onChangeCustomFontName(e.target.value)}
                      placeholder={t('typography.customFontPlaceholder')}
                      className="w-full rounded-xl border p-2.5 text-xs outline-none font-mono"
                      style={{
                        backgroundColor: theme.colors.bg,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      }}
                    />
                  </div>
                )}

                {/* 🌟 正文字体颜色定制 (Editor Font / Text Color Setting) */}
                <div
                  className="space-y-4 rounded-2xl border p-5"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: `${theme.colors.border}40` }}>
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                        {t('typography.textColorTitle')}
                      </span>
                      <div
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono"
                        style={{
                          backgroundColor: theme.colors.bgSecondary,
                          borderColor: `${theme.colors.border}80`,
                        }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border shadow-xs inline-block shrink-0"
                          style={{
                            backgroundColor: editorTextColor === 'auto' || !editorTextColor ? theme.colors.editorText : editorTextColor,
                            borderColor: 'rgba(255,255,255,0.25)',
                          }}
                        />
                        <span style={{ color: theme.colors.text }}>
                          {editorTextColor === 'auto' || !editorTextColor ? theme.colors.editorText : editorTextColor}
                        </span>
                        <span
                          className="text-[9px] px-1 py-0.2 rounded font-sans"
                          style={{
                            backgroundColor: editorTextColor === 'auto' || !editorTextColor ? `${accentColor}20` : 'rgba(255,255,255,0.06)',
                            color: editorTextColor === 'auto' || !editorTextColor ? textAccentColor : theme.colors.textMuted,
                          }}
                        >
                          {editorTextColor === 'auto' || !editorTextColor ? t('typography.followTheme') : t('typography.customColor')}
                        </span>
                      </div>
                    </div>

                    {/* Reset to Follow Theme Button */}
                    {Boolean(editorTextColor && editorTextColor !== 'auto') && (
                      <button
                        onClick={() => onChangeEditorTextColor?.('auto')}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono transition-all border cursor-pointer hover:opacity-100 opacity-80"
                        style={{
                          backgroundColor: theme.colors.bgSecondary,
                          borderColor: theme.colors.border,
                          color: textAccentColor,
                        }}
                      >
                        {t('typography.followTheme')}
                      </button>
                    )}
                  </div>

                  {/* Mode: Follow Theme Option + Presets + Custom Pipette */}
                  <div className="space-y-3">
                    {/* 实时正文段落字色预览条 */}
                    <div
                      className="p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors"
                      style={{
                        backgroundColor: theme.colors.editorBg || theme.colors.bgSecondary,
                        borderColor: `${theme.colors.border}60`,
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-[10px] opacity-50 shrink-0 font-mono">{t('typography.previewLabel')}</span>
                        <span
                          className="font-medium text-xs truncate tracking-wide"
                          style={{
                            fontFamily: currentFontFamily,
                            color: editorTextColor === 'auto' || !editorTextColor
                              ? theme.colors.editorText
                              : editorTextColor,
                          }}
                        >
                          {t('typography.previewText')}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono opacity-50 shrink-0">
                        {editorTextColor === 'auto' || !editorTextColor ? theme.colors.editorText : editorTextColor}
                      </span>
                    </div>

                    {/* Follow Theme Default Card */}
                    <button
                      onClick={() => onChangeEditorTextColor?.('auto')}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left ${
                        (editorTextColor === 'auto' || !editorTextColor)
                          ? 'shadow-xs font-semibold'
                          : 'opacity-70 hover:opacity-100 hover:border-white/20'
                      }`}
                      style={{
                        backgroundColor: (editorTextColor === 'auto' || !editorTextColor) ? `${accentColor}15` : theme.colors.bgSecondary,
                        borderColor: (editorTextColor === 'auto' || !editorTextColor) ? accentColor : theme.colors.border,
                        boxShadow: (editorTextColor === 'auto' || !editorTextColor) ? `0 0 0 1.5px ${accentColor}` : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-4 w-4 rounded-full border shadow-xs shrink-0"
                          style={{ backgroundColor: theme.colors.editorText, borderColor: theme.colors.border }}
                        />
                        <div>
                          <div className="text-xs font-medium" style={{ color: theme.colors.text }}>
                            {t('typography.followTheme')} ({language === 'en' ? theme.name : theme.nameZh})
                          </div>
                          <span className="text-[10px] opacity-50 font-mono" style={{ color: theme.colors.textMuted }}>
                            {language === 'en' ? 'Default: ' : '默认字色: '}{theme.colors.editorText}
                          </span>
                        </div>
                      </div>
                      {(editorTextColor === 'auto' || !editorTextColor) && (
                        <Check className="h-3.5 w-3.5" style={{ color: textAccentColor }} />
                      )}
                    </button>

                    {/* Curated Reading Swatches */}
                    <div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: '#ffffff', name: language === 'en' ? 'Pure White' : '纯白高光', desc: language === 'en' ? 'Clean & crisp' : '纯净清晰' },
                          { id: '#e1e3e8', name: language === 'en' ? 'Misty Silver' : '晨雾银灰', desc: language === 'en' ? 'Subtle elegance' : '素雅舒适' },
                          { id: '#d1d5db', name: language === 'en' ? 'Soft Gray' : '素灰微润', desc: language === 'en' ? 'Low glare' : '低眩光' },
                          { id: '#fef3c7', name: language === 'en' ? 'Warm Parchment' : '羊皮暖白', desc: language === 'en' ? 'Warm paper tone' : '温暖柔和' },
                          { id: '#bbf7d0', name: language === 'en' ? 'Eye Mint' : '护眼薄荷', desc: language === 'en' ? 'Calming green' : '青翠静心' },
                          { id: '#bae6fd', name: language === 'en' ? 'Frost Blue' : '冰霜微蓝', desc: language === 'en' ? 'Crisp & cool' : '冷峻透亮' },
                          { id: '#1c1917', name: language === 'en' ? 'Ink Black' : '水墨沉黑', desc: language === 'en' ? 'Light themes' : '浅色主题' },
                          { id: '#374151', name: language === 'en' ? 'Deep Slate' : '玄灰典雅', desc: language === 'en' ? 'Dark slate' : '墨韵灰调' },
                        ].map((swatch) => {
                          const isCur = editorTextColor === swatch.id;
                          return (
                            <button
                              key={swatch.id}
                              onClick={() => onChangeEditorTextColor?.(swatch.id)}
                              className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer text-left ${
                                isCur
                                  ? 'shadow-xs font-semibold'
                                  : 'hover:border-white/20'
                              }`}
                              style={{
                                backgroundColor: isCur ? `${accentColor}15` : theme.colors.bgSecondary,
                                borderColor: isCur ? accentColor : theme.colors.border,
                                boxShadow: isCur ? `0 0 0 1.5px ${accentColor}` : undefined,
                              }}
                            >
                              <span
                                className="h-3.5 w-3.5 rounded-full border shadow-xs shrink-0"
                                style={{ backgroundColor: swatch.id, borderColor: 'rgba(128,128,128,0.3)' }}
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-[11px] block truncate" style={{ color: theme.colors.text }}>
                                  {swatch.name}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Color Pipette */}
                    <div
                      className="flex items-center justify-between p-2.5 rounded-xl border"
                      style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editorTextColor === 'auto' || !editorTextColor ? theme.colors.editorText : editorTextColor}
                          onChange={(e) => onChangeEditorTextColor?.(e.target.value)}
                          className="h-6 w-6 rounded-lg border-0 cursor-pointer bg-transparent"
                        />
                        <span className="text-[11px] font-medium" style={{ color: theme.colors.text }}>
                          {language === 'en' ? 'Custom Text Color (Eyedropper)' : '自定义字色 (取色器)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editorTextColor === 'auto' || !editorTextColor ? theme.colors.editorText : editorTextColor}
                          onChange={(e) => onChangeEditorTextColor?.(e.target.value)}
                          placeholder="#ffffff"
                          className="w-20 px-2 py-0.5 rounded-lg border text-xs font-mono outline-none text-center"
                          style={{
                            backgroundColor: theme.colors.bg,
                            borderColor: theme.colors.border,
                            color: theme.colors.text,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🌟 对白引号“”特殊配色定制 (Dialogue Quotation Mark Color Setting) */}
                <div
                  className="space-y-4 rounded-2xl border p-5 transition-all"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: `${theme.colors.border}40` }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                          {language === 'en' ? 'Dialogue Quote Highlight Color' : '对白引号“”特殊配色'}
                        </span>
                        <span
                          className="text-[9.5px] px-2 py-0.5 rounded-full font-mono font-medium"
                          style={{
                            backgroundColor: `${accentColor}18`,
                            color: textAccentColor,
                            border: `1px solid ${accentColor}35`,
                          }}
                        >
                          {!isDialogueActive
                            ? (language === 'en' ? 'Highlight Disabled' : '已关闭高亮')
                            : (dialogueColor === 'auto' || !dialogueColor ? (language === 'en' ? 'Adaptive Theme' : '跟随主题自适应') : (language === 'en' ? 'Custom Color' : '自定义配色'))}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-60 mt-0.5" style={{ color: theme.colors.textMuted }}>
                        {language === 'en' ? 'Highlight character dialogues wrapped in quotation marks (“...”, \'...\', or 『...』)' : '设置双引号（“……”）与直角引号（『……』）内人物对白的高亮色彩'}
                      </p>
                    </div>

                    {/* 开关按钮 */}
                    <button
                      onClick={handleToggleDialogue}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer font-medium"
                      style={{
                        backgroundColor: isDialogueActive ? `${accentColor}20` : 'transparent',
                        color: isDialogueActive ? textAccentColor : theme.colors.textMuted,
                        border: `1px solid ${isDialogueActive ? `${accentColor}50` : theme.colors.border}`,
                      }}
                    >
                      {isDialogueActive && <Check className="h-3 w-3" />}
                      <span>{isDialogueActive ? (language === 'en' ? 'Enabled' : '已开启') : (language === 'en' ? 'Disabled' : '已关闭')}</span>
                    </button>
                  </div>

                  {isDialogueActive && (
                    <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                      {/* 实时微光效果预览条 */}
                      <div
                        className="p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs"
                        style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] opacity-50 shrink-0 font-mono">{language === 'en' ? 'Preview:' : '预览效果:'}</span>
                          <span
                            className="font-medium truncate"
                            style={{
                              color: (dialogueColor && dialogueColor !== 'auto')
                                ? dialogueColor
                                : (!theme.isDark ? (theme.id === 'paper-parchment' ? '#c95738' : '#292524') : accentColor),
                            }}
                          >
                            {language === 'en' ? '“The night was quiet, and the wind whispered softly.”' : '“喵喵喵，汪汪汪”'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono opacity-50 shrink-0">
                          {dialogueColor === 'auto' || !dialogueColor
                            ? (!theme.isDark ? (theme.id === 'paper-parchment' ? '#c95738' : '#292524') : `${accentColor}`)
                            : dialogueColor}
                        </span>
                      </div>

                      {/* 跟随当前主题卡片 */}
                      <button
                        onClick={() => handleChangeDialogueColorPreset('theme')}
                        className="w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left"
                        style={{
                          backgroundColor: (dialogueColor === 'auto' || !dialogueColor || dialogueColorPreset === 'theme')
                            ? `${accentColor}15`
                            : theme.colors.bgSecondary,
                          borderColor: (dialogueColor === 'auto' || !dialogueColor || dialogueColorPreset === 'theme')
                            ? accentColor
                            : theme.colors.border,
                          boxShadow: (dialogueColor === 'auto' || !dialogueColor || dialogueColorPreset === 'theme')
                            ? `0 0 0 1.5px ${accentColor}`
                            : undefined,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-4 w-4 rounded-full border shadow-xs shrink-0"
                            style={{
                              backgroundColor: !theme.isDark ? (theme.id === 'paper-parchment' ? '#c95738' : '#292524') : accentColor,
                              borderColor: theme.colors.border,
                            }}
                          />
                          <div>
                            <div className="text-xs font-medium" style={{ color: theme.colors.text }}>
                              {language === 'en' ? `Follow Active Theme (${theme.name})` : `跟随当前主题 (${theme.nameZh})`}
                            </div>
                            <span className="text-[10px] opacity-50 font-mono" style={{ color: theme.colors.textMuted }}>
                              {language === 'en' ? 'Automatically adjust dialogue contrast to match current theme' : '根据当前主题自动适配高对比对白字色'}
                            </span>
                          </div>
                        </div>
                        {(dialogueColor === 'auto' || !dialogueColor || dialogueColorPreset === 'theme') && (
                          <Check className="h-3.5 w-3.5" style={{ color: textAccentColor }} />
                        )}
                      </button>

                      {/* 预设对白字色 */}
                      <div>
                        <span className="text-[11px] opacity-75 block mb-2 font-medium" style={{ color: theme.colors.text }}>
                          {language === 'en' ? 'Preset Dialogue Palette' : '预设对白字色'}
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: '#c95738', name: language === 'en' ? 'Vermilion' : '朱红' },
                            { id: '#292524', name: language === 'en' ? 'Deep Charcoal' : '玄黑' },
                            { id: '#d97706', name: language === 'en' ? 'Amber Gold' : '琥珀' },
                            { id: '#0f766e', name: language === 'en' ? 'Forest Ink' : '墨绿' },
                            { id: '#1d4ed8', name: language === 'en' ? 'Sky Blue' : '霁蓝' },
                            { id: '#7c3aed', name: language === 'en' ? 'Lavender' : '淡紫' },
                            { id: '#ffffff', name: language === 'en' ? 'Pure White' : '纯白' },
                            { id: '#d4b0b5', name: language === 'en' ? 'Morandi Rose' : '莫兰迪粉' },
                          ].map((swatch) => {
                            const isCur = dialogueColor === swatch.id;
                            return (
                              <button
                                key={swatch.id}
                                onClick={() => handleChangeDialogueCustomColor(swatch.id)}
                                className="flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer text-left"
                                style={{
                                  backgroundColor: isCur ? `${swatch.id}20` : theme.colors.bgSecondary,
                                  borderColor: isCur ? swatch.id : theme.colors.border,
                                  boxShadow: isCur ? `0 0 0 1.5px ${swatch.id}` : undefined,
                                }}
                              >
                                <span
                                  className="h-3.5 w-3.5 rounded-full border shadow-xs shrink-0"
                                  style={{ backgroundColor: swatch.id, borderColor: 'rgba(128,128,128,0.3)' }}
                                />
                                <div className="min-w-0 flex-1">
                                  <span className="text-[11px] block truncate font-medium" style={{ color: theme.colors.text }}>
                                    {swatch.name}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 自定义拾色器与输入框 */}
                      <div
                        className="flex items-center justify-between p-2.5 rounded-xl border"
                        style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={dialogueCustomColor}
                            onChange={(e) => handleChangeDialogueCustomColor(e.target.value)}
                            className="h-6 w-6 rounded-lg border-0 cursor-pointer bg-transparent"
                          />
                          <span className="text-[11px] font-medium" style={{ color: theme.colors.text }}>
                            {language === 'en' ? 'Custom Dialogue Color' : '自定义对白颜色'}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={dialogueColor === 'auto' || !dialogueColor ? dialogueCustomColor : dialogueColor}
                          onChange={(e) => handleChangeDialogueCustomColor(e.target.value)}
                          placeholder="#c95738"
                          className="w-20 px-2 py-0.5 rounded border text-[11px] font-mono outline-none text-center font-bold"
                          style={{
                            backgroundColor: theme.colors.bg,
                            borderColor: theme.colors.border,
                            color: textAccentColor,
                          }}
                        />
                      </div>

                      {/* 心理独白括号小开关 */}
                      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: `${theme.colors.border}30` }}>
                        <div>
                          <span className="font-medium text-[11px]" style={{ color: theme.colors.text }}>
                            {t('typography.dialogueThoughtsTitle')}
                          </span>
                          <p className="text-[9.5px] opacity-40">{t('typography.dialogueThoughtsDesc')}</p>
                        </div>
                        <button
                          onClick={handleToggleDialogueThoughts}
                          className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-mono transition-all cursor-pointer font-medium"
                          style={{
                            backgroundColor: dialogueHighlightThoughts ? `${accentColor}20` : 'transparent',
                            color: dialogueHighlightThoughts ? textAccentColor : theme.colors.textMuted,
                            border: `1px solid ${dialogueHighlightThoughts ? `${accentColor}40` : theme.colors.border}`,
                          }}
                        >
                          {dialogueHighlightThoughts ? t('common.active') : t('common.inactive')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 🌟 1. 中文首行缩进定制 */}
                <div
                  className="space-y-4 rounded-2xl border p-5"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                          {t('typography.indentTitle')}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                          {t('typography.indentBadge')}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-50 mt-0.5">{t('typography.indentDesc')}</p>
                    </div>
                    <button
                      onClick={onToggleIndent}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all font-medium cursor-pointer"
                      style={{
                        backgroundColor: indentEnabled ? `${accentColor}20` : 'transparent',
                        color: indentEnabled ? textAccentColor : theme.colors.textMuted,
                        border: `1px solid ${indentEnabled ? `${accentColor}50` : theme.colors.border}`,
                      }}
                    >
                      {indentEnabled && <Check className="h-3 w-3" />}
                      <span>{indentEnabled ? t('common.active') : t('common.inactive')}</span>
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* 一键排版工具组 */}
                    <div
                      className="p-3.5 rounded-xl border space-y-2.5 transition-all"
                      style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                          {t('typography.cleanActionsTitle')}
                        </span>
                        <span className="text-[10px] opacity-40 font-mono">{t('typography.cleanChapterScope')}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          onClick={handleCleanChapterPhysicalIndent}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer shadow-xs"
                          style={{
                            backgroundColor: `${accentColor}18`,
                            color: textAccentColor,
                            borderColor: `${accentColor}40`,
                          }}
                          title={t('typography.indentTwoSpaces')}
                        >
                          <span>{t('typography.indentTwoSpaces')}</span>
                        </button>

                        <button
                          onClick={handleRemoveChapterPhysicalIndent}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all cursor-pointer shadow-xs"
                          style={{ color: theme.colors.text }}
                          title={t('typography.removeIndents')}
                        >
                          <span>{t('typography.removeIndents')}</span>
                        </button>

                        <button
                          onClick={handleCleanChapterPunctuation}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all cursor-pointer shadow-xs"
                          style={{ color: theme.colors.text }}
                          title={t('typography.cleanPunctuation')}
                        >
                          <span>{t('typography.cleanPunctuation')}</span>
                        </button>
                      </div>

                      <p className="text-[10px] opacity-50 leading-relaxed" style={{ color: theme.colors.textMuted }}>
                        {t('typography.indentTip')}
                      </p>
                    </div>

                    {indentEnabled && (
                      <div className="rounded-xl border border-white/5 p-3 bg-white/[0.02] space-y-1 text-[10.5px] animate-in fade-in duration-150">
                        <div className="flex items-center gap-1.5 font-medium" style={{ color: textAccentColor }}>
                          <Check className="h-3 w-3 shrink-0" />
                          <span>{t('typography.autoIndentActive')}</span>
                        </div>
                        <p className="opacity-60 text-[10px] leading-relaxed" style={{ color: theme.colors.textMuted }}>
                          {t('typography.autoIndentActiveDesc')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 🌟 2. 标点避头尾与微排版 (GB/T 15834 Kinsoku) */}
                <div
                  className="space-y-4 rounded-2xl border p-5"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                        {t('typography.kinsokuTitle')}
                      </span>
                      <p className="text-[10px] opacity-50">{t('typography.kinsokuDesc')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Kinsoku Strictness */}
                    <div>
                      <label className="text-[11px] opacity-75 block mb-1.5 font-medium" style={{ color: theme.colors.text }}>
                        {language === 'en' ? 'Line Break Mode' : '避头尾级别'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'strict', name: t('typography.strictKinsoku'), desc: t('typography.strictKinsokuDesc') },
                          { id: 'native', name: t('typography.nativeKinsoku'), desc: t('typography.nativeKinsokuDesc') },
                        ].map((k) => {
                          const isCur = (kinsokuStrictness || 'strict') === k.id;
                          return (
                            <button
                              key={k.id}
                              onClick={() => onChangeKinsoku?.(k.id as any)}
                              className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                isCur ? 'shadow-xs font-semibold' : 'hover:border-white/20'
                              }`}
                              style={{
                                backgroundColor: isCur ? `${accentColor}15` : theme.colors.bgSecondary,
                                borderColor: isCur ? accentColor : theme.colors.border,
                                boxShadow: isCur ? `0 0 0 1.5px ${accentColor}` : undefined,
                              }}
                            >
                              <span className="text-[11px]" style={{ color: theme.colors.text }}>
                                {k.name}
                              </span>
                              <span className="text-[9px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                                {k.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div>
                      <label className="text-[11px] opacity-75 block mb-1.5 font-medium" style={{ color: theme.colors.text }}>
                        {t('typography.alignmentTitle')}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'justify', name: t('typography.justify'), desc: t('typography.justifyDesc'), icon: AlignJustify },
                          { id: 'left', name: t('typography.alignLeft'), desc: t('typography.alignLeftDesc'), icon: AlignLeft },
                        ].map((a) => {
                          const isCur = (textAlignment || 'justify') === a.id;
                          const Icon = a.icon;
                          return (
                            <button
                              key={a.id}
                              onClick={() => onChangeTextAlignment?.(a.id as any)}
                              className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                isCur ? 'shadow-xs font-semibold' : 'hover:border-white/20'
                              }`}
                              style={{
                                backgroundColor: isCur ? `${accentColor}15` : theme.colors.bgSecondary,
                                borderColor: isCur ? accentColor : theme.colors.border,
                                boxShadow: isCur ? `0 0 0 1.5px ${accentColor}` : undefined,
                              }}
                            >
                              <div className="flex items-center gap-1.5">
                                <Icon className="h-3 w-3 opacity-70" />
                                <span className="text-[11px]" style={{ color: theme.colors.text }}>
                                  {a.name}
                                </span>
                              </div>
                              <span className="text-[9px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                                {a.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Punctuation Halt Compression Switch */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div>
                      <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                        {t('typography.haltTitle')}
                      </span>
                      <p className="text-[10px] opacity-50">{t('typography.haltDesc')}</p>
                    </div>
                    <button
                      onClick={onTogglePunctuationHalt}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all font-medium cursor-pointer"
                      style={{
                        backgroundColor: punctuationHalt !== false ? `${accentColor}20` : 'transparent',
                        color: punctuationHalt !== false ? textAccentColor : theme.colors.textMuted,
                        border: `1px solid ${punctuationHalt !== false ? `${accentColor}50` : theme.colors.border}`,
                      }}
                    >
                      {punctuationHalt !== false && <Check className="h-3 w-3" />}
                      <span>{punctuationHalt !== false ? t('common.active') : t('common.inactive')}</span>
                    </button>
                  </div>
                </div>

                {/* 🌟 3. 版心尺寸与微字距滑块矩阵 */}
                <div
                  className="space-y-4 rounded-2xl border p-5"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <span className="font-semibold text-xs block pb-2 border-b border-white/5" style={{ color: theme.colors.text }}>
                    {t('typography.metricsTitle')}
                  </span>

                  {/* Width & Margins */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.colors.text }}>{t('typography.maxWidth')}</span>
                        <span className="font-mono font-bold" style={{ color: textAccentColor }}>{contentMaxWidth}px</span>
                      </div>
                      <input
                        type="range"
                        min="560"
                        max="1080"
                        step="20"
                        value={contentMaxWidth}
                        onChange={(e) => onChangeContentMaxWidth(Number(e.target.value))}
                        className="w-full cursor-pointer"
                        style={{ accentColor: accentColor }}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.colors.text }}>{t('typography.pagePadding')}</span>
                        <span className="font-mono font-bold" style={{ color: textAccentColor }}>{horizontalPadding}px</span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="80"
                        step="4"
                        value={horizontalPadding}
                        onChange={(e) => onChangeHorizontalPadding(Number(e.target.value))}
                        className="w-full cursor-pointer"
                        style={{ accentColor: accentColor }}
                      />
                    </div>
                  </div>

                  {/* Font Size, Line Height, Paragraph Spacing & Letter Spacing */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-white/5">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.colors.text }}>{t('typography.fontSize')}</span>
                        <span className="font-mono font-bold" style={{ color: textAccentColor }}>{fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="14"
                        max="28"
                        step="1"
                        value={fontSize}
                        onChange={(e) => onChangeFontSize(Number(e.target.value))}
                        className="w-full cursor-pointer"
                        style={{ accentColor: accentColor }}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.colors.text }}>{t('typography.lineHeight')}</span>
                        <span className="font-mono font-bold" style={{ color: textAccentColor }}>{lineHeight}</span>
                      </div>
                      <input
                        type="range"
                        min="1.4"
                        max="2.6"
                        step="0.05"
                        value={lineHeight}
                        onChange={(e) => onChangeLineHeight(Number(e.target.value))}
                        className="w-full cursor-pointer"
                        style={{ accentColor: accentColor }}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.colors.text }}>{t('typography.paragraphSpacing')}</span>
                        <span className="font-mono font-bold" style={{ color: textAccentColor }}>{paragraphSpacing}em</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="1.5"
                        step="0.05"
                        value={paragraphSpacing}
                        onChange={(e) => onChangeParagraphSpacing(Number(e.target.value))}
                        className="w-full cursor-pointer"
                        style={{ accentColor: accentColor }}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.colors.text }}>{t('typography.letterSpacing')}</span>
                        <span className="font-mono font-bold" style={{ color: textAccentColor }}>{letterSpacing || 0.02}em</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="0.08"
                        step="0.005"
                        value={letterSpacing || 0.02}
                        onChange={(e) => onChangeLetterSpacing?.(Number(e.target.value))}
                        className="w-full cursor-pointer"
                        style={{ accentColor: accentColor }}
                      />
                    </div>
                  </div>
                </div>
                </div>

                {/* 🌟 沉浸写作套件 (Immersion Suite) */}
                {!isImmersionEnabled && (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-xs">{t('typography.immersionDisabledTitle')}</span>
                        <p className="text-[10px] opacity-80 mt-0.5">{t('typography.immersionDisabledDesc')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        pluginManager.enablePlugin('plugin-immersion');
                        setPluginsVersion((v) => v + 1);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition-all cursor-pointer shrink-0"
                    >
                      {t('cursor.enablePlugin')}
                    </button>
                  </div>
                )}

                <div className={!isImmersionEnabled ? 'opacity-40 pointer-events-none space-y-6' : 'space-y-6'}>
                {/* 🌟 顶栏打字沉浸联动设置 (Titlebar Auto-Hide Immersion) */}
                <div
                  className="space-y-3 rounded-2xl border p-4.5 transition-all"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                        {t('typography.titlebarImmersionTitle')}
                      </span>
                      <p className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                        {t('typography.titlebarImmersionDesc')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { id: 'fade_out', label: language === 'en' ? 'Fade on Typing' : '打字时隐藏', desc: language === 'en' ? 'Auto fades while typing' : '输入时自动隐藏' },
                      { id: 'dim', label: language === 'en' ? 'Dim on Typing' : '打字时变淡', desc: language === 'en' ? 'Subtle low opacity' : '保持微弱可见' },
                      { id: 'always_visible', label: language === 'en' ? 'Always Visible' : '始终显示', desc: language === 'en' ? 'Pinned visible' : '常驻显示' },
                    ].map((opt) => {
                      const cur = (localStorage.getItem('novelite_titlebar_behavior') as any) || 'fade_out';
                      const isSelected = cur === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            safeStorageSet('novelite_titlebar_behavior', opt.id);
                            eventBus.emit('titlebar-behavior-changed', opt.id);
                            eventBus.emit('show-toast', { message: `${opt.label}`, type: 'info' });
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'shadow-xs font-semibold'
                              : 'opacity-60 hover:opacity-100 hover:bg-white/5'
                          }`}
                          style={{
                            backgroundColor: isSelected ? `${accentColor}18` : 'transparent',
                            borderColor: isSelected ? accentColor : `${theme.colors.border}40`,
                            color: isSelected ? textAccentColor : theme.colors.text,
                          }}
                        >
                          <div className="font-medium text-[11px] truncate">{opt.label}</div>
                          <div className="text-[9px] opacity-40 font-mono mt-0.5">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 🌟 极简全屏沉浸模式 (Zero-Chrome) */}
                <div
                  className="rounded-2xl border p-4.5 flex items-center justify-between transition-all"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div>
                    <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                      {language === 'en' ? 'Zero-Chrome Focus Mode' : '极简底栏隐藏模式'}
                    </span>
                    <p className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                      {language === 'en' ? 'Hide bottom status bar for a clean writing field' : '隐藏底部状态栏，获得更纯净的专注写作视野'}
                    </p>
                  </div>
                  <button
                    onClick={onToggleZeroChrome}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all font-medium cursor-pointer"
                    style={{
                      backgroundColor: zeroChrome ? `${accentColor}20` : 'transparent',
                      color: zeroChrome ? textAccentColor : theme.colors.textMuted,
                      border: `1px solid ${zeroChrome ? `${accentColor}50` : theme.colors.border}`,
                    }}
                  >
                    {zeroChrome && <Check className="h-3 w-3" />}
                    <span>{zeroChrome ? t('common.active') : t('common.inactive')}</span>
                  </button>
                </div>

                {/* 🌟 打字机居中模式设置卡片 (Typewriter Mode Card) */}
                <div
                  className="space-y-4 rounded-2xl border p-5 transition-all"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                          {t('typography.typewriterTitle')}
                        </span>
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${accentColor}18`, color: textAccentColor }}
                        >
                          {language === 'en' ? 'Eye-Level' : '视线居中'}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                        {t('typography.typewriterDesc')}
                      </p>
                    </div>

                    <button
                      onClick={() => onToggleTypewriter?.(!typewriterEnabled)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all font-medium cursor-pointer"
                      style={{
                        backgroundColor: typewriterEnabled ? `${accentColor}20` : 'transparent',
                        color: typewriterEnabled ? textAccentColor : theme.colors.textMuted,
                        border: `1px solid ${typewriterEnabled ? `${accentColor}50` : theme.colors.border}`,
                      }}
                    >
                      {typewriterEnabled && <Check className="h-3 w-3" />}
                      <span>{typewriterEnabled ? t('common.active') : t('common.inactive')}</span>
                    </button>
                  </div>

                  {typewriterEnabled && (
                    <div className="space-y-4 pt-3 border-t border-white/5 animate-in fade-in duration-200">
                      {/* 垂直锚点位置 */}
                      <div>
                        <label className="font-medium text-[11px] block mb-2 opacity-80" style={{ color: theme.colors.text }}>
                          {t('typography.typewriterRatioTitle')}
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { value: 0.38, name: language === 'en' ? '38% Golden Eye-Level' : '38% 黄金视线', desc: language === 'en' ? 'Comfortable reading' : '微仰舒适阅读位' },
                            { value: 0.50, name: language === 'en' ? '50% Viewport Center' : '50% 视口正中', desc: language === 'en' ? 'Classic typewriter center' : '经典打字机正中' },
                            { value: 0.60, name: language === 'en' ? '60% Lower Horizon' : '60% 沉浸低位', desc: language === 'en' ? 'Macro overview' : '自上而下宏观视野' },
                          ].map((item) => {
                            const isCur = Math.abs((typewriterRatio ?? 0.38) - item.value) < 0.04;
                            return (
                              <button
                                key={item.value}
                                onClick={() => onChangeTypewriterRatio?.(item.value)}
                                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                  isCur ? 'shadow-md font-semibold' : 'hover:border-white/20'
                                }`}
                                style={{
                                  backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bgSecondary,
                                  borderColor: isCur ? accentColor : theme.colors.border,
                                  boxShadow: isCur ? `0 0 0 1.5px ${accentColor}` : undefined,
                                }}
                              >
                                <span className="text-[11px]" style={{ color: theme.colors.text }}>
                                  {item.name}
                                </span>
                                <span className="text-[9.5px] opacity-40 mt-0.5 font-mono" style={{ color: theme.colors.textMuted }}>
                                  {item.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 平滑滚动节奏 */}
                      <div>
                        <label className="font-medium text-[11px] block mb-2 opacity-80" style={{ color: theme.colors.text }}>
                          {t('typography.typewriterSpeedTitle')}
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { id: 'gentle', name: language === 'en' ? 'Gentle' : '舒缓', desc: language === 'en' ? 'Soft smooth gliding' : '柔和渐进平滑移动' },
                            { id: 'balanced', name: language === 'en' ? 'Balanced' : '标准', desc: language === 'en' ? 'Optimal fluid follow' : '适中平滑跟随' },
                            { id: 'snappy', name: language === 'en' ? 'Snappy' : '敏捷', desc: language === 'en' ? 'Instant response' : '快速响应' },
                          ].map((sp) => {
                            const isCur = (typewriterSpeed ?? 'balanced') === sp.id;
                            return (
                              <button
                                key={sp.id}
                                onClick={() => onChangeTypewriterSpeed?.(sp.id as any)}
                                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                  isCur ? 'shadow-md font-semibold' : 'hover:border-white/20'
                                }`}
                                style={{
                                  backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bgSecondary,
                                  borderColor: isCur ? accentColor : theme.colors.border,
                                  boxShadow: isCur ? `0 0 0 1.5px ${accentColor}` : undefined,
                                }}
                              >
                                <span className="text-[11px]" style={{ color: theme.colors.text }}>
                                  {sp.name}
                                </span>
                                <span className="text-[9.5px] opacity-40 mt-0.5 font-mono" style={{ color: theme.colors.textMuted }}>
                                  {sp.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 🌟 段落与单句专注聚光灯设置卡片 (Focus Mode 2.0 Card) */}
                <div
                  className="space-y-4 rounded-2xl border p-5 transition-all"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                          {t('typography.focusTitle')}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 opacity-60">
                          {keymapRegistry.getFormattedKey('focus:toggle', 'Alt+F')}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                        {t('typography.focusDesc')}
                      </p>
                    </div>

                    <button
                      onClick={handleToggleFocusMode}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all font-medium cursor-pointer"
                      style={{
                        backgroundColor: focusEnabled ? `${accentColor}20` : 'transparent',
                        color: focusEnabled ? textAccentColor : theme.colors.textMuted,
                        border: `1px solid ${focusEnabled ? `${accentColor}50` : theme.colors.border}`,
                      }}
                    >
                      {focusEnabled && <Check className="h-3 w-3" />}
                      <span>{focusEnabled ? t('common.active') : t('common.inactive')}</span>
                    </button>
                  </div>

                  {focusEnabled && (
                    <div className="space-y-4 pt-3 border-t border-white/5 animate-in fade-in duration-200">
                      {/* 聚光范围模式选择 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-medium text-[11px] opacity-80" style={{ color: theme.colors.text }}>
                            {t('typography.focusScopeTitle')}
                          </label>
                          <span className="text-[9.5px] font-mono opacity-40">
                            {keymapRegistry.getFormattedKey('focus:toggle-scope', 'Alt+Shift+F')}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { id: 'paragraph', name: language === 'en' ? 'Active Paragraph' : '当前逻辑段落', desc: language === 'en' ? 'Illuminates full paragraph' : '完整照亮长段落全部折行' },
                            { id: 'sentence', name: language === 'en' ? 'Active Sentence' : '当前单句推敲', desc: language === 'en' ? 'Focuses on current clause' : '以标点为界单句雕琢' },
                            { id: 'horizon', name: language === 'en' ? '3-Line Gradient' : '三行微光渐变', desc: language === 'en' ? '100% active, 62% adjacent' : '当前行100%，相邻62%' },
                          ].map((mode) => {
                            const isCur = focusScope === mode.id;
                            return (
                              <button
                                key={mode.id}
                                onClick={() => handleChangeFocusScope(mode.id as FocusScope)}
                                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                  isCur ? 'shadow-md font-semibold' : 'hover:border-white/20'
                                }`}
                                style={{
                                  backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bgSecondary,
                                  borderColor: isCur ? accentColor : theme.colors.border,
                                  boxShadow: isCur ? `0 0 0 1.5px ${accentColor}` : undefined,
                                }}
                              >
                                <span className="text-[11px]" style={{ color: theme.colors.text }}>
                                  {mode.name}
                                </span>
                                <span className="text-[9.5px] opacity-40 mt-0.5 font-mono" style={{ color: theme.colors.textMuted }}>
                                  {mode.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 暗化深度透明度滑块 */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="font-medium text-[11px] opacity-80" style={{ color: theme.colors.text }}>
                            {t('typography.focusDimTitle')}
                          </label>
                          <span className="text-xs font-mono font-semibold" style={{ color: textAccentColor }}>
                            {Math.round((1 - focusDimOpacity) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.10}
                          max={0.55}
                          step={0.02}
                          value={focusDimOpacity}
                          onChange={(e) => handleChangeFocusDimOpacity(parseFloat(e.target.value))}
                          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10"
                          style={{ accentColor: accentColor }}
                        />
                        <div className="flex justify-between text-[9.5px] opacity-40 font-mono mt-1">
                          <span>0.10 ({language === 'en' ? 'Deep Immersion' : '深邃沉浸'})</span>
                          <span>0.28 ({language === 'en' ? 'Balanced Focus' : '标准平衡'})</span>
                          <span>0.55 ({language === 'en' ? 'Mild Dim' : '轻度微暗'})</span>
                        </div>
                      </div>
                    </div>
                  )}
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
                            ? 'shadow-lg scale-[1.01]'
                            : 'hover:border-white/20 hover:scale-[1.005] opacity-80 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: th.colors.bgSecondary,
                          borderColor: isCur ? th.colors.accent : `${th.colors.border}80`,
                          boxShadow: isCur ? `0 0 0 2px ${th.colors.accent}` : undefined,
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
                                {t('themes.previewQuote')}
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
                              {th.isDark ? t('themes.dark') : t('themes.light')}
                            </span>
                          </div>
                        </div>

                        {/* Title & Selection Indicator */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-xs" style={{ color: th.colors.text }}>
                              {language === 'en' ? th.name : th.nameZh}
                            </span>
                            <span className="text-[10px] opacity-40 ml-2 font-mono" style={{ color: theme.colors.textMuted }}>
                              {language === 'en' ? (th.isDark ? 'Dark Theme' : 'Light Theme') : th.name}
                            </span>
                          </div>
                          {isCur ? (
                            <span className="flex items-center gap-1 text-[10px] font-mono font-semibold" style={{ color: textAccentColor }}>
                              <Check className="h-3 w-3" /> {language === 'en' ? 'Active' : '当前应用'}
                            </span>
                          ) : (
                            <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity font-mono">
                              {language === 'en' ? 'Select' : '点击应用'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 🌟 全局界面强调色调配工坊 (Universal UI Accent Color Card) */}
                <div
                  className="space-y-4 rounded-2xl border p-5 transition-all"
                  style={{
                    borderColor: `${accentColor}40`,
                    backgroundColor: `${accentColor}06`,
                  }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                          {language === 'en' ? 'UI Interaction Accent Color' : '界面交互强调色'}
                        </span>
                        <span
                          className="text-[9.5px] px-2 py-0.5 rounded-full font-mono font-medium"
                          style={{
                            backgroundColor: `${accentColor}18`,
                            color: textAccentColor,
                            border: `1px solid ${accentColor}35`,
                          }}
                        >
                          {uiAccentColor === 'auto'
                            ? (language === 'en' ? 'Follow Theme' : '跟随主题')
                            : (language === 'en' ? 'Custom' : '自定义')}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                        {language === 'en'
                          ? 'Customize highlight color for buttons, sliders, and active indicator lights'
                          : '自定义按钮、滑块与状态指示灯的色彩'}
                      </p>
                    </div>

                    {uiAccentColor !== 'auto' && (
                      <button
                        onClick={() => onChangeUiAccentColor?.('auto')}
                        className="text-[10.5px] font-mono opacity-70 hover:opacity-100 underline cursor-pointer shrink-0"
                        style={{ color: textAccentColor }}
                      >
                        {language === 'en' ? 'Reset to Follow Theme' : '重置为跟随主题'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 pt-2 border-t" style={{ borderColor: `${theme.colors.border}40` }}>
                    {/* 8 大精选强调色芯片 */}
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {[
                        { name: language === 'en' ? 'Charcoal' : '玄黑', hex: '#292524' },
                        { name: language === 'en' ? 'Vermilion' : '朱红', hex: '#c95738' },
                        { name: language === 'en' ? 'Sky Cyan' : '青蓝', hex: '#0284c7' },
                        { name: language === 'en' ? 'Violet' : '苍紫', hex: '#8b5cf6' },
                        { name: language === 'en' ? 'Emerald' : '翠绿', hex: '#059669' },
                        { name: language === 'en' ? 'Amber' : '琥珀', hex: '#d97706' },
                        { name: language === 'en' ? 'Crimson' : '绯红', hex: '#e11d48' },
                        { name: language === 'en' ? 'Ultramarine' : '群青', hex: '#2563eb' },
                      ].map((c) => {
                        const isCur = uiAccentColor === c.hex;
                        return (
                          <button
                            key={c.hex}
                            onClick={() => onChangeUiAccentColor?.(c.hex)}
                            className="flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer hover:scale-[1.02]"
                            style={{
                              backgroundColor: isCur ? `${c.hex}22` : theme.colors.bgSecondary,
                              borderColor: isCur ? c.hex : theme.colors.border,
                              boxShadow: isCur ? `0 0 0 1.5px ${c.hex}` : undefined,
                            }}
                          >
                            <span
                              className="h-4 w-4 rounded-full mb-1 shadow-xs border border-white/20"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span className="text-[10px] font-medium leading-tight" style={{ color: theme.colors.text }}>
                              {c.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* 吸管与自定义色值输入 */}
                    <div
                      className="p-2.5 rounded-xl border flex items-center justify-between gap-3"
                      style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium" style={{ color: theme.colors.text }}>
                          {language === 'en' ? 'Custom Accent Color' : '自定义强调色'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => onChangeUiAccentColor?.(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={uiAccentColor === 'auto' ? theme.colors.accent : uiAccentColor}
                          onChange={(e) => onChangeUiAccentColor?.(e.target.value)}
                          placeholder={theme.colors.accent}
                          className="w-20 px-2 py-0.5 rounded border text-[11px] font-mono outline-none text-center font-bold"
                          style={{
                            backgroundColor: theme.colors.bg,
                            borderColor: theme.colors.border,
                            color: textAccentColor,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: UNIFIED PLUGINS HUB & EXTENSIONS */}
            {activeTab === 'plugins' && (
              <div className="space-y-5">
                {/* 🌟 1. Top Header: Filter Pills & Action Buttons */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-wrap gap-2.5">
                  {/* Filter Pills */}
                  <div
                    className="flex items-center p-1 rounded-xl border"
                    style={{ backgroundColor: `${theme.colors.bgSecondary}`, borderColor: theme.colors.border }}
                  >
                    {[
                      { id: 'all', label: t('plugins.all'), count: pluginManager.getAllPlugins().length },
                      { id: 'enabled', label: t('plugins.enabled'), count: pluginManager.getEnabledPlugins().length },
                      { id: 'disabled', label: t('plugins.disabled'), count: pluginManager.getAllPlugins().length - pluginManager.getEnabledPlugins().length },
                    ].map((f) => {
                      const isCur = pluginFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setPluginFilter(f.id as any)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                          style={{
                            backgroundColor: isCur ? `${accentColor}20` : 'transparent',
                            color: isCur ? textAccentColor : theme.colors.textMuted,
                            border: `1px solid ${isCur ? `${accentColor}40` : 'transparent'}`,
                            fontWeight: isCur ? 600 : 400,
                          }}
                        >
                          <span>{f.label}</span>
                          <span className="text-[10px] font-mono opacity-60">
                            ({f.count})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions: Custom JS script */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCustomScriptModalOpen(true)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-mono cursor-pointer"
                      style={{ color: theme.colors.text }}
                    >
                      <Code2 className="h-3.5 w-3.5" style={{ color: textAccentColor }} />
                      <span>+ {t('plugins.writeScript')}</span>
                    </button>
                  </div>
                </div>

                {/* 🌟 2. Search & Sync Bar */}
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-1">
                    <Search
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-40"
                      style={{ color: theme.colors.text }}
                    />
                    <input
                      type="text"
                      value={pluginSearch}
                      onChange={(e) => setPluginSearch(e.target.value)}
                      placeholder={t('plugins.searchPlaceholder')}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-sans placeholder:text-neutral-500 focus:outline-hidden transition-all"
                      style={{
                        backgroundColor: theme.colors.bg,
                        borderColor: `${theme.colors.border}80`,
                        color: theme.colors.text,
                      }}
                    />
                    {pluginSearch && (
                      <button
                        onClick={() => setPluginSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full opacity-40 hover:opacity-100"
                        style={{ color: theme.colors.text }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleRefreshRegistry}
                    disabled={isRefreshingRegistry}
                    title={t('plugins.reloadRegistry')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs font-mono shrink-0 disabled:opacity-50 cursor-pointer"
                    style={{ color: theme.colors.text }}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingRegistry ? 'animate-spin' : ''}`} style={{ color: textAccentColor }} />
                    <span>{isRefreshingRegistry ? (language === 'en' ? 'Refreshing...' : '刷新中...') : t('plugins.reloadRegistry')}</span>
                  </button>
                </div>

                {/* 🌟 3. Unified Plugin Cards List */}
                <div className="space-y-3">
                  {pluginManager
                    .getAllPlugins()
                    .filter((p) => {
                      const isEnabled = pluginManager.isPluginEnabled(p.metadata.id);
                      if (pluginFilter === 'enabled' && !isEnabled) return false;
                      if (pluginFilter === 'disabled' && isEnabled) return false;

                      if (!pluginSearch.trim()) return true;
                      const q = pluginSearch.toLowerCase().trim();
                      const info = PLUGIN_RICH_INFO[p.metadata.id];
                      const matchName = p.metadata.name.toLowerCase().includes(q);
                      const matchDesc = p.metadata.description.toLowerCase().includes(q);
                      const matchAuthor = (p.metadata.author || '').toLowerCase().includes(q);
                      const matchCat = (info?.category || '').toLowerCase().includes(q);
                      return matchName || matchDesc || matchAuthor || matchCat;
                    })
                    .map((p) => {
                      const isEnabled = pluginManager.isPluginEnabled(p.metadata.id);
                      const info = PLUGIN_RICH_INFO[p.metadata.id];
                      const IconComp = info?.icon || Layers;
                      const isCustom = dynamicPluginLoader.getAllCustomPlugins().some((c) => c.id === p.metadata.id);

                      return (
                        <div
                          key={p.metadata.id}
                          className="rounded-2xl border p-4 transition-all"
                          style={{
                            backgroundColor: theme.colors.bg,
                            borderColor: isEnabled ? `${theme.colors.accent}40` : theme.colors.border,
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div
                                className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border"
                                style={{
                                  backgroundColor: isEnabled ? `${theme.colors.accent}15` : 'rgba(255,255,255,0.03)',
                                  color: isEnabled ? theme.colors.accent : theme.colors.textMuted,
                                  borderColor: isEnabled ? `${theme.colors.accent}30` : 'rgba(255,255,255,0.06)',
                                }}
                              >
                                <IconComp className="h-4.5 w-4.5" />
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                                    {(language === 'en' && info?.nameEn) ? info.nameEn : p.metadata.name}
                                  </span>
                                  <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-neutral-400 border border-white/5">
                                    v{p.metadata.version}
                                  </span>
                                  {p.metadata.author && (
                                    <span className="text-[10px] opacity-40 font-mono">
                                      by {p.metadata.author}
                                    </span>
                                  )}
                                  {info && (
                                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/5 text-neutral-400">
                                      {(language === 'en' && info.categoryEn) ? info.categoryEn : info.category}
                                    </span>
                                  )}
                                  {isCustom && (
                                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                                      {t('plugins.customScriptBadge')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] leading-relaxed opacity-65" style={{ color: theme.colors.textMuted }}>
                                  {(language === 'en' && info?.descEn) ? info.descEn : p.metadata.description}
                                </p>
                              </div>
                            </div>

                            {/* Toggle or Uninstall */}
                            <div className="flex items-center gap-2 shrink-0">
                              {isCustom && (
                                <button
                                  onClick={() => handleUninstallCustomPlugin(p.metadata.id)}
                                  className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                                  title={t('plugins.uninstallScript')}
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  if (isEnabled) {
                                    pluginManager.disablePlugin(p.metadata.id);
                                  } else {
                                    pluginManager.enablePlugin(p.metadata.id);
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all shrink-0 cursor-pointer font-medium"
                                style={{
                                  backgroundColor: isEnabled ? `${accentColor}20` : 'transparent',
                                  color: isEnabled ? textAccentColor : theme.colors.textMuted,
                                  border: `1px solid ${isEnabled ? `${accentColor}50` : theme.colors.border}`,
                                }}
                              >
                                {isEnabled && <Check className="h-3 w-3" />}
                                <span>{isEnabled ? t('common.enabled') : t('common.disabled')}</span>
                              </button>
                            </div>
                          </div>

                          {/* Footer with clean jump link */}
                          {info?.targetTab && (
                            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-end text-[10.5px]">
                              <button
                                onClick={() => setActiveTab(info.targetTab!)}
                                className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity ml-auto text-[11px] cursor-pointer"
                                style={{ color: textAccentColor }}
                              >
                                <span>{language === 'en' ? 'Configure Details' : '前往详细配置'}</span>
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {/* 3.2 Custom Injected JS Scripts */}
                  {dynamicPluginLoader.getAllCustomPlugins().length > 0 && (
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <span className="font-semibold text-xs opacity-75" style={{ color: theme.colors.text }}>
                        {language === 'en' ? 'Custom Injected JavaScript Scripts' : '自定义注入的 JavaScript 脚本'}
                      </span>
                      {dynamicPluginLoader.getAllCustomPlugins().map((c) => (
                        <div
                          key={c.id}
                          className="rounded-xl border p-3.5 flex items-center justify-between gap-3 bg-white/2"
                          style={{ borderColor: theme.colors.border }}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                                {c.name}
                              </span>
                              <span className="text-[9.5px] font-mono opacity-50">v{c.version}</span>
                              <span className="text-[9.5px] font-mono font-medium" style={{ color: textAccentColor }}>({c.id})</span>
                            </div>
                            <p className="text-[10.5px] opacity-60 line-clamp-1" style={{ color: theme.colors.textMuted }}>
                              {c.description}
                            </p>
                          </div>

                          <button
                            onClick={() => handleUninstallCustomPlugin(c.id)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 transition-all shrink-0 cursor-pointer"
                          >
                            {language === 'en' ? 'Uninstall' : '卸载'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 🌟 TAB 6: 快捷键管理 (Keymap Hub) */}
            {activeTab === 'keymap' && (
              <div className="space-y-4">
                {/* HUD Banner */}
                <div
                  className="flex items-center justify-between p-4 rounded-2xl border bg-black/20"
                  style={{ borderColor: `${theme.colors.border}60` }}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Keyboard className="h-4 w-4" style={{ color: textAccentColor }} />
                      <h4 className="text-xs font-semibold" style={{ color: theme.colors.text }}>
                        {language === 'en' ? 'Hotkeys Cheatsheet & Manager' : '快捷键速查面板'}
                      </h4>
                    </div>
                    <p className="text-[11px] opacity-55" style={{ color: theme.colors.textMuted }}>
                      {language === 'en' ? (
                        <>Press <kbd className="font-mono font-bold" style={{ color: textAccentColor }}>{keymapRegistry.getFormattedKey('keymap:open-cheatsheet', 'Ctrl + /')}</kbd> anytime to open keymap cheatsheet</>
                      ) : (
                        <>随时按下 <kbd className="font-mono font-bold" style={{ color: textAccentColor }}>{keymapRegistry.getFormattedKey('keymap:open-cheatsheet', 'Ctrl + /')}</kbd> 即可打开快捷键速查面板</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        keymapRegistry.resetAll();
                        eventBus.emit('show-toast', { message: t('keymap.resetAllSuccess'), type: 'success' });
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs opacity-60 hover:opacity-100 hover:bg-white/5 border border-white/10 transition-all cursor-pointer text-neutral-400 hover:text-neutral-200"
                      title={t('keymap.resetAllTitle')}
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>{t('common.restoreDefault')}</span>
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        eventBus.emit('keymap:open-cheatsheet');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all shadow-xs cursor-pointer shrink-0"
                      style={{
                        backgroundColor: `${accentColor}20`,
                        color: textAccentColor,
                        borderColor: `${accentColor}40`,
                      }}
                    >
                      <Keyboard className="h-3.5 w-3.5" />
                      <span>{t('keymap.triggerFloating')} ({keymapRegistry.getFormattedKey('keymap:open-cheatsheet', 'Ctrl+/')})</span>
                    </button>
                  </div>
                </div>

                {/* Search & Category Tabs */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-40" />
                    <input
                      type="text"
                      value={keymapSearch}
                      onChange={(e) => setKeymapSearch(e.target.value)}
                      placeholder={t('keymap.searchPlaceholder')}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors shadow-inner"
                      style={{
                        backgroundColor: theme.colors.bg,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      }}
                    />
                    {keymapSearch && (
                      <button
                        onClick={() => setKeymapSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full opacity-40 hover:opacity-100 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {[
                      { id: 'all', label: t('keymap.categories.all'), icon: Sparkles },
                      { id: 'editing', label: t('keymap.categories.editing'), icon: FileText },
                      { id: 'navigation', label: t('keymap.categories.navigation'), icon: Compass },
                      { id: 'search', label: t('keymap.categories.search'), icon: Search },
                      { id: 'split_view', label: t('keymap.categories.split_view'), icon: Columns },
                      { id: 'literary', label: t('keymap.categories.literary'), icon: BookOpen },
                      { id: 'system', label: t('keymap.categories.system'), icon: SlidersHorizontal },
                    ].map((cat) => {
                      const Icon = cat.icon;
                      const isCur = keymapCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setKeymapCategory(cat.id as any)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                            isCur
                              ? 'shadow-xs font-semibold'
                              : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 hover:text-neutral-200'
                          }`}
                          style={{
                            backgroundColor: isCur ? `${accentColor}20` : undefined,
                            color: isCur ? textAccentColor : undefined,
                            border: isCur ? `1px solid ${accentColor}40` : undefined,
                          }}
                        >
                          <Icon className="h-3 w-3 opacity-70" />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Keybindings Grid */}
                <div className="space-y-2">
                  {filteredKeymapItems.length === 0 ? (
                    <div className="text-center py-12 opacity-40 text-xs font-mono">
                      {t('keymap.notFound')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {filteredKeymapItems.map((item) => {
                        const isRecording = recordingKeymapId === item.id;
                        const isCustom = item.currentKey !== item.defaultKey;
                        const itemTitle = language === 'en' && item.titleEn ? item.titleEn : item.title;
                        const itemDesc = language === 'en' && item.descriptionEn ? item.descriptionEn : item.description;
                        const displayKey = keymapRegistry.formatDisplayKey(
                          isRecording && recordedKeymapStr ? recordedKeymapStr : item.currentKey
                        );

                        return (
                          <div
                            key={item.id}
                            className={`group p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                              isRecording
                                ? 'shadow-lg'
                                : 'bg-black/20 hover:bg-white/[0.04]'
                            }`}
                            style={{
                              borderColor: isRecording ? accentColor : `${theme.colors.border}40`,
                              backgroundColor: isRecording ? `${accentColor}18` : undefined,
                              boxShadow: isRecording ? `0 0 0 2px ${accentColor}` : undefined,
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 space-y-0.5">
                                 <div className="flex items-center gap-1.5 flex-wrap">
                                   <span className="font-semibold text-xs truncate" style={{ color: theme.colors.text }}>
                                     {itemTitle}
                                   </span>
                                   {isCustom && (
                                     <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                       {t('keymap.customizedBadge')}
                                     </span>
                                   )}
                                 </div>
                                 <p className="text-[11px] opacity-55 line-clamp-1" style={{ color: theme.colors.textMuted }}>
                                   {itemDesc}
                                 </p>
                               </div>

                               {/* Key Badge or Recording Input */}
                               <div className="shrink-0 flex items-center gap-1.5">
                                 {isRecording ? (
                                   <div className="flex items-center gap-1">
                                     <div
                                       className="flex items-center gap-1 px-2.5 py-1 rounded-xl border font-mono text-[11px] animate-pulse shadow-sm"
                                       style={{
                                         backgroundColor: `${accentColor}25`,
                                         borderColor: accentColor,
                                         color: textAccentColor,
                                       }}
                                     >
                                       {displayKey.mods.map((m) => (
                                         <kbd key={m} className="font-semibold">
                                           {m}
                                         </kbd>
                                       ))}
                                       {displayKey.mods.length > 0 && <span className="opacity-40">+</span>}
                                       <kbd className="font-bold">{displayKey.key || t('keymap.recordingPrompt')}</kbd>
                                     </div>
                                     <button
                                       onClick={() => handleSaveKeymapRecording(item.id)}
                                       disabled={!recordedKeymapStr}
                                       className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-30 cursor-pointer"
                                       title={t('common.save')}
                                     >
                                       <Check className="h-3.5 w-3.5" />
                                     </button>
                                     <button
                                       onClick={() => {
                                         setRecordingKeymapId(null);
                                         setRecordedKeymapStr('');
                                         setConflictKeymapItem(null);
                                       }}
                                       className="p-1.5 rounded-lg bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 cursor-pointer"
                                       title={t('common.cancel')}
                                     >
                                       <X className="h-3.5 w-3.5" />
                                     </button>
                                   </div>
                                 ) : (
                                   <div className="flex items-center gap-1">
                                     {item.run && (
                                       <button
                                         onClick={() => {
                                           item.run?.();
                                           eventBus.emit('show-toast', { message: `${t('keymap.actionExecuted')}「${itemTitle}」`, type: 'info' });
                                         }}
                                         className="p-1 rounded-lg bg-white/5 border border-white/5 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                         style={{ color: textAccentColor }}
                                         title={t('keymap.runActionNow')}
                                       >
                                         <Play className="h-2.5 w-2.5 fill-current" />
                                       </button>
                                     )}
                                     <button
                                       onClick={() => {
                                         setRecordingKeymapId(item.id);
                                         setRecordedKeymapStr('');
                                         setConflictKeymapItem(null);
                                       }}
                                       className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] hover:bg-white/5 transition-all cursor-pointer group/btn"
                                       title={t('keymap.recordNewKey')}
                                     >
                                       {displayKey.mods.map((m) => (
                                         <kbd key={m} className="opacity-70 font-semibold text-neutral-300">
                                           {m}
                                         </kbd>
                                       ))}
                                       {displayKey.mods.length > 0 && <span className="opacity-30">+</span>}
                                       <kbd className="font-bold" style={{ color: textAccentColor }}>{displayKey.key}</kbd>
                                       <Edit2 className="h-2.5 w-2.5 ml-1 opacity-0 group-hover/btn:opacity-60 transition-opacity" style={{ color: textAccentColor }} />
                                     </button>
                                   </div>
                                 )}
                               </div>
                             </div>

                             {/* Conflict Warning or Reset if custom */}
                             {isRecording && conflictKeymapItem && (
                               <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[10.5px]">
                                 <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                 <span>{t('keymap.conflictWarning')}</span>
                                </div>
                             )}

                             {!isRecording && isCustom && (
                               <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/5">
                                 <span className="opacity-40 font-mono">{t('keymap.defaultKey')}：{item.defaultKey}</span>
                                 <button
                                   onClick={() => handleResetSingleKeymap(item.id)}
                                   className="flex items-center gap-1 transition-colors cursor-pointer"
                                   style={{ color: textAccentColor }}
                                 >
                                   <RotateCcw className="h-2.5 w-2.5" />
                                   <span>{t('common.restoreDefault')}</span>
                                 </button>
                               </div>
                             )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📦 Custom Script Editor & Execution Modal */}
      {isCustomScriptModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="relative w-full max-w-xl rounded-2xl border p-6 space-y-4 shadow-2xl"
            style={{
              backgroundColor: theme.colors.bgSecondary,
              borderColor: `${theme.colors.accent}40`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4" style={{ color: textAccentColor }} />
                <h4 className="font-bold text-sm" style={{ color: theme.colors.text }}>
                  {t('plugins.scriptModalTitle')}
                </h4>
              </div>
              <button
                onClick={() => setIsCustomScriptModalOpen(false)}
                className="p-1 rounded-full opacity-60 hover:opacity-100 cursor-pointer"
                style={{ color: theme.colors.text }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs opacity-70 leading-relaxed" style={{ color: theme.colors.textMuted }}>
              {t('plugins.scriptModalDesc')}
            </p>

            <div className="space-y-1.5">
              <textarea
                value={customScriptCode}
                onChange={(e) => setCustomScriptCode(e.target.value)}
                rows={12}
                spellCheck={false}
                className="w-full p-3 rounded-xl border text-xs font-mono outline-hidden leading-relaxed resize-none"
                style={{
                  backgroundColor: theme.colors.bg,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }}
              />
              {customScriptError && (
                <div className="text-rose-400 text-xs font-mono p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  ⚠️ {customScriptError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => setIsCustomScriptModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-sans opacity-70 hover:opacity-100 cursor-pointer"
                style={{ color: theme.colors.text }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveAndRunCustomScript}
                className="px-4 py-2 rounded-xl text-xs font-semibold border transition-all font-mono cursor-pointer"
                style={{
                  backgroundColor: `${accentColor}20`,
                  color: textAccentColor,
                  borderColor: `${accentColor}40`,
                }}
              >
                {t('plugins.testAndInstall')}
              </button>
            </div>
          </div>
        </div>
      )}

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
