import { useCharacterSettingsStore, useGlobalSettingsStore, usePresetSettingsStore } from '@/store/settings';
import { Script } from '@/type/scripts';

function createScriptsStore(type: 'global' | 'character' | 'preset') {
  return defineStore(`${type}_scripts`, () => {
    let scripts: Ref<Script[]>;
    // TODO: iframe 也放在这里面还是放出去
    switch (type) {
      case 'global':
        scripts = toRef(useGlobalSettingsStore().settings.script, 'scripts');
        break;
      case 'character':
        scripts = toRef(useCharacterSettingsStore().settings, 'scripts');
        break;
      case 'preset':
        scripts = toRef(usePresetSettingsStore().settings, 'scripts');
        break;
    }

    const get = (script_id: string) => scripts.value.find(script_ => script_.id === script_id);
    const remove = (script_id: string) =>
      scripts.value.splice(
        scripts.value.findIndex(script_ => script_.id === script_id),
        1,
      );

    return { scripts, get, remove };
  });
}

export const useGlobalScriptsStore = createScriptsStore('global');
export const useCharacterScriptsStore = createScriptsStore('character');
export const usePresetScriptsStore = createScriptsStore('preset');
