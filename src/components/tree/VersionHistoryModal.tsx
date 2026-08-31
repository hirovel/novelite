import React, { useState } from 'react';
import { History, RotateCcw, X, Clock } from 'lucide-react';
import type { ChapterSnapshot } from '../../core/storage/types';
import { projectStore } from '../../core/storage/ProjectStore';
import { eventBus } from '../../core/events/EventBus';
import type { Theme } from '../../core/themes/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  chapterTitle: string;
  theme: Theme;
}

export const VersionHistoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  chapterId,
  chapterTitle,
  theme,
}) => {
  const snapshots = projectStore.getSnapshots(chapterId);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(() => snapshots[0]?.id || null);

  if (!isOpen) return null;

  const selectedSnapshot = snapshots.find((s) => s.id === selectedSnapshotId) || snapshots[0];

  const handleRestore = (snap: ChapterSnapshot) => {
    const ok = projectStore.restoreSnapshot(chapterId, snap.id);
    if (ok) {
      eventBus.emit('show-toast', {
        message: `已成功回滚至 ${new Date(snap.timestamp).toLocaleTimeString()} 版本`,
        type: 'success',
      });
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-[520px] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: `${theme.colors.bgSecondary}FA`,
          borderColor: `${theme.colors.border}80`,
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-3.5 px-4 border-b flex items-center justify-between bg-black/15 shrink-0"
          style={{ borderColor: `${theme.colors.border}40` }}
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 opacity-60" style={{ color: theme.colors.accent || '#38bdf8' }} />
            <div>
              <h3 className="font-semibold text-xs tracking-wide" style={{ color: theme.colors.text }}>
                版本历史快照 · 《{chapterTitle}》
              </h3>
              <p className="text-[10px] opacity-40 font-mono">共 {snapshots.length} 个历史还原点</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md opacity-40 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
            style={{ color: theme.colors.text }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content: 2 Panes (Left: List, Right: Preview) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Snapshots List */}
          <div
            className="w-64 border-r overflow-y-auto p-2 space-y-1 bg-black/10 shrink-0"
            style={{ borderColor: `${theme.colors.border}30` }}
          >
            {snapshots.length === 0 ? (
              <div className="py-12 text-center text-xs opacity-30 font-mono">暂无历史快照</div>
            ) : (
              snapshots.map((snap) => {
                const isSelected = snap.id === (selectedSnapshot?.id || '');
                const date = new Date(snap.timestamp);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });

                return (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedSnapshotId(snap.id)}
                    className={`p-2 rounded-xl text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white/10 font-medium border border-white/15'
                        : 'opacity-60 hover:opacity-100 hover:bg-white/5 border border-transparent'
                    }`}
                    style={{ color: theme.colors.text }}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3 opacity-40" />
                        {dateStr} {timeStr}
                      </span>
                      <span className="text-[10px] font-mono opacity-50">{snap.wordCount} 字</span>
                    </div>
                    {snap.summary && (
                      <p className="text-[10px] opacity-40 truncate mt-0.5 font-sans">{snap.summary}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right Snapshot Preview */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 bg-black/5">
            {selectedSnapshot ? (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-white/5 shrink-0 text-xs">
                  <span className="font-mono text-[11px] opacity-60">
                    快照时间：{new Date(selectedSnapshot.timestamp).toLocaleString()} ({selectedSnapshot.wordCount} 字)
                  </span>

                  <button
                    onClick={() => handleRestore(selectedSnapshot)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    style={{
                      backgroundColor: `${theme.colors.accent || '#38bdf8'}20`,
                      borderColor: `${theme.colors.accent || '#38bdf8'}40`,
                      color: theme.colors.accent || '#38bdf8',
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>恢复此版本</span>
                  </button>
                </div>

                <div
                  className="flex-1 overflow-y-auto pt-3 text-xs leading-relaxed whitespace-pre-wrap font-sans opacity-80 select-text"
                  style={{ color: theme.colors.text }}
                >
                  {selectedSnapshot.content}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs opacity-30 font-mono">
                选择左侧快照以预览正文
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
