import type React from 'react';
import type { Extension } from '@codemirror/state';
import type { Theme } from '../themes/types';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  icon?: string;
  defaultEnabled?: boolean;
}

export interface Command {
  id: string;
  pluginId?: string;
  title: string;
  description?: string;
  category?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  run: (ctx: PluginContext) => void | Promise<void>;
}

export interface SidebarTabContribution {
  id: string;
  title: string;
  icon: string; // Lucide icon name: 'BookOpen' | 'Lightbulb' | 'Users' | 'BarChart3' | 'Puzzle' | 'Layers' | 'Sparkles'
  badge?: string | number;
  order?: number;
  render: (ctx: PluginContext, theme: Theme) => React.ReactNode;
}

export interface StatusBarItem {
  id: string;
  alignment: 'left' | 'right';
  order?: number;
  render: (ctx: PluginContext) => React.ReactNode;
}

export interface RightPanelContribution {
  id: string;
  title: string;
  icon?: string;
  order?: number;
  render: (ctx: PluginContext, theme: Theme) => React.ReactNode;
}

export interface ModalContribution {
  id: string;
  title: string;
  width?: string;
  render: (ctx: PluginContext, theme: Theme, onClose: () => void) => React.ReactNode;
}

export interface TextFormatterContribution {
  id: string;
  title: string;
  shortcut?: string;
  format: (text: string) => string;
}

export interface BackgroundRendererContribution {
  id: string;
  name: string;
  render: (theme: Theme, intensity: number) => React.ReactNode;
}

export interface Exporter {
  id: string;
  title: string;
  extension: string;
  export: (project: any) => Promise<{ filename: string; content: string | Blob }>;
}

export interface NovelitePlugin {
  metadata: PluginMetadata;
  init?: (ctx: PluginContext) => void | Promise<void>;
  mount?: (ctx: PluginContext) => void | Promise<void>;
  unmount?: (ctx: PluginContext) => void | Promise<void>;
  getEditorExtensions?: (ctx: PluginContext) => Extension[];
  getSidebarTabs?: (ctx: PluginContext) => SidebarTabContribution[];
  getRightPanels?: (ctx: PluginContext) => RightPanelContribution[];
  getBackgroundRenderers?: (ctx: PluginContext) => BackgroundRendererContribution[];
  getSettingsComponent?: (ctx: PluginContext) => React.ReactNode;
}

export interface PluginContext {
  registerCommand: (command: Command) => () => void;
  registerSidebarTab: (tab: SidebarTabContribution) => () => void;
  registerRightPanel: (panel: RightPanelContribution) => () => void;
  registerStatusBarItem: (item: StatusBarItem) => () => void;
  registerExporter: (exporter: Exporter) => () => void;
  registerModal: (modal: ModalContribution) => () => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId?: string) => void;
  registerFormatter: (formatter: TextFormatterContribution) => () => void;
  registerEditorExtension: (extension: Extension) => () => void;
  registerBackgroundRenderer: (renderer: BackgroundRendererContribution) => () => void;

  getEditorContent: () => string;
  setEditorContent: (content: string) => void;
  getCursorPosition: () => { line: number; col: number; from: number; to: number };
  insertText: (text: string) => void;

  getActiveChapterId: () => string | null;
  getProjectData: () => any;
  saveCurrentChapter: () => void;

  on: (event: string, callback: (...args: any[]) => void) => () => void;
  emit: (event: string, ...args: any[]) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;

  getSetting: <T>(key: string, defaultValue: T) => T;
  setSetting: <T>(key: string, value: T) => void;
}
