import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { createTypographyExtension } from './typographyExtension';
import { createSmartTypingExtension } from './smartTypingExtension';
import {
  cleanChinesePunctuation,
  formatNovelParagraphs,
  removeLeadingIndents,
  addPanguSpacing,
} from './chineseTypographyToolkit';
import { eventBus } from '../../core/events/EventBus';
import { safeStorageSet } from '../../core/storage/safeStorage';
import { getLanguage } from '../../core/i18n';

export const ChineseTypographyPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-chinese-typography',
    name: '中文排版',
    nameEn: 'Chinese & Western Typography',
    version: '3.0.0',
    description: '中文长篇小说排版工具：标点修复、段首全角缩进、成对符号辅助。',
    descriptionEn: 'Typesetting toolkit: punctuation spacing, first-line indent, and paired quote normalization.',
    author: 'hirovel',
    icon: 'Type',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    // 1. One-click Novel Paragraphs Formatter (Alt+Shift+F)
    ctx.registerCommand({
      id: 'typography.format-paragraphs',
      title: '规范小说排版 (缩进 2 全角空格 / 整理空行)',
      titleEn: 'Format Novel Paragraphs (2-Space Indent / Blank Lines)',
      descriptionEn: 'Format paragraphs with standard first-line indent and clean line breaks',
      category: '排版工具',
      categoryEn: 'Typography',
      shortcut: 'Alt+Shift+F',
      run: (c) => {
        const isEn = getLanguage() === 'en';
        const current = c.getEditorContent();
        const { text, count, changed } = formatNovelParagraphs(current, '2em');
        if (changed) {
          c.setEditorContent(text);
          c.showToast(isEn ? `Formatted ${count} paragraphs (2-space indent)` : `已规范本章排版，格式化 ${count} 处段落`, 'success');
        } else {
          c.showToast(isEn ? 'Paragraph indents and spacing already standardized' : '本章段落已具备规范的段首缩进与行间距', 'info');
        }
      },
    });

    // 2. Smart Punctuation Fixer (Alt+Shift+P)
    ctx.registerCommand({
      id: 'typography.clean-punctuation',
      title: '修复中文标点 (统一转全角 / 引号配对 / 破折号)',
      titleEn: 'Fix Chinese Punctuation (Fullwidth / Quotes / Dashes)',
      descriptionEn: 'Standardize quotation marks, dashes, and fullwidth punctuation',
      category: '排版工具',
      categoryEn: 'Typography',
      shortcut: 'Alt+Shift+P',
      run: (c) => {
        const isEn = getLanguage() === 'en';
        const current = c.getEditorContent();
        const { text, count, changed } = cleanChinesePunctuation(current);
        if (changed) {
          c.setEditorContent(text);
          c.showToast(isEn ? `Normalized ${count} punctuation marks and quotes` : `已修复 ${count} 处中文标点与引号配对`, 'success');
        } else {
          c.showToast(isEn ? 'All punctuation marks already standard' : '本章标点已规范，未发现需修复的标点', 'info');
        }
      },
    });

    // 3. Remove Leading Indents
    ctx.registerCommand({
      id: 'typography.remove-indents',
      title: '清除本章段首缩进 (恢复顶格)',
      titleEn: 'Remove Paragraph Indents',
      descriptionEn: 'Strip leading indents across current chapter',
      category: '排版工具',
      categoryEn: 'Typography',
      run: (c) => {
        const isEn = getLanguage() === 'en';
        const current = c.getEditorContent();
        const { text, count, changed } = removeLeadingIndents(current);
        if (changed) {
          c.setEditorContent(text);
          c.showToast(isEn ? `Cleared indent for ${count} paragraphs` : `已清除 ${count} 处段首缩进，恢复顶格`, 'success');
        } else {
          c.showToast(isEn ? 'All paragraphs are already flush-left' : '本章已处于顶格状态', 'info');
        }
      },
    });

    // 4. Pangu Spacing
    ctx.registerCommand({
      id: 'typography.pangu-spacing',
      title: '中英文与数字间自动插入空格',
      titleEn: 'Pangu Spacing (CJK & Latin Spacing)',
      descriptionEn: 'Auto insert typographic spacing between CJK and Latin characters',
      category: '排版工具',
      categoryEn: 'Typography',
      run: (c) => {
        const isEn = getLanguage() === 'en';
        const current = c.getEditorContent();
        const { text, count, changed } = addPanguSpacing(current);
        if (changed) {
          c.setEditorContent(text);
          c.showToast(isEn ? `Adjusted ${count} CJK & Latin character spacings` : `已规范中英文间隔，调整 ${count} 处空隙`, 'success');
        } else {
          c.showToast(isEn ? 'Character spacing already standardized' : '中英文间隔已符合标准', 'info');
        }
      },
    });

    // 5. Increase Font Size
    ctx.registerCommand({
      id: 'typography.font-increase',
      title: '增大编辑器字号',
      titleEn: 'Increase Editor Font Size',
      descriptionEn: 'Increase editor typography font size',
      category: '排版调节',
      categoryEn: 'Typography',
      shortcut: 'Ctrl+=',
      run: (c) => {
        const isEn = getLanguage() === 'en';
        const current = Number(localStorage.getItem('novelite_font_size')) || 18;
        const newSize = Math.min(36, current + 1);
        safeStorageSet('novelite_font_size', String(newSize));
        eventBus.emit('font-size-changed', newSize);
        c.showToast(isEn ? `Font Size: ${newSize}px` : `当前字号: ${newSize}px`, 'info');
      },
    });

    // 6. Decrease Font Size
    ctx.registerCommand({
      id: 'typography.font-decrease',
      title: '减小编辑器字号',
      titleEn: 'Decrease Editor Font Size',
      descriptionEn: 'Decrease editor typography font size',
      category: '排版调节',
      categoryEn: 'Typography',
      shortcut: 'Ctrl+-',
      run: (c) => {
        const isEn = getLanguage() === 'en';
        const current = Number(localStorage.getItem('novelite_font_size')) || 18;
        const newSize = Math.max(12, current - 1);
        safeStorageSet('novelite_font_size', String(newSize));
        eventBus.emit('font-size-changed', newSize);
        c.showToast(isEn ? `Font Size: ${newSize}px` : `当前字号: ${newSize}px`, 'info');
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
        // Default unindented (顶格)
        const indentEnabled = ctx.getSetting<boolean>('indentEnabled', false);
        const indentSize = ctx.getSetting<'2em' | '1em' | '3em' | '0'>('indentSize', '0');
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

      createSmartTypingExtension(() => {
        const enabled = ctx.getSetting<boolean>('smartTypingEnabled', true);
        // Default no auto indent (保持纯净顶格)
        const autoIndent = ctx.getSetting<boolean>('autoIndent', false);
        // Default auto pair quotes & brackets enabled
        const autoPairQuotes = ctx.getSetting<boolean>('autoPairQuotes', true);
        const singleStepBackspace = ctx.getSetting<boolean>('singleStepBackspace', true);

        return {
          enabled,
          autoIndent,
          autoPairQuotes,
          singleStepBackspace,
        };
      }),
    ];
  },
};
