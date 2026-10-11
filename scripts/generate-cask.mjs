import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [dmg, output, mode] = process.argv.slice(2);
assert.ok(dmg && output, 'Usage: node scripts/generate-cask.mjs <DMG> <output.rb> [--local]');
const version = basename(dmg).match(/^novelite_(\d+\.\d+\.\d+)_aarch64\.dmg$/)?.[1];
assert.ok(version, 'Expected a versioned Apple Silicon DMG');
assert.ok(!mode || mode === '--local', 'Unknown option');
const sha = createHash('sha256').update(readFileSync(dmg)).digest('hex');
const url = mode === '--local' ? pathToFileURL(resolve(dmg)).href
  : 'https://github.com/hirovel/novelite/releases/download/v#{version}/novelite_#{version}_aarch64.dmg';
const cask = `cask "novelite" do
  version "${version}"
  sha256 "${sha}"

  url "${url}"
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
`;
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, cask);
console.log(`Generated ${output}: v${version}, SHA-256 ${sha}`);
