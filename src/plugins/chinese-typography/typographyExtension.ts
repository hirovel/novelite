import type { Extension } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate, Decoration, type DecorationSet } from '@codemirror/view';

/**
 * Configuration options for Chinese typography styling and layout.
 */
export interface TypographyConfig {
  fontPreset: 'lxgw' | 'songti' | 'sans' | 'mono' | 'custom';
  customFontName: string;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing?: number;
  indentEnabled?: boolean;
  contentMaxWidth?: number;
  horizontalPadding?: number;
  letterSpacing?: number;
}

const noIndentDeco = Decoration.line({
  class: 'cm-no-indent',
});
const header1Deco = Decoration.line({
  class: 'cm-no-indent cm-line-h1',
});
const header2Deco = Decoration.line({
  class: 'cm-no-indent cm-line-h2',
});
const header3Deco = Decoration.line({
  class: 'cm-no-indent cm-line-h3',
});
const header4Deco = Decoration.line({
  class: 'cm-no-indent cm-line-h4',
});
const quoteDeco = Decoration.line({
  class: 'cm-no-indent cm-line-quote',
});
const hrDeco = Decoration.line({
  class: 'cm-no-indent cm-line-hr',
});
const listDeco = Decoration.line({
  class: 'cm-no-indent cm-line-list',
});
const codeDeco = Decoration.line({
  class: 'cm-no-indent cm-line-code',
});

/**
 * CodeMirror 6 ViewPlugin for Chinese structural line decorations.
 * Automatically exempts Chapter Headings (# ), Blockquotes (> ), Dividers (---), Lists, Code Blocks,
 * and already manually-indented pasted text from duplicate 2em text-indent.
 */
