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
import { commandRegistry } from '../../core/plugins/CommandRegistry';
import { pluginManager } from '../../core/plugins/PluginManager';
import { projectStore } from '../../core/storage/ProjectStore';
import type { KeybindingCategory, KeybindingItem } from '../../core/keymap/types';
import type { Theme } from '../../core/themes/types';
import { eventBus } from '../../core/events/EventBus';
import { useI18n } from '../../core/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}

export const KeymapCheatsheetModal: React.FC<Props> = ({ isOpen, onClose, theme }) => {
  const { t, language } = useI18n();
  const [activeCategory, setActiveCategory] = useState<KeybindingCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [items, setItems] = useState<KeybindingItem[]>(() => keymapRegistry.getAll());

  const categoryConfig = useMemo(() => {
    void language;
    return [
      { id: 'all' as const, label: t('keymap.categories.all'), icon: Sparkles },
      { id: 'editing' as const, label: t('keymap.categories.editing'), icon: FileText },
      { id: 'navigation' as const, label: t('keymap.categories.navigation'), icon: Compass },
      { id: 'search' as const, label: t('keymap.categories.search'), icon: Search },
      { id: 'split_view' as const, label: t('keymap.categories.split_view'), icon: Columns },
      { id: 'literary' as const, label: t('keymap.categories.literary'), icon: BookOpen },
      { id: 'system' as const, label: t('keymap.categories.system'), icon: Sliders },
    ];
  }, [language, t]);
  
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

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSearchQuery('');
      setRecordingId(null);
      setRecordedKey('');
      setConflictItem(null);
    }
  }

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
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
        Boolean(item.titleEn && item.titleEn.toLowerCase().includes(q)) ||
        item.description.toLowerCase().includes(q) ||
        Boolean(item.descriptionEn && item.descriptionEn.toLowerCase().includes(q)) ||
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
      eventBus.emit('show-toast', {
        message: language === 'en' ? `Hotkey updated to ${recordedKey}` : `快捷键已修改为 ${recordedKey}`,
        type: 'success',
      });
    }
    setRecordingId(null);
    setRecordedKey('');
    setConflictItem(null);
  };

  const handleResetSingle = (id: string) => {
    keymapRegistry.resetBinding(id);
    eventBus.emit('show-toast', {
      message: language === 'en' ? 'Default hotkey restored' : '已恢复默认按键',
      type: 'info',
    });
    setRecordingId(null);
    setRecordedKey('');
    setConflictItem(null);
  };

  const handleResetAll = () => {
    if (window.confirm(language === 'en' ? 'Are you sure you want to reset all hotkeys to system factory defaults?' : '确定要将所有快捷键重置为系统出厂默认设置吗？')) {
      keymapRegistry.resetAll();
      eventBus.emit('show-toast', { message: t('keymap.resetAllSuccess'), type: 'success' });
    }
  };

  const handleExecute = (item: KeybindingItem) => {
    onClose();
    if (item.run) {
      item.run();
      return;
    }

    const cmd = commandRegistry.get(item.id);
    if (cmd) {
      const targetId = cmd.pluginId || cmd.id;
      const ctx = pluginManager.getPluginContext(targetId) || pluginManager.createPluginContext(targetId);
      cmd.run(ctx);
      return;
    }

    // Fallback switch
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
      case 'focus:toggle': {
        const ctx = pluginManager.getPluginContext('plugin-immersion');
        const current = ctx?.getSetting<boolean>('focusEnabled', false) ?? false;
        const next = !current;
        ctx?.setSetting('focusEnabled', next);
        eventBus.emit('editor-extensions-changed');
        ctx?.showToast(
          language === 'en'
            ? (next ? 'Focus spotlight enabled' : 'Focus spotlight disabled')
            : (next ? '已开启专注聚光灯' : '已关闭专注聚光灯'),
          'info'
        );
        break;
      }
      case 'focus:toggle-scope': {
        const ctx = pluginManager.getPluginContext('plugin-immersion');
        const scopes = ['paragraph', 'sentence', 'horizon'] as const;
        const names = language === 'en'
          ? { paragraph: 'Current Paragraph', sentence: 'Current Sentence', horizon: 'Three-line Horizon' }
          : { paragraph: '当前逻辑段落', sentence: '当前单句推敲', horizon: '三行微光渐变' };
        const current = ctx?.getSetting<(typeof scopes)[number]>('focusScope', 'paragraph') || 'paragraph';
        const next = scopes[(scopes.indexOf(current) + 1) % scopes.length];
        ctx?.setSetting('focusScope', next);
        eventBus.emit('editor-extensions-changed');
        ctx?.showToast(
          language === 'en' ? `Focus scope: ${names[next] || next}` : `聚光范围: ${names[next] || next}`,
          'info'
        );
        break;
      }
      case 'literary:toggle-dialogue': {
        const ctx = pluginManager.getPluginContext('plugin-immersion');
        const current = ctx?.getSetting<boolean>('dialogueEnabled', true) ?? true;
        const next = !current;
        ctx?.setSetting('dialogueEnabled', next);
        eventBus.emit('editor-extensions-changed');
        ctx?.showToast(
          language === 'en'
            ? (next ? 'Dialogue highlight enabled' : 'Dialogue highlight disabled')
            : (next ? '已开启台词高亮' : '已关闭台词高亮'),
          'info'
        );
        break;
      }
      case 'literary:quick-export': {
        const ctx = pluginManager.getPluginContext('plugin-novel-files');
        const exportCmd = commandRegistry.get('novel.export-txt');
        if (exportCmd && ctx) exportCmd.run(ctx);
        break;
      }
      case 'view:toggle-sidebar':
        eventBus.emit('sidebar:toggle');
        break;
      case 'view:toggle-zen':
        eventBus.emit('zen-mode:toggle');
        break;
      case 'view:open-settings':
        eventBus.emit('settings:open');
        break;
      case 'search:toggle-hud':
        eventBus.emit('open-floating-search', { mode: 'search' });
        break;
      case 'search:replace-hud':
        eventBus.emit('open-floating-search', { mode: 'replace' });
        break;
      case 'nav:command-palette':
        eventBus.emit('command-palette:toggle');
        break;
      case 'nav:flight-deck':
        eventBus.emit('quick-search:open');
        break;
      case 'nav:scratchpad':
        eventBus.emit('scratchpad:open');
        break;
      case 'nav:bookshelf':
        eventBus.emit('bookshelf:open');
        break;
      case 'nav:global-search':
        eventBus.emit('global-search:open');
        break;
      case 'novel:import-txt':
        eventBus.emit('novel-import:open');
        break;
      case 'nav:prev-chapter':
        projectStore.navigateToPrevChapter();
        break;
      case 'nav:next-chapter':
        projectStore.navigateToNextChapter();
        break;
      case 'editor:undo':
        eventBus.emit('editor-action:undo');
        break;
      case 'editor:redo':
        eventBus.emit('editor-action:redo');
        break;
      case 'editor:zoom-in': {
        const zoomCmd = commandRegistry.get('typography.font-increase');
        const ctx = pluginManager.getPluginContext('plugin-chinese-typography');
        if (zoomCmd && ctx) zoomCmd.run(ctx);
        break;
      }
      case 'editor:zoom-out': {
        const zoomCmd = commandRegistry.get('typography.font-decrease');
        const ctx = pluginManager.getPluginContext('plugin-chinese-typography');
        if (zoomCmd && ctx) zoomCmd.run(ctx);
        break;
      }
      default:
        eventBus.emit(`keymap:trigger:${item.id}`);
        break;
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
                {language === 'en' ? 'Hotkeys & Keymap Cheatsheet' : '快捷键速查与自定义'}
              </h2>
              <p className="text-xs opacity-50 font-mono mt-0.5">
                {language === 'en'
                  ? 'Click key badge to record new binding · Click ▶ to run action'
                  : '支持点击键位重新录制自定义 · 点击 ▶ 可直接执行功能'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAll}
              title={t('keymap.resetAllTitle')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs opacity-60 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer font-mono"
              style={{ color: theme.colors.text }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t('common.restoreDefault')}</span>
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
              placeholder={t('keymap.searchPlaceholder')}
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
            {categoryConfig.map((cat) => {
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
              {t('keymap.notFound')}
            </div>
          ) : (
            categoryConfig.filter((c) => c.id !== 'all').map((cat) => {
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
                                {language === 'en' && item.titleEn ? item.titleEn : item.title}
                              </span>
                              {item.isCustomized && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300">
                                  {t('keymap.customizedBadge')}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] opacity-45 truncate mt-0.5" title={language === 'en' && item.descriptionEn ? item.descriptionEn : item.description}>
                              {language === 'en' && item.descriptionEn ? item.descriptionEn : item.description}
                            </span>
                          </div>

                          {/* Right: Key Badge & Quick Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isRecording ? (
                              <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                <div className="px-2.5 py-1 rounded-xl text-xs font-mono bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 animate-pulse flex items-center gap-1">
                                  <span>{recordedKey || t('keymap.recordingPrompt')}</span>
                                </div>

                                {conflictItem && (
                                  <span
                                    className="text-amber-400 text-xs flex items-center"
                                    title={t('keymap.conflictWarning')}
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                  </span>
                                )}

                                <button
                                  onClick={() => handleSaveRecording(item.id)}
                                  className="p-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 transition-colors"
                                  title={t('common.save')}
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
                                  title={t('common.cancel')}
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
                                  title={t('keymap.recordNewKey')}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 hover:border-cyan-400/60 transition-all cursor-pointer font-mono text-[11px] select-none hover:scale-105"
                                >
                                  {displayKey.mods.map((m) => (
                                    <kbd key={m} className="opacity-70 font-semibold">
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
                                    title={t('keymap.runActionNow')}
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
                                    title={t('keymap.recordNewKey')}
                                    className="p-1.5 rounded-lg hover:bg-white/10 opacity-60 hover:opacity-100 transition-all cursor-pointer"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>

                                  {item.isCustomized && (
                                    <button
                                      onClick={() => handleResetSingle(item.id)}
                                      title={t('common.restoreDefault')}
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
            <span>{language === 'en' ? '💡 Tip: Click any key badge to record a new binding · Click ▶ to execute command' : '💡 提示：点击任意键位可直接按下新键录制修改 · 点击 ▶ 可直接执行指令'}</span>
          </div>
          <div>
            <span>{language === 'en' ? <>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold">Esc</kbd> to exit</> : <>按 <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold">Esc</kbd> 退出速查</>}</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
