import React from 'react';
import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { WordCounterWidget } from './WordCounterWidget';

export const WordCounterPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-word-counter',
    name: '实时字数与码字测速仪',
    version: '2.0.0',
    description: '在状态栏与动态岛中实时监控单章字数、全书进度与实时码字速度 (WPM)。',
    author: 'hirovel',
    icon: 'Activity',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    ctx.registerStatusBarItem({
      id: 'statusbar-word-counter',
      alignment: 'left',
      order: 10,
      render: (c) => React.createElement(WordCounterWidget, { ctx: c }),
    });

    ctx.registerCommand({
      id: 'stats.show-summary',
      title: '查看全书字数与章节看板',
      category: '数据统计',
      shortcut: 'Alt+S',
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
  },
};
