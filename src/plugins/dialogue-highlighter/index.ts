import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { createDialogueHighlighterExtension } from './dialogueExtension';

export const DialogueHighlighterPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-dialogue-highlighter',
    name: '小说台词对话微光',
    version: '1.0.0',
    description: '自动为“……”引号内的角色台词赋予微光，使小说剧情对话节奏分明。',
    author: 'Novelite Core',
    icon: 'MessageSquare',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'dialogue.toggle',
      title: '切换小说台词对话微光',
      category: '创作沉浸',
      shortcut: 'Alt+D',
      run: (c) => {
        const current = c.getSetting<boolean>('enabled', true);
        const next = !current;
        c.setSetting('enabled', next);
        c.showToast(next ? '已开启台词高亮' : '已关闭台词高亮', 'info');
      },
    });
  },
  getEditorExtensions: (ctx: PluginContext) => {
    return [
      createDialogueHighlighterExtension(
        () => ctx.getSetting<boolean>('enabled', true),
        () => ctx.getSetting<string>('accentColor', '#a78bfa')
      ),
    ];
  },
};
