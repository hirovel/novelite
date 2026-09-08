import React from 'react';
import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { NovelTree } from '../../components/sidebar/NovelTree';
import { WordCounterWidget } from '../immersion/WordCounterWidget';
import { exportNovelService } from '../../core/storage/ExportNovelService';
import { getLanguage } from '../../core/i18n';

export const NovelFilesPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-novel-files',
    name: '小说分卷与章节大纲',
    nameEn: 'Novel Volumes & Chapter Outline',
    version: '2.0.0',
    description: '提供小说分卷创建、章节目录管理、实时字数统计与全本 TXT 导出。',
    descriptionEn: 'Volume and chapter structure management, real-time metrics, and full TXT export.',
    author: 'hirovel',
    icon: 'BookOpen',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    // 1. Status bar word counter
    ctx.registerStatusBarItem({
      id: 'statusbar-word-counter',
      alignment: 'left',
      order: 10,
      render: (c) => React.createElement(WordCounterWidget, { ctx: c }),
    });

    // 2. Command: View word count summary
    ctx.registerCommand({
      id: 'novel.stats-summary',
      title: '查看全书字数与章节统计',
      titleEn: 'View Full Novel Metrics & Chapter Stats',
      descriptionEn: 'View total word count, volumes, and chapter statistics',
      category: '大纲管理',
      categoryEn: 'Outline & Files',
      run: (c) => {
        const isEn = getLanguage() === 'en';
        const proj = c.getProjectData();
        let total = 0;
        let chapCount = 0;
        proj?.volumes?.forEach((v: any) => {
          v.chapters?.forEach((ch: any) => {
            total += ch.wordCount || 0;
            chapCount++;
          });
        });
        const bookTitle = proj?.title || (isEn ? 'Untitled Novel' : '未命名作品');
        const msg = isEn
          ? `"${bookTitle}": ${proj?.volumes?.length || 0} volume(s), ${chapCount} chapter(s), total ${total.toLocaleString()} words`
          : `《${bookTitle}》共 ${proj?.volumes?.length || 0} 卷，${chapCount} 章，总计 ${total.toLocaleString()} 字`;
        c.showToast(msg, 'info');
      },
    });

    // 3. Command: Fast Export TXT (WYSIWYG)
    ctx.registerCommand({
      id: 'novel.export-txt',
      title: '导出为文本文件 (.txt)',
      titleEn: 'Export Novel to Plain Text (.txt)',
      descriptionEn: 'Export entire manuscript or current volume to standard text file',
      category: '大纲管理',
      categoryEn: 'Outline & Files',
      shortcut: 'Ctrl+Shift+E',
      run: (c) => {
        const proj = c.getProjectData();
        if (!proj) return;
        exportNovelService.exportProjectToTxt(proj);
      },
    });
  },
  getSidebarTabs: (_ctx: PluginContext) => [
    {
      id: 'tab-novel-tree',
      title: '章节目录',
      titleEn: 'Outline',
      icon: 'BookOpen',
      order: 1,
      render: (_c, theme) => React.createElement(NovelTree, { theme }),
    },
  ],
};
