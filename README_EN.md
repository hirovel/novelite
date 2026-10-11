<div align="center">

<img src="./public/favicon.svg" alt="Novelite" width="72" height="72" />

# Novelite

**A minimal desktop novel editor with lightweight core, clean aesthetics, and plugin-driven architecture.**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg?style=flat-square)](./LICENSE)
[![Release](https://img.shields.io/github/v/release/hirovel/novelite?style=flat-square)](https://github.com/hirovel/novelite/releases)

[简体中文](./README.md) · [English](./README_EN.md)

<br />

<img src="./docs/hero-banner.png" alt="Novelite Interface" width="100%" />

</div>

---

Crafted to enhance personal novel writing, Novelite pairs a clean visual aesthetic with a buttery-smooth cursor for an enjoyable writing experience.

Designed with a **minimal core** principle, the foundation remains lightweight while extended features are decoupled via plugins.

### Currently Implemented Features

<img src="./docs/showcase-bento-en.png" alt="Novelite Features" width="100%" />

<br />

- **Fluid Cursor**
  
  <img src="./docs/feature-live-cursor.gif" alt="Fluid Cursor Demo" width="100%" />

- **Focus Mode**: Highlights active paragraph, dims others
- **Ambient Background**
- **Split View Reference**
- **Quick Vocabulary Search**
- **Chapter Management**
- **Keymap Settings & Command Center**

---

### Installation & Run

Standalone desktop apps are available for **Windows x64** and **Apple Silicon Macs (M-series)**. Open Novelite from the Start menu or Applications after installation. Node.js is not required.

#### Windows: one-line installation

Run in PowerShell (an administrator terminal is not needed):

```powershell
irm https://raw.githubusercontent.com/hirovel/novelite/main/install.ps1 | iex
```

The script downloads the latest installer, verifies SHA-256 and installs silently. Errors stop installation. Open Novelite from the Start menu. Run the same command again to update.
Alternatively download `*-setup.exe` or `.msi` from [Releases](https://github.com/hirovel/novelite/releases/latest). Requires Windows 10/11 x64; the installer installs Microsoft Edge WebView2 if needed.

#### Mac: Homebrew installation

With [Homebrew](https://brew.sh) installed, run:

```bash
brew tap hirovel/novelite https://github.com/hirovel/novelite.git && brew install --cask hirovel/novelite/novelite
```

Open Novelite from Applications. Update or uninstall with:

```bash
brew update && brew upgrade --cask --greedy hirovel/novelite/novelite
brew uninstall --cask hirovel/novelite/novelite
```

Uninstallation preserves manuscripts and settings. Homebrew verifies the download checksum; the tap updates automatically after each release.
Alternatively download the [DMG](https://github.com/hirovel/novelite/releases/latest) and drag Novelite into Applications. The app requires macOS 11+ with Safari/WebKit 16.4+; see Homebrew's website for its own system requirements.

The Mac app is ad-hoc signed and **not notarized by Apple**. If first launch is blocked, use **System Settings → Privacy & Security → Open Anyway**. See [Apple's guidance](https://support.apple.com/102445).

Native folder access and save dialogs are supported. Mac shortcuts use `⌘`; redo is `⌘⇧Z` and replace is `⌘⌥F`. After relaunch, reselect the local folder to restore disk sync. Your local manuscript copy remains in the app.

#### Develop the desktop app

Requires Node.js 22.12+ (CI uses 24), Rust and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
git clone https://github.com/hirovel/novelite.git
cd novelite
npm ci
npm run dev
```

`npm run dev` opens the desktop window. `npm run tauri:build` builds installers for the current platform. npm is used only for development tooling; no npm launcher is published.
See the [release guide](./docs/RELEASING.md) for publishing.

---

### License & Copyright

GNU General Public License v3.0 (GPL-3.0)

### Automatic updates

Starting with v1.0.3, Novelite checks at startup and every four hours. Use **Check for Updates** in the command palette for a manual check. **Install and restart** downloads and verifies the signed package, saves manuscripts, and installs the update. Failed verification or saving blocks installation. Manuscripts and settings are preserved; reselect local folders after restart to restore disk synchronization.

Users of v1.0.2 or earlier need to upgrade once using the installer or installation command. Homebrew users can also run `brew update && brew upgrade --cask --greedy hirovel/novelite/novelite`.
