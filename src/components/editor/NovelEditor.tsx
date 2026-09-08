import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, undo, redo } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { projectStore, countWordsFast } from '../../core/storage/ProjectStore';
import { fileSystemStore } from '../../core/storage/FileSystemStore';
import { safeStorageSet } from '../../core/storage/safeStorage';
import { pluginManager } from '../../core/plugins/PluginManager';
import { eventBus } from '../../core/events/EventBus';
import type { Theme } from '../../core/themes/types';
import { createLiveCursorPluginExtension } from '../../plugins/live-cursor/liveCursorExtension';
import { FloatingSearchHUD } from './FloatingSearchHUD';
import {
  formatNovelParagraphs,
  removeLeadingIndents,
  cleanChinesePunctuation,
} from '../../plugins/chinese-typography/chineseTypographyToolkit';
import { EditorBackground } from './EditorBackground';
import type { BackgroundEffect } from './EditorBackground';
import {
  ArrowLeftRight,
  Rows3,
  Columns,
  X,
  ChevronDown,
  Search,
  Check,
} from 'lucide-react';
import { useTranslation } from '../../core/i18n';

interface Props {
  paneId?: 'primary' | 'secondary';
  boundChapterId?: string;
  onSelectChapter?: (chapterId: string) => void;
  showPaneHeader?: boolean;
  onClosePane?: () => void;
  onSwapPanes?: () => void;
  onToggleSplitDirection?: () => void;
  splitDirection?: 'horizontal' | 'vertical';
  theme: Theme;
  cursorShape: 'beam' | 'block' | 'underline';
  cursorColor: string;
  cursorSpeed: 'snappy' | 'smooth' | 'instant';
  cursorAnimationLength: number;
  cursorTrailSize: number;
  vfxMode: 'pure' | 'particles' | 'glow' | 'embers' | 'ripples' | 'feather';
  blinkMode: 'smooth' | 'blink' | 'solid';
  breatheCycle: number;
  speedMode: 'gentle' | 'balanced' | 'snappy' | 'instant';
  physicsMode?: 'fluid' | 'ribbon' | 'quantum';
  luminescence?: boolean;
  inlineSkew?: boolean;
  streamPreset?: string;
  streamHeadColor?: string;
  streamTailColor?: string;
  backgroundEffect: BackgroundEffect;
  backgroundIntensity: number;
  customImage?: string | null;
  customImageBlur?: number;
  customImageDim?: number;
  fontPreset: 'lxgw' | 'songti' | 'sans' | 'mono' | 'custom';
  customFontName: string;
  fontSize: number;
  lineHeight: number;
  editorTextColor?: string;
  contentMaxWidth?: number;
  spotlightMode?: 'none' | 'paragraph';
}

