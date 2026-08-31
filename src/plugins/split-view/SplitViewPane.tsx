import React, { useState, useEffect, useRef } from 'react';
import {
  Columns,
  Rows3,
  X,
  BookOpen,
  Edit3,
  ScrollText,
  ArrowLeftRight,
  Maximize2,
  Minimize2,
  ChevronDown,
  Search,
  Check,
  Sparkles,
  Lock,
  Unlock,
} from 'lucide-react';
import { projectStore } from '../../core/storage/ProjectStore';
import type { NovelProject, Chapter } from '../../core/storage/types';
import { eventBus } from '../../core/events/EventBus';
import type { Theme } from '../../core/themes/types';

export type SplitMode = 'read' | 'edit' | 'bible';
export type SplitDirection = 'vertical' | 'horizontal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  direction: SplitDirection;
  onToggleDirection: () => void;
  splitRatio: number;
  onChangeSplitRatio: (ratio: number) => void;
  fontPreset?: string;
  fontSize?: number;
  lineHeight?: number;
}

export const SplitViewPane: React.FC<Props> = ({
  isOpen,
  onClose,
  theme,
  direction,
  onToggleDirection,
  splitRatio: _splitRatio,
  onChangeSplitRatio: _onChangeSplitRatio,
  fontPreset = 'lxgw',
  fontSize = 17,
  lineHeight = 1.95,
}) => {
  const [project, setProject] = useState<NovelProject>(() => projectStore.getProject());
  const [mode, setMode] = useState<SplitMode>('read');
  const [selectedChapId, setSelectedChapId] = useState<string | null>(() => {
    // Default to first chapter or active chapter's predecessor
    const active = projectStore.getActiveChapter();
    const vols = projectStore.getProject().volumes;
    if (vols.length > 0 && vols[0].chapters.length > 0) {
      if (active && vols[0].chapters.length > 1) {
        const foundIndex = vols[0].chapters.findIndex((c) => c.id === active.id);
        if (foundIndex > 0) return vols[0].chapters[foundIndex - 1].id;
        if (foundIndex === 0 && vols[0].chapters[1]) return vols[0].chapters[1].id;
      }
      return vols[0].chapters[0].id;
    }
    return null;
  });

  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isChapterDropdownOpen, setIsChapterDropdownOpen] = useState<boolean>(false);
  const [chapterSearchQuery, setChapterSearchQuery] = useState<string>('');
  const [isPinned, setIsPinned] = useState<boolean>(true);

  // Editable buffer for dual live editing mode & bible mode
  const [editContent, setEditContent] = useState<string>('');
  const [bibleContent, setBibleContent] = useState<string>(() => projectStore.getProject().scratchpad || '');

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      const p = projectStore.getProject();
      setProject({ ...p });
      setBibleContent(p.scratchpad || '');
    };
    const unsub = eventBus.on('project-tree-changed', handleUpdate);
    const unsubContent = eventBus.on('chapter-content-updated', ({ chapterId, content }: any) => {
      if (chapterId === selectedChapId && mode !== 'edit') {
        setEditContent(content);
      }
    });

    return () => {
      unsub();
      unsubContent();
    };
  }, [selectedChapId, mode]);

  // Sync selected chapter content into edit buffer
  useEffect(() => {
    if (!selectedChapId) return;
    const cur = projectStore.getChapter(selectedChapId);
    if (cur) {
      setEditContent(cur.content);
    }
  }, [selectedChapId]);

  // Click outside to close chapter dropdown
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsChapterDropdownOpen(false);
      }
    };
    if (isChapterDropdownOpen) {
      document.addEventListener('mousedown', handleDocClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
    };
  }, [isChapterDropdownOpen]);

  if (!isOpen) return null;

  const allChapters: { volTitle: string; volId: string; chapter: Chapter }[] = [];
  project.volumes.forEach((v) => {
    v.chapters.forEach((c) => {
      allChapters.push({ volTitle: v.title, volId: v.id, chapter: c });
    });
  });

  const activeChapInfo = allChapters.find((item) => item.chapter.id === selectedChapId) || allChapters[0];
  const activeChap = activeChapInfo?.chapter;

  // Filtered chapters for dropdown search
  const filteredChapters = allChapters.filter(
    (item) =>
      item.chapter.title.toLowerCase().includes(chapterSearchQuery.toLowerCase()) ||
      item.volTitle.toLowerCase().includes(chapterSearchQuery.toLowerCase())
  );

  // Swap Panes Handler (⇄)
  const handleSwapPanes = () => {
    const mainActive = projectStore.getActiveChapter();
    if (!mainActive || !activeChap) return;

    const leftId = mainActive.id;
    const rightId = activeChap.id;

    if (leftId === rightId) {
      eventBus.emit('show-toast', { message: '左右栏当前已是同一章节', type: 'info' });
      return;
    }

    // Switch main editor to right chapter, and switch split view to left chapter
    projectStore.setActiveChapter(rightId);
    setSelectedChapId(leftId);
    eventBus.emit('show-toast', { message: `已对调窗格：左栏《${activeChap.title}》⇄ 右栏《${mainActive.title}》`, type: 'success' });
  };

  // Dual Edit Input Handler
  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditContent(val);
    if (selectedChapId) {
      projectStore.updateChapterContent(selectedChapId, val);
      eventBus.emit('chapter-content-updated', { chapterId: selectedChapId, content: val });
    }
  };

  // Bible / Worldbuilding Outline Edit Handler
  const handleBibleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBibleContent(val);
    projectStore.updateScratchpad(val);
  };

  // Render prose with dialogue highlighting and physical indent for Reader Mode
  const renderFormattedProse = (text: string) => {
    if (!text.trim()) {
      return (
        <div className="py-20 text-center text-xs opacity-35 font-serif italic">
          — 暂无章节内容，可切换为「实时双写」开始创作 —
        </div>
      );
    }

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const isHeader = line.startsWith('#');
      const isQuote = line.startsWith('>');
      const isDivider = line.trim() === '---';

      if (isDivider) {
        return (
          <div key={idx} className="my-6 flex items-center justify-center opacity-30">
            <span className="h-px w-24 bg-current" />
          </div>
        );
      }

      if (isHeader) {
        return (
          <h2
            key={idx}
            className="text-base sm:text-lg font-bold font-serif tracking-tight mt-6 mb-4 select-text"
            style={{ color: theme.colors.text }}
          >
            {line.replace(/^#+\s*/, '')}
          </h2>
        );
      }

      if (isQuote) {
        return (
          <blockquote
            key={idx}
            className="pl-3.5 my-3 border-l-2 text-xs italic opacity-75 font-serif select-text"
            style={{ borderColor: theme.colors.accent, color: theme.colors.text }}
          >
            {line.replace(/^>\s*/, '')}
          </blockquote>
        );
      }

      // Format dialogue quotes with accent micro-glow
      const formattedParts: React.ReactNode[] = [];
      const quoteRegex = /(“[^”]*”|「[^」]*」|『[^』]*』|（[^）]*）)/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = quoteRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          formattedParts.push(line.slice(lastIndex, match.index));
        }
        const isThought = match[0].startsWith('（');
        formattedParts.push(
          <span
            key={`${idx}-${match.index}`}
            className={`transition-colors duration-150 ${isThought ? 'italic opacity-85' : 'font-medium'}`}
            style={{
              color: isThought ? theme.colors.textMuted : theme.colors.accent,
              textShadow: isThought ? undefined : `0 0 10px ${theme.colors.accent}20`,
            }}
          >
            {match[0]}
          </span>
        );
        lastIndex = quoteRegex.lastIndex;
      }

      if (lastIndex < line.length) {
        formattedParts.push(line.slice(lastIndex));
      }

      return (
        <p
          key={idx}
          className="my-2 text-xs sm:text-sm tracking-wide leading-relaxed font-serif select-text break-words"
          style={{
            color: theme.colors.text,
            lineHeight: `${lineHeight}`,
          }}
        >
          {formattedParts.length > 0 ? formattedParts : line}
        </p>
      );
    });
  };

  return (
    <aside
      className={`flex flex-col select-none z-20 transition-all duration-300 ease-out border-l border-t-0 backdrop-blur-2xl relative pt-10 ${
        isMaximized ? 'absolute inset-0 z-50 w-full h-full' : 'h-full flex-1 min-w-[280px] min-h-[220px]'
      }`}
      style={{
        backgroundColor: `${theme.colors.bgSecondary}FA`,
        borderColor: `${theme.colors.border}50`,
      }}
    >
      {/* 🌟 1. Terminal-Grade Header Bar */}
      <header
        className="h-10 px-3 border-b flex items-center justify-between shrink-0 gap-2 select-none"
        style={{
          borderColor: `${theme.colors.border}40`,
          backgroundColor: `${theme.colors.bg}80`,
        }}
      >
        {/* Left: Chapter / Document Dropdown Trigger */}
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0 relative" ref={dropdownRef}>
          {mode !== 'bible' ? (
            <button
              onClick={() => setIsChapterDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/10 text-left max-w-[220px] truncate group cursor-pointer"
              style={{ color: theme.colors.text }}
              title="点击秒切对照章节"
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: theme.colors.accent }} />
              <span className="truncate font-serif text-[11.5px]">
                {activeChapInfo ? `${activeChapInfo.volTitle} · ${activeChapInfo.chapter.title}` : '选择章节'}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0 opacity-40 group-hover:opacity-80 transition-transform" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium" style={{ color: theme.colors.accent }}>
              <ScrollText className="h-3.5 w-3.5" />
              <span className="font-serif text-[11.5px]">全书设定与大纲笔记 (Novel Bible)</span>
            </div>
          )}

          {/* Chapter Quick Switcher Popover Dropdown */}
          {isChapterDropdownOpen && (
            <div
              className="absolute top-10 left-0 w-72 max-h-80 rounded-2xl border shadow-2xl p-2 z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-3xl"
              style={{
                backgroundColor: `${theme.colors.bgSecondary}FE`,
                borderColor: `${theme.colors.border}90`,
              }}
            >
              {/* Search Filter Input */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-black/30 border border-white/5 shrink-0">
                <Search className="h-3 w-3 opacity-40" />
                <input
                  type="text"
                  placeholder="搜索章节或卷名..."
                  value={chapterSearchQuery}
                  onChange={(e) => setChapterSearchQuery(e.target.value)}
                  className="bg-transparent text-xs outline-none w-full text-neutral-200 placeholder:opacity-30"
                  autoFocus
                />
              </div>

              {/* Chapters List */}
              <div className="flex-1 overflow-y-auto space-y-0.5 max-h-60 pr-0.5">
                {filteredChapters.map(({ volTitle, chapter }) => {
                  const isSelected = chapter.id === selectedChapId;
                  return (
                    <button
                      key={chapter.id}
                      onClick={() => {
                        setSelectedChapId(chapter.id);
                        setIsChapterDropdownOpen(false);
                        setChapterSearchQuery('');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-400 font-semibold'
                          : 'opacity-70 hover:opacity-100 hover:bg-white/5 text-neutral-300'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate text-[11.5px] font-serif">{chapter.title}</span>
                        <span className="text-[9.5px] opacity-40 font-mono">{volTitle}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9.5px] opacity-50">
                        <span>{chapter.wordCount}字</span>
                        {isSelected && <Check className="h-3 w-3 text-cyan-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Center: Mode Switcher Pills (Read / Edit / Bible) */}
        <div className="flex items-center p-0.5 rounded-xl bg-black/30 border border-white/5 shrink-0">
          {[
            { id: 'read', label: '对照', icon: BookOpen },
            { id: 'edit', label: '双写', icon: Edit3 },
            { id: 'bible', label: '大纲', icon: ScrollText },
          ].map((m) => {
            const Icon = m.icon;
            const isCur = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id as SplitMode)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] transition-all cursor-pointer ${
                  isCur
                    ? 'bg-cyan-500/20 text-cyan-400 font-semibold shadow-xs'
                    : 'opacity-50 hover:opacity-100 text-neutral-400'
                }`}
                title={`切换为 ${m.label} 模式`}
              >
                <Icon className="h-3 w-3" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Terminal Micro-Actions (Swap, Rotate, Maximize, Close) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Swap Panes (⇄) */}
          <button
            onClick={handleSwapPanes}
            className="p-1.5 rounded-lg opacity-50 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
            style={{ color: theme.colors.text }}
            title="左右/上下对调窗格 (Swap Panes)"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>

          {/* Toggle Direction (Vertical ⇄ Horizontal) */}
          <button
            onClick={onToggleDirection}
            className="p-1.5 rounded-lg opacity-50 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
            style={{ color: theme.colors.text }}
            title={direction === 'vertical' ? '切换为上下水平分栏' : '切换为左右垂直分栏'}
          >
            {direction === 'vertical' ? <Rows3 className="h-3.5 w-3.5" /> : <Columns className="h-3.5 w-3.5" />}
          </button>

          {/* Pin Toggle */}
          <button
            onClick={() => setIsPinned((prev) => !prev)}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              isPinned ? 'opacity-90 text-cyan-400' : 'opacity-40 hover:opacity-80'
            }`}
            title={isPinned ? '已锁定当前参考章节' : '未锁定参考章节'}
          >
            {isPinned ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </button>

          {/* Maximize / Restore */}
          <button
            onClick={() => setIsMaximized((prev) => !prev)}
            className="p-1.5 rounded-lg opacity-50 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
            style={{ color: theme.colors.text }}
            title={isMaximized ? '恢复分屏' : '单栏最大化'}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-40 hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all cursor-pointer"
            title="关闭分屏"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* 🌟 2. Pane Content Body */}
      <div className="flex-1 overflow-y-auto relative flex flex-col">
        {mode === 'read' && (
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto font-serif space-y-2">
            {activeChap ? (
              renderFormattedProse(activeChap.content)
            ) : (
              <div className="py-20 text-center text-xs opacity-35 font-mono">暂无章节内容</div>
            )}
          </div>
        )}

        {mode === 'edit' && (
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">
            <textarea
              value={editContent}
              onChange={handleEditChange}
              placeholder="在此直接进行双向协同创作，实时自动落盘保存..."
              className="flex-1 w-full bg-transparent resize-none outline-none font-serif text-xs sm:text-sm leading-relaxed"
              style={{
                color: theme.colors.text,
                fontFamily: fontPreset === 'songti' ? '"Source Han Serif SC", "Noto Serif SC", serif' : undefined,
                fontSize: `${fontSize}px`,
                lineHeight: `${lineHeight}`,
              }}
            />
          </div>
        )}

        {mode === 'bible' && (
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">
            <div className="mb-2 flex items-center justify-between text-[10px] opacity-40 font-mono pb-2 border-b border-white/5">
              <span>全书世界观 / 角色卡 / 伏笔细纲设定集</span>
              <span>实时自动同步</span>
            </div>
            <textarea
              value={bibleContent}
              onChange={handleBibleChange}
              placeholder="随时记录伏笔、角色性格动机、功法等级与剧情大纲...&#10;• 主角：苏沐白 (太白剑意)&#10;• 伏笔：客栈盲眼剑客的旧佩剑&#10;• 第三卷核心矛盾：宗门大比与魔宗暗影"
              className="flex-1 w-full bg-transparent resize-none outline-none font-serif text-xs sm:text-sm leading-relaxed"
              style={{
                color: theme.colors.text,
                lineHeight: '1.8',
              }}
            />
          </div>
        )}

        {/* Footer Info Pill */}
        <div
          className="h-7 px-3 border-t flex items-center justify-between text-[10px] opacity-45 font-mono shrink-0 select-none"
          style={{ borderColor: `${theme.colors.border}25` }}
        >
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-cyan-400">
              <Sparkles className="h-2.5 w-2.5" />
              <span>{mode === 'read' ? '对照只读模式' : mode === 'edit' ? '实时协同双写' : '大纲设定集'}</span>
            </span>
          </div>
          <div>
            {mode !== 'bible' && activeChap && (
              <span>{activeChap.wordCount} 字 · 约 {Math.max(1, Math.ceil(activeChap.wordCount / 400))} 分钟</span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
