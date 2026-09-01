export type KeybindingCategory =
  | 'editing'       // ✍️ 文本编辑与行操作
  | 'navigation'    // 🚀 光标疾速巡航
  | 'search'        // 🔍 查找、替换与检索
  | 'split_view'    // 🪟 对等分屏与双写对照
  | 'literary'      // 📖 排版、文学工具与导出
  | 'system';       // 🎨 视口、心流与系统管理

export type KeybindingScope = 'global' | 'editor';

export interface KeybindingItem {
  id: string;
  title: string;
  description: string;
  category: KeybindingCategory;
  scope: KeybindingScope;
  defaultKey: string;           // e.g. "Ctrl+S", "Alt+1", "Ctrl+Shift+L"
  currentKey: string;           // Current effective keybinding (can be customized)
  isCustomized?: boolean;
  pluginId?: string;
  run?: () => void | Promise<void>;
}

export interface KeymapConflict {
  key: string;
  conflictingItems: KeybindingItem[];
}
