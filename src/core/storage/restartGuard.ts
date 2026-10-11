import { projectStore } from './ProjectStore';
import { fileSystemStore } from './FileSystemStore';

const editors = new Set<() => Promise<void>>();

/** Editors register here so shutdown can await saves and propagate failures. */
export function registerRestartSave(save: () => Promise<void>): () => void {
  editors.add(save);
  return () => { editors.delete(save); };
}

export async function saveBeforeRestart(): Promise<void> {
  await Promise.all([...editors].map(save => save()));
  await fileSystemStore.finishPendingWrites();
  if (!projectStore.save()) throw new Error('Manuscript could not be saved');
}
