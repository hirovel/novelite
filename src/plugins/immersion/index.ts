import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { createFocusModeExtension, type FocusScope } from '../focus-mode/focusExtension';
import { createTypewriterExtension, type TypewriterConfig } from '../typewriter/typewriterExtension';
import { createDialogueHighlighterExtension, type DialogueColorPreset } from '../dialogue-highlighter/dialogueExtension';
import { createEditorToolkitExtension } from '../editor-toolkit/editorToolkitExtension';
import { eventBus } from '../../core/events/EventBus';

export const ImmersionPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-immersion',
    name: '沉浸写作',
    version: '2.0.0',
    description: '提供段落专注聚光灯、打字机模式（固定黄金视线高度）与台词对话微光。',
    author: 'hirovel',
    icon: 'Focus',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    // 1. Toggle Focus Mode (Alt+F)
    ctx.registerCommand({
      id: 'focus.toggle',
      title: '切换专注聚光灯',
      category: '创作沉浸',
      shortcut: 'Alt+F',
      run: (c) => {
        const current = c.getSetting<boolean>('focusEnabled', false);
        const next = !current;
        c.setSetting('focusEnabled', next);
        eventBus.emit('editor-extensions-changed');
        c.showToast(next ? '已开启专注聚光灯' : '已关闭专注模式', 'info');
      },
    });

    // 2. Cycle Focus Scope (Alt+Shift+F)
    ctx.registerCommand({
      id: 'focus.cycle-scope',
      title: '切换聚光范围 (段落 / 单句 / 三行)',
      category: '创作沉浸',
      shortcut: 'Alt+Shift+F',
      run: (c) => {
        const scopes: FocusScope[] = ['paragraph', 'sentence', 'horizon'];
        const names: Record<FocusScope, string> = {
          paragraph: '当前逻辑段落',
          sentence: '当前单句推敲',
          horizon: '三行微光渐变',
        };
        const current = c.getSetting<FocusScope>('focusScope', 'paragraph');
        const nextIdx = (scopes.indexOf(current) + 1) % scopes.length;
        const next = scopes[nextIdx];
        c.setSetting('focusScope', next);
        eventBus.emit('editor-extensions-changed');
        c.showToast(`聚光范围: ${names[next]}`, 'info');
      },
    });

    // 3. Toggle Typewriter Mode
    ctx.registerCommand({
      id: 'typewriter.toggle',
      title: '切换打字机模式',
      category: '创作沉浸',
      run: (c) => {
        const enabled = c.getSetting<boolean>('typewriterEnabled', false);
        const next = !enabled;
        c.setSetting('typewriterEnabled', next);
        eventBus.emit('editor-extensions-changed');
        c.showToast(next ? '已开启打字机居中模式' : '已关闭打字机居中模式', 'info');
      },
    });

    // 4. Toggle Dialogue Highlights
    ctx.registerCommand({
      id: 'dialogue.toggle',
      title: '切换台词对话微光',
      category: '创作沉浸',
      run: (c) => {
        const current = c.getSetting<boolean>('dialogueEnabled', true);
        const next = !current;
        c.setSetting('dialogueEnabled', next);
        eventBus.emit('editor-extensions-changed');
        c.showToast(next ? '已开启台词高亮' : '已关闭台词高亮', 'info');
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
          customColor: ctx.getSetting<string>('dialogueCustomColor', '#38bdf8'),
          highlightThoughts: ctx.getSetting<boolean>('dialogueHighlightThoughts', true),
        }),
        () => '#38bdf8'
      ),

      // 4. Editor Toolkit (shortcuts, move line, cleaner)
      createEditorToolkitExtension(),
    ];
  },
};
