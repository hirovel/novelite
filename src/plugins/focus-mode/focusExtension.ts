import type { Extension } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/state';
import { ViewPlugin, Decoration, type DecorationSet, EditorView, type ViewUpdate } from '@codemirror/view';

export type FocusScope = 'paragraph' | 'sentence' | 'horizon';

export interface FocusModeConfig {
  enabled: boolean;
  scope: FocusScope;
  dimOpacity: number; // 0.15 - 0.60
}

/**
 * High-performance Chinese & English sentence boundary scanner.
 * Limits scan range to a bounded local window around cursor (±250 chars) to prevent string allocations on large chapters.
 * Delimiters: 。 ！？ ! ? … \n
 */
function getBoundedSentenceRange(
  view: EditorView,
  head: number,
  lineFrom: number,
  lineTo: number
): { from: number; to: number } {
  const delimiters = /[。！？!?…\n]/;
  const quotes = /["”」』]/;

  // Windowed bounds
  const windowStart = Math.max(lineFrom, head - 250);
  const windowEnd = Math.min(lineTo, head + 250);
  const localSlice = view.state.doc.sliceString(windowStart, windowEnd);

  const localHead = head - windowStart;

  // Search backward
  let from = localHead;
  while (from > 0) {
    const char = localSlice.charAt(from - 1);
    if (delimiters.test(char)) {
      break;
    }
    from--;
  }

  // Search forward
  let to = localHead;
  const sliceLen = localSlice.length;
  while (to < sliceLen) {
    const char = localSlice.charAt(to);
    to++;
    if (delimiters.test(char)) {
      if (to < sliceLen && quotes.test(localSlice.charAt(to))) {
        to++;
      }
      break;
    }
  }

  const globalFrom = windowStart + from;
  const globalTo = windowStart + Math.max(from, to);

  return { from: globalFrom, to: globalTo };
}

const activeLineDeco = Decoration.line({
  class: 'cm-focus-spotlight-active',
});

const horizonLineDeco = Decoration.line({
  class: 'cm-focus-spotlight-horizon',
});

const dimLineDeco = Decoration.line({
  class: 'cm-focus-spotlight-dim',
});

const activeSentenceDeco = Decoration.mark({
  class: 'cm-focus-spotlight-sentence',
});

/**
 * Creates the CodeMirror 6 Ultra-Smooth Focus Mode Extension.
 */
export function createFocusModeExtension(getConfig: () => FocusModeConfig): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      
      // Memoization cache
      private lastHead: number = -1;
      private lastScope: FocusScope | null = null;
      private lastEnabled: boolean = false;

      constructor(view: EditorView) {
        this.decorations = this.buildDeco(view);
      }

      update(update: ViewUpdate) {
        const config = getConfig();

        // 1. If disabled and was disabled, fast return
        if (!config.enabled && !this.lastEnabled) {
          if (this.decorations !== Decoration.none) {
            this.decorations = Decoration.none;
          }
          return;
        }

        const configChanged = config.enabled !== this.lastEnabled || config.scope !== this.lastScope;
        const head = update.state.selection.main.head;
        const headMoved = head !== this.lastHead;

        if (!configChanged && !update.docChanged && !headMoved && !update.viewportChanged) {
          return;
        }

        this.decorations = this.buildDeco(update.view);
      }

      private buildDeco(view: EditorView): DecorationSet {
        const config = getConfig();
        this.lastEnabled = config.enabled;
        this.lastScope = config.scope;

        if (!config.enabled) {
          this.lastHead = -1;
          return Decoration.none;
        }

        const head = view.state.selection.main.head;
        const activeLine = view.state.doc.lineAt(head);
        this.lastHead = head;

        const builder = new RangeSetBuilder<Decoration>();

        for (const { from, to } of view.visibleRanges) {
          let pos = from;
          while (pos <= to) {
            const curLine = view.state.doc.lineAt(pos);
            const isCurrent = curLine.number === activeLine.number;

            if (config.scope === 'paragraph') {
              if (isCurrent) {
                builder.add(curLine.from, curLine.from, activeLineDeco);
              } else {
                builder.add(curLine.from, curLine.from, dimLineDeco);
              }
            } else if (config.scope === 'horizon') {
              if (isCurrent) {
                builder.add(curLine.from, curLine.from, activeLineDeco);
              } else if (Math.abs(curLine.number - activeLine.number) === 1) {
                builder.add(curLine.from, curLine.from, horizonLineDeco);
              } else {
                builder.add(curLine.from, curLine.from, dimLineDeco);
              }
            } else if (config.scope === 'sentence') {
              if (isCurrent) {
                // When on the current line in sentence mode, dim the line and highlight the sentence
                builder.add(curLine.from, curLine.from, dimLineDeco);
                const range = getBoundedSentenceRange(view, head, activeLine.from, activeLine.to);
                if (range.to > range.from) {
                  builder.add(range.from, range.to, activeSentenceDeco);
                }
              } else {
                builder.add(curLine.from, curLine.from, dimLineDeco);
              }
            }

            pos = curLine.to + 1;
          }
        }

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );

  const theme = EditorView.theme({
    '.cm-line.cm-focus-spotlight-dim': {
      opacity: '0.24 !important',
      transition: 'opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important',
    },
    '.cm-line.cm-focus-spotlight-active': {
      opacity: '1 !important',
      transition: 'opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important',
    },
    '.cm-line.cm-focus-spotlight-horizon': {
      opacity: '0.58 !important',
      transition: 'opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important',
    },
    '.cm-line.cm-focus-spotlight-dim .cm-focus-spotlight-sentence': {
      opacity: '1 !important',
      color: 'inherit !important',
      fontWeight: '500',
      textShadow: '0 0 1px rgba(255,255,255,0.2)',
    },
  });

  return [plugin, theme];
}
