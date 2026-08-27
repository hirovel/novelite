# 🖋️ Novelite (小说工坊)

> **极简终端美学、CodeMirror 6 原生内联物理光标、专为长篇小说创作打造的微内核开源写作工作室**

![Novelite Banner](https://img.shields.io/badge/Novelite-v2.0.0-38bdf8?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Framework](https://img.shields.io/badge/Tauri-2.0-blue?style=flat-square)
![Core](https://img.shields.io/badge/CodeMirror-6-purple?style=flat-square)

---

## ✨ 核心特性

- 🌊 **CodeMirror 6 原生内联 120fps 物理流体光标**：
  - **文档世界坐标系 (Document World Space)**：Canvas 原生内嵌于编辑器滚动容器内部，滚动由 GPU 合成器硬件级同步，彻底消除帧间抖动与坐标换算误差。
  - **各向同性对称动力学**：上下左右 100% 严格物理对称，支持连续时间微积分指数衰减插值。
  - **Neovide 级凸包果冻拉伸 (Convex Hull Deformation)**：支持运动动态形变、星尘微粒 (Embers)、砚池水纹 (Ripples)、羽落轻芒与柔和呼吸脉冲。
  - **恒定视口显存上限**：采用 GPU 矩阵变换 `translate3d`，百万字长篇显存占用恒定 <5MB。
- 📖 **小说专精排版与出版级版心控制**：
  - **智能首行 2 字符缩进**：纯 CSS 渲染中文段落缩进，不向 Markdown 文件插入全角空格，源码保持 100% 纯净。
  - **小说台词对话智能微光 (`DialogueHighlighterPlugin`)**：自动识别中文“……”引号台词并赋予主题微光色，旁白与台词一目了然。
  - **段落专注模式 (`FocusModePlugin`)**：高亮当前光标所在段落，平滑弱化非活动段落（iA Writer 风格）。
  - **平滑打字机居中模式 (`TypewriterPlugin`)**：保持当前行平滑锁定在垂直黄金视口中央（40%）。
  - **字体预设**：内置霞鹜文楷、思源宋体、现代黑体、等宽字体与本地自定义字体支持。
- 🏝️ **先锋悬浮美学与 Dynamic Island HUD**：
  - **微型动态岛 (Dynamic Island Micro-HUD)**：悬浮胶囊实时显示字数、阅读时长、当前章节状态与一键调度坞，打字时自动淡出隐退。
  - **居中双栏偏好设置模态框**：Linear / Raycast 风格 2 栏式设计，内置实时光标手感交互靶场。
  - **悬浮查找与替换 HUD (`Ctrl+F`)**：轻量微光胶囊，支持实时匹配计数、大小写与正则替换。
- 🗂️ **本地优先与分卷大纲树 (Local-First)**：
  - 卷/章/节树状结构，自由增删改、双击重命名与拖拽。
  - 灵感便签卡片随时随地捕捉伏笔、人物设定与场景描写，一键插入正文光标处。
  - 一键导出全本为规范排版 TXT、完整 Markdown 书稿或分卷章节。
- 🧩 **微内核解耦插件系统 (Plugin SDK)**：
  - 所有核心功能均作为解耦插件运行，支持热重载与独立启停。
  - 开放标准插件 SDK，包含 `sampleUserPlugin.ts` 模板，轻松扩展专属命令或写作工具。

---

## 🚀 快速上手

### 1. 启动 Web 开发服务
```bash
npm run dev
```
打开浏览器访问 `http://localhost:5174` 即可体验完整功能与丝滑物理光标。

### 2. 启动 Tauri 桌面原生应用
```bash
npm run tauri:dev
```

### 3. 构建全平台桌面安装包
```bash
npm run tauri:build
```

---

## ⌨️ 常用快捷键速查

| 快捷键 | 功能描述 |
| :--- | :--- |
| **`Ctrl + P` / `Ctrl + K`** | 唤出 **快速命令与章节搜索面板** |
| **`Ctrl + F`** | 呼出 **右上角查找与替换 HUD** |
| **`Ctrl + ,`** | 打开 **偏好设置与光标调校中心** |
| **`Alt + D`** | 开启 / 关闭 **小说台词对话微光** |
| **`Alt + F`** | 开启 / 关闭 **段落专注模式** |
| **`Alt + T`** | 开启 / 关闭 **打字机居中模式** |
| **`Alt + I`** | 切换 **中文首行 2 字符缩进** |
| **`Alt + C`** | 轮换 **光标物理动效预设**（纯粹/星火/水纹/羽落） |
| **`Ctrl + Shift + E`** | 一键将全书导出为规范排版 TXT 文本 |
| **`Ctrl + B`** | 折叠 / 展开左侧小说目录面板 |
| **`F11` / `Alt + Z`** | 切换 **Zen 纯净全屏禅模式** |
| **`Ctrl + S`** | 立即保存当前书稿 |
| **`Ctrl + =` / `Ctrl + -`** | 增大 / 减小编辑器字号 |

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
    description: '快速插入设定模板与字词分析',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    // 注册快捷键与命令
    ctx.registerCommand({
      id: 'my.insert-template',
      title: '插入角色设定模板',
      shortcut: 'Alt+Shift+C',
      run: (c) => {
        c.insertText('\n### 【角色卡】\n- 姓名：\n- 境界：\n- 功法：\n');
        c.showToast('已插入角色模板', 'info');
      },
    });
  },
};
```

在 `src/App.tsx` 中注册即可生效：
```typescript
pluginManager.registerPlugin(MyCustomPlugin);
```

---

## 📄 开源许可
MIT License - 100% 本地优先，数据自由掌控。