function createEditorTheme(
  theme: Theme,
  backgroundEffect: BackgroundEffect = 'solid',
  backgroundIntensity: number = 0.65,
  lineHeight: number = 1.95,
  editorTextColor?: string
) {
  const isRuled = backgroundEffect === 'ruled';
  const ruledAlpha = Math.max(0.15, Math.min(0.65, (backgroundIntensity || 0.65) * 0.45));
  const ruledColor = theme.colors.accent
    ? `${theme.colors.accent}${Math.round(ruledAlpha * 255).toString(16).padStart(2, '0')}`
    : theme.isDark
    ? `rgba(255, 255, 255, ${ruledAlpha})`
    : `rgba(0, 0, 0, ${ruledAlpha * 0.8})`;

  const resolvedTextColor = (!editorTextColor || editorTextColor === 'auto')
    ? theme.colors.editorText
    : editorTextColor;

  return EditorView.theme({
    '&': {
      height: '100%',
      width: '100%',
      backgroundColor: 'transparent',
      color: resolvedTextColor,
      outline: 'none !important',
    },
    '.cm-scroller': {
      position: 'relative',
      overflowY: 'auto',
      overflowX: 'hidden',
      backgroundColor: 'transparent',
      height: '100%',
      width: '100%',
      scrollbarWidth: 'thin',
      scrollbarColor: `${theme.colors.border}80 transparent`,
      maskImage:
        'linear-gradient(to bottom, transparent 0px, black 36px, black calc(100% - 36px), transparent 100%)',
      WebkitMaskImage:
        'linear-gradient(to bottom, transparent 0px, black 36px, black calc(100% - 36px), transparent 100%)',
      '&::-webkit-scrollbar': {
        width: '3px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '&::-webkit-scrollbar-thumb': {
        background: `${theme.colors.border}80`,
        borderRadius: '3px',
      },
    },
    '.cm-content': {
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      padding: '40px 48px 65vh 48px',
      caretColor: 'transparent !important',
      fontFeatureSettings: '"kern" 1, "liga" 1',
      color: `${resolvedTextColor} !important`,
    },
    '.cm-cursor, .cm-cursor-primary, .cm-cursor-secondary, .cm-dropCursor': {
      display: 'none !important',
      opacity: '0 !important',
      visibility: 'hidden !important',
      borderLeft: 'none !important',
      width: '0 !important',
    },
    // 🌟 GPU 硬件级段落聚光灯与真实文本精准对齐横线 (True Baseline-Aligned Ruled Lines)
    '.cm-line': {
      boxSizing: 'border-box',
      width: '100%',
      color: `${resolvedTextColor} !important`,
      contain: 'style layout',
      transition: 'opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.18s ease',
      ...(isRuled
        ? {
            backgroundImage: `linear-gradient(to bottom, transparent calc(${lineHeight}em - 1px), ${ruledColor} calc(${lineHeight}em - 1px), ${ruledColor} 100%)`,
            backgroundSize: `100% ${lineHeight}em`,
            backgroundRepeat: 'repeat-y',
            backgroundPosition: '0 0',
          }
        : {}),
    },
    '.cm-line span:not(.cm-dialogue-quote)': {
      color: 'inherit !important',
    },
    // 🌟 稿纸/信纸模式对于大标题、分卷标题与特殊块的精准适配 (Clean Heading Alignment)
    '.cm-line.cm-line-h1': {
      backgroundImage: 'none !important',
      ...(isRuled
        ? {
            borderBottom: `1.5px solid ${ruledColor}`,
            paddingBottom: '10px !important',
            marginBottom: '16px !important',
          }
        : {}),
    },
    '.cm-line.cm-line-h2': {
      backgroundImage: 'none !important',
      ...(isRuled
        ? {
            borderBottom: `1px solid ${ruledColor}`,
            paddingBottom: '8px !important',
            marginBottom: '12px !important',
          }
        : {}),
    },
    '.cm-line.cm-line-h3, .cm-line.cm-line-h4, .cm-line.cm-line-hr, .cm-line.cm-line-code': {
      backgroundImage: 'none !important',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(167, 139, 250, 0.18) !important',
      borderRadius: '4px',
    },
    '&.cm-focused .cm-selectionBackground': {
      pointerEvents: 'none !important',
      backgroundColor: `${theme.colors.selection || 'rgba(167, 139, 250, 0.32)'} !important`,
      borderRadius: '4px',
    },
    '::selection, .cm-content ::selection, .cm-line ::selection, .cm-scroller ::selection': {
      backgroundColor: 'transparent !important',
      color: 'inherit !important',
    },
  });
}

