import type { NovelProject, Volume, Chapter, ChapterSnapshot } from './types';
import { getSampleProject } from './sampleNovel';
import { eventBus } from '../events/EventBus';
import { safeStorageSet } from './safeStorage';

function getIsEn(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem('novelite_language') === 'en';
}

/**
 * 🚀 High-performance single-pass word counting without regex heap allocations.
 * Accurately counts CJK Chinese characters + English/alphanumeric words.
 */
export function countWordsFast(text: string): number {
  if (!text) return 0;
  let count = 0;
  let inWord = false;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);

    // CJK Unified Ideographs (0x4E00 - 0x9FFF) + Extension A (0x3400 - 0x4DBF) + '〇' (0x3007) + Compatibility (0xF900 - 0xFAFF)
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      code === 0x3007 ||
      (code >= 0xf900 && code <= 0xfaff)
    ) {
      count++;
      inWord = false;
    } else if (
      (code >= 48 && code <= 57) || // 0-9
      (code >= 65 && code <= 90) || // A-Z
      (code >= 97 && code <= 122) || // a-z
      code === 95 // _
    ) {
      if (!inWord) {
        count++;
        inWord = true;
      }
    } else {
      inWord = false;
    }
  }

  return count;
}

export class ProjectStore {
  private static instance: ProjectStore;
  private project: NovelProject;
  private library: Record<string, NovelProject> = {};
  private autoSaveTimer: any = null;

  private constructor() {
    this.library = this.loadLibrary();
    const activeId = localStorage.getItem('novelite_active_project_id');
    if (activeId && this.library[activeId]) {
      this.project = this.library[activeId];
    } else {
      const firstId = Object.keys(this.library)[0];
      this.project = firstId ? this.library[firstId] : getSampleProject(getIsEn());
      this.library[this.project.id] = this.project;
      this.safeStorageSet('novelite_active_project_id', this.project.id);
    }
  }

  public static getInstance(): ProjectStore {
    if (!ProjectStore.instance) {
      ProjectStore.instance = new ProjectStore();
    }
    return ProjectStore.instance;
  }

  private safeStorageSet(key: string, value: string): boolean {
    return safeStorageSet(key, value);
  }

