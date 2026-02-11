import { PresetSettings, setting_field } from '@/type/settings';
import { preset_manager } from '@/util/tavern';
import { eventSource, event_types, saveSettingsDebounced } from '@sillytavern/script';
import { oai_settings } from '@sillytavern/scripts/openai';

function getSettings(id: string): PresetSettings {
  const settings = _.get(preset_manager.getPresetList().presets[Number(id)], 'extensions.tavern_helper', {});
  const parsed = PresetSettings.safeParse(settings);
  if (!parsed.success) {
    toastr.warning(parsed.error.message, t`[酒馆助手]读取预设数据失败, 将使用空数据`);
    return PresetSettings.parse({});
  }
  return PresetSettings.parse(parsed.data);
}

function saveSettingsToMemoryDebounced(id: string, name: string, settings: PresetSettings) {
  if (id === preset_manager.getSelectedPreset() && name === preset_manager.getSelectedPresetName()) {
    _.set(oai_settings, `extensions.${setting_field}`, settings);
    saveSettingsDebounced();
  }
}

async function saveSettingsToFile(_id: string, name: string, settings: PresetSettings) {
  const preset_list = preset_manager.getPresetList();
  const index = _.get(preset_list.preset_names, name, -1);
  if (index === -1) {
    return;
  }

  const preset = preset_list.presets[index];
  _.set(preset, `extensions.${setting_field}`, settings);
  await preset_manager.savePreset(name, preset, { skipUpdate: true });
}
const saveSettingsToFileDebounced = _.debounce(saveSettingsToFile, 1000);

export const usePresetSettingsStore = defineStore('preset_settings', () => {
  const id = ref<string>(preset_manager.getSelectedPreset());
  const name = ref<string>(preset_manager.getSelectedPresetName());
  // 切换预设时刷新 id 和 settings
  eventSource.makeFirst(event_types.OAI_PRESET_CHANGED_AFTER, () => {
    const new_id = String(preset_manager.getSelectedPreset());
    const new_name = String(preset_manager.getSelectedPresetName());
    if (name.value !== new_name) {
      id.value = new_id;
      name.value = new_name;
    }
  });

  const settings = ref<PresetSettings>(getSettings(id.value));
  // 切换预设时刷新 settings, 但不触发 settings 保存
  watch([id, name], ([new_id]) => {
    ignoreUpdates(() => {
      settings.value = getSettings(new_id);
    });
  });

  // 在某预设内修改 settings 时保存
  const { ignoreUpdates } = watchIgnorable(
    settings,
    new_settings => {
      saveSettingsToMemoryDebounced(id.value, name.value, klona(new_settings));
      saveSettingsToFileDebounced(id.value, name.value, klona(new_settings));
    },
    { deep: true },
  );

  // 监听 id 不能正确反映导入新预设时的情况, 在外应该监听 name
  return { id: readonly(id), name: readonly(name), settings };
});
