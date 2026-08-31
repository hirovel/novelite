import type { Extension } from '@codemirror/state';
import { keymap, EditorView, type Command } from '@codemirror/view';
import { moveLineUp, moveLineDown, deleteLine, copyLineDown, indentLess, indentMore } from '@codemirror/commands';
import { selectNextOccurrence, search } from '@codemirror/search';
import { eventBus } from '../../core/events/EventBus';
import { cleanChineseNovelText } from './chineseTextCleaner';

/**
 * Inserts a new line below current paragraph and moves cursor to start of it,
 * regardless of where the cursor currently is inside the line.
 */
export const insertBlankLineBelow: Command = (view: EditorView) => {
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  const insertPos = line.to;

  view.dispatch({
    changes: { from: insertPos, insert: '\n' },
    selection: { anchor: insertPos + 1 },
    scrollIntoView: true,
  });
  return true;
};

/**
 * Toggles a markdown heading level (e.g. level 1 = '# ', level 2 = '## ') on active line.
 */
export function toggleHeadingCommand(level: number): Command {
  return (view: EditorView) => {
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    const text = line.text;

    const match = text.match(/^(#{1,6})\s+/);
    let newText = text;

    if (level === 0) {
      // Clear heading
      if (match) {
        newText = text.replace(/^#{1,6}\s+/, '');
      }
    } else {
      const prefix = '#'.repeat(level) + ' ';
      if (match) {
        if (match[1].length === level) {
          // Remove heading
          newText = text.substring(match[0].length);
        } else {
          // Replace heading level
          newText = prefix + text.substring(match[0].length);
        }
      } else {
        newText = prefix + text;
      }
    }

    view.dispatch({
      changes: { from: line.from, to: line.to, insert: newText },
      scrollIntoView: true,
    });
    return true;
  };
}

/**
 * One-click cleans and normalizes the entire document or current selection.
 */
export const cleanDocumentCommand: Command = (view: EditorView) => {
  const currentText = view.state.doc.toString();
  const { cleanedText, changesCount } = cleanChineseNovelText(currentText);

  if (changesCount === 0 || cleanedText === currentText) {
    eventBus.emit('show-toast', { message: '排版已是最佳状态，无需清洗', type: 'info' });
    return true;
  }

  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: cleanedText },
  });

  eventBus.emit('show-toast', {
    message: `排版清洗完成：已修复 ${changesCount} 处格式与标点`,
    type: 'success',
  });
  return true;
};

export interface EditorToolkitKeymapConfig {
  moveLineUpKey?: string;
  moveLineDownKey?: string;
  deleteLineKey?: string;
  insertLineBelowKey?: string;
  selectNextKey?: string;
  searchKey?: string;
  replaceKey?: string;
  cleanTextKey?: string;
  heading1Key?: string;
  heading2Key?: string;
  heading0Key?: string;
}

/**
 * Creates the complete CodeMirror 6 Editor Toolkit Extension with customizable keybindings.
 */
export function createEditorToolkitExtension(
  getKeymapConfig?: () => EditorToolkitKeymapConfig
): Extension {
  const defaultKeys: EditorToolkitKeymapConfig = {
    moveLineUpKey: 'Alt-ArrowUp',
    moveLineDownKey: 'Alt-ArrowDown',
    deleteLineKey: 'Mod-Shift-k',
    insertLineBelowKey: 'Mod-Enter',
    selectNextKey: 'Mod-d',
    searchKey: 'Mod-f',
    replaceKey: 'Mod-h',
    cleanTextKey: 'Mod-Shift-l',
    heading1Key: 'Mod-1',
    heading2Key: 'Mod-2',
    heading0Key: 'Mod-0',
  };

  const keys = { ...defaultKeys, ...(getKeymapConfig ? getKeymapConfig() : {}) };

  const customKeybindings = [
    // 1. Line & paragraph movement
    { key: keys.moveLineUpKey || 'Alt-ArrowUp', run: moveLineUp },
    { key: keys.moveLineDownKey || 'Alt-ArrowDown', run: moveLineDown },
    { key: 'Shift-Alt-ArrowDown', run: copyLineDown },
    { key: keys.deleteLineKey || 'Mod-Shift-k', run: deleteLine },
    { key: keys.insertLineBelowKey || 'Mod-Enter', run: insertBlankLineBelow },

    // 2. Multi-cursor & search triggers
    { key: keys.selectNextKey || 'Mod-d', run: selectNextOccurrence },
    {
      key: keys.searchKey || 'Mod-f',
      run: () => {
        eventBus.emit('open-floating-search', { mode: 'search' });
        return true;
      },
    },
    {
      key: keys.replaceKey || 'Mod-h',
      run: () => {
        eventBus.emit('open-floating-search', { mode: 'replace' });
        return true;
      },
    },

    // 3. Headings
    { key: keys.heading1Key || 'Mod-1', run: toggleHeadingCommand(1) },
    { key: keys.heading2Key || 'Mod-2', run: toggleHeadingCommand(2) },
    { key: keys.heading0Key || 'Mod-0', run: toggleHeadingCommand(0) },

    // 4. Chinese text normalizer
    { key: keys.cleanTextKey || 'Mod-Shift-l', run: cleanDocumentCommand },

    // 5. Indent tab
    { key: 'Tab', run: indentMore },
    { key: 'Shift-Tab', run: indentLess },
  ];

  return [
    search({ top: false }), // Enable CodeMirror search engine
    keymap.of(customKeybindings),
  ];
}
