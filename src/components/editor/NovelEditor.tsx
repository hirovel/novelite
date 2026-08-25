import React, { useEffect, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLine, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { projectStore } from '../../core/storage/ProjectStore';
import { pluginManager } from '../../core/plugins/PluginManager';
import { eventBus } from '../../core/events/EventBus';
import type { Theme } from '../../core/themes/types';
import { LiveCursorOverlay } from '../../plugins/live-cursor/LiveCursorOverlay';
import type { CursorOverlayHandle } from '../../plugins/live-cursor/LiveCursorOverlay';
import { EditorBackground } from './EditorBackground';
import type { BackgroundEffect } from './EditorBackground';
import { BookOpen, Clock, Hash } from 'lucide-react';

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
}

export const NovelEditor: React.FC<Props> = ({
  theme,
  cursorShape,
  cursorColor,
  cursorSpeed,
  cursorAnimationLength,
  cursorTrailSize,
  vfxMode,
  blinkMode,
  breatheCycle,
  speedMode,
  backgroundEffect,
  backgroundIntensity,
  fontPreset,
  customFontName,
  fontSize,
  lineHeight,
}) => {
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<CursorOverlayHandle | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const isUpdatingRef = useRef<boolean>(false);

  const [activeChapterTitle, setActiveChapterTitle] = useState<string>('');
  const [charCount, setCharCount] = useState<number>(0);

  useEffect(() => {
    if (!editorRef.current) return;

    const activeChap = projectStore.getActiveChapter();
    const initialContent = activeChap?.content || '';
    setActiveChapterTitle(activeChap?.title || '未命名章节');
    setCharCount(initialContent.replace(/\s+/g, '').length);

    // 🌟 标准专业编辑器主题
    const baseTheme = EditorView.theme({
      '&': {
        height: '100%',
        width: '100%',
        backgroundColor: 'transparent',
        color: theme.colors.editorText,
      },
      '.cm-scroller': {
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: 'transparent',
        height: '100%',
        width: '100%',
      },
      '.cm-content': {
        caretColor: 'transparent !important',
      },
      '.cm-cursor, .cm-cursor-primary, .cm-cursor-secondary, .cm-dropCursor': {
        display: 'none !important',
        opacity: '0 !important',
        visibility: 'hidden !important',
        borderLeft: 'none !important',
        width: '0 !important',
      },
      // 🌟 标准选区高亮
      '.cm-selectionBackground': {
        backgroundColor: `${theme.colors.selection || 'rgba(167, 139, 250, 0.32)'} !important`,
        borderRadius: '2px',
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: `${theme.colors.selection || 'rgba(167, 139, 250, 0.38)'} !important`,
      },
      '::selection, .cm-content ::selection, .cm-line ::selection, .cm-scroller ::selection': {
        backgroundColor: `${theme.colors.selection || 'rgba(167, 139, 250, 0.32)'} !important`,
        color: 'inherit !important',
      },
      '.cm-activeLine': {
        backgroundColor: `${theme.colors.bgHover}12`,
      },
    });

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isUpdatingRef.current) {
        const newContent = update.state.doc.toString();
        const curChap = projectStore.getActiveChapter();
        if (curChap) {
          projectStore.updateChapterContent(curChap.id, newContent);
        }
        setCharCount(newContent.replace(/\s+/g, '').length);
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
        EditorView.lineWrapping, // 🌟 开启标准软自动换行
        baseTheme,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
        ...pluginExtensions,
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    (window as any).__view = view;
    setEditorView(view);

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
    }, 40);

    pluginManager.setEditorBridges({
      getContent: () => view.state.doc.toString(),
      setContent: (content: string) => {
        isUpdatingRef.current = true;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content },
        });
        isUpdatingRef.current = false;
        setCharCount(content.replace(/\s+/g, '').length);
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
      clearTimeout(timer);
      view.destroy();
    };
  }, [theme, cursorShape, cursorColor, cursorSpeed, cursorAnimationLength, cursorTrailSize, vfxMode, blinkMode, breatheCycle, speedMode, fontPreset, customFontName, fontSize, lineHeight]);

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
        setCharCount(curChap.content.replace(/\s+/g, '').length);
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

  const readingTimeMinutes = Math.max(1, Math.ceil(charCount / 380));

  return (
    <div
      className="relative flex-1 h-full w-full overflow-hidden select-text flex flex-col"
      style={{ backgroundColor: theme.colors.editorBg }}
    >
      {/* 🌟 Background Effect Suite */}
      <EditorBackground
        theme={theme}
        effect={backgroundEffect}
        intensity={backgroundIntensity}
      />

      {/* 🌟 100% 全宽标准顶部章节栏 */}
      <div
        className="relative z-20 w-full border-b backdrop-blur-xs select-none transition-colors shrink-0 flex items-center justify-between px-6 py-2.5"
        style={{
          borderColor: `${theme.colors.border}60`,
          backgroundColor: `${theme.colors.bgSecondary}40`,
        }}
      >
        <div className="flex items-center gap-2 max-w-[50%]">
          <BookOpen className="h-4 w-4 shrink-0 opacity-70" style={{ color: theme.colors.accent }} />
          <span className="text-xs font-semibold truncate" style={{ color: theme.colors.text }}>
            {activeChapterTitle}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono opacity-70" style={{ color: theme.colors.textMuted }}>
          <span className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            {charCount.toLocaleString()} 字
          </span>
          <span className="flex items-center gap-1.5 hidden sm:flex">
            <Clock className="h-3.5 w-3.5" />
            约 {readingTimeMinutes} 分钟阅读
          </span>
        </div>
      </div>

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
    </div>
  );
};
