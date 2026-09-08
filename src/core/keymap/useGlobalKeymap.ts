import { useEffect } from 'react';
import { keymapRegistry } from './KeymapRegistry';
import { commandRegistry } from '../plugins/CommandRegistry';
import { pluginManager } from '../plugins/PluginManager';
import { eventBus } from '../events/EventBus';
import { projectStore } from '../storage/ProjectStore';

import { getLanguage } from '../i18n';

export function useGlobalKeymap() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 🌟 1. Ignore keystrokes when editing inside standalone inputs/textareas (unless ESC or global shortcuts)
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      // Allow ESC to close modals/popups globally
      if (e.key === 'Escape') {
        eventBus.emit('modal:close-all');
        return;
      }

      // 🌟 2. Find matching binding from KeymapRegistry
      const matched = keymapRegistry.findMatchingBinding(e);
      if (!matched) return;

      // If typing inside an input/search field, only allow specific navigation / command shortcuts (e.g. Ctrl+P, Ctrl+/, Esc)
      if (isInput && !['keymap:open-cheatsheet', 'nav:command-palette', 'view:open-settings'].includes(matched.id)) {
        return;
      }

      // 🌟 3. Prevent browser default behavior and execute
      e.preventDefault();
      e.stopPropagation();

      // If the keybinding has a direct action callback attached
      if (matched.run) {
        matched.run();
        return;
      }

      // Check if there is a matching Command in CommandRegistry (with alias resolution)
      const cmd = commandRegistry.get(matched.id);
      if (cmd) {
        const targetId = cmd.pluginId || cmd.id;
        const ctx = pluginManager.getPluginContext(targetId) || pluginManager.createPluginContext(targetId);
        cmd.run(ctx);
        return;
      }

      // 🌟 4. Fallback EventBus triggers for core system actions
      switch (matched.id) {
        case 'keymap:open-cheatsheet':
          eventBus.emit('keymap:open-cheatsheet');
          break;
        case 'nav:command-palette':
          eventBus.emit('command-palette:toggle');
          break;
        case 'nav:flight-deck':
          eventBus.emit('quick-search:open');
          break;
        case 'nav:scratchpad':
          eventBus.emit('scratchpad:open');
          break;
        case 'nav:bookshelf':
          eventBus.emit('bookshelf:open');
          break;
        case 'nav:global-search':
          eventBus.emit('global-search:open');
          break;
        case 'novel:import-txt':
          eventBus.emit('novel-import:open');
          break;
        case 'nav:prev-chapter':
          projectStore.navigateToPrevChapter();
          break;
        case 'nav:next-chapter':
          projectStore.navigateToNextChapter();
          break;
        case 'search:toggle-hud':
          eventBus.emit('open-floating-search', { mode: 'search' });
          break;
        case 'search:replace-hud':
          eventBus.emit('open-floating-search', { mode: 'replace' });
          break;
        case 'split:toggle':
          eventBus.emit('split-view:toggle');
          break;
        case 'split:focus-toggle':
          eventBus.emit('split-view:focus-pane', 'toggle');
          break;
        case 'split:focus-primary':
          eventBus.emit('split-view:focus-pane', 'primary');
          break;
        case 'split:focus-secondary':
          eventBus.emit('split-view:focus-pane', 'secondary');
          break;
        case 'split:swap-panes':
          eventBus.emit('split-view:swap');
          break;
        case 'literary:save-chapter':
          eventBus.emit('save-current-chapter');
          break;
        case 'literary:format-chinese':
          eventBus.emit('editor-action:format-chinese');
          break;
        case 'focus:toggle': {
          const ctx = pluginManager.getPluginContext('plugin-immersion');
          const current = ctx?.getSetting<boolean>('focusEnabled', false) ?? false;
          const next = !current;
          ctx?.setSetting('focusEnabled', next);
          eventBus.emit('editor-extensions-changed');
          const isEn = getLanguage() === 'en';
          ctx?.showToast(
            isEn
              ? (next ? 'Focus mode enabled' : 'Focus mode disabled')
              : (next ? '已开启专注聚光灯' : '已关闭专注聚光灯'),
            'info'
          );
          break;
        }
        case 'focus:toggle-scope': {
          const ctx = pluginManager.getPluginContext('plugin-immersion');
          const scopes = ['paragraph', 'sentence', 'horizon'] as const;
          const isEn = getLanguage() === 'en';
          const namesZh = { paragraph: '当前逻辑段落', sentence: '当前单句推敲', horizon: '三行微光渐变' };
          const namesEn = { paragraph: 'Paragraph Spotlight', sentence: 'Sentence Crafting', horizon: 'Three-line Horizon' };
          const current = ctx?.getSetting<(typeof scopes)[number]>('focusScope', 'paragraph') || 'paragraph';
          const next = scopes[(scopes.indexOf(current) + 1) % scopes.length];
          ctx?.setSetting('focusScope', next);
          eventBus.emit('editor-extensions-changed');
          ctx?.showToast(
            isEn ? `Focus scope: ${namesEn[next] || next}` : `聚光范围: ${namesZh[next] || next}`,
            'info'
          );
          break;
        }
        case 'literary:toggle-dialogue': {
          const ctx = pluginManager.getPluginContext('plugin-immersion');
          const current = ctx?.getSetting<boolean>('dialogueEnabled', true) ?? true;
          const next = !current;
          ctx?.setSetting('dialogueEnabled', next);
          eventBus.emit('editor-extensions-changed');
          const isEn = getLanguage() === 'en';
          ctx?.showToast(
            isEn
              ? (next ? 'Dialogue highlight enabled' : 'Dialogue highlight disabled')
              : (next ? '已开启台词高亮' : '已关闭台词高亮'),
            'info'
          );
          break;
        }
        case 'literary:quick-export': {
          const ctx = pluginManager.getPluginContext('plugin-novel-files');
          const exportCmd = commandRegistry.get('novel.export-txt');
          if (exportCmd && ctx) exportCmd.run(ctx);
          break;
        }
        case 'editor:zoom-in': {
          const ctx = pluginManager.getPluginContext('plugin-chinese-typography');
          const zoomCmd = commandRegistry.get('typography.font-increase');
          if (zoomCmd && ctx) zoomCmd.run(ctx);
          break;
        }
        case 'editor:zoom-out': {
          const ctx = pluginManager.getPluginContext('plugin-chinese-typography');
          const zoomCmd = commandRegistry.get('typography.font-decrease');
          if (zoomCmd && ctx) zoomCmd.run(ctx);
          break;
        }
        case 'view:toggle-sidebar':
          eventBus.emit('sidebar:toggle');
          break;
        case 'view:toggle-zen':
          eventBus.emit('zen-mode:toggle');
          break;
        case 'view:open-settings':
          eventBus.emit('settings:open');
          break;
        case 'editor:undo':
        case 'editor:history-undo':
          eventBus.emit('editor-action:undo');
          break;
        case 'editor:redo':
        case 'editor:history-redo':
          eventBus.emit('editor-action:redo');
          break;
        case 'editor:clean-indent':
        case 'editor:remove-indents':
          eventBus.emit('editor-action:remove-indents');
          break;
        case 'editor:clean-punctuation':
          eventBus.emit('editor-action:clean-punctuation');
          break;
        default:
          eventBus.emit(`keymap:trigger:${matched.id}`);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
