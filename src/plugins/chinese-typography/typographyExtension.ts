import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export interface TypographyConfig {
  fontPreset: 'lxgw' | 'songti' | 'sans' | 'mono' | 'custom';
  customFontName: string;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing?: number;
  indentEnabled?: boolean;
  contentMaxWidth?: number;
  horizontalPadding?: number;
}

export function createTypographyExtension(
  getConfig: () => TypographyConfig
): Extension {
  const resolveFontFamily = (cfg: TypographyConfig): string => {
    if (cfg.fontPreset === 'custom' && cfg.customFontName.trim()) {
      return `"${cfg.customFontName.trim()}", "PingFang SC", "Microsoft YaHei", sans-serif`;
    }

    switch (cfg.fontPreset) {
      case 'lxgw':
        return `"LXGW WenKai", "Kaiti SC", STKaiti, KaiTi, serif`;
      case 'songti':
        return `"Source Han Serif SC", "Noto Serif SC", "Songti SC", STSong, SimSun, serif`;
      case 'mono':
        return `"Sarasa Mono SC", "Cascadia Code", "JetBrains Mono", Consolas, monospace`;
      case 'sans':
      default:
        return `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans", sans-serif`;
    }
  };

  return [
    EditorView.lineWrapping,
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
      },
      '.cm-scroller': {
        fontFamily: 'inherit',
        lineHeight: 'inherit',
        overflowY: 'auto',
        overflowX: 'hidden',
        height: '100%',
        width: '100%',
      },

      // 🌟 标准居中版心与自定义页边距
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
          return `28px ${hPad}px 50vh ${hPad}px`;
        },
        caretColor: 'transparent !important',
      },

      '.cm-selectionLayer': {
        width: '100%',
      },
      '.cm-cursorLayer': {
        width: '100%',
      },

      // 🌟 标准中文首行 2 字符缩进与段落微间距 (纯 CSS，不污染 Markdown 源码)
      '.cm-line': {
        boxSizing: 'border-box',
        width: '100%',
        get textIndent() {
          return getConfig().indentEnabled !== false ? '2em' : '0';
        },
        get marginBottom() {
          const spacing = getConfig().paragraphSpacing ?? 0.7;
          return `${spacing * 0.35}em`;
        },
        padding: '2px 0',
      },

      // 标题与引用块不应用正文首行缩进
      '.cm-header': {
        fontWeight: '700',
        lineHeight: '1.4',
        textIndent: '0 !important',
      },
      '.cm-header-1': {
        fontSize: '1.6em',
        paddingTop: '20px',
        paddingBottom: '10px',
        textIndent: '0 !important',
      },
      '.cm-header-2': {
        fontSize: '1.35em',
        paddingTop: '16px',
        paddingBottom: '8px',
        textIndent: '0 !important',
      },
      '.cm-header-3': {
        fontSize: '1.15em',
        paddingTop: '12px',
        paddingBottom: '6px',
        textIndent: '0 !important',
      },

      // Inline Literary Elements
      '.cm-em': {
        fontStyle: 'italic',
      },
      '.cm-strong': {
        fontWeight: '700',
      },
      '.cm-quote': {
        fontStyle: 'normal',
        borderLeft: '3px solid rgba(167, 139, 250, 0.5)',
        paddingLeft: '14px',
        opacity: '0.85',
        textIndent: '0 !important',
      },
      '.cm-horizontalRule': {
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        margin: '24px 0',
        textIndent: '0 !important',
      },
    }),
  ];
}
