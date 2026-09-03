import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { projectStore } from '../../core/storage/ProjectStore';
import type { NovelProject } from '../../core/storage/types';
import type { Theme } from '../../core/themes/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}

export const BreadcrumbMicroDropdown: React.FC<Props> = ({ isOpen, onClose, theme }) => {
  const project: NovelProject = projectStore.getProject();
  const activeChap = projectStore.getActiveChapter();
  const activeVol = project.volumes.find((v) => v.chapters.some((c) => c.id === activeChap?.id)) || project.volumes[0];

  const [selectedVolId, setSelectedVolId] = useState<string>(activeVol?.id || project.volumes[0]?.id || '');
  const [highlightIdx, setHighlightIdx] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentVol = project.volumes.find((v) => v.id === selectedVolId) || project.volumes[0];
  const chapters = currentVol?.chapters || [];

  useEffect(() => {
    if (isOpen) {
      if (activeVol) setSelectedVolId(activeVol.id);
      const idx = activeVol?.chapters.findIndex((c) => c.id === activeChap?.id) ?? 0;
      setHighlightIdx(idx >= 0 ? idx : 0);
    }
  }, [isOpen, activeVol?.id, activeChap?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIdx((prev) => (prev + 1) % Math.max(1, chapters.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIdx((prev) => (prev - 1 + chapters.length) % Math.max(1, chapters.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (chapters[highlightIdx]) {
          projectStore.setActiveChapter(chapters[highlightIdx].id);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, chapters, highlightIdx, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-11 bg-black/25 backdrop-blur-2xs select-none animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="w-[480px] max-w-[92vw] max-h-[380px] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-100"
        style={{
          backgroundColor: `${theme.colors.bgSecondary}FB`,
          borderColor: `${theme.colors.border}80`,
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Volume Selector Horizontal Pills */}
        <div
          className="p-2 px-3 border-b flex items-center gap-1.5 overflow-x-auto shrink-0"
          style={{ backgroundColor: theme.colors.bg, borderColor: `${theme.colors.border}40` }}
        >
          {project.volumes.map((vol) => {
            const isVolActive = vol.id === selectedVolId;
            return (
              <button
                key={vol.id}
                onClick={() => {
                  setSelectedVolId(vol.id);
                  setHighlightIdx(0);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
                  isVolActive
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-400/40 shadow-xs'
                    : 'opacity-50 hover:opacity-100 hover:bg-white/5 border border-transparent'
                }`}
                style={{ color: isVolActive ? undefined : theme.colors.text }}
              >
                <BookOpen className="h-3 w-3 opacity-60" />
                <span>{vol.title}</span>
                <span className="text-[9.5px] font-mono opacity-40">({vol.chapters.length})</span>
              </button>
            );
          })}
        </div>

        {/* Chapters List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chapters.map((chap, idx) => {
            const isCurrentActive = chap.id === activeChap?.id;
            const isHighlighted = idx === highlightIdx;

            return (
              <div
                key={chap.id}
                onClick={() => {
                  projectStore.setActiveChapter(chap.id);
                  onClose();
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                  isHighlighted
                    ? 'bg-white/10 shadow-xs font-medium'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  color: theme.colors.text,
                  backgroundColor: isHighlighted ? `${theme.colors.accent}20` : undefined,
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                  <div
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      isCurrentActive ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : 'bg-white/20'
                    }`}
                  />
                  <span className="truncate">{chap.title}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono opacity-40">
                  <span>{chap.wordCount || 0} 字</span>
                  {isCurrentActive && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                </div>
              </div>
            );
          })}

          {chapters.length === 0 && (
            <div className="py-8 text-center text-xs opacity-40">此分卷暂无章节</div>
          )}
        </div>

        {/* Footer info */}
        <div
          className="p-2 px-4 border-t flex items-center justify-between text-[10px] font-mono opacity-50 shrink-0"
          style={{ backgroundColor: theme.colors.bg, borderColor: `${theme.colors.border}40`, color: theme.colors.textMuted }}
        >
          <span>按 ↑ ↓ 选择 · Enter 瞬切</span>
          <span>按 Esc 退出</span>
        </div>
      </div>
    </div>
  );
};
