import React from 'react';
import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';
import { ScratchpadPanel } from './ScratchpadPanel';

export const ScratchpadPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-scratchpad',
    name: '灵感便签与素材卡片',
    version: '2.0.0',
    description: '随时记录小说伏笔、人物线索、场景描写，并支持一键将灵感插入当前正文光标处。',
    author: 'Novelite Core',
    icon: 'Sparkles',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'scratchpad.insert-quick-note',
      title: '捕捉灵感便签并插入正文',
      category: '创作素材',
      shortcut: 'Ctrl+Shift+I',
      run: (c) => {
        const text = prompt('请输入要即时插入正文的灵感素材：');
        if (text?.trim()) {
          c.insertText(`\n> 💡 灵感备忘：${text.trim()}\n`);
          c.showToast('已将灵感插入当前段落', 'success');
        }
      },
    });
  },
  getSidebarTabs: (ctx: PluginContext) => {
    return [
      {
        id: 'scratchpad',
        title: '灵感便签',
        icon: 'Sparkles',
        order: 2,
        render: (_c, theme) => React.createElement(ScratchpadPanel, { ctx, theme }),
      },
    ];
  },
};
