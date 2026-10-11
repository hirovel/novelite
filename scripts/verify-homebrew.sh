#!/usr/bin/env bash
set -euo pipefail
dmg=$(find "src-tauri/target/$TARGET/release/bundle/dmg" -name '*.dmg' -print -quit)
test -n "$dmg"
tap_dir="$RUNNER_TEMP/novelite-ci-tap"
mkdir -p "$tap_dir/Casks"
node scripts/generate-cask.mjs "$dmg" "$tap_dir/Casks/novelite.rb" --local
git -C "$tap_dir" init
git -C "$tap_dir" add Casks
git -C "$tap_dir" -c user.name=CI -c user.email=ci@example.invalid commit -m 'Test candidate installer'
brew tap novelite/ci "$tap_dir"
if brew help trust >/dev/null 2>&1; then brew trust --cask novelite/ci/novelite; fi
brew install --cask novelite/ci/novelite
brew list --cask novelite/ci/novelite
test -x /Applications/novelite.app/Contents/MacOS/novelite
codesign --verify --deep --strict /Applications/novelite.app
/Applications/novelite.app/Contents/MacOS/novelite > "$RUNNER_TEMP/novelite-brew-launch.log" 2>&1 &
app_pid=$!
trap 'kill "$app_pid" 2>/dev/null || true' EXIT
sleep 8
if ! kill -0 "$app_pid" 2>/dev/null; then cat "$RUNNER_TEMP/novelite-brew-launch.log"; exit 1; fi
kill "$app_pid"
wait "$app_pid" || true
trap - EXIT
brew uninstall --cask novelite/ci/novelite
test ! -e /Applications/novelite.app
echo 'Homebrew installation, native startup and uninstall passed'
