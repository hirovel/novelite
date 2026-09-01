import { useEffect } from 'react';
import { keymapRegistry } from './KeymapRegistry';
import { commandRegistry } from '../plugins/CommandRegistry';
import { pluginManager } from '../plugins/PluginManager';
import { eventBus } from '../events/EventBus';

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

      // Check if there is a matching Command in CommandRegistry
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
        case 'nav:bookshelf':
          eventBus.emit('bookshelf:open');
          break;
        case 'nav:prev-chapter':
          eventBus.emit('chapter:navigate-prev');
          break;
        case 'nav:next-chapter':
          eventBus.emit('chapter:navigate-next');
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
          eventBus.emit('show-toast', { message: '手稿已安全保存', type: 'success' });
          break;
        case 'literary:format-chinese':
          eventBus.emit('editor-action:format-chinese');
          break;
        case 'literary:toggle-spotlight':
          eventBus.emit('editor-action:toggle-spotlight');
          break;
        case 'literary:toggle-dialogue':
          eventBus.emit('editor-action:toggle-dialogue');
          break;
        case 'literary:quick-export':
          eventBus.emit('quick-export:open');
          break;
        case 'view:toggle-zen':
          eventBus.emit('zen-mode:toggle');
          break;
        case 'view:open-settings':
          eventBus.emit('settings:open');
          break;
        case 'search:toggle-hud':
          eventBus.emit('search-hud:toggle');
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
