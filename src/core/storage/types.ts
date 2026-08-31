/**
 * 🌟 Generic Document Node - Universal Hierarchical Tree Node
 * Supports infinite nesting for volumes, chapters, scenes, acts, and notes.
 */
export interface DocumentNode {
  id: string;
  title: string;
  type: string; // 'volume' | 'chapter' | 'doc' | 'act' | 'scene' | 'note'
  content?: string;
  children?: DocumentNode[];
  isExpanded?: boolean;
  meta?: {
    wordCount?: number;
    status?: string;
    synopsis?: string;
    targetWordCount?: number;
    [key: string]: any;
  };
  updatedAt: number;
}

export interface ChapterSnapshot {
  id: string;
  timestamp: number;
  title: string;
  content: string;
  wordCount: number;
  summary?: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  updatedAt: number;
  synopsis?: string; // 50~100 字本章大纲剧情梗概 / 伏笔备忘
  targetWords?: number; // 目标字数（如 3000）
  isArchived?: boolean;
  snapshots?: ChapterSnapshot[]; // 历史快照版本
}

export interface Volume {
  id: string;
  title: string;
  isExpanded: boolean;
  chapters: Chapter[];
  synopsis?: string;
}

export interface NovelProject {
  id: string;
  title: string;
  author: string;
  targetWordCount: number;
  volumes: Volume[];
  activeChapterId: string | null;
  scratchpad: string;
  trashBin?: Chapter[]; // 废纸篓与历史归档
  createdAt: number;
  updatedAt: number;
}
