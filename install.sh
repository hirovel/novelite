#!/usr/bin/env bash
# ==============================================================================
# 🖋️ Novelite (小说工坊) - macOS / Linux 一行极速安装脚本
# 使用方式: 在终端中执行:
#   curl -fsSL https://raw.githubusercontent.com/hirovel/novelite/main/install.sh | bash
# ==============================================================================

set -e

echo -e "\033[36m
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🖋️  Novelite - 轻量、插件化的小说文本编辑器                │
│   🚀  macOS / Linux 一键安装程序                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
\033[0m"

OS="$(uname -s)"
BIN_DIR="${HOME}/.local/bin"
mkdir -p "${BIN_DIR}"

API_URL="https://api.github.com/repos/hirovel/novelite/releases/latest"

echo -e "\033[33m[1/2] 检测最新发布版本...\033[0m"

INSTALLED=0

if command -v curl >/dev/null 2>&1; then
    RELEASE_JSON=$(curl -sSL -H "User-Agent: Novelite-Installer" "${API_URL}" || true)
    if [ -n "${RELEASE_JSON}" ]; then
        if [ "${OS}" = "Darwin" ]; then
            DMG_URL=$(echo "${RELEASE_JSON}" | grep -io 'https://[^"]*novelite[^"]*\.dmg' | head -n 1 || true)
            if [ -n "${DMG_URL}" ]; then
                echo -e "\033[32m -> 发现 macOS 原生桌面安装包，正在下载...\033[0m"
                TMP_DMG="/tmp/Novelite.dmg"
                curl -sSL "${DMG_URL}" -o "${TMP_DMG}"
                echo -e "\033[32m -> 正在挂载并安装到 /Applications...\033[0m"
                hdiutil attach "${TMP_DMG}" -nobrowse -quiet || true
                cp -R /Volumes/*[nN]ovelite*/*.app /Applications/ 2>/dev/null || true
                hdiutil detach /Volumes/*[nN]ovelite* -quiet 2>/dev/null || true
                rm -f "${TMP_DMG}"
                # 移除隔离属性，防止 macOS Gatekeeper 拦截未公证应用
                xattr -cr /Applications/novelite.app 2>/dev/null || xattr -cr /Applications/Novelite.app 2>/dev/null || true
                INSTALLED=1
                echo -e "\033[32m🎉 Novelite 已成功安装到“应用程序”！\033[0m"
                open /Applications/novelite.app 2>/dev/null || open /Applications/Novelite.app 2>/dev/null || true
                exit 0
            fi
        elif [ "${OS}" = "Linux" ]; then
            APPIMAGE_URL=$(echo "${RELEASE_JSON}" | grep -io 'https://[^"]*novelite[^"]*\.AppImage' | head -n 1 || true)
            if [ -n "${APPIMAGE_URL}" ]; then
                echo -e "\033[32m -> 发现 Linux AppImage，正在下载...\033[0m"
                TARGET_APPIMAGE="${BIN_DIR}/novelite"
                curl -sSL "${APPIMAGE_URL}" -o "${TARGET_APPIMAGE}"
                chmod +x "${TARGET_APPIMAGE}"
                INSTALLED=1
                echo -e "\033[32m🎉 Novelite 已安装至 ${TARGET_APPIMAGE}！\033[0m"
                "${TARGET_APPIMAGE}" &
                exit 0
            fi
        fi
    fi
fi

# Fallback: Node.js / NPX Launcher Script
echo -e "\033[33m[2/2] 生成本地轻量启动器 (${BIN_DIR}/novelite)...\033[0m"

cat << 'EOF' > "${BIN_DIR}/novelite"
#!/usr/bin/env bash
if command -v npx >/dev/null 2>&1; then
    exec npx --yes novelite "$@"
else
    echo "❌ 请先安装 Node.js (https://nodejs.org) 以启动 Novelite。"
    exit 1
fi
EOF

chmod +x "${BIN_DIR}/novelite"

# Check PATH
if [[ ":$PATH:" != *":${BIN_DIR}:"* ]]; then
    export PATH="${BIN_DIR}:${PATH}"
fi

echo -e "\033[32m
🎉 安装就绪！
可以直接在终端输入 \033[1mnovelite\033[0m 或 \033[1mnpx novelite\033[0m 随时启动写作工坊！
正在为您启动 Novelite...
\033[0m"

"${BIN_DIR}/novelite" &
