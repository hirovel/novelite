import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium, webkit } from 'playwright';

const server = await createServer({
  server: { host: '127.0.0.1', port: 0 },
  optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client', 'canvas-confetti', '@tauri-apps/api/core', '@tauri-apps/api/path', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-fs', '@tauri-apps/plugin-updater', '@tauri-apps/plugin-process'] },
});
server.middlewares.use('/__test', (_req, res) => res.end('<html><body>Compatibility tests</body></html>'));
await server.listen();
const url = server.resolvedUrls.local[0];
try {
  for (const name of (process.env.TEST_BROWSERS || 'chromium,webkit').split(',')) {
    const browser = await ({ chromium, webkit })[name].launch();
    try {
      const context = await browser.newContext();
      await context.addInitScript(() => Object.defineProperty(navigator, 'platform', { value: 'MacIntel' }));
      const page = await context.newPage();
      await page.goto(`${url}__test`);
      const results = await page.evaluate(async () => (await import('/tests/compatibility.ts')).runRegressions());
      for (const result of results) console.log(`${name}: PASS ${result}`);
      const updaterResults = await page.evaluate(async () => (await import('/tests/updater.ts')).runUpdaterRegressions());
      for (const result of updaterResults) console.log(`${name}: PASS ${result}`);
      await context.close();

      const app = await browser.newContext();
      await app.addInitScript(() => {
        Object.defineProperty(navigator, 'platform', { value: 'MacIntel' });
        localStorage.setItem('novelite_language', 'en');
      });
      const editor = await app.newPage();
      const errors = [];
      editor.on('pageerror', error => errors.push(error.message));
      await editor.route('https://api.github.com/**', route => route.fulfill({ status: 404, body: '{}' }));
      await editor.goto(url);
      const content = editor.locator('.cm-content').first();
      await content.waitFor({ state: 'visible' });
      await content.click();
      await editor.keyboard.press('Meta+End');
      await editor.keyboard.insertText('MAC_COMPATIBILITY_CHECK');
      assert.match(await content.innerText(), /MAC_COMPATIBILITY_CHECK/);
      await editor.keyboard.press('Meta+z');
      assert.doesNotMatch(await content.innerText(), /MAC_COMPATIBILITY_CHECK/);
      await editor.keyboard.press('Meta+Shift+z');
      assert.match(await content.innerText(), /MAC_COMPATIBILITY_CHECK/);
      await editor.keyboard.press('Meta+s');
      await editor.keyboard.insertText('IMMEDIATE_UPDATE_SAVE');
      await editor.evaluate(async () => (await import('/src/core/storage/restartGuard.ts')).saveBeforeRestart());
      await editor.reload();
      await editor.locator('.cm-content').first().waitFor({ state: 'visible' });
      assert.match(await editor.locator('.cm-content').first().innerText(), /MAC_COMPATIBILITY_CHECK/);
      assert.match(await editor.locator('.cm-content').first().innerText(), /IMMEDIATE_UPDATE_SAVE/);
      const chapters = await editor.evaluate(async () => {
        const { projectStore } = await import('/src/core/storage/ProjectStore.ts');
        const first = projectStore.getActiveChapter().id;
        const second = projectStore.addChapter(projectStore.getProject().volumes[0].id, 'Switch test');
        projectStore.setActiveChapter(first);
        return { first, second: second.id, original: second.content };
      });
      await editor.locator('.cm-content').first().click();
      await editor.keyboard.insertText('PENDING_CHAPTER_EDIT');
      await editor.evaluate(async ({ second }) => {
        const { projectStore } = await import('/src/core/storage/ProjectStore.ts');
        projectStore.setActiveChapter(second);
      }, chapters);
      // Cross the real 250ms editor debounce boundary before inspecting both chapters.
      await editor.waitForTimeout(350);
      const afterSwitch = await editor.evaluate(async ({ first, second }) => {
        const { projectStore } = await import('/src/core/storage/ProjectStore.ts');
        return { first: projectStore.findChapter(first).content, second: projectStore.findChapter(second).content };
      }, chapters);
      assert.match(afterSwitch.first, /PENDING_CHAPTER_EDIT/, 'Pending edit stays with its original chapter');
      assert.equal(afterSwitch.second, chapters.original, 'Chapter navigation must not overwrite the destination');
      assert.deepEqual(errors, [], 'No uncaught frontend errors');
      console.log(`${name}: PASS editor typing, Cmd+Z, Cmd+Shift+Z, Cmd+S, persistence and rapid chapter switching`);
      await app.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
