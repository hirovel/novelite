import type { Volume, Chapter } from './types';
import { countWordsFast } from './ProjectStore';

/**
 * 🚀 High-speed Chinese / English Novel Text Parser.
 * Automatically recognizes Volumes (卷), Chapters (章/回/节/Chapter), and builds a structured tree.
 */
export function parseBulkNovelText(fullText: string, defaultBookTitle = '导入长篇小说'): {
  title: string;
  volumes: Volume[];
} {
  if (!fullText || !fullText.trim()) {
    return {
      title: defaultBookTitle,
      volumes: [
        {
          id: `vol_${Date.now()}`,
          title: '第一卷：正文手稿',
          isExpanded: true,
          chapters: [
            {
              id: `chap_${Date.now()}`,
              title: '第一章：初启征程',
              content: '# 第一章：初启征程\n\n落笔生花。',
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
  const volRegex = /^\s*(第[0-9一二三四五六七八九十百千万零]+卷|卷[0-9一二三四五六七八九十百千万零]+|Volume\s+[0-9]+|BOOK\s+[0-9]+)\s*[:：\s]*(.*)$/i;
  const chapRegex = /^\s*(第[0-9一二三四五六七八九十百千万零]+[章回节折篇]|Chapter\s+[0-9]+|[0-9]+[\.、]\s*第?[0-9一二三四五六七八九十百千万零]+章?)\s*[:：\s]*(.*)$/i;

  const flushCurrentChapter = () => {
    if (currentChap) {
      currentChap.content = chapContentLines.join('\n').trim();
      currentChap.wordCount = countWordsFast(currentChap.content);
      currentChap.updatedAt = Date.now();
      if (!currentVol) {
        currentVol = {
          id: `vol_${Date.now()}_0`,
          title: '第一卷：正文手稿',
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

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check for Volume heading
    const volMatch = trimmed.match(volRegex);
    if (volMatch) {
      flushCurrentChapter();
      const volTitle = trimmed;
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
      flushCurrentChapter();
      const chapTitle = trimmed;
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
    } else if (trimmed) {
      // Intro or prologue before first chapter
      currentChap = {
        id: `chap_${Date.now()}_prologue`,
        title: '序章 / 楔子',
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
      title: '第一卷：正文手稿',
      isExpanded: true,
      chapters: [
        {
          id: `chap_${Date.now()}_fallback`,
          title: '第一章：正文',
          content: fullText,
          wordCount: countWordsFast(fullText),
          updatedAt: Date.now(),
        },
      ],
    });
  }

  return {
    title: defaultBookTitle,
    volumes,
  };
}
