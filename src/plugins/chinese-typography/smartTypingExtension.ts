import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export interface SmartTypingConfig {
  enabled: boolean;
  autoIndent: boolean;
  autoPairQuotes: boolean;
  singleStepBackspace: boolean;
}

const OPEN_TO_CLOSE: Record<string, string> = {
  '“': '”',
  '”': '”',
  '"': '"',
  '‘': '’',
  '’': '’',
  "'": "'",
  '《': '》',
  '（': '）',
  '(': ')',
  '【': '】',
  '[': ']',
  '「': '」',
  '『': '』',
  '{': '}',
};

const PAIR_CHECKS: Array<[string, string]> = [
  ['“', '”'],
  ['"', '"'],
  ['‘', '’'],
  ["'", "'"],
  ['《', '》'],
  ['（', '）'],
  ['(', ')'],
  ['【', '】'],
  ['[', ']'],
  ['「', '」'],
  ['『', '』'],
  ['{', '}'],
];

export function createSmartTypingExtension(getConfig: () => SmartTypingConfig): Extension {
  return [
    EditorView.domEventHandlers({
      keydown(event, view) {
        const config = getConfig();
        if (!config.enabled) return false;

        const state = view.state;
        const sel = state.selection.main;
        if (!sel.empty) return false;

        const line = state.doc.lineAt(sel.head);
        const col = sel.head - line.from;

        // 1. Smart Enter: Auto full-width indent (only when autoIndent is enabled)
        if (event.key === 'Enter' && config.autoIndent) {
          const lineText = line.text;
          const isIndented = lineText.startsWith('\u3000\u3000') || lineText.startsWith('  ');

          if (isIndented && !event.shiftKey) {
            event.preventDefault();
            view.dispatch({
              changes: { from: sel.head, insert: '\n\u3000\u3000' },
              selection: { anchor: sel.head + 3 },
              scrollIntoView: true,
            });
            return true;
          }
        }

        // 2. Smart Backspace:
        if (event.key === 'Backspace' && config.singleStepBackspace) {
          // A. Delete 2 full-width spaces at line start in 1 step
          const lineText = line.text;
          if (col === 2 && lineText.startsWith('\u3000\u3000')) {
            event.preventDefault();
            view.dispatch({
              changes: { from: line.from, to: line.from + 2, insert: '' },
              selection: { anchor: line.from },
              scrollIntoView: true,
            });
            return true;
          }

          // B. Delete empty pair: When cursor is directly between empty pair e.g. “|”, delete both
          if (sel.head > 0 && sel.head < state.doc.length) {
            const prevChar = state.doc.sliceString(sel.head - 1, sel.head);
            const nextChar = state.doc.sliceString(sel.head, sel.head + 1);
            for (const [open, close] of PAIR_CHECKS) {
              if (prevChar === open && nextChar === close) {
                event.preventDefault();
                view.dispatch({
                  changes: { from: sel.head - 1, to: sel.head + 1, insert: '' },
                  selection: { anchor: sel.head - 1 },
                  scrollIntoView: true,
                });
                return true;
              }
            }
          }
        }

        return false;
      },
    }),

    EditorView.inputHandler.of((view, from, to, text) => {
      const config = getConfig();
      if (!config.enabled || !config.autoPairQuotes) return false;

      if (text in OPEN_TO_CLOSE) {
        let openChar = text;
        let closeChar = OPEN_TO_CLOSE[text];

        // If user typed closing quote/bracket at open position, normalize opening to openChar
        if (text === '”') {
          openChar = '“';
          closeChar = '”';
        } else if (text === '’') {
          openChar = '‘';
          closeChar = '’';
        }

        const state = view.state;
        const sel = state.selection.main;

        if (sel.empty) {
          view.dispatch({
            changes: { from, to, insert: openChar + closeChar },
            selection: { anchor: from + openChar.length },
            scrollIntoView: true,
          });
          return true;
        } else {
          const selectedText = state.doc.sliceString(sel.from, sel.to);
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: openChar + selectedText + closeChar },
            selection: { anchor: sel.from + openChar.length, head: sel.to + openChar.length },
            scrollIntoView: true,
          });
          return true;
        }
      }

      return false;
    }),
  ];
}
