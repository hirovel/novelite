import type { NovelProject, Volume, Chapter } from './types';
import { projectStore, countWordsFast } from './ProjectStore';
import { eventBus } from '../events/EventBus';

export type DiskSyncStatus = 'idle' | 'syncing' | 'saved' | 'external-change' | 'error';

export class FileSystemStore {
  private static instance: FileSystemStore;
  private currentDirHandle: any = null;
  private chapterFileHandles: Map<string, any> = new Map();
  private volumeDirHandles: Map<string, any> = new Map();
  private fileLastModified: Map<string, number> = new Map();
  private syncStatus: DiskSyncStatus = 'idle';
  private watchTimer: any = null;
  private isWriting = false;

  private constructor() {
    this.startExternalWatchLoop();
  }

  public static getInstance(): FileSystemStore {
    if (!FileSystemStore.instance) {
      FileSystemStore.instance = new FileSystemStore();
    }
    return FileSystemStore.instance;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  public isDiskConnected(): boolean {
    return Boolean(this.currentDirHandle);
  }

  public getCurrentFolderName(): string | null {
    return this.currentDirHandle?.name || null;
  }

  public getSyncStatus(): DiskSyncStatus {
    return this.syncStatus;
  }

  /**
   * 🌟 1. Open Local Folder and mount real file system handles
   */
  public async openLocalDirectory(): Promise<NovelProject | null> {
    if (!this.isSupported()) {
      eventBus.emit('show-toast', {
        message: '当前浏览器不支持原生文件系统 API，请使用 Edge 或 Chrome',
        type: 'warning',
      });
      return null;
    }

    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      this.currentDirHandle = dirHandle;
      this.chapterFileHandles.clear();
      this.volumeDirHandles.clear();
      this.fileLastModified.clear();

      const volumes: Volume[] = [];
      let totalChaptersCount = 0;

      // Scan directories and files
      // @ts-ignore
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === 'directory') {
          const volId = `vol_fs_${name}_${Date.now()}`;
          this.volumeDirHandles.set(volId, handle);
          const volChapters: Chapter[] = [];

          // @ts-ignore
          for await (const [fileName, fileHandle] of handle.entries()) {
            if (fileHandle.kind === 'file' && (fileName.endsWith('.txt') || fileName.endsWith('.md'))) {
              const file = await fileHandle.getFile();
              const content = await file.text();
              const cleanTitle = fileName.replace(/\.(txt|md)$/i, '');
              const chapId = `chap_fs_${name}_${fileName}`;

              this.chapterFileHandles.set(chapId, fileHandle);
              this.fileLastModified.set(chapId, file.lastModified);

              volChapters.push({
                id: chapId,
                title: cleanTitle,
                content,
                wordCount: countWordsFast(content),
                updatedAt: file.lastModified || Date.now(),
              });
              totalChaptersCount++;
            }
          }

          // Sort chapters naturally (e.g. 01, 02, 第1章, 第2章)
          volChapters.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN', { numeric: true }));

          volumes.push({
            id: volId,
            title: name,
            isExpanded: true,
            chapters: volChapters,
          });
        } else if (handle.kind === 'file' && (name.endsWith('.txt') || name.endsWith('.md'))) {
          // Root level chapter file
          const file = await handle.getFile();
          const content = await file.text();
          const cleanTitle = name.replace(/\.(txt|md)$/i, '');
          const chapId = `chap_fs_root_${name}`;

          this.chapterFileHandles.set(chapId, handle);
          this.fileLastModified.set(chapId, file.lastModified);

          if (!volumes[0]) {
            const rootVolId = `vol_fs_root_${Date.now()}`;
            this.volumeDirHandles.set(rootVolId, dirHandle);
            volumes.push({
              id: rootVolId,
              title: '第一卷：正文手稿',
              isExpanded: true,
              chapters: [],
            });
          }
          volumes[0].chapters.push({
            id: chapId,
            title: cleanTitle,
            content,
            wordCount: countWordsFast(content),
            updatedAt: file.lastModified || Date.now(),
          });
          totalChaptersCount++;
        }
      }

      if (volumes.length === 0) {
        // Create initial default chapter on disk
        const defaultVolDir = await dirHandle.getDirectoryHandle('第一卷：初入江湖', { create: true });
        const defaultVolId = `vol_fs_init_${Date.now()}`;
        this.volumeDirHandles.set(defaultVolId, defaultVolDir);

        const defaultFile = await defaultVolDir.getFileHandle('第一章：初启征程.txt', { create: true });
        const defaultChapId = `chap_fs_init_${Date.now()}`;
        this.chapterFileHandles.set(defaultChapId, defaultFile);

        const initialText = '# 第一章：初启征程\n\n新篇开启，落笔生花。';
        const writable = await defaultFile.createWritable();
        await writable.write(initialText);
        await writable.close();

        const file = await defaultFile.getFile();
        this.fileLastModified.set(defaultChapId, file.lastModified);

        volumes.push({
          id: defaultVolId,
          title: '第一卷：初入江湖',
          isExpanded: true,
          chapters: [
            {
              id: defaultChapId,
              title: '第一章：初启征程',
              content: initialText,
              wordCount: countWordsFast(initialText),
              updatedAt: Date.now(),
            },
          ],
        });
      }

