import type { NovelProject, Volume, Chapter } from './types';
import { SAMPLE_PROJECT } from './sampleNovel';
import { eventBus } from '../events/EventBus';

export class ProjectStore {
  private static instance: ProjectStore;
  private project: NovelProject;
  private autoSaveTimer: any = null;

  private constructor() {
    this.project = this.loadProject();
  }

  public static getInstance(): ProjectStore {
    if (!ProjectStore.instance) {
      ProjectStore.instance = new ProjectStore();
    }
    return ProjectStore.instance;
  }

  private loadProject(): NovelProject {
    const saved = localStorage.getItem('novelite_project_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.volumes && parsed.volumes.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to load project from storage:', e);
      }
    }
    return SAMPLE_PROJECT;
  }

  public save(): void {
    this.project.updatedAt = Date.now();
    localStorage.setItem('novelite_project_data', JSON.stringify(this.project));
    eventBus.emit('project-saved', this.project);
  }

  public getProject(): NovelProject {
    return this.project;
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

  public setActiveChapter(id: string): void {
    this.project.activeChapterId = id;
    this.save();
    eventBus.emit('active-chapter-changed', id);
  }

  public updateChapterContent(id: string, content: string): void {
    const chap = this.findChapter(id);
    if (!chap) return;

    chap.content = content;
    const cleanContent = content.replace(/^#+\s+.*$/gm, '').trim();
    const chineseChars = (cleanContent.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (cleanContent.replace(/[\u4e00-\u9fa5]/g, ' ').match(/\b\w+\b/g) || []).length;
    chap.wordCount = chineseChars + englishWords;
    chap.updatedAt = Date.now();

    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.save();
    }, 400);

    eventBus.emit('chapter-content-updated', { id, content, wordCount: chap.wordCount });
  }

  public addVolume(title = '新建分卷'): Volume {
    const newVol: Volume = {
      id: `vol_${Date.now()}`,
      title,
      isExpanded: true,
      chapters: [],
    };
    this.project.volumes.push(newVol);
    this.save();
    eventBus.emit('project-tree-changed', this.project);
    return newVol;
  }

  public addChapter(volumeId: string, title = '新建章节'): Chapter {
    const vol = this.project.volumes.find((v) => v.id === volumeId);
    if (!vol) throw new Error('Volume not found');

    const newChap: Chapter = {
      id: `chap_${Date.now()}`,
      title,
      content: `# ${title}\n\n`,
      wordCount: 0,
      updatedAt: Date.now(),
    };
    vol.chapters.push(newChap);
    vol.isExpanded = true;
    this.project.activeChapterId = newChap.id;
    this.save();
    eventBus.emit('project-tree-changed', this.project);
    eventBus.emit('active-chapter-changed', newChap.id);
    return newChap;
  }

  public renameVolume(volumeId: string, newTitle: string): void {
    const vol = this.project.volumes.find((v) => v.id === volumeId);
    if (vol) {
      vol.title = newTitle;
      this.save();
      eventBus.emit('project-tree-changed', this.project);
    }
  }

  public renameChapter(chapterId: string, newTitle: string): void {
    const chap = this.findChapter(chapterId);
    if (chap) {
      chap.title = newTitle;
      this.save();
      eventBus.emit('project-tree-changed', this.project);
    }
  }

  public deleteVolume(volumeId: string): void {
    this.project.volumes = this.project.volumes.filter((v) => v.id !== volumeId);
    if (!this.getActiveChapter()) {
      this.project.activeChapterId = this.project.volumes[0]?.chapters[0]?.id || null;
    }
    this.save();
    eventBus.emit('project-tree-changed', this.project);
    eventBus.emit('active-chapter-changed', this.project.activeChapterId);
  }

  public deleteChapter(chapterId: string): void {
    for (const vol of this.project.volumes) {
      vol.chapters = vol.chapters.filter((c) => c.id !== chapterId);
    }
    if (this.project.activeChapterId === chapterId) {
      this.project.activeChapterId = this.project.volumes[0]?.chapters[0]?.id || null;
    }
    this.save();
    eventBus.emit('project-tree-changed', this.project);
    eventBus.emit('active-chapter-changed', this.project.activeChapterId);
  }

  public updateScratchpad(text: string): void {
    this.project.scratchpad = text;
    this.save();
    eventBus.emit('scratchpad-updated', text);
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
