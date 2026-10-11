import { isTauri } from '@tauri-apps/api/core';
import { basename, join } from '@tauri-apps/api/path';
import { open, save } from '@tauri-apps/plugin-dialog';
import * as fs from '@tauri-apps/plugin-fs';

// Only paths chosen in a native dialog enter Tauri's filesystem scope.
// This small handle adapter lets the existing folder sync work in WKWebView.
export interface TextFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<{ lastModified: number; text(): Promise<string> }>;
  createWritable(): Promise<{ write(content: string): Promise<void>; close(): Promise<void> }>;
  move?(name: string): Promise<void>;
}

export interface DirectoryHandle {
  kind: 'directory';
  name: string;
  entries(): AsyncIterable<[string, DirectoryHandle | TextFileHandle]>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<TextFileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  move?(name: string): Promise<void>;
}

function validateName(name: string): void {
  if (!name || name === '.' || name === '..' || /[\\/\0]/.test(name)) {
    throw new Error('Invalid file or folder name');
  }
}

class NativeDirectory implements DirectoryHandle {
  readonly kind = 'directory';
  name: string;
  private parent: NativeDirectory | string;
  constructor(name: string, parent: NativeDirectory | string) {
    this.name = name;
    this.parent = parent;
  }

  async path(): Promise<string> {
    return typeof this.parent === 'string' ? this.parent : join(await this.parent.path(), this.name);
  }

  async *entries(): AsyncIterable<[string, DirectoryHandle | TextFileHandle]> {
    const entries = await fs.readDir(await this.path());
    for (const entry of entries) {
      // Do not follow symlinks outside the selected manuscript directory.
      if (entry.isSymlink) continue;
      if (entry.isDirectory) yield [entry.name, new NativeDirectory(entry.name, this)];
      else if (entry.isFile) yield [entry.name, new NativeFile(entry.name, this)];
    }
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle> {
    validateName(name);
    const path = await join(await this.path(), name);
    if (options?.create && !(await fs.exists(path))) await fs.mkdir(path);
    if (!(await fs.stat(path)).isDirectory) throw new Error('Not a directory');
    return new NativeDirectory(name, this);
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<TextFileHandle> {
    validateName(name);
    const path = await join(await this.path(), name);
    if (options?.create && !(await fs.exists(path))) {
      await fs.writeTextFile(path, '', { createNew: true });
    }
    if (!(await fs.stat(path)).isFile) throw new Error('Not a file');
    return new NativeFile(name, this);
  }

  async removeEntry(name: string, options?: { recursive?: boolean }): Promise<void> {
    validateName(name);
    await fs.remove(await join(await this.path(), name), options);
  }

  async move(name: string): Promise<void> {
    validateName(name);
    if (typeof this.parent === 'string') throw new Error('Cannot rename the selected root folder');
    const target = await join(await this.parent.path(), name);
    if (await fs.exists(target)) throw new Error('A folder with this name already exists');
    await fs.rename(await this.path(), target);
    this.name = name;
  }
}

class NativeFile implements TextFileHandle {
  readonly kind = 'file';
  name: string;
  private parent: NativeDirectory;
  constructor(name: string, parent: NativeDirectory) {
    this.name = name;
    this.parent = parent;
  }

  private async path(): Promise<string> {
    return join(await this.parent.path(), this.name);
  }

  async getFile() {
    const path = await this.path();
    const info = await fs.stat(path);
    return { lastModified: info.mtime?.getTime() ?? 0, text: () => fs.readTextFile(path) };
  }

  async createWritable() {
    let content: string | undefined;
    return {
      async write(value: string) { content = value; },
      close: async () => {
        if (content !== undefined) await fs.writeTextFile(await this.path(), content);
      },
    };
  }

  async move(name: string): Promise<void> {
    validateName(name);
    const target = await join(await this.parent.path(), name);
    if (await fs.exists(target)) throw new Error('A file with this name already exists');
    await fs.rename(await this.path(), target);
    this.name = name;
  }
}

export function supportsDirectoryPicker(): boolean {
  return isTauri() || (typeof window !== 'undefined' && 'showDirectoryPicker' in window);
}

export async function pickDirectory(): Promise<DirectoryHandle> {
  if (isTauri()) {
    const path = await open({ directory: true, multiple: false, recursive: true });
    if (!path) throw new DOMException('Selection cancelled', 'AbortError');
    return new NativeDirectory(await basename(path), path);
  }
  return (window as unknown as {
    showDirectoryPicker(options: { mode: string }): Promise<DirectoryHandle>;
  }).showDirectoryPicker({ mode: 'readwrite' });
}

export async function saveTextFile(name: string, content: string): Promise<boolean> {
  const safeName = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_');
  if (isTauri()) {
    const extension = safeName.endsWith('.md') ? 'md' : 'txt';
    const path = await save({ defaultPath: safeName, filters: [{ name: extension.toUpperCase(), extensions: [extension] }] });
    if (!path) return false;
    await fs.writeTextFile(path, content);
    return true;
  }
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // WebKit needs the object URL to survive until the download starts.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
