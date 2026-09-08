import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, BookOpen, ChevronRight, FileText, CornerDownLeft, Filter } from 'lucide-react';
import { projectStore } from '../../core/storage/ProjectStore';
import type { Theme } from '../../core/themes/types';
import { eventBus } from '../../core/events/EventBus';
import { useI18n } from '../../core/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}

interface MatchResult {
  volId: string;
  volTitle: string;
  chapId: string;
  chapTitle: string;
  wordCount: number;
  matchCount: number;
  snippets: {
    before: string;
    match: string;
    after: string;
    index: number;
  }[];
}

export const GlobalSearchModal: React.FC<Props> = ({ isOpen, onClose, theme }) => {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [selectedVolId, setSelectedVolId] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const project = projectStore.getProject();

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }

  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Perform full-text search across all volumes and chapters
  const results: MatchResult[] = useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    const searchTarget = caseSensitive ? q : q.toLowerCase();
    const list: MatchResult[] = [];

    project.volumes.forEach((vol) => {
      if (selectedVolId !== 'all' && vol.id !== selectedVolId) {
        return;
      }

      vol.chapters.forEach((chap) => {
        const content = chap.content || '';
        const title = chap.title || '';
        const compareContent = caseSensitive ? content : content.toLowerCase();
        const compareTitle = caseSensitive ? title : title.toLowerCase();

        let matchCount = 0;
        const snippets: MatchResult['snippets'] = [];

        // Check if title matches
        if (compareTitle.includes(searchTarget)) {
          matchCount++;
          snippets.push({
            before: isEn ? 'Chapter title: ' : '章节标题：',
            match: title,
            after: '',
            index: 0,
          });
        }

        // Scan content matches
        let pos = 0;
        const maxSnippets = 5; // Up to 5 context snippets per chapter to keep UI snappy
        while (pos < compareContent.length) {
          const idx = compareContent.indexOf(searchTarget, pos);
          if (idx === -1) break;

          matchCount++;
          if (snippets.length < maxSnippets) {
            const snippetStart = Math.max(0, idx - 28);
            const snippetEnd = Math.min(content.length, idx + searchTarget.length + 32);

            const beforeText = content.slice(snippetStart, idx).replace(/\s+/g, ' ');
            const matchText = content.slice(idx, idx + searchTarget.length);
            const afterText = content.slice(idx + searchTarget.length, snippetEnd).replace(/\s+/g, ' ');

            snippets.push({
              before: (snippetStart > 0 ? '…' : '') + beforeText,
              match: matchText,
              after: afterText + (snippetEnd < content.length ? '…' : ''),
              index: idx,
            });
          }
          pos = idx + Math.max(1, searchTarget.length);
        }

        if (matchCount > 0) {
          list.push({
            volId: vol.id,
            volTitle: vol.title,
            chapId: chap.id,
            chapTitle: chap.title,
            wordCount: chap.wordCount || 0,
            matchCount,
            snippets,
          });
        }
      });
    });

    return list;
  }, [project, query, caseSensitive, selectedVolId, isEn]);


  const handleSelect = (result: MatchResult, snippetIndex = 0) => {
    const snippet = result.snippets[snippetIndex] || result.snippets[0];
    const targetPos = snippet && typeof snippet.index === 'number' ? snippet.index : -1;
    const matchText = snippet ? snippet.match : query.trim();
    const targetLength = matchText ? matchText.length : 0;

    projectStore.setActiveChapter(result.chapId);
    const targetChap = project.volumes.flatMap((v) => v.chapters).find((c) => c.id === result.chapId);
    if (targetChap) {
      eventBus.emit('chapter-selected', targetChap, { targetPos, targetLength, targetText: matchText });
    }

    eventBus.emit('editor:navigate-to-match', {
      chapterId: result.chapId,
      index: targetPos,
      length: targetLength,
      matchText,
    });

    eventBus.emit('show-toast', {
      message: isEn ? `Navigated to "${result.chapTitle}" match` : `已定位至《${result.chapTitle}》匹配处`,
      type: 'info',
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  const totalMatches = results.reduce((acc, r) => acc + r.matchCount, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 select-none p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: `${theme.colors.bgSecondary}FE`,
          borderColor: `${theme.colors.border}80`,
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.75)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div
          className="p-3 px-4 border-b flex items-center gap-2.5 bg-black/15 shrink-0"
          style={{ borderColor: `${theme.colors.border}30` }}
        >
          <Search className="h-4 w-4 opacity-50 shrink-0" style={{ color: theme.colors.accent }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isEn ? 'Full-text manuscript search (names, lore, keywords)...' : '全书全文检索（输入角色名、伏笔、地名或关键词）...'}
            className="flex-1 bg-transparent text-xs sm:text-sm outline-none placeholder:opacity-40 font-sans"
            style={{ color: theme.colors.text }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Volume Filter Dropdown */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-white/10 shrink-0">
            <Filter className="h-3 w-3 opacity-40" />
            <select
              value={selectedVolId}
              onChange={(e) => setSelectedVolId(e.target.value)}
              className="bg-transparent text-[11px] outline-none opacity-70 hover:opacity-100 cursor-pointer font-sans"
              style={{ color: theme.colors.text }}
            >
              <option value="all" className="bg-neutral-900 text-white">
                {isEn ? 'All Volumes' : '全部卷'}
              </option>
              {project.volumes.map((v) => (
                <option key={v.id} value={v.id} className="bg-neutral-900 text-white">
                  {v.title}
                </option>
              ))}
            </select>
          </div>

          {/* Case Sensitive Toggle */}
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors shrink-0 cursor-pointer ${
              caseSensitive ? 'bg-white/20 font-semibold' : 'opacity-40 hover:opacity-100 hover:bg-white/5'
            }`}
            style={{ color: theme.colors.text }}
            title={isEn ? 'Match Case' : '区分大小写'}
          >
            Aa
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded opacity-40 hover:opacity-100 hover:bg-white/10 transition-colors ml-1 cursor-pointer"
            title={isEn ? 'Close (Esc)' : '关闭 (Esc)'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results Info Bar */}
        {query.trim() && (
          <div
            className="px-4 py-1.5 border-b flex items-center justify-between text-[11px] font-mono opacity-50 bg-black/10 shrink-0"
            style={{ borderColor: `${theme.colors.border}20` }}
          >
            <span>
              {isEn
                ? `Matched ${results.length} chapters · ${totalMatches} hits`
                : `匹配到 ${results.length} 个章节 · 共 ${totalMatches} 处命中`}
            </span>
            <span>{isEn ? 'Use ↑ ↓ to navigate · Enter to jump' : '按 ↑ ↓ 选章 · Enter 跳转'}</span>
          </div>
        )}

        {/* Results List */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 custom-scrollbar"
        >
          {!query.trim() ? (
            <div className="py-14 text-center space-y-2 opacity-40">
              <Search className="h-8 w-8 mx-auto stroke-1" />
              <p className="text-xs">
                {isEn ? 'Enter any query to search all volumes and chapters' : '输入任意词汇，即时检索全书所有分卷与章节正文'}
              </p>
              <p className="text-[10.5px] font-mono">
                {isEn ? 'Shortcut: Ctrl + Shift + F' : '支持快捷键 Ctrl + Shift + F 随时打开'}
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-14 text-center space-y-1.5 opacity-40">
              <FileText className="h-8 w-8 mx-auto stroke-1" />
              <p className="text-xs">
                {isEn ? `No chapters found containing "${query}"` : `未找到包含「${query}」的章节正文`}
              </p>
              <p className="text-[10px] font-mono">
                {isEn ? 'Try shorter keywords or check volume filters' : '请尝试缩短关键词或检查分卷过滤设置'}
              </p>
            </div>
          ) : (
            results.map((res, rIdx) => {
              const isSelected = rIdx === selectedIndex;
              return (
                <div
                  key={res.chapId}
                  onClick={() => handleSelect(res)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'shadow-md ring-1'
                      : 'border-white/[0.06] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05]'
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${theme.colors.accent || '#38bdf8'}15` : undefined,
                    borderColor: isSelected ? (theme.colors.accent || '#38bdf8') : undefined,
                    outlineColor: isSelected ? (theme.colors.accent || '#38bdf8') : undefined,
                  }}
                >
                  {/* Chapter Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                      <BookOpen className="h-3.5 w-3.5 opacity-50 shrink-0" />
                      <span className="opacity-45 text-[10.5px] truncate shrink-0">{res.volTitle}</span>
                      <ChevronRight className="h-3 w-3 opacity-20 shrink-0" />
                      <span className="font-semibold text-xs truncate" style={{ color: theme.colors.text }}>
                        {res.chapTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono opacity-50">
                      <span>{isEn ? `${res.wordCount.toLocaleString()} words` : `${res.wordCount.toLocaleString()} 字`}</span>
                      <span
                        className="px-1.5 py-0.2 rounded font-semibold"
                        style={{
                          backgroundColor: `${theme.colors.accent || '#38bdf8'}25`,
                          color: theme.colors.accent || '#38bdf8',
                        }}
                      >
                        {isEn ? `${res.matchCount} matches` : `${res.matchCount} 处匹配`}
                      </span>
                    </div>
                  </div>

                  {/* Context Snippets */}
                  <div className="pt-2 space-y-1.5">
                    {res.snippets.map((snip, sIdx) => (
                      <div
                        key={`${res.chapId}-${snip.index}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(res, sIdx);
                        }}
                        className="p-1.5 px-2 rounded-lg bg-black/20 text-[11px] leading-relaxed font-sans opacity-85 hover:opacity-100 hover:bg-black/35 transition-colors flex items-start justify-between gap-2"
                        style={{ color: theme.colors.text }}
                      >
                        <p className="flex-1 line-clamp-2">
                          <span className="opacity-60">{snip.before}</span>
                          <mark
                            className="font-bold px-0.5 rounded mx-0.5"
                            style={{
                              backgroundColor: `${theme.colors.accent || '#38bdf8'}40`,
                              color: '#ffffff',
                            }}
                          >
                            {snip.match}
                          </mark>
                          <span className="opacity-60">{snip.after}</span>
                        </p>
                        <CornerDownLeft className="h-3 w-3 opacity-30 shrink-0 mt-0.5" />
                      </div>
                    ))}
                    {res.matchCount > res.snippets.length && (
                      <div className="text-[9.5px] font-mono opacity-40 px-1">
                        {isEn
                          ? `${res.matchCount - res.snippets.length} more matches, click chapter to view...`
                          : `还有 ${res.matchCount - res.snippets.length} 处匹配未展开，点击进入章节查阅...`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="p-2 px-4 border-t flex items-center justify-between text-[10px] font-mono opacity-40 bg-black/15 shrink-0"
          style={{ borderColor: `${theme.colors.border}30` }}
        >
          <span>{isEn ? 'Real-time full-text search · Instant memory index' : '全书实时检索 · 内存极速索引'}</span>
          <span>{isEn ? 'Esc to exit' : 'Esc 退出'}</span>
        </div>
      </div>
    </div>
  );
};
