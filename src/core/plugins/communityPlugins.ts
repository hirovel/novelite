import { RangeSetBuilder } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate, Decoration, type DecorationSet } from '@codemirror/view';
import type { NovelitePlugin, PluginContext } from './types';

/**
 * Common Chinese typos and homophones to highlight.
 */
const COMMON_TYPOS: Array<{ typo: string; correct: string; tip: string }> = [
  { typo: '再接再励', correct: '再接再厉', tip: '应为“再接再厉”（厉通砺，磨砺）' },
  { typo: '迫不急待', correct: '迫不及待', tip: '应为“迫不及待”（及：来得及）' },
  { typo: '按步就班', correct: '按部就班', tip: '应为“按部就班”（部：门类；班：次序）' },
  { typo: '变本加利', correct: '变本加厉', tip: '应为“变本加厉”' },
  { typo: '针贬时弊', correct: '针砭时弊', tip: '应为“针砭时弊”（砭：古代石针）' },
  { typo: '穿流不息', correct: '川流不息', tip: '应为“川流不息”（川：河流）' },
  { typo: '走头无路', correct: '走投无路', tip: '应为“走投无路”（投：投奔）' },
  { typo: '座落', correct: '坐落', tip: '应为“坐落”' },
];

const typoDeco = Decoration.mark({
  class: 'cm-typo-highlight',
  attributes: {
    style: 'text-decoration: underline wavy #f43f5e; text-underline-offset: 3px; background-color: rgba(244, 63, 94, 0.08);',
    title: '错别字提示',
  },
});

const typoViewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecos(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecos(update.view);
      }
    }

    buildDecos(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        for (const item of COMMON_TYPOS) {
          let idx = 0;
          while ((idx = text.indexOf(item.typo, idx)) !== -1) {
            const start = from + idx;
            const end = start + item.typo.length;
            builder.add(start, end, typoDeco);
            idx += item.typo.length;
          }
        }
      }
      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// 1. Reading Time Estimator
export const ReadingTimePlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-reading-time',
    name: '阅读时长与语速预估',
    version: '1.0.0',
    description: '按每分钟 350 字标准朗读速度实时计算章节预计阅读耗时。',
    author: 'hirovel',
    icon: 'Clock',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'reading-time.estimate',
      title: '计算章节阅读与朗读耗时',
      category: '写作统计',
      shortcut: 'Alt+R',
      run: (c) => {
        const text = c.getEditorContent();
        const chars = text.replace(/[\s\r\n]/g, '').length;
        const silentMinutes = Math.max(1, Math.round(chars / 450));
        const spokenMinutes = Math.max(1, Math.round(chars / 280));
        c.showToast(`📊 全章 ${chars} 字 · 默读约 ${silentMinutes} 分钟 · 有声朗读约 ${spokenMinutes} 分钟`, 'info');
      },
    });
  },
};

// 2. Typo Corrector
export const TypoCorrectorPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-typo-corrector',
    name: '常见错别字实时检查',
    version: '1.1.0',
    description: '在编辑器中实时波浪线下划线标注常见混淆错字（如迫不及待、再接再厉等）。',
    author: 'hirovel',
    icon: 'SpellCheck',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'typo.check-all',
      title: '一键扫描全文章节错别字',
      category: '校对工具',
      shortcut: 'Alt+C',
      run: (c) => {
        const text = c.getEditorContent();
        const found = COMMON_TYPOS.filter((item) => text.includes(item.typo));
        if (found.length === 0) {
          c.showToast('✅ 全文扫描完毕，未发现常见错别字', 'success');
        } else {
          c.showToast(`⚠️ 发现 ${found.length} 处常见错字：${found.map((f) => f.typo + '→' + f.correct).join('、')}`, 'warning');
        }
      },
    });
  },
  getEditorExtensions: () => {
    return [typoViewPlugin];
  },
};

// 3. Chapter Target Goal
export const ChapterTargetPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-chapter-target',
    name: '单章码字目标打卡',
    version: '1.0.0',
    description: '设定章节目标字数（如 3000 字），实时追踪完成进度并在达成时提醒。',
    author: 'hirovel',
    icon: 'Target',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'chapter-target.check',
      title: '查看当前章节目标完成度',
      category: '写作激励',
      shortcut: 'Alt+G',
      run: (c) => {
        const goal = c.getSetting<number>('targetGoal', 3000);
        const chars = c.getEditorContent().replace(/[\s\r\n]/g, '').length;
        const percent = Math.min(100, Math.round((chars / goal) * 100));
        if (chars >= goal) {
          c.showToast(`🎉 恭喜！当前已完成 ${chars}/${goal} 字（达成率 ${percent}%）！`, 'success');
        } else {
          c.showToast(`🎯 当前进度：${chars}/${goal} 字（还差 ${goal - chars} 字达成目标）`, 'info');
        }
      },
    });
  },
};

export const AVAILABLE_COMMUNITY_PLUGINS: NovelitePlugin[] = [
  ReadingTimePlugin,
  TypoCorrectorPlugin,
  ChapterTargetPlugin,
];
