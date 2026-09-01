import type { Extension } from '@codemirror/state';
import type {
  NovelitePlugin,
  PluginContext,
  SidebarTabContribution,
  RightPanelContribution,
  StatusBarItem,
  Exporter,
  ModalContribution,
  TextFormatterContribution,
  BackgroundRendererContribution,
} from './types';
import { commandRegistry } from './CommandRegistry';
import { keymapRegistry } from '../keymap/KeymapRegistry';
import { eventBus } from '../events/EventBus';

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, NovelitePlugin> = new Map();
  private enabledPluginIds: Set<string> = new Set();
  private explicitStates: Map<string, boolean> = new Map();
  
  private sidebarTabs: Map<string, SidebarTabContribution> = new Map();
  private rightPanels: Map<string, RightPanelContribution> = new Map();
  private statusBarItems: Map<string, StatusBarItem> = new Map();
  private exporters: Map<string, Exporter> = new Map();
  private modals: Map<string, ModalContribution> = new Map();
  private formatters: Map<string, TextFormatterContribution> = new Map();
  private backgroundRenderers: Map<string, BackgroundRendererContribution> = new Map();
  private dynamicExtensions: Extension[] = [];
  private activeModalId: string | null = null;
  private pluginDisposables: Map<string, (() => void)[]> = new Map();

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
    this.loadPluginStates();
  }

  private loadPluginStates(): void {
    try {
      const savedStates = localStorage.getItem('novelite_plugin_states');
      if (savedStates) {
        const parsed = JSON.parse(savedStates);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.entries(parsed).forEach(([id, enabled]) => {
            this.explicitStates.set(id, Boolean(enabled));
          });
        }
      } else {
        const oldSaved = localStorage.getItem('novelite_enabled_plugins');
        if (oldSaved) {
          const ids = JSON.parse(oldSaved);
          if (Array.isArray(ids)) {
            ids.forEach((id) => this.explicitStates.set(id, true));
          }
        }
      }
    } catch (e) {
      console.error('Failed to load plugin states:', e);
    }
  }

  private savePluginStates(): void {
    try {
      const obj: Record<string, boolean> = {};
      this.explicitStates.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem('novelite_plugin_states', JSON.stringify(obj));
      localStorage.setItem('novelite_enabled_plugins', JSON.stringify(Array.from(this.enabledPluginIds)));
    } catch (e) {
      console.error('Failed to save plugin states:', e);
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

  private addDisposable(pluginId: string, fn: () => void): () => void {
    if (!this.pluginDisposables.has(pluginId)) {
      this.pluginDisposables.set(pluginId, []);
    }
    this.pluginDisposables.get(pluginId)!.push(fn);
    return () => {
      fn();
      const list = this.pluginDisposables.get(pluginId);
      if (list) {
        this.pluginDisposables.set(pluginId, list.filter((item) => item !== fn));
      }
    };
  }

  private disposePluginResources(pluginId: string): void {
    const list = this.pluginDisposables.get(pluginId);
    if (list) {
      list.forEach((cleanup) => {
        try {
          cleanup();
        } catch (err) {
          console.error(`[PluginManager] Error disposing resource for ${pluginId}:`, err);
        }
      });
      this.pluginDisposables.delete(pluginId);
    }
  }

  public createPluginContext(pluginId: string): PluginContext {
    return {
      registerCommand: (command) => {
        const unbindCmd = commandRegistry.register({
          ...command,
          pluginId,
        });
        let unbindKeymap: (() => void) | null = null;
        if (command.shortcut) {
          unbindKeymap = keymapRegistry.register({
            id: command.id,
            title: command.title,
            description: command.description || `${command.title} (${pluginId})`,
            category: 'system',
            scope: 'global',
            defaultKey: command.shortcut,
            run: () => {
              const ctx = this.createPluginContext(pluginId);
              command.run(ctx);
            },
          });
        }
        const unbind = () => {
          unbindCmd();
          if (unbindKeymap) unbindKeymap();
        };
        return this.addDisposable(pluginId, unbind);
      },
      registerSidebarTab: (tab) => {
        this.sidebarTabs.set(tab.id, tab);
        this.notify();
        const unbind = () => {
          this.sidebarTabs.delete(tab.id);
          this.notify();
        };
        return this.addDisposable(pluginId, unbind);
      },
      registerRightPanel: (panel) => {
        this.rightPanels.set(panel.id, panel);
        this.notify();
        const unbind = () => {
          this.rightPanels.delete(panel.id);
          this.notify();
        };
        return this.addDisposable(pluginId, unbind);
      },
      registerStatusBarItem: (item) => {
        this.statusBarItems.set(item.id, item);
        this.notify();
        const unbind = () => {
          this.statusBarItems.delete(item.id);
          this.notify();
        };
        return this.addDisposable(pluginId, unbind);
      },
      registerExporter: (exporter) => {
        this.exporters.set(exporter.id, exporter);
        this.notify();
        const unbind = () => {
          this.exporters.delete(exporter.id);
          this.notify();
        };
        return this.addDisposable(pluginId, unbind);
      },
      registerModal: (modal) => {
        this.modals.set(modal.id, modal);
        this.notify();
        const unbind = () => {
          this.modals.delete(modal.id);
          this.notify();
        };
        return this.addDisposable(pluginId, unbind);
      },
      openModal: (modalId) => {
        this.activeModalId = modalId;
        eventBus.emit('open-plugin-modal', modalId);
        this.notify();
      },
      closeModal: (modalId) => {
        if (!modalId || this.activeModalId === modalId) {
          this.activeModalId = null;
          eventBus.emit('close-plugin-modal');
          this.notify();
        }
      },
      registerFormatter: (formatter) => {
        this.formatters.set(formatter.id, formatter);
        let unregCmd: (() => void) | null = null;
        let unbindKeymap: (() => void) | null = null;
        if (formatter.shortcut) {
          unregCmd = commandRegistry.register({
            id: `formatter.${formatter.id}`,
            title: `排版: ${formatter.title}`,
            category: '排版沉浸',
            shortcut: formatter.shortcut,
            run: (c) => {
              const current = c.getEditorContent();
              const formatted = formatter.format(current);
              if (formatted !== current) {
                c.setEditorContent(formatted);
                c.showToast(`已执行「${formatter.title}」`, 'success');
              }
            },
          });
          unbindKeymap = keymapRegistry.register({
            id: `formatter.${formatter.id}`,
            title: `排版: ${formatter.title}`,
            description: `智能排版格式化 (${formatter.title})`,
            category: 'literary',
            scope: 'global',
            defaultKey: formatter.shortcut,
            run: () => {
              const current = this.editorContentGetter ? this.editorContentGetter() : '';
              const formatted = formatter.format(current);
              if (formatted !== current && this.editorContentSetter) {
                this.editorContentSetter(formatted);
                this.toastHandler?.(`已执行「${formatter.title}」`, 'success');
              }
            },
          });
        }
        this.notify();
        const unbind = () => {
          if (unregCmd) unregCmd();
          if (unbindKeymap) unbindKeymap();
          this.formatters.delete(formatter.id);
          this.notify();
        };
        return this.addDisposable(pluginId, unbind);
      },
      registerEditorExtension: (ext) => {
        this.dynamicExtensions.push(ext);
        eventBus.emit('editor-extensions-changed');
        const unbind = () => {
          this.dynamicExtensions = this.dynamicExtensions.filter((e) => e !== ext);
          eventBus.emit('editor-extensions-changed');
        };
        return this.addDisposable(pluginId, unbind);
      },
      registerBackgroundRenderer: (renderer) => {
        this.backgroundRenderers.set(renderer.id, renderer);
        this.notify();
        const unbind = () => {
          this.backgroundRenderers.delete(renderer.id);
          this.notify();
        };
        return this.addDisposable(pluginId, unbind);
      },
      getEditorContent: () => this.editorContentGetter(),
      setEditorContent: (c) => this.editorContentSetter(c),
      getCursorPosition: () => this.cursorGetter(),
      insertText: (t) => this.textInserter(t),
      getActiveChapterId: () => this.activeChapterGetter(),
      getProjectData: () => this.projectDataGetter(),
      saveCurrentChapter: () => this.saveChapterHandler(),
      on: (event, cb) => {
        const unbind = eventBus.on(event, cb);
        return this.addDisposable(pluginId, unbind);
      },
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
        eventBus.emit('editor-extensions-changed');
      },
    };
  }

  public getPluginContext(pluginId: string): PluginContext {
    return this.createPluginContext(pluginId);
  }

  public registerPlugin(plugin: NovelitePlugin): void {
    this.plugins.set(plugin.metadata.id, plugin);
    
    // Determine enablement: explicit state first, fallback to defaultEnabled
    let isEnabled: boolean;
    if (this.explicitStates.has(plugin.metadata.id)) {
      isEnabled = this.explicitStates.get(plugin.metadata.id)!;
    } else {
      isEnabled = plugin.metadata.defaultEnabled !== false;
    }

    if (isEnabled) {
      this.enabledPluginIds.add(plugin.metadata.id);
      const ctx = this.createPluginContext(plugin.metadata.id);
      plugin.init?.(ctx);
      plugin.mount?.(ctx);

      if (plugin.getSidebarTabs) {
        const tabs = plugin.getSidebarTabs(ctx);
        tabs.forEach((tab) => ctx.registerSidebarTab(tab));
      }

      if (plugin.getRightPanels) {
        const panels = plugin.getRightPanels(ctx);
        panels.forEach((p) => ctx.registerRightPanel(p));
      }

      if (plugin.getBackgroundRenderers) {
        const bgs = plugin.getBackgroundRenderers(ctx);
        bgs.forEach((bg) => ctx.registerBackgroundRenderer(bg));
      }
    }

    eventBus.emit('plugins-changed');
    eventBus.emit('editor-extensions-changed');
    this.notify();
  }

  public enablePlugin(id: string): void {
    const plugin = this.plugins.get(id);
    if (!plugin) return;

    this.explicitStates.set(id, true);
    if (this.enabledPluginIds.has(id)) return;

    this.enabledPluginIds.add(id);
    this.savePluginStates();
    
    const ctx = this.createPluginContext(id);
    plugin.init?.(ctx);
    plugin.mount?.(ctx);

    if (plugin.getSidebarTabs) {
      const tabs = plugin.getSidebarTabs(ctx);
      tabs.forEach((tab) => ctx.registerSidebarTab(tab));
    }

    if (plugin.getRightPanels) {
      const panels = plugin.getRightPanels(ctx);
      panels.forEach((p) => ctx.registerRightPanel(p));
    }

    if (plugin.getBackgroundRenderers) {
      const bgs = plugin.getBackgroundRenderers(ctx);
      bgs.forEach((bg) => ctx.registerBackgroundRenderer(bg));
    }

    eventBus.emit('plugins-changed');
    eventBus.emit('editor-extensions-changed');
    this.notify();
  }

  public disablePlugin(id: string): void {
    const plugin = this.plugins.get(id);
    if (!plugin) return;

    this.explicitStates.set(id, false);
    if (!this.enabledPluginIds.has(id)) {
      this.savePluginStates();
      return;
    }

    this.enabledPluginIds.delete(id);
    this.savePluginStates();

    const ctx = this.createPluginContext(id);
    plugin.unmount?.(ctx);

    // ✨ Auto-disposal: automatically teardown all registered commands, slots, and event listeners
    this.disposePluginResources(id);

    eventBus.emit('plugins-changed');
    eventBus.emit('editor-extensions-changed');
    this.notify();
  }

  public unregisterPlugin(id: string): void {
    const plugin = this.plugins.get(id);
    if (!plugin) return;

    if (this.enabledPluginIds.has(id)) {
      this.disablePlugin(id);
    }

    this.plugins.delete(id);
    this.disposePluginResources(id);
    eventBus.emit('plugins-changed');
    eventBus.emit('editor-extensions-changed');
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
    const extensions: Extension[] = [...this.dynamicExtensions];
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

  public getRightPanels(): RightPanelContribution[] {
    return Array.from(this.rightPanels.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public getBackgroundRenderers(): BackgroundRendererContribution[] {
    return Array.from(this.backgroundRenderers.values());
  }

  public getStatusBarItems(): StatusBarItem[] {
    return Array.from(this.statusBarItems.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public getExporters(): Exporter[] {
    return Array.from(this.exporters.values());
  }

  public getModals(): ModalContribution[] {
    return Array.from(this.modals.values());
  }

  public getActiveModalId(): string | null {
    return this.activeModalId;
  }

  public getFormatters(): TextFormatterContribution[] {
    return Array.from(this.formatters.values());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}

export const pluginManager = PluginManager.getInstance();
