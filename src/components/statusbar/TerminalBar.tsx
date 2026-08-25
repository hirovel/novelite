import React, { useState, useEffect } from 'react';
import type { Theme } from '../../core/themes/types';
import { projectStore } from '../../core/storage/ProjectStore';
import { pluginManager } from '../../core/plugins/PluginManager';
import { eventBus } from '../../core/events/EventBus';
import { Settings, Maximize2, Minimize2, Sparkles, Sidebar as SidebarIcon } from 'lucide-react';

interface Props {
  theme: Theme;
  cursorShape: 'beam' | 'block' | 'underline';
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isZenMode: boolean;
  onToggleZenMode: () => void;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
}

export const TerminalBar: React.FC<Props> = ({
  theme,
  cursorShape,
  isSidebarOpen,
  onToggleSidebar,
  isZenMode,
  onToggleZenMode,
  onOpenSettings,
  onOpenCommandPalette,
}) => {
  const [activeChapTitle, setActiveChapTitle] = useState<string>('');
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const [statusBarItems, setStatusBarItems] = useState(pluginManager.getStatusBarItems());
  const [isSaved, setIsSaved] = useState<boolean>(true);

  useEffect(() => {
    const updateChapter = () => {
      const chap = projectStore.getActiveChapter();
      setActiveChapTitle(chap?.title || '无活跃章节');
    };

    updateChapter();

    const unsub1 = eventBus.on('active-chapter-changed', updateChapter);
    const unsub2 = eventBus.on('project-tree-changed', updateChapter);
    const unsub3 = eventBus.on('cursor-moved', (pos: any) => {
      if (pos) setCursorPos({ line: pos.line, col: pos.col });
    });
    const unsub4 = eventBus.on('chapter-content-updated', () => {
      setIsSaved(false);
    });
    const unsub5 = eventBus.on('project-saved', () => {
      setIsSaved(true);
    });
    const unsub6 = pluginManager.subscribe(() => {
      setStatusBarItems(pluginManager.getStatusBarItems());
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
    };
  }, []);

  const shapeLabels = {
    beam: 'Live 光柱',
    block: 'Live 色块',
    underline: 'Live 下划线',
  };

  const pluginCtx = pluginManager.createPluginContext('terminal-bar');

  return (
    <footer
      className="flex h-7 w-full items-center justify-between border-t px-3 text-[11px] font-mono select-none shrink-0 z-10 transition-colors"
      style={{
        backgroundColor: theme.colors.statusbarBg,
        borderColor: theme.colors.border,
        color: theme.colors.statusbarText,
      }}
    >
      {/* Left Items */}
      <div className="flex items-center gap-2.5 overflow-hidden">
        {/* Toggle Sidebar */}
        <button
          onClick={onToggleSidebar}
          title="切换侧边栏 (Ctrl+B)"
          className="flex items-center gap-1 hover:text-white px-1 py-0.5 rounded transition-colors"
        >
          <SidebarIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-[10.5px] opacity-70">
            {isSidebarOpen ? '收起' : '展开'}
          </span>
        </button>

        <span className="opacity-20">|</span>

        {/* Current Active Chapter & Save Status Dot */}
        <div
          onClick={onOpenCommandPalette}
          title="搜索章节 (Ctrl+P)"
          className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors truncate"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
              isSaved ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="truncate font-medium">{activeChapTitle}</span>
        </div>

        {/* Dynamic Registered Left status items (Word Counter) */}
        {statusBarItems
          .filter((item) => item.alignment === 'left')
          .map((item) => (
            <React.Fragment key={item.id}>
              <span className="opacity-20">|</span>
              {item.render(pluginCtx)}
            </React.Fragment>
          ))}
      </div>

      {/* Right Items */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Dynamic Right status items */}
        {statusBarItems
          .filter((item) => item.alignment === 'right')
          .map((item) => (
            <React.Fragment key={item.id}>
              {item.render(pluginCtx)}
              <span className="opacity-20">|</span>
            </React.Fragment>
          ))}

        {/* Line & Column */}
        <div className="hidden sm:flex items-center gap-1 opacity-65 text-[10.5px]">
          <span>Ln {cursorPos.line}</span>
          <span className="opacity-40">:</span>
          <span>Col {cursorPos.col}</span>
        </div>

        <span className="hidden sm:inline opacity-20">|</span>

        {/* Cursor Shape Badge */}
        <button
          onClick={onOpenSettings}
          title="Live 动态光标设置 (Ctrl+,)"
          className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
        >
          <Sparkles className="h-3 w-3" style={{ color: theme.colors.accent }} />
          <span className="text-[10px]">{shapeLabels[cursorShape] || 'Live 光标'}</span>
        </button>

        {/* Theme pill */}
        <button
          onClick={onOpenSettings}
          title="主题设置"
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
        >
          <span
            className="h-2 w-2 rounded-full shadow-xs"
            style={{ backgroundColor: theme.colors.accent }}
          />
          <span className="hidden md:inline text-[10.5px]">{theme.name}</span>
        </button>

        {/* Zen Mode Button */}
        <button
          onClick={onToggleZenMode}
          title="全屏模式 (F11 / Alt+Z)"
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
        >
          {isZenMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="偏好设置 (Ctrl+,)"
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
    </footer>
  );
};
