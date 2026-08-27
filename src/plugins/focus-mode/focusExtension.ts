import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Creates the CodeMirror 6 Focus Mode (Paragraph Spotlight) theme extension.
 * When enabled, dims non-active paragraphs to reduce visual clutter and boost immersion.
 */
export function createFocusModeExtension(): Extension {
  return EditorView.theme({
    '&.novelite-focus-mode .cm-line': {
      opacity: '0.35',
      transition: 'opacity 0.25s cubic-bezier(0.2, 0, 0, 1)',
    },
    '&.novelite-focus-mode .cm-activeLine': {
      opacity: '1 !important',
    },
  });
}
