#!/usr/bin/env bash
set -euo pipefail

bundle="src-tauri/target/${TARGET}/release/bundle"
app="$bundle/macos/novelite.app"
binary="$app/Contents/MacOS/novelite"
test -x "$binary"
codesign --verify --deep --strict --verbose=2 "$app"
case "$TARGET" in
  aarch64-apple-darwin) lipo "$binary" -verify_arch arm64 ;;
  x86_64-apple-darwin) lipo "$binary" -verify_arch x86_64 ;;
  *) exit 1 ;;
esac
for dmg in "$bundle"/dmg/*.dmg; do hdiutil verify "$dmg"; done

# Run the packaged executable on the matching host and catch startup crashes.
"$binary" > "$RUNNER_TEMP/novelite-launch.log" 2>&1 &
app_pid=$!
trap 'kill "$app_pid" 2>/dev/null || true' EXIT
sleep 8
if ! kill -0 "$app_pid" 2>/dev/null; then
  cat "$RUNNER_TEMP/novelite-launch.log"
  echo 'Packaged app exited during startup' >&2
  exit 1
fi
echo "Packaged app started successfully on $TARGET"
