import { PresetSettings, setting_field } from '@/type/settings';
import { preset_manager } from '@/util/tavern';
import { validateInplace } from '@/util/zod';
import { eventSource, event_types, saveSettingsDebounced } from '@sillytavern/script';

function getSettings(id: string): PresetSettings {
  return validateInplace(
    PresetSettings,
    _.get(preset_manager.getPresetList().presets[Number(id)], 'extensions.tavern_helper', {}),
  );
}

function saveSettingsToMemoryDebounced(id: string, settings: PresetSettings) {
  _.set(preset_manager.getPresetList().presets[Number(id)], `extensions.${setting_field}`, settings);
  saveSettingsDebounced();
}

async function saveSettingsToFile(id: string, settings: PresetSettings) {
  _.set(preset_manager.getPresetList().presets[Number(id)], `extensions.${setting_field}`, settings);
  await preset_manager.savePreset(
    Object.keys(preset_manager.getPresetList().preset_names)[Number(id)],
    preset_manager.getPresetList().presets[Number(id)],
  );
}
const saveSettingsToFileDebounced = _.debounce(saveSettingsToFile, 1000);

export const usePresetSettingsStore = defineStore('preset_settings', () => {
  const id = ref<string>(preset_manager.getSelectedPreset());
  // 切换预设时刷新 id 和 settings
  eventSource.on(event_types.OAI_PRESET_CHANGED_AFTER, () => {
    const new_id = preset_manager.getSelectedPreset();
    if (id.value !== new_id) {
      id.value = new_id;
    }
  });

  const settings = ref<PresetSettings>(getSettings(id.value));

  // 在某预设内修改 settings 时保存
  watch(
    [id, settings],
    ([new_id, new_settings], [old_id, old_settings]) => {
      // 切换预设时刷新 settings
      if (new_id !== old_id) {
        settings.value = getSettings(new_id);
        return;
      }
      // 在某预设内修改 settings 时保存
      if (!_.isEqual(new_settings, old_settings)) {
        const cloned = klona(new_settings);
        if (new_id === preset_manager.getSelectedPreset()) {
          saveSettingsToMemoryDebounced(id.value, cloned);
        }
        saveSettingsToFileDebounced(id.value, cloned);
      }
    },
    { deep: true },
  );

  const name = computed(() => Object.keys(preset_manager.getPresetList().preset_names)[Number(id.value)]);

  return { id: readonly(id), settings, name };
});
