import type { Command } from './types';

export class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Map<string, Command> = new Map();
  private listeners: Set<() => void> = new Set();

  private aliases: Map<string, string> = new Map([
    ['focus:toggle', 'focus.toggle'],
    ['focus:toggle-scope', 'focus.cycle-scope'],
    ['literary:toggle-dialogue', 'dialogue.toggle'],
    ['split:toggle', 'split-view.toggle'],
    ['split:focus-toggle', 'split-view.focus-toggle'],
    ['split:focus-primary', 'split-view.focus-primary'],
    ['split:focus-secondary', 'split-view.focus-secondary'],
    ['split:swap-panes', 'split-view.swap-panes'],
    ['literary:format-chinese', 'typography.format-chinese'],
    ['literary:quick-export', 'novel.export-txt'],
    ['editor:zoom-in', 'typography.font-increase'],
    ['editor:zoom-out', 'typography.font-decrease'],
    ['background:cycle-effect', 'background.cycle-effect'],
    ['nav:global-search', 'global-search:open'],
    ['novel:import-txt', 'novel.import-txt'],
  ]);

  private constructor() {}

  public static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  public register(command: Command): () => void {
    this.commands.set(command.id, command);
    this.notify();
    return () => {
      this.commands.delete(command.id);
      this.notify();
    };
  }

  public getAlias(id: string): string | undefined {
    return this.aliases.get(id);
  }

  public registerAlias(alias: string, targetId: string): void {
    this.aliases.set(alias, targetId);
  }

  public get(id: string): Command | undefined {
    // 1. Exact match
    if (this.commands.has(id)) {
      return this.commands.get(id);
    }

    // 2. Predefined alias
    const alias = this.aliases.get(id);
    if (alias && this.commands.has(alias)) {
      return this.commands.get(alias);
    }

    // 3. Inverse alias lookup
    for (const [k, v] of this.aliases.entries()) {
      if (v === id && this.commands.has(k)) {
        return this.commands.get(k);
      }
    }

    // 4. Dot-Colon bidirectional normalization
    const asDot = id.replace(/:/g, '.');
    if (this.commands.has(asDot)) {
      return this.commands.get(asDot);
    }

    const asColon = id.replace(/\./g, ':');
    if (this.commands.has(asColon)) {
      return this.commands.get(asColon);
    }

    return undefined;
  }

  public getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}

export const commandRegistry = CommandRegistry.getInstance();
