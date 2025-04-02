import { findChar } from '@/compatibility';

import {
  characters,
  getOneCharacter,
  getRequestHeaders,
  saveCharacterDebounced,
  saveSettings,
  saveSettingsDebounced,
  this_chid,
} from '@sillytavern/script';
// @ts-ignore
import { selected_group } from '@sillytavern/scripts/group-chats';
import { ensureImageFormatSupported, getCharaFilename } from '@sillytavern/scripts/utils';
import {
  createNewWorldInfo,
  deleteWorldInfo,
  getWorldInfoSettings,
  selected_world_info,
  setWorldInfoButtonClass,
  world_info,
  world_names,
} from '@sillytavern/scripts/world-info';

async function editCurrentCharacter(): Promise<boolean> {
  // @ts-ignore
  $('#rm_info_avatar').html('');
  // @ts-ignore
  const form_data = new FormData(($('#form_create') as JQuery<HTMLFormElement>).get(0));

  const raw_file = form_data.get('avatar');
  if (raw_file instanceof File) {
    const converted_file = await ensureImageFormatSupported(raw_file);
    form_data.set('avatar', converted_file);
  }

  const headers = getRequestHeaders();
  // @ts-ignore
  delete headers['Content-Type'];

  // TODO: 这里的代码可以用来修改第一条消息!
  form_data.delete('alternate_greetings');
  // @ts-ignore
  const chid = $('.open_alternate_greetings').data('chid');
  if (chid && Array.isArray(characters[chid]?.data?.alternate_greetings)) {
    for (const value of characters[chid].data.alternate_greetings) {
      form_data.append('alternate_greetings', value);
    }
  }

  const response = await fetch('/api/characters/edit', {
    method: 'POST',
    headers: headers,
    body: form_data,
    cache: 'no-cache',
  });

  if (!response.ok) {
    return false;
  }

  await getOneCharacter(form_data.get('avatar_url'));
  // @ts-ignore
  $('#add_avatar_button').replaceWith($('#add_avatar_button').val('').clone(true));
  // @ts-ignore
  $('#create_button').attr('value', 'Save');

  return true;
}

function toLorebookSettings(world_info_settings: ReturnType<typeof getWorldInfoSettings>): LorebookSettings {
  return {
    selected_global_lorebooks: (world_info_settings.world_info as { globalSelect: string[] }).globalSelect,

    scan_depth: world_info_settings.world_info_depth,
    context_percentage: world_info_settings.world_info_budget,
    budget_cap: world_info_settings.world_info_budget_cap,
    min_activations: world_info_settings.world_info_min_activations,
    max_depth: world_info_settings.world_info_min_activations_depth_max,
    max_recursion_steps: world_info_settings.world_info_max_recursion_steps,

    insertion_strategy: { 0: 'evenly', 1: 'character_first', 2: 'global_first' }[
      world_info_settings.world_info_character_strategy
    ] as 'evenly' | 'character_first' | 'global_first',

    include_names: world_info_settings.world_info_include_names,
    recursive: world_info_settings.world_info_recursive,
    case_sensitive: world_info_settings.world_info_case_sensitive,
    match_whole_words: world_info_settings.world_info_match_whole_words,
    use_group_scoring: world_info_settings.world_info_use_group_scoring,
    overflow_alert: world_info_settings.world_info_overflow_alert,
  };
}

