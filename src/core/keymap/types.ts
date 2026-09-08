export type KeybindingCategory =
  | 'editing'       // 文本编辑与行操作
  | 'navigation'    // 光标导航
  | 'search'        // 查找与检索
  | 'split_view'    // 分屏编辑
  | 'literary'      // 排版与写作辅助
  | 'system';       // 界面与系统设置

export type KeybindingScope = 'global' | 'editor';

export interface KeybindingItem {
  id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
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
