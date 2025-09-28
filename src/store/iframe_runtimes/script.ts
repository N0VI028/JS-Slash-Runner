import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useGlobalSettingsStore } from '@/store/settings';
import { uuidv4 } from '@sillytavern/scripts/utils';

export const useScriptIframeRuntimesStore = defineStore('script_iframe_runtimes', () => {
  const global_settings = useGlobalSettingsStore();

  const global_scripts = useGlobalScriptsStore();
  const character_scripts = useCharacterScriptsStore();
  const preset_scripts = usePresetScriptsStore();

  const reload_memos = ref<{ [id: string]: string }>({});
  const reload = (id: string) => {
    _.set(reload_memos.value, id, uuidv4());
  };
  const reloadAll = () => {
    const reload_memo = uuidv4();
    reload_memos.value = Object.fromEntries(runtimes.value.map(runtime => [runtime.id, reload_memo]));
  };

  const runtimes = computed(() => {
    return global_settings.app_ready
      ? _([global_scripts, character_scripts, preset_scripts])
          .flatMap(store => store.enabled_scripts)
          .map(script => ({
            id: script.id,
            content: script.content,
            reload_memo: _.get(reload_memos.value, script.id, ''),
          }))
          .sortBy(script => script.id)
          .value()
      : [];
  });

  return { reload_memos: readonly(reload_memos), runtimes, reload, reloadAll };
});