function assignPartialLorebookSettings(settings: Partial<LorebookSettings>): void {
  const for_eachs = {
    selected_global_lorebooks: (value: LorebookSettings['selected_global_lorebooks']) => {
      // @ts-ignore
      $('#world_info').find('option[value!=""]').remove();
      world_names.forEach((item, i) =>
        // @ts-ignore
        $('#world_info').append(`<option value='${i}'${value.includes(item) ? ' selected' : ''}>${item}</option>`),
      );

      selected_world_info.length = 0;
      selected_world_info.push(...value);
      saveSettings();
    },

    scan_depth: (value: LorebookSettings['scan_depth']) => {
      // @ts-ignore
      $('#world_info_depth').val(value).trigger('input');
    },
    context_percentage: (value: LorebookSettings['context_percentage']) => {
      // @ts-ignore
      $('#world_info_budget').val(value).trigger('input');
    },
    budget_cap: (value: LorebookSettings['budget_cap']) => {
      // @ts-ignore
      $('#world_info_budget_cap').val(value).trigger('input');
    },
    min_activations: (value: LorebookSettings['min_activations']) => {
      // @ts-ignore
      $('#world_info_min_activations').val(value).trigger('input');
    },
    max_depth: (value: LorebookSettings['max_depth']) => {
      // @ts-ignore
      $('#world_info_min_activations_depth_max').val(value).trigger('input');
    },
    max_recursion_steps: (value: LorebookSettings['max_recursion_steps']) => {
      // @ts-ignore
      $('#world_info_max_recursion_steps').val(value).trigger('input');
    },

    insertion_strategy: (value: LorebookSettings['insertion_strategy']) => {
      const converted_value = { evenly: 0, character_first: 1, global_first: 2 }[value];
      // @ts-ignore
      $(`#world_info_character_strategy option[value='${converted_value}']`).prop('selected', true);
      // @ts-ignore
      $('#world_info_character_strategy').val(converted_value).trigger('change');
    },

    include_names: (value: LorebookSettings['include_names']) => {
      // @ts-ignore
      $('#world_info_include_names').prop('checked', value).trigger('input');
    },
    recursive: (value: LorebookSettings['recursive']) => {
      // @ts-ignore
      $('#world_info_recursive').prop('checked', value).trigger('input');
    },
    case_sensitive: (value: LorebookSettings['case_sensitive']) => {
      // @ts-ignore
      $('#world_info_case_sensitive').prop('checked', value).trigger('input');
    },
    match_whole_words: (value: LorebookSettings['match_whole_words']) => {
      // @ts-ignore
      $('#world_info_match_whole_words').prop('checked', value).trigger('input');
    },
    use_group_scoring: (value: LorebookSettings['use_group_scoring']) => {
      // @ts-ignore
      $('#world_info_use_group_scoring').prop('checked', value).trigger('change');
    },
    overflow_alert: (value: LorebookSettings['overflow_alert']) => {
      // @ts-ignore
      $('#world_info_overflow_alert').prop('checked', value).trigger('change');
    },
  };

  Object.entries(settings)
    .filter(([_, value]) => value !== undefined)
    .forEach(([field, value]) => {
      // @ts-ignore
      for_eachs[field]?.(value);
    });
}

/**
 * 获取当前的世界书全局设置
 *
 * @returns 当前的世界书全局设置
 */
export function getLorebookSettings(): LorebookSettings {
  const lorebook_settings = toLorebookSettings(getWorldInfoSettings());

  console.info(`获取世界书全局设置:\n${JSON.stringify(lorebook_settings, undefined, 2)}`);
  return lorebook_settings;
}

/**
 * 修改世界书全局设置
 *
 * @returns 修改世界书全局设置
 */
export function setLorebookSettings(settings: Partial<LorebookSettings>): void {
  if (settings.selected_global_lorebooks) {
    const inexisting_lorebooks = settings.selected_global_lorebooks.filter(lorebook => !world_names.includes(lorebook));
    if (inexisting_lorebooks.length > 0) {
      throw Error(`尝试修改要全局启用的世界书, 但未找到以下世界书: ${JSON.stringify(inexisting_lorebooks)}`);
    }
  }

  assignPartialLorebookSettings(settings);

  console.info(`修改世界书全局设置:\n${JSON.stringify(settings, undefined, 2)}`);
}

/**
 * 获取角色卡绑定的世界书
 *
 * @param option 可选选项
 *   - `name?:string`: 要查询的角色卡名称; 默认为当前角色卡
 *   - `type?:'all'|'primary'|'additional'`: 按角色世界书的绑定类型筛选世界书; 默认为 `'all'`
 *
 * @returns 一个 CharLorebook 数组
 */
export function getCharLorebooks(option: GetCharLorebooksOption): CharLorebooks {
  // @ts-ignore
  if (selected_group && !option.name) {
    throw Error(`不要在群组中调用这个功能`);
  }
  //@ts-ignore
  const filename = option.name ?? characters[this_chid]?.avatar ?? null;
  // @ts-ignore
  const character = findChar({ name: filename });
  if (!character) {
    throw Error(`未找到名为 '${filename}' 的角色卡`);
  }

  let books: CharLorebooks = { primary: null, additional: [] };

  if (character.data?.extensions?.world) {
    books.primary = character.data?.extensions?.world;
  }

  // @ts-ignore
  const extraCharLore = world_info.charLore?.find(e => e.name === filename);
  if (extraCharLore && Array.isArray(extraCharLore.extraBooks)) {
    books.additional = extraCharLore.extraBooks;
  }

  console.info(`获取角色卡绑定的世界书, 选项: ${JSON.stringify(option)}, 获取结果: ${JSON.stringify(books)}`);
  return books;
}

