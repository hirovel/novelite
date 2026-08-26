import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLine, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { projectStore, countWordsFast } from '../../core/storage/ProjectStore';
import { pluginManager } from '../../core/plugins/PluginManager';
import { eventBus } from '../../core/events/EventBus';
import type { Theme } from '../../core/themes/types';
import { LiveCursorOverlay } from '../../plugins/live-cursor/LiveCursorOverlay';
import type { CursorOverlayHandle } from '../../plugins/live-cursor/LiveCursorOverlay';
import { EditorBackground } from './EditorBackground';
import type { BackgroundEffect } from './EditorBackground';
import { BookOpen, Hash, Pencil, Settings, Sidebar as SidebarIcon, Command } from 'lucide-react';

interface Props {
  theme: Theme;
  cursorShape: 'beam' | 'block' | 'underline';
  cursorColor: string;
  cursorSpeed: 'snappy' | 'smooth' | 'instant';
  cursorAnimationLength: number;
  cursorTrailSize: number;
  vfxMode: 'pure' | 'embers' | 'ripples' | 'feather';
  blinkMode: 'smooth' | 'solid' | 'blink';
  breatheCycle: number;
  speedMode: 'gentle' | 'balanced' | 'snappy';
  backgroundEffect: BackgroundEffect;
  backgroundIntensity: number;
  fontPreset: 'lxgw' | 'songti' | 'sans' | 'mono' | 'custom';
  customFontName: string;
  fontSize: number;
  lineHeight: number;
  contentMaxWidth?: number;
  spotlightMode?: 'none' | 'paragraph';
  zeroChrome?: boolean;
  onOpenSettings?: () => void;
  onOpenCommandPalette?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

function createEditorTheme(theme: Theme, spotlightMode: 'none' | 'paragraph' = 'paragraph') {
  return EditorView.theme({
    '&': {
      height: '100%',
      width: '100%',
      backgroundColor: 'transparent',
      color: theme.colors.editorText,
      outline: 'none !important',
    },
    '.cm-scroller': {
      overflowY: 'auto',
      overflowX: 'hidden',
      backgroundColor: 'transparent',
      height: '100%',
      width: '100%',
      scrollbarWidth: 'thin',
      scrollbarColor: `${theme.colors.border}80 transparent`,
      maskImage: 'linear-gradient(to bottom, transparent 0px, black 36px, black calc(100% - 36px), transparent 100%)',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 36px, black calc(100% - 36px), transparent 100%)',
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
      '&::-webkit-scrollbar-thumb:hover': {
        background: theme.colors.accent,
      },
    },
    '.cm-content': {
      caretColor: 'transparent !important',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      textRendering: 'optimizeLegibility',
      fontFeatureSettings: '"kern" 1, "liga" 1',
    },
    '.cm-cursor, .cm-cursor-primary, .cm-cursor-secondary, .cm-dropCursor': {
      display: 'none !important',
      opacity: '0 !important',
      visibility: 'hidden !important',
      borderLeft: 'none !important',
      width: '0 !important',
    },
    // 🌟 GPU 硬件级段落聚光灯 (零 CPU 渲染开销)
    '.cm-line': {
      boxSizing: 'border-box',
      width: '100%',
      contain: 'style layout',
    },
    '&.cm-focused .cm-line': {
      opacity: spotlightMode === 'paragraph' ? '0.34' : '1',
    },
    '&.cm-focused .cm-activeLine': {
      opacity: '1 !important',
      backgroundColor: `${theme.colors.bgHover}1a`,
      borderRadius: '4px',
      boxShadow: `0 0 0 1px ${theme.colors.accent}15`,
    },
    // 🌟 沉浸式圆角半透明选区
    '.cm-selectionBackground': {
      backgroundColor: `${theme.colors.selection || 'rgba(167, 139, 250, 0.32)'} !important`,
      borderRadius: '3px',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: `${theme.colors.selection || 'rgba(167, 139, 250, 0.38)'} !important`,
      borderRadius: '3px',
    },
    '::selection, .cm-content ::selection, .cm-line ::selection, .cm-scroller ::selection': {
      backgroundColor: `${theme.colors.selection || 'rgba(167, 139, 250, 0.32)'} !important`,
      color: 'inherit !important',
    },
  });
}

