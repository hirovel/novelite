import type { Volume, Chapter } from './types';
import { countWordsFast } from './ProjectStore';

/**
 * 🚀 High-speed Chinese / English Novel Text Parser.
 * Automatically recognizes Volumes (卷), Chapters (章/回/节/Chapter), and builds a structured tree.
 */
export function parseBulkNovelText(fullText: string, defaultBookTitle = '导入长篇小说'): {
  title: string;
  author: string;
  volumes: Volume[];
} {
  let detectedTitle = defaultBookTitle;
  let detectedAuthor = '佚名';

  if (!fullText || !fullText.trim()) {
    return {
      title: detectedTitle,
      author: detectedAuthor,
      volumes: [
        {
          id: `vol_${Date.now()}`,
          title: '第一卷',
          isExpanded: true,
          chapters: [
            {
              id: `chap_${Date.now()}`,
              title: '第一章',
              content: '# 第一章\n\n开始写作。',
              wordCount: 4,
              updatedAt: Date.now(),
            },
          ],
        },
      ],
    };
  }

  const lines = fullText.split(/\r?\n/);
  const volumes: Volume[] = [];
  let currentVol: Volume | null = null;
  let currentChap: Chapter | null = null;
  let chapContentLines: string[] = [];

  // Patterns for Volume & Chapter headings
  const volRegex = /^\s*[【[()]?\s*(第[0-9一二三四五六七八九十百千万零]+卷|卷[0-9一二三四五六七八九十百千万零]+|Volume\s+[0-9]+|BOOK\s+[0-9]+)\s*[:：\s\-—_]*(.*?)\s*[】\])]?$/i;
  const chapRegex = /^\s*[【[()]?\s*(第[0-9一二三四五六七八九十百千万零]+[章回节折篇]|Chapter\s+[0-9]+|[0-9]+[.、]\s*第?[0-9一二三四五六七八九十百千万零]+[章回节折篇]?|序章|楔子|尾声|后记|番外\s*[0-9一二三四五六七八九十百千万零]*|外传\s*[0-9一二三四五六七八九十百千万零]*)\s*[:：\s\-—_]*(.*?)\s*[】\])]?$/i;

  const flushCurrentChapter = () => {
    if (currentChap) {
      currentChap.content = chapContentLines.join('\n').trim();
      currentChap.wordCount = countWordsFast(currentChap.content);
      currentChap.updatedAt = Date.now();

      // Discard empty or purely decorative prologue before chapter 1
      const isAutoPrologue = currentChap.id.includes('prologue');
      const pureText = currentChap.content.replace(/^[=\-_*~#\s]+$/gm, '').trim();
      if (isAutoPrologue && (!pureText || currentChap.wordCount === 0)) {
        currentChap = null;
        chapContentLines = [];
        return;
      }

      if (!currentVol) {
        currentVol = {
          id: `vol_${Date.now()}_0`,
          title: '第一卷',
          isExpanded: true,
          chapters: [],
        };
        volumes.push(currentVol);
      }
      currentVol.chapters.push(currentChap);
      currentChap = null;
      chapContentLines = [];
    }
  };

  let hasFoundFirstChapter = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (currentChap) chapContentLines.push(rawLine);
      continue;
    }

    // Check for title and author in prologue metadata (top 20 lines)
    if (!hasFoundFirstChapter && i < 20) {
      // Ignore decorative dividers and common book headers in preamble
      if (/^[=\-_*~#]{3,}$/.test(trimmed)) {
        continue;
      }
      if (/^(?:字数|导出时间|导出日期|全书字数|最后更新|作品简介)\s*[:：]/.test(trimmed)) {
        continue;
      }

      const titleMatch = trimmed.match(/^(?:《(.*?)》|(?:书名|作品名|小说名|Book Title)\s*[:：]\s*(.*))$/);
      if (titleMatch) {
        const found = (titleMatch[1] || titleMatch[2] || '').trim();
        if (found) detectedTitle = found;
        continue;
      }
      const authorMatch = trimmed.match(/^(?:作者|Author|著|文)\s*[:：]\s*(.*)$/);
      if (authorMatch) {
        const found = authorMatch[1].trim();
        if (found) detectedAuthor = found;
        continue;
      }
    }

    // Check for Volume heading
    const volMatch = trimmed.match(volRegex);
    if (volMatch) {
      flushCurrentChapter();
      const volTitle = trimmed.replace(/^【(.*)】$/, '$1');
      currentVol = {
        id: `vol_${Date.now()}_${volumes.length + 1}`,
        title: volTitle,
        isExpanded: true,
        chapters: [],
      };
      volumes.push(currentVol);
      continue;
    }

    // Check for Chapter heading
    const chapMatch = trimmed.match(chapRegex);
    if (chapMatch) {
      hasFoundFirstChapter = true;
      flushCurrentChapter();
      const chapTitle = trimmed.replace(/^【(.*)】$/, '$1');
      currentChap = {
        id: `chap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: chapTitle,
        content: '',
        wordCount: 0,
        updatedAt: Date.now(),
      };
      chapContentLines.push(`# ${chapTitle}\n`);
      continue;
    }

    // Regular content line
    if (currentChap) {
      chapContentLines.push(rawLine);
    } else {
      // If it's a decorative line before the first chapter, ignore it
      if (/^[=\-_*~#]{3,}$/.test(trimmed)) {
        continue;
      }

      // Intro or prologue before first chapter
      currentChap = {
        id: `chap_${Date.now()}_prologue`,
        title: '序章 / 前言',
        content: '',
        wordCount: 0,
        updatedAt: Date.now(),
      };
      chapContentLines.push(rawLine);
    }
  }

  flushCurrentChapter();

  if (volumes.length === 0 || volumes.every((v) => v.chapters.length === 0)) {
    // Single chapter fallback
    volumes.push({
      id: `vol_${Date.now()}_fallback`,
      title: '第一卷',
      isExpanded: true,
      chapters: [
        {
          id: `chap_${Date.now()}_fallback`,
          title: '第一章',
          content: fullText,
          wordCount: countWordsFast(fullText),
          updatedAt: Date.now(),
        },
      ],
    });
  }

  return {
    title: detectedTitle,
    author: detectedAuthor,
    volumes,
  };
}
