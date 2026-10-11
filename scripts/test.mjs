import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium, webkit } from 'playwright';

const server = await createServer({
  server: { host: '127.0.0.1', port: 0 },
  optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client', 'canvas-confetti', '@tauri-apps/api/core', '@tauri-apps/api/path', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-fs'] },
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
      await editor.reload();
      await editor.locator('.cm-content').first().waitFor({ state: 'visible' });
      assert.match(await editor.locator('.cm-content').first().innerText(), /MAC_COMPATIBILITY_CHECK/);
      assert.deepEqual(errors, [], 'No uncaught frontend errors');
      console.log(`${name}: PASS editor typing, Cmd+Z, Cmd+Shift+Z, Cmd+S and persistence`);
      await app.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
