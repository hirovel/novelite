import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { createDialogueHighlighterExtension, type DialogueColorPreset } from './dialogueExtension';
import { eventBus } from '../../core/events/EventBus';

let pluginCtx: PluginContext | null = null;

export const DialogueHighlighterPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-dialogue-highlighter',
    name: '小说台词对话微光',
    version: '2.0.0',
    description: '自动为引号内的角色台词与心理独白赋予清晰微光，使剧情对白节奏分明。',
    author: 'hirovel',
    icon: 'MessageSquare',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    pluginCtx = ctx;

    // Command without hardcoded shortcut to preserve keys for text editing
    ctx.registerCommand({
      id: 'dialogue.toggle',
      title: '切换小说台词对话微光',
      category: '创作沉浸',
      run: (c) => {
        const current = c.getSetting<boolean>('enabled', true);
        const next = !current;
        c.setSetting('enabled', next);
        eventBus.emit('editor-extensions-changed');
        c.showToast(next ? '已开启台词高亮' : '已关闭台词高亮', 'info');
      },
    });
  },
  getEditorExtensions: () => {
    return [
      createDialogueHighlighterExtension(
        () => {
          if (!pluginCtx) {
            return { enabled: true, colorPreset: 'theme', highlightThoughts: true };
          }
          return {
            enabled: pluginCtx.getSetting<boolean>('enabled', true),
            colorPreset: pluginCtx.getSetting<DialogueColorPreset>('colorPreset', 'theme'),
            customColor: pluginCtx.getSetting<string>('customColor', '#38bdf8'),
            highlightThoughts: pluginCtx.getSetting<boolean>('highlightThoughts', true),
          };
        },
        () => {
          return '#38bdf8';
        }
      ),
    ];
  },
};
