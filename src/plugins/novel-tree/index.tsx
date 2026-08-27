import React from 'react';
import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { NovelTree } from '../../components/sidebar/NovelTree';

export const NovelTreePlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-novel-tree',
    name: '小说分卷大纲与章节目录',
    version: '2.0.0',
    description: '提供专业的小说分卷、章节层级管理、排序重组、状态标记与单章导出。',
    author: 'Novelite Core',
    icon: 'BookOpen',
    defaultEnabled: true,
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
