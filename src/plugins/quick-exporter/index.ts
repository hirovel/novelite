import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';

export const QuickExporterPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-quick-exporter',
    name: '一键全书导出 (TXT / Markdown)',
    version: '1.0.0',
    description: '支持将全书所有分卷与章节一键排版导出为规范的纯文本 TXT 或完整 Markdown 书稿。',
    author: 'Novelite Core',
    icon: 'Download',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    ctx.registerExporter({
      id: 'export-standard-txt',
      title: '导出为标准网文纯文本 (.txt)',
      extension: 'txt',
      export: async (proj) => {
        let output = `${proj.title || '小说'}\n作者：${proj.author || '佚名'}\n\n`;
        output += `====================================\n\n`;

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

        return {
          filename: `${proj.title || '小说'}_全本.txt`,
          content: output,
        };
      },
    });

    ctx.registerCommand({
      id: 'export.download-txt',
      title: '一键导出全本为规范 TXT 文件',
      category: '导出发布',
      shortcut: 'Ctrl+Shift+E',
      run: (c) => {
        const proj = c.getProjectData();
        let output = `${proj.title || '小说'}\n作者：${proj.author || '佚名'}\n\n`;
        output += `====================================\n\n`;

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

        c.showToast('✅ 全本 TXT 导出成功！', 'success');
      },
    });
  },
};
