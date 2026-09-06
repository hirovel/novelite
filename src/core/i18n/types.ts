export type SupportedLanguage = 'zh' | 'en';

export interface TranslationDictionary {
  common: {
    confirm: string;
    cancel: string;
    save: string;
    close: string;
    reset: string;
    search: string;
    delete: string;
    enabled: string;
    disabled: string;
    words: string;
    characters: string;
    unnamedChapter: string;
    unnamedVolume: string;
  };
  nav: {
    primaryEditor: string;
    secondaryEditor: string;
    splitDual: string;
    closeSplit: string;
    searchChapters: string;
  };
  settings: {
    title: string;
    preferences: string;
    language: string;
    checkUpdates: string;
    closePanel: string;
    commandCenter: string;
    tabs: {
      cursor: string;
      background: string;
      typography: string;
      themes: string;
      plugins: string;
      keymap: string;
    };
    tabDesc: {
      cursor: string;
      background: string;
      typography: string;
      typographyDisabled: string;
      themes: string;
      plugins: string;
      keymap: string;
    };
  };
  typography: {
    autoIndent: string;
    autoIndentDesc: string;
    cleanIndents: string;
    formatParagraphs: string;
    cleanPunctuation: string;
    panguSpacing: string;
    kinsokuRules: string;
  };
  commands: {
    switchLanguage: string;
    switchedToEnglish: string;
    switchedToChinese: string;
  };
}
