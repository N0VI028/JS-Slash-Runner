import { CharacterSettings as BackwardCharacterSettings } from '@/type/backward';
import { CharacterSettings, setting_field } from '@/type/settings';
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
    const parsed = BackwardCharacterSettings.safeParse({
      scripts: backward_scripts ?? [],
      variables: backward_variables ?? {},
    } satisfies z.infer<typeof BackwardCharacterSettings>);
    if (parsed.success) {
      saveSettingsDebounced(id as string, parsed.data);
    } else {
      toastr.warning(parsed.error.message, t`[酒馆助手]迁移旧数据失败, 将使用空数据`);
    }
  }

  const settings = Object.fromEntries(_.get(character, `data.extensions.${setting_field}`, []));
  const parsed = CharacterSettings.safeParse(settings);
  if (!parsed.success) {
    toastr.warning(parsed.error.message, t`[酒馆助手]读取角色卡数据失败, 将使用空数据`);
    return CharacterSettings.parse({});
  }
  return CharacterSettings.parse(parsed.data);
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
  const name = ref<string | undefined>(characters?.[this_chid as unknown as number]?.name);
  // 切换角色卡时刷新 id
  eventSource.makeFirst(event_types.CHAT_CHANGED, () => {
    const new_name = characters?.[this_chid as unknown as number]?.name;
    if (name.value !== new_name) {
      id.value = this_chid;
      name.value = new_name;
    }
  });

  const settings = ref<CharacterSettings>(getSettings(id.value));

  // 切换角色卡时刷新 settings, 但不触发 settings 保存
  watch([id, name], ([new_id]) => {
    ignoreUpdates(() => {
      settings.value = getSettings(new_id);
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

  // 监听 id 不能正确反映导入新角色卡时的情况, 在外应该监听 name
  return { id: readonly(id), name: readonly(name), settings };
});
