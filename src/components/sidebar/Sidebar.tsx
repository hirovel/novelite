import React, { useState, useEffect } from 'react';
import { NovelTree } from './NovelTree';
import type { Theme } from '../../core/themes/types';
import { pluginManager } from '../../core/plugins/PluginManager';
import { eventBus } from '../../core/events/EventBus';
import {
  BookOpen,
  Sparkles,
  Puzzle,
  ChevronLeft,
  Settings,
  Layers,
} from 'lucide-react';
import { ScratchpadPanel } from '../../plugins/scratchpad/ScratchpadPanel';

interface Props {
  theme: Theme;
  isOpen: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}

const BUILTIN_TABS = [
  { id: 'tree', label: '目录', icon: BookOpen, tooltip: '卷章大纲与文稿管理' },
  { id: 'scratchpad', label: '便签', icon: Sparkles, tooltip: '灵感便签与素材随记' },
  { id: 'plugins', label: '扩展', icon: Puzzle, tooltip: '扩展生态与插件管理' },
];

export const Sidebar: React.FC<Props> = ({ theme, isOpen, onToggle, onOpenSettings }) => {
  const [activeTab, setActiveTab] = useState<string>('tree');
  const [plugins, setPlugins] = useState(pluginManager.getAllPlugins());
  const [pluginTabs, setPluginTabs] = useState(pluginManager.getSidebarTabs());

  useEffect(() => {
    const handlePluginsChange = () => {
      setPlugins([...pluginManager.getAllPlugins()]);
      setPluginTabs([...pluginManager.getSidebarTabs()]);
    };

    handlePluginsChange();

    const unsubBus = eventBus.on('plugins-changed', handlePluginsChange);
    const unsubManager = pluginManager.subscribe(handlePluginsChange);
    return () => {
      unsubBus();
      unsubManager();
    };
  }, []);

  if (!isOpen) return null;

  // Dynamic context for plugin rendering
  const dummyCtx = pluginManager.createPluginContext('sidebar-coordinator');

  return (
    <aside
      className="flex h-full w-64 md:w-72 flex-col border-r shrink-0 select-none z-10 transition-all shadow-lg"
      style={{
        backgroundColor: theme.colors.bgSecondary,
        borderColor: `${theme.colors.border}80`,
      }}
    >
      {/* 🌟 Top Luxury Segmented Icon Dock */}
      <div
        className="flex items-center justify-between border-b px-2.5 py-2 backdrop-blur-md bg-black/20"
        style={{ borderColor: `${theme.colors.border}70` }}
      >
        {/* Tab Buttons Strip */}
        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/5 flex-1 overflow-x-auto scrollbar-none">
          {BUILTIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.tooltip}
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
                <span className="text-[11px] truncate">{tab.label}</span>

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

          {/* Third-party plugin contributed sidebar tabs */}
          {pluginTabs
            .filter((pt) => !BUILTIN_TABS.some((bt) => bt.id === pt.id))
            .map((pt) => {
              const isActive = activeTab === pt.id;
              return (
                <button
                  key={pt.id}
                  onClick={() => setActiveTab(pt.id)}
                  title={pt.title}
                  className={`relative flex items-center justify-center gap-1 flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    isActive ? 'shadow-xs font-semibold' : 'opacity-50 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isActive ? theme.colors.bgHover : 'transparent',
                    color: isActive ? theme.colors.accent : theme.colors.textMuted,
                  }}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span className="text-[11px] truncate">{pt.title}</span>
                </button>
              );
            })}
        </div>

        {/* Collapse Sidebar Button */}
        <button
          onClick={onToggle}
          title="折叠边栏 (Ctrl+B)"
          className="ml-2 p-1.5 rounded-lg hover:bg-white/10 opacity-60 hover:opacity-100 transition-all hover:scale-105 active:scale-95"
          style={{ color: theme.colors.text }}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* 🌟 Tab Content Panels */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'tree' && <NovelTree theme={theme} />}

        {activeTab === 'scratchpad' && <ScratchpadPanel ctx={dummyCtx} theme={theme} />}

        {activeTab === 'plugins' && (
          <div className="flex h-full flex-col p-3 text-xs overflow-y-auto space-y-3">
            <div className="flex items-center justify-between opacity-70 font-mono text-[11px] pb-1 border-b border-white/5">
              <span>已载入扩展插件 ({plugins.length})</span>
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Settings className="h-3 w-3" />
                <span>配置</span>
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
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isEnabled ? '#34d399' : '#737373' }} />
                        <span className="font-semibold text-xs" style={{ color: theme.colors.text }}>
                          {p.metadata.name}
                        </span>
                      </div>

                      <button
                        onClick={() => pluginManager.togglePlugin(p.metadata.id)}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono transition-all font-semibold ${
                          isEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xs'
                            : 'bg-white/5 text-neutral-400 border border-white/5'
                        }`}
                      >
                        {isEnabled ? '已启用' : '已禁用'}
                      </button>
                    </div>

                    <p className="text-[10.5px] leading-relaxed opacity-60 mt-1 font-sans" style={{ color: theme.colors.textMuted }}>
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
        )}

        {/* Dynamic Plugin Tab Rendering */}
        {pluginTabs.map((pt) => {
          if (activeTab === pt.id && !BUILTIN_TABS.some((bt) => bt.id === pt.id)) {
            return (
              <div key={pt.id} className="h-full w-full overflow-hidden">
                {pt.render(dummyCtx, theme)}
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* 🌟 Bottom Quick Preferences Action */}
      <div
        className="border-t p-2 px-3 bg-black/20 flex items-center justify-between text-xs"
        style={{ borderColor: `${theme.colors.border}60` }}
      >
        <span className="text-[11px] font-mono opacity-50">Novelite Literary Engine</span>
        <button
          onClick={onOpenSettings}
          title="打开偏好设置 (Ctrl+,)"
          className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 opacity-60 hover:opacity-100 transition-all hover:scale-105"
          style={{ color: theme.colors.text }}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
};
