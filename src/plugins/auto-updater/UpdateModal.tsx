import React, { useState, useRef } from 'react';
import { checkForUpdates, installUpdate, type UpdateProgress } from './updateChecker';
import { Sparkles, DownloadCloud, X } from 'lucide-react';
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

  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState('');
  const busyRef = useRef(false);
  const close = () => { if (!busyRef.current) { setError(''); setProgress(null); onClose(); } };
  if (!isOpen || !updateInfo) return null;
  const busy = !!progress;
  const handleInstall = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    (document.activeElement as HTMLElement | null)?.blur();
    setError('');
    setProgress({ phase: 'download', downloaded: 0 });
    try {
      const latest = await checkForUpdates(true);
      if (latest.latestVersion !== updateInfo.latestVersion || !latest.hasUpdate) {
        throw new Error('Release changed; check for updates again');
      }
      await installUpdate(updateInfo.latestVersion, setProgress);
    } catch (err) {
      console.error('[Updater]', err);
      setError(isEn ? 'Update did not complete. Check your connection and manuscript save status, then retry. If installation completed, reopen Novelite.' : '更新未完成，请检查网络和手稿保存状态后重试。如安装已完成，请重新打开 Novelite。');
      setProgress(null);
    } finally { busyRef.current = false; }
  };
  const status = progress?.phase === 'download'
    ? (isEn ? 'Downloading and verifying…' : '正在下载并校验…') + (progress.total ? ` ${Math.min(100, Math.round((progress.downloaded || 0) / progress.total * 100))}%` : '')
    : progress?.phase === 'saving' ? (isEn ? 'Saving manuscript…' : '正在保存手稿…')
    : progress?.phase === 'installing' ? (isEn ? 'Installing…' : '正在安装…')
    : (isEn ? 'Restarting…' : '正在重启…');

  const publishedDate = updateInfo.publishedAt
    ? new Date(updateInfo.publishedAt).toLocaleDateString(isEn ? 'en-US' : 'zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={close}
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
            onClick={close}
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

          <p className="text-xs opacity-70">{isEn ? 'Your manuscript will be saved before installing. Novelite will restart after the update.' : '安装前会保存手稿，完成后 Novelite 将重新启动。'}</p>
          {progress && <p role="status" className="text-sm">{status}</p>}
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div
          className="p-3 px-5 border-t flex items-center justify-between bg-black/15 shrink-0"
          style={{ borderColor: `${theme.colors.border}30` }}
        >
          <button
            onClick={close}
            className="px-3 py-1.5 rounded-xl text-xs opacity-50 hover:opacity-100 hover:bg-white/5 transition-colors cursor-pointer"
            style={{ color: theme.colors.text }}
          >
            {isEn ? 'Remind Me Later' : '稍后提醒'}
          </button>

          <button
            disabled={busy}
            onClick={handleInstall}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white transition-all cursor-pointer shadow-md"
          >
            <span>{busy ? status : (isEn ? 'Install and restart' : '安装并重启')}</span>
            <DownloadCloud className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
