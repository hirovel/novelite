import React, { useState, useEffect } from 'react';
import type { Theme } from '../../core/themes/types';
import { pluginManager } from '../../core/plugins/PluginManager';
import { eventBus } from '../../core/events/EventBus';
import { useI18n } from '../../core/i18n';
import {
  BookOpen,
  Sparkles,
  Puzzle,
  ChevronLeft,
  Settings,
  Layers,
  Users,
  Lightbulb,
  BarChart3,
} from 'lucide-react';

interface Props {
  theme: Theme;
  isOpen: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}

const ICON_MAP: Record<string, any> = {
  BookOpen,
  Sparkles,
  Puzzle,
  Layers,
  Users,
  Lightbulb,
  BarChart3,
};

export const Sidebar: React.FC<Props> = ({ theme, isOpen, onToggle, onOpenSettings }) => {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [pluginTabs, setPluginTabs] = useState(() => pluginManager.getSidebarTabs());
  const [plugins, setPlugins] = useState(() => pluginManager.getAllPlugins());
  const [activeTab, setActiveTab] = useState<string>(() => {
    const tabs = pluginManager.getSidebarTabs();
    return tabs[0]?.id || 'plugins-manager';
  });

  useEffect(() => {
    const handleUpdate = () => {
      const tabs = pluginManager.getSidebarTabs();
      setPluginTabs([...tabs]);
      setPlugins([...pluginManager.getAllPlugins()]);
      setActiveTab((cur) => {
        if (cur === 'plugins-manager') return cur;
        if (tabs.some((t) => t.id === cur)) return cur;
        return tabs[0]?.id || 'plugins-manager';
      });
    };

    handleUpdate();

    const unsubBus = eventBus.on('plugins-changed', handleUpdate);
    const unsubManager = pluginManager.subscribe(handleUpdate);
    return () => {
      unsubBus();
      unsubManager();
    };
  }, []);

  const dummyCtx = pluginManager.createPluginContext('sidebar-coordinator');

  return (
    <aside
      className={`h-full shrink-0 select-none z-10 shadow-lg overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isOpen
          ? 'w-64 md:w-72 opacity-100 border-r pointer-events-auto'
          : 'w-0 opacity-0 border-r-0 pointer-events-none'
      }`}
      style={{
        backgroundColor: theme.colors.bgSecondary,
        borderColor: `${theme.colors.border}80`,
      }}
    >
      <div className="w-64 md:w-72 h-full flex flex-col shrink-0">
      {/* 🌟 Top Dynamic Segmented Icon Dock */}
      <div
        className="flex items-center justify-between border-b px-2.5 py-2 backdrop-blur-md bg-black/20"
        style={{ borderColor: `${theme.colors.border}70` }}
      >
        {/* Tab Buttons Strip */}
        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/5 flex-1 overflow-x-auto scrollbar-none">
          {pluginTabs.map((tab) => {
            const Icon = ICON_MAP[tab.icon] || Layers;
            const isActive = activeTab === tab.id;
            const displayTitle = isEn && tab.titleEn ? tab.titleEn : tab.title;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={displayTitle}
                className={`group relative flex items-center justify-center gap-1.5 flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'shadow-xs font-semibold'
                    : 'opacity-50 hover:opacity-100 hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: isActive ? theme.colors.bgHover : 'transparent',
                  color: isActive ? theme.colors.accent : theme.colors.textMuted,
                }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[11px] truncate">{displayTitle}</span>

                {/* Active Indicator Line */}
                {isActive && (
                  <div
                    className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full shadow-xs"
                    style={{ backgroundColor: theme.colors.accent }}
                  />
                )}
              </button>
            );
          })}

          {/* Built-in Plugin Ecosystem Management Tab */}
          <button
            onClick={() => setActiveTab('plugins-manager')}
            title={isEn ? 'Extensions & Plugin Ecosystem' : '插件生态与扩展管理'}
            className={`group relative flex items-center justify-center gap-1.5 flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'plugins-manager'
                ? 'shadow-xs font-semibold'
                : 'opacity-50 hover:opacity-100 hover:bg-white/5'
            }`}
            style={{
              backgroundColor: activeTab === 'plugins-manager' ? theme.colors.bgHover : 'transparent',
              color: activeTab === 'plugins-manager' ? theme.colors.accent : theme.colors.textMuted,
            }}
          >
            <Puzzle className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[11px] truncate">{isEn ? 'Extensions' : '扩展'}</span>
            {activeTab === 'plugins-manager' && (
              <div
                className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full shadow-xs"
                style={{ backgroundColor: theme.colors.accent }}
              />
            )}
          </button>
        </div>

        {/* Collapse Sidebar Button */}
        <button
          onClick={onToggle}
          title={isEn ? 'Collapse Sidebar (Ctrl+B)' : '折叠边栏 (Ctrl+B)'}
          className="ml-2 p-1.5 rounded-lg hover:bg-white/10 opacity-60 hover:opacity-100 transition-all hover:scale-105 active:scale-95"
          style={{ color: theme.colors.text }}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* 🌟 Tab Content Panels */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'plugins-manager' ? (
          <div className="flex h-full flex-col p-3 text-xs overflow-y-auto space-y-3">
            <div className="flex items-center justify-between opacity-70 font-mono text-[11px] pb-1 border-b border-white/5">
              <span>{isEn ? `Loaded Plugins (${plugins.length})` : `已载入插件 (${plugins.length})`}</span>
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <Settings className="h-3 w-3" />
                <span>{isEn ? 'Preferences' : '偏好设置'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {plugins.map((p) => {
                const isEnabled = pluginManager.isPluginEnabled(p.metadata.id);
                return (
                  <div
                    key={p.metadata.id}
                    className="flex flex-col gap-1 rounded-xl border p-3 transition-all hover:border-white/20"
                    style={{
                      backgroundColor: theme.colors.bg,
                      borderColor: isEnabled ? `${theme.colors.accent}40` : theme.colors.border,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: isEnabled ? '#34d399' : '#737373' }}
                        />
                        <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                          {p.metadata.name}
                        </span>
                      </div>

                      <button
                        onClick={() => pluginManager.togglePlugin(p.metadata.id)}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono transition-all font-semibold cursor-pointer ${
                          isEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xs'
                            : 'bg-white/5 text-neutral-400 border border-white/5'
                        }`}
                      >
                        {isEn ? (isEnabled ? 'Enabled' : 'Disabled') : (isEnabled ? '已启用' : '已禁用')}
                      </button>
                    </div>

                    <p
                      className="text-[10.5px] leading-relaxed opacity-60 mt-1 font-sans"
                      style={{ color: theme.colors.textMuted }}
                    >
                      {p.metadata.description}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9.5px] font-mono opacity-40">
                      <span>v{p.metadata.version}</span>
                      <span>{p.metadata.author || 'Novelite Core'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          pluginTabs.map((pt) => {
            if (activeTab === pt.id) {
              return (
                <div key={pt.id} className="h-full w-full overflow-hidden">
                  {pt.render(dummyCtx, theme)}
                </div>
              );
            }
            return null;
          })
        )}
      </div>

      {/* 🌟 Bottom Quick Action */}
      <div
        className="border-t p-2 px-3 bg-black/20 flex items-center justify-between text-xs"
        style={{ borderColor: `${theme.colors.border}60` }}
      >
        <span className="text-[11px] font-mono opacity-50">Novelite Microkernel 2.0</span>
        <button
          onClick={onOpenSettings}
          title={isEn ? "Preferences (Ctrl+,)" : "打开偏好设置 (Ctrl+,)"}
          className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 opacity-60 hover:opacity-100 transition-all hover:scale-105"
          style={{ color: theme.colors.text }}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </aside>
  );
};
