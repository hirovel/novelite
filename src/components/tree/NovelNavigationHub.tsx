import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Download,
  Hash,
  Folder,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { projectStore, countWordsFast } from '../../core/storage/ProjectStore';
import type { NovelProject, Chapter } from '../../core/storage/types';
import { eventBus } from '../../core/events/EventBus';
import type { Theme } from '../../core/themes/types';

export type NavigationDemoMode = 'ulysses-sheets' | 'bear-hairline' | 'horizon-island' | 'obsidian-alt';

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  theme: Theme;
}

interface ContextMenuState {
  x: number;
  y: number;
  chapId: string;
  volId: string;
  chapTitle: string;
}

export const NovelNavigationHub: React.FC<Props> = ({ isOpen, theme }) => {
  const [project, setProject] = useState<NovelProject>(() => projectStore.getProject());
  const [navMode, setNavMode] = useState<NavigationDemoMode>(() => {
    return (localStorage.getItem('novelite_nav_demo_mode') as NavigationDemoMode) || 'ulysses-sheets';
  });

  const [selectedVolId, setSelectedVolId] = useState<string>(() => {
    return projectStore.getProject().volumes[0]?.id || '';
  });
  const [activeChapterId, setActiveChapterId] = useState<string | null>(() => projectStore.getActiveChapter()?.id || null);
  const [isIslandExpanded, setIsIslandExpanded] = useState<boolean>(false);

  // Inline creation states
  const [inlineNewChap, setInlineNewChap] = useState<{ volId: string; index?: number } | null>(null);
  const [newChapTitle, setNewChapTitle] = useState<string>('');
  const [inlineNewVol, setInlineNewVol] = useState<boolean>(false);
  const [newVolTitle, setNewVolTitle] = useState<string>('');

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  // Context Menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const editInputRef = useRef<HTMLInputElement | null>(null);
  const newChapInputRef = useRef<HTMLInputElement | null>(null);
  const newVolInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      const proj = projectStore.getProject();
      setProject({ ...proj });
      setActiveChapterId(projectStore.getActiveChapter()?.id || null);
      if (!selectedVolId && proj.volumes[0]) {
        setSelectedVolId(proj.volumes[0].id);
      }
    };

    const unsubs = [
      eventBus.on('project-tree-changed', handleUpdate),
      eventBus.on('active-chapter-changed', handleUpdate),
      eventBus.on('chapter-content-updated', handleUpdate),
    ];

    return () => unsubs.forEach((fn) => fn());
  }, [selectedVolId]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (inlineNewChap && newChapInputRef.current) {
      newChapInputRef.current.focus();
      newChapInputRef.current.select();
    }
  }, [inlineNewChap]);

  useEffect(() => {
    if (inlineNewVol && newVolInputRef.current) {
      newVolInputRef.current.focus();
      newVolInputRef.current.select();
    }
  }, [inlineNewVol]);

  useEffect(() => {
    const handleDocClick = () => {
      setContextMenu(null);
      setIsIslandExpanded(false);
    };
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, []);

  const handleChangeNavMode = (mode: NavigationDemoMode) => {
    setNavMode(mode);
    localStorage.setItem('novelite_nav_demo_mode', mode);
  };

  const handleSelectChapter = (chapId: string) => {
    projectStore.setActiveChapter(chapId);
    setActiveChapterId(chapId);
    if (navMode === 'horizon-island') {
      setIsIslandExpanded(false);
    }
  };

  const handleCreateChapterSubmit = () => {
    if (!inlineNewChap) return;
    const vol = project.volumes.find((v) => v.id === inlineNewChap.volId) || project.volumes[0];
    if (!vol) return;
    const count = vol.chapters.length + 1;
    const title = newChapTitle.trim() || `第 ${count} 章`;

    const newChap = projectStore.insertChapter(vol.id, title, inlineNewChap.index);
    setActiveChapterId(newChap.id);
    setNewChapTitle('');
    setInlineNewChap(null);
  };

  const handleCreateVolumeSubmit = () => {
    const title = newVolTitle.trim() || `第 ${project.volumes.length + 1} 卷`;
    const newVol = projectStore.addVolume(title);
    setSelectedVolId(newVol.id);
    setNewVolTitle('');
    setInlineNewVol(false);
  };

  const handleStartRename = (e: React.MouseEvent, id: string, curTitle: string) => {
    e.stopPropagation();
    setContextMenu(null);
    setEditingId(id);
    setEditTitle(curTitle);
  };

  const handleSaveRename = (type: 'vol' | 'chap', id: string) => {
    if (editTitle.trim()) {
      if (type === 'vol') {
        projectStore.renameVolume(id, editTitle.trim());
      } else {
        projectStore.renameChapter(id, editTitle.trim());
      }
    }
    setEditingId(null);
  };

  const handleDuplicateChapter = (chapId: string) => {
    setContextMenu(null);
    const copy = projectStore.duplicateChapter(chapId);
    if (copy) {
      eventBus.emit('show-toast', { message: `已创建副本《${copy.title}》`, type: 'success' });
    }
  };

  const handleDeleteChapter = (e: React.MouseEvent, chapId: string, chapTitle: string) => {
    e.stopPropagation();
    setContextMenu(null);
    projectStore.deleteChapter(chapId);
    eventBus.emit('show-toast', { message: `已删除《${chapTitle}》`, type: 'info' });
  };

  const handleAutoNumber = () => {
    const count = projectStore.autoNumberChapters();
    eventBus.emit('show-toast', { message: `已规范全书 ${count} 章节序号`, type: 'success' });
  };

  const handleExportChapter = (chap: Chapter, format: 'txt' | 'md' = 'txt') => {
    setContextMenu(null);
    let content = chap.content || '';
    if (format === 'txt') {
      content = content
        .replace(/^#+\s+.*$/gm, '')
        .split('\n')
        .map((line: string) => (line.trim() ? `　　${line.trim()}` : ''))
        .join('\n');
      content = `${chap.title}\n\n${content}\n`;
    }
    const mime = format === 'txt' ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chap.title}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    eventBus.emit('show-toast', { message: `已导出《${chap.title}.${format}》`, type: 'success' });
  };

  const handleContextMenu = (e: React.MouseEvent, chap: Chapter, volId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      chapId: chap.id,
      volId,
      chapTitle: chap.title,
    });
  };

  const activeVol = project.volumes.find((v) => v.id === selectedVolId) || project.volumes[0];
  const activeChap = projectStore.getActiveChapter();
  const totalWords = projectStore.getTotalWordCount();
  const totalChapters = project.volumes.reduce((acc, v) => acc + v.chapters.length, 0);

  // Helper to extract first sentence snippet for Ulysses Sheet Cards
  const getFirstSentence = (content = '') => {
    const clean = content.replace(/^#+\s+.*$/gm, '').trim();
    if (!clean) return '暂无正文内容……';
    const firstLine = clean.split('\n')[0].trim();
    return firstLine.slice(0, 48) + (firstLine.length > 48 ? '…' : '');
  };

  return (
    <>
      {/* 🌟 1. Global Navigation Mode Demo Selector Pill */}
      <div className="absolute top-3 left-4 z-40 flex items-center gap-1.5 p-1 rounded-xl border bg-black/40 backdrop-blur-2xl shadow-xl border-white/10 text-xs select-none">
        <span className="text-[10px] font-mono opacity-40 px-1.5 flex items-center gap-1">
          <Sparkles className="h-3 w-3" style={{ color: theme.colors.accent || '#38bdf8' }} />
          导航风格体验:
        </span>
        {(
          [
            { id: 'ulysses-sheets', label: '1. Ulysses 卡片' },
            { id: 'bear-hairline', label: '2. Bear 2 发丝树' },
            { id: 'horizon-island', label: '3. 顶部灵动胶囊' },
            { id: 'obsidian-alt', label: '4. Obsidian 分区' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            onClick={() => handleChangeNavMode(m.id)}
            className={`px-2 py-1 rounded-lg text-xs transition-all cursor-pointer border ${
              navMode === m.id
                ? 'font-semibold shadow-xs'
                : 'opacity-50 hover:opacity-100 hover:bg-white/5 border-transparent'
            }`}
            style={{
              color: navMode === m.id ? (theme.colors.accent || theme.colors.text) : undefined,
              backgroundColor: navMode === m.id ? `${theme.colors.accent || '#38bdf8'}20` : undefined,
              borderColor: navMode === m.id ? `${theme.colors.accent || '#38bdf8'}40` : 'transparent',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 🌟 STYLE 1: Ulysses-style Multi-Pane Sheet Cards (长篇手稿卡片流) */}
      {/* ========================================================================= */}
      {navMode === 'ulysses-sheets' && isOpen && (
        <aside
          className="w-76 sm:w-84 h-full flex flex-col shrink-0 border-r select-none relative z-20 transition-all duration-200 ease-out bg-black/25"
          style={{
            backgroundColor: `${theme.colors.bgSecondary}FA`,
            borderColor: `${theme.colors.border}40`,
          }}
        >
          {/* Header */}
          <div className="pt-13 px-4 pb-2.5 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              <BookOpen className="h-3.5 w-3.5 opacity-60" style={{ color: theme.colors.accent || '#38bdf8' }} />
              <h3 className="font-semibold text-xs truncate" style={{ color: theme.colors.text }}>
                {project.title || '未命名作品'}
              </h3>
            </div>
            <button
              onClick={() => {
                if (activeVol) setInlineNewChap({ volId: activeVol.id });
              }}
              className="p-1 rounded-md opacity-50 hover:opacity-100 hover:bg-white/10 cursor-pointer"
              title="新建章节 (Ctrl+N)"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Volume Tabs */}
          <div className="flex items-center gap-1 p-2 border-b border-white/5 overflow-x-auto">
            {project.volumes.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVolId(v.id)}
                className={`px-2.5 py-1 rounded-lg text-xs shrink-0 transition-all cursor-pointer ${
                  selectedVolId === v.id
                    ? 'bg-white/15 text-white font-semibold'
                    : 'opacity-45 hover:opacity-80 hover:bg-white/5'
                }`}
              >
                {v.title} ({v.chapters.length})
              </button>
            ))}
            <button
              onClick={() => {
                setInlineNewVol(true);
                setNewVolTitle(`第 ${project.volumes.length + 1} 卷`);
              }}
              className="p-1 rounded-md opacity-30 hover:opacity-80 shrink-0 cursor-pointer"
              title="新建分卷"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Inline New Volume */}
          {inlineNewVol && (
            <div className="p-2 border-b border-white/5 bg-white/5">
              <input
                ref={newVolInputRef}
                type="text"
                value={newVolTitle}
                onChange={(e) => setNewVolTitle(e.target.value)}
                placeholder="输入分卷名称，敲回车..."
                onBlur={handleCreateVolumeSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateVolumeSubmit();
                  if (e.key === 'Escape') setInlineNewVol(false);
                }}
                className="w-full bg-black/40 border border-white/20 rounded px-2 py-1 text-xs outline-none"
                style={{ color: theme.colors.text }}
              />
            </div>
          )}

          {/* Sheet Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {activeVol?.chapters.map((chap) => {
              const isCur = chap.id === activeChapterId;
              const wordCount = chap.wordCount || countWordsFast(chap.content || '');
              const snippet = getFirstSentence(chap.content);

              return (
                <div
                  key={chap.id}
                  onClick={() => handleSelectChapter(chap.id)}
                  onContextMenu={(e) => handleContextMenu(e, chap, activeVol.id)}
                  className={`group p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isCur
                      ? 'bg-white/10 border-white/20 shadow-xs font-medium'
                      : 'border-transparent opacity-65 hover:opacity-100 hover:bg-white/5'
                  }`}
                  style={{ color: theme.colors.text }}
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className="font-semibold truncate flex-1 mr-2">{chap.title}</span>
                    <span className="text-[10px] font-mono opacity-40 shrink-0">{wordCount} 字</span>
                  </div>
                  <p className="text-[10.5px] opacity-40 line-clamp-2 leading-relaxed font-sans select-none">
                    {snippet}
                  </p>
                </div>
              );
            })}

            {/* Inline New Chapter */}
            {inlineNewChap && (
              <div className="p-2 rounded-xl border border-cyan-400/50 bg-cyan-500/10">
                <input
                  ref={newChapInputRef}
                  type="text"
                  value={newChapTitle}
                  onChange={(e) => setNewChapTitle(e.target.value)}
                  placeholder="输入章节名，敲回车..."
                  onBlur={handleCreateChapterSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateChapterSubmit();
                    if (e.key === 'Escape') setInlineNewChap(null);
                  }}
                  className="w-full bg-transparent text-xs outline-none font-medium text-cyan-200 placeholder:text-cyan-400/40"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 px-3.5 border-t border-white/5 flex items-center justify-between text-[10px] opacity-40 font-mono">
            <span>{totalChapters} 章 · {totalWords.toLocaleString()} 字</span>
            <button
              onClick={() => {
                if (activeVol) setInlineNewChap({ volId: activeVol.id });
              }}
              className="hover:text-white cursor-pointer"
            >
              + 新建章节
            </button>
          </div>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* 🌟 STYLE 2: Bear 2.0 Hairline Tree (极致发丝垂直虚线极简树) */}
      {/* ========================================================================= */}
      {navMode === 'bear-hairline' && isOpen && (
        <aside
          className="w-72 sm:w-80 h-full flex flex-col shrink-0 border-r select-none relative z-20 transition-all duration-200 ease-out"
          style={{
            backgroundColor: `${theme.colors.bgSecondary}FA`,
            borderColor: `${theme.colors.border}40`,
          }}
        >
          {/* Header */}
          <div className="pt-13 px-4 pb-2.5 flex items-center justify-between border-b border-white/5">
            <h3 className="font-semibold text-xs tracking-wide opacity-80" style={{ color: theme.colors.text }}>
              {project.title || '未命名作品'}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (project.volumes[0]) setInlineNewChap({ volId: project.volumes[0].id });
                }}
                className="p-1 rounded opacity-40 hover:opacity-100 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Hairline Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {project.volumes.map((vol) => (
              <div key={vol.id} className="space-y-0.5">
                <div className="flex items-center justify-between px-2 py-1 text-xs opacity-50 font-medium">
                  <span>{vol.title}</span>
                  <span className="text-[9.5px] font-mono opacity-40">({vol.chapters.length})</span>
                </div>

                <div className="pl-3.5 ml-2 border-l border-white/[0.08] space-y-0.5">
                  {vol.chapters.map((chap) => {
                    const isCur = chap.id === activeChapterId;
                    const wordCount = chap.wordCount || countWordsFast(chap.content || '');

                    return (
                      <div
                        key={chap.id}
                        onClick={() => handleSelectChapter(chap.id)}
                        onContextMenu={(e) => handleContextMenu(e, chap, vol.id)}
                        className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs cursor-pointer transition-all ${
                          isCur
                            ? 'bg-white/10 text-white font-medium shadow-xs'
                            : 'opacity-60 hover:opacity-100 hover:bg-white/[0.04]'
                        }`}
                        style={{ color: isCur ? theme.colors.text : theme.colors.textMuted }}
                      >
                        <span className="truncate flex-1">{chap.title}</span>
                        <span className="text-[9.5px] font-mono opacity-30 shrink-0 ml-1">{wordCount}字</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-2.5 px-3.5 border-t border-white/5 flex items-center justify-between text-[10px] opacity-40 font-mono">
            <span>{totalChapters} 章 · {totalWords.toLocaleString()} 字</span>
            <button
              onClick={() => {
                setInlineNewVol(true);
                setNewVolTitle(`第 ${project.volumes.length + 1} 卷`);
              }}
              className="hover:text-white cursor-pointer"
            >
              + 新建分卷
            </button>
          </div>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* 🌟 STYLE 3: Horizon Island (顶部无界灵动流光胶囊 · 彻底 0 边栏) */}
      {/* ========================================================================= */}
      {navMode === 'horizon-island' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 select-none">
          {/* Dynamic Island Capsule */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsIslandExpanded(!isIslandExpanded);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-black/40 hover:bg-black/60 backdrop-blur-2xl shadow-xl text-xs cursor-pointer transition-all hover:scale-105"
            style={{ color: theme.colors.text }}
          >
            <BookOpen className="h-3.5 w-3.5 opacity-80" style={{ color: theme.colors.accent || '#38bdf8' }} />
            <span className="font-semibold text-xs tracking-wide">
              {activeVol?.title || '第一卷'} › {activeChap?.title || '第一章'}
            </span>
            <span className="text-[10px] font-mono opacity-40">
              ({activeChap?.wordCount || 0} 字)
            </span>
            <ChevronDown className="h-3 w-3 opacity-40" />
          </div>

          {/* Expanded Drop Flight Deck */}
          {isIslandExpanded && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-10 left-1/2 -translate-x-1/2 w-[480px] rounded-2xl border border-white/15 bg-black/70 backdrop-blur-3xl shadow-2xl p-3 text-xs animate-in fade-in slide-in-from-top-2 duration-150"
              style={{ color: theme.colors.text }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="font-semibold text-xs">全书大纲与章节速览</span>
                <span className="text-[10px] font-mono opacity-40">{totalChapters} 章 · {totalWords.toLocaleString()} 字</span>
              </div>

              {/* Two Column Selector */}
              <div className="flex gap-2 pt-2 h-56">
                {/* Left: Volumes */}
                <div className="w-40 border-r border-white/10 overflow-y-auto space-y-1 pr-1">
                  {project.volumes.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVolId(v.id)}
                      className={`p-1.5 rounded-lg cursor-pointer text-xs truncate ${
                        selectedVolId === v.id ? 'bg-white/15 font-semibold' : 'opacity-60 hover:bg-white/5'
                      }`}
                      style={{ color: selectedVolId === v.id ? (theme.colors.accent || '#38bdf8') : undefined }}
                    >
                      {v.title} ({v.chapters.length})
                    </div>
                  ))}
                </div>

                {/* Right: Chapters in active volume */}
                <div className="flex-1 overflow-y-auto space-y-1 pl-1">
                  {activeVol?.chapters.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectChapter(c.id)}
                      className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-xs ${
                        c.id === activeChapterId ? 'font-semibold' : 'opacity-70 hover:bg-white/5'
                      }`}
                      style={{
                        color: c.id === activeChapterId ? (theme.colors.accent || '#38bdf8') : undefined,
                        backgroundColor: c.id === activeChapterId ? `${theme.colors.accent || '#38bdf8'}20` : undefined,
                      }}
                    >
                      <span className="truncate flex-1">{c.title}</span>
                      <span className="text-[10px] font-mono opacity-40 ml-1">{c.wordCount}字</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 STYLE 4: Obsidian Alternative Explorer (上下分区分卷聚焦) */}
      {/* ========================================================================= */}
      {navMode === 'obsidian-alt' && isOpen && (
        <aside
          className="w-72 sm:w-80 h-full flex flex-col shrink-0 border-r select-none relative z-20 transition-all duration-200 ease-out"
          style={{
            backgroundColor: `${theme.colors.bgSecondary}FA`,
            borderColor: `${theme.colors.border}40`,
          }}
        >
          {/* Header */}
          <div className="pt-13 px-4 pb-2.5 flex items-center justify-between border-b border-white/5">
            <h3 className="font-semibold text-xs tracking-wide" style={{ color: theme.colors.text }}>
              {project.title || '未命名作品'}
            </h3>
            <button
              onClick={() => {
                if (activeVol) setInlineNewChap({ volId: activeVol.id });
              }}
              className="p-1 rounded opacity-40 hover:opacity-100 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Top Half: Volumes Folder Section */}
          <div className="h-36 border-b border-white/5 overflow-y-auto p-2 space-y-1 bg-black/10">
            <div className="text-[10px] font-mono opacity-30 px-1">分卷目录</div>
            {project.volumes.map((v) => (
              <div
                key={v.id}
                onClick={() => setSelectedVolId(v.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs cursor-pointer ${
                  selectedVolId === v.id ? 'bg-white/15 font-semibold text-cyan-300' : 'opacity-60 hover:bg-white/5'
                }`}
                style={{ color: theme.colors.text }}
              >
                <Folder className="h-3 w-3 opacity-60" />
                <span className="truncate flex-1">{v.title}</span>
                <span className="text-[9.5px] font-mono opacity-40">{v.chapters.length}</span>
              </div>
            ))}
          </div>

          {/* Bottom Half: Chapters in selected volume */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <div className="text-[10px] font-mono opacity-30 px-1 pb-1">
              《{activeVol?.title}》章节列表
            </div>
            {activeVol?.chapters.map((chap) => {
              const isCur = chap.id === activeChapterId;
              const wordCount = chap.wordCount || countWordsFast(chap.content || '');

              return (
                <div
                  key={chap.id}
                  onClick={() => handleSelectChapter(chap.id)}
                  onContextMenu={(e) => handleContextMenu(e, chap, activeVol.id)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer ${
                    isCur ? 'bg-white/10 font-medium' : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                  }`}
                  style={{ color: theme.colors.text }}
                >
                  <span className="truncate flex-1">{chap.title}</span>
                  <span className="text-[9.5px] font-mono opacity-30 ml-1">{wordCount}字</span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-2.5 px-3.5 border-t border-white/5 flex items-center justify-between text-[10px] opacity-40 font-mono">
            <span>{totalChapters} 章 · {totalWords.toLocaleString()} 字</span>
            <button
              onClick={() => {
                if (activeVol) setInlineNewChap({ volId: activeVol.id });
              }}
              className="hover:text-white cursor-pointer"
            >
              + 新建章节
            </button>
          </div>
        </aside>
      )}

      {/* 5. Minimalist Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-60 w-44 rounded-xl border shadow-2xl backdrop-blur-2xl p-1 text-xs animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 300),
            left: Math.min(contextMenu.x, window.innerWidth - 190),
            backgroundColor: `${theme.colors.bgSecondary}FD`,
            borderColor: `${theme.colors.border}80`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[9.5px] font-mono opacity-40 border-b border-white/5 truncate">
            《{contextMenu.chapTitle}》
          </div>

          <button
            onClick={() => handleStartRename(null as any, contextMenu.chapId, contextMenu.chapTitle)}
            className="w-full flex items-center gap-2 px-2 py-1.2 rounded-md hover:bg-white/5 transition-colors text-left"
            style={{ color: theme.colors.text }}
          >
            <Edit3 className="h-3 w-3 opacity-50" />
            <span>重命名 (F2)</span>
          </button>

          <button
            onClick={() => handleDuplicateChapter(contextMenu.chapId)}
            className="w-full flex items-center gap-2 px-2 py-1.2 rounded-md hover:bg-white/5 transition-colors text-left"
            style={{ color: theme.colors.text }}
          >
            <Copy className="h-3 w-3 opacity-50" />
            <span>创建副本</span>
          </button>

          <button
            onClick={handleAutoNumber}
            className="w-full flex items-center gap-2 px-2 py-1.2 rounded-md hover:bg-white/5 transition-colors text-left"
            style={{ color: theme.colors.text }}
          >
            <Hash className="h-3 w-3 opacity-50" />
            <span>全书规范重编号</span>
          </button>

          <div className="pt-1 mt-1 border-t border-white/5 space-y-0.5">
            <button
              onClick={() => {
                const chap = projectStore.findChapter(contextMenu.chapId);
                if (chap) handleExportChapter(chap, 'txt');
              }}
              className="w-full flex items-center gap-2 px-2 py-1.2 rounded-md hover:bg-white/5 transition-colors text-left"
              style={{ color: theme.colors.text }}
            >
              <Download className="h-3 w-3 opacity-50" />
              <span>导出 TXT</span>
            </button>

            <button
              onClick={(e) => handleDeleteChapter(e, contextMenu.chapId, contextMenu.chapTitle)}
              className="w-full flex items-center gap-2 px-2 py-1.2 rounded-md text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              <Trash2 className="h-3 w-3" />
              <span>删除章节</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline Rename input overlay if active */}
      {editingId && (
        <div
          className="fixed inset-0 z-70 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setEditingId(null)}
        >
          <div
            className="w-72 p-3 rounded-xl border bg-black/80 backdrop-blur-xl space-y-2 border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-semibold text-white">重命名</div>
            <input
              ref={editInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename('chap', editingId);
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="w-full bg-black/50 border border-cyan-400 rounded px-2 py-1 text-xs text-white outline-none"
            />
            <div className="flex justify-end gap-1 text-xs">
              <button
                onClick={() => setEditingId(null)}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
              >
                取消
              </button>
              <button
                onClick={() => handleSaveRename('chap', editingId)}
                className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
