import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

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
        letterSpacing: '0.015em',
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
          return `42px ${hPad}px 55vh ${hPad}px`;
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

      // 🌟 标准中文首行 2 字符缩进与精准段落微间距
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
      },

      // 🌟 章回标题层级美学（智能豁免正文首行缩进）
      '.cm-header': {
        fontWeight: '700',
        lineHeight: '1.35',
        textIndent: '0 !important',
      },
      '.cm-header-1': {
        fontSize: '1.75em',
        letterSpacing: '0.035em',
        paddingTop: '36px',
        paddingBottom: '16px',
        textIndent: '0 !important',
      },
      '.cm-header-2': {
        fontSize: '1.35em',
        letterSpacing: '0.025em',
        paddingTop: '24px',
        paddingBottom: '10px',
        textIndent: '0 !important',
      },
      '.cm-header-3': {
        fontSize: '1.18em',
        paddingTop: '16px',
        paddingBottom: '8px',
        textIndent: '0 !important',
      },

      // 🌟 文人雅致行内与块级元素
      '.cm-em': {
        fontStyle: 'italic',
      },
      '.cm-strong': {
        fontWeight: '700',
      },
      // 卷首引言 / 题记诗词块
      '.cm-quote': {
        fontStyle: 'normal',
        borderLeft: '3px solid rgba(167, 139, 250, 0.45)',
        backgroundColor: 'rgba(167, 139, 250, 0.04)',
        borderRadius: '0 8px 8px 0',
        padding: '10px 18px',
        margin: '12px 0',
        opacity: '0.9',
        textIndent: '0 !important',
      },
      // 剧情分隔线 (两端渐变羽化)
      '.cm-horizontalRule': {
        border: 'none',
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%)',
        margin: '32px 0',
        textIndent: '0 !important',
      },
    }),
  ];
}
