import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';

async function saveFileContent(filename: string, content: string, filters: { name: string; extensions: string[] }[]) {
  // Check if running in Tauri
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
  if (isTauri) {
    try {
      const dialog = await import('@tauri-apps/plugin-dialog');
      const fs = await import('@tauri-apps/plugin-fs');
      const filePath = await dialog.save({
        defaultPath: filename,
        filters,
      });
      if (filePath) {
        await fs.writeTextFile(filePath, content);
        return true;
      }
      return false;
    } catch {
      // Fallback to browser blob download
    }
  }

  // Web Blob download
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

export const QuickExporterPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-quick-exporter',
    name: '全书导出与出版工坊 (TXT / Markdown)',
    version: '2.0.0',
    description: '支持将全书或单章一键排版导出为规范的纯文本 TXT、完整 Markdown 书稿或分卷章节。',
    author: 'Novelite Core',
    icon: 'Download',
    defaultEnabled: false,
  },
  init: (ctx: PluginContext) => {
    // 1. Register Standard TXT Exporter
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

    // 2. Register Markdown Book Exporter
    ctx.registerExporter({
      id: 'export-markdown-book',
      title: '导出为标准 Markdown 书稿 (.md)',
      extension: 'md',
      export: async (proj) => {
        let output = `# ${proj.title || '小说'}\n\n`;
        output += `> 作者：${proj.author || '佚名'} | 导出时间：${new Date().toLocaleDateString()}\n\n---\n\n`;

        proj.volumes?.forEach((vol: any) => {
          output += `\n# 卷：${vol.title}\n\n`;
          vol.chapters?.forEach((chap: any) => {
            const hasHeader = (chap.content || '').trim().startsWith('#');
            if (!hasHeader) {
              output += `\n## ${chap.title}\n\n`;
            }
            output += `${(chap.content || '').trim()}\n\n---\n\n`;
          });
        });

        return {
          filename: `${proj.title || '小说'}_书稿.md`,
          content: output,
        };
      },
    });

    // Command: Export Full Book TXT
    ctx.registerCommand({
      id: 'export.download-txt',
      title: '一键导出全本为规范 TXT 文件',
      category: '导出发布',
      shortcut: 'Ctrl+Shift+E',
      run: async (c) => {
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

        const ok = await saveFileContent(`${proj.title || '小说'}_全本.txt`, output, [
          { name: '文本文件', extensions: ['txt'] },
        ]);
        if (ok) {
          c.showToast('✅ 全本 TXT 导出成功！', 'success');
        }
      },
    });

    // Command: Export Full Book Markdown
    ctx.registerCommand({
      id: 'export.download-md',
      title: '导出全本为标准 Markdown 书稿 (.md)',
      category: '导出发布',
      run: async (c) => {
        const proj = c.getProjectData();
        let output = `# ${proj.title || '小说'}\n\n`;
        output += `> 作者：${proj.author || '佚名'} | 导出时间：${new Date().toLocaleDateString()}\n\n---\n\n`;

        proj.volumes?.forEach((vol: any) => {
          output += `\n# 卷：${vol.title}\n\n`;
          vol.chapters?.forEach((chap: any) => {
            const hasHeader = (chap.content || '').trim().startsWith('#');
            if (!hasHeader) {
              output += `\n## ${chap.title}\n\n`;
            }
            output += `${(chap.content || '').trim()}\n\n---\n\n`;
          });
        });

        const ok = await saveFileContent(`${proj.title || '小说'}_书稿.md`, output, [
          { name: 'Markdown 文件', extensions: ['md', 'markdown'] },
        ]);
        if (ok) {
          c.showToast('✅ 全本 Markdown 导出成功！', 'success');
        }
      },
    });

    // Command: Export Active Chapter
    ctx.registerCommand({
      id: 'export.download-active-chapter',
      title: '导出当前正在编辑的章节为 TXT',
      category: '导出发布',
      run: async (c) => {
        const content = c.getEditorContent();
        const chapId = c.getActiveChapterId();
        const proj = c.getProjectData();
        let chapTitle = '当前章节';
        if (chapId && proj?.volumes) {
          for (const v of proj.volumes) {
            const found = v.chapters.find((ch: any) => ch.id === chapId);
            if (found) {
              chapTitle = found.title;
              break;
            }
          }
        }

        const clean = content
          .replace(/^#+\s+.*$/gm, '')
          .split('\n')
          .map((line: string) => (line.trim() ? `　　${line.trim()}` : ''))
          .join('\n');

        const fileData = `${chapTitle}\n\n${clean}\n`;
        const ok = await saveFileContent(`${chapTitle}.txt`, fileData, [
          { name: '文本文件', extensions: ['txt'] },
        ]);
        if (ok) {
          c.showToast(`✅ 章节《${chapTitle}》导出成功！`, 'success');
        }
      },
    });
  },
};
