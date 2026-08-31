import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { createEditorToolkitExtension, type EditorToolkitKeymapConfig } from './editorToolkitExtension';
import { eventBus } from '../../core/events/EventBus';
import { cleanChineseNovelText } from './chineseTextCleaner';

let pluginCtx: PluginContext | null = null;

export const EditorToolkitPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-editor-toolkit',
    name: '敏捷编辑与查找工坊',
    version: '1.0.0',
    description: '集成极简浮动查找替换、段落顺移、多光标编辑、中文排版智能清洗与可自定义快捷键体系。',
    author: 'hirovel',
    icon: 'Wrench',
    defaultEnabled: true,
  },

  init: (ctx: PluginContext) => {
    pluginCtx = ctx;

    // 1. Search & Replace Commands
    ctx.registerCommand({
      id: 'toolkit.open-search',
      title: '查找文本 (Search)',
      category: '敏捷编辑',
      shortcut: 'Ctrl+F',
      run: () => {
        eventBus.emit('open-floating-search', { mode: 'search' });
      },
    });

    ctx.registerCommand({
      id: 'toolkit.open-replace',
      title: '查找与替换 (Search & Replace)',
      category: '敏捷编辑',
      shortcut: 'Ctrl+H',
      run: () => {
        eventBus.emit('open-floating-search', { mode: 'replace' });
      },
    });

    // 2. Chinese Text Normalizer
    ctx.registerCommand({
      id: 'toolkit.clean-text',
      title: '一键清洗中文排版与标点',
      category: '排版核心',
      shortcut: 'Ctrl+Shift+L',
      run: (c) => {
        const raw = c.getEditorContent();
        const { cleanedText, changesCount } = cleanChineseNovelText(raw);
        if (changesCount === 0 || cleanedText === raw) {
          c.showToast('排版已是最佳状态，无需清洗', 'info');
          return;
        }
        c.setEditorContent(cleanedText);
        c.showToast(`排版清洗完成：已规范化 ${changesCount} 处格式与标点`, 'success');
      },
    });

    // 3. Headings Commands
    ctx.registerCommand({
      id: 'toolkit.heading-1',
      title: '设为一级章回标题 (#)',
      category: '敏捷编辑',
      shortcut: 'Ctrl+1',
      run: (c) => {
        const raw = c.getEditorContent();
        const pos = c.getCursorPosition();
        const lines = raw.split('\n');
        const lineIdx = Math.max(0, pos.line - 1);
        if (lineIdx < lines.length) {
          const cur = lines[lineIdx];
          lines[lineIdx] = cur.startsWith('# ') ? cur.replace(/^#\s+/, '') : '# ' + cur.replace(/^#{1,6}\s+/, '');
          c.setEditorContent(lines.join('\n'));
        }
      },
    });

    ctx.registerCommand({
      id: 'toolkit.heading-2',
      title: '设为二级分卷标题 (##)',
      category: '敏捷编辑',
      shortcut: 'Ctrl+2',
      run: (c) => {
        const raw = c.getEditorContent();
        const pos = c.getCursorPosition();
        const lines = raw.split('\n');
        const lineIdx = Math.max(0, pos.line - 1);
        if (lineIdx < lines.length) {
          const cur = lines[lineIdx];
          lines[lineIdx] = cur.startsWith('## ') ? cur.replace(/^##\s+/, '') : '## ' + cur.replace(/^#{1,6}\s+/, '');
          c.setEditorContent(lines.join('\n'));
        }
      },
    });

    ctx.registerCommand({
      id: 'toolkit.heading-0',
      title: '清除标题符号恢复正文',
      category: '敏捷编辑',
      shortcut: 'Ctrl+0',
      run: (c) => {
        const raw = c.getEditorContent();
        const pos = c.getCursorPosition();
        const lines = raw.split('\n');
        const lineIdx = Math.max(0, pos.line - 1);
        if (lineIdx < lines.length) {
          lines[lineIdx] = lines[lineIdx].replace(/^#{1,6}\s+/, '');
          c.setEditorContent(lines.join('\n'));
        }
      },
    });
  },

  getEditorExtensions: () => {
    return [
      createEditorToolkitExtension(() => {
        if (!pluginCtx) return {};
        return pluginCtx.getSetting<EditorToolkitKeymapConfig>('customKeymaps', {});
      }),
    ];
  },
};
