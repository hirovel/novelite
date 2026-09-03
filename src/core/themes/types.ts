export interface Theme {
  id: string;
  name: string;
  nameZh: string;
  isDark: boolean;
  cursorStream?: [string, string];
  colors: {
    bg: string;
    bgSecondary: string;
    bgHover: string;
    text: string;
    textMuted: string;
    border: string;
    accent: string;
    accentGlow: string;
    cursor: string;
    selection: string;
    statusbarBg: string;
    statusbarText: string;
    editorBg: string;
    editorText: string;
  };
}
