import React, { useState } from 'react';
import type { Theme } from '../../core/themes/types';
import type { PluginContext } from '../../core/plugins/types';
import { Plus, Trash2, Pin, CornerDownLeft, Tag, Search, Sparkles } from 'lucide-react';

interface MemoCard {
  id: string;
  title: string;
  content: string;
  tag: 'plot' | 'character' | 'scene' | 'dialogue' | 'misc';
  isPinned: boolean;
  createdAt: number;
}

const TAG_CONFIG = {
  plot: { label: '伏笔线索', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  character: { label: '角色设定', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  scene: { label: '场景描写', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  dialogue: { label: '高光对白', color: 'bg-pink-500/15 text-pink-400 border-pink-500/30' },
  misc: { label: '灵感随想', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
};

const DEFAULT_MEMOS: MemoCard[] = [
  {
    id: 'memo-1',
    title: '盲眼剑客的断剑来历',
    content: '剑名【止戈】，三年前断于断龙台。剑身虽断，但藏有一道纯阳剑罡，只有在暴雨雷鸣之夜才会隐隐鸣响。',
    tag: 'plot',
    isPinned: true,
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'memo-2',
    title: '客栈雨夜氛围描写词汇',
    content: '【秋雨如注】【灯火摇曳】【青石古道】【草鞋带泥】【雷声隐隐自天外滚过】',
    tag: 'scene',
    isPinned: false,
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'memo-3',
    title: '苏沐白的经典台词备选',
    content: '“这碗热茶我若喝完，天亮之前，城门下便再无活口。”',
    tag: 'dialogue',
    isPinned: false,
    createdAt: Date.now() - 10800000,
  },
];

export const ScratchpadPanel: React.FC<{ ctx: PluginContext; theme: Theme }> = ({ ctx, theme }) => {
  const [memos, setMemos] = useState<MemoCard[]>(() => {
    const saved = localStorage.getItem('novelite_memos_data');
    return saved ? JSON.parse(saved) : DEFAULT_MEMOS;
  });
  const [filterTag, setFilterTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [newTag, setNewTag] = useState<keyof typeof TAG_CONFIG>('plot');

  const saveMemos = (newMemos: MemoCard[]) => {
    setMemos(newMemos);
    localStorage.setItem('novelite_memos_data', JSON.stringify(newMemos));
  };

  const handleAddMemo = () => {
    if (!newContent.trim()) return;
    const memo: MemoCard = {
      id: `memo-${Date.now()}`,
      title: newTitle.trim() || '灵感随记',
      content: newContent.trim(),
      tag: newTag,
      isPinned: false,
      createdAt: Date.now(),
    };
    saveMemos([memo, ...memos]);
    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
    ctx.showToast('灵感便签已保存', 'success');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveMemos(memos.filter((m) => m.id !== id));
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveMemos(memos.map((m) => (m.id === id ? { ...m, isPinned: !m.isPinned } : m)));
  };

  const handleInsertToEditor = (content: string) => {
    ctx.insertText(`\n\n${content}\n\n`);
    ctx.showToast('已插入正文光标位置', 'info');
  };

  const filteredMemos = memos
    .filter((m) => filterTag === 'all' || m.tag === filterTag)
    .filter((m) => !searchQuery.trim() || m.title.includes(searchQuery) || m.content.includes(searchQuery))
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  return (
    <div className="flex h-full flex-col p-3 space-y-3 select-none text-xs">
      {/* Header & Quick Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-xs" style={{ color: theme.colors.text }}>
          <Sparkles className="h-3.5 w-3.5" style={{ color: theme.colors.accent }} />
          <span>灵感碎片与随手备忘 ({memos.length})</span>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border shadow-xs transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: isAdding ? `${theme.colors.accent}25` : theme.colors.bgHover,
            borderColor: isAdding ? theme.colors.accent : 'rgba(255, 255, 255, 0.1)',
            color: theme.colors.text,
          }}
        >
          <Plus className="h-3 w-3" />
          <span>{isAdding ? '取消' : '记录灵感'}</span>
        </button>
      </div>

      {/* Adding Box Form */}
      {isAdding && (
        <div
          className="rounded-xl border p-3 space-y-2.5 bg-black/20 animate-in fade-in duration-150"
          style={{ borderColor: theme.colors.accent }}
        >
          <input
            type="text"
            placeholder="便签标题（如：主线暗桩、对白金句）"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded-lg border p-2 text-xs outline-none focus:border-cyan-400"
            style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.border, color: theme.colors.text }}
          />

          <textarea
            placeholder="记录具体灵感内容或待回收伏笔..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            className="w-full rounded-lg border p-2 text-xs outline-none resize-none leading-relaxed focus:border-cyan-400"
            style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.border, color: theme.colors.text }}
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1">
              {(Object.keys(TAG_CONFIG) as Array<keyof typeof TAG_CONFIG>).map((t) => {
                const isCur = newTag === t;
                const cfg = TAG_CONFIG[t];
                return (
                  <button
                    key={t}
                    onClick={() => setNewTag(t)}
                    className={`px-1.5 py-0.5 rounded text-[10px] border transition-all ${
                      isCur ? cfg.color + ' font-bold ring-1 ring-white/20' : 'opacity-40 hover:opacity-80 border-transparent'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleAddMemo}
              disabled={!newContent.trim()}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-all disabled:opacity-40"
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 opacity-40" />
        <input
          type="text"
          placeholder="搜索灵感卡片..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border py-1.5 pl-8 pr-3 text-[11px] outline-none transition-colors"
          style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.border, color: theme.colors.text }}
        />
      </div>

      {/* Tags Carousel Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterTag('all')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-mono border transition-all shrink-0 ${
            filterTag === 'all' ? 'bg-white/15 text-white border-white/20 font-semibold' : 'opacity-50 hover:opacity-80 border-transparent'
          }`}
        >
          全部 ({memos.length})
        </button>
        {(Object.keys(TAG_CONFIG) as Array<keyof typeof TAG_CONFIG>).map((t) => {
          const isCur = filterTag === t;
          const cfg = TAG_CONFIG[t];
          const count = memos.filter((m) => m.tag === t).length;
          return (
            <button
              key={t}
              onClick={() => setFilterTag(t)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono border transition-all shrink-0 ${
                isCur ? cfg.color + ' font-semibold shadow-xs' : 'opacity-50 hover:opacity-80 border-transparent'
              }`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Memos List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
        {filteredMemos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-40 text-center space-y-1">
            <Tag className="h-6 w-6 stroke-1" />
            <p className="text-[11px]">暂无匹配的灵感便签</p>
          </div>
        ) : (
          filteredMemos.map((memo) => {
            const tagCfg = TAG_CONFIG[memo.tag] || TAG_CONFIG.misc;
            return (
              <div
                key={memo.id}
                className="group relative rounded-xl border p-3 space-y-2 shadow-xs transition-all hover:border-white/20 hover:shadow-md"
                style={{
                  backgroundColor: theme.colors.bg,
                  borderColor: memo.isPinned ? `${theme.colors.accent}60` : theme.colors.border,
                }}
              >
                {/* Top Title & Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9.5px] border font-mono ${tagCfg.color}`}>
                      {tagCfg.label}
                    </span>
                    <span className="font-semibold text-xs truncate max-w-[120px]" style={{ color: theme.colors.text }}>
                      {memo.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleTogglePin(memo.id, e)}
                      title={memo.isPinned ? '取消置顶' : '置顶便签'}
                      className={`p-1 rounded hover:bg-white/10 ${memo.isPinned ? 'text-amber-400' : 'opacity-60'}`}
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(memo.id, e)}
                      title="删除便签"
                      className="p-1 rounded hover:bg-rose-500/20 hover:text-rose-400 text-neutral-500 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <p className="text-[11px] leading-relaxed opacity-80 whitespace-pre-wrap font-sans" style={{ color: theme.colors.text }}>
                  {memo.content}
                </p>

                {/* Bottom Insert Button */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5 opacity-50 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9.5px] font-mono opacity-50">
                    {new Date(memo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => handleInsertToEditor(memo.content)}
                    className="flex items-center gap-1 text-[10.5px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <CornerDownLeft className="h-3 w-3" />
                    <span>插入正文光标处</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
