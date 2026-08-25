# 🖋️ Novelite (小说工坊)

> **极简终端美学、Neovide 级物理弹簧光标、专为长篇小说优化的微内核开源写作工作室**

![Novelite Banner](https://img.shields.io/badge/Novelite-v1.0.0-38bdf8?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Framework](https://img.shields.io/badge/Tauri-2.0-blue?style=flat-square)
![Core](https://img.shields.io/badge/CodeMirror-6-purple?style=flat-square)

---

## ✨ 核心特性

- 🌊 **Neovide 级 120fps 物理弹簧光标**：
  - 基于胡克定律弹簧物理插值，告别一格格瞬间瞬移的生硬打字感。
  - 支持运动形变拉伸（Squish & Stretch）与到达落点轻微果冻回弹。
  - 内置 4 套视觉预设：**流体水滴 (Fluid)**、**星尘微粒 (Pixie Dust)**、**极速残影 (Railgun)**、**呼吸律动 (Breathing)**。
  - 支持在设置中自由调节刚度（Stiffness）、阻尼（Damping）、质量（Mass）与光标粗细。
- 📖 **小说专精排版与纯净 Markdown**：
  - **智能首行 2 字符缩进**：纯 CSS 渲染中文小说段落缩进，不向 Markdown 文件插入全角空格，源码保持 100% 干净。
  - **平滑打字机居中模式 (Typewriter Mode)**：光标行平滑锁定在垂直黄金视口中央。
  - **实时码字测速与字数监控**：单章字数、全书进度、实时码字速率（WPM）与阅读预计时间。
- 🗂️ **本地优先与多卷章节管理 (Local-First)**：
  - 卷/章/节树状结构，自由增删改、双击重命名与拖拽。
  - 便签备忘录（设定集/人物卡）随时随地查阅。
  - 一键导出全本为标准排版 TXT 或完整 Markdown 书稿。
- ⌨️ **终端极简美学与键盘优先**：
  - `Ctrl+P` / `Ctrl+K` 快速模糊搜章与命令调度台。
  - `Ctrl+B` 极速折叠/呼出侧边栏，`F11` / `Alt+Z` 一键纯净全屏 Zen 禅模式。
  - 预设精选暗黑与纸墨主题（Cyber Noir, Obsidian Slate, Matrix Terminal, Nord Frost, Paper & Ink）。
- 🧩 **微内核插件系统 (Plugin SDK)**：
  - 所有核心功能均作为标准插件运行。
  - 开放标准插件 SDK，包含 `sampleUserPlugin.ts` 模板，5 分钟即可扩展您自己的专属命令或工具。

---

## 🚀 快速上手与运行

### 1. 启动 Web 极速开发服务
```bash
npm run dev
```
打开浏览器访问 `http://localhost:5173` 即可立即体验完整功能与丝滑光标。

### 2. 启动 Tauri 桌面原生应用开发
```bash
npm run tauri:dev
```

### 3. 构建全平台独立桌面安装包
```bash
npm run tauri:build
```

---

## ⌨️ 常用快捷键速查

| 快捷键 | 功能描述 |
| :--- | :--- |
| `Ctrl+P` / `Ctrl+K` | 唤出**快速命令与章节搜索面板** |
| `Ctrl+B` | 折叠 / 展开左侧小说目录面板 |
| `Ctrl+,` | 打开**偏好设置与光标调校中心** |
| `Alt+T` | 开启 / 关闭**打字机居中模式** |
| `Alt+I` | 切换**中文首行 2 字符缩进** |
| `Alt+C` | 轮换**光标物理特效预设**（流体/星尘/残影/呼吸） |
| `Ctrl+Shift+E` | 一键将全书导出为规范排版 TXT 文本 |
| `F11` / `Alt+Z` | 切换 **Zen 纯净全屏禅模式** |
| `Ctrl+S` | 立即保存章节 |
| `Ctrl+=` / `Ctrl+-` | 增大 / 减小编辑器字号 |

---

## 🧩 如何开发自定义插件？

进入 `src/plugins/custom-template/sampleUserPlugin.ts`：

```typescript
import type { NovelitePlugin, PluginContext } from '../../core/plugins/types';

export const MyCustomPlugin: NovelitePlugin = {
  metadata: {
    id: 'my-custom-plugin',
    name: '我的小说辅助插件',
    version: '1.0.0',
    description: '快速统计常用词与生成对话',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    // 注册快捷键与命令
    ctx.registerCommand({
      id: 'my.insert-dialog',
      title: '快速插入主角对白模板',
      shortcut: 'Alt+D',
      run: (c) => {
        c.insertText('“……”');
        c.showToast('已插入对白', 'info');
      },
    });
  },
};
```
在 `src/App.tsx` 中执行 `pluginManager.registerPlugin(MyCustomPlugin)` 即可生效！

---

## 📄 开源许可
MIT License - 100% 本地优先，数据自由掌控。
