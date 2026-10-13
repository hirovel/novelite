// This module is injected into actual packaged WebViews by build.mjs, never the release entry point.
import { invoke } from '@tauri-apps/api/core';
import { EditorView } from '@codemirror/view';
import { projectStore } from '../../src/core/storage/ProjectStore';
import { registerRestartSave } from '../../src/core/storage/restartGuard';
import { checkForUpdates, installUpdate, CURRENT_VERSION } from '../../src/plugins/auto-updater/updateChecker';

type Config = { flow: string; versions: string[]; verifyOnly?: boolean };
type Saved = { project: string; chapter: string; other: string; otherContent: string; content: string; scratchpad: string; completed: string[] };
const call = <T = void>(action: string, payload: unknown = null) => invoke<T>('upgrade_test', { action, payload });
const report = (stage: string, details: object = {}) => call('report', { stage, version: CURRENT_VERSION, ...details });
const mode = (mode: string, version: string) => call('mode', { mode, version });
function assert(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const storageKey = 'novelite_upgrade_test';
const initialStorage = {
  metadata: localStorage.getItem(storageKey),
  library: localStorage.getItem('novelite_library_map'),
};

async function checkpoint(stage: string, details: object = {}) {
  await report(stage, details);
  for (let i = 0; i < 600; i++) {
    if (await call<boolean>('checkpoint', { stage })) return;
    await pause(100);
  }
  throw new Error(`Controller did not verify ${stage}`);
}

async function editor(): Promise<EditorView> {
  for (let i = 0; i < 300; i++) {
    const element = document.querySelector('.cm-editor');
    const view = element && EditorView.findFromDOM(element as HTMLElement);
    if (view) return view;
    await pause(100);
  }
  throw new Error('The real manuscript editor did not mount');
}

async function run() {
  const config = await call<Config>('config');
  const index = config.versions.indexOf(CURRENT_VERSION);
  assert(index >= 0, `Unexpected frontend version: ${CURRENT_VERSION}`);
  await editor();
  // Let the ordinary startup check complete before deliberately changing server behavior.
  await pause(4000);
  await checkpoint('started', { flow: config.flow });
  let saved: Saved;
  if (index === 0 && !config.verifyOnly) {
    const project = projectStore.createProject(`跨版本手稿 ${config.flow}`, '升级测试');
    const chapter = projectStore.getActiveChapter()!;
    const other = projectStore.addChapter(project.volumes[0].id, '另一章保留原文');
    projectStore.setActiveChapter(chapter.id);
    const scratchpad = '大纲与备忘：山川 / café / 🌙';
    projectStore.updateScratchpad(scratchpad);
    localStorage.setItem('novelite_language', 'en');
    saved = { project: project.id, chapter: chapter.id, other: other.id, otherContent: other.content,
      content: chapter.content, scratchpad, completed: [] };
    localStorage.setItem(storageKey, JSON.stringify(saved));
    await pause(500);
  } else {
    const raw = localStorage.getItem(storageKey);
    assert(raw, 'App replacement lost the WebView data directory');
    // The oracle must survive independently of the storage being tested: both the manuscript
    // and a localStorage-based expected value can roll back together on an abrupt exit.
    saved = await call<Saved>('expected');
    const initialProject = initialStorage.library && JSON.parse(initialStorage.library)[saved.project];
    await report('restore-observation', {
      expected: saved, metadata: raw, initialMetadata: initialStorage.metadata,
      initialContent: initialProject?.volumes.flatMap((volume: { chapters: { id: string; content: string }[] }) => volume.chapters)
        .find((chapter: { id: string }) => chapter.id === saved.chapter)?.content,
      restoredContent: projectStore.findChapter(saved.chapter)?.content,
    });
    assert(projectStore.getProject().id === saved.project, 'Active book changed after update');
    assert(projectStore.getActiveChapter()?.id === saved.chapter, 'Active chapter changed after update');
    assert(projectStore.findChapter(saved.chapter)?.content === saved.content, 'Unsaved manuscript text was lost during update');
    assert((await editor()).state.doc.toString() === saved.content, 'Restored editor differs from persisted manuscript');
    assert(projectStore.findChapter(saved.other)?.content === saved.otherContent, 'Another chapter was overwritten');
    assert(projectStore.getProject().scratchpad === saved.scratchpad, 'Scratchpad was lost');
    assert(localStorage.getItem('novelite_language') === 'en', 'Language preference was lost');
    assert(saved.completed.includes(CURRENT_VERSION), 'New app was launched without the expected update');
    await report('restored', { flow: config.flow, manuscript: saved.content, completed: saved.completed });
  }

  await mode('valid', CURRENT_VERSION);
  assert(!(await checkForUpdates(true)).hasUpdate, 'Same version must not update');
  await mode('valid', '0.0.1');
  assert(!(await checkForUpdates(true)).hasUpdate, 'Older release must not downgrade');
  await report('version-guards');
  const next = config.versions[index + 1];
  if (!next || config.verifyOnly) {
    await report('complete', { flow: config.flow });
    await call('exit');
    return;
  }

  if (index === 0) {
    await mode('unavailable', next);
    let networkError = false;
    try { await checkForUpdates(true); } catch { networkError = true; }
    assert(networkError, 'Unavailable update service was reported as up to date');
    await checkpoint('network-rejected');
    for (const fault of ['corrupt', 'interrupted', 'save-failed']) {
      await mode(fault === 'save-failed' ? 'valid' : fault, next);
      const update = await checkForUpdates(true);
      assert(update.hasUpdate && update.latestVersion === next, 'New release was not detected');
      const phases: string[] = [];
      const unregister = fault === 'save-failed'
        ? registerRestartSave(async () => { throw new Error('Injected manuscript save failure'); }) : () => {};
      let rejected = false;
      let error = '';
      try { await installUpdate(next, progress => { phases.push(progress.phase); }); }
      catch (reason) { rejected = true; error = String(reason); }
      finally { unregister(); }
      assert(rejected, `${fault} unexpectedly installed an update`);
      if (fault === 'corrupt') assert(/signature|verify/i.test(error), `Corrupted payload failed for an unrelated reason: ${error}`);
      assert(!phases.includes('installing'), `${fault} reached installer execution`);
      if (fault !== 'save-failed') assert(!phases.includes('saving'), `${fault} bypassed verified download`);
      assert(projectStore.findChapter(saved.chapter)?.content === saved.content, `${fault} lost manuscript data`);
      await checkpoint(`${fault}-rejected`, { phases: [...new Set(phases)], error });
    }
  }

  await mode('valid', next);
  assert((await checkForUpdates(true)).latestVersion === next, 'Retry did not detect the intended version');
  const view = await editor();
  let edited = false;
  const unregister = registerRestartSave(async () => {
    assert(edited, 'Save guard ran before the pending editor edit');
    await report('save-guard', { next, snapshot: saved });
  });
  await report('upgrading', { next });
  try {
    await installUpdate(next, progress => {
      if (progress.phase === 'saving' && !edited) {
        // Edit at the actual save boundary, strictly before the editor's 250 ms debounce.
        const text = `\n未等待自动保存 → ${next} / café 🌙 / ${config.flow}`;
        view.dispatch({ changes: { from: view.state.doc.length, insert: text } });
        saved.content = view.state.doc.toString();
        saved.completed.push(next);
        localStorage.setItem(storageKey, JSON.stringify(saved));
        edited = true;
      }
    });
  } finally { unregister(); }
  // Native install/relaunch must terminate this process; the controller observes the new PID.
}

void run().catch(async error => {
  await report('failed', { error: String(error), stack: error?.stack });
  await call('exit');
});
