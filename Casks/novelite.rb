cask "novelite" do
  version "1.0.1"
  sha256 "771f54d50aae5c532a36ac814814f0f59535fa0f7a3dc48e65a7d4dfbe173fef"

  url "https://github.com/hirovel/novelite/releases/download/v#{version}/novelite_#{version}_aarch64.dmg"
  name "Novelite"
  desc "Lightweight novel-writing desktop editor"
  homepage "https://github.com/hirovel/novelite"

  depends_on arch: :arm64
  depends_on macos: ">= :big_sur"

  app "novelite.app"

  caveats <<~EOS
    Requires an Apple Silicon Mac and Safari/WebKit 16.4 or later.
    This app is ad-hoc signed and is not notarized by Apple.
    If macOS blocks the first launch, use System Settings > Privacy & Security > Open Anyway.
    Uninstalling this cask preserves your manuscripts and settings.
  EOS
end
