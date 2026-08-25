import type { Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

/**
 * 🌟 稳定防抖打字机居中控制器
 * 修复频繁上下跳动问题：
 * 1. 同行内连续打字时不触发上下滚动（零抖动）。
 * 2. 只有在真正跨行换行或光标偏离黄金安全视口（±50px）时，才平滑微调视口。
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

          // Only perform centering on line change or explicit navigation
          if (isLineChanged || (!update.docChanged && update.selectionSet)) {
            this.smoothCenter();
          }
        }
      }

      private smoothCenter() {
        if (this.isScrolling) return;

        const head = this.view.state.selection.main.head;
        const coords = this.view.coordsAtPos(head);
        if (!coords) return;

        const scrollDOM = this.view.scrollDOM;
        const rect = scrollDOM.getBoundingClientRect();
        const targetY = rect.top + rect.height * 0.40; // 40% golden vertical line

        const currentLineY = (coords.top + coords.bottom) / 2;
        const diff = currentLineY - targetY;

        // 🌟 Dead-zone threshold: If within 35px, do not trigger scroll to avoid jitter
        if (Math.abs(diff) > 35) {
          this.isScrolling = true;
          scrollDOM.scrollBy({
            top: diff,
            behavior: 'smooth',
          });

          setTimeout(() => {
            this.isScrolling = false;
          }, 120);
        }
      }
    }
  );
}
