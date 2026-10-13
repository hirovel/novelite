# Native cross-version upgrade tests

The release workflow gates publication on actual updates inside Windows WebView2 and Apple Silicon macOS WKWebView. Run the reusable **Native cross-version upgrades** workflow manually, or open a PR to run it alongside the normal release checks.

The test builds the published **v1.0.3 source**, the current release candidate and two later patch-number fixtures. For v1.0.4, immediate-save in-app tests cover **1.0.4 → 1.0.5 → 1.0.6** and **1.0.4 → 1.0.6**. The last two versions are private fixtures, not published releases. The old client is extracted from its immutable Git tag; its application code remains unchanged. Fixtures have an isolated app identity, test endpoint/key and test driver, so they are not byte-identical public downloads. Tests cannot predict code changes in a future release.

Coverage:

- Windows NSIS and MSI: consecutive upgrades and skipping the intermediate version; preserve the original installer format and installation directory, including spaces in its path.
- macOS DMG: consecutive upgrades, ad-hoc signature verification after each replacement.
- Homebrew: install the older cask, skip a version using the in-app updater, then perform a greedy cask upgrade and verify data again.
- Legacy migration: Windows v1.0.3 updates in-app to the candidate. Mac v1.0.3 saves its manuscript, allows its ordinary save to finish, closes, and is then upgraded by Homebrew; the candidate must restore the exact saved book. This one-time route is necessary because the old Mac client cannot retroactively receive the new pre-install safeguard.
- Real native update checks reject same-version and older releases. Service errors, a modified signed payload, truncated downloads and manuscript save failures leave the installed version and executable bytes intact; retry then succeeds.
- Every successful update must launch a new PID at the same installed path. Native version, frontend version, installed payload SHA-256, Windows installer registration or Mac bundle metadata must agree.
- The running CodeMirror editor receives Unicode text at the save boundary, before its debounce expires. An independent native file records the expected state. The new process must restore the exact text, active book/chapter, another chapter, scratchpad and language preference.

The first two runs reproduced an actual macOS failure: a quick second restart reloaded the previous on-disk localStorage state, losing the last editor input. Testing the immutable v1.0.3 source also reproduced the problem on its first in-app upgrade. The v1.0.4 candidate adds a synced native checkpoint before installation and restores it before importing the application/store. Generation markers avoid replaying a stale checkpoint over later writing. The original immediate-edit/quick-restart scenario remains mandatory for fixed clients, without adding a save delay. The known v1.0.3 failure is not claimed as fixed retroactively; its supported migration route is tested separately.

`tests/native-upgrade/build.mjs` injects a small driver and reporting command into disposable CI builds, then restores the source files in `finally`. These use a separate application identifier, an ephemeral signing key and a loopback HTTP update server, following the upstream Tauri updater test approach. The production entry points, trust key and HTTPS update endpoint are unchanged. No test installer or private key is uploaded. Tests refuse to run installers outside disposable GitHub runners.

In each in-app scenario, `tests/native-upgrade/run.mjs` installs and launches the baseline once. Subsequent replacements and launches must be performed by the production `checkForUpdates` / `installUpdate` implementation and native updater, not the controller. The explicitly separate Homebrew migration/upgrade scenarios use the external package manager with the app closed. Controller acknowledgments pause the app while independently checking installed bytes. A missing restart, lost manuscript or failed guard fails the job. JSON evidence is uploaded even on failure.

The test does not establish Apple notarization, Windows code-signing reputation, every possible OS policy, or WinGet catalog acceptance. WinGet acceptance is checked separately from the underlying NSIS update route. Disk-folder save errors also retain their existing editor/storage regression tests; the native restart assertions here cover the persisted application manuscript.

## Verified on 2026-10-13

[Full passing run](https://github.com/hirovel/novelite/actions/runs/38353762571), tested PR commit `e68cd1f1b8cb5eb9b4c1e50165d720afb5e08215` (merged as `795beee`). JSON evidence is attached to the run.

| Installed route | Verified transition | Result |
| --- | --- | --- |
| Windows NSIS and MSI | Published-source 1.0.3 → candidate 1.0.4 | Passed both formats |
| Windows NSIS and MSI | 1.0.4 → fixture 1.0.5 → fixture 1.0.6 | Passed both formats |
| Windows NSIS and MSI | 1.0.4 → fixture 1.0.6 | Passed both formats |
| Mac Homebrew legacy migration | Save/close 1.0.3 → external upgrade to 1.0.4 | Passed |
| Mac DMG-installed app | 1.0.4 → fixture 1.0.5 → fixture 1.0.6 | Passed |
| Mac Homebrew-installed app | In-app 1.0.4 → fixture 1.0.6, then greedy cask upgrade | Passed both stages |

The same run passed both platforms' native checkpoint filesystem tests, normal installer/startup and signature/tampering checks, and the Chromium/WebKit regression suite. The [earlier failing run](https://github.com/hirovel/novelite/actions/runs/38351116234) records the independently confirmed last-input loss before the fix. Published Mac v1.0.3's unsafe immediate-restart path is documented, not presented as passing.

The [formal v1.0.4 release run](https://github.com/hirovel/novelite/actions/runs/38355200656) repeated the complete matrix and passed every job, then published at **2026-10-13 06:28:11 UTC** and synchronized Homebrew. All 9 public assets were downloaded; all 8 listed SHA-256 digests matched the files and GitHub asset digests. The signed platform URLs/signature strings and stable `releases/latest/download/latest.json` endpoint resolve to v1.0.4. The public DMG and Homebrew cask share SHA-256 `300ecf70096504880c829220d869bf14add1b0db178ea7a106619ee60ed90217`.
