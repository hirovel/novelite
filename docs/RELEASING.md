# Development and releases

Use Node.js 24 and Rust stable, plus the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/).

Novelite ships standalone Windows x64 and Apple Silicon macOS desktop apps. `npm run dev` opens Tauri; `dev:frontend` is the internal asset server used by Tauri and tests. npm remains the development toolchain. Any future npm distribution should install or launch the native app, rather than starting an external browser.

```sh
npm ci
npx playwright install chromium webkit
npm test
npm run check:release
npm run build
cargo check --locked --manifest-path src-tauri/Cargo.toml
```

On Linux, install Playwright system dependencies with `npx playwright install --with-deps chromium webkit`.
The regression suite checks real editor interactions in both browser engines and uses mocked Tauri IPC to exercise folder and export logic. Native dialog interaction still requires a desktop smoke test.

## macOS builds

```sh
rustup target add aarch64-apple-darwin
node scripts/build-native.mjs --target aarch64-apple-darwin --bundles app,dmg --ci -- --locked
```

Build macOS installers on macOS. CI uses an Apple Silicon host, runs WebKit regressions, verifies the app signature, executable architecture and DMG integrity, and checks the packaged process survives startup. It then installs the candidate DMG through a temporary Homebrew tap, starts the installed app and uninstalls it. The local test cask and published cask share the same generator and SHA-256 calculation.

## Windows installation checks

CI installs both NSIS and MSI packages, starts each installed app, checks that it survives startup, and uninstalls it. Bootstrap regressions use mocked downloads/processes to ensure network failures, checksum mismatches and installer cancellation are reported as failures. These also run under Windows PowerShell 5.1, used by the documented one-line command.

The public `install.ps1` downloads the latest x64 NSIS package and its SHA-256 manifest, checks the hash, runs the installer silently and checks its exit code. It never falls back to another runtime. The app uses the system WebView2 runtime; the installer installs it if needed. This does not require an external browser or Node.js.

The current config uses ad-hoc signing (`signingIdentity: "-"`) and macOS 11 as its minimum. The frontend additionally requires Safari/WebKit 16.4+ because of [Tailwind v4 browser support](https://tailwindcss.com/docs/compatibility). [Safari 16.4 is available on Big Sur and later](https://developer.apple.com/documentation/safari-release-notes/safari-16_4-release-notes); older systems need Safari updates. Ad-hoc signing is not Apple notarization: first-time users may need **Privacy & Security → Open Anyway**. See [Tauri signing](https://v2.tauri.app/distribute/sign/macos/) and [Apple's guidance](https://support.apple.com/102445). Do not tell users to disable Gatekeeper globally.

Filesystem capabilities enable individual commands without broad path grants. Native open/save dialogs grant access only to selected paths; folder access is recursive for manuscript volumes. Scopes are session-only, so users reselect folders after relaunch. Local manuscript copies remain in app storage.

## Publish

1. Update `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock` to the same version. The update checker imports the package version.
2. Add `docs/releases/vX.Y.Z.md` with changes, installation notes and validation limits.
3. Open a PR and wait for quality, Windows installation and Apple Silicon/Homebrew installation checks to pass. Review changes and merge.
4. Tag the reviewed commit with `vX.Y.Z` and push the tag. The workflow verifies the tag matches the application version.
5. All installers are built and uploaded as Actions artifacts before the publish job runs. It then creates a draft, uploads installers and SHA-256 checksums, and makes the release public only after all jobs succeed.
6. The `homebrew` job downloads the published DMG, regenerates `Casks/novelite.rb`, verifies its hash against GitHub's release asset digest, and updates that one file on `main` through the Contents API. It checks the existing file SHA and refuses to move the tap to an older release. This uses this repository's `GITHUB_TOKEN`; no cross-repository secret is needed.

The repository also acts as a custom Homebrew tap (not the official Homebrew Cask repository):

```sh
brew tap hirovel/novelite https://github.com/hirovel/novelite.git && brew install --cask hirovel/novelite/novelite
```

Keep the checked-in cask pointing to the last public release while preparing the next version. The publication job updates its version and checksum only after the new assets are available. If tap synchronization fails, rerun the `homebrew` job; it is idempotent. Do not rerun the already-successful publication job or rewrite a published tag.

Manual workflow runs build and verify artifacts without publishing a release. A failed build leaves no public release. If publication fails after creating a draft, rerun the failed job; it resumes the draft. Already public releases are deliberately not overwritten.

Before declaring a fully manually tested Mac release, check on a physical Mac: first launch after download, native open/save dialogs, Chinese input, close/reopen, folder rename, external file changes, and export with both successful and cancelled saves.

## WinGet submission

After a release is public, download its NSIS installer and run:

```sh
node scripts/generate-winget.mjs release-dist/novelite_X.Y.Z_x64-setup.exe release-dist/winget
winget validate --manifest release-dist/winget
```

The publisher, product name and product code match Tauri's current Windows registration (`novelite`). Recheck those values when changing bundle metadata. Submit the three generated files to `microsoft/winget-pkgs` under `manifests/h/hirovel/Novelite/X.Y.Z/` in one package-version PR. Follow the official [submission guide](https://learn.microsoft.com/windows/package-manager/package/repository).

Only advertise `winget install --exact --id hirovel.Novelite` as available after the upstream PR is merged and `winget show --exact --id hirovel.Novelite --source winget` finds the release. Until then, users can use the verified PowerShell installer or direct downloads. WinGet review, malware scanning and any required contributor agreement are controlled by Microsoft.

## Signed application updates (v1.0.3+)

The Tauri updater uses the public key in `src-tauri/tauri.conf.json` and the HTTPS endpoint `https://github.com/hirovel/novelite/releases/latest/download/latest.json`. The release workflow reads `TAURI_SIGNING_PRIVATE_KEY` from repository Actions secrets. Keep an offline backup of this key; replacing it prevents existing clients from accepting new releases. This key is separate from Apple code signing and notarization. Never commit the private key.

Tag builds require the production signing secret. PR/manual builds generate temporary keys and override only the candidate's updater public key, so untrusted PRs never receive the release key. `scripts/verify-updater.mjs` checks each generated artifact using the same minisign verifier as Tauri, then flips a byte and requires rejection. The release contains the macOS `.app.tar.gz`, EXE, MSI, their signatures, `latest.json` and SHA-256 checksums. Each manifest URL is pinned to the release tag. Windows uses separate `windows-x86_64-nsis` and `windows-x86_64-msi` entries to preserve the existing installation type.

The app checks on startup/every four hours, prompts before downloading, awaits editor and disk saves before installation, and restarts only after installation. Windows installers close the running process themselves; macOS relaunches through Tauri. Failures remain visible and retryable. Homebrew casks are marked `auto_updates true`; use `brew upgrade --cask --greedy hirovel/novelite/novelite` to explicitly update through Homebrew. WinGet continues to need a new upstream manifest per release.

v1.0.2 and older only link to downloads; users must install v1.0.3 once before subsequent in-app upgrades work. CI verifies package signatures, tamper rejection, editor/save failure regressions, fresh native installation and startup. A real end-to-end in-app upgrade between two published updater-enabled versions remains a release smoke-test requirement.
