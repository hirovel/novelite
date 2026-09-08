import type { NovelProject, Chapter } from './types';
import { eventBus } from '../events/EventBus';

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
  public exportProjectToTxt(project: NovelProject): void {
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

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isEn ? `${bookTitle}_Complete.txt` : `《${bookTitle}》_全本.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    eventBus.emit('show-toast', {
      message: isEn ? `Successfully exported "${bookTitle}" full manuscript TXT` : `已成功导出《${bookTitle}》全本 TXT`,
      type: 'success',
    });
  }

  /**
   * 导出单个章节为 TXT 文件（所见即所得）
   */
  public exportChapterToTxt(chap: Chapter): void {
    if (!chap) return;
    const isEn = typeof localStorage !== 'undefined' && localStorage.getItem('novelite_language') === 'en';
    const content = this.formatChapterWysiwyg(chap);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chap.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    eventBus.emit('show-toast', {
      message: isEn ? `Exported "${chap.title}.txt"` : `已导出《${chap.title}.txt》`,
      type: 'success',
    });
  }

  /**
   * 导出单个章节为 Markdown 文件（原始 Markdown 源码）
   */
  public exportChapterToMd(chap: Chapter): void {
    if (!chap) return;
    const isEn = typeof localStorage !== 'undefined' && localStorage.getItem('novelite_language') === 'en';
    const content = chap.content || `# ${chap.title}\n`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chap.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    eventBus.emit('show-toast', {
      message: isEn ? `Exported "${chap.title}.md"` : `已导出《${chap.title}.md》`,
      type: 'success',
    });
  }
}

export const exportNovelService = ExportNovelService.getInstance();
