import { getScriptsStoreByType } from '@/store/scripts';
import { useWorldbookScriptsStore } from '@/store/worldbook_scripts';
import { ScriptTree } from '@/type/scripts';

export type ScriptTarget = 'global' | 'character' | 'preset' | 'worldbook';

export function captureWorldbookName(target: ScriptTarget): string | undefined {
  if (target !== 'worldbook') return undefined;
  return useWorldbookScriptsStore().selected_name || undefined;
}

export function appendScriptTree(target: ScriptTarget, tree: ScriptTree, worldbookName?: string): boolean {
  if (target !== 'worldbook') {
    getScriptsStoreByType(target).script_trees.push(tree);
    return true;
  }

  const store = useWorldbookScriptsStore();
  // Never fall back to the live selection here: editors and file pickers can
  // outlive the selection they were opened for. A missing captured name should
  // fail closed rather than silently writing into whichever book is selected now.
  const name = worldbookName;
  if (!name || !store.names.includes(name)) {
    toastr.warning(t`请先选择一个世界书`);
    return false;
  }

  const previous_name = store.selected_name;
  store.selected_name = name;
  try {
    store.script_trees.push(tree);
  } finally {
    store.selected_name = previous_name;
  }
  return true;
}
