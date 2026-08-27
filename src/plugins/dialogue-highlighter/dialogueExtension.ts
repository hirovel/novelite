import type { Extension } from '@codemirror/state';
import { MatchDecorator, ViewPlugin, Decoration, EditorView } from '@codemirror/view';

/**
 * Creates the CodeMirror 6 Dialogue Highlighter extension.
 * Highlights novel quotes and character dialogues wrapped in quotation marks with subtle theme glow.
 *
 * @param getEnabled Callback returning whether dialogue highlighting is active.
 * @param getAccentColor Callback returning the active theme accent color.
 */
export function createDialogueHighlighterExtension(
  getEnabled: () => boolean,
  getAccentColor: () => string
): Extension {
  const dialogueDecorator = new MatchDecorator({
    regexp: /(“[^”\n]*”|"([^"\n]*)"|「[^」\n]*」)/g,
    decoration: () => Decoration.mark({ class: 'cm-dialogue-quote' }),
  });

  const plugin = ViewPlugin.define(
    (view) => ({
      decorations: getEnabled() ? dialogueDecorator.createDeco(view) : Decoration.none,
      update(u) {
        if (!getEnabled()) {
          this.decorations = Decoration.none;
          return;
        }
        this.decorations = dialogueDecorator.updateDeco(u, this.decorations);
      },
    }),
    {
      decorations: (v) => v.decorations,
    }
  );

  const theme = EditorView.theme({
    '.cm-dialogue-quote': {
      get color() {
        return `${getAccentColor() || '#a5b4fc'} !important`;
      },
      textShadow: '0 0 8px rgba(165, 180, 252, 0.25)',
    },
  });

  return [plugin, theme];
}
