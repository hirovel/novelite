/* eslint-disable no-await-in-loop */
import type { NovelProject, Volume, Chapter } from './types';
import { projectStore, countWordsFast } from './ProjectStore';
import { eventBus } from '../events/EventBus';

export type DiskSyncStatus = 'idle' | 'syncing' | 'saved' | 'external-change' | 'error';

export class FileSystemStore {
  private static instance: FileSystemStore;
  private currentDirHandle: any = null;
  private chapterFileHandles: Map<string, any> = new Map();
  private volumeDirHandles: Map<string, any> = new Map();
  private volumeNames: Map<string, string> = new Map();
  private chapterMeta: Map<string, { volId: string; fileName: string }> = new Map();
  private fileLastModified: Map<string, number> = new Map();
  private syncStatus: DiskSyncStatus = 'idle';
  private watchTimer: any = null;
  private focusHandler: (() => void) | null = null;
  private isWriting = false;

  private constructor() {
    this.startExternalWatchLoop();
    this.registerEventHandlers();
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
      this.volumeNames.clear();
      this.chapterMeta.clear();
      this.fileLastModified.clear();

      const volumes: Volume[] = [];
      let totalChaptersCount = 0;

      // Scan directories and files
      // @ts-ignore
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === 'directory') {
          const volId = `vol_fs_${name}_${Date.now()}`;
          this.volumeDirHandles.set(volId, handle);
          this.volumeNames.set(volId, name);
          const volChapters: Chapter[] = [];

          // @ts-ignore
          for await (const [fileName, fileHandle] of handle.entries()) {
            if (fileHandle.kind === 'file' && (fileName.endsWith('.txt') || fileName.endsWith('.md'))) {
              const file = await fileHandle.getFile();
              const content = await file.text();
              const cleanTitle = fileName.replace(/\.(txt|md)$/i, '');
              const chapId = `chap_fs_${name}_${fileName}`;

              this.chapterFileHandles.set(chapId, fileHandle);
              this.chapterMeta.set(chapId, { volId, fileName });
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

          if (!volumes[0]) {
            const rootVolId = `vol_fs_root_${Date.now()}`;
            this.volumeDirHandles.set(rootVolId, dirHandle);
            this.volumeNames.set(rootVolId, '第一卷');
            volumes.push({
              id: rootVolId,
              title: '第一卷',
              isExpanded: true,
              chapters: [],
            });
          }

          const targetVolId = volumes[0].id;
          this.chapterFileHandles.set(chapId, handle);
          this.chapterMeta.set(chapId, { volId: targetVolId, fileName: name });
          this.fileLastModified.set(chapId, file.lastModified);

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
        const defaultVolDir = await dirHandle.getDirectoryHandle('第一卷', { create: true });
        const defaultVolId = `vol_fs_init_${Date.now()}`;
        this.volumeDirHandles.set(defaultVolId, defaultVolDir);
        this.volumeNames.set(defaultVolId, '第一卷');

        const defaultFile = await defaultVolDir.getFileHandle('第一章.txt', { create: true });
        const defaultChapId = `chap_fs_init_${Date.now()}`;
        this.chapterFileHandles.set(defaultChapId, defaultFile);
        this.chapterMeta.set(defaultChapId, { volId: defaultVolId, fileName: '第一章.txt' });

        const initialText = '# 第一章\n\n开始写作。';
        const writable = await defaultFile.createWritable();
        await writable.write(initialText);
        await writable.close();

        const file = await defaultFile.getFile();
        this.fileLastModified.set(defaultChapId, file.lastModified);

        volumes.push({
          id: defaultVolId,
          title: '第一卷',
          isExpanded: true,
          chapters: [
            {
              id: defaultChapId,
              title: '第一章',
              content: initialText,
              wordCount: countWordsFast(initialText),
              updatedAt: Date.now(),
            },
          ],
        });
      }

      const bookTitle = dirHandle.name || '本地作品';
      const newProj = projectStore.createProject(bookTitle, '本地作者');
      newProj.volumes = volumes;
      newProj.activeChapterId = volumes[0]?.chapters[0]?.id || null;
      projectStore.save();

      eventBus.emit('project-tree-changed', newProj);
      eventBus.emit('active-chapter-changed', newProj.activeChapterId);
      const activeChap = volumes[0]?.chapters[0];
      if (activeChap) {
        eventBus.emit('chapter-selected', activeChap);
      }

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
    this.focusHandler = () => {
      this.checkActiveChapterExternalChange();
    };
    window.addEventListener('focus', this.focusHandler);

    this.watchTimer = setInterval(() => {
      this.checkActiveChapterExternalChange();
    }, 2500);
  }

  public stopExternalWatchLoop(): void {
    if (this.watchTimer) {
      clearInterval(this.watchTimer);
      this.watchTimer = null;
    }
    if (this.focusHandler && typeof window !== 'undefined') {
      window.removeEventListener('focus', this.focusHandler);
      this.focusHandler = null;
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
    } catch {
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

  /**
   * 🌟 5. Obsidian-Style Physical Disk Operations & Reactive Sync
   */
  public async deleteChapterFromDisk(chapterId: string): Promise<boolean> {
    if (!this.currentDirHandle) return false;
    const meta = this.chapterMeta.get(chapterId);
    if (!meta) return false;

    try {
      const volDir = this.volumeDirHandles.get(meta.volId) || this.currentDirHandle;
      await volDir.removeEntry(meta.fileName);
      this.chapterFileHandles.delete(chapterId);
      this.chapterMeta.delete(chapterId);
      this.fileLastModified.delete(chapterId);
      console.log(`[FileSystemStore] Physically removed chapter file from disk: ${meta.fileName}`);
      return true;
    } catch (err) {
      console.warn(`[FileSystemStore] Could not remove file from disk:`, err);
      return false;
    }
  }

  public async deleteVolumeFromDisk(volumeId: string): Promise<boolean> {
    if (!this.currentDirHandle) return false;
    const volName = this.volumeNames.get(volumeId);
    if (!volName) return false;

    try {
      await this.currentDirHandle.removeEntry(volName, { recursive: true });
      this.volumeDirHandles.delete(volumeId);
      this.volumeNames.delete(volumeId);
      // Clean up all associated chapters from maps
      for (const [chapId, meta] of this.chapterMeta.entries()) {
        if (meta.volId === volumeId) {
          this.chapterFileHandles.delete(chapId);
          this.chapterMeta.delete(chapId);
          this.fileLastModified.delete(chapId);
        }
      }
      console.log(`[FileSystemStore] Physically removed volume directory from disk: ${volName}`);
      return true;
    } catch (err) {
      console.warn(`[FileSystemStore] Could not remove volume from disk:`, err);
      return false;
    }
  }

  public async createChapterOnDisk(volumeId: string, chapterId: string, title: string, content: string): Promise<boolean> {
    if (!this.currentDirHandle) return false;

    try {
      const volDir = this.volumeDirHandles.get(volumeId) || this.currentDirHandle;
      const safeTitle = (title.trim() || '未命名章节').replace(/[\\/:*?"<>|]/g, '_');
      const fileName = `${safeTitle}.txt`;

      const fileHandle = await volDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content || '');
      await writable.close();

      this.chapterFileHandles.set(chapterId, fileHandle);
      this.chapterMeta.set(chapterId, { volId: volumeId, fileName });
      const file = await fileHandle.getFile();
      this.fileLastModified.set(chapterId, file.lastModified);
      console.log(`[FileSystemStore] Created physical chapter file on disk: ${fileName}`);
      return true;
    } catch (err) {
      console.error(`[FileSystemStore] Failed to create chapter file on disk:`, err);
      return false;
    }
  }

  public async renameChapterOnDisk(chapterId: string, newTitle: string): Promise<boolean> {
    if (!this.currentDirHandle) return false;
    const meta = this.chapterMeta.get(chapterId);
    if (!meta) return false;

    const safeTitle = (newTitle.trim() || '未命名章节').replace(/[\\/:*?"<>|]/g, '_');
    const ext = meta.fileName.endsWith('.md') ? '.md' : '.txt';
    const newFileName = `${safeTitle}${ext}`;
    if (newFileName === meta.fileName) return true;

    try {
      const volDir = this.volumeDirHandles.get(meta.volId) || this.currentDirHandle;
      const oldHandle = this.chapterFileHandles.get(chapterId);

      // Check if handle.move is supported (modern File System API)
      if (oldHandle && typeof oldHandle.move === 'function') {
        await oldHandle.move(newFileName);
        meta.fileName = newFileName;
        return true;
      }

      // Fallback: copy content to new file and delete old file
      if (oldHandle) {
        const oldFile = await oldHandle.getFile();
        const content = await oldFile.text();

        const newHandle = await volDir.getFileHandle(newFileName, { create: true });
        const writable = await newHandle.createWritable();
        await writable.write(content);
        await writable.close();

        await volDir.removeEntry(meta.fileName);

        meta.fileName = newFileName;
        this.chapterFileHandles.set(chapterId, newHandle);
        const updatedFile = await newHandle.getFile();
        this.fileLastModified.set(chapterId, updatedFile.lastModified);
        console.log(`[FileSystemStore] Renamed physical chapter file on disk: ${newFileName}`);
        return true;
      }
      return false;
    } catch (err) {
      console.error(`[FileSystemStore] Failed to rename chapter file on disk:`, err);
      return false;
    }
  }

  public async createVolumeOnDisk(volumeId: string, title: string): Promise<boolean> {
    if (!this.currentDirHandle) return false;

    try {
      const safeTitle = (title.trim() || '新建分卷').replace(/[\\/:*?"<>|]/g, '_');
      const volDir = await this.currentDirHandle.getDirectoryHandle(safeTitle, { create: true });
      this.volumeDirHandles.set(volumeId, volDir);
      this.volumeNames.set(volumeId, safeTitle);
      console.log(`[FileSystemStore] Created physical volume directory on disk: ${safeTitle}`);
      return true;
    } catch (err) {
      console.error(`[FileSystemStore] Failed to create volume on disk:`, err);
      return false;
    }
  }

  public async renameVolumeOnDisk(volumeId: string, newTitle: string): Promise<boolean> {
    if (!this.currentDirHandle) return false;
    const oldName = this.volumeNames.get(volumeId);
    if (!oldName) return false;

    const safeTitle = (newTitle.trim() || '新建分卷').replace(/[\\/:*?"<>|]/g, '_');
    if (safeTitle === oldName) return true;

    try {
      const oldDir = this.volumeDirHandles.get(volumeId);
      if (oldDir && typeof oldDir.move === 'function') {
        await oldDir.move(safeTitle);
        this.volumeNames.set(volumeId, safeTitle);
        return true;
      }

      // Fallback: create new dir, copy files, delete old dir
      const newDir = await this.currentDirHandle.getDirectoryHandle(safeTitle, { create: true });
      for (const [chapId, meta] of this.chapterMeta.entries()) {
        if (meta.volId === volumeId) {
          const oldFileHandle = this.chapterFileHandles.get(chapId);
          if (oldFileHandle) {
            const file = await oldFileHandle.getFile();
            const text = await file.text();
            const newFileHandle = await newDir.getFileHandle(meta.fileName, { create: true });
            const w = await newFileHandle.createWritable();
            await w.write(text);
            await w.close();
            this.chapterFileHandles.set(chapId, newFileHandle);
          }
        }
      }
      await this.currentDirHandle.removeEntry(oldName, { recursive: true });
      this.volumeDirHandles.set(volumeId, newDir);
      this.volumeNames.set(volumeId, safeTitle);
      return true;
    } catch (err) {
      console.error(`[FileSystemStore] Failed to rename volume on disk:`, err);
      return false;
    }
  }

  private registerEventHandlers(): void {
    eventBus.on('chapter-created', async ({ volumeId, chapter }: any) => {
      if (chapter && volumeId) {
        await this.createChapterOnDisk(volumeId, chapter.id, chapter.title, chapter.content);
      }
    });

    eventBus.on('chapter-renamed', async ({ chapterId, newTitle }: any) => {
      if (chapterId && newTitle) {
        await this.renameChapterOnDisk(chapterId, newTitle);
      }
    });

    eventBus.on('chapter-deleted', async ({ chapterId }: any) => {
      if (chapterId) {
        await this.deleteChapterFromDisk(chapterId);
      }
    });

    eventBus.on('volume-created', async ({ volume }: any) => {
      if (volume) {
        await this.createVolumeOnDisk(volume.id, volume.title);
      }
    });

    eventBus.on('volume-renamed', async ({ volumeId, newTitle }: any) => {
      if (volumeId && newTitle) {
        await this.renameVolumeOnDisk(volumeId, newTitle);
      }
    });

    eventBus.on('volume-deleted', async ({ volumeId }: any) => {
      if (volumeId) {
        await this.deleteVolumeFromDisk(volumeId);
      }
    });
  }
}

export const fileSystemStore = FileSystemStore.getInstance();
