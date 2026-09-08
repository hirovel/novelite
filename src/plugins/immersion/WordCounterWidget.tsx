import React, { useState, useEffect } from 'react';
import type { PluginContext } from '../../core/plugins/types';
import { projectStore } from '../../core/storage/ProjectStore';
import { useI18n } from '../../core/i18n';

export const WordCounterWidget: React.FC<{ ctx: PluginContext }> = ({ ctx }) => {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [chapWords, setChapWords] = useState<number>(0);
  const [totalWords, setTotalWords] = useState<number>(0);
  const [targetWords, setTargetWords] = useState<number>(200000);

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

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [ctx]);

  const progressPercent = Math.min(100, Math.round((totalWords / targetWords) * 100));

  return (
    <div className="flex items-center gap-4 text-xs font-mono select-none">
      <div className="flex items-center gap-1.5" title={isEn ? "Current chapter word count" : "当前章节字数"}>
        <span className="opacity-50">{isEn ? "Chapter:" : "本章:"}</span>
        <span className="font-semibold text-emerald-400">
          {chapWords.toLocaleString()} {isEn ? "words" : "字"}
        </span>
      </div>

      <div className="hidden sm:flex items-center gap-1.5" title={isEn ? "Total words / Target goal" : "全书总字数 / 目标字数"}>
        <span className="opacity-50">{isEn ? "Total:" : "全书:"}</span>
        <span>{isEn ? `${(totalWords / 1000).toFixed(1)}k` : `${(totalWords / 10000).toFixed(2)}万`}</span>
        <span className="opacity-40">
          / {isEn ? `${(targetWords / 1000).toFixed(0)}k` : `${(targetWords / 10000).toFixed(0)}万`} ({progressPercent}%)
        </span>
      </div>
    </div>
  );
};