export const NovelEditor: React.FC<Props> = ({
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
  backgroundEffect,
  backgroundIntensity,
  fontPreset: _fontPreset,
  customFontName: _customFontName,
  fontSize: _fontSize,
  lineHeight: _lineHeight,
  contentMaxWidth: _contentMaxWidth,
  spotlightMode = 'paragraph',
  zeroChrome = true,
  onOpenSettings,
  onOpenCommandPalette,
  onToggleSidebar,
  isSidebarOpen = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<CursorOverlayHandle | null>(null);
  const hudWordCountRef = useRef<HTMLSpanElement | null>(null);
  const topWordCountRef = useRef<HTMLSpanElement | null>(null);
  const hudSaveDotRef = useRef<HTMLSpanElement | null>(null);

  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const isComposingRef = useRef<boolean>(false);

  const typingTimerRef = useRef<any>(null);
  const saveDebounceTimerRef = useRef<any>(null);

  // 🌟 章节标题原位内联修改状态
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleInput, setTitleInput] = useState<string>('');
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const initialThemeRef = useRef<Theme>(theme);
  const initialSpotlightRef = useRef<'none' | 'paragraph'>(spotlightMode);

  const themeCompartmentRef = useRef<Compartment>(new Compartment());
  const pluginsCompartmentRef = useRef<Compartment>(new Compartment());

  const [activeChapterTitle, setActiveChapterTitle] = useState<string>('');
  const [charCount, setCharCount] = useState<number>(0);

  const handleUserActivity = useCallback(() => {
    if (containerRef.current?.classList.contains('is-typing')) {
      containerRef.current.classList.remove('is-typing');
      eventBus.emit('typing-state-changed', false);
    }
  }, []);

  const startEditTitle = () => {
    setTitleInput(activeChapterTitle);
    setIsEditingTitle(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 20);
  };

  const finishEditTitle = () => {
    if (!isEditingTitle) return;
    setIsEditingTitle(false);
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== activeChapterTitle) {
      const curChap = projectStore.getActiveChapter();
      if (curChap) {
        projectStore.renameChapter(curChap.id, trimmed);
        setActiveChapterTitle(trimmed);
      }
    }
  };

  // 🌟 1. 初始化 CodeMirror 实例 (只执行一次，终生不销毁重建)
  useEffect(() => {
    if (!editorRef.current) return;

    const activeChap = projectStore.getActiveChapter();
    const initialContent = activeChap?.content || '';
    setActiveChapterTitle(activeChap?.title || '未命名章节');
    const initialWords = countWordsFast(initialContent);
    setCharCount(initialWords);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        // 🌟 1. 纯 DOM 驱动心流隐退，零 React 重绘开销！
        if (containerRef.current) {
          containerRef.current.classList.add('is-typing');
        }
        if (hudSaveDotRef.current) {
          hudSaveDotRef.current.className = 'h-1.5 w-1.5 rounded-full shrink-0 bg-amber-400 animate-pulse';
        }
        eventBus.emit('typing-state-changed', true);

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.classList.remove('is-typing');
          }
          eventBus.emit('typing-state-changed', false);
        }, 1200);

        // 🌟 2. 毫秒级字数即时反馈 (Direct DOM update without React Re-renders)
        const docLen = update.state.doc.length;
        if (hudWordCountRef.current || topWordCountRef.current) {
          const quickWords = Math.round(docLen * 0.95);
          if (hudWordCountRef.current) hudWordCountRef.current.textContent = `${quickWords.toLocaleString()} 字`;
          if (topWordCountRef.current) topWordCountRef.current.textContent = `${quickWords.toLocaleString()} 字`;
        }

        // 🌟 3. 防抖序列化保存 (Debounced ProjectStore update)
        if (!isUpdatingRef.current) {
          if (saveDebounceTimerRef.current) clearTimeout(saveDebounceTimerRef.current);
          saveDebounceTimerRef.current = setTimeout(() => {
            const newContent = update.state.doc.toString();
            const curChap = projectStore.getActiveChapter();
            if (curChap) {
              projectStore.updateChapterContent(curChap.id, newContent);
            }
            const exactCount = countWordsFast(newContent);
            setCharCount(exactCount);
            if (hudWordCountRef.current) hudWordCountRef.current.textContent = `${exactCount.toLocaleString()} 字`;
            if (topWordCountRef.current) topWordCountRef.current.textContent = `${exactCount.toLocaleString()} 字`;
          }, 250);
        }
      }

      if (update.docChanged || update.selectionSet) {
        const head = update.state.selection.main.head;
        const coords = update.view.coordsAtPos(head);
        if (coords && overlayRef.current) {
          overlayRef.current.syncTarget(coords, false);
        }

        const line = update.state.doc.lineAt(head);
        eventBus.emit('cursor-moved', {
          line: line.number,
          col: head - line.from + 1,
          from: update.state.selection.main.from,
          to: update.state.selection.main.to,
        });
      }
    });

    const pluginExtensions = pluginManager.getEditorExtensions();

    const startState = EditorState.create({
      doc: initialContent,
      extensions: [
        history(),
        drawSelection(),
        highlightActiveLine(),
        markdown(),
        EditorView.lineWrapping,
        themeCompartmentRef.current.of(createEditorTheme(initialThemeRef.current, initialSpotlightRef.current)),
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

    // 🌟 中文输入法 (IME) 组合态生命周期精准监听
    const handleCompStart = () => {
      isComposingRef.current = true;
    };
    const handleCompEnd = () => {
      isComposingRef.current = false;
      setTimeout(() => {
        view.requestMeasure();
        const head = view.state.selection.main.head;
        const coords = view.coordsAtPos(head);
        if (coords && overlayRef.current) {
          overlayRef.current.syncTarget(coords, true);
        }
      }, 10);
    };

    view.contentDOM.addEventListener('compositionstart', handleCompStart);
    view.contentDOM.addEventListener('compositionend', handleCompEnd);

    const unsubSave = eventBus.on('project-saved', () => {
      if (hudSaveDotRef.current) {
        hudSaveDotRef.current.className = 'h-1.5 w-1.5 rounded-full shrink-0 bg-emerald-400 shadow-[0_0_6px_#34d399]';
      }
    });

    if (document.fonts) {
      document.fonts.ready.then(() => {
        view.requestMeasure();
      });
    }

    const timer = setTimeout(() => {
      view.requestMeasure();
      const head = view.state.selection.main.head;
      const coords = view.coordsAtPos(head);
      if (coords && overlayRef.current) {
        overlayRef.current.syncTarget(coords, true);
      }
      view.focus();
    }, 40);

    pluginManager.setEditorBridges({
      getContent: () => view.state.doc.toString(),
      setContent: (content: string) => {
        isUpdatingRef.current = true;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content },
        });
        isUpdatingRef.current = false;
        const words = countWordsFast(content);
        setCharCount(words);
        if (hudWordCountRef.current) hudWordCountRef.current.textContent = `${words.toLocaleString()} 字`;
        if (topWordCountRef.current) topWordCountRef.current.textContent = `${words.toLocaleString()} 字`;
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
      insertText: (text: string) => {
        const head = view.state.selection.main.head;
        view.dispatch({
          changes: { from: head, to: head, insert: text },
          selection: { anchor: head + text.length },
        });
        view.focus();
      },
      getActiveChapterId: () => projectStore.getActiveChapter()?.id || null,
      getProjectData: () => projectStore.getProject(),
      saveChapter: () => projectStore.save(),
      showToast: (msg, type) => eventBus.emit('show-toast', { message: msg, type }),
    });

    return () => {
      view.contentDOM.removeEventListener('compositionstart', handleCompStart);
      view.contentDOM.removeEventListener('compositionend', handleCompEnd);
      unsubSave();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (saveDebounceTimerRef.current) clearTimeout(saveDebounceTimerRef.current);
      clearTimeout(timer);
      view.destroy();
    };
  }, []);

  // 🌟 2. 主题与聚光灯动态无缝热重载 (Zero-Flicker Hot-Reload via Compartment)
  useEffect(() => {
    if (!editorView) return;
    editorView.dispatch({
      effects: themeCompartmentRef.current.reconfigure(createEditorTheme(theme, spotlightMode)),
    });
  }, [theme, spotlightMode, editorView]);

  // 🌟 3. 插件编辑器扩展热重载 (Plugin Extensions Hot-Reload)
  useEffect(() => {
    const handleExtChange = () => {
      if (!editorView) return;
      const exts = pluginManager.getEditorExtensions();
      editorView.dispatch({
        effects: pluginsCompartmentRef.current.reconfigure(exts),
      });
      setTimeout(() => {
        editorView.requestMeasure();
      }, 20);
    };

    const unsub = eventBus.on('editor-extensions-changed', handleExtChange);
    const unsubPlugins = eventBus.on('plugins-changed', handleExtChange);
    return () => {
      unsub();
      unsubPlugins();
    };
  }, [editorView]);

  // 🌟 4. 章节切换快速平滑载入
  useEffect(() => {
    const handleChapterChange = () => {
      if (!editorView) return;
      const curChap = projectStore.getActiveChapter();
      if (!curChap) return;

      setActiveChapterTitle(curChap.title);
      const currentDoc = editorView.state.doc.toString();
      if (currentDoc !== curChap.content) {
        isUpdatingRef.current = true;
        editorView.dispatch({
          changes: { from: 0, to: editorView.state.doc.length, insert: curChap.content },
          selection: { anchor: 0 },
        });
        isUpdatingRef.current = false;
        const words = countWordsFast(curChap.content);
        setCharCount(words);
        if (hudWordCountRef.current) hudWordCountRef.current.textContent = `${words.toLocaleString()} 字`;
        if (topWordCountRef.current) topWordCountRef.current.textContent = `${words.toLocaleString()} 字`;
        editorView.focus();

        setTimeout(() => {
          editorView.requestMeasure();
          const coords = editorView.coordsAtPos(0);
          if (coords && overlayRef.current) {
            overlayRef.current.syncTarget(coords, true);
          }
        }, 20);
      }
    };

    const unsub = eventBus.on('active-chapter-changed', handleChapterChange);
    return () => unsub();
  }, [editorView]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      className="relative flex-1 h-full w-full overflow-hidden select-text flex flex-col group/editor"
      style={{ backgroundColor: theme.colors.editorBg }}
    >
      {/* 🌟 Background Effect Suite */}
      <EditorBackground
        theme={theme}
        effect={backgroundEffect}
        intensity={backgroundIntensity}
      />

      {/* 🌟 经典模式下的顶部栏 (仅在 zeroChrome 为 false 时显示) */}
      {!zeroChrome && (
        <div
          onMouseEnter={handleUserActivity}
          className="relative z-20 w-full border-b backdrop-blur-xs select-none shrink-0 flex items-center justify-between px-6 py-2 transition-all duration-400 ease-out group-[.is-typing]/editor:opacity-15 group-[.is-typing]/editor:pointer-events-none"
          style={{
            borderColor: `${theme.colors.border}40`,
            backgroundColor: `${theme.colors.bgSecondary}30`,
          }}
        >
          <div className="flex items-center gap-2 max-w-[65%] group">
            <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-60" style={{ color: theme.colors.accent }} />
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={finishEditTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') finishEditTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="text-xs font-semibold bg-transparent border-b border-purple-400 outline-none px-0.5 py-0 text-inherit w-full max-w-[260px]"
                style={{ color: theme.colors.text }}
              />
            ) : (
              <div
                onDoubleClick={startEditTitle}
                title="双击快速重命名章节"
                className="flex items-center gap-1.5 cursor-pointer rounded px-1 -mx-1 hover:bg-white/5 transition-colors truncate"
              >
                <span className="text-xs font-semibold truncate" style={{ color: theme.colors.text }}>
                  {activeChapterTitle}
                </span>
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-40 hover:!opacity-90 transition-opacity shrink-0" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono opacity-65" style={{ color: theme.colors.textMuted }}>
            <Hash className="h-3 w-3" />
            <span ref={topWordCountRef}>{charCount.toLocaleString()} 字</span>
          </div>
        </div>
      )}

      {/* 🌟 100% 全宽标准编辑器工作区 */}
      <div ref={editorWrapperRef} className="relative flex-1 w-full h-full overflow-hidden">
        <LiveCursorOverlay
          ref={overlayRef}
          editorView={editorView}
          containerRef={editorWrapperRef}
          config={{
            enabled: true,
            shape: cursorShape,
            color: cursorColor,
            themeColor: theme.colors.cursor || theme.colors.accent || '#a78bfa',
            animationLength: cursorAnimationLength || 0.08,
            trailSize: cursorTrailSize || 0.75,
            vfxMode: vfxMode || 'pure',
            blinkMode: blinkMode || 'smooth',
            breatheCycle: breatheCycle || 1.2,
            speedMode: speedMode || 'gentle',
            glow: true,
          }}
        />

        <div ref={editorRef} className="h-full w-full overflow-hidden" />
      </div>

      {/* 🌟 先锋美学：Dynamic Island 悬浮微型动态岛 (SOTA Dynamic Island Micro-HUD) */}
      {zeroChrome && (
        <div
          className="fixed bottom-6 right-8 z-40 flex items-center gap-3 px-4 py-2 rounded-full border shadow-2xl backdrop-blur-2xl select-none text-[11.5px] font-mono pointer-events-auto transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] group-[.is-typing]/editor:opacity-0 group-[.is-typing]/editor:translate-y-3 group-[.is-typing]/editor:pointer-events-none"
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
              ref={hudSaveDotRef}
              title="本地实时保存状态"
              className="h-2 w-2 rounded-full shrink-0 bg-emerald-400 shadow-[0_0_8px_#34d399]"
            />
          </div>

          {/* Word Count */}
          <div className="flex items-center gap-1 font-semibold tracking-tight" style={{ color: theme.colors.text }}>
            <span ref={hudWordCountRef}>{charCount.toLocaleString()} 字</span>
          </div>

          <span className="opacity-25 select-none">|</span>

          {/* Reading Time */}
          <span className="opacity-60 text-[10.5px]">
            约 {Math.max(1, Math.ceil(charCount / 350))} 分钟
          </span>

          <span className="opacity-25 select-none">|</span>

          {/* Active Chapter Title */}
          <span
            className="opacity-85 max-w-[130px] truncate text-[11px] font-medium"
            title={activeChapterTitle}
            style={{ color: theme.colors.text }}
          >
            {activeChapterTitle}
          </span>

          {/* Micro Action Dock */}
          <div className="flex items-center gap-1 pl-1.5 border-l border-white/10 ml-0.5">
            {onOpenCommandPalette && (
              <button
                onClick={onOpenCommandPalette}
                title="命令面板 (Ctrl+P / ⌘K)"
                className="p-1 hover:text-white rounded-md hover:bg-white/10 transition-all opacity-60 hover:opacity-100"
              >
                <Command className="h-3.5 w-3.5" />
              </button>
            )}

            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                title="分卷目录 (Ctrl+B / ⌘B)"
                className="p-1 hover:text-white rounded-md hover:bg-white/10 transition-all opacity-60 hover:opacity-100"
              >
                <SidebarIcon className={`h-3.5 w-3.5 ${isSidebarOpen ? 'text-cyan-400 opacity-100' : ''}`} />
              </button>
            )}

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="偏好设置 (Ctrl+, / ⌘,)"
                className="p-1 hover:text-white rounded-md hover:bg-white/10 transition-all opacity-60 hover:opacity-100"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


