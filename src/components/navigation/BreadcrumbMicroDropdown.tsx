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

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      if (activeVol) setSelectedVolId(activeVol.id);
      const idx = activeVol?.chapters.findIndex((c) => c.id === activeChap?.id) ?? 0;
      setHighlightIdx(idx >= 0 ? idx : 0);
    }
  }

  const chaptersRef = useRef(chapters);
  const highlightIdxRef = useRef(highlightIdx);

  useEffect(() => {
    chaptersRef.current = chapters;
    highlightIdxRef.current = highlightIdx;
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const chaps = chaptersRef.current;
      const curIdx = highlightIdxRef.current;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIdx((prev) => (prev + 1) % Math.max(1, chaps.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIdx((prev) => (prev - 1 + chaps.length) % Math.max(1, chaps.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (chaps[curIdx]) {
          projectStore.setActiveChapter(chaps[curIdx].id);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, chaptersRef, highlightIdxRef]);

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
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer border ${
                  isVolActive
                    ? 'font-semibold shadow-xs'
                    : 'opacity-50 hover:opacity-100 hover:bg-white/5 border-transparent'
                }`}
                style={{
                  color: isVolActive ? (theme.colors.accent || theme.colors.text) : theme.colors.text,
                  backgroundColor: isVolActive ? `${theme.colors.accent || '#38bdf8'}22` : undefined,
                  borderColor: isVolActive ? `${theme.colors.accent || '#38bdf8'}55` : 'transparent',
                }}
              >
                <BookOpen className="h-3 w-3" style={{ color: isVolActive ? (theme.colors.accent || '#38bdf8') : undefined, opacity: isVolActive ? 1 : 0.6 }} />
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
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                  isHighlighted
                    ? 'shadow-xs font-medium'
                    : isCurrentActive
                    ? 'font-medium'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  color: isCurrentActive ? (theme.colors.accent || theme.colors.text) : theme.colors.text,
                  backgroundColor: isHighlighted
                    ? `${theme.colors.accent || '#38bdf8'}26`
                    : isCurrentActive
                    ? `${theme.colors.accent || '#38bdf8'}14`
                    : undefined,
                  borderColor: isHighlighted
                    ? `${theme.colors.accent || '#38bdf8'}50`
                    : isCurrentActive
                    ? `${theme.colors.accent || '#38bdf8'}30`
                    : 'transparent',
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                  <div
                    className="h-2 w-2 rounded-full shrink-0 transition-all"
                    style={{
                      backgroundColor: isCurrentActive ? (theme.colors.accent || '#38bdf8') : 'rgba(255, 255, 255, 0.2)',
                      boxShadow: isCurrentActive ? `0 0 8px ${theme.colors.accentGlow || theme.colors.accent || '#38bdf8'}` : 'none',
                    }}
                  />
                  <span className={`truncate ${isCurrentActive ? 'font-semibold tracking-wide' : ''}`}>
                    {chap.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono opacity-50">
                  <span>{chap.wordCount || 0} 字</span>
                  {isCurrentActive && (
                    <Check
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: theme.colors.accent || '#38bdf8' }}
                    />
                  )}
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
