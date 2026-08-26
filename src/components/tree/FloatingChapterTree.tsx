import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  Clock,
  FileEdit,
  Pin,
  PinOff,
  X,
  Sparkles,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { projectStore, countWordsFast } from '../../core/storage/ProjectStore';
import type { NovelProject, Volume } from '../../core/storage/types';
import { eventBus } from '../../core/events/EventBus';
import type { Theme } from '../../core/themes/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}

type ChapterStatus = 'draft' | 'review' | 'done';

const STATUS_MAP: Record<ChapterStatus, { label: string; icon: any; color: string }> = {
  draft: { label: '草稿', icon: FileEdit, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  review: { label: '修订', icon: Clock, color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
  done: { label: '定稿', icon: CheckCircle2, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
};

export const FloatingChapterTree: React.FC<Props> = ({ isOpen, onClose, theme }) => {
  const [project, setProject] = useState<NovelProject>(() => projectStore.getProject());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | ChapterStatus>('all');
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(() => projectStore.getActiveChapter()?.id || null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement | null>(null);

  // Transition presence
  const [shouldRender, setShouldRender] = useState<boolean>(isOpen);
  const [isAnimatingIn, setIsAnimatingIn] = useState<boolean>(false);

  // Chapter statuses
  const [chapterStatuses, setChapterStatuses] = useState<Record<string, ChapterStatus>>(() => {
    const saved = localStorage.getItem('novelite_chapter_statuses');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
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

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      setProject({ ...projectStore.getProject() });
      setActiveChapterId(projectStore.getActiveChapter()?.id || null);
    };

    const unsubs = [
      eventBus.on('project-tree-changed', handleUpdate),
      eventBus.on('active-chapter-changed', handleUpdate),
      eventBus.on('chapter-content-updated', handleUpdate),
    ];

    return () => unsubs.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  if (!shouldRender) return null;

  // Calculate totals
  let totalWords = 0;
  let totalChapters = 0;
  project.volumes.forEach((vol) => {
    vol.chapters.forEach((chap) => {
      totalWords += chap.wordCount || countWordsFast(chap.content || '');
      totalChapters++;
    });
  });

  const handleSelectChapter = (chapId: string) => {
    projectStore.setActiveChapter(chapId);
    setActiveChapterId(chapId);
    if (!isPinned) {
      onClose();
    }
  };

  const handleToggleVolume = (vol: Volume) => {
    vol.isExpanded = !vol.isExpanded;
    projectStore.save();
    setProject({ ...projectStore.getProject() });
  };

  const handleAddVolume = () => {
    const title = prompt('请输入新分卷名称：', `第 ${project.volumes.length + 1} 卷`);
    if (title?.trim()) {
      projectStore.addVolume(title.trim());
    }
  };

  const handleAddChapter = (volId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const vol = project.volumes.find((v) => v.id === volId);
    const count = (vol?.chapters.length || 0) + 1;
    const title = prompt('请输入新章节名称：', `第 ${count} 章`);
    if (title?.trim()) {
      const newChap = projectStore.addChapter(volId, title.trim());
      setActiveChapterId(newChap.id);
    }
  };

  const handleStartRename = (e: React.MouseEvent, id: string, curTitle: string) => {
    e.stopPropagation();
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

  const handleDeleteVolume = (e: React.MouseEvent, volId: string) => {
    e.stopPropagation();
    const vol = project.volumes.find((v) => v.id === volId);
    if (confirm(`确定删除分卷《${vol?.title}》及其下所有章节吗？此操作不可恢复。`)) {
      projectStore.deleteVolume(volId);
    }
  };

  const handleDeleteChapter = (e: React.MouseEvent, chapId: string) => {
    e.stopPropagation();
    if (confirm('确定删除此章节吗？此操作不可恢复。')) {
      projectStore.deleteChapter(chapId);
    }
  };

  const handleCycleStatus = (e: React.MouseEvent, chapId: string) => {
    e.stopPropagation();
    const cur = chapterStatuses[chapId] || 'draft';
    const next: ChapterStatus = cur === 'draft' ? 'review' : cur === 'review' ? 'done' : 'draft';
    const updated = { ...chapterStatuses, [chapId]: next };
    setChapterStatuses(updated);
    localStorage.setItem('novelite_chapter_statuses', JSON.stringify(updated));
  };

  const handleMoveChapter = (e: React.MouseEvent, volId: string, chapIndex: number, dir: -1 | 1) => {
    e.stopPropagation();
    const vol = project.volumes.find((v) => v.id === volId);
    if (!vol) return;
    const targetIdx = chapIndex + dir;
    if (targetIdx < 0 || targetIdx >= vol.chapters.length) return;

    const temp = vol.chapters[chapIndex];
    vol.chapters[chapIndex] = vol.chapters[targetIdx];
    vol.chapters[targetIdx] = temp;

    projectStore.save();
    setProject({ ...projectStore.getProject() });
  };

  return (
    <>
      {/* Background Dimmer Backdrop (only dim when not pinned) */}
      {!isPinned && (
        <div
          className={`fixed inset-0 z-40 transition-all duration-250 ${
            isAnimatingIn ? 'bg-black/40 backdrop-blur-xs opacity-100' : 'bg-black/0 opacity-0 pointer-events-none'
          }`}
          onClick={onClose}
        />
      )}

      {/* 🌟 Floating Manuscript Tree Sheet */}
      <div
        className={`fixed left-6 sm:left-8 top-12 bottom-12 z-50 w-80 sm:w-92 rounded-3xl border shadow-2xl flex flex-col overflow-hidden select-none transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isAnimatingIn
            ? 'opacity-100 translate-x-0 scale-100'
            : 'opacity-0 -translate-x-6 scale-95 pointer-events-none'
        }`}
        style={{
          backgroundColor: `${theme.colors.bgSecondary}f2`,
          borderColor: `${theme.colors.border}cc`,
          boxShadow: `0 25px 60px -15px rgba(0, 0, 0, 0.75), 0 0 35px ${theme.colors.accentGlow}`,
          backdropFilter: 'blur(24px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-4 bg-black/20 shrink-0"
          style={{ borderColor: `${theme.colors.border}80` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: `${theme.colors.accent}20`, color: theme.colors.accent }}
            >
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-tight" style={{ color: theme.colors.text }}>
                分卷大纲与章节树
              </h3>
              <p className="text-[10px] font-mono opacity-50" style={{ color: theme.colors.textMuted }}>
                {project.volumes.length} 卷 · {totalChapters} 章 · {totalWords.toLocaleString()} 字
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1.5 rounded-lg border transition-all ${
                isPinned
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                  : 'border-white/5 opacity-50 hover:opacity-100 hover:bg-white/10'
              }`}
              title={isPinned ? '已常驻浮动 (点击取消常驻)' : '固定常驻大纲'}
            >
              {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-white/5 opacity-60 hover:opacity-100 hover:bg-white/10 transition-all"
              style={{ color: theme.colors.text }}
              title="关闭 (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Search & Status Filter */}
        <div className="p-3.5 border-b space-y-2 bg-black/10 shrink-0" style={{ borderColor: `${theme.colors.border}60` }}>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-black/20"
            style={{ borderColor: `${theme.colors.border}60` }}
          >
            <Search className="h-3.5 w-3.5 opacity-40 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="快速检索章节或分卷..."
              className="w-full bg-transparent text-xs outline-none placeholder:opacity-40 font-mono"
              style={{ color: theme.colors.text }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="opacity-40 hover:opacity-100 text-xs">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 pt-0.5">
            {(['all', 'draft', 'review', 'done'] as const).map((st) => {
              const isCur = statusFilter === st;
              const label = st === 'all' ? '全部' : STATUS_MAP[st].label;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all ${
                    isCur
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold'
                      : 'opacity-50 hover:opacity-100 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 📜 Scrollable Volume & Chapter Tree Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {project.volumes.map((vol) => {
            const volWordCount = vol.chapters.reduce(
              (acc, c) => acc + (c.wordCount || countWordsFast(c.content || '')),
              0
            );

            // Filter chapters
            const visibleChapters = vol.chapters.filter((chap) => {
              const matchesSearch =
                !searchQuery.trim() ||
                chap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                vol.title.toLowerCase().includes(searchQuery.toLowerCase());

              const status = chapterStatuses[chap.id] || 'draft';
              const matchesStatus = statusFilter === 'all' || status === statusFilter;

              return matchesSearch && matchesStatus;
            });

            if (searchQuery && visibleChapters.length === 0) return null;

            return (
              <div
                key={vol.id}
                className="rounded-2xl border overflow-hidden transition-all bg-black/15"
                style={{ borderColor: `${theme.colors.border}60` }}
              >
                {/* Volume Header Bar */}
                <div
                  onClick={() => handleToggleVolume(vol)}
                  className="group flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="opacity-60 group-hover:opacity-100 transition-opacity">
                      {vol.isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </span>

                    {editingId === vol.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleSaveRename('vol', vol.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename('vol', vol.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-black/40 border border-cyan-400 rounded px-1.5 py-0.5 text-xs font-semibold outline-none"
                        style={{ color: theme.colors.text }}
                      />
                    ) : (
                      <span className="font-semibold text-xs truncate" style={{ color: theme.colors.text }}>
                        {vol.title}
                      </span>
                    )}

                    <span className="text-[10px] font-mono opacity-40 shrink-0">
                      ({vol.chapters.length} 章 · {volWordCount.toLocaleString()} 字)
                    </span>
                  </div>

                  {/* Volume Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleAddChapter(vol.id, e)}
                      title="在此分卷新建章节"
                      className="p-1 hover:text-cyan-400 hover:bg-white/10 rounded"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => handleStartRename(e, vol.id, vol.title)}
                      title="重命名分卷"
                      className="p-1 hover:text-cyan-400 hover:bg-white/10 rounded"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    {project.volumes.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteVolume(e, vol.id)}
                        title="删除分卷"
                        className="p-1 hover:text-red-400 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chapter List inside Volume */}
                {vol.isExpanded && (
                  <div className="p-1.5 space-y-1 border-t border-white/5">
                    {visibleChapters.length === 0 ? (
                      <div className="py-3 text-center text-[10px] opacity-40 font-mono">
                        此卷暂无章节
                      </div>
                    ) : (
                      visibleChapters.map((chap, idx) => {
                        const isCur = chap.id === activeChapterId;
                        const status = chapterStatuses[chap.id] || 'draft';
                        const stConfig = STATUS_MAP[status];
                        const wordCount = chap.wordCount || countWordsFast(chap.content || '');

                        return (
                          <div
                            key={chap.id}
                            onClick={() => handleSelectChapter(chap.id)}
                            className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition-all ${
                              isCur
                                ? 'ring-1 ring-cyan-400/80 font-medium shadow-xs scale-[1.01]'
                                : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                            }`}
                            style={{
                              backgroundColor: isCur ? theme.colors.bgHover : 'transparent',
                              color: isCur ? theme.colors.text : theme.colors.textMuted,
                            }}
                          >
                            {/* Active Caret Orb Indicator */}
                            {isCur && (
                              <span
                                className="absolute left-1 top-2 bottom-2 w-1 rounded-full shadow-[0_0_8px_currentColor]"
                                style={{ backgroundColor: theme.colors.accent, color: theme.colors.accent }}
                              />
                            )}

                            <div className="flex items-center gap-2 overflow-hidden pl-1 flex-1">
                              {/* Chapter Status Pill */}
                              <button
                                onClick={(e) => handleCycleStatus(e, chap.id)}
                                title={`当前状态: ${stConfig.label} (点击切换)`}
                                className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono border shrink-0 ${stConfig.color}`}
                              >
                                {stConfig.label}
                              </button>

                              {editingId === chap.id ? (
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  onBlur={() => handleSaveRename('chap', chap.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename('chap', chap.id);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-black/40 border border-cyan-400 rounded px-1.5 py-0.5 text-xs outline-none w-full"
                                  style={{ color: theme.colors.text }}
                                />
                              ) : (
                                <span className="truncate" style={{ color: isCur ? theme.colors.text : 'inherit' }}>
                                  {chap.title}
                                </span>
                              )}
                            </div>

                            {/* Word Count & Chapter Actions */}
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <span className="text-[10px] font-mono opacity-40 group-hover:opacity-0 transition-opacity">
                                {wordCount.toLocaleString()} 字
                              </span>

                              {/* Hover Action Strip */}
                              <div className="hidden group-hover:flex items-center gap-0.5">
                                {idx > 0 && (
                                  <button
                                    onClick={(e) => handleMoveChapter(e, vol.id, idx, -1)}
                                    title="上移"
                                    className="p-1 hover:text-white rounded hover:bg-white/10"
                                  >
                                    <ArrowUp className="h-2.5 w-2.5" />
                                  </button>
                                )}
                                {idx < vol.chapters.length - 1 && (
                                  <button
                                    onClick={(e) => handleMoveChapter(e, vol.id, idx, 1)}
                                    title="下移"
                                    className="p-1 hover:text-white rounded hover:bg-white/10"
                                  >
                                    <ArrowDown className="h-2.5 w-2.5" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => handleStartRename(e, chap.id, chap.title)}
                                  title="重命名章节"
                                  className="p-1 hover:text-cyan-400 rounded hover:bg-white/10"
                                >
                                  <Edit3 className="h-2.5 w-2.5" />
                                </button>
                                {vol.chapters.length > 1 && (
                                  <button
                                    onClick={(e) => handleDeleteChapter(e, chap.id)}
                                    title="删除章节"
                                    className="p-1 hover:text-red-400 rounded hover:bg-red-500/10"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Quick Create Toolstrip */}
        <div
          className="flex items-center justify-between border-t p-3 bg-black/25 shrink-0"
          style={{ borderColor: `${theme.colors.border}80` }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddVolume}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium transition-all"
              style={{ color: theme.colors.text }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>新建分卷</span>
            </button>

            {project.volumes[0] && (
              <button
                onClick={() => handleAddChapter(project.volumes[0].id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs"
                style={{
                  backgroundColor: `${theme.colors.accent}20`,
                  borderColor: `${theme.colors.accent}40`,
                  color: theme.colors.accent,
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>新建章节</span>
              </button>
            )}
          </div>

          <span className="text-[10px] font-mono opacity-40">Esc 退出</span>
        </div>
      </div>
    </>
  );
};