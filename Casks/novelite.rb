cask "novelite" do
  version "1.0.3"
  sha256 "9d05c3711db90b05ef7b0c5f4a62194d55c532379896798603d94a1a1fa0da32"

  url "https://github.com/hirovel/novelite/releases/download/v#{version}/novelite_#{version}_aarch64.dmg"
  name "Novelite"
  desc "Lightweight novel-writing desktop editor"
  homepage "https://github.com/hirovel/novelite"

  depends_on arch: :arm64
  depends_on macos: ">= :big_sur"

  auto_updates true

  app "novelite.app"

  caveats <<~EOS
    Requires an Apple Silicon Mac and Safari/WebKit 16.4 or later.
    This app is ad-hoc signed and is not notarized by Apple.
    If macOS blocks the first launch, use System Settings > Privacy & Security > Open Anyway.
    Uninstalling this cask preserves your manuscripts and settings.
  EOS
end
