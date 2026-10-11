cask "novelite" do
  version "1.0.2"
  sha256 "9661242a67353663c4a53c9d75f3a311309e500a3d3b15dfba13aa697660d35a"

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
