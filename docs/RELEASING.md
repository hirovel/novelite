# Development and releases

Use Node.js 24 and Rust stable, plus the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/).

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
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run tauri build -- --target aarch64-apple-darwin --bundles app,dmg
npm run tauri build -- --target x86_64-apple-darwin --bundles app,dmg
```

Build macOS installers on macOS. CI uses separate Apple Silicon and Intel hosts, runs WebKit regressions on both, verifies the app signature, executable architecture and DMG integrity, and checks the packaged process survives startup.

The current config uses ad-hoc signing (`signingIdentity: "-"`) and macOS 11 as its minimum. Ad-hoc signing is not Apple notarization: first-time users may need **Privacy & Security → Open Anyway**. See [Tauri signing](https://v2.tauri.app/distribute/sign/macos/) and [Apple's guidance](https://support.apple.com/102445). Do not tell users to disable Gatekeeper globally.

Filesystem capabilities enable individual commands without broad path grants. Native open/save dialogs grant access only to selected paths; folder access is recursive for manuscript volumes. Scopes are session-only, so users reselect folders after relaunch. Local manuscript copies remain in app storage.

## Publish

1. Update `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock` to the same version. The update checker imports the package version.
2. Add `docs/releases/vX.Y.Z.md` with changes, installation notes and validation limits.
3. Open a PR and wait for quality, Windows, Linux, Apple Silicon and Intel checks to pass. Review changes and merge.
4. Tag the reviewed commit with `vX.Y.Z` and push the tag. The workflow verifies the tag matches the application version.
5. All installers are built and uploaded as Actions artifacts before the publish job runs. It then creates a draft, uploads installers and SHA-256 checksums, and makes the release public only after all jobs succeed.

Manual workflow runs build and verify artifacts without publishing a release. A failed build leaves no public release. If publication fails after creating a draft, rerun the failed job; it resumes the draft. Already public releases are deliberately not overwritten.

Before declaring a fully manually tested Mac release, check on a physical Mac: first launch after download, native open/save dialogs, Chinese input, close/reopen, folder rename, external file changes, and export with both successful and cancelled saves.
