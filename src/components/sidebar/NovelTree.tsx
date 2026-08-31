import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Search,
  GripVertical,
  Copy,
  X,
  FileText,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { projectStore, countWordsFast } from '../../core/storage/ProjectStore';
import type { NovelProject, Volume } from '../../core/storage/types';
import { eventBus } from '../../core/events/EventBus';
import type { Theme } from '../../core/themes/types';

interface Props {
  theme: Theme;
}

export const NovelTree: React.FC<Props> = ({ theme }) => {
  const [project, setProject] = useState<NovelProject>(() => projectStore.getProject());
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(() => projectStore.getActiveChapter()?.id || null);

  // Inline creation states
  const [inlineNewVol, setInlineNewVol] = useState<boolean>(false);
  const [newVolTitle, setNewVolTitle] = useState<string>('');
  const [inlineNewChap, setInlineNewChap] = useState<{ volId: string; index?: number } | null>(null);
  const [newChapTitle, setNewChapTitle] = useState<string>('');

  // Drag & drop
  const [draggedChap, setDraggedChap] = useState<{ chapId: string; volId: string } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    type: 'chap' | 'vol';
    id: string;
    volId?: string;
    pos: 'top' | 'bottom' | 'inside';
  } | null>(null);

  const editInputRef = useRef<HTMLInputElement | null>(null);
  const newVolInputRef = useRef<HTMLInputElement | null>(null);
  const newChapInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (inlineNewVol && newVolInputRef.current) {
      newVolInputRef.current.focus();
      newVolInputRef.current.select();
    }
  }, [inlineNewVol]);

  useEffect(() => {
    if (inlineNewChap && newChapInputRef.current) {
      newChapInputRef.current.focus();
      newChapInputRef.current.select();
    }
  }, [inlineNewChap]);

  const handleSelectChapter = (chapId: string) => {
    projectStore.setActiveChapter(chapId);
    setActiveChapterId(chapId);
  };

  const handleToggleVolume = (vol: Volume) => {
    vol.isExpanded = !vol.isExpanded;
    projectStore.save();
    setProject({ ...projectStore.getProject() });
  };

  const handleCreateVolumeSubmit = () => {
    const title = newVolTitle.trim() || `第 ${project.volumes.length + 1} 卷`;
    projectStore.addVolume(title);
    setNewVolTitle('');
    setInlineNewVol(false);
  };

  const handleCreateChapterSubmit = () => {
    if (!inlineNewChap) return;
    const vol = project.volumes.find((v) => v.id === inlineNewChap.volId);
    const count = (vol?.chapters.length || 0) + 1;
    const title = newChapTitle.trim() || `第 ${count} 章`;

    const newChap = projectStore.insertChapter(inlineNewChap.volId, title, inlineNewChap.index);
    setActiveChapterId(newChap.id);
    setNewChapTitle('');
    setInlineNewChap(null);
  };

  const handleStartRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
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

  const handleDeleteVolume = (e: React.MouseEvent, volId: string, title: string) => {
    e.stopPropagation();
    if (project.volumes.length <= 1) {
      eventBus.emit('show-toast', { message: '至少需保留一个分卷', type: 'warning' });
      return;
    }
    projectStore.deleteVolume(volId);
    eventBus.emit('show-toast', { message: `已删除分卷《${title}》`, type: 'info' });
  };

  const handleDeleteChapter = (e: React.MouseEvent, chapId: string, title: string) => {
    e.stopPropagation();
    projectStore.deleteChapter(chapId);
    eventBus.emit('show-toast', { message: `已删除章节《${title}》`, type: 'info' });
  };

  const handleDuplicateChapter = (e: React.MouseEvent, chapId: string) => {
    e.stopPropagation();
    const copy = projectStore.duplicateChapter(chapId);
    if (copy) {
      eventBus.emit('show-toast', { message: `已创建副本《${copy.title}》`, type: 'success' });
    }
  };

  // Drag & drop
  const handleDragStart = (e: React.DragEvent, chapId: string, volId: string) => {
    e.stopPropagation();
    setDraggedChap({ chapId, volId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', chapId);
  };

  const handleDragOver = (e: React.DragEvent, type: 'chap' | 'vol', id: string, volId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedChap) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offset = e.clientY - rect.top;
    const height = rect.height;

    let pos: 'top' | 'bottom' | 'inside' = 'bottom';
    if (type === 'vol') {
      pos = 'inside';
    } else {
      pos = offset < height / 2 ? 'top' : 'bottom';
    }

    setDragOverTarget({ type, id, volId, pos });
  };

  const handleDrop = (e: React.DragEvent, targetType: 'chap' | 'vol', targetId: string, targetVolId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedChap) return;

    const { chapId, volId: sourceVolId } = draggedChap;

    if (targetType === 'vol') {
      projectStore.moveChapterAcrossVolumes(sourceVolId, targetId, chapId);
    } else if (targetType === 'chap' && targetVolId) {
      const targetVol = project.volumes.find((v) => v.id === targetVolId);
      if (targetVol) {
        const targetIdx = targetVol.chapters.findIndex((c) => c.id === targetId);
        if (targetIdx !== -1) {
          const insertIdx = dragOverTarget?.pos === 'top' ? targetIdx : targetIdx + 1;
          if (sourceVolId === targetVolId) {
            const sourceIdx = targetVol.chapters.findIndex((c) => c.id === chapId);
            if (sourceIdx !== -1) {
              const finalIdx = sourceIdx < insertIdx ? insertIdx - 1 : insertIdx;
              projectStore.reorderChapters(sourceVolId, sourceIdx, finalIdx);
            }
          } else {
            projectStore.moveChapterAcrossVolumes(sourceVolId, targetVolId, chapId, insertIdx);
          }
        }
      }
    }

    setDraggedChap(null);
    setDragOverTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedChap(null);
    setDragOverTarget(null);
  };

  return (
    <div className="flex flex-col h-full select-none text-xs">
      {/* 1. Search Bar */}
      <div className="p-3 border-b border-white/5 space-y-2 bg-black/20 shrink-0">
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border bg-black/25 focus-within:border-white/20 transition-colors"
          style={{ borderColor: `${theme.colors.border}60` }}
        >
          <Search className="h-3.5 w-3.5 opacity-40 shrink-0" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="搜索章节或分卷..."
            className="w-full bg-transparent text-xs outline-none placeholder:opacity-40 font-mono"
            style={{ color: theme.colors.text }}
          />
          {filterQuery && (
            <button onClick={() => setFilterQuery('')} className="opacity-40 hover:opacity-100 text-xs">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Scrollable Tree List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {project.volumes.map((vol) => {
          const volWordCount = vol.chapters.reduce(
            (acc, c) => acc + (c.wordCount || countWordsFast(c.content || '')),
            0
          );

          const visibleChapters = vol.chapters.filter((chap) => {
            return (
              !filterQuery.trim() ||
              chap.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
              vol.title.toLowerCase().includes(filterQuery.toLowerCase())
            );
          });

          if (filterQuery && visibleChapters.length === 0) return null;

          const isDropInsideVol = dragOverTarget?.type === 'vol' && dragOverTarget.id === vol.id;

          return (
            <div
              key={vol.id}
              onDragOver={(e) => handleDragOver(e, 'vol', vol.id)}
              onDrop={(e) => handleDrop(e, 'vol', vol.id)}
              className={`rounded-xl transition-all ${isDropInsideVol ? 'bg-white/5' : ''}`}
            >
              {/* Volume Header */}
              <div
                onClick={() => handleToggleVolume(vol)}
                className="group flex items-center justify-between px-2.5 py-2 cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                  <span className="opacity-60 group-hover:opacity-100 transition-opacity">
                    {vol.isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </span>

                  <span className="opacity-50 group-hover:opacity-80">
                    {vol.isExpanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
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
                      className="bg-black/50 border border-cyan-400 rounded-lg px-2 py-0.5 text-xs font-semibold outline-none w-full"
                      style={{ color: theme.colors.text }}
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => handleStartRename(e, vol.id, vol.title)}
                      className="font-semibold text-xs truncate"
                      style={{ color: theme.colors.text }}
                    >
                      {vol.title}
                    </span>
                  )}

                  <span className="text-[10px] font-mono opacity-40 shrink-0">
                    ({vol.chapters.length} · {volWordCount.toLocaleString()}字)
                  </span>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInlineNewChap({ volId: vol.id });
                    }}
                    title="新建章节"
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
                      onClick={(e) => handleDeleteVolume(e, vol.id, vol.title)}
                      title="删除分卷"
                      className="p-1 hover:text-red-400 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Chapters */}
              {vol.isExpanded && (
                <div className="pl-4 space-y-0.5 mt-0.5 border-l border-white/[0.04] ml-2">
                  {visibleChapters.map((chap) => {
                    const isCur = chap.id === activeChapterId;
                    const wordCount = chap.wordCount || countWordsFast(chap.content || '');

                    const isDragTarget = dragOverTarget?.type === 'chap' && dragOverTarget.id === chap.id;
                    const isDropTop = isDragTarget && dragOverTarget?.pos === 'top';
                    const isDropBottom = isDragTarget && dragOverTarget?.pos === 'bottom';

                    return (
                      <div key={chap.id} className="relative">
                        {isDropTop && (
                          <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-cyan-400 z-10 rounded-full" />
                        )}

                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, chap.id, vol.id)}
                          onDragOver={(e) => handleDragOver(e, 'chap', chap.id, vol.id)}
                          onDrop={(e) => handleDrop(e, 'chap', chap.id, vol.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleSelectChapter(chap.id)}
                          className={`group relative flex items-center justify-between rounded-lg px-2 py-1.2 text-xs cursor-pointer transition-all ${
                            isCur
                              ? 'bg-white/[0.08] font-medium'
                              : 'opacity-70 hover:opacity-100 hover:bg-white/[0.04]'
                          } ${draggedChap?.chapId === chap.id ? 'opacity-30' : ''}`}
                          style={{
                            color: isCur ? theme.colors.text : theme.colors.textMuted,
                          }}
                        >
                          {isCur && (
                            <span
                              className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                              style={{ backgroundColor: theme.colors.accent || '#38bdf8' }}
                            />
                          )}

                          <div className="flex items-center gap-1.5 overflow-hidden pl-1 flex-1">
                            <span className="opacity-0 group-hover:opacity-40 hover:opacity-100 cursor-grab shrink-0">
                              <GripVertical className="h-3 w-3" />
                            </span>

                            <FileText className="h-3.5 w-3.5 opacity-40 shrink-0" />

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
                                className="bg-black/50 border border-cyan-400 rounded px-1.5 py-0.5 text-xs outline-none w-full font-medium"
                                style={{ color: theme.colors.text }}
                              />
                            ) : (
                              <span
                                onDoubleClick={(e) => handleStartRename(e, chap.id, chap.title)}
                                className="truncate"
                                style={{ color: isCur ? theme.colors.text : 'inherit' }}
                              >
                                {chap.title}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <span className="text-[10px] font-mono opacity-40 group-hover:opacity-0 transition-opacity">
                              {wordCount.toLocaleString()} 字
                            </span>

                            <div className="hidden group-hover:flex items-center gap-0.5">
                              <button
                                onClick={(e) => handleStartRename(e, chap.id, chap.title)}
                                title="重命名"
                                className="p-1 opacity-50 hover:opacity-100 hover:bg-white/10 rounded"
                              >
                                <Edit3 className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={(e) => handleDuplicateChapter(e, chap.id)}
                                title="创建副本"
                                className="p-1 opacity-50 hover:opacity-100 hover:bg-white/10 rounded"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteChapter(e, chap.id, chap.title)}
                                title="删除章节"
                                className="p-1 opacity-50 hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 rounded"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {isDropBottom && (
                          <div className="absolute -bottom-0.5 left-2 right-2 h-0.5 bg-cyan-400 z-10 rounded-full" />
                        )}
                      </div>
                    );
                  })}

                  {/* Inline New Chapter */}
                  {inlineNewChap && inlineNewChap.volId === vol.id && (
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg border border-white/20 bg-white/[0.04] animate-in fade-in duration-150">
                      <Plus className="h-3.5 w-3.5 opacity-40 shrink-0 ml-1" />
                      <input
                        ref={newChapInputRef}
                        type="text"
                        value={newChapTitle}
                        onChange={(e) => setNewChapTitle(e.target.value)}
                        placeholder="输入新章节名，按 Enter 确认..."
                        onBlur={handleCreateChapterSubmit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateChapterSubmit();
                          if (e.key === 'Escape') setInlineNewChap(null);
                        }}
                        className="w-full bg-transparent text-xs outline-none font-medium placeholder:opacity-30"
                        style={{ color: theme.colors.text }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Inline New Volume */}
        {inlineNewVol && (
          <div className="p-2.5 rounded-xl border border-white/20 bg-white/[0.04] animate-in fade-in duration-150">
            <input
              ref={newVolInputRef}
              type="text"
              value={newVolTitle}
              onChange={(e) => setNewVolTitle(e.target.value)}
              placeholder="输入新分卷名称，按 Enter 确认..."
              onBlur={handleCreateVolumeSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateVolumeSubmit();
                if (e.key === 'Escape') setInlineNewVol(false);
              }}
              className="w-full bg-transparent text-xs font-semibold outline-none placeholder:opacity-30"
              style={{ color: theme.colors.text }}
            />
          </div>
        )}
      </div>

      {/* 3. Bottom Actions */}
      <div className="p-2.5 border-t border-white/5 bg-black/10 flex items-center justify-between shrink-0">
        <button
          onClick={() => {
            setInlineNewVol(true);
            setNewVolTitle(`第 ${project.volumes.length + 1} 卷`);
          }}
          className="px-2.5 py-1 rounded-lg text-xs opacity-60 hover:opacity-100 hover:bg-white/5 transition-all cursor-pointer"
          style={{ color: theme.colors.text }}
        >
          + 新建分卷
        </button>
      </div>
    </div>
  );
};
