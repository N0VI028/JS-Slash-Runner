import { CharacterSettings as BackwardCharacterSettings } from '@/type/backward';
import { CharacterSettings, setting_field } from '@/type/settings';
import { validateInplace } from '@/util/zod';
import { characters, event_types, eventSource, this_chid } from '@sillytavern/script';
import { writeExtensionField } from '@sillytavern/scripts/extensions';

function getSettings(id: string | undefined): CharacterSettings {
  const character = characters.at(id as unknown as number);
  if (character === undefined) {
    return CharacterSettings.parse({});
  }

  const backward_scripts = _.get(character, `data.extensions.TavernHelper_scripts`);
  const backward_variables = _.get(character, `data.extensions.TavernHelper_characterScriptVariables`);
  if (
    (backward_scripts !== undefined || backward_variables !== undefined) &&
    !_.has(character, `data.extensions.${setting_field}`)
  ) {
    const converted = BackwardCharacterSettings.parse({
      scripts: backward_scripts ?? [],
      variables: backward_variables ?? {},
    } satisfies z.infer<typeof BackwardCharacterSettings>);
    saveSettingsDebounced(id as string, converted);
  }

  return validateInplace(
    CharacterSettings,
    Object.fromEntries(_.get(character, `data.extensions.${setting_field}`, [])),
  );
}

const writeExtensionFieldDebounced = _.debounce(writeExtensionField, 1000);
function saveSettingsDebounced(id: string, settings: CharacterSettings) {
  // 酒馆的 `writeExtensionField` 会对对象进行合并, 因此要将对象转换为数组再存储
  const entries = Object.entries(settings);
  _.set(characters[id as unknown as number], `data.extensions.${setting_field}`, entries);
  writeExtensionFieldDebounced(id, setting_field, entries);
}

export const useCharacterSettingsStore = defineStore('character_setttings', () => {
  const id = ref<string | undefined>(this_chid);
  // 切换角色卡时刷新 id
  eventSource.on(event_types.CHAT_CHANGED, () => {
    if (id.value !== this_chid) {
      id.value = this_chid;
    }
  });

  const settings = ref<CharacterSettings>(getSettings(id.value));

  // 切换角色卡时刷新 settings, 但不触发 settings 保存
  watch(id, () => {
    ignoreUpdates(() => {
      settings.value = getSettings(id.value);
    });
  });

  // 在某角色卡内修改 settings 时保存
  const { ignoreUpdates } = watchIgnorable(
    settings,
    new_settings => {
      if (id.value !== undefined) {
        saveSettingsDebounced(id.value, klona(new_settings));
      }
    },
    { deep: true },
  );

  const name = computed(() => characters?.[id.value as unknown as number]?.name);

  return { id: readonly(id), settings, name };
});
