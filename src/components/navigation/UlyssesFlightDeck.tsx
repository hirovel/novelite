import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Copy,
  Download,
  Hash,
  X,
  Search,
  FileText,
} from 'lucide-react';
import { projectStore, countWordsFast } from '../../core/storage/ProjectStore';
import type { NovelProject, Chapter } from '../../core/storage/types';
import { eventBus } from '../../core/events/EventBus';
import type { Theme } from '../../core/themes/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}

interface ContextMenuState {
  x: number;
  y: number;
  chapId: string;
  volId: string;
  chapTitle: string;
}

export const UlyssesFlightDeck: React.FC<Props> = ({ isOpen, onClose, theme }) => {
  const [project, setProject] = useState<NovelProject>(() => projectStore.getProject());
  const [selectedVolId, setSelectedVolId] = useState<string>(() => {
    return projectStore.getProject().volumes[0]?.id || '';
  });
  const [scratchpadText, setScratchpadText] = useState<string>(() => projectStore.getProject().scratchpad || '');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(() => projectStore.getActiveChapter()?.id || null);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      const proj = projectStore.getProject();
      setProject({ ...proj });
      setScratchpadText(proj.scratchpad || '');
      setActiveChapterId(projectStore.getActiveChapter()?.id || null);
      if (!selectedVolId && proj.volumes[0]) {
        setSelectedVolId(proj.volumes[0].id);
      }
    };

    const handleScratchpadUpdate = (text: string) => {
      setScratchpadText(text);
    };

    const handleScratchpadOpen = () => {
      setSelectedVolId('__scratchpad__');
    };

    const unsubs = [
      eventBus.on('project-tree-changed', handleUpdate),
      eventBus.on('active-chapter-changed', handleUpdate),
      eventBus.on('chapter-content-updated', handleUpdate),
      eventBus.on('scratchpad-updated', handleScratchpadUpdate),
      eventBus.on('scratchpad:open', handleScratchpadOpen),
    ];

    return () => unsubs.forEach((fn) => fn());
  }, [selectedVolId]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

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
    };
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, []);

  if (!isOpen) return null;

  const handleSelectChapter = (chapId: string) => {
    projectStore.setActiveChapter(chapId);
    setActiveChapterId(chapId);
    onClose();
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
    onClose();
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
  const totalWords = projectStore.getTotalWordCount();
  const totalChapters = project.volumes.reduce((acc, v) => acc + v.chapters.length, 0);

  const getFirstSentence = (content = '') => {
    const clean = content.replace(/^#+\s+.*$/gm, '').trim();
    if (!clean) return '暂无正文内容……';
    const firstLine = clean.split('\n')[0].trim();
    return firstLine.slice(0, 42) + (firstLine.length > 42 ? '…' : '');
  };

  const filteredChapters = activeVol?.chapters.filter((c) => {
    return !searchQuery.trim() || c.title.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-[580px] max-w-[92vw] h-[460px] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: `${theme.colors.bgSecondary}F8`,
          borderColor: `${theme.colors.border}60`,
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header with Search and Quick Actions */}
        <div
          className="p-3 px-4 border-b flex items-center justify-between gap-3 shrink-0"
          style={{ borderColor: `${theme.colors.border}30` }}
        >
          <div
            className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-black/20 focus-within:border-cyan-400/50 transition-colors"
            style={{ borderColor: `${theme.colors.border}40` }}
          >
            <Search className="h-3.5 w-3.5 opacity-40 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索全书章节、关键词..."
              className="w-full bg-transparent text-xs outline-none placeholder:opacity-35 font-sans"
              style={{ color: theme.colors.text }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="opacity-40 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                const targetVol = project.volumes.find((v) => v.id === selectedVolId) || project.volumes[0];
                if (targetVol) {
                  if (selectedVolId === '__scratchpad__') {
                    setSelectedVolId(targetVol.id);
                  }
                  setInlineNewChap({ volId: targetVol.id });
                  setNewChapTitle(`第 ${targetVol.chapters.length + 1} 章`);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium opacity-80 hover:opacity-100 hover:bg-white/10 transition-colors cursor-pointer"
              style={{ color: theme.colors.text }}
              title="新建章节"
            >
              <Plus className="h-3.5 w-3.5" style={{ color: theme.colors.accent }} />
              <span>新章</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg opacity-40 hover:opacity-100 hover:bg-white/10 transition-colors cursor-pointer"
              style={{ color: theme.colors.text }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 2. Dual-Column Body: Left Volumes, Right Ulysses Cards / Scratchpad */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Volumes & Scratchpad */}
          <div
            className="w-48 border-r overflow-y-auto p-2 space-y-1 bg-black/10 shrink-0"
            style={{ borderColor: `${theme.colors.border}30` }}
          >
            <div className="px-2 py-1 text-[10px] font-mono opacity-35">全书分卷</div>
            {project.volumes.map((vol) => {
              const isSelected = selectedVolId === vol.id;
              const volWordCount = vol.chapters.reduce(
                (acc, c) => acc + (c.wordCount || countWordsFast(c.content || '')),
                0
              );

              return (
                <div
                  key={vol.id}
                  onClick={() => setSelectedVolId(vol.id)}
                  className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all border ${
                    isSelected
                      ? 'font-semibold shadow-xs'
                      : 'border-transparent opacity-60 hover:opacity-100 hover:bg-white/5'
                  }`}
                  style={{
                    color: isSelected ? (theme.colors.accent || theme.colors.text) : theme.colors.textMuted,
                    backgroundColor: isSelected ? `${theme.colors.accent || '#38bdf8'}18` : undefined,
                    borderColor: isSelected ? `${theme.colors.accent || '#38bdf8'}40` : 'transparent',
                  }}
                >
                  <div className="truncate flex-1 pr-1">
                    <div>{vol.title}</div>
                    <div className="text-[9.5px] font-mono opacity-40 font-normal">
                      {vol.chapters.length} 章 · {volWordCount.toLocaleString()} 字
                    </div>
                  </div>
                </div>
              );
            })}

            {inlineNewVol && (
              <div
                className="p-2 rounded-xl border mb-1"
                style={{
                  backgroundColor: `${theme.colors.accent || '#38bdf8'}15`,
                  borderColor: `${theme.colors.accent || '#38bdf8'}50`,
                }}
              >
                <input
                  ref={newVolInputRef}
                  type="text"
                  value={newVolTitle}
                  onChange={(e) => setNewVolTitle(e.target.value)}
                  placeholder="输入分卷名，敲回车..."
                  onBlur={handleCreateVolumeSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateVolumeSubmit();
                    if (e.key === 'Escape') setInlineNewVol(false);
                  }}
                  className="w-full bg-black/40 rounded px-2 py-0.5 text-xs text-white outline-none border"
                  style={{ borderColor: `${theme.colors.accent || '#38bdf8'}40` }}
                />
              </div>
            )}

            <button
              onClick={() => {
                setInlineNewVol(true);
                setNewVolTitle(`第 ${project.volumes.length + 1} 卷`);
              }}
              className="w-full py-1.5 mt-1 rounded-lg text-xs opacity-40 hover:opacity-100 hover:bg-white/5 text-center transition-all cursor-pointer"
              style={{ color: theme.colors.text }}
            >
              + 新建分卷
            </button>

            {/* 设定与灵感备忘录 */}
            <div className="pt-2.5 mt-2 border-t" style={{ borderColor: `${theme.colors.border}25` }}>
              <div className="px-2 py-1 text-[10px] font-mono opacity-35">设定与随笔</div>
              <div
                onClick={() => setSelectedVolId('__scratchpad__')}
                className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all border ${
                  selectedVolId === '__scratchpad__'
                    ? 'font-semibold shadow-xs'
                    : 'border-transparent opacity-60 hover:opacity-100 hover:bg-white/5'
                }`}
                style={{
                  color: selectedVolId === '__scratchpad__' ? (theme.colors.accent || theme.colors.text) : theme.colors.textMuted,
                  backgroundColor: selectedVolId === '__scratchpad__' ? `${theme.colors.accent || '#38bdf8'}18` : undefined,
                  borderColor: selectedVolId === '__scratchpad__' ? `${theme.colors.accent || '#38bdf8'}40` : 'transparent',
                }}
              >
                <div className="truncate flex-1 pr-1 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: selectedVolId === '__scratchpad__' ? theme.colors.accent : undefined }} />
                  <span>灵感备忘录</span>
                </div>
                <span className="text-[9.5px] font-mono opacity-40 font-normal shrink-0">
                  {scratchpadText.length} 字
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Scratchpad Memo or Ulysses Story Cards */}
          {selectedVolId === '__scratchpad__' ? (
            <div className="flex-1 flex flex-col p-3 overflow-hidden bg-black/5">
              <div className="flex items-center justify-between pb-2 border-b mb-2" style={{ borderColor: `${theme.colors.border}25` }}>
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" style={{ color: theme.colors.accent }} />
                  <span className="text-xs font-semibold" style={{ color: theme.colors.text }}>灵感备忘录 (全书设定与随笔)</span>
                </div>
                <span className="text-[10px] font-mono opacity-40">已自动同步至作品库</span>
              </div>
              <textarea
                value={scratchpadText}
                onChange={(e) => {
                  const val = e.target.value;
                  setScratchpadText(val);
                  projectStore.updateScratchpad(val);
                }}
                placeholder="在此记录本书的核心伏笔、人物关系、世界观设定与灵感随笔..."
                className="flex-1 w-full p-2.5 rounded-xl bg-black/20 text-xs leading-relaxed outline-none resize-none border font-sans"
                style={{
                  color: theme.colors.text,
                  borderColor: `${theme.colors.border}30`,
                }}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-black/5">
              {inlineNewChap && (
                <div
                  className="p-2.5 rounded-xl border space-y-1.5 animate-in fade-in duration-100"
                  style={{
                    backgroundColor: `${theme.colors.accent || '#38bdf8'}15`,
                    borderColor: `${theme.colors.accent || '#38bdf8'}50`,
                  }}
                >
                  <div className="text-xs font-semibold" style={{ color: theme.colors.accent }}>新建章节</div>
                  <input
                    ref={newChapInputRef}
                    type="text"
                    value={newChapTitle}
                    onChange={(e) => setNewChapTitle(e.target.value)}
                    placeholder="输入章节名，按 Enter 确认..."
                    onBlur={handleCreateChapterSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateChapterSubmit();
                      if (e.key === 'Escape') setInlineNewChap(null);
                    }}
                    className="w-full bg-black/40 rounded-lg px-2.5 py-1 text-xs text-white outline-none border"
                    style={{ borderColor: `${theme.colors.accent || '#38bdf8'}40` }}
                  />
                </div>
              )}

              {filteredChapters.length === 0 && !inlineNewChap ? (
                <div className="py-16 text-center text-xs opacity-30 font-mono">该分卷暂无章节</div>
              ) : (
                filteredChapters.map((chap) => {
                  const isCur = chap.id === activeChapterId;
                  const wordCount = chap.wordCount || countWordsFast(chap.content || '');
                  const snippet = getFirstSentence(chap.content);

                  return (
                    <div
                      key={chap.id}
                      onClick={() => handleSelectChapter(chap.id)}
                      onContextMenu={(e) => handleContextMenu(e, chap, activeVol.id)}
                      className={`group p-2.5 px-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isCur
                          ? 'font-medium shadow-md'
                          : 'border-white/5 bg-white/[0.02] opacity-70 hover:opacity-100 hover:bg-white/[0.06]'
                      }`}
                      style={{
                        color: isCur ? (theme.colors.accent || theme.colors.text) : theme.colors.text,
                        backgroundColor: isCur ? `${theme.colors.accent || '#38bdf8'}15` : undefined,
                        borderColor: isCur ? `${theme.colors.accent || '#38bdf8'}50` : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between pb-1">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                          {isCur && (
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{
                                backgroundColor: theme.colors.accent || '#38bdf8',
                                boxShadow: `0 0 8px ${theme.colors.accentGlow || theme.colors.accent || '#38bdf8'}`,
                              }}
                            />
                          )}
                          <span className={`font-semibold text-xs truncate ${isCur ? 'tracking-wide' : ''}`}>
                            {chap.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono opacity-40 shrink-0">{wordCount} 字</span>
                      </div>
                      <p className="text-[10.5px] opacity-45 line-clamp-1 leading-relaxed font-sans select-none">
                        {snippet}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 3. Footer */}
        <div
          className="p-2.5 px-4 border-t flex items-center justify-between text-[10px] font-mono opacity-40 bg-black/10 shrink-0"
          style={{ borderColor: `${theme.colors.border}30` }}
        >
          <span>{totalChapters} 章 · 全书 {totalWords.toLocaleString()} 字</span>
          <span>按 ↑ ↓ 选章 · Enter 打开章节</span>
        </div>

        {/* 4. Context Menu */}
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
            className="fixed inset-0 z-70 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setEditingId(null)}
          >
            <div
              className="w-72 p-3 rounded-xl border bg-black/90 backdrop-blur-2xl space-y-2 border-white/20 shadow-2xl"
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
                className="w-full bg-black/50 rounded px-2.5 py-1 text-xs text-white outline-none border"
                style={{ borderColor: `${theme.colors.accent || '#38bdf8'}80` }}
              />
              <div className="flex justify-end gap-1.5 text-xs">
                <button
                  onClick={() => setEditingId(null)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                >
                  取消
                </button>
                <button
                  onClick={() => handleSaveRename('chap', editingId)}
                  className="px-2.5 py-1 rounded-lg text-white font-medium cursor-pointer"
                  style={{ backgroundColor: theme.colors.accent || '#38bdf8' }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
