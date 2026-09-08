import type { NovelProject } from './types';

export const SAMPLE_PROJECT: NovelProject = {
  id: 'proj_default_zh',
  title: '新作品',
  author: '作者',
  targetWordCount: 100000,
  scratchpad: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  activeChapterId: 'chap_01',
  volumes: [
    {
      id: 'vol_01',
      title: '第一卷',
      isExpanded: true,
      chapters: [
        {
          id: 'chap_01',
          title: '第一章',
          synopsis: '',
          updatedAt: Date.now(),
          wordCount: 0,
          content: '# 第一章\n\n　　',
        },
      ],
    },
  ],
};

export const SAMPLE_PROJECT_EN: NovelProject = {
  id: 'proj_default_en',
  title: 'Untitled Novel',
  author: 'Author',
  targetWordCount: 100000,
  scratchpad: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  activeChapterId: 'chap_01_en',
  volumes: [
    {
      id: 'vol_01_en',
      title: 'Volume 1',
      isExpanded: true,
      chapters: [
        {
          id: 'chap_01_en',
          title: 'Chapter 1',
          synopsis: '',
          updatedAt: Date.now(),
          wordCount: 0,
          content: '# Chapter 1\n\n',
        },
      ],
    },
  ],
};

export function getSampleProject(isEn: boolean = false): NovelProject {
  const base = isEn ? SAMPLE_PROJECT_EN : SAMPLE_PROJECT;
  return JSON.parse(JSON.stringify(base));
}
