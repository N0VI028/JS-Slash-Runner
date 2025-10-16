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
  const other_scripts = getFlattenedScriptTrees(...stores.map(store => store.script_trees));
  const conflict_scripts = getFlattenedScriptTrees(script_trees).filter(
    script => !other_scripts.some(existing_script => existing_script.id === script.id),
  );
  conflict_scripts.forEach(script => {
    script.id = uuidv4();
  });
}

export function useResolveIdConflict(
  character_id: Ref<string | undefined>,
  preset_id: Ref<string>,
  global_scripts: ReturnType<typeof useGlobalScriptsStore>,
  character_scripts: ReturnType<typeof useCharacterScriptsStore>,
  preset_scripts: ReturnType<typeof usePresetScriptsStore>,
) {
  watch(
    character_id,
    () => {
      resolveConflictScriptTrees(character_scripts.script_trees, global_scripts, preset_scripts);
    },
    { flush: 'post' },
  );
  watch(
    preset_id,
    () => {
      resolveConflictScriptTrees(preset_scripts.script_trees, global_scripts, character_scripts);
    },
    { flush: 'post' },
  );
}