const chineseLineDecorator = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.computeDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.computeDecorations(update.view);
      }
    }

    computeDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = view.state.doc.lineAt(pos);
          const text = line.text;
          const trimmed = text.trim();

          // 1. Chapter and Section Headings (#, ##, ###, #### and Chinese fullwidth ＃)
          if (/^(?:#|＃)\s/.test(trimmed)) {
            builder.add(line.from, line.from, header1Deco);
          } else if (/^(?:##|＃＃)\s/.test(trimmed)) {
            builder.add(line.from, line.from, header2Deco);
          } else if (/^(?:###|＃＃＃)\s/.test(trimmed)) {
            builder.add(line.from, line.from, header3Deco);
          } else if (/^(?:####|＃＃＃＃)\s/.test(trimmed)) {
            builder.add(line.from, line.from, header4Deco);
          }
          // 2. Blockquotes & Poem Inscriptions
          else if (/^(?:>|》)\s/.test(trimmed)) {
            builder.add(line.from, line.from, quoteDeco);
          }
          // 3. Horizontal rules / Scene separators (---, ***, ___)
          else if (/^[-*_]{3,}$/.test(trimmed)) {
            builder.add(line.from, line.from, hrDeco);
          }
          // 4. Unordered and Ordered Lists (- , * , + , 1. , 1、)
          else if (/^[-*+•·]\s/.test(trimmed) || /^\d+[.、]\s/.test(trimmed)) {
            builder.add(line.from, line.from, listDeco);
          }
          // 5. Code block fences or markdown table rows
          else if (trimmed.startsWith('```') || trimmed.startsWith('~~~') || trimmed.startsWith('|')) {
            builder.add(line.from, line.from, codeDeco);
          }
          // 6. Prevent quadruple indent when pasting text with manual fullwidth '　　' or 4 spaces
          else if (text.startsWith('　　') || text.startsWith('    ')) {
            builder.add(line.from, line.from, noIndentDeco);
          }
          // 7. Blank lines
          else if (trimmed.length === 0) {
            builder.add(line.from, line.from, noIndentDeco);
          }

          pos = line.to + 1;
        }
      }
      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

/**
 * Creates CodeMirror 6 typography and layout theme extensions based on dynamic configuration.
 * Fully decoupled and configurable via Plugin Settings.
 *
 * @param getConfig Callback returning the active TypographyConfig.
 */
export function createTypographyExtension(
  getConfig: () => TypographyConfig
): Extension {
  const resolveFontFamily = (cfg: TypographyConfig): string => {
    if (cfg.fontPreset === 'custom' && cfg.customFontName.trim()) {
      return `"${cfg.customFontName.trim()}", "PingFang SC", "Microsoft YaHei", "微软雅黑", sans-serif`;
    }

    switch (cfg.fontPreset) {
      case 'lxgw':
        return `"LXGW WenKai Screen", "LXGW WenKai", "霞鹜文楷", "Kaiti SC", STKaiti, KaiTi, "楷体", serif`;
      case 'songti':
        return `"Source Han Serif SC", "思源宋体", "Noto Serif SC", "Songti SC", STSong, SimSun, "宋体", serif`;
      case 'mono':
        return `"Sarasa Mono SC", "等距更纱黑体", "Cascadia Code", "JetBrains Mono", Consolas, "Courier New", monospace`;
      case 'sans':
      default:
        return `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", "Noto Sans SC", sans-serif`;
    }
  };

  return [
    EditorView.lineWrapping,
    chineseLineDecorator,
    EditorView.theme({
      '&': {
        height: '100%',
        width: '100%',
        get fontSize() {
          return `${getConfig().fontSize || 18}px`;
        },
        get lineHeight() {
          return `${getConfig().lineHeight || 1.95}`;
        },
        get fontFamily() {
          return resolveFontFamily(getConfig());
        },
        letterSpacing: '0.02em',
        fontFeatureSettings: '"halt" 1, "kern" 1, "liga" 1',
        textRendering: 'optimizeLegibility',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      '.cm-scroller': {
        fontFamily: 'inherit',
        lineHeight: 'inherit',
        overflowY: 'auto',
        overflowX: 'hidden',
        height: '100%',
        width: '100%',
      },

      // 🌟 标准居中版心与黄金留白
      '.cm-content': {
        width: '100%',
        get maxWidth() {
          const maxW = getConfig().contentMaxWidth;
          return maxW ? `${maxW}px` : '780px';
        },
        margin: '0 auto',
        boxSizing: 'border-box',
        get padding() {
          const hPad = getConfig().horizontalPadding ?? 32;
          return `42px ${hPad}px 65vh ${hPad}px`;
        },
        caretColor: 'transparent !important',
      },

      '.cm-selectionLayer': {
        width: '100%',
        pointerEvents: 'none !important',
      },
      '.cm-cursorLayer': {
        width: '100%',
        pointerEvents: 'none !important',
      },

      // 🌟 标准中文首行 2 字符缩进与国标标点避头尾断行 (GB/T 15834 Kinsoku)
      '.cm-line': {
        boxSizing: 'border-box',
        width: '100%',
        margin: '0 !important',
        get textIndent() {
          return getConfig().indentEnabled !== false ? '2em' : '0';
        },
        get paddingBottom() {
          const spacing = getConfig().paragraphSpacing ?? 0.7;
          return `${(spacing * 0.45) * (getConfig().fontSize || 18)}px`;
        },
        paddingTop: '2px',
        paddingLeft: '0',
        paddingRight: '0',
        letterSpacing: 'inherit',
        lineBreak: 'strict',
        wordBreak: 'break-all',
        overflowWrap: 'break-word',
        textWrap: 'pretty',
        textAlign: 'justify',
        textJustify: 'inter-ideograph',
      },

      // 🌟 智能免缩进装饰（大标题顶格靠左，美观大气）
      '.cm-line.cm-no-indent': {
        textIndent: '0 !important',
      },
      '.cm-line.cm-line-h1': {
        textIndent: '0 !important',
        fontWeight: '700',
        fontSize: '1.45em',
        lineHeight: '1.4',
        paddingTop: '24px',
        paddingBottom: '12px',
        letterSpacing: '0.04em',
        opacity: '0.96',
      },
      '.cm-line.cm-line-h2': {
        textIndent: '0 !important',
        fontWeight: '700',
        fontSize: '1.25em',
        lineHeight: '1.4',
        paddingTop: '18px',
        paddingBottom: '8px',
        letterSpacing: '0.03em',
        opacity: '0.92',
      },
      '.cm-line.cm-line-h3': {
        textIndent: '0 !important',
        fontWeight: '600',
        fontSize: '1.12em',
        lineHeight: '1.4',
        paddingTop: '12px',
        paddingBottom: '6px',
        opacity: '0.88',
      },
      '.cm-line.cm-line-h4': {
        textIndent: '0 !important',
        fontWeight: '600',
        fontSize: '1.04em',
        lineHeight: '1.4',
        paddingTop: '8px',
        paddingBottom: '4px',
        opacity: '0.85',
      },
      '.cm-line.cm-line-quote': {
        textIndent: '0 !important',
        paddingLeft: '14px',
        borderLeft: '3px solid rgba(167, 139, 250, 0.45)',
        backgroundColor: 'rgba(167, 139, 250, 0.04)',
        borderRadius: '0 6px 6px 0',
        margin: '8px 0',
      },
      '.cm-line.cm-line-hr': {
        textIndent: '0 !important',
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%)',
        margin: '28px 0',
      },
      '.cm-line.cm-line-list': {
        textIndent: '0 !important',
        paddingLeft: '8px',
      },
      '.cm-line.cm-line-code': {
        textIndent: '0 !important',
        fontFamily: '"Sarasa Mono SC", Consolas, monospace !important',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '4px',
        padding: '2px 8px',
      },

      // 🌟 文人雅致行内与块级元素
      '.cm-em': {
        fontStyle: 'italic',
      },
      '.cm-strong': {
        fontWeight: '700',
      },
    }),
  ];
}
