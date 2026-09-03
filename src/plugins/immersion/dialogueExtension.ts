import type { Extension } from '@codemirror/state';
import { MatchDecorator, ViewPlugin, Decoration, type DecorationSet, EditorView, type ViewUpdate } from '@codemirror/view';

export type DialogueColorPreset = 'theme' | 'cinnabar' | 'ink' | 'amber' | 'emerald' | 'azure' | 'violet' | 'white' | 'custom';

export const DIALOGUE_COLOR_MAP: Record<Exclude<DialogueColorPreset, 'custom'>, { name: string; hex: string }> = {
  theme: { name: '跟随主题', hex: 'var(--theme-accent, #c95738)' },
  cinnabar: { name: '朱砂赤羽', hex: '#c95738' },
  ink: { name: '水墨玄石', hex: '#292524' },
  amber: { name: '暖褐琥珀', hex: '#d97706' },
  emerald: { name: '青瓷墨绿', hex: '#0f766e' },
  azure: { name: '深海霁蓝', hex: '#1d4ed8' },
  violet: { name: '紫藤微光', hex: '#7c3aed' },
  white: { name: '纯白高光', hex: '#ffffff' },
};

export interface DialogueHighlighterConfig {
  enabled: boolean;
  colorPreset: DialogueColorPreset;
  customColor?: string;
  highlightThoughts: boolean;
}

/**
 * Creates the CodeMirror 6 Dialogue & Inner-Thoughts Highlighter Extension 2.0.
 *
 * Supports:
 * - Dialogue quotation marks: “……”, "……", 「……」, 『……』
 * - Inner monologue thoughts (optional): （……）, (...)
 * - Arbitrary Custom Hex Colors & 7 Literary Color Presets
 * - Viewport-bounded MatchDecorator (instant 0-overhead performance)
 */
export function createDialogueHighlighterExtension(
  getConfig: () => DialogueHighlighterConfig,
  getThemeAccent?: () => string
): Extension {
  const dialogueDecorator = new MatchDecorator({
    regexp: /(“[^”\n]*”|"([^"\n]*)"|「[^」\n]*」|『[^』\n]*』)/g,
    decoration: () => Decoration.mark({ class: 'cm-dialogue-quote' }),
  });

  const thoughtDecorator = new MatchDecorator({
    regexp: /(（[^）\n]+）|\([^)\n]+\))/g,
    decoration: () => Decoration.mark({ class: 'cm-dialogue-thought' }),
  });

  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDeco(view);
      }

      update(update: ViewUpdate) {
        const config = getConfig();
        if (!config.enabled) {
          if (this.decorations !== Decoration.none) {
            this.decorations = Decoration.none;
          }
          return;
        }

        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDeco(update.view);
        }
      }

      private buildDeco(view: EditorView): DecorationSet {
        const config = getConfig();
        if (!config.enabled) return Decoration.none;

        let deco = dialogueDecorator.createDeco(view);
        if (config.highlightThoughts) {
          const thoughtDeco = thoughtDecorator.createDeco(view);
          deco = deco.update({ add: thoughtDeco as any });
        }
        return deco;
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );

  const attributes = EditorView.editorAttributes.of(() => {
    const config = getConfig();
    if (!config.enabled) return null;

    let targetHex = 'var(--novelite-dialogue-color, var(--theme-accent, #c95738))';
    if (config.colorPreset === 'custom' && config.customColor) {
      targetHex = config.customColor;
    } else if (config.colorPreset === 'theme') {
      const themeAcc = getThemeAccent?.();
      if (themeAcc) targetHex = themeAcc;
      else targetHex = 'var(--novelite-dialogue-color, var(--theme-accent, #c95738))';
    } else if (config.colorPreset in DIALOGUE_COLOR_MAP) {
      targetHex = DIALOGUE_COLOR_MAP[config.colorPreset as keyof typeof DIALOGUE_COLOR_MAP].hex;
    }

    return {
      style: `--novelite-dialogue-color: ${targetHex};`,
    };
  });

  const theme = EditorView.theme({
    '.cm-dialogue-quote': {
      color: 'var(--novelite-dialogue-color, var(--theme-accent, #c95738)) !important',
      fontWeight: '500',
      transition: 'color 0.15s ease',
    },
    '.cm-dialogue-thought': {
      color: 'var(--novelite-dialogue-color, var(--theme-accent, #c95738)) !important',
      opacity: '0.85',
      fontStyle: 'italic',
      transition: 'color 0.15s ease, opacity 0.15s ease',
    },
  });

  return [plugin, attributes, theme];
}
