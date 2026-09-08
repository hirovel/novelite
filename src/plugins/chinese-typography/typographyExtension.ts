import { Prec, type Extension } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate, Decoration, type DecorationSet, keymap } from '@codemirror/view';
import { getLanguage } from '../../core/i18n';

/**
 * Detailed configuration options for Chinese typography styling and layout.
 */
export interface TypographyConfig {
  fontPreset: 'lxgw' | 'songti' | 'sans' | 'mono' | 'custom';
  customFontName: string;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing?: number;
  indentEnabled?: boolean;
  indentSize?: '2em' | '1em' | '3em' | '0';
  kinsokuStrictness?: 'strict' | 'loose' | 'native';
  punctuationHalt?: boolean;
  textAlignment?: 'justify' | 'left';
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
const hideHashDeco = Decoration.replace({});

/**
 * Checks if a line text is exempt from auto indentation (e.g. Markdown Header, Blockquote, Divider, Code fence, List)
 */
export function isExemptLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/^(?:#|＃)\s/.test(trimmed)) return true; // # Header
  if (/^(?:##|＃＃)\s/.test(trimmed)) return true;
  if (/^(?:###|＃＃＃)\s/.test(trimmed)) return true;
  if (/^(?:####|＃＃＃＃)\s/.test(trimmed)) return true;
  if (/^(?:>|》)\s/.test(trimmed)) return true; // > Blockquote
  if (/^[-*_]{3,}$/.test(trimmed)) return true; // --- Divider
  if (/^[-*+•·]\s/.test(trimmed) || /^\d+[.、]\s/.test(trimmed)) return true; // List
  if (trimmed.startsWith('```') || trimmed.startsWith('~~~') || trimmed.startsWith('|')) return true; // Code / Table
  return false;
}

/**
 * CodeMirror 6 ViewPlugin for Chinese structural line decorations.
 */
const chineseLineDecorator = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.computeDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.computeDecorations(update.view);
      }
    }

    computeDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const selection = view.state.selection.main;

      for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = view.state.doc.lineAt(pos);
          const text = line.text;
          const trimmed = text.trim();

          const isCursorOnLine = selection.to >= line.from && selection.from <= line.to;

          // 1. Chapter and Section Headings (#, ##, ###, #### and Chinese fullwidth ＃)
          const headingMatch = text.match(/^(\s*(?:#{1,6}|＃{1,6})\s+)/);
          if (headingMatch) {
            const hashSymbols = headingMatch[1].replace(/\s/g, '');
            const level = hashSymbols.length;
            const deco = level === 1 ? header1Deco : level === 2 ? header2Deco : level === 3 ? header3Deco : header4Deco;
            builder.add(line.from, line.from, deco);

            // Option B: Live Preview dynamic heading reveal.
            // When cursor is NOT on this line, seamlessly hide the leading '# ' syntax marks!
            if (!isCursorOnLine) {
              builder.add(line.from, line.from + headingMatch[1].length, hideHashDeco);
            }
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
          // 6. Blank lines
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
 * Creates CodeMirror 6 typography and physical indentation extension.
 */
export function createTypographyExtension(
  getConfig: () => TypographyConfig
): Extension {
  const resolveFontFamily = (cfg: TypographyConfig): string => {
    const isEn = getLanguage() === 'en';

    if (cfg.fontPreset === 'custom' && cfg.customFontName.trim()) {
      return `"${cfg.customFontName.trim()}", "PingFang SC", "Microsoft YaHei", "微软雅黑", sans-serif`;
    }

    if (isEn) {
      switch (cfg.fontPreset) {
        case 'lxgw':
          return `"Georgia", "Baskerville", "Palatino Linotype", "Book Antiqua", "Times New Roman", serif`;
        case 'songti':
          return `"Garamond", "EB Garamond", "Times New Roman", "Baskerville", serif`;
        case 'mono':
          return `"Cascadia Code", "JetBrains Mono", Consolas, "Courier New", monospace`;
        case 'sans':
        default:
          return `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, Helvetica, Arial, sans-serif`;
      }
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

  const resolveLineBreak = (cfg: TypographyConfig): string => {
    if (getLanguage() === 'en') return 'normal';
    if (cfg.kinsokuStrictness === 'native') return 'normal';
    if (cfg.kinsokuStrictness === 'loose') return 'loose';
    return 'strict';
  };

  const resolveFontFeatures = (cfg: TypographyConfig): string => {
    if (getLanguage() === 'en') {
      return '"kern" 1, "liga" 1';
    }
    const halt = cfg.punctuationHalt !== false ? '"halt" 1, ' : '';
    return `${halt}"kern" 1, "liga" 1, "palt" 1`;
  };

  /**
   * 🌟 1. Physical Indentation Enter Keymap
   * Automatically inserts '\n\u3000\u3000' (two physical fullwidth Chinese spaces) on Enter for normal prose.
   */
  const physicalIndentKeymap = Prec.high(
    keymap.of([
      {
        key: 'Enter',
        run: (view: EditorView) => {
          const cfg = getConfig();
          if (cfg.indentEnabled === false || getLanguage() === 'en') return false;

          const state = view.state;
          const head = state.selection.main.head;
          const line = state.doc.lineAt(head);
          const lineText = line.text;

          // If the line is only fullwidth/halfwidth spaces and user hits Enter, clear it to create clean blank line
          if (lineText.trim() === '' && lineText.length > 0 && head === line.to) {
            view.dispatch({
              changes: [
                { from: line.from, to: line.to, insert: '' },
                { from: line.from, to: line.from, insert: '\n' },
              ],
              selection: { anchor: line.from + 1 },
              userEvent: 'input',
            });
            return true;
          }

          // If header, quote, divider, or list -> insert normal newline without indent
          if (isExemptLine(lineText)) {
            view.dispatch({
              changes: { from: head, to: state.selection.main.to, insert: '\n' },
              selection: { anchor: head + 1 },
              userEvent: 'input',
            });
            return true;
          }

          // Normal prose paragraph -> insert '\n\u3000\u3000'
          const indentStr = '\n\u3000\u3000';
          view.dispatch({
            changes: { from: head, to: state.selection.main.to, insert: indentStr },
            selection: { anchor: head + indentStr.length },
            userEvent: 'input',
          });
          return true;
        },
      },
      {
        key: 'Backspace',
        run: (view: EditorView) => {
          const cfg = getConfig();
          if (cfg.indentEnabled === false || getLanguage() === 'en') return false;

          const state = view.state;
          if (!state.selection.main.empty) return false;

          const head = state.selection.main.head;
          const line = state.doc.lineAt(head);

          // If cursor is at column 2 (immediately after '\u3000\u3000'), delete both fullwidth spaces at once
          if (head === line.from + 2 && line.text.startsWith('\u3000\u3000')) {
            view.dispatch({
              changes: { from: line.from, to: line.from + 2, insert: '' },
              selection: { anchor: line.from },
              userEvent: 'delete',
            });
            return true;
          }

          return false;
        },
      },
    ])
  );

  /**
   * 🌟 2. Physical Indentation Paste Normalizer
   * When pasting unindented Chinese text, automatically format with physical '\u3000\u3000'.
   */
  const pasteNormalizer = EditorView.domEventHandlers({
    paste(e, view) {
      const cfg = getConfig();
      if (cfg.indentEnabled === false || getLanguage() === 'en') return false;

      const text = e.clipboardData?.getData('text/plain');
      if (!text) return false;

      const lines = text.split(/\r?\n/);
      let needsFormatting = false;

      const formattedLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || isExemptLine(line)) return line;

        if (line.startsWith('\u3000\u3000')) {
          return line;
        }

        if (line.startsWith('    ')) {
          needsFormatting = true;
          return '\u3000\u3000' + line.replace(/^ {4}/, '');
        }

        needsFormatting = true;
        return '\u3000\u3000' + line.replace(/^[ \t\u3000\u00A0]+/, '');
      });

      if (needsFormatting) {
        e.preventDefault();
        const formatted = formattedLines.join('\n');
        const sel = view.state.selection.main;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: formatted },
          selection: { anchor: sel.from + formatted.length },
          userEvent: 'input.paste',
        });
        return true;
      }

      return false;
    },
  });

  return [
    EditorView.lineWrapping,
    chineseLineDecorator,
    physicalIndentKeymap,
    pasteNormalizer,
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
        get letterSpacing() {
          const lSp = getConfig().letterSpacing;
          return lSp !== undefined ? `${lSp}em` : '0.02em';
        },
        get fontFeatureSettings() {
          return resolveFontFeatures(getConfig());
        },
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

      // 🌟 物理空格真实缩进（text-indent 设为 0，完全由正文物理空格 \u3000\u3000 驱动，所见即所得，落盘与复制 100% 保持）
      '.cm-line': {
        boxSizing: 'border-box',
        width: '100%',
        margin: '0 !important',
        textIndent: '0 !important',
        get paddingBottom() {
          const spacing = getConfig().paragraphSpacing ?? 0.7;
          return `${(spacing * 0.45) * (getConfig().fontSize || 18)}px`;
        },
        paddingTop: '2px',
        paddingLeft: '0',
        paddingRight: '0',
        letterSpacing: 'inherit',
        get lineBreak() {
          return resolveLineBreak(getConfig());
        },
        wordBreak: 'break-all',
        overflowWrap: 'break-word',
        textWrap: 'pretty',
        get textAlign() {
          return getConfig().textAlignment === 'left' ? 'left' : 'justify';
        },
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
