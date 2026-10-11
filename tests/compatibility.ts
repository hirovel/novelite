export async function runRegressions() {
  const results: string[] = [];
  const check = (ok: unknown, label: string) => {
    if (!ok) throw new Error(label);
    results.push(label);
  };
  const { fileSystemStore: store } = await import('../src/core/storage/FileSystemStore');
  const { projectStore } = await import('../src/core/storage/ProjectStore');
  const { eventBus } = await import('../src/core/events/EventBus');
  store.stopExternalWatchLoop();
  delete (window as any).showDirectoryPicker;
  (window as any).isTauri = true;
  check(store.isSupported(), 'Native folder support without Chromium File System Access API');

  const files = new Map<string, string | null>([
    ['/book', null], ['/book/Volume', null], ['/book/Volume/01.txt', '# 第一章\n正文'],
    ['/book/Volume/notes.bin', 'preserve me'], ['/book/02.TXT', '# 根目录\n内容'],
  ]);
  let picked: string | null = '/book';
  let saving: string | null = '/export.txt';
  let failWrite = false;
  (window as any).__TAURI_INTERNALS__ = {
    invoke: async (command: string, args: any, options?: any) => {
      if (command === 'plugin:dialog|open') return picked;
      if (command === 'plugin:dialog|save') return saving;
      if (command === 'plugin:path|basename') return args.path.split('/').at(-1);
      if (command === 'plugin:path|join') return args.paths.join('/').replace(/\/+/g, '/');
      if (command === 'plugin:fs|read_dir') {
        return [...files].filter(([p]) => p.startsWith(args.path + '/') && !p.slice(args.path.length + 1).includes('/'))
          .map(([p, value]) => ({ name: p.split('/').at(-1), isDirectory: value === null, isFile: value !== null, isSymlink: false }));
      }
      if (command === 'plugin:fs|stat') {
        if (!files.has(args.path)) throw new Error('File not found');
        return { isDirectory: files.get(args.path) === null, isFile: files.get(args.path) !== null, mtime: Date.now(), atime: null, birthtime: null };
      }
      if (command === 'plugin:fs|read_text_file') return new TextEncoder().encode(files.get(args.path) as string);
      if (command === 'plugin:fs|write_text_file') {
        if (failWrite) throw new Error('Disk full');
        files.set(decodeURIComponent(options.headers.path), new TextDecoder().decode(args));
        return;
      }
      if (command === 'plugin:fs|exists') return files.has(args.path);
      if (command === 'plugin:fs|mkdir') { files.set(args.path, null); return; }
      if (command === 'plugin:fs|rename') {
        for (const [p, text] of [...files]) {
          if (p === args.oldPath || p.startsWith(args.oldPath + '/')) {
            files.set(args.newPath + p.slice(args.oldPath.length), text);
            files.delete(p);
          }
        }
        return;
      }
      if (command === 'plugin:fs|remove') {
        for (const p of [...files.keys()]) {
          if (p === args.path || (args.options?.recursive && p.startsWith(args.path + '/'))) files.delete(p);
        }
        return;
      }
      throw new Error(`Unexpected IPC: ${command}`);
    },
  };
  const project = await store.openLocalDirectory();
  check(project?.volumes.length === 2, 'Import mixed root chapters and volume directories separately');
  const root = project!.volumes.find(v => v.chapters.some(c => c.title === '02'))!;
  const volume = project!.volumes.find(v => v.title === 'Volume')!;
  const chapter = volume.chapters[0];
  check(await store.writeChapterDirectToDisk(root.chapters[0].id, '根目录更新'), 'Save uppercase TXT chapter');
  check(files.get('/book/02.TXT') === '根目录更新', 'Root chapter writes to its original file');
  check(await store.renameVolumeOnDisk(volume.id, '新卷'), 'Rename native volume');
  check(files.get('/book/新卷/notes.bin') === 'preserve me', 'Volume rename preserves non-chapter files');
  check(await store.writeChapterDirectToDisk(chapter.id, '重命名后保存'), 'Save after renaming parent volume');
  check(files.get('/book/新卷/01.txt') === '重命名后保存', 'Child handle follows renamed parent');
  check(!(await store.renameVolumeOnDisk(root.id, 'forbidden')), 'Root volume cannot rename selected directory');

  const { saveTextFile, pickDirectory } = await import('../src/core/storage/desktopFiles');
  const { exportNovelService } = await import('../src/core/storage/ExportNovelService');
  const messages: any[] = [];
  const unsubscribe = eventBus.on('show-toast', message => messages.push(message));
  check(await saveTextFile('小说.txt', '原样导出\n正文'), 'Native save dialog export');
  check(files.get('/export.txt') === '原样导出\n正文', 'Native export preserves Unicode text');
  saving = null;
  messages.length = 0;
  await exportNovelService.exportChapterToTxt(chapter);
  check(!messages.length, 'Cancelled export does not report success');
  saving = '/error.txt';
  failWrite = true;
  await exportNovelService.exportChapterToTxt(chapter);
  check(messages.length === 1 && messages[0].type === 'error', 'Failed export reports failure, not success');
  failWrite = false;
  picked = null;
  check(await store.openLocalDirectory() === null && store.isDiskConnected(), 'Cancelled folder picker preserves current connection');
  picked = '/book';
  const handle = await pickDirectory();
  let rejected = false;
  try { await handle.getFileHandle('../outside.txt', { create: true }); } catch { rejected = true; }
  check(rejected, 'Native handle rejects traversal');
  projectStore.createProject('Other book');
  check(!store.isDiskConnected(), 'Switching books disconnects the previous disk folder');
  unsubscribe();

  const { keymapRegistry } = await import('../src/core/keymap/KeymapRegistry');
  const key = (key: string, modifiers: KeyboardEventInit) => keymapRegistry.findMatchingBinding(new KeyboardEvent('keydown', { key, ...modifiers }))?.id;
  check(key('s', { metaKey: true }) === 'literary:save-chapter', 'Cmd+S saves on Mac');
  check(key('z', { metaKey: true, shiftKey: true }) === 'editor:redo', 'Cmd+Shift+Z is Mac redo');
  check(key('h', { metaKey: true }) === undefined, 'Cmd+H remains available to macOS Hide');
  check(key('s', { metaKey: true, isComposing: true }) === undefined, 'IME composition does not invoke shortcuts');
  check(key('ß', { altKey: true, code: 'KeyS' }) === 'split:toggle', 'Option shortcuts use physical key despite macOS character conversion');
  return results;
}
