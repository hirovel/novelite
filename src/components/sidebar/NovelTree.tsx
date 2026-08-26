import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Book,
  Search,
  Copy,
  CheckCircle2,
  Clock,
  FileEdit,
  ArrowUp,
  ArrowDown,
  Download,
} from 'lucide-react';
import { projectStore } from '../../core/storage/ProjectStore';
import type { NovelProject, Volume, Chapter } from '../../core/storage/types';
import { eventBus } from '../../core/events/EventBus';
import type { Theme } from '../../core/themes/types';

interface Props {
  theme: Theme;
}

type ChapterStatus = 'draft' | 'review' | 'done';

const STATUS_CONFIG: Record<ChapterStatus, { label: string; icon: any; color: string }> = {
  draft: { label: '草稿', icon: FileEdit, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  review: { label: '修订', icon: Clock, color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
  done: { label: '定稿', icon: CheckCircle2, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
};

export const NovelTree: React.FC<Props> = ({ theme }) => {
  const [project, setProject] = useState<NovelProject>(projectStore.getProject());
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(projectStore.getActiveChapter()?.id || null);

  // Chapter statuses state (saved in localStorage)
  const [chapterStatuses, setChapterStatuses] = useState<Record<string, ChapterStatus>>(() => {
    const saved = localStorage.getItem('novelite_chapter_statuses');
    return saved ? JSON.parse(saved) : {};
  });

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

  const handleSelectChapter = (chapId: string) => {
    projectStore.setActiveChapter(chapId);
    setActiveChapterId(chapId);
  };

  const handleToggleVolume = (vol: Volume) => {
    vol.isExpanded = !vol.isExpanded;
    projectStore.save();
    setProject({ ...projectStore.getProject() });
  };

  const handleAddVolume = () => {
    const title = prompt('新建分卷名称：', `第 ${project.volumes.length + 1} 卷`);
    if (title?.trim()) {
      projectStore.addVolume(title.trim());
    }
  };

  const handleAddChapter = (e: React.MouseEvent, volId: string) => {
    e.stopPropagation();
    const vol = project.volumes.find((v) => v.id === volId);
    const count = (vol?.chapters.length || 0) + 1;
    const title = prompt('新建章节名称：', `第 ${count} 章`);
    if (title?.trim()) {
      projectStore.addChapter(volId, title.trim());
    }
  };

  const handleStartRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleFinishRename = (type: 'vol' | 'chap', id: string) => {
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
    if (confirm('确认删除该分卷及其下所有章节？')) {
      projectStore.deleteVolume(volId);
    }
  };

  const handleDeleteChapter = (e: React.MouseEvent, chapId: string) => {
    e.stopPropagation();
    if (confirm('确认删除该章节？')) {
      projectStore.deleteChapter(chapId);
    }
  };

  const handleMoveChapter = (e: React.MouseEvent, volId: string, chapId: string, dir: 'up' | 'down') => {
    e.stopPropagation();
    projectStore.moveChapter(volId, chapId, dir);
  };

  const handleMoveVolume = (e: React.MouseEvent, volId: string, dir: 'up' | 'down') => {
    e.stopPropagation();
    projectStore.moveVolume(volId, dir);
  };

  const handleExportChapter = (e: React.MouseEvent, chap: Chapter) => {
    e.stopPropagation();
    const clean = (chap.content || '')
      .replace(/^#+\s+.*$/gm, '')
      .split('\n')
      .map((line: string) => (line.trim() ? `　　${line.trim()}` : ''))
      .join('\n');
    const blob = new Blob([`${chap.title}\n\n${clean}\n`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chap.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    eventBus.emit('show-toast', { message: `已导出《${chap.title}》`, type: 'success' });
  };

  const handleCycleStatus = (e: React.MouseEvent, chapId: string) => {
    e.stopPropagation();
    const current = chapterStatuses[chapId] || 'draft';
    const next: ChapterStatus = current === 'draft' ? 'review' : current === 'review' ? 'done' : 'draft';
    const updated = { ...chapterStatuses, [chapId]: next };
    setChapterStatuses(updated);
    localStorage.setItem('novelite_chapter_statuses', JSON.stringify(updated));
    eventBus.emit('show-toast', { message: `已切换状态为：${STATUS_CONFIG[next].label}`, type: 'info' });
  };

  const handleDuplicateChapter = (e: React.MouseEvent, volId: string, chap: Chapter) => {
    e.stopPropagation();
    projectStore.addChapter(volId, `${chap.title} (副本)`);
    eventBus.emit('show-toast', { message: '已克隆新章节', type: 'success' });
  };

  const totalWords = project.volumes.reduce(
    (acc, v) => acc + v.chapters.reduce((cAcc, c) => cAcc + (c.content?.replace(/\s+/g, '').length || 0), 0),
    0
  );

  return (
    <div className="flex h-full flex-col select-none text-xs">
      {/* Novel Header Card (Ulysses / Scrivener Luxury Style) */}
      <div className="p-3 pb-2 space-y-2.5">
        <div
          className="rounded-xl border p-3 shadow-xs space-y-2"
          style={{
            backgroundColor: `${theme.colors.bgHover}50`,
            borderColor: `${theme.colors.border}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center border shadow-xs shrink-0"
                style={{
                  backgroundColor: `${theme.colors.accent}20`,
                  borderColor: `${theme.colors.accent}40`,
                  color: theme.colors.accent,
                }}
              >
                <Book className="h-4 w-4" />
              </div>
              <div className="overflow-hidden">
                <span className="font-bold text-xs truncate block" style={{ color: theme.colors.text }}>
                  {project.title}
                </span>
                <span className="text-[10px] font-mono opacity-50 block">
                  {totalWords.toLocaleString()} 字 · {project.volumes.length} 卷
                </span>
              </div>
            </div>

            <button
              onClick={handleAddVolume}
              title="新建分卷"
              className="p-1.5 rounded-lg border border-white/10 opacity-70 hover:opacity-100 hover:bg-white/10 hover:border-white/20 transition-all hover:scale-105"
              style={{ color: theme.colors.text }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 opacity-40" />
          <input
            type="text"
            placeholder="搜索章节或正文关键字..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full rounded-lg border py-1.5 pl-8 pr-3 text-[11px] outline-none transition-colors"
            style={{
              backgroundColor: theme.colors.bg,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
          />
        </div>
      </div>

      {/* Volumes and Chapters Tree */}
      <div className="flex-1 overflow-y-auto px-2 space-y-2 pb-6">
        {project.volumes.map((vol) => {
          const volWords = vol.chapters.reduce((acc, c) => acc + (c.content?.replace(/\s+/g, '').length || 0), 0);
          const filteredChapters = vol.chapters.filter(
            (c) => !filterQuery || c.title.toLowerCase().includes(filterQuery.toLowerCase()) || (c.content && c.content.includes(filterQuery))
          );

          if (filterQuery && filteredChapters.length === 0) return null;

          return (
            <div
              key={vol.id}
              className="rounded-xl border overflow-hidden transition-all"
              style={{
                backgroundColor: `${theme.colors.bg}60`,
                borderColor: `${theme.colors.border}80`,
              }}
            >
              {/* Volume Header */}
              <div
                onClick={() => handleToggleVolume(vol)}
                className="group flex items-center justify-between px-2.5 py-2 cursor-pointer transition-colors hover:bg-white/5 border-b border-white/5"
              >
                <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                  <span className="opacity-50 group-hover:opacity-100 transition-opacity">
                    {vol.isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </span>

                  {editingId === vol.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleFinishRename('vol', vol.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFinishRename('vol', vol.id)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border px-1 text-xs outline-none bg-black/40 border-cyan-400"
                      style={{ color: theme.colors.text }}
                    />
                  ) : (
                    <span className="font-semibold text-xs truncate" style={{ color: theme.colors.text }}>
                      {vol.title}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono opacity-40 mr-1">
                    {vol.chapters.length} 章 · {volWords > 0 ? `${(volWords / 1000).toFixed(1)}k字` : '0字'}
                  </span>

                  {/* Volume Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleMoveVolume(e, vol.id, 'up')}
                      title="上移分卷"
                      className="p-1 rounded hover:bg-white/15 opacity-70 hover:opacity-100 transition-colors"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => handleMoveVolume(e, vol.id, 'down')}
                      title="下移分卷"
                      className="p-1 rounded hover:bg-white/15 opacity-70 hover:opacity-100 transition-colors"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => handleAddChapter(e, vol.id)}
                      title="新建章节"
                      className="p-1 rounded hover:bg-white/15 opacity-70 hover:opacity-100 transition-colors"
                      style={{ color: theme.colors.accent }}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => handleStartRename(e, vol.id, vol.title)}
                      title="重命名分卷"
                      className="p-1 rounded hover:bg-white/15 opacity-70 hover:opacity-100 transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteVolume(e, vol.id)}
                      title="删除分卷"
                      className="p-1 rounded hover:bg-rose-500/20 hover:text-rose-400 opacity-70 hover:opacity-100 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Chapters List */}
              {vol.isExpanded && (
                <div className="p-1 space-y-0.5">
                  {filteredChapters.length === 0 ? (
                    <div className="py-2.5 text-center text-[10.5px] opacity-40">
                      暂无章节，点击 + 添加
                    </div>
                  ) : (
                    filteredChapters.map((chap) => {
                      const isCur = chap.id === activeChapterId;
                      const charCount = (chap.content || '').replace(/\s+/g, '').length;
                      const status = chapterStatuses[chap.id] || 'draft';
                      const statusCfg = STATUS_CONFIG[status];
                      const StatusIcon = statusCfg.icon;

                      return (
                        <div
                          key={chap.id}
                          onClick={() => handleSelectChapter(chap.id)}
                          className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                            isCur
                              ? 'font-medium shadow-xs ring-1 ring-white/10'
                              : 'hover:bg-white/5 opacity-80 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: isCur ? `${theme.colors.accent}20` : 'transparent',
                            color: isCur ? theme.colors.text : theme.colors.textMuted,
                          }}
                        >
                          {/* Active Indicator Bar */}
                          {isCur && (
                            <div
                              className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full shadow-xs"
                              style={{ backgroundColor: theme.colors.accent }}
                            />
                          )}

                          <div className="flex items-center gap-2 overflow-hidden flex-1 pl-1">
                            <FileText className={`h-3.5 w-3.5 shrink-0 ${isCur ? 'opacity-100' : 'opacity-40'}`} style={{ color: isCur ? theme.colors.accent : 'inherit' }} />

                            {editingId === chap.id ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => handleFinishRename('chap', chap.id)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFinishRename('chap', chap.id)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border px-1 text-xs outline-none bg-black/40 border-cyan-400 flex-1"
                                style={{ color: theme.colors.text }}
                              />
                            ) : (
                              <span className="truncate text-xs" style={{ color: isCur ? theme.colors.text : 'inherit' }}>
                                {chap.title}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Chapter Status Pill */}
                            <button
                              onClick={(e) => handleCycleStatus(e, chap.id)}
                              title={`状态: ${statusCfg.label} (点击切换)`}
                              className={`flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] border font-mono ${statusCfg.color} transition-all hover:scale-105`}
                            >
                              <StatusIcon className="h-2.5 w-2.5" />
                              <span>{statusCfg.label}</span>
                            </button>

                            {/* Word count */}
                            <span className="text-[10px] font-mono opacity-50 group-hover:hidden">
                              {charCount > 0 ? `${charCount}字` : '空'}
                            </span>

                            {/* Chapter Hover Actions */}
                            <div className="hidden group-hover:flex items-center gap-0.5">
                              <button
                                onClick={(e) => handleMoveChapter(e, vol.id, chap.id, 'up')}
                                title="上移章节"
                                className="p-1 rounded hover:bg-white/20 opacity-70 hover:opacity-100 transition-colors"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => handleMoveChapter(e, vol.id, chap.id, 'down')}
                                title="下移章节"
                                className="p-1 rounded hover:bg-white/20 opacity-70 hover:opacity-100 transition-colors"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => handleExportChapter(e, chap)}
                                title="导出单章 TXT"
                                className="p-1 rounded hover:bg-white/20 opacity-70 hover:opacity-100 transition-colors"
                              >
                                <Download className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => handleStartRename(e, chap.id, chap.title)}
                                title="重命名"
                                className="p-1 rounded hover:bg-white/20 opacity-70 hover:opacity-100 transition-colors"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => handleDuplicateChapter(e, vol.id, chap)}
                                title="克隆副本"
                                className="p-1 rounded hover:bg-white/20 opacity-70 hover:opacity-100 transition-colors"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteChapter(e, chap.id)}
                                title="删除章节"
                                className="p-1 rounded hover:bg-rose-500/20 hover:text-rose-400 opacity-70 hover:opacity-100 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
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
    </div>
  );
};
