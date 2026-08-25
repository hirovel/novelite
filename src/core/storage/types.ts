export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  updatedAt: number;
  synopsis?: string; // 简短分镜/小结
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
  scratchpad: string; // 便签备忘录
  createdAt: number;
  updatedAt: number;
}
