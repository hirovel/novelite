# ==============================================================================
# 🖋️ Novelite (小说工坊) - Windows 一行极速安装脚本
# 使用方式: 在 PowerShell 中执行:
#   irm https://raw.githubusercontent.com/hirovel/novelite/main/install.ps1 | iex
# ==============================================================================

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host @"
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🖋️  Novelite - 轻量、插件化的小说文本编辑器                │
│   🚀  Windows 一键安装程序                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
"@ -ForegroundColor Cyan

$InstallDir = "$env:LOCALAPPDATA\Novelite"
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$RepoUrl = "https://github.com/hirovel/novelite.git"
$ApiUrl = "https://api.github.com/repos/hirovel/novelite/releases/latest"

# 1. 尝试从 GitHub Releases 获取最新原生桌面安装包 (.exe / .msi)
$InstalledFromRelease = $false
try {
    Write-Host "[1/3] 正在检测 GitHub Releases 最新桌面版发布..." -ForegroundColor Yellow
    $ReleaseInfo = Invoke-RestMethod -Uri $ApiUrl -Headers @{ "User-Agent" = "Novelite-Installer" } -TimeoutSec 8 -ErrorAction SilentlyContinue
    if ($ReleaseInfo -and $ReleaseInfo.assets) {
        $InstallerAsset = $ReleaseInfo.assets | Where-Object { $_.name -match '\.(msi|exe)$' } | Select-Object -First 1
        if ($InstallerAsset) {
            Write-Host " -> 发现最新桌面安装包: $($InstallerAsset.name)" -ForegroundColor Green
            $TempInstaller = "$env:TEMP\$($InstallerAsset.name)"
            Write-Host " -> 正在极速下载 $($InstallerAsset.name)..." -ForegroundColor Yellow
            Invoke-WebRequest -Uri $InstallerAsset.browser_download_url -OutFile $TempInstaller
            Write-Host " -> 正在安装..." -ForegroundColor Green
            Start-Process -FilePath $TempInstaller -Wait
            Remove-Item $TempInstaller -Force -ErrorAction SilentlyContinue
            $InstalledFromRelease = $true
            Write-Host "`n🎉 Novelite 桌面版已成功安装！" -ForegroundColor Cyan
            exit 0
        }
    }
} catch {
    # GitHub release check skipped or offline
}

# 2. 若暂无预编译安装包，通过 Node.js / NPX 极速创建桌面免安装启动器
Write-Host "[2/3] 准备就绪，配置极速独立运行环境..." -ForegroundColor Yellow

if (-not (Test-Path $InstallDir)) {
    New-Item -Path $InstallDir -ItemType Directory -Force | Out-Null
}

$LauncherBat = "$InstallDir\Novelite.cmd"
@"
@echo off
title Novelite
where npx >nul 2>nul
if %ERRORLEVEL% equ 0 (
    npx --yes novelite
) else (
    echo [错误] 请先安装 Node.js (https://nodejs.org) 以启动轻量写作服务。
    pause
)
"@ | Set-Content -Path $LauncherBat -Encoding ASCII

# 3. 创建桌面快捷方式
Write-Host "[3/3] 创建桌面快捷方式..." -ForegroundColor Yellow
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$DesktopPath\Novelite.lnk")
    $Shortcut.TargetPath = $LauncherBat
    $Shortcut.WorkingDirectory = $InstallDir
    $Shortcut.Description = "Novelite - 轻量、插件化的小说文本编辑器"
    $Shortcut.WindowStyle = 7 # Minimized launch window
    $Shortcut.Save()
    Write-Host " -> 桌面快捷方式已生成: $DesktopPath\Novelite.lnk" -ForegroundColor Green
} catch {
    Write-Host " -> 快捷方式已就绪于: $LauncherBat" -ForegroundColor Gray
}

Write-Host @"

🎉 安装完成！正在启动 Novelite...
提示: 以后可直接双击桌面的【Novelite】图标或在终端输入 npx novelite 启动。

"@ -ForegroundColor Green

Start-Process -FilePath $LauncherBat
