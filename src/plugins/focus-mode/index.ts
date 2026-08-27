import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { createFocusModeExtension } from './focusExtension';

export const FocusModePlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-focus-mode',
    name: '段落专注模式',
    version: '1.0.0',
    description: '高亮当前光标所在段落，平滑弱化非活动段落（iA Writer 风格），减少视觉干扰。',
    author: 'Novelite Core',
    icon: 'Eye',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'focus.toggle',
      title: '切换段落专注模式',
      category: '创作沉浸',
      shortcut: 'Alt+F',
      run: (c) => {
        const current = c.getSetting<boolean>('enabled', true);
        const next = !current;
        c.setSetting('enabled', next);
        c.showToast(next ? '已开启段落专注模式' : '已关闭段落专注', 'info');
      },
    });
  },
  getEditorExtensions: () => {
    return [
      createFocusModeExtension(),
    ];
  },
};