  private loadLibrary(): Record<string, NovelProject> {
    const saved = localStorage.getItem('novelite_library_map');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to load library from storage:', e);
      }
    }

    // Migrate from single project data if exists
    const legacy = localStorage.getItem('novelite_project_data');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        if (parsed && parsed.id) {
          const map = { [parsed.id]: parsed };
          this.safeStorageSet('novelite_library_map', JSON.stringify(map));
          return map;
        }
      } catch (e) {
        console.warn('Failed to parse legacy novelite_project_data:', e);
      }
    }

    const defaultProject = getSampleProject(getIsEn());
    const defaultMap = { [defaultProject.id]: defaultProject };
    this.safeStorageSet('novelite_library_map', JSON.stringify(defaultMap));
    return defaultMap;
  }

  public save(): void {
    this.project.updatedAt = Date.now();
    this.library[this.project.id] = this.project;
    this.safeStorageSet('novelite_library_map', JSON.stringify(this.library));
    this.safeStorageSet('novelite_project_data', JSON.stringify(this.project));
    this.safeStorageSet('novelite_active_project_id', this.project.id);
    eventBus.emit('project-saved', this.project);
  }

  public getProject(): NovelProject {
    return this.project;
  }

  public getProjectById(id: string): NovelProject | null {
    return this.library[id] || (this.project?.id === id ? this.project : null);
  }

  public getLibrary(): { id: string; title: string; author: string; wordCount: number; chapterCount: number; updatedAt: number }[] {
    return Object.values(this.library).map((proj) => {
      let totalWords = 0;
      let totalChapters = 0;
      proj.volumes?.forEach((v) => {
        v.chapters?.forEach((c) => {
          totalWords += c.wordCount || 0;
          totalChapters += 1;
        });
      });
      const isEn = getIsEn();
      return {
        id: proj.id,
        title: proj.title || (isEn ? 'Untitled Novel' : '无标题小说'),
        author: proj.author || (isEn ? 'Anonymous' : '佚名'),
        wordCount: totalWords,
        chapterCount: totalChapters,
        updatedAt: proj.updatedAt || Date.now(),
      };
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public createProject(title: string, author?: string): NovelProject {
    const isEn = getIsEn();
    const finalTitle = title.trim() || (isEn ? 'Untitled Novel' : '未命名作品');
    const finalAuthor = (author && author.trim()) || (isEn ? 'Anonymous' : '佚名');
    const defaultVolTitle = isEn ? 'Volume 1' : '第一卷';
    const defaultChapTitle = isEn ? 'Chapter 1' : '第一章';
    const defaultContent = isEn ? '# Chapter 1\n\nStart writing here.' : '# 第一章\n\n开始写作。';

    const newProj: NovelProject = {
      id: `proj_${Date.now()}`,
      title: finalTitle,
      author: finalAuthor,
      targetWordCount: 100000,
      volumes: [
        {
          id: `vol_${Date.now()}_1`,
          title: defaultVolTitle,
          isExpanded: true,
          chapters: [
            {
              id: `chap_${Date.now()}_1`,
              title: defaultChapTitle,
              content: defaultContent,
              wordCount: countWordsFast(defaultContent),
              updatedAt: Date.now(),
            },
          ],
        },
      ],
      activeChapterId: null,
      scratchpad: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    newProj.activeChapterId = newProj.volumes[0].chapters[0].id;

    this.library[newProj.id] = newProj;
    this.project = newProj;
    this.save();
    eventBus.emit('project-tree-changed', this.project);
    eventBus.emit('active-chapter-changed', newProj.activeChapterId);
    const activeChap = this.getActiveChapter();
    if (activeChap) {
      eventBus.emit('chapter-selected', activeChap);
    }
    return newProj;
  }

  public importProject(title: string, author: string, volumes: Volume[]): NovelProject {
    const isEn = getIsEn();
    const defaultVolTitle = isEn ? 'Volume 1' : '第一卷';
    const defaultChapTitle = isEn ? 'Chapter 1' : '第一章';
    const defaultContent = isEn ? '# Chapter 1\n\nStart writing here.' : '# 第一章\n\n开始写作。';

    const defaultVol: Volume = {
      id: `vol_${Date.now()}_1`,
      title: defaultVolTitle,
      isExpanded: true,
      chapters: [
        {
          id: `chap_${Date.now()}_1`,
          title: defaultChapTitle,
          content: defaultContent,
          wordCount: countWordsFast(defaultContent),
          updatedAt: Date.now(),
        },
      ],
    };

    const validVolumes = volumes && volumes.length > 0 ? volumes : [defaultVol];
    const firstChapId = validVolumes[0]?.chapters[0]?.id || null;

    const newProj: NovelProject = {
      id: `proj_${Date.now()}`,
      title: title.trim() || (isEn ? 'Imported Project' : '导入作品'),
      author: (author && author.trim()) || (isEn ? 'Anonymous' : '佚名'),
      targetWordCount: 100000,
      volumes: validVolumes,
      activeChapterId: firstChapId,
      scratchpad: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.library[newProj.id] = newProj;
    this.project = newProj;
    this.save();
    eventBus.emit('project-tree-changed', this.project);
    eventBus.emit('active-chapter-changed', newProj.activeChapterId);
    const activeChap = this.getActiveChapter();
    if (activeChap) {
      eventBus.emit('chapter-selected', activeChap);
    }
    return newProj;
  }

  public switchProject(projectId: string): boolean {
    if (!this.library[projectId]) return false;
    this.project = this.library[projectId];
    this.save();
    eventBus.emit('project-tree-changed', this.project);
    const activeChap = this.getActiveChapter();
    eventBus.emit('active-chapter-changed', activeChap?.id || null);
    if (activeChap) {
      eventBus.emit('chapter-selected', activeChap);
    }
    return true;
  }

  public deleteProject(projectId: string): boolean {
    const keys = Object.keys(this.library);
    if (keys.length <= 1) {
      return false; // Keep at least one book
    }
    delete this.library[projectId];
    if (this.project.id === projectId) {
      const nextId = Object.keys(this.library)[0];
      this.project = this.library[nextId];
    }
    this.save();
    eventBus.emit('project-tree-changed', this.project);
    const activeChap = this.getActiveChapter();
    eventBus.emit('active-chapter-changed', activeChap?.id || null);
    if (activeChap) {
      eventBus.emit('chapter-selected', activeChap);
    }
    return true;
  }

  public renameProject(projectId: string, newTitle: string): boolean {
    if (this.library[projectId]) {
      const isEn = getIsEn();
      const titleVal = newTitle.trim() || (isEn ? 'Untitled Novel' : '未命名作品');
      this.library[projectId].title = titleVal;
      if (this.project.id === projectId) {
        this.project.title = titleVal;
      }
      this.save();
      eventBus.emit('project-tree-changed', this.project);
      return true;
    }
    return false;
  }

  public getAllChaptersFlat(): { volId: string; volTitle: string; chapter: Chapter }[] {
    const list: { volId: string; volTitle: string; chapter: Chapter }[] = [];
    this.project.volumes.forEach((vol) => {
      vol.chapters.forEach((chap) => {
        list.push({ volId: vol.id, volTitle: vol.title, chapter: chap });
      });
    });
    return list;
  }

  public navigateToNextChapter(): boolean {
    const flat = this.getAllChaptersFlat();
    if (flat.length === 0) return false;
    const curIdx = flat.findIndex((item) => item.chapter.id === this.project.activeChapterId);
    if (curIdx !== -1 && curIdx < flat.length - 1) {
      const nextChap = flat[curIdx + 1].chapter;
      this.setActiveChapter(nextChap.id);
      const isEn = getIsEn();
      eventBus.emit('show-toast', {
        message: isEn ? `Switched to "${nextChap.title}"` : `已切换至《${nextChap.title}》`,
        type: 'info',
      });
      return true;
    }
    return false;
  }

  public navigateToPrevChapter(): boolean {
    const flat = this.getAllChaptersFlat();
    if (flat.length === 0) return false;
    const curIdx = flat.findIndex((item) => item.chapter.id === this.project.activeChapterId);
    if (curIdx > 0) {
      const prevChap = flat[curIdx - 1].chapter;
      this.setActiveChapter(prevChap.id);
      const isEn = getIsEn();
      eventBus.emit('show-toast', {
        message: isEn ? `Switched to "${prevChap.title}"` : `已切换至《${prevChap.title}》`,
        type: 'info',
      });
      return true;
    }
    return false;
  }

  public getActiveChapter(): Chapter | null {
    if (!this.project.activeChapterId) return null;
    for (const vol of this.project.volumes) {
      for (const chap of vol.chapters) {
        if (chap.id === this.project.activeChapterId) {
          return chap;
        }
      }
    }
    // Fallback to first chapter
    if (this.project.volumes[0]?.chapters[0]) {
      this.project.activeChapterId = this.project.volumes[0].chapters[0].id;
      return this.project.volumes[0].chapters[0];
    }
    return null;
  }

  public getChapter(id: string): Chapter | null {
    return this.findChapter(id);
  }

  public setActiveChapter(id: string): void {
    this.project.activeChapterId = id;
    this.save();
    const chap = this.findChapter(id);
    eventBus.emit('active-chapter-changed', id);
    if (chap) {
      eventBus.emit('chapter-selected', chap);
    }
  }

  public updateChapterContent(id: string, content: string): void {
    const chap = this.findChapter(id);
    if (!chap) return;

    chap.content = content;
    chap.wordCount = countWordsFast(content);
    chap.updatedAt = Date.now();

    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.save();
    }, 400);

    eventBus.emit('chapter-content-updated', {
      id,
      chapterId: id,
      content,
      wordCount: chap.wordCount,
    });
  }

  public addVolume(title?: string): Volume {
    const isEn = getIsEn();
    const finalTitle = (title && title.trim()) || (isEn ? 'New Volume' : '新建分卷');
    const newVol: Volume = {
      id: `vol_${Date.now()}`,
      title: finalTitle,
      isExpanded: true,
      chapters: [],
    };
    this.project.volumes.push(newVol);
    this.save();
    eventBus.emit('volume-created', { volume: newVol });
    eventBus.emit('project-tree-changed', this.project);
    return newVol;
  }

  public addChapter(volumeId: string, title?: string): Chapter {
    const vol = this.project.volumes.find((v) => v.id === volumeId);
    if (!vol) throw new Error('Volume not found');

    const isEn = getIsEn();
    const finalTitle = (title && title.trim()) || (isEn ? 'New Chapter' : '新建章节');

    const newChap: Chapter = {
      id: `chap_${Date.now()}`,
      title: finalTitle,
      content: `# ${finalTitle}\n\n`,
      wordCount: 0,
      updatedAt: Date.now(),
    };
    vol.chapters.push(newChap);
    vol.isExpanded = true;
    this.project.activeChapterId = newChap.id;
    this.save();
    eventBus.emit('chapter-created', { volumeId, chapter: newChap });
    eventBus.emit('project-tree-changed', this.project);
    eventBus.emit('active-chapter-changed', newChap.id);
    eventBus.emit('chapter-selected', newChap);
    return newChap;
  }

  public renameVolume(volumeId: string, newTitle: string): void {
    const vol = this.project.volumes.find((v) => v.id === volumeId);
    if (vol) {
      vol.title = newTitle;
      this.save();
      eventBus.emit('volume-renamed', { volumeId, newTitle });
      eventBus.emit('project-tree-changed', this.project);
    }
  }

  public renameChapter(chapterId: string, newTitle: string): void {
    const chap = this.findChapter(chapterId);
    if (chap) {
      chap.title = newTitle;
      this.save();
      eventBus.emit('chapter-renamed', { chapterId, newTitle });
      eventBus.emit('project-tree-changed', this.project);
    }
  }

  public deleteVolume(volumeId: string): void {
    eventBus.emit('volume-deleted', { volumeId });
    this.project.volumes = this.project.volumes.filter((v) => v.id !== volumeId);
    const isEn = getIsEn();
    if (this.project.volumes.length === 0 || this.project.volumes.every((v) => v.chapters.length === 0)) {
      if (this.project.volumes.length === 0) {
        this.addVolume(isEn ? 'Volume 1' : '第一卷');
      }
      const firstVol = this.project.volumes[0];
      const newChap = this.addChapter(firstVol.id, isEn ? 'Chapter 1' : '第一章');
      this.setActiveChapter(newChap.id);
      return;
    }
    if (!this.getActiveChapter()) {
      const nextId = this.project.volumes[0]?.chapters[0]?.id;
      if (nextId) {
        this.setActiveChapter(nextId);
        return;
      }
    }
    this.save();
    eventBus.emit('project-tree-changed', this.project);
    eventBus.emit('active-chapter-changed', this.project.activeChapterId);
    const activeChap = this.getActiveChapter();
    if (activeChap) {
      eventBus.emit('chapter-selected', activeChap);
    }
  }

  public deleteChapter(chapterId: string): void {
    eventBus.emit('chapter-deleted', { chapterId });
    for (const vol of this.project.volumes) {
      vol.chapters = vol.chapters.filter((c) => c.id !== chapterId);
    }
    const isEn = getIsEn();
    if (this.project.volumes.every((v) => v.chapters.length === 0)) {
      const firstVol = this.project.volumes[0] || this.addVolume(isEn ? 'Volume 1' : '第一卷');
      const newChap = this.addChapter(firstVol.id, isEn ? 'Chapter 1' : '第一章');
      this.setActiveChapter(newChap.id);
      return;
    }
    if (this.project.activeChapterId === chapterId) {
      const nextId = this.project.volumes.find((v) => v.chapters.length > 0)?.chapters[0]?.id;
      if (nextId) {
        this.setActiveChapter(nextId);
        return;
      }
    }
    this.save();
    eventBus.emit('project-tree-changed', this.project);
    eventBus.emit('active-chapter-changed', this.project.activeChapterId);
    const activeChap = this.getActiveChapter();
    if (activeChap) {
      eventBus.emit('chapter-selected', activeChap);
    }
  }

  public moveChapter(volumeId: string, chapterId: string, direction: 'up' | 'down'): boolean {
    const vol = this.project.volumes.find((v) => v.id === volumeId);
    if (!vol) return false;
    const index = vol.chapters.findIndex((c) => c.id === chapterId);
    if (index === -1) return false;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= vol.chapters.length) return false;

    const temp = vol.chapters[index];
    vol.chapters[index] = vol.chapters[targetIndex];
    vol.chapters[targetIndex] = temp;

    this.save();
    eventBus.emit('project-tree-changed', this.project);
    return true;
  }

  public insertChapter(volumeId: string, title?: string, index?: number): Chapter {
    const vol = this.project.volumes.find((v) => v.id === volumeId);
    if (!vol) throw new Error('Volume not found');

    const isEn = getIsEn();
    const finalTitle = (title && title.trim()) || (isEn ? 'New Chapter' : '新建章节');

    const newChap: Chapter = {
      id: `chap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: finalTitle,
      content: `# ${finalTitle}\n\n`,
      wordCount: 0,
      updatedAt: Date.now(),
    };

    if (typeof index === 'number' && index >= 0 && index <= vol.chapters.length) {
      vol.chapters.splice(index, 0, newChap);
    } else {
      vol.chapters.push(newChap);
    }

    vol.isExpanded = true;
    this.project.activeChapterId = newChap.id;
    this.save();
    eventBus.emit('chapter-created', { volumeId, chapter: newChap });
    eventBus.emit('project-tree-changed', this.project);
    eventBus.emit('active-chapter-changed', newChap.id);
    eventBus.emit('chapter-selected', newChap);
    return newChap;
  }

  public duplicateChapter(chapterId: string): Chapter | null {
    for (const vol of this.project.volumes) {
      const idx = vol.chapters.findIndex((c) => c.id === chapterId);
      if (idx !== -1) {
        const orig = vol.chapters[idx];
        const isEn = getIsEn();
        const copySuffix = isEn ? 'Copy' : '副本';
        const copy: Chapter = {
          id: `chap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: `${orig.title} (${copySuffix})`,
          content: orig.content,
          wordCount: orig.wordCount,
          updatedAt: Date.now(),
        };
        vol.chapters.splice(idx + 1, 0, copy);
        this.project.activeChapterId = copy.id;
        this.save();
        eventBus.emit('chapter-created', { volumeId: vol.id, chapter: copy });
        eventBus.emit('project-tree-changed', this.project);
        eventBus.emit('active-chapter-changed', copy.id);
        eventBus.emit('chapter-selected', copy);
        return copy;
      }
    }
    return null;
  }

  public moveChapterAcrossVolumes(
    sourceVolId: string,
    targetVolId: string,
    chapterId: string,
    targetIndex?: number
  ): boolean {
    const sourceVol = this.project.volumes.find((v) => v.id === sourceVolId);
    const targetVol = this.project.volumes.find((v) => v.id === targetVolId);
    if (!sourceVol || !targetVol) return false;

    const chapIdx = sourceVol.chapters.findIndex((c) => c.id === chapterId);
    if (chapIdx === -1) return false;

    const [chap] = sourceVol.chapters.splice(chapIdx, 1);

    if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= targetVol.chapters.length) {
      targetVol.chapters.splice(targetIndex, 0, chap);
    } else {
      targetVol.chapters.push(chap);
    }

    targetVol.isExpanded = true;
    this.save();
    eventBus.emit('project-tree-changed', this.project);
    return true;
  }

  public reorderChapters(volumeId: string, fromIndex: number, toIndex: number): boolean {
    const vol = this.project.volumes.find((v) => v.id === volumeId);
    if (!vol) return false;
    if (fromIndex < 0 || fromIndex >= vol.chapters.length) return false;
    if (toIndex < 0 || toIndex >= vol.chapters.length) return false;

    const [moved] = vol.chapters.splice(fromIndex, 1);
    vol.chapters.splice(toIndex, 0, moved);

    this.save();
    eventBus.emit('project-tree-changed', this.project);
    return true;
  }

  public reorderVolumes(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= this.project.volumes.length) return false;
    if (toIndex < 0 || toIndex >= this.project.volumes.length) return false;

    const [moved] = this.project.volumes.splice(fromIndex, 1);
    this.project.volumes.splice(toIndex, 0, moved);

    this.save();
    eventBus.emit('project-tree-changed', this.project);
    return true;
  }

  public moveVolume(volumeId: string, direction: 'up' | 'down'): boolean {
    const index = this.project.volumes.findIndex((v) => v.id === volumeId);
    if (index === -1) return false;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= this.project.volumes.length) return false;

    const temp = this.project.volumes[index];
    this.project.volumes[index] = this.project.volumes[targetIndex];
    this.project.volumes[targetIndex] = temp;

    this.save();
    eventBus.emit('project-tree-changed', this.project);
    return true;
  }

  public updateScratchpad(text: string): void {
    this.project.scratchpad = text;
    this.save();
    eventBus.emit('scratchpad-updated', text);
  }

  public updateChapterSynopsis(chapterId: string, synopsis: string): void {
    const chap = this.findChapter(chapterId);
    if (chap) {
      chap.synopsis = synopsis;
      this.save();
      eventBus.emit('project-tree-changed', this.project);
    }
  }

  public updateChapterTargetWords(chapterId: string, targetWords: number): void {
    const chap = this.findChapter(chapterId);
    if (chap) {
      chap.targetWords = targetWords;
      this.save();
      eventBus.emit('project-tree-changed', this.project);
    }
  }

  public toggleExpandAllVolumes(expand: boolean): void {
    for (const vol of this.project.volumes) {
      vol.isExpanded = expand;
    }
    this.save();
    eventBus.emit('project-tree-changed', this.project);
  }

  public autoNumberChapters(): number {
    let count = 0;
    const toChineseNumber = (n: number): string => {
      const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
      if (n <= 10) return n === 10 ? '十' : digits[n];
      if (n < 20) return '十' + (n % 10 === 0 ? '' : digits[n % 10]);
      if (n < 100) {
        const tens = Math.floor(n / 10);
        const ones = n % 10;
        return digits[tens] + '十' + (ones === 0 ? '' : digits[ones]);
      }
      if (n < 1000) {
        const hundreds = Math.floor(n / 100);
        const rest = n % 100;
        if (rest === 0) return digits[hundreds] + '百';
        if (rest < 10) return digits[hundreds] + '百零' + digits[rest];
        const tens = Math.floor(rest / 10);
        const ones = rest % 10;
        return digits[hundreds] + '百' + digits[tens] + '十' + (ones === 0 ? '' : digits[ones]);
      }
      return String(n);
    };

    const isEn = getIsEn();
    for (const vol of this.project.volumes) {
      for (const chap of vol.chapters) {
        count++;
        // Strip previous "第X章" or "Chapter X" prefix
        const pureTitle = chap.title
          .replace(/^第[零一二三四五六七八九十百千万\d]+章[\s:：]*/i, '')
          .replace(/^Chapter\s*\d+[\s:：]*/i, '')
          .trim();
        if (isEn) {
          chap.title = pureTitle ? `Chapter ${count}: ${pureTitle}` : `Chapter ${count}`;
        } else {
          const numStr = toChineseNumber(count);
          chap.title = pureTitle ? `第${numStr}章：${pureTitle}` : `第${numStr}章`;
        }
      }
    }

    this.save();
    eventBus.emit('project-tree-changed', this.project);
    return count;
  }

  public trashChapter(chapterId: string): void {
    if (!this.project.trashBin) this.project.trashBin = [];
    for (const vol of this.project.volumes) {
      const idx = vol.chapters.findIndex((c) => c.id === chapterId);
      if (idx !== -1) {
        const [chap] = vol.chapters.splice(idx, 1);
        chap.isArchived = true;
        this.project.trashBin.unshift(chap);
        break;
      }
    }
    const isEn = getIsEn();
    if (this.project.volumes.every((v) => v.chapters.length === 0)) {
      const firstVol = this.project.volumes[0] || this.addVolume(isEn ? 'Volume 1' : '第一卷');
      const newChap = this.addChapter(firstVol.id, isEn ? 'Chapter 1' : '第一章');
      this.setActiveChapter(newChap.id);
      return;
    }
    if (this.project.activeChapterId === chapterId) {
      const nextId = this.project.volumes.find((v) => v.chapters.length > 0)?.chapters[0]?.id;
      if (nextId) {
        this.setActiveChapter(nextId);
        return;
      }
    }
    this.save();
    eventBus.emit('project-tree-changed', this.project);
    eventBus.emit('active-chapter-changed', this.project.activeChapterId);
    const activeChap = this.getActiveChapter();
    if (activeChap) {
      eventBus.emit('chapter-selected', activeChap);
    }
  }

  public restoreChapter(chapterId: string, targetVolumeId?: string): boolean {
    if (!this.project.trashBin) return false;
    const idx = this.project.trashBin.findIndex((c) => c.id === chapterId);
    if (idx === -1) return false;

    const [chap] = this.project.trashBin.splice(idx, 1);
    chap.isArchived = false;

    const vol = (targetVolumeId ? this.project.volumes.find((v) => v.id === targetVolumeId) : null) || this.project.volumes[0];
    if (vol) {
      vol.chapters.push(chap);
      this.project.activeChapterId = chap.id;
      this.save();
      eventBus.emit('project-tree-changed', this.project);
      eventBus.emit('active-chapter-changed', chap.id);
      eventBus.emit('chapter-selected', chap);
      return true;
    }
    return false;
  }

  public createSnapshot(chapterId: string, summary?: string): ChapterSnapshot | null {
    const chap = this.findChapter(chapterId);
    if (!chap) return null;

    if (!chap.snapshots) chap.snapshots = [];

    const isEn = getIsEn();
    const finalSummary = (summary && summary.trim()) || (isEn ? 'Manual Snapshot' : '手动快照');

    const snapshot: ChapterSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      title: chap.title,
      content: chap.content,
      wordCount: chap.wordCount,
      summary: finalSummary,
    };

    chap.snapshots.unshift(snapshot);
    // Keep max 25 snapshots per chapter
    if (chap.snapshots.length > 25) {
      chap.snapshots = chap.snapshots.slice(0, 25);
    }

    this.save();
    return snapshot;
  }

  public getSnapshots(chapterId: string): ChapterSnapshot[] {
    const chap = this.findChapter(chapterId);
    return chap?.snapshots || [];
  }

  public restoreSnapshot(chapterId: string, snapshotId: string): boolean {
    const chap = this.findChapter(chapterId);
    if (!chap || !chap.snapshots) return false;

    const snap = chap.snapshots.find((s) => s.id === snapshotId);
    if (!snap) return false;

    // First create a snapshot of current state before restoring
    const isEn = getIsEn();
    this.createSnapshot(chapterId, isEn ? 'Automatic backup before rollback' : '回滚前自动备份');

    chap.content = snap.content;
    chap.wordCount = snap.wordCount;
    chap.updatedAt = Date.now();

    this.save();
    eventBus.emit('chapter-content-updated', {
      id: chap.id,
      chapterId: chap.id,
      content: chap.content,
      wordCount: chap.wordCount,
    });
    return true;
  }

  public getTotalWordCount(): number {
    let total = 0;
    for (const vol of this.project.volumes) {
      for (const chap of vol.chapters) {
        total += chap.wordCount || 0;
      }
    }
    return total;
  }

  public findChapter(id: string): Chapter | null {
    for (const vol of this.project.volumes) {
      for (const chap of vol.chapters) {
        if (chap.id === id) return chap;
      }
    }
    return null;
  }
}

export const projectStore = ProjectStore.getInstance();
if (typeof window !== 'undefined') {
  (window as any)['__novelite_project_store'] = projectStore;
}
