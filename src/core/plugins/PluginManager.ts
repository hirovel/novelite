import type { Extension } from '@codemirror/state';
import type { NovelitePlugin, PluginContext, SidebarTabContribution, StatusBarItem, Exporter } from './types';
import { commandRegistry } from './CommandRegistry';
import { eventBus } from '../events/EventBus';

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, NovelitePlugin> = new Map();
  private enabledPluginIds: Set<string> = new Set();
  
  private sidebarTabs: Map<string, SidebarTabContribution> = new Map();
  private statusBarItems: Map<string, StatusBarItem> = new Map();
  private exporters: Map<string, Exporter> = new Map();

  private editorContentGetter: () => string = () => '';
  private editorContentSetter: (c: string) => void = () => {};
  private cursorGetter: () => { line: number; col: number; from: number; to: number } = () => ({ line: 1, col: 1, from: 0, to: 0 });
  private textInserter: (t: string) => void = () => {};
  private activeChapterGetter: () => string | null = () => null;
  private projectDataGetter: () => any = () => null;
  private saveChapterHandler: () => void = () => {};
  private toastHandler: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void = () => {};

  private listeners: Set<() => void> = new Set();

  private constructor() {
    const saved = localStorage.getItem('novelite_enabled_plugins');
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids)) {
          this.enabledPluginIds = new Set(ids);
        }
      } catch (e) {
        console.error('Failed to parse enabled plugins:', e);
      }
    }
  }

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  public setEditorBridges(bridges: {
    getContent: () => string;
    setContent: (c: string) => void;
    getCursor: () => { line: number; col: number; from: number; to: number };
    insertText: (t: string) => void;
    getActiveChapterId: () => string | null;
    getProjectData: () => any;
    saveChapter: () => void;
    showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  }) {
    this.editorContentGetter = bridges.getContent;
    this.editorContentSetter = bridges.setContent;
    this.cursorGetter = bridges.getCursor;
    this.textInserter = bridges.insertText;
    this.activeChapterGetter = bridges.getActiveChapterId;
    this.projectDataGetter = bridges.getProjectData;
    this.saveChapterHandler = bridges.saveChapter;
    this.toastHandler = bridges.showToast;
  }

  public createPluginContext(pluginId: string): PluginContext {
    return {
      registerCommand: (command) => {
        return commandRegistry.register(command);
      },
      registerSidebarTab: (tab) => {
        this.sidebarTabs.set(tab.id, tab);
        this.notify();
        return () => {
          this.sidebarTabs.delete(tab.id);
          this.notify();
        };
      },
      registerStatusBarItem: (item) => {
        this.statusBarItems.set(item.id, item);
        this.notify();
        return () => {
          this.statusBarItems.delete(item.id);
          this.notify();
        };
      },
      registerExporter: (exporter) => {
        this.exporters.set(exporter.id, exporter);
        this.notify();
        return () => {
          this.exporters.delete(exporter.id);
          this.notify();
        };
      },
      getEditorContent: () => this.editorContentGetter(),
      setEditorContent: (c) => this.editorContentSetter(c),
      getCursorPosition: () => this.cursorGetter(),
      insertText: (t) => this.textInserter(t),
      getActiveChapterId: () => this.activeChapterGetter(),
      getProjectData: () => this.projectDataGetter(),
      saveCurrentChapter: () => this.saveChapterHandler(),
      on: (event, cb) => eventBus.on(event, cb),
      emit: (event, ...args) => eventBus.emit(event, ...args),
      showToast: (msg, type) => this.toastHandler(msg, type),
      getSetting: <T>(key: string, defaultValue: T): T => {
        const fullKey = `novelite_plugin_${pluginId}_${key}`;
        const val = localStorage.getItem(fullKey);
        if (val === null) return defaultValue;
        try {
          return JSON.parse(val);
        } catch {
          return defaultValue;
        }
      },
      setSetting: <T>(key: string, value: T): void => {
        const fullKey = `novelite_plugin_${pluginId}_${key}`;
        localStorage.setItem(fullKey, JSON.stringify(value));
        eventBus.emit(`plugin-setting-changed:${pluginId}`, { key, value });
      },
    };
  }

  public registerPlugin(plugin: NovelitePlugin): void {
    this.plugins.set(plugin.metadata.id, plugin);
    
    if (!localStorage.getItem('novelite_enabled_plugins')) {
      if (plugin.metadata.defaultEnabled !== false) {
        this.enabledPluginIds.add(plugin.metadata.id);
      }
    }

    if (this.isPluginEnabled(plugin.metadata.id)) {
      const ctx = this.createPluginContext(plugin.metadata.id);
      plugin.init?.(ctx);
      plugin.mount?.(ctx);

      if (plugin.getSidebarTabs) {
        const tabs = plugin.getSidebarTabs(ctx);
        tabs.forEach((tab) => this.sidebarTabs.set(tab.id, tab));
      }
    }

    eventBus.emit('plugins-changed');
    this.notify();
  }

  public enablePlugin(id: string): void {
    const plugin = this.plugins.get(id);
    if (!plugin || this.enabledPluginIds.has(id)) return;

    this.enabledPluginIds.add(id);
    this.saveEnabledPlugins();
    
    const ctx = this.createPluginContext(id);
    plugin.init?.(ctx);
    plugin.mount?.(ctx);

    if (plugin.getSidebarTabs) {
      const tabs = plugin.getSidebarTabs(ctx);
      tabs.forEach((tab) => this.sidebarTabs.set(tab.id, tab));
    }

    eventBus.emit('plugins-changed');
    this.notify();
  }

  public disablePlugin(id: string): void {
    const plugin = this.plugins.get(id);
    if (!plugin || !this.enabledPluginIds.has(id)) return;

    this.enabledPluginIds.delete(id);
    this.saveEnabledPlugins();

    const ctx = this.createPluginContext(id);
    plugin.unmount?.(ctx);

    if (plugin.getSidebarTabs) {
      const tabs = plugin.getSidebarTabs(ctx);
      tabs.forEach((tab) => this.sidebarTabs.delete(tab.id));
    }

    eventBus.emit('plugins-changed');
    this.notify();
  }

  public togglePlugin(id: string): void {
    if (this.isPluginEnabled(id)) {
      this.disablePlugin(id);
    } else {
      this.enablePlugin(id);
    }
  }

  public isPluginEnabled(id: string): boolean {
    return this.enabledPluginIds.has(id);
  }

  public getAllPlugins(): NovelitePlugin[] {
    return Array.from(this.plugins.values());
  }

  public getEnabledPlugins(): NovelitePlugin[] {
    return Array.from(this.plugins.values()).filter((p) => this.enabledPluginIds.has(p.metadata.id));
  }

  public getEditorExtensions(): Extension[] {
    const extensions: Extension[] = [];
    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.getEditorExtensions) {
        const ctx = this.createPluginContext(plugin.metadata.id);
        const exts = plugin.getEditorExtensions(ctx);
        if (exts) {
          extensions.push(...exts);
        }
      }
    }
    return extensions;
  }

  public getSidebarTabs(): SidebarTabContribution[] {
    return Array.from(this.sidebarTabs.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public getStatusBarItems(): StatusBarItem[] {
    return Array.from(this.statusBarItems.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public getExporters(): Exporter[] {
    return Array.from(this.exporters.values());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private saveEnabledPlugins(): void {
    localStorage.setItem('novelite_enabled_plugins', JSON.stringify(Array.from(this.enabledPluginIds)));
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}

export const pluginManager = PluginManager.getInstance();
