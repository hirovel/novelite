/**
 * Professional Chinese Typography & Text Formatting Toolkit.
 * Pure functional transformers for high-performance, WYSIWYG novel editing.
 */

export interface FormatResult {
  text: string;
  count: number;
  changed: boolean;
}

/**
 * 1. Smart Chinese Punctuation Converter & Fixer:
 * - Converts half-width ASCII punctuation in Chinese text to standard full-width (GB/T 15834).
 * - Intelligently pairs straight quotes ("..." and '...') into Chinese book quotes (“...” and ‘...’).
 * - Normalizes dashes (-- / ---) to double em-dashes (——).
 * - Normalizes dots (... / 。。。) to standard ellipses (……).
 */
export function cleanChinesePunctuation(text: string): FormatResult {
  if (!text) return { text: '', count: 0, changed: false };

  let count = 0;
  const original = text;

  // Step 1: Normalize dashes & tildes (-- or --- -> ——)
  text = text.replace(/-{2,}|~{2,}/g, () => {
    count++;
    return '——';
  });

  // Step 2: Normalize ellipses (... or 。。。 or . . . -> ……)
  text = text.replace(/(\.\.\.+|。{3,}|…{1,2})/g, () => {
    count++;
    return '……';
  });

  // Step 3: Half-width punctuations surrounded by Chinese characters or line ends
  // Comma
  text = text.replace(/([^\x00-\x7F]),/g, (_m, c) => { count++; return c + '，'; });
  text = text.replace(/,([^\x00-\x7F])/g, (_m, c) => { count++; return '，' + c; });

  // Period (avoid decimals like 3.14)
  text = text.replace(/([^\x00-\x7F])\./g, (_m, c) => { count++; return c + '。'; });
  text = text.replace(/\.([^\x00-\x7F])/g, (_m, c) => { count++; return '。' + c; });

  // Exclamation & Question
  text = text.replace(/!/g, () => { count++; return '！'; });
  text = text.replace(/\?/g, () => { count++; return '？'; });

  // Colon & Semicolon
  text = text.replace(/([^\x00-\x7F]):/g, (_m, c) => { count++; return c + '：'; });
  text = text.replace(/:([^\x00-\x7F])/g, (_m, c) => { count++; return '：' + c; });
  text = text.replace(/([^\x00-\x7F]);/g, (_m, c) => { count++; return c + '；'; });
  text = text.replace(/;([^\x00-\x7F])/g, (_m, c) => { count++; return '；' + c; });

  // Parentheses & Brackets & Angle brackets
  text = text.replace(/\(/g, () => { count++; return '（'; });
  text = text.replace(/\)/g, () => { count++; return '）'; });
  text = text.replace(/\[/g, () => { count++; return '【'; });
  text = text.replace(/\]/g, () => { count++; return '】'; });
  text = text.replace(/</g, () => { count++; return '《'; });
  text = text.replace(/>/g, () => { count++; return '》'; });

  // Step 4: Intelligent Quotation Marks Pairing (Per Paragraph)
  const lines = text.split('\n');
  const formattedLines = lines.map((line) => {
    let doubleQuoteOpen = true;
    let singleQuoteOpen = true;

    // Replace straight double quotes
    line = line.replace(/"/g, () => {
      count++;
      const q = doubleQuoteOpen ? '“' : '”';
      doubleQuoteOpen = !doubleQuoteOpen;
      return q;
    });

    // Replace straight single quotes
    line = line.replace(/'/g, () => {
      count++;
      const q = singleQuoteOpen ? '‘' : '’';
      singleQuoteOpen = !singleQuoteOpen;
      return q;
    });

    return line;
  });

  text = formattedLines.join('\n');

  return {
    text,
    count,
    changed: text !== original,
  };
}

/**
 * 2. One-Click Novel Paragraph & Indent Formatter:
 * - Formats every novel paragraph with 2 standard full-width spaces (\u3000\u3000).
 * - Strips messy half-width spaces, tabs, and duplicate indents at paragraph start.
 * - Cleans trailing whitespace on every line.
 * - Intelligently preserves markdown headings (# ...) and block elements.
 * - Collapses 3+ consecutive empty lines into a clean single paragraph break.
 */
export function formatNovelParagraphs(text: string, indentType: '2em' | 'none' = '2em'): FormatResult {
  if (!text) return { text: '', count: 0, changed: false };

  const original = text;
  let count = 0;

  const lines = text.split(/\r?\n/);
  const resultLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    if (line.trim().length === 0) {
      if (resultLines.length === 0 || resultLines[resultLines.length - 1].length > 0) {
        resultLines.push('');
      }
      continue;
    }

    // Strip existing leading whitespace
    const stripped = line.replace(/^[\s\u3000\t]+/, '');

    // Preserve Markdown Headings, Dividers, Blockquotes, or Novel Chapter Titles
    if (/^(#{1,6}\s+|[-*_]{3,}|\x60\x60\x60|>|第[0-9一二三四五六七八九十百千万]+[章节卷篇回部集幕])/.test(stripped)) {
      resultLines.push(stripped);
      continue;
    }

    if (indentType === '2em') {
      const formatted = '\u3000\u3000' + stripped;
      if (formatted !== line) count++;
      resultLines.push(formatted);
    } else {
      if (stripped !== line) count++;
      resultLines.push(stripped);
    }
  }

  const resultText = resultLines.join('\n');

  return {
    text: resultText,
    count,
    changed: resultText !== original,
  };
}

/**
 * 3. Remove all leading indents (Reset to clean flush-left).
 */
export function removeLeadingIndents(text: string): FormatResult {
  return formatNovelParagraphs(text, 'none');
}

/**
 * 4. Pangu Spacing (Insert space between CJK and Half-width English/Digits).
 */
export function addPanguSpacing(text: string): FormatResult {
  if (!text) return { text: '', count: 0, changed: false };

  const original = text;
  let count = 0;

  text = text.replace(/([\u4e00-\u9fa5\u3000-\u303f])([a-zA-Z0-9])/g, (_m, c1, c2) => {
    count++;
    return c1 + ' ' + c2;
  });

  text = text.replace(/([a-zA-Z0-9])([\u4e00-\u9fa5\u3000-\u303f])/g, (_m, c1, c2) => {
    count++;
    return c1 + ' ' + c2;
  });

  return {
    text,
    count,
    changed: text !== original,
  };
}
