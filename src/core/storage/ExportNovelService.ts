import type { NovelProject, Chapter } from './types';
import { eventBus } from '../events/EventBus';
import { saveTextFile } from './desktopFiles';

/**
 * 🌟 WYSIWYG Novel Export Service (可见即所得小说导出服务)
 * 严格秉持「所见即所得」原则，绝不篡改、强制缩进或改变作者在编辑器中书写的内容格式。
 */
export class ExportNovelService {
  private static instance: ExportNovelService;

  private constructor() {}

  public static getInstance(): ExportNovelService {
    if (!ExportNovelService.instance) {
      ExportNovelService.instance = new ExportNovelService();
    }
    return ExportNovelService.instance;
  }

  /**
   * 格式化单个章节内容（所见即所得，仅将顶行 Markdown # 标题转为纯文本标题，正文原样输出）
   */
  public formatChapterWysiwyg(chap: Chapter): string {
    const raw = chap.content || '';
    const trimmed = raw.trim();
    if (!trimmed) {
      return `${chap.title}\n`;
    }

    const leadingH1Match = raw.match(/^\s*#+\s*(.*?)(?:\r?\n|$)/);
    if (leadingH1Match) {
      // 移除开头的 Markdown # 标记，保留作者书写的标题与正文全部字符（包括空格、空行、特殊排版）
      const rest = raw.slice(leadingH1Match[0].length).replace(/^\r?\n/, '');
      const titleText = leadingH1Match[1].trim() || chap.title;
      return `${titleText}\n\n${rest}`;
    }

    if (trimmed.startsWith(chap.title)) {
      return raw;
    }

    return `${chap.title}\n\n${raw}`;
  }

  /**
   * 导出整部小说为 TXT 纯文本文件（所见即所得）
   */
  public async exportProjectToTxt(project: NovelProject): Promise<void> {
    if (!project) return;

    const isEn = typeof localStorage !== 'undefined' && localStorage.getItem('novelite_language') === 'en';
    const bookTitle = project.title || (isEn ? 'Untitled Novel' : '未命名小说');
    const bookAuthor = project.author || (isEn ? 'Anonymous' : '佚名');

    let output = isEn
      ? `${bookTitle}\nAuthor: ${bookAuthor}\n\n====================================\n\n`
      : `《${bookTitle}》\n作者：${bookAuthor}\n\n====================================\n\n`;

    project.volumes?.forEach((vol) => {
      output += isEn ? `\n[${vol.title}]\n\n` : `\n【${vol.title}】\n\n`;
      vol.chapters?.forEach((chap) => {
        output += `\n${this.formatChapterWysiwyg(chap)}\n\n`;
      });
    });

    await this.saveExport(
      isEn ? `${bookTitle}_Complete.txt` : `《${bookTitle}》_全本.txt`, output,
      isEn ? `Successfully exported "${bookTitle}" full manuscript TXT` : `已成功导出《${bookTitle}》全本 TXT`,
    );
  }

  /**
   * 导出单个章节为 TXT 文件（所见即所得）
   */
  public async exportChapterToTxt(chap: Chapter): Promise<void> {
    if (!chap) return;
    const isEn = typeof localStorage !== 'undefined' && localStorage.getItem('novelite_language') === 'en';
    const content = this.formatChapterWysiwyg(chap);
    await this.saveExport(`${chap.title}.txt`, content,
      isEn ? `Exported "${chap.title}.txt"` : `已导出《${chap.title}.txt》`);
  }

  /**
   * 导出单个章节为 Markdown 文件（原始 Markdown 源码）
   */
  public async exportChapterToMd(chap: Chapter): Promise<void> {
    if (!chap) return;
    const isEn = typeof localStorage !== 'undefined' && localStorage.getItem('novelite_language') === 'en';
    const content = chap.content || `# ${chap.title}\n`;
    await this.saveExport(`${chap.title}.md`, content,
      isEn ? `Exported "${chap.title}.md"` : `已导出《${chap.title}.md》`);
  }

  private async saveExport(name: string, content: string, message: string): Promise<void> {
    try {
      if (await saveTextFile(name, content)) eventBus.emit('show-toast', { message, type: 'success' });
    } catch (error) {
      console.error('Export failed:', error);
      const isEn = localStorage.getItem('novelite_language') === 'en';
      eventBus.emit('show-toast', {
        message: isEn ? 'Export failed. Please choose another location or check disk space.' : '导出失败，请更换保存位置或检查磁盘空间。',
        type: 'error',
      });
    }
  }
}

export const exportNovelService = ExportNovelService.getInstance();
