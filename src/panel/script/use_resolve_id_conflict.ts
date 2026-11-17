import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useWorldbookScriptsStore } from '@/store/worldbook_scripts';
import { isScript, ScriptTree } from '@/type/scripts';
import { uuidv4 } from '@sillytavern/scripts/utils';

function getFlattenedScriptTrees(...script_trees: ScriptTree[][]): ScriptTree[] {
  return _(script_trees)
    .flatten()
    .flatMap(script => {
      return isScript(script) ? script : [script, ...script.scripts];
    })
    .value();
}

function resolveConflictScriptTrees(script_trees: ScriptTree[], ...stores: { script_trees: ScriptTree[] }[]) {
  if (script_trees.length === 0) {
    return;
  }
  const other_scripts = getFlattenedScriptTrees(...stores.map(store => store.script_trees));
  const conflict_scripts = getFlattenedScriptTrees(script_trees).filter(script =>
    other_scripts.some(existing_script => existing_script.id === script.id),
  );
  conflict_scripts.forEach(script => {
    script.id = uuidv4();
  });
}

export function useResolveIdConflict(
  preset_name: Readonly<Ref<string>>,
  character_avatar: Readonly<Ref<string | undefined>>,
  global_scripts: ReturnType<typeof useGlobalScriptsStore>,
  preset_scripts: ReturnType<typeof usePresetScriptsStore>,
  character_scripts: ReturnType<typeof useCharacterScriptsStore>,
  worldbook_scripts: ReturnType<typeof useWorldbookScriptsStore>,
) {
  watch(character_avatar, () => {
    resolveConflictScriptTrees(character_scripts.script_trees, global_scripts, preset_scripts, worldbook_scripts);
  });
  watch(preset_name, () => {
    resolveConflictScriptTrees(preset_scripts.script_trees, global_scripts, character_scripts, worldbook_scripts);
  });
  watch(
    () => worldbook_scripts.script_trees,
    script_trees => resolveConflictScriptTrees(script_trees, global_scripts, preset_scripts, character_scripts),
    { deep: true, immediate: true },
  );
}
