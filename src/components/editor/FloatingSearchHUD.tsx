import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Replace,
  ChevronUp,
  ChevronDown,
  X,
  CaseSensitive,
  WholeWord,
  CheckCheck,
} from 'lucide-react';
import type { EditorView } from '@codemirror/view';
import {
  setSearchQuery,
  SearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
} from '@codemirror/search';
import type { Theme } from '../../core/themes/types';
import { eventBus } from '../../core/events/EventBus';

interface Props {
  view: EditorView | null;
  theme: Theme;
}

export const FloatingSearchHUD: React.FC<Props> = ({ view, theme }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<'search' | 'replace'>('search');
  const [searchText, setSearchText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [matchWholeWord, setMatchWholeWord] = useState<boolean>(false);

  const [matchCount, setMatchCount] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  // Listen for open-floating-search event
  useEffect(() => {
    const handleOpen = (data: { mode?: 'search' | 'replace' } = {}) => {
      setIsOpen(true);
      if (data.mode) {
        setMode(data.mode);
      }
      setTimeout(() => {
        if (data.mode === 'replace' && replaceInputRef.current) {
          searchInputRef.current?.focus();
        } else {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      }, 50);
    };

    const handleClose = () => {
      setIsOpen(false);
      if (view) {
        // Clear search highlight on close
        view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) });
        view.focus();
      }
    };

    const unsub1 = eventBus.on('open-floating-search', handleOpen);
    const unsub2 = eventBus.on('close-floating-search', handleClose);
    const unsub3 = eventBus.on('search-hud:toggle', handleOpen);
    const unsub4 = eventBus.on('modal:close-all', handleClose);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [view]);

  // Sync SearchQuery with CodeMirror
  useEffect(() => {
    if (!view) return;

    if (!isOpen || !searchText) {
      view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) });
      queueMicrotask(() => {
        setMatchCount((prev) => (prev.current === 0 && prev.total === 0 ? prev : { current: 0, total: 0 }));
      });
      return;
    }

    const query = new SearchQuery({
      search: searchText,
      caseSensitive: matchCase,
      wholeWord: matchWholeWord,
      replace: replaceText,
    });

    view.dispatch({ effects: setSearchQuery.of(query) });

    // Calculate match count & active index
    try {
      const doc = view.state.doc;
      const cursor = query.getCursor(doc);
      let total = 0;
      let cur = 0;
      const head = view.state.selection.main.head;

      let item = cursor.next();
      while (!item.done && total < 2000) {
        total++;
        if (item.value.from <= head && head <= item.value.to) {
          cur = total;
        }
        item = cursor.next();
      }

      const nextVal = { current: cur || (total > 0 ? 1 : 0), total };
      queueMicrotask(() => {
        setMatchCount((prev) => (prev.current === nextVal.current && prev.total === nextVal.total ? prev : nextVal));
      });
    } catch (err) {
      console.debug('[FloatingSearchHUD] Failed to calculate match cursor:', err);
      queueMicrotask(() => {
        setMatchCount((prev) => (prev.current === 0 && prev.total === 0 ? prev : { current: 0, total: 0 }));
      });
    }
  }, [isOpen, searchText, replaceText, matchCase, matchWholeWord, view]);

  const handleNext = () => {
    if (view) {
      findNext(view);
      updateMatchPosition();
    }
  };

  const handlePrev = () => {
    if (view) {
      findPrevious(view);
      updateMatchPosition();
    }
  };

  const updateMatchPosition = () => {
    if (!view || !searchText) return;
    const query = new SearchQuery({
      search: searchText,
      caseSensitive: matchCase,
      wholeWord: matchWholeWord,
    });

    try {
      const doc = view.state.doc;
      const cursor = query.getCursor(doc);
      let total = 0;
      let cur = 0;
      const head = view.state.selection.main.head;

      let item = cursor.next();
      while (!item.done && total < 2000) {
        total++;
        if (item.value.from <= head && head <= item.value.to) {
          cur = total;
        }
        item = cursor.next();
      }
      setMatchCount({ current: cur || (total > 0 ? 1 : 0), total });
    } catch (err) {
      console.debug('[FloatingSearchHUD] Failed to update match cursor:', err);
      setMatchCount({ current: 0, total: 0 });
    }
  };

  const handleReplaceOne = () => {
    if (view) {
      replaceNext(view);
      updateMatchPosition();
    }
  };

  const handleReplaceAll = () => {
    if (view && searchText) {
      const totalReplaced = matchCount.total;
      replaceAll(view);
      eventBus.emit('show-toast', {
        message: `全篇替换完成：共替换 ${totalReplaced} 处`,
        type: 'success',
      });
      setMatchCount({ current: 0, total: 0 });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      if (view) {
        view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) });
        view.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute top-13 right-6 z-40 flex flex-col rounded-xl border shadow-xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150"
      style={{
        backgroundColor: `${theme.colors.bgSecondary}FA`,
        borderColor: `${theme.colors.border}40`,
        boxShadow: '0 16px 36px -8px rgba(0,0,0,0.4)',
        width: mode === 'replace' ? '360px' : '320px',
      }}
      onKeyDown={handleKeyDown}
    >
      {/* 1. Search Row */}
      <div className="flex items-center gap-1.5 p-2">
        <button
          onClick={() => setMode((m) => (m === 'search' ? 'replace' : 'search'))}
          className="p-1 rounded-md opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: mode === 'replace' ? (theme.colors.accent || '#38bdf8') : theme.colors.text }}
          title={mode === 'replace' ? '折叠替换栏' : '展开替换栏 (Ctrl+H)'}
        >
          {mode === 'replace' ? <Replace className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
        </button>

        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="查找文本..."
            className="w-full rounded-lg px-2 py-1 text-xs outline-none border font-sans"
            style={{ backgroundColor: theme.colors.bg, borderColor: `${theme.colors.border}60`, color: theme.colors.text }}
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-2 top-1.5 opacity-40 hover:opacity-100"
              style={{ color: theme.colors.textMuted }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Match Count Badge */}
        {searchText && (
          <span className="text-[10px] font-mono opacity-60 shrink-0 px-1.5">
            {matchCount.total > 0 ? `${matchCount.current}/${matchCount.total}` : '无结果'}
          </span>
        )}

        {/* Up / Down Navigation */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handlePrev}
            className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 transition-all"
            title="上一个 (Shift+Enter)"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleNext}
            className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 transition-all"
            title="下一个 (Enter)"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Options */}
        <button
          onClick={() => setMatchCase((v) => !v)}
          className={`p-1 rounded-lg transition-all ${
            matchCase ? 'font-semibold' : 'opacity-50 hover:opacity-100'
          }`}
          style={{
            color: matchCase ? (theme.colors.accent || '#38bdf8') : undefined,
            backgroundColor: matchCase ? `${theme.colors.accent || '#38bdf8'}20` : undefined,
          }}
          title="区分大小写 (Match Case)"
        >
          <CaseSensitive className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => setMatchWholeWord((v) => !v)}
          className={`p-1 rounded-lg transition-all ${
            matchWholeWord ? 'font-semibold' : 'opacity-50 hover:opacity-100'
          }`}
          style={{
            color: matchWholeWord ? (theme.colors.accent || '#38bdf8') : undefined,
            backgroundColor: matchWholeWord ? `${theme.colors.accent || '#38bdf8'}20` : undefined,
          }}
          title="全词匹配 (Whole Word)"
        >
          <WholeWord className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => {
            setIsOpen(false);
            if (view) {
              view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) });
              view.focus();
            }
          }}
          className="p-1 rounded-lg opacity-50 hover:opacity-100 hover:bg-white/10 transition-all"
          title="关闭 (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 2. Replace Row (Expanded) */}
      {mode === 'replace' && (
        <div className="flex items-center gap-2 p-2.5 pt-0 border-t border-white/5 animate-in fade-in duration-150">
          <div className="w-6 shrink-0" />
          <input
            ref={replaceInputRef}
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="替换为..."
            className="flex-1 rounded-xl px-2.5 py-1.5 text-xs outline-none border"
            style={{ backgroundColor: theme.colors.bg, borderColor: `${theme.colors.border}60`, color: theme.colors.text }}
          />

          <button
            onClick={handleReplaceOne}
            disabled={!searchText || matchCount.total === 0}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-30"
            title="替换当前匹配"
          >
            替换
          </button>

          <button
            onClick={handleReplaceAll}
            disabled={!searchText || matchCount.total === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all disabled:opacity-30 cursor-pointer"
            style={{
              color: theme.colors.accent || '#38bdf8',
              backgroundColor: `${theme.colors.accent || '#38bdf8'}20`,
              borderColor: `${theme.colors.accent || '#38bdf8'}40`,
            }}
            title="全篇批量替换"
          >
            <CheckCheck className="h-3 w-3" />
            <span>全换</span>
          </button>
        </div>
      )}
    </div>
  );
};
