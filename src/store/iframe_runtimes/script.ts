import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useGlobalSettingsStore } from '@/store/settings';
import { Script } from '@/type/scripts';
import { uuidv4 } from '@sillytavern/scripts/utils';

interface ScriptRuntime {
  id: string;
  content: string;
}

function toScriptRuntime(script: Script): ScriptRuntime {
  return {
    id: script.id,
    content: script.content,
  };
}

export const useScriptIframeRuntimesStore = defineStore('script_iframe_runtimes', () => {
  const global_settings = useGlobalSettingsStore();

  const global_scripts = useGlobalScriptsStore();
  const character_scripts = useCharacterScriptsStore();
  const preset_scripts = usePresetScriptsStore();

  const runtimes = computed(() => {
    return global_settings.app_ready
      ? _([global_scripts, character_scripts, preset_scripts])
          .filter(store => store.enabled)
          .flatMap(store => store.flattened_scripts)
          .filter(script => script.enabled)
          .map(toScriptRuntime)
          .sortBy(script => script.id)
          .value()
      : [];
  });

  const reload_memos = ref<string[]>([]);
  watchEffect(() => {
    reload_memos.value = _.times(runtimes.value.length, _.constant(uuidv4()));
  });

  const reload = (id: string) => {
    const index = runtimes.value.findIndex(runtime => runtime.id === id);
    if (index) {
      reload_memos.value[index] = uuidv4();
    }
  };

  const reloadAll = () => {
    reload_memos.value = _.times(runtimes.value.length, _.constant(uuidv4()));
  };

  return { runtimes, reload_memos: readonly(reload_memos), reload, reloadAll };
});
