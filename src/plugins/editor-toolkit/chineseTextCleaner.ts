import { isExemptLine } from '../chinese-typography/typographyExtension';

/**
 * High-performance Chinese Novel Text Cleaner & Physical Indentation Normalizer.
 *
 * Cleans:
 * 1. Physical 2-character Chinese indent: Normalizes every body paragraph with real '\u3000\u3000'.
 * 2. Consecutive empty lines (collapses 2+ blank lines down to 1).
 * 3. Half-width punctuation in Chinese prose (, . ! ? ; :) -> (， 。 ！ ？ ； ：).
 * 4. Broken ellipses (.. / ... / 。。。) -> Standard Chinese (……).
 * 5. Broken em-dashes (-- / ──) -> Standard Chinese (——).
 * 6. Markdown headings, blockquotes, dividers, code blocks automatically kept flush left.
 */
export interface CleanResult {
  cleanedText: string;
  changesCount: number;
}

export function cleanChineseNovelText(rawText: string): CleanResult {
  if (!rawText) return { cleanedText: '', changesCount: 0 };

  let changes = 0;

  // Split into paragraphs
  const lines = rawText.split(/\r?\n/);
  const processedLines: string[] = [];

  let lastWasEmpty = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check if line is only whitespace
    if (/^\s*$/.test(line)) {
      if (!lastWasEmpty && processedLines.length > 0) {
        processedLines.push('');
        lastWasEmpty = true;
      } else if (lastWasEmpty) {
        changes++; // Collapsed extra blank line
      }
      continue;
    }

    lastWasEmpty = false;

    // 1. Strip trailing spaces
    const trailingStripped = line.replace(/[ \t\u3000\u00A0]+$/, '');
    if (trailingStripped !== line) {
      line = trailingStripped;
    }

    // 2. Normalize broken ellipses (.. / ... / 。。。) -> ……
    const ellipseCleaned = line
      .replace(/([。\.]{2,})/g, () => {
        changes++;
        return '……';
      })
      .replace(/(\.{3,})/g, () => {
        changes++;
        return '……';
      });
    if (ellipseCleaned !== line) {
      line = ellipseCleaned;
    }

    // 3. Normalize broken em-dashes (-- / ──) -> ——
    const dashCleaned = line.replace(/(--+|──+)/g, () => {
      changes++;
      return '——';
    });
    if (dashCleaned !== line) {
      line = dashCleaned;
    }

    // 4. Convert basic ASCII punctuation in Chinese text to fullwidth
    const punctCleaned = line
      .replace(/,/g, () => { changes++; return '，'; })
      .replace(/;/g, () => { changes++; return '；'; })
      .replace(/:(?!\/)/g, () => { changes++; return '：'; }) // Don't convert http://
      .replace(/\?(?!\?)/g, () => { changes++; return '？'; })
      .replace(/!(?!=\w)/g, () => { changes++; return '！'; });

    if (punctCleaned !== line) {
      line = punctCleaned;
    }

    // 5. Physical Indentation Normalization
    if (isExemptLine(line)) {
      // Headers, lists, quotes, dividers -> flush left without indent
      const stripped = line.replace(/^[ \t\u3000\u00A0]+/, '');
      if (stripped !== line) {
        changes++;
        line = stripped;
      }
    } else {
      // Normal novel body text -> physical '\u3000\u3000' (2 fullwidth spaces)
      const content = line.replace(/^[ \t\u3000\u00A0]+/, '');
      if (content.length > 0) {
        const physicalIndented = '\u3000\u3000' + content;
        if (physicalIndented !== line) {
          changes++;
          line = physicalIndented;
        }
      }
    }

    processedLines.push(line);
  }

  // Ensure clean ending
  while (processedLines.length > 0 && processedLines[processedLines.length - 1] === '') {
    processedLines.pop();
  }

  const cleanedText = processedLines.join('\n');
  return { cleanedText, changesCount: Math.max(changes, 0) };
}
