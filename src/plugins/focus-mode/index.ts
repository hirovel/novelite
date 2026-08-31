import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { createFocusModeExtension, type FocusScope } from './focusExtension';
import { eventBus } from '../../core/events/EventBus';

let pluginCtx: PluginContext | null = null;

export const FocusModePlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-focus-mode',
    name: '段落与单句专注聚光灯',
    version: '2.0.0',
    description: '高亮当前光标段落/单句，平滑弱化非活动文字（iA Writer 风格），减少视觉干扰。',
    author: 'hirovel',
    icon: 'Eye',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    pluginCtx = ctx;

    // 1. Toggle Focus Mode (Alt+F)
    ctx.registerCommand({
      id: 'focus.toggle',
      title: '切换专注聚光灯模式',
      category: '创作沉浸',
      shortcut: 'Alt+F',
      run: (c) => {
        const current = c.getSetting<boolean>('enabled', false);
        const next = !current;
        c.setSetting('enabled', next);
        eventBus.emit('editor-extensions-changed');
        c.showToast(next ? '已开启专注聚光灯' : '已关闭专注模式', 'info');
      },
    });

    // 2. Cycle Focus Scope (Alt+Shift+F)
    ctx.registerCommand({
      id: 'focus.cycle-scope',
      title: '切换聚光灯范围 (段落 / 单句 / 三行)',
      category: '创作沉浸',
      shortcut: 'Alt+Shift+F',
      run: (c) => {
        const scopes: FocusScope[] = ['paragraph', 'sentence', 'horizon'];
        const names: Record<FocusScope, string> = {
          paragraph: '当前逻辑段落',
          sentence: '当前单句推敲',
          horizon: '三行微光渐变',
        };
        const current = c.getSetting<FocusScope>('scope', 'paragraph');
        const nextIdx = (scopes.indexOf(current) + 1) % scopes.length;
        const next = scopes[nextIdx];
        c.setSetting('scope', next);
        eventBus.emit('editor-extensions-changed');
        c.showToast(`聚光范围: ${names[next]}`, 'info');
      },
    });
  },
  getEditorExtensions: () => {
    return [
      createFocusModeExtension(() => {
        if (!pluginCtx) {
          return { enabled: false, scope: 'paragraph', dimOpacity: 0.28 };
        }
        return {
          enabled: pluginCtx.getSetting<boolean>('enabled', false),
          scope: pluginCtx.getSetting<FocusScope>('scope', 'paragraph'),
          dimOpacity: pluginCtx.getSetting<number>('dimOpacity', 0.28),
        };
      }),
    ];
  },
};
