#!/usr/bin/env bash
# macOS desktop installation through Homebrew.
set -euo pipefail
if [[ "$(uname -s):$(uname -m)" != 'Darwin:arm64' ]]; then
  echo 'This installer requires an Apple Silicon Mac.' >&2
  exit 1
fi
if ! command -v brew >/dev/null 2>&1; then
  echo 'Install Homebrew from https://brew.sh, or download the DMG from https://github.com/hirovel/novelite/releases/latest' >&2
  exit 1
fi
brew tap hirovel/novelite https://github.com/hirovel/novelite.git
brew install --cask hirovel/novelite/novelite