      const bookTitle = dirHandle.name || '本地小说项目';
      const newProj = projectStore.createProject(bookTitle, '本地作者');
      newProj.volumes = volumes;
      newProj.activeChapterId = volumes[0]?.chapters[0]?.id || null;
      projectStore.save();

      this.syncStatus = 'saved';
      eventBus.emit('disk-sync-changed', { status: 'saved', folderName: bookTitle });
      eventBus.emit('show-toast', {
        message: `已挂载本地硬盘目录《${bookTitle}》（${volumes.length} 卷 · ${totalChaptersCount} 章）实时双向同步已激活`,
        type: 'success',
      });

      return newProj;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error opening directory:', err);
        eventBus.emit('show-toast', {
          message: '打开本地目录失败: ' + (err.message || '未知错误'),
          type: 'error',
        });
      }
      return null;
    }
  }

  /**
   * 🌟 2. Direct Disk Writeback: writes active chapter text straight to disk file
   */
  public async writeChapterDirectToDisk(chapterId: string, content: string): Promise<boolean> {
    if (!this.currentDirHandle) return false;
    const fileHandle = this.chapterFileHandles.get(chapterId);
    if (!fileHandle) return false;

    this.isWriting = true;
    this.syncStatus = 'syncing';
    eventBus.emit('disk-sync-changed', { status: 'syncing' });

    try {
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      const file = await fileHandle.getFile();
      this.fileLastModified.set(chapterId, file.lastModified);

      this.syncStatus = 'saved';
      eventBus.emit('disk-sync-changed', { status: 'saved' });
      return true;
    } catch (err) {
      console.error('Failed to write chapter to disk:', err);
      this.syncStatus = 'error';
      eventBus.emit('disk-sync-changed', { status: 'error' });
      return false;
    } finally {
      this.isWriting = false;
    }
  }

  /**
   * 🌟 3. External Change Watcher Loop: Checks if active file was edited in VSCode/Typora
   */
  private startExternalWatchLoop(): void {
    if (typeof window === 'undefined') return;

    // Check on window focus and every 2.5 seconds
    window.addEventListener('focus', () => {
      this.checkActiveChapterExternalChange();
    });

    this.watchTimer = setInterval(() => {
      this.checkActiveChapterExternalChange();
    }, 2500);
  }

  public stopExternalWatchLoop(): void {
    if (this.watchTimer) {
      clearInterval(this.watchTimer);
      this.watchTimer = null;
    }
  }

  public async checkActiveChapterExternalChange(): Promise<boolean> {
    if (!this.currentDirHandle || this.isWriting) return false;
    const curChap = projectStore.getActiveChapter();
    if (!curChap) return false;

    const fileHandle = this.chapterFileHandles.get(curChap.id);
    if (!fileHandle) return false;

    try {
      const file = await fileHandle.getFile();
      const lastRecorded = this.fileLastModified.get(curChap.id) || 0;

      // If disk timestamp is newer than our recorded timestamp by more than 1000ms
      if (file.lastModified > lastRecorded + 1000) {
        const diskContent = await file.text();
        if (diskContent !== curChap.content) {
          this.fileLastModified.set(curChap.id, file.lastModified);
          this.syncStatus = 'external-change';

          // Atomic Hot-Reload into ProjectStore & Editor
          projectStore.updateChapterContent(curChap.id, diskContent);
          eventBus.emit('chapter-content-updated', { chapterId: curChap.id, content: diskContent });
          eventBus.emit('active-chapter-changed', curChap.id);
          eventBus.emit('disk-sync-changed', { status: 'saved' });

          eventBus.emit('show-toast', {
            message: `检测到外部修改 (VSCode/Typora/云同步)，已平滑热重载最新《${curChap.title}》`,
            type: 'info',
          });
          return true;
        }
      }
    } catch (err) {
      // Handle permission error or file removed
    }
    return false;
  }

  /**
   * 🌟 4. Export Entire Project to Local Directory
   */
  public async exportToLocalDirectory(project: NovelProject): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      for (const vol of project.volumes) {
        const volDir = await dirHandle.getDirectoryHandle(vol.title, { create: true });
        for (let i = 0; i < vol.chapters.length; i++) {
          const chap = vol.chapters[i];
          const fileName = `${String(i + 1).padStart(2, '0')}_${chap.title}.txt`;
          const fileHandle = await volDir.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(chap.content || '');
          await writable.close();
        }
      }

      eventBus.emit('show-toast', {
        message: `已成功将全书以纯文本标准目录导出至：${dirHandle.name}`,
        type: 'success',
      });
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to export to directory:', err);
      }
      return false;
    }
  }
}

export const fileSystemStore = FileSystemStore.getInstance();
