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
            case "$(uname -m)" in
                arm64) MAC_ARCH="aarch64" ;;
                x86_64) MAC_ARCH="x64" ;;
                *) echo "不支持此 Mac 架构，请从 GitHub Releases 手动下载。"; exit 1 ;;
            esac
            DMG_URL=$(echo "${RELEASE_JSON}" | grep -io "https://[^\"]*novelite[^\"]*_${MAC_ARCH}\.dmg" | head -n 1 || true)
            if [ -n "${DMG_URL}" ]; then
                echo -e "\033[32m -> 发现 macOS 原生桌面安装包，正在下载...\033[0m"
                mkdir -p "${HOME}/Downloads"
                TMP_DMG="${HOME}/Downloads/novelite-latest-${MAC_ARCH}.dmg"
                curl -fSL "${DMG_URL}" -o "${TMP_DMG}"
                open "${TMP_DMG}"
                echo '请将 Novelite 拖入“应用程序”。本版本未公证，首次打开如被拦截，请在“隐私与安全性”中选择“仍要打开”。'
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
