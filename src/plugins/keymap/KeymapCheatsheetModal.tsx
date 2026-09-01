import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  RotateCcw,
  Sparkles,
  Keyboard,
  Edit2,
  Check,
  AlertTriangle,
  Play,
  Columns,
  BookOpen,
  Compass,
  FileText,
  Sliders,
} from 'lucide-react';
import { keymapRegistry } from '../../core/keymap/KeymapRegistry';
import type { KeybindingCategory, KeybindingItem } from '../../core/keymap/types';
import type { Theme } from '../../core/themes/types';
import { eventBus } from '../../core/events/EventBus';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}

const CATEGORY_CONFIG: {
  id: KeybindingCategory | 'all';
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'all', label: '全部速查', icon: Sparkles },
  { id: 'editing', label: '文本与行操作', icon: FileText },
  { id: 'navigation', label: '光标疾速巡航', icon: Compass },
  { id: 'search', label: '查找与导航', icon: Search },
  { id: 'split_view', label: '分屏与对照', icon: Columns },
  { id: 'literary', label: '文学与排版', icon: BookOpen },
  { id: 'system', label: '视口与心流', icon: Sliders },
];

export const KeymapCheatsheetModal: React.FC<Props> = ({ isOpen, onClose, theme }) => {
  const [activeCategory, setActiveCategory] = useState<KeybindingCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [items, setItems] = useState<KeybindingItem[]>(() => keymapRegistry.getAll());
  
  // Key Remap State
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordedKey, setRecordedKey] = useState<string>('');
  const [conflictItem, setConflictItem] = useState<KeybindingItem | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setItems(keymapRegistry.getAll());
    };
    const unsub = keymapRegistry.subscribe(handleUpdate);
    const unsubBus = eventBus.on('keymap:changed', handleUpdate);

    return () => {
      unsub();
      unsubBus();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setRecordingId(null);
      setRecordedKey('');
      setConflictItem(null);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Key Recording Listener
  useEffect(() => {
    if (!recordingId) return;

    const handleRecordKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingId(null);
        setRecordedKey('');
        setConflictItem(null);
        return;
      }

      // Ignore bare modifier presses while recording
      if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
        return;
      }

      const keyStr = keymapRegistry.normalizeEvent(e);
      if (keyStr) {
        setRecordedKey(keyStr);
        const conflicts = keymapRegistry.findConflicts(keyStr, recordingId);
        setConflictItem(conflicts.length > 0 ? conflicts[0] : null);
      }
    };

    window.addEventListener('keydown', handleRecordKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleRecordKeyDown, { capture: true });
    };
  }, [recordingId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.currentKey.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [items, activeCategory, searchQuery]);

  // Group items by category for structured overview
  const groupedItems = useMemo(() => {
    const map = new Map<KeybindingCategory, KeybindingItem[]>();
    filteredItems.forEach((item) => {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    });
    return map;
  }, [filteredItems]);

  if (!isOpen) return null;

  const handleSaveRecording = (id: string) => {
    if (recordedKey) {
      keymapRegistry.updateBinding(id, recordedKey);
      eventBus.emit('show-toast', { message: `快捷键已修改为 ${recordedKey}`, type: 'success' });
    }
    setRecordingId(null);
    setRecordedKey('');
    setConflictItem(null);
  };

  const handleResetSingle = (id: string) => {
    keymapRegistry.resetBinding(id);
    eventBus.emit('show-toast', { message: '已恢复默认按键', type: 'info' });
    setRecordingId(null);
    setRecordedKey('');
    setConflictItem(null);
  };

  const handleResetAll = () => {
    if (window.confirm('确定要将所有快捷键重置为系统出厂默认设置吗？')) {
      keymapRegistry.resetAll();
      eventBus.emit('show-toast', { message: '所有快捷键已重置为默认值', type: 'success' });
    }
  };

  const handleExecute = (item: KeybindingItem) => {
    onClose();
    if (item.run) {
      item.run();
    } else {
      // Simulate trigger via global dispatcher
      eventBus.emit(`keymap:trigger:${item.id}`);
      switch (item.id) {
        case 'split:toggle':
          eventBus.emit('split-view:toggle');
          break;
        case 'split:focus-toggle':
          eventBus.emit('split-view:focus-pane', 'toggle');
          break;
        case 'split:focus-primary':
          eventBus.emit('split-view:focus-pane', 'primary');
          break;
        case 'split:focus-secondary':
          eventBus.emit('split-view:focus-pane', 'secondary');
          break;
        case 'split:swap-panes':
          eventBus.emit('split-view:swap');
          break;
        case 'literary:save-chapter':
          eventBus.emit('save-current-chapter');
          break;
        case 'literary:format-chinese':
          eventBus.emit('editor-action:format-chinese');
          break;
        case 'literary:toggle-spotlight':
          eventBus.emit('editor-action:toggle-spotlight');
          break;
        case 'literary:toggle-dialogue':
          eventBus.emit('editor-action:toggle-dialogue');
          break;
        case 'literary:quick-export':
          eventBus.emit('quick-export:open');
          break;
        case 'view:toggle-zen':
          eventBus.emit('zen-mode:toggle');
          break;
        case 'view:open-settings':
          eventBus.emit('settings:open');
          break;
        case 'search:toggle-hud':
          eventBus.emit('search-hud:toggle');
          break;
        case 'nav:command-palette':
          eventBus.emit('command-palette:toggle');
          break;
        case 'nav:flight-deck':
          eventBus.emit('quick-search:open');
          break;
        case 'nav:bookshelf':
          eventBus.emit('bookshelf:open');
          break;
        case 'nav:prev-chapter':
          eventBus.emit('chapter:navigate-prev');
          break;
        case 'nav:next-chapter':
          eventBus.emit('chapter:navigate-next');
          break;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[85vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden backdrop-blur-3xl animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: `${theme.colors.bgSecondary}FA`,
          borderColor: `${theme.colors.border}80`,
          boxShadow: `0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px ${theme.colors.accent}20`,
        }}
      >
        {/* 🌟 1. Top Header */}
        <header className="p-5 pb-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: `${theme.colors.border}30` }}>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-inner"
              style={{ backgroundColor: `${theme.colors.accent}20`, color: theme.colors.accent }}
            >
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight" style={{ color: theme.colors.text }}>
                快捷键全景速查与管理中心
              </h2>
              <p className="text-xs opacity-50 font-mono mt-0.5">
                收录全量创作按键 · 支持点击即时运行 · 点击修改录制自定义按键
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAll}
              title="一键恢复所有快捷键至默认设置"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs opacity-60 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer font-mono"
              style={{ color: theme.colors.text }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>恢复默认</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl opacity-40 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
              style={{ color: theme.colors.text }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* 🌟 2. Search & Category Filter Dock */}
        <div className="p-4 border-b flex flex-col sm:flex-row items-center gap-3 shrink-0" style={{ borderColor: `${theme.colors.border}20` }}>
          {/* Search Input */}
          <div className="relative flex-1 w-full flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 opacity-40" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="搜索快捷键、指令名称、功能描述或键位 (例如: Ctrl+S、分屏、行操作)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-xl text-xs bg-black/30 border outline-none transition-all placeholder:opacity-30"
              style={{
                borderColor: `${theme.colors.border}40`,
                color: theme.colors.text,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 opacity-40 hover:opacity-100 p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORY_CONFIG.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 font-medium shadow-xs'
                      : 'opacity-50 hover:opacity-90 hover:bg-white/5 text-neutral-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 🌟 3. Content List Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {filteredItems.length === 0 ? (
            <div className="py-20 text-center text-xs opacity-40 font-mono">
              未找到匹配 “{searchQuery}” 的快捷键
            </div>
          ) : (
            CATEGORY_CONFIG.filter((c) => c.id !== 'all').map((cat) => {
              const catItems = groupedItems.get(cat.id as KeybindingCategory);
              if (!catItems || catItems.length === 0) return null;

              const CatIcon = cat.icon;

              return (
                <div key={cat.id} className="space-y-2.5">
                  {/* Category Header Title */}
                  <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                    <CatIcon className="h-4 w-4 opacity-60 text-cyan-400" />
                    <span className="text-xs font-semibold tracking-tight" style={{ color: theme.colors.text }}>
                      {cat.label}
                    </span>
                    <span className="text-[10px] font-mono opacity-30">({catItems.length})</span>
                  </div>

                  {/* Hotkeys Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {catItems.map((item) => {
                      const isRecording = recordingId === item.id;
                      const displayKey = keymapRegistry.formatDisplayKey(item.currentKey);

                      return (
                        <div
                          key={item.id}
                          className="group relative flex items-center justify-between p-3 rounded-2xl border transition-all hover:bg-white/[0.04] bg-black/20"
                          style={{
                            borderColor: isRecording ? theme.colors.accent : `${theme.colors.border}30`,
                            boxShadow: isRecording ? `0 0 16px ${theme.colors.accent}40` : undefined,
                          }}
                        >
                          {/* Left: Info */}
                          <div className="flex flex-col min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium truncate" style={{ color: theme.colors.text }}>
                                {item.title}
                              </span>
                              {item.isCustomized && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300">
                                  已修改
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] opacity-45 truncate mt-0.5" title={item.description}>
                              {item.description}
                            </span>
                          </div>

                          {/* Right: Key Badge & Quick Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isRecording ? (
                              <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                <div className="px-2.5 py-1 rounded-xl text-xs font-mono bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 animate-pulse flex items-center gap-1">
                                  <span>{recordedKey || '请按下新按键...'}</span>
                                </div>

                                {conflictItem && (
                                  <span
                                    className="text-amber-400 text-xs flex items-center"
                                    title={`按键冲突：已绑定至「${conflictItem.title}」`}
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                  </span>
                                )}

                                <button
                                  onClick={() => handleSaveRecording(item.id)}
                                  className="p-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 transition-colors"
                                  title="确认保存"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setRecordingId(null);
                                    setRecordedKey('');
                                    setConflictItem(null);
                                  }}
                                  className="p-1 rounded-lg hover:bg-white/10 opacity-50 hover:opacity-100 transition-colors"
                                  title="取消"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                {/* Key Badge */}
                                <div
                                  onClick={() => {
                                    setRecordingId(item.id);
                                    setRecordedKey('');
                                    setConflictItem(null);
                                  }}
                                  title="点击录制并修改此快捷键"
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 hover:border-cyan-400/60 transition-all cursor-pointer font-mono text-[11px] select-none hover:scale-105"
                                >
                                  {displayKey.mods.map((m, idx) => (
                                    <kbd key={idx} className="opacity-70 font-semibold">
                                      {m}
                                    </kbd>
                                  ))}
                                  {displayKey.mods.length > 0 && <span className="opacity-30">+</span>}
                                  <kbd className="font-bold text-cyan-300">{displayKey.key}</kbd>
                                </div>

                                {/* Micro Action Buttons on Hover */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleExecute(item)}
                                    title="一键直接运行此功能"
                                    className="p-1.5 rounded-lg hover:bg-white/10 opacity-60 hover:opacity-100 hover:text-cyan-300 transition-all cursor-pointer"
                                  >
                                    <Play className="h-3 w-3" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      setRecordingId(item.id);
                                      setRecordedKey('');
                                      setConflictItem(null);
                                    }}
                                    title="修改快捷键"
                                    className="p-1.5 rounded-lg hover:bg-white/10 opacity-60 hover:opacity-100 transition-all cursor-pointer"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>

                                  {item.isCustomized && (
                                    <button
                                      onClick={() => handleResetSingle(item.id)}
                                      title="恢复此键默认设置"
                                      className="p-1.5 rounded-lg hover:bg-white/10 opacity-50 hover:opacity-100 hover:text-amber-400 transition-all cursor-pointer"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 🌟 4. Footer Help Tip */}
        <footer
          className="h-10 px-5 border-t flex items-center justify-between text-[11px] opacity-45 font-mono shrink-0 select-none"
          style={{ borderColor: `${theme.colors.border}25` }}
        >
          <div className="flex items-center gap-2">
            <span>💡 提示：点击任意键位可直接按下新键录制修改 · 点击 ▶ 可直接执行指令</span>
          </div>
          <div>
            <span>按 <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold">Esc</kbd> 退出速查</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
