<div align="center">

<img src="./public/favicon.svg" alt="Novelite Logo" width="100" height="100" />

# Novelite (小说工坊)

**专为长篇中文小说创作者打造的极简、极速、零阻碍开源写作工作室**

*CodeMirror 6 深度定制 · 120FPS 物理流体光标 · Obsidian 级纯净本地文件架构 · 沉浸式中文排版引擎*

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg?style=flat-square&logo=tauri)](https://tauri.app/)
[![CodeMirror 6](https://img.shields.io/badge/Editor-CodeMirror%206-purple.svg?style=flat-square)](https://codemirror.net/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Web-orange.svg?style=flat-square)](#-一行极速安装与启动-one-line-run)

[功能特性](#-核心设计理念与功能特性) • [文件存储架构](#-obsidian-级本地文件存储哲学) • [极速安装](#-一行极速安装与启动-one-line-run) • [快捷键速查](#%EF%B8%8F-快捷键速查表) • [插件系统](#-微内核插件扩展系统)

</div>

---

## 📖 什么是 Novelite？

市面上的写作软件要么过于臃肿（复杂繁重的排版菜单打断写作心流），要么缺乏对中文小说创作的专精支持（缺乏对话高亮、卷章大纲层级与打字机平滑手感）。

**Novelite** 摒弃一切非必要的视觉杂质与多余统计浮窗，追求极致的**纯粹、优雅与掌控感**：
- **指尖手感**：深度集成 CodeMirror 6 原生坐标系，自研液体流体力学双核光标，毫秒级响应。
- **排版专精**：专为中文标点避头尾（禁则处理）、双空格缩进、台词引号智能着色定制。
- **数据自由**：坚持像 **Obsidian** 一样透明，纯文本文件直读直存，作者点击删除即从磁盘彻底抹去，绝无私有格式绑架与残留文件。

---

## ✨ 核心设计理念与功能特性

### 1. 🌊 CodeMirror 6 物理流体双核光标 (Live Cursor)
- **GPU 合成器级对齐**：物理光标 Canvas 原生挂载于编辑器视口，无论万字长文如何高速惯性滚动，光标始终严丝合缝跟随文字，绝无掉帧或错位脱节。
- **双引擎动力学**：内置微积分平滑插值算法，提供光柱 (Beam)、色块 (Block) 与下划线 (Underline) 三种物理形态。
- **粒子流与微动效**：支持速度响应式拖尾、水波微光辉光与呼吸微循环，带来机械键盘级的指尖回馈。

### 2. 📁 Obsidian 级本地文件存储哲学 (Local-First)
- **100% 数据归作者所有**：全书直接映射为操作系统本地标准文件夹，每一卷为一个子目录，每一章为一个独立的 `.txt` / `.md` 文本文件。
- **透明无残留删除**：当您在卷章树中删除章节或分卷时，Novelite 直接调用文件系统接口执行物理清理，磁盘绝无游离孤儿文件。
- **外部协同与热重载**：支持使用 VS Code、Typora、Obsidian 或 Git/网盘同步目录。当检测到外部修改时，编辑器自动无感热重载最新字句，写作绝不冲突中断。
- **开箱即用离线备份**：支持纯浏览器离线模式（LocalStorage / 缓存）与本地硬盘直连模式一键切换。

### 3. 🎨 沉浸式小说专精排版引擎 (Typography & Immersion)
- **智能台词对白高亮**：自动识别中文对话引号（`“……”`、`『……』`），对白自动赋予优雅温润的高亮配色，旁白与人物交锋层次分明。
- **中文标点禁则处理 (Kinsoku Shori)**：彻底杜绝标点符号（如逗号、句号、叹号、右引号）出现在行首的断行硬伤，严格遵循汉字出版级规整排版。
- **智能段首缩进**：自动为每一段开头提供中文标准 2 字符全角缩进，导出时可自由选择保留或转为纯净顶格。
- **打字机定高模式 (Typewriter Mode)**：光标所在行自动保持在垂直视口黄金三分之一高度，长篇写作头部永远无需下倾。
- **聚光灯专注模式 (Spotlight Focus)**：当前书写段落明亮清晰，非活动上下文柔和淡化，彻底排除视觉杂念。

### 4. 💎 极简微胶囊 HUD 与状态指示
- **灵动保存微珠**：微型状态灯自适应主题主色调，输入落盘时呈现柔和琥珀光晕呼吸，落盘完成后呈现静谧宝石光芒，安全状态一目了然。
- **零干扰 ZeroChrome 界面**：打字时自动淡化避让侧栏与状态栏，全屏沉浸在纯白或深邃暗夜的文字世界中。

---

## ⚡ 一行极速安装与启动 (One-Line Run)

Novelite 提供开箱即用的一行启动与原生客户端一键安装：

### 方式 1：NPX 免安装一行即开（跨平台通用，推荐）
只要您的电脑已安装 Node.js（v18+），在任意终端（PowerShell / Bash / Zsh）中运行：
```bash
npx novelite
```
> 自动启动本地轻量服务并为您调起默认浏览器，创作手稿实时安全落盘。

### 方式 2：Windows 一键安装桌面客户端
在 Windows **PowerShell** 中粘贴运行：
```powershell
irm https://raw.githubusercontent.com/hirovel/novelite/main/install.ps1 | iex
```
> 自动完成环境配置并在桌面生成 **【Novelite 小说工坊】** 专属图标。

### 方式 3：macOS / Linux 一行安装
在终端（Terminal）中粘贴运行：
```bash
curl -fsSL https://raw.githubusercontent.com/hirovel/novelite/main/install.sh | bash
```

> 💡 **平台说明**：Windows 为主力深度调优平台；macOS (.dmg) 与 Linux (.AppImage) 由 GitHub Actions 自动化矩阵流水线编译生成。

---

## ⌨️ 快捷键速查表

| 快捷键 | 功能描述 |
| :--- | :--- |
| **`Ctrl + P`** / **`⌘ K`** | 唤出 **命令面板与全书章节速搜** |
| **`Ctrl + Shift + F`** | 唤出 **全书正文毫秒级全文检索** |
| **`Ctrl + F`** | 打开 **章节内即时查找 HUD** |
| **`Ctrl + H`** | 打开 **章节查找与批量替换 HUD** |
| **`Ctrl + J`** | 打开 **大纲手稿台** |
| **`Ctrl + Shift + M`** | 唤出 **灵感备忘录** |
| **`Ctrl + Shift + B`** | 展开 **作品书架**（多书库管理） |
| **`Ctrl + Shift + I`** | 导入 **外部 TXT 长篇小说**（智能分卷分章解析） |
| **`Ctrl + Shift + E`** | 导出为 **标准排版 TXT 全书** |
| **`Alt + S`** | 开启 / 关闭 **对照分屏**（双章对照、前文参考） |
| **`Alt + X`** | 交换 **分屏左右/上下章节** |
| **`Alt + F`** | 开启 / 关闭 **段落专注聚光灯** |
| **`Ctrl + Shift + H`** | 开启 / 关闭 **智能台词对白高亮** |
| **`Ctrl + ]` / `Ctrl + [`** | 快速切换至 **下一章 / 上一章** |
| **`Ctrl + Shift + L`** | 一键中文规整排版（段首缩进两字符 / 清理连续空行） |
| **`Ctrl + B`** | 展开 / 收起 **大纲目录侧栏** |
| **`F11`** | 进入 / 退出 **极简全屏禅模式 (Zen Mode)** |
| **`Ctrl + ,`** | 打开 **偏好设置中心** |
| **`Ctrl + /`** | 打开 **快捷键完全指南与自定义** |

---

## 🧩 微内核插件扩展系统

Novelite 采用高内聚、弱耦合的微内核架构。您可以通过简单的几行代码编写属于您自己的小说插件：

```typescript
import type { NovelitePlugin, PluginContext } from './core/plugins/types';

export const CharacterSheetPlugin: NovelitePlugin = {
  metadata: {
    id: 'plugin-character-sheet',
    name: '角色卡快速生成器',
    version: '1.0.0',
    description: '快速为章节插入人物背景与功法设定模板',
    defaultEnabled: true,
  },
  init: (ctx: PluginContext) => {
    ctx.registerCommand({
      id: 'insert.character-template',
      title: '插入角色设定卡',
      shortcut: 'Alt+Shift+C',
      run: (c) => {
        c.insertText('\n> 【登场人物档案】\n> - 姓名：\n> - 身份/门派：\n> - 功法绝学：\n\n');
        c.showToast('已成功插入角色档案', 'info');
      },
    });
  },
};
```

---

## 🛠️ 本地开发与源码构建

```bash
# 1. 克隆代码仓库
git clone https://github.com/hirovel/novelite.git
cd novelite

# 2. 安装项目依赖
npm install

# 3. 启动前端 Vite 热重载服务
npm run dev

# 4. 运行 Tauri 桌面端开发环境
npm run tauri:dev

# 5. 构建全平台原生安装包 (Windows / macOS / Linux)
npm run tauri:build
```

---

## 📄 开源协议

本项目采用 [MIT 许可证](LICENSE)。手稿 100% 存储于本地，无强制联网要求，无数据追踪，保护您的创作隐私与版权自由。
