import { DEFAULT_KEYMAPS } from './defaultKeymaps';
import type { KeybindingCategory, KeybindingItem } from './types';
import { eventBus } from '../events/EventBus';
import { commandRegistry } from '../plugins/CommandRegistry';
import { safeStorageSet } from '../storage/safeStorage';

const STORAGE_KEY = 'novelite_custom_keybindings';

export class KeymapRegistry {
  private static instance: KeymapRegistry;
  private keybindings: Map<string, KeybindingItem> = new Map();
  private customOverrides: Record<string, string> = {};
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.loadCustomOverrides();
    this.initDefaults();
  }

  public static getInstance(): KeymapRegistry {
    if (!KeymapRegistry.instance) {
      KeymapRegistry.instance = new KeymapRegistry();
    }
    return KeymapRegistry.instance;
  }

  private loadCustomOverrides(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.customOverrides = JSON.parse(stored);
      }
    } catch {
      this.customOverrides = {};
    }
  }

  private saveCustomOverrides(): void {
    try {
      safeStorageSet(STORAGE_KEY, JSON.stringify(this.customOverrides));
    } catch (e) {
      console.error('Failed to persist custom keybindings:', e);
    }
  }

  private initDefaults(): void {
    DEFAULT_KEYMAPS.forEach((def) => {
      const custom = this.customOverrides[def.id];
      this.keybindings.set(def.id, {
        ...def,
        currentKey: custom || def.defaultKey,
        isCustomized: Boolean(custom && custom !== def.defaultKey),
      });
    });
  }

  /**
   * Register a new or plugin-contributed keybinding
   */
  public register(item: Omit<KeybindingItem, 'currentKey' | 'isCustomized'> & { defaultKey: string }): () => void {
    // 🌟 Check if an existing binding matches by id, alias, or colon/dot notation
    const alias = commandRegistry.getAlias(item.id);
    let existing = this.keybindings.get(item.id);
    if (!existing && alias) {
      existing = this.keybindings.get(alias);
    }
    if (!existing) {
      const asColon = item.id.replace(/\./g, ':');
      const asDot = item.id.replace(/:/g, '.');
      existing = this.keybindings.get(asColon) || this.keybindings.get(asDot);
    }

    // If an existing binding exists, attach the runnable action directly rather than creating a duplicate
    if (existing) {
      if (item.run) existing.run = item.run;
      if (item.titleEn) existing.titleEn = item.titleEn;
      if (item.descriptionEn) existing.descriptionEn = item.descriptionEn;
      this.notify();
      return () => {
        if (existing.run === item.run) existing.run = undefined;
        this.notify();
      };
    }

    const custom = this.customOverrides[item.id];
    const fullItem: KeybindingItem = {
      ...item,
      currentKey: custom || item.defaultKey,
      isCustomized: Boolean(custom && custom !== item.defaultKey),
    };
    this.keybindings.set(item.id, fullItem);
    this.notify();

    return () => {
      this.keybindings.delete(item.id);
      this.notify();
    };
  }

  /**
   * Update the action callback for a registered keybinding
   */
  public bindAction(id: string, run: () => void | Promise<void>): void {
    const item = this.keybindings.get(id);
    if (item) {
      item.run = run;
    }
  }

  public get(id: string): KeybindingItem | undefined {
    return this.keybindings.get(id);
  }

  public getAll(): KeybindingItem[] {
    return Array.from(this.keybindings.values());
  }

  public getByCategory(category: KeybindingCategory): KeybindingItem[] {
    return this.getAll().filter((item) => item.category === category);
  }

  /**
   * Customize a keybinding with persistence
   */
  public updateBinding(id: string, newKey: string): void {
    const item = this.keybindings.get(id);
    if (!item) return;

    const trimmed = newKey.trim();
    if (!trimmed || trimmed === item.defaultKey) {
      delete this.customOverrides[id];
      item.currentKey = item.defaultKey;
      item.isCustomized = false;
    } else {
      this.customOverrides[id] = trimmed;
      item.currentKey = trimmed;
      item.isCustomized = true;
    }

    this.saveCustomOverrides();
    this.notify();
    eventBus.emit('keymap:changed', { id, key: item.currentKey });
  }

  /**
   * Reset a specific keybinding to default
   */
  public resetBinding(id: string): void {
    const item = this.keybindings.get(id);
    if (!item) return;

    delete this.customOverrides[id];
    item.currentKey = item.defaultKey;
    item.isCustomized = false;

    this.saveCustomOverrides();
    this.notify();
    eventBus.emit('keymap:changed', { id, key: item.defaultKey });
  }

  /**
   * Reset all keybindings to defaults
   */
  public resetAll(): void {
    this.customOverrides = {};
    localStorage.removeItem(STORAGE_KEY);
    this.initDefaults();
    this.notify();
    eventBus.emit('keymap:changed', { all: true });
  }

  /**
   * Check for shortcut collisions
   */
  public findConflicts(key: string, ignoreId?: string): KeybindingItem[] {
    const norm = this.normalizeKeyString(key);
    return this.getAll().filter((item) => {
      if (ignoreId && item.id === ignoreId) return false;
      return this.normalizeKeyString(item.currentKey) === norm;
    });
  }

  /**
   * Normalize an incoming KeyboardEvent into a canonical key string e.g. "Ctrl+Shift+L"
   */
  public normalizeEvent(e: KeyboardEvent): string {
    const parts: string[] = [];

    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    const key = e.key;
    if (!['Control', 'Meta', 'Alt', 'Shift'].includes(key)) {
      if (key === ' ') {
        parts.push('Space');
      } else if (key.length === 1) {
        parts.push(key.toUpperCase());
      } else {
        parts.push(key);
      }
    }

    return parts.join('+');
  }

  /**
   * Normalize a key string for uniform comparison
   */
  public normalizeKeyString(shortcut: string): string {
    const parts = shortcut.split('+').map((s) => s.trim().toLowerCase());
    const mods: string[] = [];
    if (parts.includes('ctrl') || parts.includes('control') || parts.includes('cmd') || parts.includes('meta')) {
      mods.push('ctrl');
    }
    if (parts.includes('alt') || parts.includes('opt') || parts.includes('option')) {
      mods.push('alt');
    }
    if (parts.includes('shift')) {
      mods.push('shift');
    }

    const keyPart = parts.find((p) => !['ctrl', 'control', 'cmd', 'meta', 'alt', 'opt', 'option', 'shift'].includes(p)) || '';
    return [...mods, keyPart].join('+');
  }

  /**
   * Match an incoming KeyboardEvent against all registered keybindings
   */
  public findMatchingBinding(e: KeyboardEvent): KeybindingItem | undefined {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const hasCtrl = e.ctrlKey || (isMac && e.metaKey);
    const hasAlt = e.altKey;
    const hasShift = e.shiftKey;
    const actualKey = e.key.toLowerCase();

    let matchedFallback: KeybindingItem | undefined = undefined;

    for (const item of this.getAll()) {
      const parts = item.currentKey.split('+').map((s) => s.trim().toLowerCase());
      const needsCtrl = parts.includes('ctrl') || parts.includes('control') || parts.includes('cmd') || parts.includes('meta');
      const needsAlt = parts.includes('alt') || parts.includes('opt');
      const needsShift = parts.includes('shift');

      if (needsCtrl !== hasCtrl) continue;
      if (needsAlt !== hasAlt) continue;
      if (needsShift !== hasShift) continue;

      const targetKey = parts.find(
        (p) => !['ctrl', 'control', 'cmd', 'meta', 'alt', 'opt', 'shift'].includes(p)
      );

      if (!targetKey) continue;

      if (
        targetKey === actualKey ||
        (targetKey === 'space' && actualKey === ' ') ||
        (targetKey === 'arrowup' && actualKey === 'arrowup') ||
        (targetKey === 'arrowdown' && actualKey === 'arrowdown') ||
        (targetKey === 'arrowleft' && actualKey === 'arrowleft') ||
        (targetKey === 'arrowright' && actualKey === 'arrowright') ||
        (targetKey === '=' && (actualKey === '=' || actualKey === '+')) ||
        (targetKey === '-' && (actualKey === '-' || actualKey === '_'))
      ) {
        // If this binding has a direct run action or matches a registered command, return it with top priority!
        if (item.run || commandRegistry.get(item.id)) {
          return item;
        }
        if (!matchedFallback) {
          matchedFallback = item;
        }
      }
    }

    return matchedFallback;
  }

  /**
   * Format key string for gorgeous cross-platform UI badge display
   */
  public formatDisplayKey(keyString: string): { mods: string[]; key: string } {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const parts = keyString.split('+').map((s) => s.trim());
    const mods: string[] = [];
    let mainKey = '';

    parts.forEach((p) => {
      const low = p.toLowerCase();
      if (low === 'ctrl' || low === 'control' || low === 'cmd' || low === 'meta') {
        mods.push(isMac ? '⌘' : 'Ctrl');
      } else if (low === 'alt' || low === 'opt' || low === 'option') {
        mods.push(isMac ? '⌥' : 'Alt');
      } else if (low === 'shift') {
        mods.push(isMac ? '⇧' : 'Shift');
      } else {
        if (low === 'arrowup') mainKey = '↑';
        else if (low === 'arrowdown') mainKey = '↓';
        else if (low === 'arrowleft') mainKey = '←';
        else if (low === 'arrowright') mainKey = '→';
        else if (low === 'enter') mainKey = '↵';
        else if (low === 'backspace') mainKey = '⌫';
        else if (low === 'delete') mainKey = 'Del';
        else if (low === 'tab') mainKey = 'Tab';
        else if (low === 'space') mainKey = 'Space';
        else mainKey = p.toUpperCase();
      }
    });

    return { mods, key: mainKey };
  }

  /**
   * Helper to retrieve formatted key combination string for a command ID
   */
  public getFormattedKey(id: string, fallback?: string): string {
    const item = this.get(id);
    if (!item) return fallback || '';
    const fmt = this.formatDisplayKey(item.currentKey);
    return [...fmt.mods, fmt.key].filter(Boolean).join(' + ');
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

export const keymapRegistry = KeymapRegistry.getInstance();
