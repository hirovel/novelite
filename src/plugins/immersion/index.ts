import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { createFocusModeExtension, type FocusScope } from './focusExtension';
import { createTypewriterExtension, type TypewriterConfig } from './typewriterExtension';
import { createDialogueHighlighterExtension, type DialogueColorPreset } from './dialogueExtension';
import { eventBus } from '../../core/events/EventBus';

export const ImmersionPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-immersion',
    name: '沉浸写作',
    version: '2.0.0',
    description: '提供段落专注模式、打字机定高滚动与对话台词高亮。',
    author: 'hirovel',
    icon: 'Focus',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    // 1. Toggle Focus Mode (Alt+F)
    ctx.registerCommand({
      id: 'focus.toggle',
      title: '切换专注模式',
      category: '沉浸写作',
      shortcut: 'Alt+F',
      run: (c) => {
        const current = c.getSetting<boolean>('focusEnabled', false);
        const next = !current;
        c.setSetting('focusEnabled', next);
        eventBus.emit('editor-extensions-changed');
        c.showToast(next ? '已开启专注模式' : '已关闭专注模式', 'info');
      },
    });

    // 2. Cycle Focus Scope (Alt+Shift+F)
    ctx.registerCommand({
      id: 'focus.cycle-scope',
      title: '切换专注范围 (段落 / 单句 / 三行)',
      category: '沉浸写作',
      shortcut: 'Alt+Shift+F',
      run: (c) => {
        const scopes: FocusScope[] = ['paragraph', 'sentence', 'horizon'];
        const names: Record<FocusScope, string> = {
          paragraph: '当前段落',
          sentence: '当前句子',
          horizon: '三行视野',
        };
        const current = c.getSetting<FocusScope>('focusScope', 'paragraph');
        const nextIdx = (scopes.indexOf(current) + 1) % scopes.length;
        const next = scopes[nextIdx];
        c.setSetting('focusScope', next);
        eventBus.emit('editor-extensions-changed');
        c.showToast(`专注范围: ${names[next]}`, 'info');
      },
    });

    // 3. Toggle Typewriter Mode
    ctx.registerCommand({
      id: 'typewriter.toggle',
      title: '切换打字机模式',
      category: '沉浸写作',
      run: (c) => {
        const enabled = c.getSetting<boolean>('typewriterEnabled', false);
        const next = !enabled;
        c.setSetting('typewriterEnabled', next);
        eventBus.emit('editor-extensions-changed');
        c.showToast(next ? '已开启打字机模式' : '已关闭打字机模式', 'info');
      },
    });

    // 4. Toggle Dialogue Highlights
    ctx.registerCommand({
      id: 'dialogue.toggle',
      title: '切换对话台词高亮',
      category: '沉浸写作',
      run: (c) => {
        const current = c.getSetting<boolean>('dialogueEnabled', true);
        const next = !current;
        c.setSetting('dialogueEnabled', next);
        eventBus.emit('editor-extensions-changed');
        c.showToast(next ? '已开启对话台词高亮' : '已关闭对话台词高亮', 'info');
      },
    });
  },
  getEditorExtensions: (ctx: PluginContext) => {
    return [
      // 1. Focus Mode
      createFocusModeExtension(() => ({
        enabled: ctx.getSetting<boolean>('focusEnabled', false),
        scope: ctx.getSetting<FocusScope>('focusScope', 'paragraph'),
        dimOpacity: ctx.getSetting<number>('focusDimOpacity', 0.28),
      })),

      // 2. Typewriter Mode
      createTypewriterExtension((): TypewriterConfig => ({
        enabled: ctx.getSetting<boolean>('typewriterEnabled', false),
        anchorRatio: ctx.getSetting<number>('typewriterAnchorRatio', 0.38),
        speedMode: ctx.getSetting<'gentle' | 'balanced' | 'snappy' | 'instant'>('typewriterSpeedMode', 'balanced'),
      })),

      // 3. Dialogue Highlighter
      createDialogueHighlighterExtension(
        () => ({
          enabled: ctx.getSetting<boolean>('dialogueEnabled', true),
          colorPreset: ctx.getSetting<DialogueColorPreset>('dialogueColorPreset', 'theme'),
          customColor: ctx.getSetting<string>('dialogueCustomColor', ''),
          highlightThoughts: ctx.getSetting<boolean>('dialogueHighlightThoughts', true),
        }),
        () => {
          if (typeof document !== 'undefined') {
            const val = document.documentElement.style.getPropertyValue('--novelite-dialogue-color');
            if (val) return val.trim();
            const accent = document.documentElement.style.getPropertyValue('--theme-accent');
            if (accent) return accent.trim();
          }
          return '#c95738';
        }
      ),
    ];
  },
};
