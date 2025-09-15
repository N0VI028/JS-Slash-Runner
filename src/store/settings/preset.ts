import { PresetSettings, setting_field } from '@/type/settings';
import { preset_manager } from '@/util/preset_manager';
import { validateInplace } from '@/util/zod';
import { eventSource, event_types, saveSettingsDebounced } from '@sillytavern/script';
import { defineStore } from 'pinia';
import { computed, readonly, ref, toRaw, watch } from 'vue';

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

function saveSettingsToFile(id: string, settings: PresetSettings) {
  _.set(preset_manager.getPresetList().presets[Number(id)], `extensions.${setting_field}`, settings);
  preset_manager.savePreset(
    Object.keys(preset_manager.getPresetList().preset_names)[Number(id)],
    preset_manager.getPresetList().presets[Number(id)],
  );
}
const saveSettingsToFileDebounced = _.debounce(saveSettingsToFile, 1000);

export const usePresetSettingsStore = defineStore('preset_settings', () => {
  const id = ref<string>(preset_manager.getSelectedPreset());
  const settings = ref<PresetSettings>(getSettings(id.value));
  // 切换预设时刷新 id 和 settings
  eventSource.on(event_types.OAI_PRESET_CHANGED_AFTER, () => {
    const new_id = preset_manager.getSelectedPreset();
    if (id.value != new_id) {
      id.value = new_id;
      settings.value = getSettings(id.value);
    }
  });

  // 在某预设内修改 settings 时保存
  watch(
    [id, settings],
    ([new_id, new_settings], [previous_id]) => {
      if (new_id !== previous_id) {
        return;
      }
      if (id.value === preset_manager.getSelectedPreset()) {
        saveSettingsToMemoryDebounced(id.value, toRaw(new_settings));
      }
      saveSettingsToFileDebounced(id.value, toRaw(new_settings));
    },
    { deep: true },
  );

  const name = computed(() => Object.keys(preset_manager.getPresetList().preset_names)[Number(id.value)]);

  return { id: readonly(id), settings, name };
});
