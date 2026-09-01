import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { createTypographyExtension } from './typographyExtension';

export const ChineseTypographyPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-chinese-typography',
    name: '中文排版',
    version: '2.2.0',
    description: '提供中文段首全角缩进、GB/T 15834 标点避头尾与标点半角挤压。',
    author: 'hirovel',
    icon: 'Type',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'typography.toggle-indent',
      title: '切换中文首行缩进 (2 字符)',
      category: '排版沉浸',
      run: (c) => {
        const current = c.getSetting<boolean>('indentEnabled', false);
        const next = !current;
        c.setSetting('indentEnabled', next);
        c.showToast(next ? '已开启首行缩进 (2 字符)' : '已关闭首行缩进', 'info');
      },
    });

    ctx.registerCommand({
      id: 'typography.font-increase',
      title: '增大编辑器字号',
      category: '排版沉浸',
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
        const indentEnabled = ctx.getSetting<boolean>('indentEnabled', false);
        const indentSize = ctx.getSetting<'2em' | '1em' | '3em' | '0'>('indentSize', '2em');
        const kinsokuStrictness = ctx.getSetting<'strict' | 'loose' | 'native'>('kinsokuStrictness', 'strict');
        const punctuationHalt = ctx.getSetting<boolean>('punctuationHalt', true);
        const textAlignment = ctx.getSetting<'justify' | 'left'>('textAlignment', 'justify');
        const letterSpacing = ctx.getSetting<number>('letterSpacing', 0.02);
        const contentMaxWidth = ctx.getSetting<number>('contentMaxWidth', 780);
        const horizontalPadding = ctx.getSetting<number>('horizontalPadding', 32);

        return {
          fontPreset,
          customFontName,
          fontSize,
          lineHeight,
          paragraphSpacing,
          indentEnabled,
          indentSize,
          kinsokuStrictness,
          punctuationHalt,
          textAlignment,
          letterSpacing,
          contentMaxWidth,
          horizontalPadding,
        };
      }),
    ];
  },
};
