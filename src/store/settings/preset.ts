import { PresetSettings, setting_field } from '@/type/settings';
import { preset_manager } from '@/util/tavern';
import { eventSource, event_types, saveSettingsDebounced } from '@sillytavern/script';

function getSettings(id: string): PresetSettings {
  const settings = _.get(preset_manager.getPresetList().presets[Number(id)], 'extensions.tavern_helper', {});
  const parsed = PresetSettings.safeParse(settings);
  if (!parsed.success) {
    toastr.warning(parsed.error.message, t`[酒馆助手]读取预设数据失败, 将使用空数据`);
    return PresetSettings.parse({});
  }
  return PresetSettings.parse(parsed.data);
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
  // 切换预设时刷新 settings, 但不触发 settings 保存
  watch(id, () => {
    ignoreUpdates(() => {
      settings.value = getSettings(id.value);
    });
  });

  // 在某预设内修改 settings 时保存
  const { ignoreUpdates } = watchIgnorable(
    settings,
    new_settings => {
      if (id.value === preset_manager.getSelectedPreset()) {
        saveSettingsToMemoryDebounced(id.value, klona(new_settings));
      }
      saveSettingsToFileDebounced(id.value, klona(new_settings));
    },
    { deep: true },
  );

  const name = computed(() => Object.keys(preset_manager.getPresetList().preset_names)[Number(id.value)]);

  return { id: readonly(id), settings, name };
});
