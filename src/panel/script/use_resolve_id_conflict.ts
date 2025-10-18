import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
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

function resolveConflictScriptTrees(script_trees: ScriptTree[], ...stores: ReturnType<typeof useGlobalScriptsStore>[]) {
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
  character_name: Readonly<Ref<string | undefined>>,
  global_scripts: ReturnType<typeof useGlobalScriptsStore>,
  preset_scripts: ReturnType<typeof usePresetScriptsStore>,
  character_scripts: ReturnType<typeof useCharacterScriptsStore>,
) {
  watch(character_name, () => {
    resolveConflictScriptTrees(character_scripts.script_trees, global_scripts, preset_scripts);
  });
  watch(preset_name, () => {
    resolveConflictScriptTrees(preset_scripts.script_trees, global_scripts, character_scripts);
  });
}
