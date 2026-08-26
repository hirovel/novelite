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

export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  updatedAt: number;
  synopsis?: string;
}

export interface Volume {
  id: string;
  title: string;
  isExpanded: boolean;
  chapters: Chapter[];
}

export interface NovelProject {
  id: string;
  title: string;
  author: string;
  targetWordCount: number;
  volumes: Volume[];
  activeChapterId: string | null;
  scratchpad: string;
  createdAt: number;
  updatedAt: number;
}

