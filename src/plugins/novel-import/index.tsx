import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { eventBus } from '../../core/events/EventBus';

export const NovelImportPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-novel-import',
    name: '稿件导入',
    nameEn: 'Manuscript Importer',
    version: '1.0.0',
    description: '支持导入外部 TXT / Markdown 文本小说，智能识别全书分卷与章节大纲，无缝迁入作品书架。',
    descriptionEn: 'Import external TXT/Markdown novels with smart volume & chapter outline detection.',
    author: 'hirovel',
    icon: 'UploadCloud',
    defaultEnabled: true,
  },

  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'novel.import-txt',
      title: '导入 TXT 小说文件 (自动识别卷章)',
      titleEn: 'Import TXT Novel (Auto-detect Chapters)',
      description: '从本地导入 .txt / .md 文本并自动识别分卷章节',
      descriptionEn: 'Import .txt / .md files with auto-detected chapters',
      category: 'literary',
      categoryEn: 'Literary',
      run: () => {
        eventBus.emit('novel-import:open');
      },
    });
  },
};
