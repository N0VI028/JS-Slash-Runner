import { useCharacterSettingsStore, useGlobalSettingsStore, usePresetSettingsStore } from '@/store/settings';
import { Script } from '@/type/scripts';

function computedEnabled(name: Ref<string | undefined>, enabled_arrays: Ref<string[]>) {
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
    let scripts: Ref<Script[]>;

    switch (type) {
      case 'global': {
        const store = useGlobalSettingsStore();
        enabled = toRef(store.settings.script.enabled, 'global');
        scripts = toRef(useGlobalSettingsStore().settings.script, 'scripts');
        break;
      }
      case 'character': {
        const global_store = useGlobalSettingsStore();
        const character_store = useCharacterSettingsStore();
        enabled = computedEnabled(
          toRef(character_store, 'name'),
          toRef(global_store.settings.script.enabled, 'characters'),
        );
        scripts = toRef(character_store.settings, 'scripts');
        break;
      }
      case 'preset': {
        const global_store = useGlobalSettingsStore();
        const preset_store = usePresetSettingsStore();
        enabled = computedEnabled(toRef(preset_store, 'name'), toRef(global_store.settings.script.enabled, 'presets'));
        scripts = toRef(preset_store.settings, 'scripts');
        break;
      }
    }

    const get = (script_id: string) => scripts.value.find(script => script.id === script_id);
    const remove = (script_id: string) =>
      scripts.value.splice(
        scripts.value.findIndex(script => script.id === script_id),
        1,
      );

    return { enabled, scripts, get, remove };
  });
}

export const useGlobalScriptsStore = createScriptsStore('global');
export const useCharacterScriptsStore = createScriptsStore('character');
export const usePresetScriptsStore = createScriptsStore('preset');
