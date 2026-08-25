import React, { useState, useEffect } from 'react';
import type { PluginContext } from '../../core/plugins/types';
import { projectStore } from '../../core/storage/ProjectStore';

export const WordCounterWidget: React.FC<{ ctx: PluginContext }> = ({ ctx }) => {
  const [chapWords, setChapWords] = useState<number>(0);
  const [totalWords, setTotalWords] = useState<number>(0);
  const [targetWords, setTargetWords] = useState<number>(200000);
  const [speedWPM, setSpeedWPM] = useState<number>(0);

  useEffect(() => {
    const updateStats = () => {
      const proj = projectStore.getProject();
      const activeChap = projectStore.getActiveChapter();
      setChapWords(activeChap?.wordCount || 0);
      setTotalWords(projectStore.getTotalWordCount());
      setTargetWords(proj.targetWordCount || 200000);
    };

    updateStats();

    const unsub1 = ctx.on('chapter-content-updated', () => updateStats());
    const unsub2 = ctx.on('active-chapter-changed', () => updateStats());
    const unsub3 = ctx.on('project-tree-changed', () => updateStats());

    let lastWordCount = projectStore.getActiveChapter()?.wordCount || 0;
    const charDiffs: number[] = [];

    const speedInterval = setInterval(() => {
      const current = projectStore.getActiveChapter()?.wordCount || 0;
      const diff = Math.max(0, current - lastWordCount);
      lastWordCount = current;
      charDiffs.push(diff);
      if (charDiffs.length > 6) charDiffs.shift();
      const sum = charDiffs.reduce((a, b) => a + b, 0);
      const wpm = sum * 2;
      setSpeedWPM(wpm);
    }, 5000);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      clearInterval(speedInterval);
    };
  }, [ctx]);

  const progressPercent = Math.min(100, Math.round((totalWords / targetWords) * 100));

  return (
    <div className="flex items-center gap-4 text-xs font-mono select-none">
      <div className="flex items-center gap-1.5" title="当前章节字数">
        <span className="opacity-50">本章:</span>
        <span className="font-semibold text-emerald-400">{chapWords.toLocaleString()} 字</span>
      </div>

      <div className="hidden sm:flex items-center gap-1.5" title="全书总字数 / 目标字数">
        <span className="opacity-50">全书:</span>
        <span>{(totalWords / 10000).toFixed(2)}万</span>
        <span className="opacity-40">/ {(targetWords / 10000).toFixed(0)}万 ({progressPercent}%)</span>
      </div>

      {speedWPM > 0 && (
        <div className="hidden md:flex items-center gap-1 text-amber-400 animate-pulse" title="当前码字速率">
          <span>⚡ {speedWPM} 字/分</span>
        </div>
      )}
    </div>
  );
};
