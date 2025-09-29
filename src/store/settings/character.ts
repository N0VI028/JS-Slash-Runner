import { CharacterSettings, setting_field } from '@/type/settings';
import { validateInplace } from '@/util/zod';
import { characters, event_types, eventSource, this_chid } from '@sillytavern/script';
import { writeExtensionField } from '@sillytavern/scripts/extensions';

function getSettings(id: string | undefined): CharacterSettings {
  return validateInplace(
    CharacterSettings,
    _.get(characters.at(id as unknown as number), `data.extensions.${setting_field}`, {}),
  );
}

async function saveSettings(id: string, settings: CharacterSettings) {
  await writeExtensionField(id, setting_field, settings);
}
const saveSettingsDebounced = _.debounce(saveSettings, 1000);

export const useCharacterSettingsStore = defineStore('character_setttings', () => {
  const id = ref<string | undefined>(this_chid);
  const settings = ref<CharacterSettings>(getSettings(id.value));
  // 切换角色卡时刷新 id 和 settings
  eventSource.on(event_types.CHAT_CHANGED, () => {
    if (id.value !== this_chid) {
      id.value = this_chid;
      settings.value = getSettings(id.value);
    }
  });

  // 在某角色卡内修改 settings 时保存
  watch(
    [id, settings],
    ([new_id, new_settings], [previous_id]) => {
      if (new_id !== previous_id) {
        return;
      }
      if (id.value !== undefined) {
        saveSettingsDebounced(id.value, toRaw(new_settings));
      }
    },
    { deep: true },
  );

  const name = computed(() => characters.at(id.value as unknown as number)?.name);

  return { id: readonly(id), settings, name };
});
