import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, X, ArrowRight, BookOpen } from 'lucide-react';
import { parseBulkNovelText } from '../../core/storage/SmartNovelParser';
import { projectStore, countWordsFast } from '../../core/storage/ProjectStore';
import type { Volume } from '../../core/storage/types';
import type { Theme } from '../../core/themes/types';
import { eventBus } from '../../core/events/EventBus';
import { useI18n } from '../../core/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}

export const NovelImportModal: React.FC<Props> = ({ isOpen, onClose, theme }) => {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parsed result preview
  const [parsedData, setParsedData] = useState<{
    title: string;
    author: string;
    volumes: Volume[];
    rawTextLength: number;
    fileName: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setParsedData(null);
      setErrorMessage(null);
      setIsParsing(false);
      setIsDragging(false);
    }
  }

  if (!isOpen) return null;

  // Read file as ArrayBuffer and auto-detect encoding (UTF-8 with GBK fallback)
  const processFile = async (file: File) => {
    if (!file.name.match(/\.(txt|md)$/i)) {
      setErrorMessage(isEn ? 'Only .txt or .md plain text novel files are supported' : '仅支持导入 .txt 或 .md 纯文本格式的小说手稿文件');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();

      let text = '';
      try {
        // Try UTF-8 with fatal flag to catch encoding errors
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        text = utf8Decoder.decode(buffer);
      } catch {
        // Fallback to GBK / GB18030 for legacy Chinese novel files
        try {
          const gbkDecoder = new TextDecoder('gbk');
          text = gbkDecoder.decode(buffer);
        } catch {
          const looseDecoder = new TextDecoder('utf-8');
          text = looseDecoder.decode(buffer);
        }
      }

      const defaultTitle = file.name.replace(/\.(txt|md)$/i, '').replace(/^[《[【\s]*(.*?)[》\]】\s]*$/, '$1');
      const parsed = parseBulkNovelText(text, defaultTitle);

      setParsedData({
        title: parsed.title,
        author: parsed.author || (isEn ? 'Anonymous' : '佚名'),
        volumes: parsed.volumes,
        rawTextLength: text.length,
        fileName: file.name,
      });
    } catch (err: any) {
      console.error('Failed to parse file:', err);
      setErrorMessage(isEn ? `Failed to parse: ${err?.message || 'File read error'}` : `解析失败：${err?.message || '文件读取错误'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleConfirmImport = () => {
    if (!parsedData || parsedData.volumes.length === 0) return;

    const totalChapters = parsedData.volumes.reduce((acc, v) => acc + v.chapters.length, 0);
    const totalWords = parsedData.volumes.reduce(
      (acc, v) => acc + v.chapters.reduce((cAcc, c) => cAcc + (c.wordCount || countWordsFast(c.content)), 0),
      0
    );

    projectStore.importProject(parsedData.title, parsedData.author, parsedData.volumes);

    eventBus.emit('show-toast', {
      message: isEn
        ? `Successfully imported "${parsedData.title}", ${parsedData.volumes.length} volume(s), ${totalChapters} chapter(s) (${totalWords.toLocaleString()} words)`
        : `已成功导入《${parsedData.title}》，共 ${parsedData.volumes.length} 卷 ${totalChapters} 章 (${totalWords.toLocaleString()} 字)`,
      type: 'success',
    });

    onClose();
  };

  const totalChapters = parsedData?.volumes.reduce((acc, v) => acc + v.chapters.length, 0) || 0;
  const totalWords = parsedData?.volumes.reduce(
    (acc, v) => acc + v.chapters.reduce((cAcc, c) => cAcc + (c.wordCount || countWordsFast(c.content)), 0),
    0
  ) || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-[620px] max-w-[94vw] max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: `${theme.colors.bgSecondary}FE`,
          borderColor: `${theme.colors.border}80`,
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.75)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-3.5 px-5 border-b flex items-center justify-between bg-black/15 shrink-0"
          style={{ borderColor: `${theme.colors.border}30` }}
        >
          <div className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4" style={{ color: theme.colors.accent }} />
            <div>
              <h3 className="font-semibold text-xs tracking-wide" style={{ color: theme.colors.text }}>
                {isEn ? 'Import Manuscript' : '导入外部小说手稿'}
              </h3>
              <p className="text-[10px] opacity-40 font-mono">
                {isEn ? 'Supports .txt / .md files · Auto-detects volumes & chapter outline' : '支持 .txt / .md 文件 · 自动识别分卷与章节大纲'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded opacity-40 hover:opacity-100 hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* File Upload Zone */}
          {!parsedData ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-sky-400 bg-sky-500/10 scale-[0.99]'
                  : 'border-white/15 hover:border-white/30 bg-black/10 hover:bg-black/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${theme.colors.accent}15`, color: theme.colors.accent }}
              >
                <UploadCloud className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium" style={{ color: theme.colors.text }}>
                  {isParsing
                    ? (isEn ? 'Reading and parsing chapter structure...' : '正在读取并智能解析章节结构...')
                    : (isEn ? 'Click to select or drag .txt / .md manuscript here' : '点击选择或将小说 .txt / .md 文件拖放至此')}
                </p>
                <p className="text-[10.5px] opacity-45 font-mono">
                  {isEn
                    ? 'Supports UTF-8 / GBK encoding auto-detection, matches volumes and chapters'
                    : '支持 UTF-8 / GBK 编码自动识别，智能匹配分卷、章节标题与序章'}
                </p>
              </div>

              <button
                type="button"
                className="mt-1 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/10 transition-all cursor-pointer"
                style={{ color: theme.colors.text }}
              >
                {isEn ? 'Browse Local Files' : '浏览本地文件'}
              </button>
            </div>
          ) : (
            /* Parsed Preview Section */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Meta Input Card */}
              <div className="p-4 rounded-xl border border-white/10 bg-black/15 space-y-3">
                <div className="flex items-center justify-between text-xs font-medium pb-2 border-b border-white/5">
                  <span className="flex items-center gap-1.5" style={{ color: theme.colors.accent }}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{isEn ? 'Parsed successfully, please review book details' : '解析成功，请核对作品信息'}</span>
                  </span>
                  <button
                    onClick={() => setParsedData(null)}
                    className="text-[10.5px] opacity-50 hover:opacity-100 hover:underline cursor-pointer"
                  >
                    {isEn ? 'Choose Another File' : '重新选择文件'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] opacity-60 mb-1">{isEn ? 'Novel Title' : '小说书名'}</label>
                    <input
                      type="text"
                      value={parsedData.title}
                      placeholder={isEn ? 'Enter novel title' : '请输入小说书名'}
                      onChange={(e) => setParsedData({ ...parsedData, title: e.target.value })}
                      className="w-full rounded-lg px-2.5 py-1.5 text-xs outline-none border bg-black/20 font-sans"
                      style={{ borderColor: `${theme.colors.border}40`, color: theme.colors.text }}
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] opacity-60 mb-1">{isEn ? 'Author' : '作者'}</label>
                    <input
                      type="text"
                      value={parsedData.author}
                      placeholder={isEn ? 'Enter author name' : '请输入作者名称'}
                      onChange={(e) => setParsedData({ ...parsedData, author: e.target.value })}
                      className="w-full rounded-lg px-2.5 py-1.5 text-xs outline-none border bg-black/20 font-sans"
                      style={{ borderColor: `${theme.colors.border}40`, color: theme.colors.text }}
                    />
                  </div>
                </div>

                {/* Parsing Stats */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="text-[10px] opacity-40">{isEn ? 'Volumes' : '识别分卷'}</div>
                    <div className="text-xs font-bold mt-0.5" style={{ color: theme.colors.text }}>
                      {parsedData.volumes.length} {isEn ? 'Vols' : '卷'}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="text-[10px] opacity-40">{isEn ? 'Total Chapters' : '章节总数'}</div>
                    <div className="text-xs font-bold mt-0.5" style={{ color: theme.colors.text }}>
                      {totalChapters} {isEn ? 'Chs' : '章'}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="text-[10px] opacity-40">{isEn ? 'Total Words' : '全书字数'}</div>
                    <div className="text-xs font-bold mt-0.5" style={{ color: theme.colors.accent }}>
                      {totalWords.toLocaleString()} {isEn ? 'words' : '字'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Chapters Preview */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium opacity-60 flex items-center justify-between px-1">
                  <span>{isEn ? 'Sample Chapters Preview (First 4):' : '识别章节预览（前 4 章）：'}</span>
                  <span className="text-[10px] font-mono opacity-40">{isEn ? 'File: ' : '原文件: '}{parsedData.fileName}</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {parsedData.volumes.flatMap((v) => v.chapters.map((c) => ({ volTitle: v.title, chap: c }))).slice(0, 4).map((item, idx) => (
                    <div
                      key={item.chap.id || `${item.chap.title}-${idx}`}
                      className="p-2 px-3 rounded-lg border border-white/5 bg-white/[0.02] text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <BookOpen className="h-3 w-3 opacity-40 shrink-0" />
                        <span className="opacity-40 text-[10px] shrink-0 font-mono">{item.volTitle}</span>
                        <span className="opacity-20 text-[10px]">/</span>
                        <span className="font-medium truncate" style={{ color: theme.colors.text }}>
                          {item.chap.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono opacity-40 shrink-0">
                        {item.chap.wordCount || 0} {isEn ? 'words' : '字'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-3 px-5 border-t flex items-center justify-between bg-black/15 shrink-0"
          style={{ borderColor: `${theme.colors.border}30` }}
        >
          <div className="text-[10.5px] opacity-40 font-mono">
            {isEn ? 'Imported novel will be stored in your local bookshelf' : '导入后作品独立保存在本地书架，随时可继续写作'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs opacity-60 hover:opacity-100 hover:bg-white/5 transition-colors cursor-pointer"
              style={{ color: theme.colors.text }}
            >
              {isEn ? 'Cancel' : '取消'}
            </button>

            {parsedData && (
              <button
                onClick={handleConfirmImport}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white transition-all cursor-pointer shadow-md"
              >
                <span>{isEn ? 'Confirm & Start Writing' : '确认导入并开启写作'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
