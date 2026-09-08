import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Search,
  X,
  GripVertical,
  Copy,
  Download,
  ArrowUpToLine,
  ArrowDownToLine,
  MoreVertical,
  Hash,
  FileText,
  Folder,
  FolderOpen,
  Palette,
  History,
  PanelLeftClose,
  Check,
} from 'lucide-react';
import { projectStore, countWordsFast } from '../../core/storage/ProjectStore';
import type { NovelProject, Volume, Chapter } from '../../core/storage/types';
import { THEMES } from '../../core/themes/themeDefinitions';
import { eventBus } from '../../core/events/EventBus';
import type { Theme } from '../../core/themes/types';
import { VersionHistoryModal } from './VersionHistoryModal';
import { useI18n } from '../../core/i18n';

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

export const AestheticStudioTree: React.FC<Props> = ({ isOpen, onToggle, theme }) => {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [project, setProject] = useState<NovelProject>(() => projectStore.getProject());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(() => projectStore.getActiveChapter()?.id || null);

  // Theme dropdown popup
  const [showThemePicker, setShowThemePicker] = useState<boolean>(false);
  const themePickerRef = useRef<HTMLDivElement | null>(null);
  const themeList = useMemo(() => {
    return Object.values(THEMES).map((t) => ({
      id: t.id,
      name: t.name,
      nameZh: t.nameZh,
      dot: t.colors.accent || t.colors.cursor,
      isDark: t.isDark,
    }));
  }, []);

  useEffect(() => {
    if (!showThemePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target as Node)) {
        setShowThemePicker(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThemePicker]);

  // Inline creation states
  const [inlineNewVol, setInlineNewVol] = useState<boolean>(false);
  const [newVolTitle, setNewVolTitle] = useState<string>('');
  const [inlineNewChap, setInlineNewChap] = useState<{ volId: string; index?: number } | null>(null);
  const [newChapTitle, setNewChapTitle] = useState<string>('');

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  // Drag & Drop State
  const [draggedChap, setDraggedChap] = useState<{ chapId: string; volId: string } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    type: 'chap' | 'vol';
    id: string;
    volId?: string;
    pos: 'top' | 'bottom' | 'inside';
  } | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Version History Modal State
  const [historyModalTarget, setHistoryModalTarget] = useState<{ chapId: string; chapTitle: string } | null>(null);

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

  useEffect(() => {
    const handleDocClick = () => {
      setContextMenu(null);
      setShowThemePicker(false);
    };
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, []);

  const handleSelectChapter = (chapId: string) => {
    // 🌟 Never close the sidebar on chapter click!
    projectStore.setActiveChapter(chapId);
    setActiveChapterId(chapId);
  };

  const handleToggleVolume = (vol: Volume) => {
    vol.isExpanded = !vol.isExpanded;
    projectStore.save();
    setProject({ ...projectStore.getProject() });
  };

  const handleSwitchGlobalTheme = (newThemeId: string) => {
    setShowThemePicker(false);
    eventBus.emit('theme-changed', newThemeId);
  };

  const handleAutoNumber = () => {
    const count = projectStore.autoNumberChapters();
    eventBus.emit('show-toast', {
      message: isEn ? `Renumbered ${count} chapters` : `已规范全书 ${count} 章节序号`,
      type: 'success',
    });
  };

  // Inline New Volume Submit
  const handleCreateVolumeSubmit = () => {
    const defaultTitle = isEn ? `Volume ${project.volumes.length + 1}` : `第 ${project.volumes.length + 1} 卷`;
    const title = newVolTitle.trim() || defaultTitle;
    projectStore.addVolume(title);
    setNewVolTitle('');
    setInlineNewVol(false);
  };

  // Inline New Chapter Submit
  const handleCreateChapterSubmit = () => {
    if (!inlineNewChap) return;
    const vol = project.volumes.find((v) => v.id === inlineNewChap.volId);
    const count = (vol?.chapters.length || 0) + 1;
    const defaultTitle = isEn ? `Chapter ${count}` : `第 ${count} 章`;
    const title = newChapTitle.trim() || defaultTitle;

    const newChap = projectStore.insertChapter(inlineNewChap.volId, title, inlineNewChap.index);
    setActiveChapterId(newChap.id);
    setNewChapTitle('');
    setInlineNewChap(null);
  };

  // Inline Rename
  const handleStartRename = (e: React.MouseEvent | React.KeyboardEvent, id: string, curTitle: string) => {
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

  // Duplicate Chapter
  const handleDuplicateChapter = (chapId: string) => {
    setContextMenu(null);
    const copy = projectStore.duplicateChapter(chapId);
    if (copy) {
      eventBus.emit('show-toast', {
        message: isEn ? `Created copy "${copy.title}"` : `已创建副本《${copy.title}》`,
        type: 'success',
      });
    }
  };

  // Delete Chapter
  const handleDeleteChapter = (e: React.MouseEvent | React.KeyboardEvent, chapId: string, chapTitle: string) => {
    e.stopPropagation();
    setContextMenu(null);
    projectStore.deleteChapter(chapId);
    eventBus.emit('show-toast', {
      message: isEn ? `Deleted "${chapTitle}"` : `已删除《${chapTitle}》`,
      type: 'info',
    });
  };

  // Delete Volume
  const handleDeleteVolume = (e: React.MouseEvent, volId: string, volTitle: string) => {
    e.stopPropagation();
    if (project.volumes.length <= 1) {
      eventBus.emit('show-toast', {
        message: isEn ? 'At least one volume must be kept' : '至少需保留一个分卷',
        type: 'warning',
      });
      return;
    }
    projectStore.deleteVolume(volId);
    eventBus.emit('show-toast', {
      message: isEn ? `Deleted volume "${volTitle}"` : `已删除分卷《${volTitle}》`,
      type: 'info',
    });
  };

  // Export Chapter (TXT / MD)
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
    eventBus.emit('show-toast', {
      message: isEn ? `Exported "${chap.title}.${format}"` : `已导出《${chap.title}.${format}》`,
      type: 'success',
    });
  };

  // Drag and Drop Handlers
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

  const totalWords = projectStore.getTotalWordCount();
  const totalChapters = project.volumes.reduce((acc, v) => acc + v.chapters.length, 0);

  if (!isOpen) return null;

  return (
    <>
      {/* 🌟 Integrated Seamless Studio Tree Pane */}
      <aside
        className="w-68 sm:w-76 h-full flex flex-col shrink-0 border-r select-none relative z-20 transition-all duration-200 ease-out"
        style={{
          backgroundColor: theme.colors.bgSecondary || '#13141c',
          borderColor: `${theme.colors.border}40`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          setContextMenu(null);
        }}
      >
        {/* 1. Header: Book Title & Clean Actions */}
        <div
          className="pt-3 px-3.5 pb-2.5 flex items-center justify-between border-b"
          style={{ borderColor: `${theme.colors.border}30` }}
        >
          <div className="flex items-center gap-1.5 overflow-hidden flex-1 mr-1">
            <h3 className="font-semibold text-xs truncate tracking-wide" style={{ color: theme.colors.text }}>
              {project.title || (isEn ? 'Novel Manuscript Outline' : '长篇小说大纲')}
            </h3>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {/* Quick Add Chapter */}
            {project.volumes[0] && (
              <button
                onClick={() => {
                  const targetVol = project.volumes[0];
                  setProject((prev) => ({
                    ...prev,
                    volumes: prev.volumes.map((v, idx) => (idx === 0 ? { ...v, isExpanded: true } : v)),
                  }));
                  setInlineNewChap({ volId: targetVol.id });
                  setNewChapTitle(isEn ? `Chapter ${(targetVol.chapters.length || 0) + 1}` : `第 ${(targetVol.chapters.length || 0) + 1} 章`);
                }}
                className="p-1 rounded-md opacity-50 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
                title={isEn ? "New Chapter (Ctrl+N)" : "新建章节 (Ctrl+N)"}
                style={{ color: theme.colors.text }}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Global Theme Switcher Popover */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowThemePicker(!showThemePicker);
                }}
                className="p-1 rounded-md opacity-50 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
                title={isEn ? "Switch Global Theme" : "切换全局主题风格"}
                style={{ color: theme.colors.text }}
              >
                <Palette className="h-3.5 w-3.5" />
              </button>

              {showThemePicker && (
                <div
                  ref={themePickerRef}
                  className="absolute right-0 top-7 z-60 w-60 max-h-[360px] overflow-y-auto rounded-xl border p-1 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100 custom-scrollbar"
                  style={{
                    backgroundColor: `${theme.colors.bgSecondary}FD`,
                    borderColor: `${theme.colors.border}80`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1 text-[9.5px] opacity-40 font-mono border-b border-white/5">
                    <span>{isEn ? "Global Visual Themes" : "全局视觉风格"}</span>
                  </div>
                  <div className="py-0.5 space-y-0.5">
                    {themeList.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSwitchGlobalTheme(t.id)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                          theme.id === t.id ? 'bg-white/10 font-semibold' : 'hover:bg-white/5 opacity-70 hover:opacity-100'
                        }`}
                        style={{ color: theme.colors.text }}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: t.dot }} />
                          <span className="font-medium text-xs shrink-0">{isEn ? t.name : t.nameZh}</span>
                          <span className="text-[10px] opacity-40 font-mono truncate">({isEn ? (t.isDark ? 'Dark' : 'Light') : t.name})</span>
                        </div>
                        {theme.id === t.id && (
                          <Check className="h-3 w-3 shrink-0" style={{ color: theme.colors.accent || '#38bdf8' }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Collapse Sidebar Button */}
            <button
              onClick={onToggle}
              className="p-1 rounded-md opacity-40 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
              style={{ color: theme.colors.text }}
              title={isEn ? "Collapse Sidebar (Ctrl+B)" : "收起侧栏 (Ctrl+B)"}
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Fast Search Bar */}
        <div className="px-3 py-2 border-b shrink-0" style={{ borderColor: `${theme.colors.border}20` }}>
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-colors"
            style={{ backgroundColor: theme.colors.bg, borderColor: `${theme.colors.border}60` }}
          >
            <Search className="h-3 w-3 opacity-35 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? "Search chapters..." : "搜索章节..."}
              className="w-full bg-transparent text-xs outline-none placeholder:opacity-30 font-sans"
              style={{ color: theme.colors.text }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="opacity-40 hover:opacity-100 text-xs">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* 3. 📜 Pure Clean Directory Tree (Folders & Files) */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {project.volumes.map((vol) => {
            const volWordCount = vol.chapters.reduce(
              (acc, c) => acc + (c.wordCount || countWordsFast(c.content || '')),
              0
            );

            const visibleChapters = vol.chapters.filter((chap) => {
              return (
                !searchQuery.trim() ||
                chap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                vol.title.toLowerCase().includes(searchQuery.toLowerCase())
              );
            });

            if (searchQuery && visibleChapters.length === 0) return null;

            const isDropInsideVol = dragOverTarget?.type === 'vol' && dragOverTarget.id === vol.id;

            return (
              <div
                key={vol.id}
                onDragOver={(e) => handleDragOver(e, 'vol', vol.id)}
                onDrop={(e) => handleDrop(e, 'vol', vol.id)}
                className={`rounded-xl transition-all ${isDropInsideVol ? 'bg-white/5' : ''}`}
              >
                {/* Volume Row */}
                <div
                  onClick={() => handleToggleVolume(vol)}
                  className="group flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-white/[0.04] rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                    <span className="opacity-40 group-hover:opacity-80 transition-opacity">
                      {vol.isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
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
                        className="border rounded px-1.5 py-0.2 text-xs font-medium outline-none w-full"
                        style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.accent, color: theme.colors.text }}
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => handleStartRename(e, vol.id, vol.title)}
                        className="font-medium text-xs truncate"
                        style={{ color: theme.colors.text }}
                      >
                        {vol.title}
                      </span>
                    )}

                    <span className="text-[9.5px] font-mono opacity-30 shrink-0">
                      ({vol.chapters.length} · {volWordCount.toLocaleString()} {isEn ? 'words' : '字'})
                    </span>
                  </div>

                  {/* Volume Hover Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInlineNewChap({ volId: vol.id });
                      }}
                      title={isEn ? "Add Chapter to this Volume" : "在此卷新建章节"}
                      className="p-1 opacity-50 hover:opacity-100 hover:bg-white/10 rounded"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => handleStartRename(e, vol.id, vol.title)}
                      title={isEn ? "Rename (F2)" : "重命名 (F2)"}
                      className="p-1 opacity-50 hover:opacity-100 hover:bg-white/10 rounded"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    {project.volumes.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteVolume(e, vol.id, vol.title)}
                        title={isEn ? "Delete Volume" : "删除分卷"}
                        className="p-1 opacity-50 hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chapter List inside Folder */}
                {vol.isExpanded && (
                  <div className="pl-4 space-y-0.5 mt-0.5 border-l border-white/[0.04] ml-2">
                    {visibleChapters.length === 0 && !inlineNewChap && (
                      <div className="py-2 text-center text-[9.5px] opacity-30 font-mono">
                        {isEn ? 'Empty volume' : '空分卷'}
                      </div>
                    )}

                    {visibleChapters.map((chap) => {
                      const isCur = chap.id === activeChapterId;
                      const wordCount = chap.wordCount || countWordsFast(chap.content || '');

                      const isDragTarget = dragOverTarget?.type === 'chap' && dragOverTarget.id === chap.id;
                      const isDropTop = isDragTarget && dragOverTarget?.pos === 'top';
                      const isDropBottom = isDragTarget && dragOverTarget?.pos === 'bottom';

                      return (
                        <div key={chap.id} className="relative">
                          {isDropTop && (
                            <div className="absolute -top-0.5 left-2 right-2 h-0.5 z-10 rounded-full" style={{ backgroundColor: theme.colors.accent || '#38bdf8' }} />
                          )}

                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, chap.id, vol.id)}
                            onDragOver={(e) => handleDragOver(e, 'chap', chap.id, vol.id)}
                            onDrop={(e) => handleDrop(e, 'chap', chap.id, vol.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleSelectChapter(chap.id)}
                            onContextMenu={(e) => handleContextMenu(e, chap, vol.id)}
                            className={`group relative flex items-center justify-between rounded-lg px-2 py-1 text-xs cursor-pointer transition-all ${
                              isCur
                                ? 'bg-white/[0.08] font-medium'
                                : 'opacity-70 hover:opacity-100 hover:bg-white/[0.04]'
                            } ${draggedChap?.chapId === chap.id ? 'opacity-25' : ''}`}
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
                              <span className="opacity-0 group-hover:opacity-30 hover:opacity-80 cursor-grab shrink-0">
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
                                  className="border rounded px-1 py-0.2 text-xs outline-none w-full"
                                  style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.accent, color: theme.colors.text }}
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

                            {/* Word Count & Action Capsule */}
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              <span className="text-[9.5px] font-mono opacity-30 group-hover:opacity-0 transition-opacity">
                                {wordCount.toLocaleString()} {isEn ? 'words' : '字'}
                              </span>

                              {/* Hover Quick Actions */}
                              <div className="hidden group-hover:flex items-center gap-0.5">
                                <button
                                  onClick={(e) => handleStartRename(e, chap.id, chap.title)}
                                  title={isEn ? "Rename (F2)" : "重命名 (F2)"}
                                  className="p-1 opacity-50 hover:opacity-100 hover:bg-white/10 rounded"
                                >
                                  <Edit3 className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateChapter(chap.id);
                                  }}
                                  title={isEn ? "Duplicate" : "创建副本"}
                                  className="p-1 opacity-50 hover:opacity-100 hover:bg-white/10 rounded"
                                >
                                  <Copy className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  onClick={(e) => handleContextMenu(e, chap, vol.id)}
                                  title={isEn ? "More Options" : "更多操作"}
                                  className="p-1 opacity-50 hover:opacity-100 hover:bg-white/10 rounded"
                                >
                                  <MoreVertical className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {isDropBottom && (
                            <div className="absolute -bottom-0.5 left-2 right-2 h-0.5 z-10 rounded-full" style={{ backgroundColor: theme.colors.accent || '#38bdf8' }} />
                          )}
                        </div>
                      );
                    })}

                    {/* Inline New Chapter Input */}
                    {inlineNewChap && inlineNewChap.volId === vol.id && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/20 bg-white/[0.04] animate-in fade-in duration-100">
                        <Plus className="h-3 w-3 opacity-40 shrink-0" />
                        <input
                          ref={newChapInputRef}
                          type="text"
                          value={newChapTitle}
                          onChange={(e) => setNewChapTitle(e.target.value)}
                          placeholder={isEn ? "Enter chapter title, press Enter..." : "输入章节名，敲回车..."}
                          onBlur={handleCreateChapterSubmit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateChapterSubmit();
                            if (e.key === 'Escape') setInlineNewChap(null);
                          }}
                          className="w-full bg-transparent text-xs outline-none placeholder:opacity-30"
                          style={{ color: theme.colors.text }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Inline New Volume Input */}
          {inlineNewVol && (
            <div className="p-2 rounded-xl border border-white/20 bg-white/[0.04] animate-in fade-in duration-100">
              <input
                ref={newVolInputRef}
                type="text"
                value={newVolTitle}
                onChange={(e) => setNewVolTitle(e.target.value)}
                placeholder={isEn ? "Enter volume title, press Enter..." : "输入分卷名，敲回车..."}
                onBlur={handleCreateVolumeSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateVolumeSubmit();
                  if (e.key === 'Escape') setInlineNewVol(false);
                }}
                className="w-full bg-transparent text-xs font-medium outline-none placeholder:opacity-30"
                style={{ color: theme.colors.text }}
              />
            </div>
          )}
        </div>

        {/* 4. Footer: Status & New Volume Button */}
        <div
          className="flex items-center justify-between border-t px-3.5 py-2.5 shrink-0"
          style={{ backgroundColor: theme.colors.bgSecondary, borderColor: `${theme.colors.border}30`, color: theme.colors.textMuted }}
        >
          <span className="text-[10px] font-mono opacity-40">
            {project.volumes.length} {isEn ? 'Vols' : '卷'} · {totalChapters} {isEn ? 'Chs' : '章'} · {totalWords.toLocaleString()} {isEn ? 'words' : '字'}
          </span>

          <button
            onClick={() => {
              setInlineNewVol(true);
              setNewVolTitle(isEn ? `Volume ${project.volumes.length + 1}` : `第 ${project.volumes.length + 1} 卷`);
            }}
            className="px-2 py-0.5 rounded-lg text-xs opacity-60 hover:opacity-100 hover:bg-white/5 transition-all cursor-pointer"
            style={{ color: theme.colors.text }}
          >
            + {isEn ? 'New Volume' : '新建分卷'}
          </button>
        </div>

        {/* 5. Minimalist Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-60 w-44 rounded-xl border shadow-2xl backdrop-blur-2xl p-1 text-xs animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 320),
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
              <span>{isEn ? 'Rename (F2)' : '重命名 (F2)'}</span>
            </button>

            <button
              onClick={() => handleDuplicateChapter(contextMenu.chapId)}
              className="w-full flex items-center gap-2 px-2 py-1.2 rounded-md hover:bg-white/5 transition-colors text-left"
              style={{ color: theme.colors.text }}
            >
              <Copy className="h-3 w-3 opacity-50" />
              <span>{isEn ? 'Duplicate' : '创建副本'}</span>
            </button>

            <button
              onClick={() => {
                setHistoryModalTarget({ chapId: contextMenu.chapId, chapTitle: contextMenu.chapTitle });
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.2 rounded-md hover:bg-white/5 transition-colors text-left"
              style={{ color: theme.colors.text }}
            >
              <History className="h-3 w-3 opacity-50" />
              <span>{isEn ? 'Version Snapshots' : '历史版本快照'}</span>
            </button>

            <button
              onClick={() => {
                const vol = project.volumes.find((v) => v.id === contextMenu.volId);
                const idx = vol?.chapters.findIndex((c) => c.id === contextMenu.chapId) ?? 0;
                setContextMenu(null);
                setInlineNewChap({ volId: contextMenu.volId, index: idx });
                setNewChapTitle('');
              }}
              className="w-full flex items-center gap-2 px-2 py-1.2 rounded-md hover:bg-white/5 transition-colors text-left"
              style={{ color: theme.colors.text }}
            >
              <ArrowUpToLine className="h-3 w-3 opacity-50" />
              <span>{isEn ? 'Insert Above' : '在上方插入'}</span>
            </button>

            <button
              onClick={() => {
                const vol = project.volumes.find((v) => v.id === contextMenu.volId);
                const idx = (vol?.chapters.findIndex((c) => c.id === contextMenu.chapId) ?? 0) + 1;
                setContextMenu(null);
                setInlineNewChap({ volId: contextMenu.volId, index: idx });
                setNewChapTitle('');
              }}
              className="w-full flex items-center gap-2 px-2 py-1.2 rounded-md hover:bg-white/5 transition-colors text-left"
              style={{ color: theme.colors.text }}
            >
              <ArrowDownToLine className="h-3 w-3 opacity-50" />
              <span>{isEn ? 'Insert Below' : '在下方插入'}</span>
            </button>

            <button
              onClick={handleAutoNumber}
              className="w-full flex items-center gap-2 px-2 py-1.2 rounded-md hover:bg-white/5 transition-colors text-left"
              style={{ color: theme.colors.text }}
            >
              <Hash className="h-3 w-3 opacity-50" />
              <span>{isEn ? 'Renumber Chapters' : '全书规范重编号'}</span>
            </button>

            {/* Export & Delete */}
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
                <span>{isEn ? 'Export to TXT' : '导出 TXT'}</span>
              </button>

              <button
                onClick={(e) => handleDeleteChapter(e, contextMenu.chapId, contextMenu.chapTitle)}
                className="w-full flex items-center gap-2 px-2 py-1.2 rounded-md text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
              >
                <Trash2 className="h-3 w-3" />
                <span>{isEn ? 'Delete Chapter' : '删除章节'}</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ⏳ Version History Modal */}
      {historyModalTarget && (
        <VersionHistoryModal
          isOpen={Boolean(historyModalTarget)}
          onClose={() => setHistoryModalTarget(null)}
          chapterId={historyModalTarget.chapId}
          chapterTitle={historyModalTarget.chapTitle}
          theme={theme}
        />
      )}
    </>
  );
};
