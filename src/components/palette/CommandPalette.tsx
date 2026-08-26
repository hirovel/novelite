import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Terminal } from 'lucide-react';
import { commandRegistry } from '../../core/plugins/CommandRegistry';
import { projectStore } from '../../core/storage/ProjectStore';
import { pluginManager } from '../../core/plugins/PluginManager';
import type { Theme } from '../../core/themes/types';
import { KeyboardShortcutBadge } from '../common/KeyboardShortcutBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}

interface PaletteItem {
  id: string;
  type: 'chapter' | 'command';
  title: string;
  subtitle?: string;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC<Props> = ({ isOpen, onClose, theme }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let enterTimer: ReturnType<typeof setTimeout>;
    let exitTimer: ReturnType<typeof setTimeout>;

    if (isOpen) {
      enterTimer = setTimeout(() => {
        setShouldRender(true);
        setIsAnimatingIn(true);
        inputRef.current?.focus();
      }, 0);
    } else {
      enterTimer = setTimeout(() => {
        setIsAnimatingIn(false);
      }, 0);
      exitTimer = setTimeout(() => {
        setShouldRender(false);
        setQuery('');
      }, 220);
    }

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  const items: PaletteItem[] = [];
  const project = projectStore.getProject();

  // 1. Chapters
  project.volumes.forEach((vol) => {
    vol.chapters.forEach((chap) => {
      items.push({
        id: `chap_${chap.id}`,
        type: 'chapter',
        title: chap.title,
        subtitle: `${vol.title} • ${chap.wordCount || 0} 字`,
        action: () => {
          projectStore.setActiveChapter(chap.id);
          onClose();
        },
      });
    });
  });

  // 2. Registered Commands
  const commands = commandRegistry.getAll();
  commands.forEach((cmd) => {
    items.push({
      id: `cmd_${cmd.id}`,
      type: 'command',
      title: cmd.title,
      subtitle: cmd.category || '快捷命令',
      shortcut: cmd.shortcut,
      action: () => {
        const ctx = pluginManager.createPluginContext('command-palette');
        cmd.run(ctx);
        onClose();
      },
    });
  });

  const filtered = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 select-none p-4 transition-all duration-200 ease-out ${
        isAnimatingIn
          ? 'bg-black/80 backdrop-blur-xl opacity-100'
          : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl flex flex-col max-h-[75vh] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isAnimatingIn
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 -translate-y-3'
        }`}
        style={{
          backgroundColor: theme.colors.bgSecondary,
          borderColor: `${theme.colors.border}cc`,
          boxShadow: `0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px ${theme.colors.accentGlow}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div
          className="flex items-center gap-3 border-b px-5 py-4 bg-black/20"
          style={{ borderColor: `${theme.colors.border}80` }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: theme.colors.accent }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="搜索章节、跳转或执行命令... (支持 Esc 退出)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40 font-mono tracking-tight"
            style={{ color: theme.colors.text }}
          />
          <div className="flex items-center gap-1.5 font-mono text-[10px] opacity-60">
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 shadow-xs">Esc</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 shadow-xs">↵</kbd>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs opacity-40 font-mono">
              未找到匹配的章节或指令
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs cursor-pointer transition-all ${
                    isSelected ? 'font-medium shadow-xs' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isSelected ? theme.colors.bgHover : 'transparent',
                    color: isSelected ? theme.colors.text : theme.colors.textMuted,
                  }}
                >
                  {/* Left Indicator */}
                  {isSelected && (
                    <span
                      className="absolute left-1 top-2 bottom-2 w-1 rounded-full shadow-[0_0_8px_currentColor]"
                      style={{ backgroundColor: theme.colors.accent, color: theme.colors.accent }}
                    />
                  )}

                  <div className="flex items-center gap-3 overflow-hidden pl-1.5">
                    {item.type === 'chapter' ? (
                      <FileText
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: isSelected ? theme.colors.accent : 'inherit', opacity: isSelected ? 1 : 0.6 }}
                      />
                    ) : (
                      <Terminal
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: theme.colors.accent, opacity: isSelected ? 1 : 0.7 }}
                      />
                    )}
                    <div className="truncate">
                      <span style={{ color: isSelected ? theme.colors.text : 'inherit' }}>
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="ml-2 text-[10.5px] opacity-45 font-mono">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.shortcut && (
                    <KeyboardShortcutBadge shortcut={item.shortcut} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div
          className="flex items-center justify-between border-t px-5 py-2.5 text-[10px] font-mono opacity-50 bg-black/30"
          style={{ borderColor: `${theme.colors.border}80` }}
        >
          <div className="flex items-center gap-3">
            <span>↑↓ 切换选择</span>
            <span>↵ 立即跳转</span>
          </div>
          <span>Novelite Command Hub</span>
        </div>
      </div>
    </div>
  );
};
