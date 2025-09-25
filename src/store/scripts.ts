import { useCharacterSettingsStore, useGlobalSettingsStore, usePresetSettingsStore } from '@/store/settings';
import { ScriptTree } from '@/type/scripts';

function computeEnabled(name: Ref<string | undefined>, enabled_arrays: Ref<string[]>) {
  return computed({
    get: () => name.value !== undefined && enabled_arrays.value.includes(name.value),
    set: value => {
      if (name.value === undefined) {
        return;
      }

      if (value) {
        enabled_arrays.value.push(name.value);
      } else {
        _.pull(enabled_arrays.value, name.value);
      }
    },
  });
}

function createScriptsStore(type: 'global' | 'character' | 'preset') {
  return defineStore(`${type}_scripts`, () => {
    let enabled: Ref<boolean>;
    let script_trees: Ref<ScriptTree[]>;

    switch (type) {
      case 'global': {
        const store = useGlobalSettingsStore();
        enabled = toRef(store.settings.script.enabled, 'global');
        script_trees = toRef(useGlobalSettingsStore().settings.script, 'scripts');
        break;
      }
      case 'character': {
        const global_store = useGlobalSettingsStore();
        const character_store = useCharacterSettingsStore();
        enabled = computeEnabled(
          toRef(character_store, 'name'),
          toRef(global_store.settings.script.enabled, 'characters'),
        );
        script_trees = toRef(character_store.settings, 'scripts');
        break;
      }
      case 'preset': {
        const global_store = useGlobalSettingsStore();
        const preset_store = usePresetSettingsStore();
        enabled = computeEnabled(toRef(preset_store, 'name'), toRef(global_store.settings.script.enabled, 'presets'));
        script_trees = toRef(preset_store.settings, 'scripts');
        break;
      }
    }

    return { enabled, script_trees };
  });
}

export const useGlobalScriptsStore = createScriptsStore('global');
export const useCharacterScriptsStore = createScriptsStore('character');
export const usePresetScriptsStore = createScriptsStore('preset');
