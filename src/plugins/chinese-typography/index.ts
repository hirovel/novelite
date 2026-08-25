import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { createTypographyExtension } from './typographyExtension';

export const ChineseTypographyPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-chinese-typography',
    name: '中文文学排版与字体风格',
    version: '2.0.0',
    description: '提供标准的中文小说 2 字符 CSS 缩进渲染、自定义字体支持与出版级排版。',
    author: 'Novelite Core',
    icon: 'Type',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'typography.toggle-indent',
      title: '切换中文首行缩进 (2 字符)',
      category: '排版沉浸',
      run: (c) => {
        const current = c.getSetting<boolean>('indentEnabled', true);
        c.setSetting('indentEnabled', !current);
        c.showToast(current ? '已关闭首行缩进' : '已开启首行缩进 (2em)', 'info');
      },
    });

    ctx.registerCommand({
      id: 'typography.font-increase',
      title: '增大编辑器字号',
      category: '排版沉浸',
      shortcut: 'Ctrl+=',
      run: (c) => {
        const size = c.getSetting<number>('fontSize', 18);
        const newSize = Math.min(32, size + 1);
        c.setSetting('fontSize', newSize);
        c.showToast(`当前字号: ${newSize}px`, 'info');
      },
    });

    ctx.registerCommand({
      id: 'typography.font-decrease',
      title: '减小编辑器字号',
      category: '排版沉浸',
      shortcut: 'Ctrl+-',
      run: (c) => {
        const size = c.getSetting<number>('fontSize', 18);
        const newSize = Math.max(12, size - 1);
        c.setSetting('fontSize', newSize);
        c.showToast(`当前字号: ${newSize}px`, 'info');
      },
    });
  },
  getEditorExtensions: (ctx: PluginContext) => {
    return [
      createTypographyExtension(() => {
        const fontPreset = ctx.getSetting<'lxgw' | 'songti' | 'sans' | 'mono' | 'custom'>('fontPreset', 'lxgw');
        const customFontName = ctx.getSetting<string>('customFontName', '');
        const fontSize = ctx.getSetting<number>('fontSize', 18);
        const lineHeight = ctx.getSetting<number>('lineHeight', 1.95);
        const paragraphSpacing = ctx.getSetting<number>('paragraphSpacing', 0.7);
        const indentEnabled = ctx.getSetting<boolean>('indentEnabled', true);
        const contentMaxWidth = ctx.getSetting<number>('contentMaxWidth', 780);
        const horizontalPadding = ctx.getSetting<number>('horizontalPadding', 32);

        return {
          fontPreset,
          customFontName,
          fontSize,
          lineHeight,
          paragraphSpacing,
          indentEnabled,
          contentMaxWidth,
          horizontalPadding,
        };
      }),
    ];
  },
};
