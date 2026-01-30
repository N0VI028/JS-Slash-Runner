import { CharacterSettings as BackwardCharacterSettings } from '@/type/backward';
import { CharacterSettings, setting_field } from '@/type/settings';
import { fromCharacterBook, updateWorldInfoList } from '@/util/compatibility';
import { writeExtensionField } from '@/util/tavern';
import { characters, event_types, eventSource, this_chid } from '@sillytavern/script';
import { loadWorldInfo, saveWorldInfo } from '@sillytavern/scripts/world-info';

function getSettings(id: string | undefined): CharacterSettings {
  const character = characters.at(id as unknown as number);
  if (character === undefined) {
    return CharacterSettings.parse({});
  }

  const backward_scripts = _.get(character, `data.extensions.TavernHelper_scripts`);
  const backward_variables = _.get(character, `data.extensions.TavernHelper_characterScriptVariables`);
  if (backward_scripts !== undefined || backward_variables !== undefined) {
    if (!_.has(character, `data.extensions.${setting_field}`)) {
      const parsed = BackwardCharacterSettings.safeParse({
        scripts: backward_scripts ?? [],
        variables: backward_variables ?? {},
      } satisfies z.infer<typeof BackwardCharacterSettings>);
      if (parsed.success) {
        saveSettings(id as string, characters[id as unknown as number]?.name as string, parsed.data);
      } else {
        toastr.warning(parsed.error.message, t`[酒馆助手]迁移旧数据失败, 将使用空数据`);
      }
    }
    writeExtensionField(id, 'TavernHelper_scripts', undefined);
    writeExtensionField(id, 'TavernHelper_characterScriptVariables', undefined);
  }

  const settings = _.get(character, `data.extensions.${setting_field}`);
  const parsed = CharacterSettings.safeParse(
    settings !== undefined ? (_.isArray(settings) ? Object.fromEntries(settings) : settings) : {},
  );
  if (!parsed.success) {
    toastr.warning(parsed.error.message, t`[酒馆助手]读取角色卡数据失败, 将使用空数据`);
    return CharacterSettings.parse({});
  }
  return CharacterSettings.parse(parsed.data);
}

function saveSettings(id: string, name: string, settings: CharacterSettings) {
  if (name === characters[id as unknown as number]?.name) {
    writeExtensionField(id, setting_field, settings);
  }
}
const saveSettingsDebounced = _.debounce(saveSettings, 1000);

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

  // 替换/更新角色卡时也刷新 settings, 但不触发 settings 保存
  $('#character_replace_file').on('click', () => {
    eventSource.once(event_types.CHAT_CHANGED, () => {
      ignoreUpdates(async () => {
        const current_id = id.value;
        settings.value = getSettings(current_id);

        // 并且替换世界书
        if ($('#world_button').hasClass('world_set')) {
          const book = characters[Number(current_id)]?.data?.character_book;
          if (book) {
            const book_name = book.name || `${characters[Number(current_id)]?.name}'s Lorebook`;
            await saveWorldInfo(book_name, fromCharacterBook(book), true);
            await updateWorldInfoList();
            $('#character_world').val(book_name).trigger('change');
          }
        }
      });
    });
  });

  // 导出角色卡前保存最新世界书
  $('#export_button').on('click', async () => {
    const book_name = $('#character_world').val() as string;
    if (book_name) {
      await saveWorldInfo(book_name, await loadWorldInfo(book_name), true);
    }
  });

  // 在某角色卡内修改 settings 时保存
  const { ignoreUpdates } = watchIgnorable(
    settings,
    new_settings => {
      if (id.value !== undefined && name.value !== undefined) {
        saveSettingsDebounced(id.value, name.value, klona(new_settings));
      }
    },
    { deep: true },
  );

  const forceReload = () => {
    ignoreUpdates(() => {
      if (id.value !== undefined && name.value !== undefined) {
        settings.value = getSettings(id.value);
      }
    });
  };

  // 监听 id 不能正确反映导入新角色卡时的情况, 在外应该监听 name
  return {
    id: readonly(id),
    name: readonly(name),
    settings,
    forceReload,
  };
});
