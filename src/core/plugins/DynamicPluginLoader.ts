import { pluginManager } from './PluginManager';
import type { NovelitePlugin } from './types';
import { eventBus } from '../events/EventBus';

export interface CustomPluginEntry {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  code: string;
  installedAt: string;
}

class DynamicPluginLoaderService {
  private static instance: DynamicPluginLoaderService;
  private customPlugins: Map<string, CustomPluginEntry> = new Map();

  private constructor() {
    this.loadState();
  }

  public static getInstance(): DynamicPluginLoaderService {
    if (!DynamicPluginLoaderService.instance) {
      DynamicPluginLoaderService.instance = new DynamicPluginLoaderService();
    }
    return DynamicPluginLoaderService.instance;
  }

  private loadState() {
    try {
      const customSaved = localStorage.getItem('novelite_custom_plugins_code');
      if (customSaved) {
        const list: CustomPluginEntry[] = JSON.parse(customSaved);
        if (Array.isArray(list)) {
          list.forEach((item) => {
            this.customPlugins.set(item.id, item);
          });
        }
      }
    } catch (err) {
      console.error('[DynamicPluginLoader] Failed to load saved plugin state:', err);
    }
  }

  private saveState() {
    localStorage.setItem(
      'novelite_custom_plugins_code',
      JSON.stringify(Array.from(this.customPlugins.values()))
    );
  }

  /**
   * Initializes and dynamically registers all custom JS plugins on startup.
   */
  public init() {
    for (const custom of this.customPlugins.values()) {
      this.executeAndRegisterCustomPlugin(custom.code);
    }
  }

  /**
   * Safely evaluates and registers a custom JavaScript plugin.
   */
  public executeAndRegisterCustomPlugin(code: string): { success: boolean; error?: string; plugin?: NovelitePlugin } {
    try {
      let sanitized = code.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1').trim();
      if (sanitized.includes('export default')) {
        sanitized = sanitized.replace(/export\s+default\s+/, 'return ');
      }

      const wrapped = new Function(`
        "use strict";
        const module = { exports: {} };
        const exports = module.exports;
        ${sanitized.startsWith('return ') ? sanitized : `${sanitized};\nreturn module.exports.default || module.exports || null;`}
      `);

      const pluginObj = wrapped();
      if (!pluginObj || typeof pluginObj !== 'object' || !pluginObj.metadata || !pluginObj.metadata.id) {
        return { success: false, error: '插件代码必须导出一个包含 metadata.id 和 metadata.name 的有效插件对象' };
      }

      const plugin: NovelitePlugin = pluginObj;
      pluginManager.registerPlugin(plugin);

      // Save to custom plugins storage
      const entry: CustomPluginEntry = {
        id: plugin.metadata.id,
        name: plugin.metadata.name,
        version: plugin.metadata.version || '1.0.0',
        author: plugin.metadata.author || '自定义',
        description: plugin.metadata.description || '自定义脚本扩展',
        code: code,
        installedAt: new Date().toLocaleDateString('zh-CN'),
      };
      this.customPlugins.set(plugin.metadata.id, entry);
      this.saveState();

      eventBus.emit('editor-extensions-changed');
      eventBus.emit('plugins-changed');
      return { success: true, plugin };
    } catch (err: any) {
      console.error('[DynamicPluginLoader] Evaluation error:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Uninstalls a custom JavaScript plugin.
   */
  public uninstallCustomPlugin(id: string): boolean {
    if (!this.customPlugins.has(id)) return false;

    this.customPlugins.delete(id);
    this.saveState();

    pluginManager.unregisterPlugin(id);
    return true;
  }

  /**
   * Returns all installed custom plugins.
   */
  public getAllCustomPlugins(): CustomPluginEntry[] {
    return Array.from(this.customPlugins.values());
  }
}

export const dynamicPluginLoader = DynamicPluginLoaderService.getInstance();