export const NovelEditor: React.FC<Props> = ({
  paneId = 'primary',
  boundChapterId,
  onSelectChapter,
  showPaneHeader = false,
  onClosePane,
  onSwapPanes,
  onToggleSplitDirection,
  splitDirection = 'vertical',
  theme,
  cursorShape,
  cursorColor,
  cursorSpeed: _cursorSpeed,
  cursorAnimationLength,
  cursorTrailSize,
  vfxMode,
  blinkMode,
  breatheCycle,
  speedMode,
  physicsMode = 'fluid',
  luminescence = true,
  inlineSkew = true,
  streamPreset = 'theme',
  streamHeadColor,
  streamTailColor,
  backgroundEffect,
  backgroundIntensity,
  customImage,
  customImageBlur,
  customImageDim,
  fontPreset: _fontPreset,
  customFontName: _customFontName,
  fontSize: _fontSize,
  lineHeight = 1.95,
  editorTextColor = 'auto',
  contentMaxWidth: _contentMaxWidth,
  spotlightMode: _spotlightMode = 'paragraph',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const isComposingRef = useRef<boolean>(false);

  const typingTimerRef = useRef<any>(null);
  const saveDebounceTimerRef = useRef<any>(null);
  const { t, language } = useTranslation();
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // 🌟 Secondary Pane Autonomous Chapter ID
  const [secondaryChapterId, setSecondaryChapterId] = useState<string | null>(() => {
    if (boundChapterId) return boundChapterId;
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

  // 🌟 章节快速切换 Popover
  const [isChapterDropdownOpen, setIsChapterDropdownOpen] = useState<boolean>(false);
  const [chapterSearchQuery, setChapterSearchQuery] = useState<string>('');
  const chapterDropdownRef = useRef<HTMLDivElement | null>(null);

  const initialThemeRef = useRef<Theme>(theme);
  const themeCompartmentRef = useRef<Compartment>(new Compartment());
  const pluginsCompartmentRef = useRef<Compartment>(new Compartment());
  const cursorCompartmentRef = useRef<Compartment>(new Compartment());

  const [activeChapterTitle, setActiveChapterTitle] = useState<string>('');
  const [charCount, setCharCount] = useState<number>(0);

  const [isLiveCursorEnabled, setIsLiveCursorEnabled] = useState<boolean>(() => {
    return pluginManager.isPluginEnabled('plugin-live-cursor');
  });

  useEffect(() => {
    const unsub = eventBus.on('plugins-changed', () => {
      setIsLiveCursorEnabled(pluginManager.isPluginEnabled('plugin-live-cursor'));
    });
    return unsub;
  }, []);

  const secondaryChapterIdRef = useRef(secondaryChapterId);
  useEffect(() => {
    secondaryChapterIdRef.current = secondaryChapterId;
  }, [secondaryChapterId]);

  const [prevBoundChapterId, setPrevBoundChapterId] = useState(boundChapterId);
  if (paneId === 'secondary' && boundChapterId !== prevBoundChapterId) {
    setPrevBoundChapterId(boundChapterId);
    if (boundChapterId && boundChapterId !== secondaryChapterId) {
      setSecondaryChapterId(boundChapterId);
    }
  }

  const cursorConfigRef = useRef<any>({
    enabled: isLiveCursorEnabled,
    shape: cursorShape,
    color: cursorColor,
    themeColor: theme.colors.cursor || theme.colors.accent || '#a78bfa',
    themeStreamColors: theme.cursorStream,
    animationLength: cursorAnimationLength || 0.08,
    trailSize: cursorTrailSize || 0.75,
    vfxMode: (vfxMode as any) || 'pure',
    blinkMode: blinkMode || 'smooth',
    breatheCycle: breatheCycle || 1.2,
    speedMode: (speedMode as any) || 'gentle',
    physicsMode,
    luminescence,
    inlineSkew,
    streamPreset: streamPreset as any,
    streamHeadColor,
    streamTailColor,
    glow: true,
  });
  useEffect(() => {
    cursorConfigRef.current = {
      enabled: isLiveCursorEnabled,
      shape: cursorShape,
      color: cursorColor,
      themeColor: theme.colors.cursor || theme.colors.accent || '#a78bfa',
      themeStreamColors: theme.cursorStream,
      animationLength: cursorAnimationLength || 0.08,
      trailSize: cursorTrailSize || 0.75,
      vfxMode: (vfxMode as any) || 'pure',
      blinkMode: blinkMode || 'smooth',
      breatheCycle: breatheCycle || 1.2,
      speedMode: (speedMode as any) || 'gentle',
      physicsMode,
      luminescence,
      inlineSkew,
      streamPreset: streamPreset as any,
      streamHeadColor,
      streamTailColor,
      glow: true,
    };
  }, [
    isLiveCursorEnabled,
    cursorShape,
    cursorColor,
    theme.colors.cursor,
    theme.colors.accent,
    theme.cursorStream,
    cursorAnimationLength,
    cursorTrailSize,
    vfxMode,
    blinkMode,
    breatheCycle,
    speedMode,
    physicsMode,
    luminescence,
    inlineSkew,
    streamPreset,
    streamHeadColor,
    streamTailColor,
  ]);

  const themeConfigRef = useRef<any>({
    theme,
    backgroundEffect,
    backgroundIntensity,
    lineHeight,
    editorTextColor,
  });
  useEffect(() => {
    themeConfigRef.current = {
      theme,
      backgroundEffect,
      backgroundIntensity,
      lineHeight,
      editorTextColor,
    };
  }, [theme, backgroundEffect, backgroundIntensity, lineHeight, editorTextColor]);

  const handleUserActivity = useCallback(() => {
    if (containerRef.current?.classList.contains('is-typing')) {
      containerRef.current.classList.remove('is-typing');
      eventBus.emit('typing-state-changed', false);
    }
  }, []);

  // 🌟 1. 初始化 CodeMirror 实例 (只执行一次，终生不销毁重建)
  useEffect(() => {
    if (!editorRef.current) return;

    let initialContent = '';
    let initialTitle = languageRef.current === 'en' ? 'Untitled Chapter' : '未命名章节';

    if (paneId === 'secondary') {
      const project = projectStore.getProject();
      const initTargetId = secondaryChapterIdRef.current;
      if (project && initTargetId) {
        for (const vol of project.volumes) {
          const found = vol.chapters.find((c) => c.id === initTargetId);
          if (found) {
            initialContent = found.content || '';
            initialTitle = found.title || (languageRef.current === 'en' ? 'Untitled Chapter' : '未命名章节');
            break;
          }
        }
      }
    } else {
      const activeChap = projectStore.getActiveChapter();
      initialContent = activeChap?.content || '';
      initialTitle = activeChap?.title || (languageRef.current === 'en' ? 'Untitled Chapter' : '未命名章节');
    }

    setActiveChapterTitle(initialTitle);
    const initialWords = countWordsFast(initialContent);
    setCharCount(initialWords);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isUpdatingRef.current) {
        // 🌟 1. 纯 DOM 驱动心流隐退 (仅在真实打字时触发)
        if (containerRef.current) {
          containerRef.current.classList.add('is-typing');
        }
        eventBus.emit('typing-state-changed', true);

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.classList.remove('is-typing');
          }
          eventBus.emit('typing-state-changed', false);
        }, 1200);

        // 🌟 2. 防抖序列化保存
        if (saveDebounceTimerRef.current) clearTimeout(saveDebounceTimerRef.current);
        saveDebounceTimerRef.current = setTimeout(() => {
          const newContent = update.state.doc.toString();
          const curTargetId = paneId === 'secondary' ? secondaryChapterIdRef.current : projectStore.getActiveChapter()?.id;
          if (curTargetId) {
            projectStore.updateChapterContent(curTargetId, newContent);
            fileSystemStore.writeChapterDirectToDisk(curTargetId, newContent);
            eventBus.emit('chapter-content-updated', { chapterId: curTargetId, content: newContent });
          }
          const exactCount = countWordsFast(newContent);
          setCharCount(exactCount);
        }, 250);
      }

      if (update.docChanged || update.selectionSet) {
        if (update.view.hasFocus) {
          const head = update.state.selection.main.head;
          const line = update.state.doc.lineAt(head);
          eventBus.emit('cursor-moved', {
            line: line.number,
            col: head - line.from + 1,
            from: update.state.selection.main.from,
            to: update.state.selection.main.to,
          });
        }
      }
    });

    const pluginExtensions = pluginManager.getEditorExtensions();

    const startState = EditorState.create({
      doc: initialContent,
      extensions: [
        history(),
        drawSelection(),
        markdown(),
        EditorView.lineWrapping,
        themeCompartmentRef.current.of(
          createEditorTheme(
            initialThemeRef.current,
            themeConfigRef.current.backgroundEffect,
            themeConfigRef.current.backgroundIntensity,
            themeConfigRef.current.lineHeight,
            themeConfigRef.current.editorTextColor
          )
        ),
        cursorCompartmentRef.current.of(
          createLiveCursorPluginExtension(() => cursorConfigRef.current)
        ),
        pluginsCompartmentRef.current.of(pluginExtensions),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    setEditorView(view);

    // IME Composition listeners
    const handleCompStart = () => {
      isComposingRef.current = true;
    };
    const handleCompEnd = () => {
      isComposingRef.current = false;
    };
    view.contentDOM.addEventListener('compositionstart', handleCompStart);
    view.contentDOM.addEventListener('compositionend', handleCompEnd);

    // External chapter change listener for primary pane
    const unsubSelect = eventBus.on('chapter-selected', (chapter: any, options?: { targetPos?: number; targetLength?: number; targetText?: string }) => {
      if (paneId !== 'primary') return;
      if (!chapter) return;

      isUpdatingRef.current = true;
      setActiveChapterTitle(chapter.title || (languageRef.current === 'en' ? 'Untitled Chapter' : '未命名章节'));
      const text = chapter.content || '';
      const wCount = countWordsFast(text);
      setCharCount(wCount);

      const targetPos = options?.targetPos ?? -1;
      const targetLength = options?.targetLength ?? 0;
      let anchor = 0;
      let head = 0;

      if (targetPos >= 0 && targetPos <= text.length) {
        anchor = targetPos;
        head = Math.min(text.length, targetPos + targetLength);
      }

      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        selection: { anchor, head },
        effects: targetPos >= 0 ? EditorView.scrollIntoView(anchor, { y: 'center' }) : undefined,
        scrollIntoView: targetPos < 0,
      });

      if (targetPos >= 0) {
        setTimeout(() => {
          view.focus();
        }, 30);
      }

      isUpdatingRef.current = false;
    });

    // Match navigation listener (for global search jumps)
    const unsubNavigateToMatch = eventBus.on(
      'editor:navigate-to-match',
      (data: { chapterId?: string; index?: number; length?: number; matchText?: string }) => {
        if (paneId !== 'primary') return;
        if (!data) return;

        const docLength = view.state.doc.length;
        let targetPos = typeof data.index === 'number' ? data.index : -1;
        let targetLength = typeof data.length === 'number' ? data.length : 0;

        // Fallback: If index is out of range or invalid, search matchText in doc
        if ((targetPos < 0 || targetPos > docLength) && data.matchText) {
          const fullText = view.state.doc.toString();
          const found = fullText.indexOf(data.matchText);
          if (found !== -1) {
            targetPos = found;
            targetLength = data.matchText.length;
          }
        }

        if (targetPos >= 0 && targetPos <= docLength) {
          const anchor = targetPos;
          const head = Math.min(docLength, targetPos + targetLength);
          view.dispatch({
            selection: { anchor, head },
            effects: EditorView.scrollIntoView(anchor, { y: 'center' }),
          });
          view.focus();
        }
      }
    );

    // Cross-pane focus listener
    const unsubFocus = eventBus.on('split-view:focus-pane', (target: string) => {
      if (target === 'toggle') {
        if (!view.hasFocus) {
          view.focus();
        }
      } else if (target === paneId) {
        view.focus();
      }
    });

    // Wire plugin manager editor bridges for primary pane
    if (paneId === 'primary') {
      pluginManager.setEditorBridges({
        getContent: () => view.state.doc.toString(),
        setContent: (c: string) => {
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: c },
            scrollIntoView: true,
          });
        },
        getCursor: () => {
          const head = view.state.selection.main.head;
          const line = view.state.doc.lineAt(head);
          return {
            line: line.number,
            col: head - line.from + 1,
            from: view.state.selection.main.from,
            to: view.state.selection.main.to,
          };
        },
        insertText: (textToInsert: string) => {
          const sel = view.state.selection.main;
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: textToInsert },
            selection: { anchor: sel.from + textToInsert.length },
            scrollIntoView: true,
          });
        },
        getActiveChapterId: () => projectStore.getActiveChapter()?.id || null,
        getProjectData: () => projectStore.getProject(),
        saveChapter: () => {
          const curId = projectStore.getActiveChapter()?.id;
          if (curId) {
            const text = view.state.doc.toString();
            projectStore.updateChapterContent(curId, text);
            fileSystemStore.writeChapterDirectToDisk(curId, text);
          }
        },
        showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => {
          eventBus.emit('show-toast', { message: msg, type: type || 'info' });
        },
      });
    }

    const unsubFormatChinese = eventBus.on('editor-action:format-chinese', () => {
      if (!view.hasFocus && paneId !== 'primary') return;
      const text = view.state.doc.toString();
      const { text: formatted, count, changed } = formatNovelParagraphs(text, '2em');
      if (changed) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
          scrollIntoView: true,
        });
        const curTargetId = paneId === 'secondary' ? secondaryChapterIdRef.current : projectStore.getActiveChapter()?.id;
        if (curTargetId) {
          projectStore.updateChapterContent(curTargetId, formatted);
          fileSystemStore.writeChapterDirectToDisk(curTargetId, formatted);
        }
        eventBus.emit('show-toast', {
          message: languageRef.current === 'en'
            ? `Formatted ${count} paragraphs (2-space indent)`
            : `已规范本章 ${count} 处段落（段首缩进两格）`,
          type: 'success',
        });
      } else {
        eventBus.emit('show-toast', {
          message: languageRef.current === 'en'
            ? 'All paragraphs already properly indented'
            : '本章段首已全部规范（每段均已缩进两格）',
          type: 'info',
        });
      }
    });

    const handleRemoveIndents = () => {
      if (!view.hasFocus && paneId !== 'primary') return;
      const text = view.state.doc.toString();
      const { text: formatted, count, changed } = removeLeadingIndents(text);
      if (changed) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
          scrollIntoView: true,
        });
        const curTargetId = paneId === 'secondary' ? secondaryChapterIdRef.current : projectStore.getActiveChapter()?.id;
        if (curTargetId) {
          projectStore.updateChapterContent(curTargetId, formatted);
          fileSystemStore.writeChapterDirectToDisk(curTargetId, formatted);
        }
        eventBus.emit('show-toast', {
          message: languageRef.current === 'en'
            ? `Cleared indent for ${count} paragraphs`
            : `已清除本章 ${count} 处段落缩进，恢复顶格`,
          type: 'success',
        });
      } else {
        eventBus.emit('show-toast', {
          message: languageRef.current === 'en'
            ? 'All paragraphs are already flush-left'
            : '本章段落已全部顶格',
          type: 'info',
        });
      }
    };

    const unsubRemoveIndents = eventBus.on('editor-action:remove-indents', handleRemoveIndents);
    const unsubCleanIndent = eventBus.on('editor-action:clean-indent', handleRemoveIndents);

    const unsubUndo = eventBus.on('editor-action:undo', () => {
      if (view.hasFocus || paneId === 'primary') {
        undo(view);
      }
    });

    const unsubRedo = eventBus.on('editor-action:redo', () => {
      if (view.hasFocus || paneId === 'primary') {
        redo(view);
      }
    });

    const unsubCleanPunctuation = eventBus.on('editor-action:clean-punctuation', () => {
      if (!view.hasFocus && paneId !== 'primary') return;
      const text = view.state.doc.toString();
      const { text: formatted, count, changed } = cleanChinesePunctuation(text);
      if (changed) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
          scrollIntoView: true,
        });
        const curTargetId = paneId === 'secondary' ? secondaryChapterIdRef.current : projectStore.getActiveChapter()?.id;
        if (curTargetId) {
          projectStore.updateChapterContent(curTargetId, formatted);
          fileSystemStore.writeChapterDirectToDisk(curTargetId, formatted);
        }
        eventBus.emit('show-toast', {
          message: languageRef.current === 'en'
            ? `Normalized ${count} punctuation marks and quotes`
            : `已规范本章 ${count} 处中文标点与引号配对`,
          type: 'success',
        });
      } else {
        eventBus.emit('show-toast', {
          message: languageRef.current === 'en'
            ? 'All punctuation marks are already normalized'
            : '本章标点符号已全部规范',
          type: 'info',
        });
      }
    });

    const unsubContentUpdated = eventBus.on('chapter-content-updated', (data: any) => {
      const targetChapId = data?.chapterId || data?.id;
      const curTargetId = paneId === 'secondary' ? secondaryChapterIdRef.current : projectStore.getActiveChapter()?.id;
      if (targetChapId === curTargetId) {
        const text = data?.content ?? '';
        setActiveChapterTitle((prev) => data?.title || prev);
        setCharCount(countWordsFast(text));
        if (view.state.doc.toString() !== text) {
          isUpdatingRef.current = true;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: text },
          });
          isUpdatingRef.current = false;
        }
      }
    });

    const unsubSave = eventBus.on('save-current-chapter', () => {
      const curTargetId = paneId === 'secondary' ? secondaryChapterIdRef.current : projectStore.getActiveChapter()?.id;
      if (curTargetId) {
        const text = view.state.doc.toString();
        projectStore.updateChapterContent(curTargetId, text);
        fileSystemStore.writeChapterDirectToDisk(curTargetId, text);
      }
    });

    const unsubTyping = eventBus.on('typing-state-changed', (typing: boolean) => {
      if (containerRef.current) {
        if (typing) {
          containerRef.current.classList.add('is-typing');
        } else {
          containerRef.current.classList.remove('is-typing');
        }
      }
    });

    // Auto-focus primary editor on first launch
    const timer = setTimeout(() => {
      if (paneId === 'primary' && !document.activeElement?.closest('.cm-editor')) {
        view.focus();
      }
    }, 100);

    return () => {
      view.contentDOM.removeEventListener('compositionstart', handleCompStart);
      view.contentDOM.removeEventListener('compositionend', handleCompEnd);
      unsubSelect();
      unsubNavigateToMatch();
      unsubFocus();
      unsubSave();
      unsubUndo();
      unsubRedo();
      unsubFormatChinese();
      unsubRemoveIndents();
      unsubCleanIndent();
      unsubCleanPunctuation();
      unsubContentUpdated();
      unsubTyping();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (saveDebounceTimerRef.current) clearTimeout(saveDebounceTimerRef.current);
      clearTimeout(timer);
      view.destroy();
    };
  }, [paneId]);

  // Load secondary chapter when secondaryChapterId changes
  useEffect(() => {
    if (paneId !== 'secondary' || !editorView || !secondaryChapterId) return;
    const project = projectStore.getProject();
    if (!project) return;
    for (const vol of project.volumes) {
      const found = vol.chapters.find((c) => c.id === secondaryChapterId);
      if (found) {
        isUpdatingRef.current = true;
        const title = found.title || (languageRef.current === 'en' ? 'Untitled Chapter' : '未命名章节');
        const text = found.content || '';
        const wCount = countWordsFast(text);
        queueMicrotask(() => {
          setActiveChapterTitle(title);
          setCharCount(wCount);
        });
        editorView.dispatch({
          changes: { from: 0, to: editorView.state.doc.length, insert: text },
          selection: { anchor: 0 },
          scrollIntoView: true,
        });
        isUpdatingRef.current = false;
        safeStorageSet('novelite_split_secondary_chapter', secondaryChapterId);
        break;
      }
    }
  }, [paneId, secondaryChapterId, editorView]);

  // Close chapter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chapterDropdownRef.current && !chapterDropdownRef.current.contains(e.target as Node)) {
        setIsChapterDropdownOpen(false);
      }
    };
    if (isChapterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isChapterDropdownOpen]);

  // 🌟 2. 主题与背景横线动态无缝热重载
  useEffect(() => {
    if (!editorView) return;
    editorView.dispatch({
      effects: themeCompartmentRef.current.reconfigure(
        createEditorTheme(theme, backgroundEffect, backgroundIntensity, lineHeight, editorTextColor)
      ),
    });
    setTimeout(() => {
      editorView.requestMeasure();
    }, 20);
  }, [theme, backgroundEffect, backgroundIntensity, lineHeight, editorTextColor, editorView]);

  // 🌟 3. Live 灵感光标动态热重载 (0-Flicker via Compartment)
  useEffect(() => {
    if (!editorView) return;
    editorView.dispatch({
      effects: cursorCompartmentRef.current.reconfigure(
        createLiveCursorPluginExtension(() => ({
          enabled: isLiveCursorEnabled,
          shape: cursorShape,
          color: cursorColor,
          themeColor: theme.colors.cursor || theme.colors.accent || '#a78bfa',
          themeStreamColors: theme.cursorStream,
          animationLength: cursorAnimationLength || 0.08,
          trailSize: cursorTrailSize || 0.75,
          vfxMode: (vfxMode as any) || 'pure',
          blinkMode: blinkMode || 'smooth',
          breatheCycle: breatheCycle || 1.2,
          speedMode: (speedMode as any) || 'gentle',
          physicsMode,
          luminescence,
          inlineSkew,
          streamPreset: streamPreset as any,
          streamHeadColor,
          streamTailColor,
          glow: true,
        }))
      ),
    });
  }, [
    editorView,
    isLiveCursorEnabled,
    cursorShape,
    cursorColor,
    cursorAnimationLength,
    cursorTrailSize,
    vfxMode,
    blinkMode,
    breatheCycle,
    speedMode,
    physicsMode,
    luminescence,
    inlineSkew,
    streamPreset,
    streamHeadColor,
    streamTailColor,
    theme,
  ]);

  // 🌟 4. 插件编辑器扩展热重载
  useEffect(() => {
    const handleExtChange = () => {
      if (!editorView) return;
      const extensions = pluginManager.getEditorExtensions();
      editorView.dispatch({
        effects: pluginsCompartmentRef.current.reconfigure(extensions),
      });
      setTimeout(() => {
        editorView.requestMeasure();
      }, 20);
    };
    const unsub = pluginManager.subscribe(handleExtChange);
    const unsubExt = eventBus.on('editor-extensions-changed', handleExtChange);
    const unsubPlugins = eventBus.on('plugins-changed', handleExtChange);
    return () => {
      unsub();
      unsubExt();
      unsubPlugins();
    };
  }, [editorView]);

  // Chapter List for Quick Dropdown Selector
  const allChapters = useMemo(() => {
    if (!isChapterDropdownOpen) return [];
    const project = projectStore.getProject();
    if (!project) return [];
    const list: { volTitle: string; chapter: { id: string; title: string; wordCount?: number } }[] = [];
    project.volumes.forEach((v) => {
      v.chapters.forEach((c) => {
        list.push({ volTitle: v.title, chapter: c });
      });
    });
    return list;
  }, [isChapterDropdownOpen]);

  const filteredChapters = useMemo(() => {
    if (!chapterSearchQuery.trim()) return allChapters;
    const q = chapterSearchQuery.toLowerCase();
    return allChapters.filter(
      (item) => item.chapter.title.toLowerCase().includes(q) || item.volTitle.toLowerCase().includes(q)
    );
  }, [allChapters, chapterSearchQuery]);

  const handleSelectChapter = (chapId: string) => {
    setIsChapterDropdownOpen(false);
    setChapterSearchQuery('');
    if (paneId === 'secondary') {
      setSecondaryChapterId(chapId);
      if (onSelectChapter) onSelectChapter(chapId);
    } else {
      projectStore.setActiveChapter(chapId);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      className="relative flex flex-col flex-1 h-full w-full overflow-hidden select-text group/editor"
      style={{ backgroundColor: theme.colors.editorBg }}
    >
      {/* 🌟 Background Effect Suite */}
      <EditorBackground
        theme={theme}
        effect={backgroundEffect}
        intensity={backgroundIntensity}
        customImage={customImage}
        customImageBlur={customImageBlur}
        customImageDim={customImageDim}
      />

      {/* 🌟 Symmetrical Top Pane Header (Pure Typography, 0 Clutter) */}
      {showPaneHeader && (
        <div
          className="h-9 px-4 flex items-center justify-between border-b shrink-0 select-none z-20 backdrop-blur-md"
          style={{
            backgroundColor: `${theme.colors.bgSecondary}40`,
            borderColor: `${theme.colors.border}40`,
          }}
        >
          {/* Chapter Selector with Dropdown Popover */}
          <div className="relative flex items-center gap-1.5 flex-1 min-w-0" ref={chapterDropdownRef}>
            <button
              onClick={() => setIsChapterDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/10 text-left max-w-[240px] truncate group cursor-pointer"
              style={{ color: theme.colors.text }}
              title={language === 'en' ? 'Click to switch chapter' : '点击切换章节'}
            >
              <span className="truncate font-serif text-[11.5px]">{activeChapterTitle}</span>
              <ChevronDown className="h-3 w-3 shrink-0 opacity-40 group-hover:opacity-80 ml-0.5" />
            </button>

            {/* Word Count */}
            <span className="opacity-40 text-[10.5px] font-mono shrink-0 ml-1">
              {charCount} {t('common.words')}
            </span>

            {/* Chapter Selection Popover */}
            {isChapterDropdownOpen && (
              <div
                className="absolute top-9 left-0 w-72 max-h-80 rounded-2xl border shadow-2xl p-2 z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-3xl"
                style={{
                  backgroundColor: `${theme.colors.bgSecondary}FE`,
                  borderColor: `${theme.colors.border}90`,
                }}
              >
                {/* Search Filter */}
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-black/30 border border-white/5 shrink-0">
                  <Search className="h-3 w-3 opacity-40" />
                  <input
                    type="text"
                    placeholder={t('nav.searchChapters')}
                    value={chapterSearchQuery}
                    onChange={(e) => setChapterSearchQuery(e.target.value)}
                    className="bg-transparent text-xs outline-none w-full placeholder:opacity-30"
                    style={{ color: theme.colors.text }}
                    autoFocus
                  />
                </div>

                {/* Chapters List */}
                <div className="flex-1 overflow-y-auto space-y-0.5 max-h-60 pr-0.5">
                  {filteredChapters.map(({ volTitle, chapter }) => {
                    const currentChapterId = paneId === 'secondary' ? secondaryChapterId : projectStore.getActiveChapter()?.id;
                    const isSelected = chapter.id === currentChapterId;
                    return (
                      <button
                        key={chapter.id}
                        onClick={() => handleSelectChapter(chapter.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer border ${
                          isSelected ? 'font-medium' : 'hover:bg-white/5 border-transparent'
                        }`}
                        style={{
                          color: isSelected ? (theme.colors.accent || theme.colors.text) : theme.colors.text,
                          backgroundColor: isSelected ? `${theme.colors.accent || '#38bdf8'}20` : undefined,
                          borderColor: isSelected ? `${theme.colors.accent || '#38bdf8'}40` : 'transparent',
                        }}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="truncate">{chapter.title}</span>
                          <span className="text-[10px] opacity-40 truncate">{volTitle}</span>
                        </div>
                        {isSelected && (
                          <Check
                            className="h-3 w-3 shrink-0"
                            style={{ color: theme.colors.accent || '#38bdf8' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Action Icons for Secondary Pane */}
          {paneId === 'secondary' && (
            <div className="flex items-center gap-1 shrink-0">
              {onSwapPanes && (
                <button
                  onClick={onSwapPanes}
                  title={language === 'en' ? 'Swap Panes (Alt+X)' : '左右/上下对调窗格章节 (Alt+X)'}
                  className="p-1 rounded-md transition-all opacity-60 hover:opacity-100 cursor-pointer"
                  style={{ color: theme.colors.text }}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </button>
              )}
              {onToggleSplitDirection && (
                <button
                  onClick={onToggleSplitDirection}
                  title={
                    language === 'en'
                      ? `Switch to ${splitDirection === 'vertical' ? 'Horizontal' : 'Vertical'} Split`
                      : `切换为${splitDirection === 'vertical' ? '水平上下' : '垂直左右'}分屏`
                  }
                  className="p-1 rounded-md transition-all opacity-60 hover:opacity-100 cursor-pointer"
                  style={{ color: theme.colors.text }}
                >
                  {splitDirection === 'vertical' ? (
                    <Rows3 className="h-3.5 w-3.5" />
                  ) : (
                    <Columns className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              {onClosePane && (
                <button
                  onClick={onClosePane}
                  title={language === 'en' ? 'Close Split View (Alt+S)' : '关闭对照分屏 (Alt+S)'}
                  className="p-1 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-all opacity-50 hover:opacity-100 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 🌟 100% 全宽标准编辑器工作区 */}
      <div
        ref={editorWrapperRef}
        onClick={() => {
          if (editorView && !editorView.hasFocus) {
            editorView.focus();
          }
        }}
        className="relative flex-1 w-full h-full overflow-hidden cursor-text"
      >
        <div ref={editorRef} className="h-full w-full overflow-hidden" />
      </div>

      {/* 🔍 Floating Search & Replace HUD */}
      <FloatingSearchHUD view={editorView} theme={theme} />
    </div>
  );
};
