import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Palette,
  Type,
  Puzzle,
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
  MessageSquare,
  FolderTree,
  BarChart2,
  StickyNote,
  FileDown,
  AlignVerticalSpaceAround,
  Download,
  AlignJustify,
  AlignLeft,
  Code2,
  Trash,
  Clock,
  SpellCheck,
  Target,
  Globe,
  RefreshCw,
  Keyboard,
  Replace,
} from 'lucide-react';
import type { Theme } from '../../core/themes/types';
import { THEMES } from '../../core/themes/themeDefinitions';
import { pluginManager } from '../../core/plugins/PluginManager';
import { dynamicPluginLoader } from '../../core/plugins/DynamicPluginLoader';
import { AVAILABLE_COMMUNITY_PLUGINS } from '../../core/plugins/communityPlugins';
import { LiveCursorTestArena } from './LiveCursorTestArena';
import { ImageCropModal, type CropParams } from './ImageCropModal';
import type { BackgroundEffect } from '../editor/EditorBackground';
import type { FocusScope } from '../../plugins/focus-mode/focusExtension';
import { type DialogueColorPreset, DIALOGUE_COLOR_MAP } from '../../plugins/dialogue-highlighter/dialogueExtension';
import { cleanChineseNovelText } from '../../plugins/editor-toolkit/chineseTextCleaner';
import { projectStore } from '../../core/storage/ProjectStore';
import { eventBus } from '../../core/events/EventBus';

const COMMUNITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Clock,
  SpellCheck,
  Target,
};

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
  indentSize?: '2em' | '1em' | '3em' | '0';
  onChangeIndentSize?: (size: '2em' | '1em' | '3em' | '0') => void;
  kinsokuStrictness?: 'strict' | 'loose' | 'native';
  onChangeKinsoku?: (val: 'strict' | 'loose' | 'native') => void;
  punctuationHalt?: boolean;
  onTogglePunctuationHalt?: () => void;
  textAlignment?: 'justify' | 'left';
  onChangeTextAlignment?: (align: 'justify' | 'left') => void;
  letterSpacing?: number;
  onChangeLetterSpacing?: (val: number) => void;
  spotlightMode?: 'none' | 'paragraph';
  onSelectSpotlightMode?: (mode: 'none' | 'paragraph') => void;
  zeroChrome: boolean;
  onToggleZeroChrome: () => void;
  typewriterEnabled?: boolean;
  onToggleTypewriter?: (enabled: boolean) => void;
  typewriterRatio?: number;
  onChangeTypewriterRatio?: (ratio: number) => void;
  typewriterSpeed?: 'gentle' | 'balanced' | 'snappy' | 'instant';
  onChangeTypewriterSpeed?: (speed: 'gentle' | 'balanced' | 'snappy' | 'instant') => void;
}

interface PluginRichInfo {
  category: '排版核心' | '沉浸体验' | '视觉光标' | '大纲与工具';
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  author: string;
  targetTab?: 'cursor' | 'background' | 'typography' | 'themes';
  highlights: string[];
  shortcuts: string[];
  slots: string[];
}

