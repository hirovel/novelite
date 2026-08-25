import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';

export const SampleUserPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-sample-custom',
    name: '我的自定义插件 (示例)',
    version: '1.0.0',
    description: '演示如何通过 Novelite SDK 快速扩展专属命令与写作小工具。',
    author: 'You',
    icon: 'Terminal',
    defaultEnabled: true,
  },

  init: (ctx: PluginContext) => {
    // 示例 1: 注册一个快捷插入当前时间戳的命令 (快捷键 Alt+D)
    ctx.registerCommand({
      id: 'custom.insert-timestamp',
      title: '插入当前写作时间戳',
      category: '自定义扩展',
      shortcut: 'Alt+D',
      run: (c) => {
        const timeStr = `【${new Date().toLocaleTimeString()} 记】`;
        c.insertText(timeStr);
        c.showToast('已插入写作时间戳', 'info');
      },
    });

    // 示例 2: 注册一个快速统计高频词的命令
    ctx.registerCommand({
      id: 'custom.check-cliche',
      title: '一键扫描常用口头禅/高频词',
      category: '自定义扩展',
      run: (c) => {
        const text = c.getEditorContent();
        const keywords = ['但是', '然而', '突然', '不禁', '只见', '竟然'];
        const results = keywords
          .map((kw) => {
            const count = (text.match(new RegExp(kw, 'g')) || []).length;
            return `"${kw}": ${count} 次`;
          })
          .join(', ');

        c.showToast(`高频词统计: ${results}`, 'info');
      },
    });
  },
};
