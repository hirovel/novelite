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
  title: string;
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
  getSettingsComponent?: (ctx: PluginContext) => React.ReactNode;
}

export interface PluginContext {
  registerCommand: (command: Command) => () => void;
  registerSidebarTab: (tab: SidebarTabContribution) => () => void;
  registerStatusBarItem: (item: StatusBarItem) => () => void;
  registerExporter: (exporter: Exporter) => () => void;

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
