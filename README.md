<div align="center">

<img src="./public/favicon.svg" alt="Novelite" width="72" height="72" />

# Novelite

**轻量内核 · 极简外观 · 插件化架构的现代小说文本编辑器**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg?style=flat-square)](./LICENSE)
[![Release](https://img.shields.io/github/v/release/hirovel/novelite?style=flat-square)](https://github.com/hirovel/novelite/releases)

[简体中文](./README.md) · [English](./README_EN.md)

<br />

<img src="./docs/hero-banner.png" alt="Novelite Interface" width="100%" />

</div>

---

为了自己写小说的体验，制作了 Novelite，希望简洁的外观和丝滑的光标能带来愉悦的编辑体验。

根据**内核最简**的原则设计，核心保持轻量，扩展功能均由插件解耦实现。

### 目前已经实现的功能

<img src="./docs/showcase-bento.png" alt="Novelite 功能展示" width="100%" />

<br />

- **流体光标**
  
  <img src="./docs/feature-live-cursor.gif" alt="流体光标" width="100%" />

- **聚焦模式**：高亮编辑段落，暗淡其他
- **微光背景**
- **分屏对照**
- **快捷搜索词汇**
- **章节管理**
- **快捷键设置，命令中心**

---

### 安装和运行

#### Windows 桌面客户端

前往 [Releases](https://github.com/hirovel/novelite/releases/latest) 下载 `*-setup.exe` 或 `.msi` 安装包。

#### macOS 桌面客户端

Mac 安装包仅支持 **Apple Silicon（M 系列）**，请选择 `*_aarch64.dmg`。**暂不提供 Intel Mac 安装包。**
需要 macOS 11 及以上和 Safari/WebKit 16.4+（旧系统请先安装 Safari 更新）。
从 [Releases](https://github.com/hirovel/novelite/releases/latest) 下载后打开 DMG，将 Novelite 拖入「应用程序」。

当前版本为 ad-hoc 签名，未经 Apple 公证。首次启动如被拦截，在「系统设置 → 隐私与安全性」选择「仍要打开」。参见 [Apple 打开未经公证 App 的说明](https://support.apple.com/102445)。

支持原生文件夹读写和保存对话框。快捷键使用 `⌘`，重做为 `⌘⇧Z`，替换为 `⌘⌥F`。
重启后需重新选择本地文件夹来恢复磁盘连接；已编辑的手稿仍保留在应用内。

#### Linux 桌面客户端

在 [Releases](https://github.com/hirovel/novelite/releases/latest) 下载 `.deb` 或 `.AppImage`。

#### 从源码运行

```bash
git clone https://github.com/hirovel/novelite.git
cd novelite
npm ci
npm run dev
```

需要 Node.js 22.12+（CI 使用 Node.js 24）。开发桌面版还需 Rust 和 [Tauri 系统依赖](https://v2.tauri.app/start/prerequisites/)，然后运行 `npm run tauri:dev`。

开发验证与发布步骤见 [发布指南](./docs/RELEASING.md)。

---

### 协议与版权

GNU General Public License v3.0 (GPL-3.0)