// TODO: 加入文档中
/**
 * 设置当前角色卡绑定的世界书
 *
 * @param lorebooks 要设置的世界书信息
 *    - `primary: string | null;`: 主要世界书名称，设为null或空字符串表示移除
 *    - `additional: string[];`: 附加世界书名称数组，设为空数组表示移除所有附加世界书
 */
export async function setCurrentCharLorebooks(lorebooks: Partial<CharLorebooks>): Promise<void> {
  // @ts-ignore
  if (selected_group && !option.name) {
    throw Error(`不要在群组中调用这个功能`);
  }
  // @ts-ignore
  const filename = getCharaFilename(this_chid);
  if (!filename) {
    throw Error(`未打开任何角色卡`);
  }

  const inexisting_lorebooks: string[] = [
    ...(lorebooks.primary && !world_names.includes(lorebooks.primary) ? [lorebooks.primary] : []),
    ...(lorebooks.additional ? lorebooks.additional.filter(lorebook => !world_names.includes(lorebook)) : []),
  ];
  if (inexisting_lorebooks.length > 0) {
    throw Error(`尝试修改 '${filename}' 绑定的世界书, 但未找到以下世界书: ${inexisting_lorebooks}`);
  }

  if (lorebooks.primary !== undefined) {
    // @ts-ignore
    const previous_primary = String($('#character_world').val());
    // @ts-ignore
    $('#character_world').val(lorebooks.primary ? lorebooks.primary : '');

    // @ts-ignore
    $('.character_world_info_selector')
      .find('option:selected')
      .val(lorebooks.primary ? world_names.indexOf(lorebooks.primary) : '');

    if (previous_primary && !lorebooks.primary) {
      // @ts-ignore
      const data = JSON.parse(String($('#character_json_data').val()));
      if (data?.data?.character_book) {
        data.data.character_book = undefined;
      }
      // @ts-ignore
      $('#character_json_data').val(JSON.stringify(data));
    }

    if (!(await editCurrentCharacter())) {
      throw Error(`尝试为 '${filename}' 绑定主要世界书, 但在访问酒馆后端时出错`);
    }

    // @ts-ignore
    setWorldInfoButtonClass(undefined, !!lorebooks.primary);
  }

  if (lorebooks.additional !== undefined) {
    interface CharLoreEntry {
      name: string;
      extraBooks: string[];
    }
    let char_lore = (world_info as { charLore: CharLoreEntry[] }).charLore ?? [];

    const existing_char_index = char_lore.findIndex(entry => entry.name === filename);
    if (existing_char_index === -1) {
      char_lore.push({ name: filename, extraBooks: lorebooks.additional });
    } else if (lorebooks.additional.length === 0) {
      char_lore.splice(existing_char_index, 1);
    } else {
      char_lore[existing_char_index].extraBooks = lorebooks.additional;
    }

    Object.assign(world_info, { charLore: char_lore });
  }

  saveCharacterDebounced();
  saveSettingsDebounced();

  console.info(
    `修改角色卡绑定的世界书, 要修改的部分: ${JSON.stringify(lorebooks)}${
      lorebooks.primary === undefined ? ', 主要世界书保持不变' : ''
    }${lorebooks.additional === undefined ? ', 附加世界书保持不变' : ''}`,
  );
}

/**
 * 获取世界书列表
 *
 * @returns 世界书名称列表
 */
export async function getLorebooks(): Promise<string[]> {
  console.info(`获取世界书列表: ${JSON.stringify(world_names)}`);
  return world_names;
}

/**
 * 删除世界书
 *
 * @param lorebook 世界书名称
 * @returns 是否成功删除, 可能因世界书不存在等原因而失败
 */
export async function deleteLorebook(lorebook: string): Promise<boolean> {
  const success = await deleteWorldInfo(lorebook);

  console.info(`移除世界书 '${lorebook}' ${success ? '成功' : '失败'}`);
  return success;
}

/**
 * 新建世界书
 *
 * @param lorebook 世界书名称
 *
 * @returns 是否成功创建, 如果已经存在同名世界书会失败
 */
export async function createLorebook(lorebook: string): Promise<boolean> {
  const success = await createNewWorldInfo(lorebook, { interactive: false });

  console.info(`新建世界书 '${lorebook}' ${success ? '成功' : '失败'}`);
  return success;
}
