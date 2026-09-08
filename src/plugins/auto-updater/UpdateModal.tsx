import React from 'react';
import { Sparkles, DownloadCloud, ExternalLink, X } from 'lucide-react';
import type { UpdateInfo } from './types';
import type { Theme } from '../../core/themes/types';
import { useI18n } from '../../core/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  theme: Theme;
}

export const UpdateModal: React.FC<Props> = ({ isOpen, onClose, updateInfo, theme }) => {
  const { language } = useI18n();
  const isEn = language === 'en';

  if (!isOpen || !updateInfo) return null;

  const publishedDate = updateInfo.publishedAt
    ? new Date(updateInfo.publishedAt).toLocaleDateString(isEn ? 'en-US' : 'zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const handleOpenRelease = () => {
    const url = updateInfo.htmlUrl || 'https://github.com/hirovel/novelite/releases';
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-[520px] max-w-[94vw] max-h-[82vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: `${theme.colors.bgSecondary}FE`,
          borderColor: `${theme.colors.accent || '#38bdf8'}60`,
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.85)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 px-5 border-b flex items-center justify-between bg-black/15 shrink-0"
          style={{ borderColor: `${theme.colors.border}30` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: `${theme.colors.accent || '#38bdf8'}20`,
                color: theme.colors.accent || '#38bdf8',
              }}
            >
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm tracking-wide" style={{ color: theme.colors.text }}>
                  {isEn ? `New Version Available v${updateInfo.latestVersion}` : `发现新版本 v${updateInfo.latestVersion}`}
                </h3>
                <span
                  className="px-1.5 py-0.2 text-[9.5px] font-mono rounded-full font-semibold"
                  style={{
                    backgroundColor: `${theme.colors.accent || '#38bdf8'}25`,
                    color: theme.colors.accent || '#38bdf8',
                  }}
                >
                  {isEn ? 'NEW' : '最新'}
                </span>
              </div>
              <p className="text-[10.5px] opacity-40 font-mono">
                {isEn ? `Current: v${updateInfo.currentVersion}` : `当前版本: v${updateInfo.currentVersion}`} {publishedDate && (isEn ? `· Released on ${publishedDate}` : `· 发布于 ${publishedDate}`)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg opacity-40 hover:opacity-100 hover:bg-white/10 transition-colors cursor-pointer"
            style={{ color: theme.colors.text }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Release Notes Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar text-xs leading-relaxed font-sans">
          <div className="font-semibold text-xs opacity-75" style={{ color: theme.colors.text }}>
            {updateInfo.releaseTitle || (isEn ? `Novelite v${updateInfo.latestVersion} Release Notes:` : `Novelite v${updateInfo.latestVersion} 更新日志：`)}
          </div>

          <div
            className="p-3.5 rounded-xl border border-white/5 bg-black/20 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto select-text"
            style={{ color: theme.colors.text }}
          >
            {updateInfo.releaseNotes || (isEn ? 'This release includes multiple performance optimizations and writing experience improvements.' : '此版本包含多项性能优化与创作体验改进。')}
          </div>

          {/* Download Assets List if Available */}
          {updateInfo.assets && updateInfo.assets.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono opacity-50">{isEn ? 'Download Assets:' : '安装包资源：'}</span>
              <div className="flex flex-wrap gap-1.5">
                {updateInfo.assets.map((asset, idx) => (
                  <a
                    key={asset.url || `${asset.name}-${idx}`}
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/25 bg-white/[0.04] hover:bg-white/[0.08] transition-all text-[10.5px] font-mono"
                    style={{ color: theme.colors.text }}
                  >
                    <DownloadCloud className="h-3 w-3 opacity-60" />
                    <span>{asset.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-3 px-5 border-t flex items-center justify-between bg-black/15 shrink-0"
          style={{ borderColor: `${theme.colors.border}30` }}
        >
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs opacity-50 hover:opacity-100 hover:bg-white/5 transition-colors cursor-pointer"
            style={{ color: theme.colors.text }}
          >
            {isEn ? 'Remind Me Later' : '稍后提醒'}
          </button>

          <button
            onClick={handleOpenRelease}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white transition-all cursor-pointer shadow-md"
          >
            <span>{isEn ? 'Download on GitHub' : '前往 GitHub 下载升级'}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