const PLUGIN_RICH_INFO: Record<string, PluginRichInfo> = {
  'plugin-chinese-typography': {
    category: '排版核心',
    icon: Type,
    author: 'Novelite Core',
    targetTab: 'typography',
    highlights: ['中文首行 2 字符缩进', '章回大标题智能免缩进', 'GB/T 15834 标点避头尾', '出版级两端对齐', '霞鹜文楷 WebFont'],
    shortcuts: ['设置面板切换 / 一键排版规范化'],
    slots: ['CodeMirror 排版扩展', '行装饰器', '快捷键系统'],
  },
  'plugin-typewriter': {
    category: '排版核心',
    icon: AlignVerticalSpaceAround,
    author: 'Novelite Core',
    targetTab: 'typography',
    highlights: ['二阶谐振物理弹簧推移', '滚轮手势智能接管', '38% 黄金视线锁定', '三档平滑节奏调节'],
    shortcuts: ['设置面板切换 / 命令中心触发'],
    slots: ['CodeMirror 视口扩展', '物理动画引擎', '手势监听'],
  },
  'plugin-live-cursor': {
    category: '视觉光标',
    icon: Sparkles,
    author: 'Novelite Core',
    targetTab: 'cursor',
    highlights: ['二阶谐振动力学质点', '行内倾角切变 (Inline Skew)', '多质点流体骨骼拖尾', '微光呼吸与发光粒子'],
    shortcuts: ['实时光标动力学追踪'],
    slots: ['GPU Canvas 渲染层', '物理粒子系统', 'IME 生命周期监听'],
  },
  'plugin-focus-mode': {
    category: '沉浸体验',
    icon: Focus,
    author: 'Novelite Core',
    targetTab: 'typography',
    highlights: ['逻辑长段落完整聚光', '单句推敲模式 (。！？断句)', '三行微光渐变视野', '200ms 物理平滑淡入淡出'],
    shortcuts: ['Alt+F (切换专注聚光)', 'Alt+Shift+F (切换范围)'],
    slots: ['CodeMirror 聚光扩展', 'DOM 状态监听', '行装饰器'],
  },
  'plugin-dialogue-highlighter': {
    category: '沉浸体验',
    icon: MessageSquare,
    author: 'Novelite Core',
    targetTab: 'typography',
    highlights: ['双引号 / 角引号 / 双角引号全识别', '心理独白括号柔和识别', '7 套朴素文学色彩预设', '视口增量 0 耗损渲染'],
    shortcuts: ['排版设置内配置'],
    slots: ['CodeMirror 台词扩展', '语法标记器'],
  },
  'plugin-novel-tree': {
    category: '大纲与工具',
    icon: FolderTree,
    author: 'Novelite Core',
    highlights: ['多卷与章节树状管理', '原位双击重命名', '章节拖拽重排', '实时章节字数追踪'],
    shortcuts: ['侧边栏常驻'],
    slots: ['左侧抽屉面板', '项目存储持久化'],
  },
  'plugin-word-counter': {
    category: '大纲与工具',
    icon: BarChart2,
    author: 'Novelite Core',
    highlights: ['纯 DOM 毫秒级字数反馈', '阅读时长智能预估', '段落与字符精准度量'],
    shortcuts: ['底部 HUD 常驻'],
    slots: ['底部状态栏', '写作心流引擎'],
  },
  'plugin-background-atmosphere': {
    category: '视觉光标',
    icon: Image,
    author: 'Novelite Core',
    targetTab: 'background',
    highlights: ['沉浸式原画与纸张纹理', '智能视口裁切与平移', '磨砂虚化与明暗调节', '零闪烁热重载'],
    shortcuts: ['视觉常驻'],
    slots: ['全屏背景渲染层', '图像处理模块'],
  },
  'plugin-scratchpad': {
    category: '大纲与工具',
    icon: StickyNote,
    author: 'Novelite Core',
    highlights: ['侧边常驻灵感便签', '随手记录伏笔与人设', '本地自动持久化存储'],
    shortcuts: ['侧边栏切换'],
    slots: ['右侧浮动抽屉', '便签存储桥接'],
  },
  'plugin-quick-exporter': {
    category: '大纲与工具',
    icon: FileDown,
    author: 'Novelite Core',
    highlights: ['纯净 Markdown 导出', '排版格式 TXT 导出', '章节批量打包下载'],
    shortcuts: ['命令中心 (Ctrl+P)'],
    slots: ['导出桥接引擎', '命令注册'],
  },
  'plugin-editor-toolkit': {
    category: '排版核心',
    icon: Keyboard,
    author: 'Novelite Core',
    targetTab: 'typography',
    highlights: ['极简悬浮查找与批量替换 (Ctrl+F/H)', '段落与剧情瞬移 (Alt+↑/↓)', '中文小说排版一键智能清洗', '自定义全局快捷键映射'],
    shortcuts: ['Ctrl+F (查找)', 'Ctrl+H (替换)', 'Alt+↑/↓ (挪段)', 'Ctrl+Shift+L (清洗)'],
    slots: ['CodeMirror 按键映射', '悬浮 HUD 渲染层', '文本清洗引擎'],
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
  const [activeTab, setActiveTab] = useState<'cursor' | 'background' | 'typography' | 'themes' | 'plugins'>('cursor');
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  const [pluginSearch, setPluginSearch] = useState<string>('');
  const [, setPluginsVersion] = useState<number>(0);

  const [pluginFilter, setPluginFilter] = useState<'all' | 'installed' | 'available'>('all');
  const [isRefreshingRegistry, setIsRefreshingRegistry] = useState<boolean>(false);
  const [isCustomScriptModalOpen, setIsCustomScriptModalOpen] = useState<boolean>(false);
  const [customScriptCode, setCustomScriptCode] = useState<string>(`// Novelite 自定义插件模板
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
};`);
  const [customScriptError, setCustomScriptError] = useState<string | null>(null);

  const handleInstallCommunityPlugin = (id: string) => {
    dynamicPluginLoader.installCommunityPlugin(id);
    setPluginsVersion((v) => v + 1);
  };

  const handleUninstallCommunityPlugin = (id: string) => {
    dynamicPluginLoader.uninstallCommunityPlugin(id);
    setPluginsVersion((v) => v + 1);
  };

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
      setCustomScriptError(res.error || '执行出错');
      return;
    }
    setIsCustomScriptModalOpen(false);
    setPluginsVersion((v) => v + 1);
  };

  const [focusEnabled, setFocusEnabled] = useState<boolean>(() => {
    return pluginManager.getPluginContext('plugin-focus-mode')?.getSetting<boolean>('enabled', false) ?? false;
  });
  const [focusScope, setFocusScope] = useState<FocusScope>(() => {
    return pluginManager.getPluginContext('plugin-focus-mode')?.getSetting<FocusScope>('scope', 'paragraph') ?? 'paragraph';
  });
  const [focusDimOpacity, setFocusDimOpacity] = useState<number>(() => {
    return pluginManager.getPluginContext('plugin-focus-mode')?.getSetting<number>('dimOpacity', 0.28) ?? 0.28;
  });

  const handleToggleFocusMode = () => {
    const ctx = pluginManager.getPluginContext('plugin-focus-mode');
    const next = !focusEnabled;
    setFocusEnabled(next);
    ctx?.setSetting('enabled', next);
    eventBus.emit('editor-extensions-changed');
    setPluginsVersion((v) => v + 1);
  };

  const handleChangeFocusScope = (scope: FocusScope) => {
    const ctx = pluginManager.getPluginContext('plugin-focus-mode');
    setFocusScope(scope);
    ctx?.setSetting('scope', scope);
    eventBus.emit('editor-extensions-changed');
    setPluginsVersion((v) => v + 1);
  };

  const handleChangeFocusDimOpacity = (opacity: number) => {
    const ctx = pluginManager.getPluginContext('plugin-focus-mode');
    setFocusDimOpacity(opacity);
    ctx?.setSetting('dimOpacity', opacity);
    eventBus.emit('editor-extensions-changed');
    setPluginsVersion((v) => v + 1);
  };

  const [dialogueEnabled, setDialogueEnabled] = useState<boolean>(() => {
    return pluginManager.getPluginContext('plugin-dialogue-highlighter')?.getSetting<boolean>('enabled', true) ?? true;
  });
  const [dialogueColorPreset, setDialogueColorPreset] = useState<DialogueColorPreset>(() => {
    return pluginManager.getPluginContext('plugin-dialogue-highlighter')?.getSetting<DialogueColorPreset>('colorPreset', 'theme') ?? 'theme';
  });
  const [dialogueHighlightThoughts, setDialogueHighlightThoughts] = useState<boolean>(() => {
    return pluginManager.getPluginContext('plugin-dialogue-highlighter')?.getSetting<boolean>('highlightThoughts', true) ?? true;
  });

  const [dialogueCustomColor, setDialogueCustomColor] = useState<string>(() => {
    return pluginManager.getPluginContext('plugin-dialogue-highlighter')?.getSetting<string>('customColor', '#38bdf8') ?? '#38bdf8';
  });

  const handleToggleDialogue = () => {
    const ctx = pluginManager.getPluginContext('plugin-dialogue-highlighter');
    const next = !dialogueEnabled;
    setDialogueEnabled(next);
    ctx?.setSetting('enabled', next);
    eventBus.emit('editor-extensions-changed');
    setPluginsVersion((v) => v + 1);
  };

  const handleChangeDialogueColorPreset = (preset: DialogueColorPreset) => {
    const ctx = pluginManager.getPluginContext('plugin-dialogue-highlighter');
    setDialogueColorPreset(preset);
    ctx?.setSetting('colorPreset', preset);
    eventBus.emit('editor-extensions-changed');
    setPluginsVersion((v) => v + 1);
  };

  const handleChangeDialogueCustomColor = (color: string) => {
    const ctx = pluginManager.getPluginContext('plugin-dialogue-highlighter');
    setDialogueCustomColor(color);
    setDialogueColorPreset('custom');
    ctx?.setSetting('colorPreset', 'custom');
    ctx?.setSetting('customColor', color);
    eventBus.emit('editor-extensions-changed');
    setPluginsVersion((v) => v + 1);
  };

  const handleToggleDialogueThoughts = () => {
    const ctx = pluginManager.getPluginContext('plugin-dialogue-highlighter');
    const next = !dialogueHighlightThoughts;
    setDialogueHighlightThoughts(next);
    ctx?.setSetting('highlightThoughts', next);
    eventBus.emit('editor-extensions-changed');
    setPluginsVersion((v) => v + 1);
  };

  const handleCleanChapterPhysicalIndent = () => {
    const curChap = projectStore.getActiveChapter();
    if (!curChap) return;
    const { cleanedText, changesCount } = cleanChineseNovelText(curChap.content);
    if (changesCount > 0 && cleanedText !== curChap.content) {
      projectStore.updateChapterContent(curChap.id, cleanedText);
      eventBus.emit('chapter-content-updated', { chapterId: curChap.id, content: cleanedText });
      eventBus.emit('show-toast', { message: `已将本章 ${changesCount} 处段落规范化为真实物理全角空格缩进`, type: 'success' });
    } else {
      eventBus.emit('show-toast', { message: '本章段落已具备规范的真实物理全角空格缩进', type: 'info' });
    }
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

                {/* 🌟 1. 中文首行缩进深度定制 */}
                <div
                  className="space-y-4 rounded-2xl border p-5"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                          中文首行物理真实空格缩进
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                          真实字符落盘
                        </span>
                      </div>
                      <p className="text-[10px] opacity-50 mt-0.5">回车敲击自动写入真实全角空格（<code>　　</code>），复制/导出 TXT 永久自带标准两字缩进</p>
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

                  {indentEnabled && (
                    <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                      {/* 一键规范化物理空格按钮 */}
                      <div
                        className="flex items-center justify-between p-3 rounded-xl border transition-all"
                        style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }}
                      >
                        <div>
                          <span className="font-medium text-[11px]" style={{ color: theme.colors.text }}>
                            一键规范化本章段落物理缩进
                          </span>
                          <p className="text-[9.5px] opacity-40">自动为所有正文段落补齐真实 <code>　　</code> 全角空格，标题与分割线保持顶格</p>
                        </div>
                        <button
                          onClick={handleCleanChapterPhysicalIndent}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 hover:border-cyan-400/50 hover:bg-cyan-500/10 text-cyan-400 transition-all shadow-xs"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>一键格式化</span>
                        </button>
                      </div>

                      {/* Smart Exemption Hint Matrix */}
                      <div className="rounded-xl border border-white/5 p-3 bg-white/2 space-y-1.5 text-[10.5px]">
                        <div className="flex items-center gap-1.5 font-medium text-cyan-400">
                          <Check className="h-3 w-3 shrink-0" />
                          <span>智能排版与物理空格保证</span>
                        </div>
                        <ul className="space-y-1 text-neutral-400 pl-4 list-disc text-[10px] leading-relaxed">
                          <li><strong>真实物理落盘</strong>：每个自然段落物理包含 2 个标准全角空格（<code>\u3000\u3000</code>），复制到起点/晋江/Word/TXT 100% 保留缩进</li>
                          <li><strong>回车丝滑连击</strong>：换行直接对齐第三字符，空行再次按回车自动清空空格</li>
                          <li><strong>退格一键清除</strong>：在段首按 <code>Backspace</code> 一次性删除双全角空格</li>
                          <li><strong>标题智能规避</strong>：章回标题（<code># 第一章</code>）、诗词引文（<code>&gt; </code>）与分割线（<code>---</code>）顶格靠左，绝不误加空格</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* 🌟 2. 标点避头尾与微排版 (GB/T 15834 Kinsoku) */}
                <div
                  className="space-y-4 rounded-2xl border p-5"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                        标点避头尾与对齐规范 (GB/T 15834)
                      </span>
                      <p className="text-[10px] opacity-50">避免标点孤立行首，破折号/省略号连用不断开</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Kinsoku Strictness */}
                    <div>
                      <label className="text-[11px] opacity-75 block mb-1.5 font-medium" style={{ color: theme.colors.text }}>
                        避头尾断行级别
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'strict', name: '国标严格 (推荐)', desc: '杜绝句逗冒叹孤立行首' },
                          { id: 'native', name: '浏览器原生', desc: '系统默认折行' },
                        ].map((k) => {
                          const isCur = (kinsokuStrictness || 'strict') === k.id;
                          return (
                            <button
                              key={k.id}
                              onClick={() => onChangeKinsoku?.(k.id as any)}
                              className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                isCur ? 'ring-2 ring-cyan-400/80 shadow-xs font-semibold' : 'hover:border-white/20'
                              }`}
                              style={{
                                backgroundColor: isCur ? `${theme.colors.accent}15` : theme.colors.bgSecondary,
                                borderColor: isCur ? theme.colors.accent : theme.colors.border,
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
                        文本对齐模式
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'justify', name: '出版级两端对齐', desc: '版面方正齐整', icon: AlignJustify },
                          { id: 'left', name: '自然居左对齐', desc: '现代无衬线阅读', icon: AlignLeft },
                        ].map((a) => {
                          const isCur = (textAlignment || 'justify') === a.id;
                          const Icon = a.icon;
                          return (
                            <button
                              key={a.id}
                              onClick={() => onChangeTextAlignment?.(a.id as any)}
                              className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                isCur ? 'ring-2 ring-cyan-400/80 shadow-xs font-semibold' : 'hover:border-white/20'
                              }`}
                              style={{
                                backgroundColor: isCur ? `${theme.colors.accent}15` : theme.colors.bgSecondary,
                                borderColor: isCur ? theme.colors.accent : theme.colors.border,
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
                        标点半角挤压 (Halt Compression)
                      </span>
                      <p className="text-[10px] opacity-50">消除连续标点（如 <code>……”</code> 或 <code>，，</code>）过大的空白间隙</p>
                    </div>
                    <button
                      onClick={onTogglePunctuationHalt}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all ${
                        punctuationHalt !== false
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold'
                          : 'bg-white/5 text-neutral-400 border border-white/5'
                      }`}
                    >
                      {punctuationHalt !== false && <Check className="h-3 w-3" />}
                      <span>{punctuationHalt !== false ? '已开启' : '已关闭'}</span>
                    </button>
                  </div>
                </div>

                {/* 🌟 3. 版心尺寸与微字距滑块矩阵 */}
                <div
                  className="space-y-4 rounded-2xl border p-5"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <span className="font-semibold text-xs block pb-2 border-b border-white/5" style={{ color: theme.colors.text }}>
                    版心尺寸与字距微调
                  </span>

                  {/* Width & Margins */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.colors.text }}>版心最大宽度</span>
                        <span className="font-mono text-cyan-400 font-bold">{contentMaxWidth}px</span>
                      </div>
                      <input
                        type="range"
                        min="560"
                        max="1080"
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

                  {/* Font Size, Line Height, Paragraph Spacing & Letter Spacing */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-white/5">
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
                        min="1.4"
                        max="2.6"
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
                        min="0.2"
                        max="1.5"
                        step="0.05"
                        value={paragraphSpacing}
                        onChange={(e) => onChangeParagraphSpacing(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ color: theme.colors.text }}>字间微距</span>
                        <span className="font-mono text-cyan-400 font-bold">{letterSpacing || 0.02}em</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="0.08"
                        step="0.005"
                        value={letterSpacing || 0.02}
                        onChange={(e) => onChangeLetterSpacing?.(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 🌟 顶栏打字沉浸联动设置 (Titlebar Auto-Hide Immersion) */}
                <div
                  className="space-y-3 rounded-2xl border p-4.5 transition-all"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                        顶栏打字沉浸行为
                      </span>
                      <p className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                        开始码字时自动隐藏或淡化顶部栏目，鼠标移至顶端时平滑唤醒
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { id: 'fade_out', label: '打字完全隐形 (推荐)', desc: '0% 视觉零打扰' },
                      { id: 'dim', label: '打字轻微变淡', desc: '20% 微弱可见' },
                      { id: 'always_visible', label: '始终常驻显示', desc: '100% 保持显示' },
                    ].map((opt) => {
                      const cur = (localStorage.getItem('novelite_titlebar_behavior') as any) || 'fade_out';
                      const isSelected = cur === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            localStorage.setItem('novelite_titlebar_behavior', opt.id);
                            eventBus.emit('titlebar-behavior-changed', opt.id);
                            eventBus.emit('show-toast', { message: `已设置顶栏沉浸为：${opt.label}`, type: 'info' });
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300 font-semibold shadow-xs'
                              : 'bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100 hover:bg-white/5'
                          }`}
                          style={{ color: isSelected ? undefined : theme.colors.text }}
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
                      极简底栏隐藏模式
                    </span>
                    <p className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                      隐藏底部状态栏，获得更纯净的专注写作视野
                    </p>
                  </div>
                  <button
                    onClick={onToggleZeroChrome}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
                      zeroChrome
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold shadow-xs'
                        : 'bg-white/5 text-neutral-400 border border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {zeroChrome && <Check className="h-3 w-3" />}
                    <span>{zeroChrome ? '已开启' : '未开启'}</span>
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
                          打字机视线锁定模式
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400">
                          视线居中
                        </span>
                      </div>
                      <p className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                        平滑自动推移视口，保持光标与当前编辑行处于黄金视线高度，消除低头疲劳
                      </p>
                    </div>

                    <button
                      onClick={() => onToggleTypewriter?.(!typewriterEnabled)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
                        typewriterEnabled
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold shadow-xs'
                          : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {typewriterEnabled && <Check className="h-3 w-3" />}
                      <span>{typewriterEnabled ? '已开启' : '未开启'}</span>
                    </button>
                  </div>

                  {typewriterEnabled && (
                    <div className="space-y-4 pt-3 border-t border-white/5 animate-in fade-in duration-200">
                      {/* 垂直锚点位置 */}
                      <div>
                        <label className="font-medium text-[11px] block mb-2 opacity-80" style={{ color: theme.colors.text }}>
                          视口垂直锁定位置
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { value: 0.38, name: '38% 黄金视线', desc: '微仰舒适阅读位' },
                            { value: 0.50, name: '50% 视口正中', desc: '经典打字机正中' },
                            { value: 0.60, name: '60% 沉浸低位', desc: '自上而下宏观视野' },
                          ].map((item) => {
                            const isCur = Math.abs((typewriterRatio ?? 0.38) - item.value) < 0.04;
                            return (
                              <button
                                key={item.value}
                                onClick={() => onChangeTypewriterRatio?.(item.value)}
                                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                  isCur ? 'ring-2 ring-cyan-400/80 shadow-md font-semibold' : 'hover:border-white/20'
                                }`}
                                style={{
                                  backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bgSecondary,
                                  borderColor: isCur ? theme.colors.accent : theme.colors.border,
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
                          平滑推移节奏
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { id: 'gentle', name: '舒缓流体', desc: '柔和运镜平滑推移' },
                            { id: 'balanced', name: '自然阻尼', desc: '平衡响应顺滑到位' },
                            { id: 'snappy', name: '敏捷极速', desc: '高频紧跟快速响应' },
                          ].map((sp) => {
                            const isCur = (typewriterSpeed ?? 'balanced') === sp.id;
                            return (
                              <button
                                key={sp.id}
                                onClick={() => onChangeTypewriterSpeed?.(sp.id as any)}
                                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                  isCur ? 'ring-2 ring-cyan-400/80 shadow-md font-semibold' : 'hover:border-white/20'
                                }`}
                                style={{
                                  backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bgSecondary,
                                  borderColor: isCur ? theme.colors.accent : theme.colors.border,
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
                          段落与单句专注聚光灯
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 opacity-60">
                          Alt+F
                        </span>
                      </div>
                      <p className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                        照亮当前正在写作的段落或单句，平滑暗化周围文字以消除视觉干扰
                      </p>
                    </div>

                    <button
                      onClick={handleToggleFocusMode}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
                        focusEnabled
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold shadow-xs'
                          : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {focusEnabled && <Check className="h-3 w-3" />}
                      <span>{focusEnabled ? '已开启' : '未开启'}</span>
                    </button>
                  </div>

                  {focusEnabled && (
                    <div className="space-y-4 pt-3 border-t border-white/5 animate-in fade-in duration-200">
                      {/* 聚光范围模式选择 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-medium text-[11px] opacity-80" style={{ color: theme.colors.text }}>
                            聚光范围模式
                          </label>
                          <span className="text-[9.5px] font-mono opacity-40">Alt+Shift+F 快速切换</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { id: 'paragraph', name: '当前逻辑段落', desc: '完整照亮长段落全部折行' },
                            { id: 'sentence', name: '当前单句推敲', desc: '以标点为界单句雕琢' },
                            { id: 'horizon', name: '三行微光渐变', desc: '当前行100%，相邻62%' },
                          ].map((mode) => {
                            const isCur = focusScope === mode.id;
                            return (
                              <button
                                key={mode.id}
                                onClick={() => handleChangeFocusScope(mode.id as FocusScope)}
                                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                  isCur ? 'ring-2 ring-cyan-400/80 shadow-md font-semibold' : 'hover:border-white/20'
                                }`}
                                style={{
                                  backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bgSecondary,
                                  borderColor: isCur ? theme.colors.accent : theme.colors.border,
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
                            周围非活动文字暗化深度
                          </label>
                          <span className="text-xs font-mono text-cyan-400 font-semibold">
                            {Math.round((1 - focusDimOpacity) * 100)}% 弱化 (透明度 {Math.round(focusDimOpacity * 100)}%)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.10}
                          max={0.55}
                          step={0.02}
                          value={focusDimOpacity}
                          onChange={(e) => handleChangeFocusDimOpacity(parseFloat(e.target.value))}
                          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10 accent-cyan-400"
                        />
                        <div className="flex justify-between text-[9.5px] opacity-40 font-mono mt-1">
                          <span>0.10 (深邃沉浸)</span>
                          <span>0.28 (标准平衡)</span>
                          <span>0.55 (轻度微暗)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 🌟 小说台词对话微光设置卡片 (Dialogue Highlighter 2.0 Card) */}
                <div
                  className="space-y-4 rounded-2xl border p-5 transition-all"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                          小说台词对话微光
                        </span>
                      </div>
                      <p className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                        自动为引号内对白（“” / 「」 / 『』）与心理独白赋予清晰微光，增强小说对话节奏感
                      </p>
                    </div>

                    <button
                      onClick={handleToggleDialogue}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
                        dialogueEnabled
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold shadow-xs'
                          : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {dialogueEnabled && <Check className="h-3 w-3" />}
                      <span>{dialogueEnabled ? '已开启' : '未开启'}</span>
                    </button>
                  </div>

                  {dialogueEnabled && (
                    <div className="space-y-4 pt-3 border-t border-white/5 animate-in fade-in duration-200">
                      {/* 台词颜色预设选择 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-medium text-[11px] opacity-80" style={{ color: theme.colors.text }}>
                            台词高亮颜色
                          </label>
                          <span className="text-[10px] font-mono opacity-50">
                            {dialogueColorPreset === 'custom' ? `自定义: ${dialogueCustomColor}` : (DIALOGUE_COLOR_MAP[dialogueColorPreset as keyof typeof DIALOGUE_COLOR_MAP]?.name || '跟随主题')}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                          {(Object.keys(DIALOGUE_COLOR_MAP) as (keyof typeof DIALOGUE_COLOR_MAP)[]).map((presetKey) => {
                            const item = DIALOGUE_COLOR_MAP[presetKey];
                            const isCur = dialogueColorPreset === presetKey;
                            return (
                              <button
                                key={presetKey}
                                onClick={() => handleChangeDialogueColorPreset(presetKey)}
                                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                                  isCur
                                    ? 'ring-2 ring-cyan-400/80 shadow-md font-semibold'
                                    : 'hover:border-white/20'
                                }`}
                                style={{
                                  backgroundColor: isCur ? theme.colors.bgHover : theme.colors.bgSecondary,
                                  borderColor: isCur ? theme.colors.accent : theme.colors.border,
                                }}
                              >
                                <span
                                  className="h-3.5 w-3.5 rounded-full mb-1 shadow-xs"
                                  style={{ backgroundColor: presetKey === 'theme' ? (theme.colors.accent || '#38bdf8') : item.hex }}
                                />
                                <span className="text-[10px] leading-tight" style={{ color: theme.colors.text }}>
                                  {item.name}
                                </span>
                              </button>
                            );
                          })}

                          {/* 自定义颜色按钮 */}
                          <button
                            onClick={() => handleChangeDialogueColorPreset('custom')}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                              dialogueColorPreset === 'custom'
                                ? 'ring-2 ring-cyan-400/80 shadow-md font-semibold'
                                : 'hover:border-white/20'
                            }`}
                            style={{
                              backgroundColor: dialogueColorPreset === 'custom' ? theme.colors.bgHover : theme.colors.bgSecondary,
                              borderColor: dialogueColorPreset === 'custom' ? theme.colors.accent : theme.colors.border,
                            }}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full mb-1 shadow-xs border border-white/30"
                              style={{ backgroundColor: dialogueCustomColor }}
                            />
                            <span className="text-[10px] leading-tight" style={{ color: theme.colors.text }}>
                              自定义
                            </span>
                          </button>
                        </div>

                        {/* 自定义颜色细调栏 */}
                        {dialogueColorPreset === 'custom' && (
                          <div
                            className="mt-3 p-3 rounded-xl border space-y-2.5 animate-in fade-in duration-150"
                            style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-medium" style={{ color: theme.colors.text }}>
                                自由调色板 / 取色器
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={dialogueCustomColor}
                                  onChange={(e) => handleChangeDialogueCustomColor(e.target.value)}
                                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                                />
                                <input
                                  type="text"
                                  value={dialogueCustomColor}
                                  onChange={(e) => handleChangeDialogueCustomColor(e.target.value)}
                                  placeholder="#38bdf8"
                                  className="w-20 px-2 py-0.5 rounded border text-[11px] font-mono outline-none text-center"
                                  style={{
                                    backgroundColor: theme.colors.bg,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text,
                                  }}
                                />
                              </div>
                            </div>

                            {/* 文人雅致推荐快选色条 */}
                            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/5">
                              <span className="text-[9.5px] opacity-40">雅致推荐:</span>
                              {[
                                { name: '天青', hex: '#38bdf8' },
                                { name: '竹青', hex: '#34d399' },
                                { name: '金杏', hex: '#fbbf24' },
                                { name: '朱砂', hex: '#f87171' },
                                { name: '海棠', hex: '#f472b6' },
                                { name: '黛紫', hex: '#a78bfa' },
                                { name: '茶白', hex: '#fde047' },
                                { name: '霜月', hex: '#cbd5e1' },
                              ].map((c) => (
                                <button
                                  key={c.hex}
                                  onClick={() => handleChangeDialogueCustomColor(c.hex)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] border border-white/10 hover:border-white/30 transition-all"
                                  style={{ backgroundColor: `${c.hex}15` }}
                                >
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.hex }} />
                                  <span style={{ color: c.hex }}>{c.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 心理独白括号开关 */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div>
                          <span className="font-medium text-[11px]" style={{ color: theme.colors.text }}>
                            高亮心理独白 （……）
                          </span>
                          <p className="text-[9.5px] opacity-40">自动识别全角及半角括号内的角色心理活动并应用轻柔斜体</p>
                        </div>
                        <button
                          onClick={handleToggleDialogueThoughts}
                          className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-mono transition-all ${
                            dialogueHighlightThoughts
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold'
                              : 'bg-white/5 text-neutral-400 border border-white/5 hover:bg-white/10'
                          }`}
                        >
                          {dialogueHighlightThoughts ? '已开启' : '未开启'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 🌟 敏捷编辑与快捷键工坊卡片 (Editor Toolkit Card) */}
                <div
                  className="space-y-4 rounded-2xl border p-5 transition-all"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                          敏捷编辑与小说排版工坊
                        </span>
                      </div>
                      <p className="text-[10px] opacity-50 mt-0.5" style={{ color: theme.colors.textMuted }}>
                        包含极简悬浮查找与替换 (Ctrl+F/H)、段落顺移、多光标编辑与一键排版规范化清洗
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onClose();
                          setTimeout(() => {
                            eventBus.emit('open-floating-search', { mode: 'search' });
                          }, 150);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs bg-white/5 hover:bg-white/10 border border-white/10 transition-all opacity-80 hover:opacity-100 cursor-pointer"
                        style={{ color: theme.colors.text }}
                      >
                        <Search className="h-3 w-3" />
                        <span>查找 (Ctrl+F)</span>
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          setTimeout(() => {
                            eventBus.emit('open-floating-search', { mode: 'replace' });
                          }, 150);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all font-semibold cursor-pointer"
                      >
                        <Replace className="h-3 w-3" />
                        <span>批量替换 (Ctrl+H)</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[11px]" style={{ color: theme.colors.text }}>
                        中文小说快捷键速查与键位绑定
                      </span>
                      <span className="text-[9.5px] opacity-40 font-mono">全局原生拦截 · 0 毫秒响应</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {[
                        { name: '查找文本', key: 'Ctrl + F', desc: '顶部极简悬浮搜索 HUD' },
                        { name: '查找与替换', key: 'Ctrl + H', desc: '全篇/单处批量替换改名' },
                        { name: '整段/整行上移', key: 'Alt + ↑', desc: '无损调换段落与对白先后顺序' },
                        { name: '整段/整行下移', key: 'Alt + ↓', desc: '无损下移当前段落' },
                        { name: '在下方新建自然段', key: 'Ctrl + Enter', desc: '光标无需移动至句末' },
                        { name: '删除当前整段', key: 'Ctrl + Shift + K', desc: '一键删废话自动吸合' },
                        { name: '多光标选词同步改', key: 'Ctrl + D', desc: '连续按选中下一个同名词' },
                        { name: '一键中文排版清洗', key: 'Ctrl + Shift + L', desc: '去首行死空格/折叠空行/修标点' },
                        { name: '设为章回标题', key: 'Ctrl + 1', desc: '行首添加/切换 # 一级标题' },
                        { name: '设为分卷小节', key: 'Ctrl + 2', desc: '行首添加/切换 ## 二级标题' },
                        { name: '清除标题恢复正文', key: 'Ctrl + 0', desc: '清除行首 # 恢复普通段落' },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl border border-white/5 bg-black/20"
                        >
                          <div>
                            <span className="font-medium" style={{ color: theme.colors.text }}>
                              {item.name}
                            </span>
                            <p className="text-[9px] opacity-40">{item.desc}</p>
                          </div>
                          <kbd
                            className="px-2 py-0.5 rounded-lg text-[10px] font-mono border font-semibold shadow-xs"
                            style={{
                              backgroundColor: theme.colors.bgSecondary,
                              borderColor: `${theme.colors.accent}40`,
                              color: theme.colors.accent || '#38bdf8',
                            }}
                          >
                            {item.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
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

            {/* TAB 5: UNIFIED PLUGINS HUB & EXTENSIONS */}
            {activeTab === 'plugins' && (
              <div className="space-y-5">
                {/* 🌟 1. Top Header: Filter Pills & Action Buttons */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-wrap gap-2.5">
                  {/* Filter Pills */}
                  <div className="flex items-center p-1 rounded-xl bg-black/30 border border-white/5">
                    <button
                      onClick={() => setPluginFilter('all')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        pluginFilter === 'all'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold'
                          : 'opacity-60 hover:opacity-100 text-neutral-300'
                      }`}
                    >
                      <span>全部插件</span>
                      <span className="text-[10px] font-mono opacity-60">
                        ({pluginManager.getAllPlugins().length + AVAILABLE_COMMUNITY_PLUGINS.filter((p) => !pluginManager.getAllPlugins().some((ip) => ip.metadata.id === p.metadata.id)).length})
                      </span>
                    </button>

                    <button
                      onClick={() => setPluginFilter('installed')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        pluginFilter === 'installed'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold'
                          : 'opacity-60 hover:opacity-100 text-neutral-300'
                      }`}
                    >
                      <span>已启用</span>
                      <span className="text-[10px] font-mono opacity-60">
                        ({pluginManager.getEnabledPlugins().length})
                      </span>
                    </button>

                    <button
                      onClick={() => setPluginFilter('available')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        pluginFilter === 'available'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold'
                          : 'opacity-60 hover:opacity-100 text-neutral-300'
                      }`}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>扩展库</span>
                      <span className="text-[10px] font-mono opacity-60">
                        ({AVAILABLE_COMMUNITY_PLUGINS.filter((p) => !pluginManager.getAllPlugins().some((ip) => ip.metadata.id === p.metadata.id)).length})
                      </span>
                    </button>
                  </div>

                  {/* Actions: Custom JS script */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCustomScriptModalOpen(true)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-mono"
                      style={{ color: theme.colors.text }}
                    >
                      <Code2 className="h-3.5 w-3.5 text-cyan-400" />
                      <span>+ 自定义脚本 (JS)</span>
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
                      placeholder="搜索插件名称、作者 (如 hirovel)、功能或快捷键 (如 Alt+T)..."
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
                    title="刷新插件列表"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs font-mono shrink-0 disabled:opacity-50"
                    style={{ color: theme.colors.text }}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isRefreshingRegistry ? 'animate-spin' : ''}`} />
                    <span>{isRefreshingRegistry ? '刷新中...' : '刷新'}</span>
                  </button>
                </div>

                {/* 🌟 3. Unified Plugin Cards List */}
                <div className="space-y-3">
                  {/* 3.1 Local Installed & Built-in Plugins */}
                  {pluginFilter !== 'available' &&
                    pluginManager
                      .getAllPlugins()
                      .filter((p) => {
                        const isEnabled = pluginManager.isPluginEnabled(p.metadata.id);
                        if (pluginFilter === 'installed' && !isEnabled) return false;

                        if (!pluginSearch.trim()) return true;
                        const q = pluginSearch.toLowerCase().trim();
                        const info = PLUGIN_RICH_INFO[p.metadata.id];
                        const matchName = p.metadata.name.toLowerCase().includes(q);
                        const matchDesc = p.metadata.description.toLowerCase().includes(q);
                        const matchAuthor = (p.metadata.author || '').toLowerCase().includes(q);
                        const matchShortcuts = info?.shortcuts.some((s) => s.toLowerCase().includes(q)) ?? false;
                        return matchName || matchDesc || matchAuthor || matchShortcuts;
                      })
                      .map((p) => {
                        const isEnabled = pluginManager.isPluginEnabled(p.metadata.id);
                        const info = PLUGIN_RICH_INFO[p.metadata.id];
                        const IconComp = info?.icon || COMMUNITY_ICONS[p.metadata.icon || ''] || Layers;
                        const isCommunityInstalled = dynamicPluginLoader.isCommunityPluginInstalled(p.metadata.id);

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
                                      {p.metadata.name}
                                    </span>
                                    <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-neutral-400 border border-white/5">
                                      v{p.metadata.version}
                                    </span>
                                    {p.metadata.author && (
                                      <span className="text-[10px] opacity-40 font-mono">
                                        by {p.metadata.author}
                                      </span>
                                    )}
                                    {info?.category && (
                                      <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/5 text-neutral-400">
                                        {info.category}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] leading-relaxed opacity-65" style={{ color: theme.colors.textMuted }}>
                                    {p.metadata.description}
                                  </p>
                                </div>
                              </div>

                              {/* Toggle or Uninstall */}
                              <div className="flex items-center gap-2 shrink-0">
                                {isCommunityInstalled && (
                                  <button
                                    onClick={() => handleUninstallCommunityPlugin(p.metadata.id)}
                                    className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                                    title="卸载此扩展"
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
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all shrink-0 ${
                                    isEnabled
                                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold'
                                      : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10'
                                  }`}
                                >
                                  {isEnabled && <Check className="h-3 w-3" />}
                                  <span>{isEnabled ? '已启用' : '已禁用'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Footer with shortcut and jump */}
                            {info && (info.shortcuts.length > 0 || info.targetTab) && (
                              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10.5px]">
                                <div className="flex items-center gap-1.5">
                                  {info.shortcuts.map((s, idx) => (
                                    <kbd
                                      key={idx}
                                      className="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-neutral-300"
                                    >
                                      {s}
                                    </kbd>
                                  ))}
                                </div>

                                {info.targetTab && (
                                  <button
                                    onClick={() => setActiveTab(info.targetTab!)}
                                    className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity ml-auto text-[11px]"
                                    style={{ color: theme.colors.accent }}
                                  >
                                    <span>前往详细配置</span>
                                    <ChevronRight className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                  {/* 3.2 Uninstalled Online Plugins */}
                  {pluginFilter !== 'installed' &&
                    AVAILABLE_COMMUNITY_PLUGINS.filter(
                      (p) => !pluginManager.getAllPlugins().some((ip) => ip.metadata.id === p.metadata.id)
                    )
                      .filter((p) => {
                        if (!pluginSearch.trim()) return true;
                        const q = pluginSearch.toLowerCase().trim();
                        const matchName = p.metadata.name.toLowerCase().includes(q);
                        const matchDesc = p.metadata.description.toLowerCase().includes(q);
                        const matchAuthor = (p.metadata.author || '').toLowerCase().includes(q);
                        return matchName || matchDesc || matchAuthor;
                      })
                      .map((item) => {
                        const IconComp = COMMUNITY_ICONS[item.metadata.icon || ''] || Globe;

                        return (
                          <div
                            key={item.metadata.id}
                            className="rounded-2xl border p-4 flex items-start justify-between gap-4 transition-all bg-white/2"
                            style={{ borderColor: theme.colors.border }}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border"
                                style={{
                                  backgroundColor: 'rgba(255,255,255,0.03)',
                                  color: theme.colors.textMuted,
                                  borderColor: 'rgba(255,255,255,0.06)',
                                }}
                              >
                                <IconComp className="h-4.5 w-4.5" />
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                                    {item.metadata.name}
                                  </span>
                                  <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-neutral-400">
                                    v{item.metadata.version}
                                  </span>
                                  {item.metadata.author && (
                                    <span className="text-[10px] opacity-40 font-mono">
                                      by {item.metadata.author}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] leading-relaxed opacity-65" style={{ color: theme.colors.textMuted }}>
                                  {item.metadata.description}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleInstallCommunityPlugin(item.metadata.id)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all shrink-0 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 font-semibold"
                            >
                              <Download className="h-3 w-3" />
                              <span>安装</span>
                            </button>
                          </div>
                        );
                      })}

                  {/* 3.3 Custom Injected JS Scripts */}
                  {dynamicPluginLoader.getAllCustomPlugins().length > 0 && (
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <span className="font-semibold text-xs opacity-75" style={{ color: theme.colors.text }}>
                        自定义注入的 JavaScript 脚本
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
                              <span className="text-[9.5px] font-mono text-cyan-400/80">({c.id})</span>
                            </div>
                            <p className="text-[10.5px] opacity-60 line-clamp-1" style={{ color: theme.colors.textMuted }}>
                              {c.description}
                            </p>
                          </div>

                          <button
                            onClick={() => handleUninstallCustomPlugin(c.id)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 transition-all shrink-0"
                          >
                            卸载
                          </button>
                        </div>
                      ))}
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
                <Code2 className="h-4 w-4 text-cyan-400" />
                <h4 className="font-bold text-sm" style={{ color: theme.colors.text }}>
                  编写 / 注入自定义小说插件 (JavaScript)
                </h4>
              </div>
              <button
                onClick={() => setIsCustomScriptModalOpen(false)}
                className="p-1 rounded-full opacity-60 hover:opacity-100"
                style={{ color: theme.colors.text }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs opacity-70 leading-relaxed" style={{ color: theme.colors.textMuted }}>
              编写符合 <code>NovelitePlugin</code> 接口的 JavaScript 脚本。插件初始化时将获得 <code>PluginContext</code>（支持注册命令、快捷键、编辑器扩展与提示）。
            </p>

            <div className="space-y-1.5">
              <textarea
                value={customScriptCode}
                onChange={(e) => setCustomScriptCode(e.target.value)}
                rows={12}
                spellCheck={false}
                className="w-full p-3 rounded-xl border text-xs font-mono outline-hidden focus:border-cyan-400 leading-relaxed resize-none"
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
                className="px-4 py-2 rounded-xl text-xs font-sans opacity-70 hover:opacity-100"
                style={{ color: theme.colors.text }}
              >
                取消
              </button>
              <button
                onClick={handleSaveAndRunCustomScript}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all font-mono"
              >
                测试运行并安装
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
