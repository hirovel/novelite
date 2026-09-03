import React, { useState } from 'react';
import {
  Library,
  Plus,
  Trash2,
  Edit3,
  X,
  BookOpen,
  FolderOpen,
  Download,
} from 'lucide-react';
import { projectStore } from '../../core/storage/ProjectStore';
import { fileSystemStore } from '../../core/storage/FileSystemStore';
import { eventBus } from '../../core/events/EventBus';
import type { Theme } from '../../core/themes/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}

export const BookshelfModal: React.FC<Props> = ({ isOpen, onClose, theme }) => {
  const currentProject = projectStore.getProject();
  const library = projectStore.getLibrary();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const proj = projectStore.createProject(newTitle.trim(), '');
    eventBus.emit('show-toast', { message: `已创建并开启新书《${proj.title}》`, type: 'success' });
    setIsCreating(false);
    setNewTitle('');
    onClose();
  };

  const handleOpenLocalDirectory = async () => {
    const proj = await fileSystemStore.openLocalDirectory();
    if (proj) {
      onClose();
    }
  };

  const handleExportToLocalDirectory = async () => {
    await fileSystemStore.exportToLocalDirectory(currentProject);
  };

  const handleSwitchBook = (id: string) => {
    if (id === currentProject.id) {
      onClose();
      return;
    }
    projectStore.switchProject(id);
    const proj = projectStore.getProject();
    eventBus.emit('show-toast', { message: `已切换至《${proj.title}》`, type: 'success' });
    onClose();
  };

  const handleDeleteBook = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (library.length <= 1) {
      eventBus.emit('show-toast', { message: '书架中至少需保留一部作品', type: 'warning' });
      return;
    }
    const ok = projectStore.deleteProject(id);
    if (ok) {
      eventBus.emit('show-toast', { message: `已从书架移除《${title}》`, type: 'info' });
    }
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      projectStore.renameProject(id, editTitle.trim());
      eventBus.emit('show-toast', { message: '书名修改成功', type: 'success' });
    }
    setEditingId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-[620px] max-w-[94vw] max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: `${theme.colors.bgSecondary}FE`,
          borderColor: `${theme.colors.border}60`,
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-3.5 px-5 border-b flex items-center justify-between bg-black/10 shrink-0"
          style={{ borderColor: `${theme.colors.border}30` }}
        >
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 opacity-50 text-white" />
            <div>
              <h3 className="font-semibold text-xs tracking-wide" style={{ color: theme.colors.text }}>
                作品书架 · 创作库
              </h3>
              <p className="text-[10px] opacity-40 font-mono">共 {library.length} 部小说</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Open Local Directory */}
            <button
              onClick={handleOpenLocalDirectory}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs opacity-70 hover:opacity-100 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
              title="载入电脑上的小说文件夹 (自动识别卷与章节)"
              style={{ color: theme.colors.text }}
            >
              <FolderOpen className="h-3.5 w-3.5 opacity-60" />
              <span>打开本地目录</span>
            </button>

            {/* Create New Book */}
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white/90 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 opacity-70" />
              <span>新建作品</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-md opacity-40 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer ml-1"
              style={{ color: theme.colors.text }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Inline Create Form */}
        {isCreating && (
          <form
            onSubmit={handleCreateSubmit}
            className="p-4 border-b border-white/[0.06] bg-white/[0.02] space-y-3 shrink-0"
          >
            <div className="text-xs font-medium opacity-80 flex items-center justify-between">
              <span>新建小说作品</span>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-[10px] opacity-40 hover:opacity-100"
              >
                取消
              </button>
            </div>

            <div>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="输入小说书名，例如：《剑起遮天》..."
                autoFocus
                className="w-full bg-black/30 border border-white/15 focus:border-white/40 rounded-lg px-3 py-1.5 text-xs outline-none transition-colors"
                style={{ color: theme.colors.text }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-3 py-1 rounded-lg text-xs font-medium bg-white/15 hover:bg-white/25 text-white cursor-pointer shadow-xs transition-colors"
              >
                创建并进入写作
              </button>
            </div>
          </form>
        )}

        {/* Books Grid List */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {library.map((book) => {
            const isCur = book.id === currentProject.id;
            const updatedStr = new Date(book.updatedAt).toLocaleDateString([], {
              month: '2-digit',
              day: '2-digit',
            });

            return (
              <div
                key={book.id}
                onClick={() => handleSwitchBook(book.id)}
                className={`group p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                  isCur
                    ? 'bg-white/[0.06] border-white/20 shadow-xs'
                    : 'bg-white/[0.02] border-white/[0.06] opacity-70 hover:opacity-100 hover:bg-white/[0.05]'
                }`}
                style={{ color: theme.colors.text }}
              >
                <div>
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-1.5 overflow-hidden flex-1 mr-2">
                      <BookOpen className={`h-3.5 w-3.5 shrink-0 ${isCur ? 'opacity-90' : 'opacity-40'}`} />
                      {editingId === book.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleSaveRename(book.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(book.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="border rounded px-1.5 py-0.5 text-xs outline-none w-full"
                          style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.accent, color: theme.colors.text }}
                          autoFocus
                        />
                      ) : (
                        <span className="font-semibold text-xs truncate">《{book.title}》</span>
                      )}
                    </div>

                    {isCur && (
                      <span className="flex items-center gap-1 text-[9px] font-mono opacity-60 px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: `${theme.colors.accent}20`, color: theme.colors.accent }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                        当前撰写
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] opacity-50 mt-1" style={{ color: theme.colors.textMuted }}>
                    {book.chapterCount} 章节 · {book.wordCount.toLocaleString()} 字
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 mt-2 border-t text-[9.5px] font-mono opacity-50" style={{ borderColor: `${theme.colors.border}30`, color: theme.colors.textMuted }}>
                  <span>更新于 {updatedStr}</span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(book.id);
                        setEditTitle(book.title);
                      }}
                      className="p-1 rounded opacity-70 hover:opacity-100 transition-all cursor-pointer"
                      style={{ color: theme.colors.text }}
                      title="重命名书名"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    {library.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteBook(e, book.id, book.title)}
                        className="p-1 hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer"
                        title="从书架移除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="p-2.5 px-5 border-t flex items-center justify-between text-[10px] font-mono shrink-0"
          style={{ backgroundColor: theme.colors.bgSecondary, borderColor: `${theme.colors.border}30`, color: theme.colors.textMuted }}
        >
          <div className="flex items-center gap-3">
            <span>点击作品卡片快速切换</span>
            <button
              onClick={handleExportToLocalDirectory}
              className="hover:underline flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              style={{ color: theme.colors.text }}
            >
              <Download className="h-2.5 w-2.5" />
              <span>导出当前作品到本地文件夹</span>
            </button>
          </div>
          <span>独立分卷大纲与字数归档</span>
        </div>
      </div>
    </div>
  );
};
