import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Check,
  ChevronDown,
  Palette,
  Columns,
  Minus,
  Square,
  X,
  Minimize2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { projectStore } from '../../core/storage/ProjectStore';
import { fileSystemStore, type DiskSyncStatus } from '../../core/storage/FileSystemStore';
import type { NovelProject } from '../../core/storage/types';
import { eventBus } from '../../core/events/EventBus';
import type { Theme } from '../../core/themes/types';
import { THEMES } from '../../core/themes/themeDefinitions';
import { UlyssesFlightDeck } from './UlyssesFlightDeck';
import { BookshelfModal } from './BookshelfModal';
import { BreadcrumbMicroDropdown } from './BreadcrumbMicroDropdown';
import { useI18n } from '../../core/i18n';

interface Props {
  theme: Theme;
  isSplitViewOpen?: boolean;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
}

export type TitlebarBehavior = 'fade_out' | 'dim' | 'always_visible';

export const TopSeamlessTitlebar: React.FC<Props> = ({
  theme,
  isSplitViewOpen = false,
  onOpenSettings: _onOpenSettings,
  onOpenCommandPalette: _onOpenCommandPalette,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [project, setProject] = useState<NovelProject>(() => projectStore.getProject());
  const [activeChapterId, setActiveChapterId] = useState<string | null>(() => projectStore.getActiveChapter()?.id || null);
  const [isFlightDeckOpen, setIsFlightDeckOpen] = useState<boolean>(false);
  const [isMicroDropdownOpen, setIsMicroDropdownOpen] = useState<boolean>(false);
  const [isBookshelfOpen, setIsBookshelfOpen] = useState<boolean>(false);
  const [showThemePicker, setShowThemePicker] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [diskStatus, setDiskStatus] = useState<DiskSyncStatus>(() => fileSystemStore.getSyncStatus());
  const [isDiskConnected, setIsDiskConnected] = useState<boolean>(() => fileSystemStore.isDiskConnected());
  const [isNearTop, setIsNearTop] = useState<boolean>(false);

  const [titlebarBehavior, setTitlebarBehavior] = useState<TitlebarBehavior>(() => {
    return (localStorage.getItem('novelite_titlebar_behavior') as TitlebarBehavior) || 'fade_out';
  });

  const themePickerRef = useRef<HTMLDivElement | null>(null);
  const themeList = useMemo(() => {
    return Object.values(THEMES).map((t) => ({
      id: t.id,
      name: t.name,
      nameZh: t.nameZh,
      dot: t.colors.accent || t.colors.cursor,
      isDark: t.isDark,
    }));
  }, []);

  useEffect(() => {
    if (!showThemePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target as Node)) {
        setShowThemePicker(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThemePicker]);

  useEffect(() => {
    const handleUpdate = () => {
      setProject({ ...projectStore.getProject() });
      setActiveChapterId(projectStore.getActiveChapter()?.id || null);
    };

    const handleTypingState = (typing: boolean) => {
      setIsTyping(Boolean(typing));
    };

    const handleToggleFlightDeck = () => {
      setIsFlightDeckOpen((prev) => !prev);
    };

    const handleToggleBookshelf = () => {
      setIsBookshelfOpen((prev) => !prev);
    };

    const handleDiskSyncChange = (e: { status: DiskSyncStatus }) => {
      setDiskStatus(e.status);
      setIsDiskConnected(fileSystemStore.isDiskConnected());
    };

    const handleBehaviorChanged = (val: TitlebarBehavior) => {
      setTitlebarBehavior(val);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 20) {
        setIsNearTop(true);
      } else if (e.clientY > 50) {
        setIsNearTop(false);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    const unsubs = [
      eventBus.on('project-tree-changed', handleUpdate),
      eventBus.on('active-chapter-changed', handleUpdate),
      eventBus.on('chapter-content-updated', handleUpdate),
      eventBus.on('typing-state-changed', handleTypingState),
      eventBus.on('quick-search:open', handleToggleFlightDeck),
      eventBus.on('scratchpad:open', () => setIsFlightDeckOpen(true)),
      eventBus.on('bookshelf:open', handleToggleBookshelf),
      eventBus.on('disk-sync-changed', handleDiskSyncChange),
      eventBus.on('titlebar-behavior-changed', handleBehaviorChanged),
      eventBus.on('modal:close-all', () => {
        setIsFlightDeckOpen(false);
        setIsBookshelfOpen(false);
        setIsMicroDropdownOpen(false);
        setShowThemePicker(false);
      }),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    if (typeof window !== 'undefined' && (window as any)['__TAURI_INTERNALS__']) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().toggleMaximize();
        return;
      } catch {
        // Fallback to web fullscreen
      }
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleMinimize = async () => {
    if (typeof window !== 'undefined' && (window as any)['__TAURI_INTERNALS__']) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().minimize();
        return;
      } catch {
        // Fallback
      }
    }
    eventBus.emit('show-toast', { message: isEn ? 'Manuscript auto-saved' : '手稿已自动保存', type: 'info' });
  };

  const handleClose = async () => {
    if (typeof window !== 'undefined' && (window as any)['__TAURI_INTERNALS__']) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
        return;
      } catch {
        // Fallback
      }
    }
    eventBus.emit('show-toast', { message: isEn ? 'Manuscript saved locally' : '手稿已保存至本地', type: 'success' });
  };

  const activeChap = projectStore.getActiveChapter();
  const activeVol = project.volumes.find((v) => v.chapters.some((c) => c.id === activeChapterId)) || project.volumes[0];

  // Compute titlebar opacity based on behavior & typing state & near-top proximity
  let opacityClass = 'opacity-85 hover:opacity-100 pointer-events-auto';
  if (isTyping && !isNearTop) {
    if (titlebarBehavior === 'fade_out') {
      opacityClass = 'opacity-0 pointer-events-none hover:opacity-100 hover:pointer-events-auto';
    } else if (titlebarBehavior === 'dim') {
      opacityClass = 'opacity-20 hover:opacity-100 pointer-events-auto';
    } else {
      opacityClass = 'opacity-85 hover:opacity-100 pointer-events-auto';
    }
  } else if (isNearTop) {
    opacityClass = 'opacity-100 pointer-events-auto';
  }

  return (
    <>
      {/* 🌟 0. Top Edge Proximity Glow Line */}
      {isNearTop && isTyping && (
        <div
          className="fixed top-0 left-0 right-0 h-[1.5px] z-40 animate-pulse pointer-events-none"
          style={{
            background: `linear-gradient(to right, transparent, ${theme.colors.accent || '#38bdf8'}99, transparent)`,
          }}
        />
      )}

      {/* 🌟 1. Seamless Masterpiece Overlay Titlebar (Zero boxy pills, pure typography elegance) */}
      <header
        className={`absolute top-0 left-0 right-0 h-10 w-full flex items-center justify-between px-4 select-none z-30 transition-all duration-300 ease-out bg-transparent pointer-events-none ${opacityClass}`}
      >
        {/* Left: Refined Book Title & Library Manager */}
        <div className="flex items-center gap-1 overflow-hidden flex-1 min-w-[140px] pointer-events-auto">
          <button
            onClick={() => setIsBookshelfOpen(true)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors cursor-pointer group text-xs font-medium opacity-75 hover:opacity-100 hover:bg-white/[0.06]"
            title={isEn ? "Open Bookshelf (Ctrl+Shift+B)" : "打开作品书架 (Ctrl+Shift+B)"}
            style={{ color: theme.colors.text }}
          >
            <span className="tracking-wide max-w-[180px] truncate font-medium">
              {project.title || (isEn ? 'Untitled Novel' : '未命名作品')}
            </span>
            <ChevronDown className="h-3 w-3 opacity-30 group-hover:opacity-80 transition-opacity shrink-0" />
            {isDiskConnected && (
              <span
                className="ml-1.5 flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-full"
                title={
                  isEn
                    ? `Mounted local disk: ${fileSystemStore.getCurrentFolderName()} (${diskStatus === 'syncing' ? 'Syncing' : 'Live sync'})`
                    : `已挂载本地硬盘：${fileSystemStore.getCurrentFolderName()} (${diskStatus === 'syncing' ? '写入中' : '实时同步'})`
                }
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{diskStatus === 'syncing' ? (isEn ? 'Syncing' : '同步中') : (isEn ? 'Local' : '本地')}</span>
              </span>
            )}
          </button>
        </div>

        {/* Center: Ethereal Pure Typography Breadcrumb (Hidden during split view to prevent header collision) */}
        {!isSplitViewOpen && (
          <div className="flex items-center justify-center shrink-0 pointer-events-auto group/stepper">
            {/* Previous Chapter Micro-Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                projectStore.navigateToPrevChapter();
              }}
              className="p-1 rounded-md opacity-0 group-hover/stepper:opacity-40 hover:!opacity-100 hover:bg-white/[0.06] transition-all cursor-pointer mr-1 text-xs"
              title={isEn ? "Previous Chapter (Ctrl+[)" : "上一章 (Ctrl+[)"}
              style={{ color: theme.colors.text }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Breadcrumb Text Trigger */}
            <button
              onClick={() => setIsMicroDropdownOpen(!isMicroDropdownOpen)}
              onContextMenu={(e) => {
                e.preventDefault();
                setIsFlightDeckOpen(true);
              }}
              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/[0.06] text-xs cursor-pointer transition-colors text-center"
              style={{ color: theme.colors.text }}
              title={isEn ? "Click to select chapter (Right-click or Ctrl+J for Flight Deck)" : "点击选择章节 (右键或按 Ctrl+J 打开大纲手稿台)"}
            >
              <span className="opacity-50 group-hover:opacity-80 font-normal tracking-wide">
                {activeVol?.title || (isEn ? 'Vol 1' : '第一卷')}
              </span>
              <span className="opacity-20 font-mono text-[10px] mx-0.5">/</span>
              <span className="opacity-80 group-hover:opacity-100 font-medium tracking-wide">
                {activeChap?.title || (isEn ? 'Chapter 1' : '第一章')}
              </span>
              <span className="text-[10px] font-mono opacity-35 ml-1">
                {isEn ? `(${activeChap?.wordCount || 0} words)` : `(${activeChap?.wordCount || 0}字)`}
              </span>
              <ChevronDown className={`h-3 w-3 opacity-25 group-hover:opacity-70 transition-transform ml-0.5 ${isMicroDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Next Chapter Micro-Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                projectStore.navigateToNextChapter();
              }}
              className="p-1 rounded-md opacity-0 group-hover/stepper:opacity-40 hover:!opacity-100 hover:bg-white/[0.06] transition-all cursor-pointer ml-1 text-xs"
              title={isEn ? "Next Chapter (Ctrl+])" : "下一章 (Ctrl+])"}
              style={{ color: theme.colors.text }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Right: Palette Switcher, Split View & Windows 3 Controls */}
        <div className="flex items-center justify-end gap-1 flex-1 min-w-[140px] pointer-events-auto">
          {/* Split View Toggle Button */}
          <button
            onClick={() => eventBus.emit('split-view:toggle')}
            className="p-1.5 rounded-md opacity-40 hover:opacity-100 hover:bg-white/[0.06] transition-all cursor-pointer"
            title={isEn ? "Toggle Split View (Alt+S)" : "开启/关闭分屏 (Alt+S)"}
            style={{ color: theme.colors.text }}
          >
            <Columns className="h-3.5 w-3.5" />
          </button>

          {/* Global Theme Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="p-1.5 rounded-md opacity-40 hover:opacity-100 hover:bg-white/[0.06] transition-all cursor-pointer"
              title={isEn ? "Switch Theme" : "切换主题风格"}
              style={{ color: theme.colors.text }}
            >
              <Palette className="h-3.5 w-3.5" />
            </button>

            {showThemePicker && (
              <div
                ref={themePickerRef}
                className="absolute right-0 top-8 z-60 w-60 max-h-[calc(100vh-60px)] sm:max-h-[360px] overflow-y-auto rounded-xl border p-1 shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-100 custom-scrollbar"
                style={{
                  backgroundColor: `${theme.colors.bgSecondary}FE`,
                  borderColor: `${theme.colors.border}80`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2.5 py-1 text-[9.5px] opacity-40 font-mono border-b border-white/5">
                  <span>{isEn ? 'Visual Theme' : '视觉风格'}</span>
                </div>
                <div className="py-0.5 space-y-0.5">
                  {themeList.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setShowThemePicker(false);
                        eventBus.emit('theme-changed', t.id);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                        theme.id === t.id ? 'bg-white/10 font-semibold' : 'hover:bg-white/5 opacity-70 hover:opacity-100'
                      }`}
                      style={{ color: theme.colors.text }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: t.dot }} />
                        <span className="font-medium text-xs shrink-0">{isEn ? t.name : t.nameZh}</span>
                        <span className="text-[10px] opacity-40 font-mono truncate">
                          ({isEn ? t.nameZh : t.name})
                        </span>
                      </div>
                      {theme.id === t.id && (
                        <Check className="h-3 w-3 shrink-0" style={{ color: theme.colors.accent || '#38bdf8' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Windows 3 Controls */}
          <div className="flex items-center pl-2 ml-1">
            <button
              onClick={handleMinimize}
              className="p-1.5 rounded-md opacity-40 hover:opacity-100 hover:bg-white/[0.06] transition-all cursor-pointer"
              title={isEn ? "Minimize" : "最小化"}
              style={{ color: theme.colors.text }}
            >
              <Minus className="h-3 w-3" />
            </button>

            <button
              onClick={handleToggleFullscreen}
              className="p-1.5 rounded-md opacity-40 hover:opacity-100 hover:bg-white/[0.06] transition-all cursor-pointer"
              title={isFullscreen ? (isEn ? 'Exit Fullscreen' : '还原窗口') : (isEn ? 'Maximize' : '最大化全屏')}
              style={{ color: theme.colors.text }}
            >
              {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Square className="h-3 w-3" />}
            </button>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-md opacity-40 hover:opacity-100 hover:bg-red-500/80 hover:text-white transition-all cursor-pointer ml-0.5"
              title={isEn ? "Close" : "关闭"}
              style={{ color: theme.colors.text }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      </header>

      {/* 🌟 2. In-Place Micro Dropdown Modal */}
      <BreadcrumbMicroDropdown
        isOpen={isMicroDropdownOpen}
        onClose={() => setIsMicroDropdownOpen(false)}
        theme={theme}
      />

      {/* 🌟 3. Dropped Ulysses Flight Deck Modal */}
      <UlyssesFlightDeck
        isOpen={isFlightDeckOpen}
        onClose={() => setIsFlightDeckOpen(false)}
        theme={theme}
      />

      {/* 🌟 4. Bookshelf Multi-Book Manager Modal */}
      <BookshelfModal
        isOpen={isBookshelfOpen}
        onClose={() => setIsBookshelfOpen(false)}
        theme={theme}
      />
    </>
  );
};
