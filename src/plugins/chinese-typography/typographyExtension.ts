import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export interface TypographyConfig {
  fontPreset: 'lxgw' | 'songti' | 'sans' | 'mono' | 'custom';
  customFontName: string;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing?: number;
  indentEnabled?: boolean;
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
          return `${getConfig().fontSize || 16}px`;
        },
        get lineHeight() {
          return `${getConfig().lineHeight || 1.8}`;
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

      // 🌟 标准编辑器风格：自然撑满容器，标准留白，绝无左右大面积空隙
      '.cm-content': {
        width: '100%',
        maxWidth: '100%',
        margin: '0',
        boxSizing: 'border-box',
        padding: '24px 32px 300px 32px',
        caretColor: 'transparent !important',
      },

      '.cm-selectionLayer': {
        width: '100%',
      },
      '.cm-cursorLayer': {
        width: '100%',
      },

      // 🌟 标准换行与行渲染：无强制首行缩进，纯净自然
      '.cm-line': {
        boxSizing: 'border-box',
        width: '100%',
        margin: '0',
        padding: '2px 0',
        textIndent: '0 !important',
      },

      // Headings
      '.cm-header': {
        fontWeight: '700',
        lineHeight: '1.4',
      },
      '.cm-header-1': {
        fontSize: '1.6em',
        paddingTop: '16px',
        paddingBottom: '8px',
      },
      '.cm-header-2': {
        fontSize: '1.35em',
        paddingTop: '12px',
        paddingBottom: '6px',
      },
      '.cm-header-3': {
        fontSize: '1.15em',
        paddingTop: '8px',
        paddingBottom: '4px',
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
      },
      '.cm-horizontalRule': {
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        margin: '20px 0',
      },
    }),
  ];
}
