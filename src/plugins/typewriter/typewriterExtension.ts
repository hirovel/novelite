import type { Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

/**
 * Creates the CodeMirror 6 Typewriter mode extension.
 * Automatically keeps the active line smoothly centered at the golden vertical ratio (40%)
 * using view.requestMeasure to prevent DOM layout thrashing and dead-zone filtering to avoid jitter.
 *
 * @param getEnabled Callback returning whether Typewriter mode is active.
 */
export function createTypewriterExtension(getEnabled: () => boolean): Extension {
  return ViewPlugin.fromClass(
    class {
      private view: EditorView;
      private lastLineNumber: number = -1;
      private isScrolling: boolean = false;

      constructor(view: EditorView) {
        this.view = view;
      }

      update(update: ViewUpdate) {
        if (!getEnabled()) return;

        if (update.selectionSet || update.docChanged) {
          const head = this.view.state.selection.main.head;
          const currentLine = this.view.state.doc.lineAt(head).number;

          const isLineChanged = this.lastLineNumber !== currentLine;
          this.lastLineNumber = currentLine;

          if (isLineChanged || (!update.docChanged && update.selectionSet)) {
            this.smoothCenter();
          }
        }
      }

      private smoothCenter() {
        if (this.isScrolling) return;

        this.view.requestMeasure({
          read: (v) => {
            const head = v.state.selection.main.head;
            const coords = v.coordsAtPos(head);
            if (!coords) return null;

            const scrollDOM = v.scrollDOM;
            const rect = scrollDOM.getBoundingClientRect();
            const targetY = rect.top + rect.height * 0.40;

            const currentLineY = (coords.top + coords.bottom) / 2;
            const diff = currentLineY - targetY;

            if (Math.abs(diff) > 35) {
              return diff;
            }
            return null;
          },
          write: (diff) => {
            if (diff === null || this.isScrolling) return;

            this.isScrolling = true;
            this.view.scrollDOM.scrollBy({
              top: diff,
              behavior: 'smooth',
            });

            setTimeout(() => {
              this.isScrolling = false;
            }, 120);
          },
        });
      }
    }
  );
}
