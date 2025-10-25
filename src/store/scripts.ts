import { useCharacterSettingsStore, useGlobalSettingsStore, usePresetSettingsStore } from '@/store/settings';
import { isScript, ScriptTree } from '@/type/scripts';

function createScriptsStore(type: 'global' | 'character' | 'preset') {
  return defineStore(`${type}_scripts`, () => {
    let enabled: Ref<boolean>;
    let script_trees: Ref<ScriptTree[]>;
    let source: Readonly<Ref<string>>;

    switch (type) {
      case 'global': {
        const store = useGlobalSettingsStore();
        enabled = computed({
          get: () => store.settings.script.enabled.global,
          set: value => {
            store.settings.script.enabled.global = value;
          },
        });
        script_trees = computed({
          get: () => store.settings.script.scripts,
          set: value => {
            store.settings.script.scripts = value;
          },
        });
        source = ref('global');
        break;
      }
      case 'preset': {
        const global_store = useGlobalSettingsStore();
        const preset_store = usePresetSettingsStore();
        enabled = computed({
          get: () =>
            preset_store.name !== undefined && global_store.settings.script.enabled.presets.includes(preset_store.name),
          set: value => {
            if (preset_store.name === undefined) {
              return;
            }
            if (value) {
              global_store.settings.script.enabled.presets.push(preset_store.name);
            } else {
              _.pull(global_store.settings.script.enabled.presets, preset_store.name);
            }
          },
        });
        script_trees = computed({
          get: () => preset_store.settings.scripts,
          set: value => {
            preset_store.settings.scripts = value;
          },
        });
        source = computed(() => preset_store.name);
        break;
      }
      case 'character': {
        const global_store = useGlobalSettingsStore();
        const character_store = useCharacterSettingsStore();
        enabled = computed({
          get: () =>
            character_store.name !== undefined &&
            global_store.settings.script.enabled.characters.includes(character_store.name),
          set: value => {
            if (character_store.name === undefined) {
              return;
            }
            if (value) {
              global_store.settings.script.enabled.characters.push(character_store.name);
            } else {
              _.pull(global_store.settings.script.enabled.characters, character_store.name);
            }
          },
        });
        script_trees = computed({
          get: () => character_store.settings.scripts,
          set: value => {
            character_store.settings.scripts = value;
          },
        });
        source = computed(() => character_store.name ?? 'unknown');
        break;
      }
    }

    const enabled_scripts = computed(() => {
      return enabled.value
        ? _(script_trees.value)
            .filter(item => item.enabled)
            .flatMap(item => {
              return isScript(item) ? item : item.scripts.filter(script => script.enabled);
            })
            .value()
        : [];
    });

    return { enabled, script_trees, source, enabled_scripts };
  });
}

export const useGlobalScriptsStore = createScriptsStore('global');
export const useCharacterScriptsStore = createScriptsStore('character');
export const usePresetScriptsStore = createScriptsStore('preset');
