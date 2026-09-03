import React from 'react';
import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { NovelTree } from '../../components/sidebar/NovelTree';
import { WordCounterWidget } from '../immersion/WordCounterWidget';

export const NovelFilesPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-novel-files',
    name: '小说分卷与章节大纲',
    version: '2.0.0',
    description: '提供小说分卷创建、章节目录管理、实时字数统计与手稿全本导出。',
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
      title: '查看全书字数与章节看板',
      category: '大纲管理',
      run: (c) => {
        const proj = c.getProjectData();
        let total = 0;
        let chapCount = 0;
        proj?.volumes?.forEach((v: any) => {
          v.chapters?.forEach((ch: any) => {
            total += ch.wordCount || 0;
            chapCount++;
          });
        });
        c.showToast(`《${proj?.title || '未命名'}》共 ${proj?.volumes?.length || 0} 卷，${chapCount} 章，总计 ${total.toLocaleString()} 字`, 'info');
      },
    });

    // 3. Command: Fast Export TXT
    ctx.registerCommand({
      id: 'novel.export-txt',
      title: '导出为纯文本手稿 (.txt)',
      category: '大纲管理',
      shortcut: 'Ctrl+Shift+E',
      run: async (c) => {
        const proj = c.getProjectData();
        if (!proj) return;
        let output = `${proj.title || '小说'}\n作者：${proj.author || '佚名'}\n\n====================================\n\n`;
        proj.volumes?.forEach((vol: any) => {
          output += `\n\n【${vol.title}】\n\n`;
          vol.chapters?.forEach((chap: any) => {
            output += `\n${chap.title}\n\n`;
            const clean = (chap.content || '')
              .replace(/^#+\s+.*$/gm, '')
              .split('\n')
              .map((line: string) => (line.trim() ? `　　${line.trim()}` : ''))
              .join('\n');
            output += clean + '\n\n';
          });
        });

        const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${proj.title || '小说'}_全本.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        c.showToast('已成功导出纯文本手稿', 'success');
      },
    });
  },
  getSidebarTabs: (_ctx: PluginContext) => [
    {
      id: 'tab-novel-tree',
      title: '章节目录',
      icon: 'BookOpen',
      order: 1,
      render: (_c, theme) => React.createElement(NovelTree, { theme }),
    },
  ],
};
