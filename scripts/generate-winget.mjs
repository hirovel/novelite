import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const [installer, destination] = process.argv.slice(2);
assert.ok(installer && destination, 'Usage: node scripts/generate-winget.mjs <NSIS installer> <output directory>');
const version = basename(installer).match(/^novelite_(\d+\.\d+\.\d+)_x64-setup\.exe$/)?.[1];
assert.ok(version, 'Expected a versioned x64 NSIS installer');
const sha = createHash('sha256').update(readFileSync(installer)).digest('hex').toUpperCase();
const id = 'hirovel.Novelite';
const header = `PackageIdentifier: ${id}\nPackageVersion: ${version}\n`;
const files = {
  [`${id}.yaml`]: `${header}DefaultLocale: en-US
ManifestType: version
ManifestVersion: 1.12.0
`,
  [`${id}.locale.en-US.yaml`]: `${header}PackageLocale: en-US
Publisher: novelite
PublisherUrl: https://github.com/hirovel
PublisherSupportUrl: https://github.com/hirovel/novelite/issues
PackageName: novelite
PackageUrl: https://github.com/hirovel/novelite
License: GPL-3.0
LicenseUrl: https://github.com/hirovel/novelite/blob/v${version}/LICENSE
ShortDescription: Lightweight novel-writing desktop editor
Tags:
- editor
- novel
- writing
ReleaseNotesUrl: https://github.com/hirovel/novelite/releases/tag/v${version}
ManifestType: defaultLocale
ManifestVersion: 1.12.0
`,
  [`${id}.installer.yaml`]: `${header}InstallerType: nullsoft
Scope: user
InstallModes:
- interactive
- silent
- silentWithProgress
InstallerSwitches:
  Silent: /S
  SilentWithProgress: /P
UpgradeBehavior: install
ProductCode: novelite
Installers:
- Architecture: x64
  InstallerUrl: https://github.com/hirovel/novelite/releases/download/v${version}/novelite_${version}_x64-setup.exe
  InstallerSha256: ${sha}
ManifestType: installer
ManifestVersion: 1.12.0
`,
};
mkdirSync(destination, { recursive: true });
for (const [name, content] of Object.entries(files)) {
  const type = content.match(/^ManifestType: (.+)$/m)[1];
  const schema = `# yaml-language-server: $schema=https://aka.ms/winget-manifest.${type}.1.12.0.schema.json\n\n`;
  writeFileSync(join(destination, name), schema + content);
}
console.log(`Generated ${id} ${version} manifests in ${destination}`);
